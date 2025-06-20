// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getOrCreateCustomer } from '@/lib/db/customers';
import { createOrder, getOrderByPaymentIntent } from '@/lib/db/orders';
import { createRestorationJob } from '@/lib/db/restoration-jobs';
import { queueEmail } from '@/lib/db/email-queue';
import { storageService } from '@/lib/storage/storage-service';
import { triggerRestorationForOrder } from '@/lib/restoration/trigger';
import logger from '@/lib/logger';
import { retryDatabaseOperation } from '@/lib/utils/retry';
import { serverConfig } from '@/lib/config.server';
import { trackPurchase } from '@/lib/analytics';

const stripe = new Stripe(serverConfig.stripe.secretKey, {
  apiVersion: '2025-05-28.basil',
});

const relevantEvents = new Set([
  'checkout.session.completed',
]);

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = serverConfig.stripe.webhookSecret;
  let event: Stripe.Event;

  if (!sig || !webhookSecret) {
    logger.error('Stripe webhook secret or signature missing');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 400 });
  }

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    logger.error(`Stripe webhook signature error: ${err.message}`);
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  if (relevantEvents.has(event.type)) {
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        default:
          logger.warn(`Unhandled relevant event type: ${event.type}`);
      }
    } catch (error) {
      logger.error({ error, eventType: event.type }, 'Error handling Stripe event');
      return NextResponse.json({ error: 'Internal server error handling event' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const log = logger.child({ sessionId: session.id });
  log.info('Processing checkout session completed event');

  // Extract session data
  const customerEmail = session.customer_details?.email;
  const sessionId = session.metadata?.batch_id;
  log.debug({ metadata: session.metadata, extractedSessionId: sessionId }, 'Stripe session metadata and extracted session ID');
  const totalAmountPaid = session.amount_total ? session.amount_total / 100 : 0;
  const paymentIntentId = typeof session.payment_intent === 'string' 
    ? session.payment_intent 
    : session.payment_intent?.id;

  // Validate required data
  if (!customerEmail) {
    log.error('Customer email not found in checkout session');
    throw new Error('Customer email missing');
  }
  if (!sessionId) {
    log.error('Session ID not found in checkout session metadata');
    throw new Error('Session ID missing');
  }
  if (!paymentIntentId) {
    log.error('Payment Intent ID not found in checkout session');
    throw new Error('Payment Intent ID missing');
  }

  // 1. IDEMPOTENCY CHECK
  const existingOrder = await getOrderByPaymentIntent(paymentIntentId);
  
  if (existingOrder) {
    log.info({ 
      paymentIntentId, 
      orderId: existingOrder.id 
    }, 'Duplicate checkout.session.completed event. Order already exists. Skipping');
    return;
  }

  // 2. GET OR CREATE CUSTOMER
  const customer = await getOrCreateCustomer(customerEmail, {
    name: session.customer_details?.name || undefined,
    phone: session.customer_details?.phone || undefined,
    metadata: {
      stripe_customer_id: session.customer,
      checkout_session_id: session.id
    }
  });

  log.info({ customerId: customer.id, email: customerEmail }, 'Customer processed');

  // 3. CREATE ORDER
  const order = await createOrder({
    customerId: customer.id,
    stripePaymentIntentId: paymentIntentId,
    stripeCheckoutSessionId: session.id,
    totalAmount: totalAmountPaid,
    currency: session.currency?.toUpperCase() || 'USD',
    paymentMethod: session.payment_method_types?.[0] || 'card',
    metadata: {
      session_id: sessionId,
      stripe_session_id: session.id,
      customer_details: session.customer_details
    }
  });

  log.info({ orderId: order.id, orderNumber: order.order_number }, 'Order created successfully');

  // 4. MOVE IMAGES FROM TEMPORARY TO PERMANENT STORAGE
  try {
    const moveResults = await storageService.moveToOriginals(sessionId, order.id);
    
    if (moveResults.length === 0) {
      log.warn({ sessionId, orderId: order.id }, 'No images found to move from temporary storage');
    } else {
      log.info({ 
        orderId: order.id, 
        imageCount: moveResults.length 
      }, 'Images moved to permanent storage successfully');
    }

    // Track purchase completion
    trackPurchase(order.id, totalAmountPaid, session.currency?.toUpperCase() || 'USD', moveResults.length);

    // 5. CREATE RESTORATION JOBS
    for (const moveResult of moveResults) {
      try {
        const restorationJob = await createRestorationJob({
          originalImageId: moveResult.imageId,
          inputParameters: {
            input_image: moveResult.publicUrl,
            model: process.env.REPLICATE_MODEL || 'flux-kontext-apps/restore-image',
            seed: Math.floor(Math.random() * 1000000),
            output_format: process.env.REPLICATE_OUTPUT_FORMAT || 'png',
            safety_tolerance: parseInt(process.env.REPLICATE_SAFETY_TOLERANCE || '0')
          },
          metadata: {
            order_id: order.id,
            original_path: moveResult.originalPath,
            moved_from_session: sessionId,
            original_image_url: moveResult.publicUrl
          }
        });

        log.info({ 
          jobId: restorationJob.id, 
          imageId: moveResult.imageId 
        }, 'Restoration job created');

      } catch (jobError) {
        log.error({ 
          error: jobError, 
          imageId: moveResult.imageId 
        }, 'Failed to create restoration job');
      }
    }

    // 5.5. TRIGGER RESTORATION PROCESSING
    // Trigger restoration worker to process the pending jobs immediately
    log.info({ orderId: order.id }, 'Triggering restoration worker to process pending jobs');
    await triggerRestorationForOrder(order.id);
    
    // 6. QUEUE ORDER CONFIRMATION EMAIL
    await queueEmail({
      orderId: order.id,
      emailType: 'order_confirmation',
      toEmail: customerEmail,
      toName: customer.name || 'Valued customer',
      subject: `Order Confirmation - ${order.order_number}`,
      sendgridTemplateId: process.env.SENDGRID_ORDER_CONFIRMATION_TEMPLATE_ID,
      dynamicData: {
        customer_name: customer.name || 'Valued customer',
        customer_email: customerEmail,
        order_id: order.order_number,
        order_date: new Date().toLocaleDateString(),
        total_amount_paid: `$${totalAmountPaid.toFixed(2)} ${order.currency}`,
        number_of_photos: moveResults.length,
        payment_intent_id: paymentIntentId,
        // Include image URLs for template
        input_image_urls: moveResults.map(r => r.publicUrl)
      },
      // Prepare attachments - original images
      attachments: await prepareImageAttachments(moveResults.map(r => r.publicUrl))
    });

    log.info({ 
      orderId: order.id, 
      customerEmail 
    }, 'Order confirmation email queued successfully');

  } catch (storageError) {
    log.error({ 
      error: storageError, 
      sessionId, 
      orderId: order.id 
    }, 'Error processing images and creating jobs');
    
    // Still queue email even if image processing fails
    await queueEmail({
      orderId: order.id,
      emailType: 'order_confirmation',
      toEmail: customerEmail,
      toName: customer.name || 'Valued customer',
      subject: `Order Confirmation - ${order.order_number}`,
      sendgridTemplateId: process.env.SENDGRID_ORDER_CONFIRMATION_TEMPLATE_ID,
      dynamicData: {
        customer_name: customer.name || 'Valued customer',
        customer_email: customerEmail,
        order_id: order.order_number,
        order_date: new Date().toLocaleDateString(),
        total_amount_paid: `$${totalAmountPaid.toFixed(2)} ${order.currency}`,
        number_of_photos: 0,
        payment_intent_id: paymentIntentId
      }
    });
  }

  log.info({ orderId: order.id }, 'Checkout session processing completed successfully');
}

async function prepareImageAttachments(imageUrls: string[]): Promise<Array<{
  filename: string;
  content: string;
  type: string;
  disposition: string;
}>> {
  const attachments = [];

  for (const imageUrl of imageUrls) {
    try {
      // Download image from public URL
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      
      const imageBuffer = await response.arrayBuffer();
      const base64Content = Buffer.from(imageBuffer).toString('base64');
      
      attachments.push({
        content: base64Content,
        filename: imageUrl.split('/').pop() || 'original_image.jpg',
        type: 'image/jpeg',
        disposition: 'attachment',
      });
    } catch (downloadError) {
      logger.error({ downloadError, imageUrl }, 'Failed to prepare image attachment');
    }
  }

  return attachments;
}
