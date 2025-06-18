/**
 * @file Stripe Webhook Handler
 * @description This file contains the API route for handling incoming webhooks from Stripe.
 * It processes events like successful payments and subscription updates.
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { Readable } from 'stream';
import { Logger } from 'pino';
import { stripe } from '@/lib/stripe';
import supabaseAdmin from '@/lib/supabaseAdmin';
import logger from '@/lib/logger';
import Stripe from 'stripe';
import { serverConfig } from '@/lib/config.server';
import { v4 as uuidv4 } from 'uuid';

// Define the structure of the metadata we expect from Stripe Checkout
interface CheckoutSessionMetadata {
  userId?: string;
  imageBatchId?: string;
}

/**
 * Reads the raw body from a NextRequest stream.
 * @param req The NextRequest object.
 * @returns A promise that resolves to the raw request body as a Buffer.
 */
async function getRawBody(req: NextRequest): Promise<Buffer> {
  const readable = req.body as ReadableStream<Uint8Array>;
  const reader = readable.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  return Buffer.concat(chunks);
}

/**
 * The main handler for incoming Stripe webhooks.
 * It verifies the signature and routes the event to the appropriate handler.
 */
export async function POST(req: NextRequest) {
  const signature = headers().get('stripe-signature');
  const log = logger.child({ api_route: 'POST /api/webhooks/stripe' });

  if (!signature) {
    log.warn('Missing Stripe signature.');
    return NextResponse.json({ error: 'Missing Stripe signature.' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const body = await getRawBody(req);
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      serverConfig.stripe.webhookSecret
    );
  } catch (err: any) {
    log.error({ error: err.message }, 'Webhook signature verification failed.');
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Route the event to the appropriate handler based on its type
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session, log);
        break;
      // Add other event handlers here if needed in the future
      // case 'customer.subscription.updated':
      //   await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, log);
      //   break;
      default:
        log.info({ event_type: event.type }, 'Received unhandled Stripe event type.');
    }
  } catch (error: any) {
    log.error({ error: error.message, event_type: event.type }, 'Error handling Stripe event.');
    // Return 500 but don't block Stripe from sending future webhooks
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/**
 * Handles the 'checkout.session.completed' event.
 * This is triggered for both one-time payments and new subscriptions.
 * @param session The Stripe Checkout Session object.
 * @param log The logger instance.
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session, log: Logger) {
  const metadata = session.metadata as CheckoutSessionMetadata | null;
  const imageBatchId = metadata?.imageBatchId;
  const customerEmail = session.customer_details?.email;
  const paymentIntentId = session.payment_intent as string;

  const logContext = log.child({
    event_type: 'checkout.session.completed',
    session_id: session.id,
    customer_email: customerEmail,
    payment_intent: paymentIntentId,
    image_batch_id: imageBatchId,
  });

  logContext.info({ metadata: session.metadata }, 'Processing checkout session completed. Full metadata attached.');

  if (session.mode === 'payment') {
    await handleSuccessfulPayment(logContext, session, paymentIntentId, imageBatchId);
  } else if (session.mode === 'subscription') {
    // Handle subscription logic if needed in the future
  }
}

/**
 * Handles a successful one-time payment.
 * @param log The logger instance with context.
 * @param session The Stripe Checkout Session object.
 * @param paymentIntentId The ID of the successful Payment Intent.
 * @param imageBatchId The optional UUID for the batch of images.
 */
async function handleSuccessfulPayment(
  log: Logger,
  session: Stripe.Checkout.Session,
  paymentIntentId: string,
  imageBatchId?: string
) {
  const customerEmail = session.customer_details?.email;
  const amount = session.amount_total ? session.amount_total / 100 : 0; // Stripe sends amount in cents
  const currency = session.currency || 'usd';
  const userId = (session.metadata as CheckoutSessionMetadata | null)?.userId;

  log.info({ amount, currency }, 'Processing successful one-time payment.');

  if (imageBatchId) {
    log.info('Image batch ID found, proceeding to create order and trigger restoration.');
  } else {
    log.warn('No image batch ID found in session metadata. Restoration will not be triggered.');
  }

  if (!customerEmail) {
    log.error('No customer email found in session.');
    // Still return 200 to Stripe, as we can't retry this.
    return;
  }

  // 1. Create an order record in the database
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
      stripe_payment_intent_id: paymentIntentId,
      customer_email: customerEmail,
      amount,
      currency,
      status: 'completed',
      user_id: userId, // Can be null for guest checkouts
      image_batch_id: imageBatchId,
    })
    .select()
    .single();

  if (orderError || !order) {
    log.error({ error: orderError }, 'Failed to create order record.');
    // Critical error, but we must return 200 to Stripe.
    return;
  }

  log.info({ order_id: order.id }, 'Successfully created order record.');

  // 2. If an image batch exists, trigger the Replicate restoration process
  if (imageBatchId) {
    await triggerImageRestoration(log, imageBatchId, order.id);
  }
}

/**
 * Fetches image URLs from Supabase Storage and triggers the Replicate restoration process.
 * @param log The logger instance.
 * @param imageBatchId The UUID for the batch of uploaded images.
 * @param orderId The ID of the order this batch belongs to.
 */
async function triggerImageRestoration(log: Logger, imageBatchId: string, orderId: string) {
  const tempFolderPath = `temporary-uploads/${imageBatchId}`;
  const originalsFolderPath = `originals/${orderId}`;
  log.info({ tempFolderPath, originalsFolderPath }, 'Starting image restoration process for batch.');

  try {
    const { data: files, error: listError } = await supabaseAdmin.storage
      .from('photos')
      .list(tempFolderPath);

    if (listError) {
      throw new Error(`Failed to list files for batch ${imageBatchId}: ${listError.message}`);
    }

    if (!files || files.length === 0) {
      log.warn({ tempFolderPath }, 'No files found in temporary folder for batch.');
      return;
    }

    const fileOperations = files.map(file => {
      const fileId = uuidv4();
      const today = new Date().toISOString().split('T')[0];
      const extension = file.name.substring(file.name.lastIndexOf('.'));
      const newFilename = `${today}_${orderId.substring(0, 8)}_${fileId.substring(0, 8)}${extension}`;
      const fromPath = `${tempFolderPath}/${file.name}`;
      const toPath = `${originalsFolderPath}/${newFilename}`;
      
      return {
        fromPath,
        toPath,
        publicUrl: supabaseAdmin.storage.from('photos').getPublicUrl(toPath).data.publicUrl
      };
    });

    const movePromises = fileOperations.map(op => {
      log.info({ from: op.fromPath, to: op.toPath }, 'Moving and renaming file to permanent storage.');
      return supabaseAdmin.storage.from('photos').move(op.fromPath, op.toPath);
    });

    await Promise.all(movePromises);

    const photoUrls = fileOperations.map(op => op.publicUrl);

    let apiUrl = serverConfig.app.url;
    if (apiUrl.includes('localhost')) {
      apiUrl = apiUrl.replace('localhost', '127.0.0.1').replace('https://', 'http://');
    }

    const restorationUrl = `${apiUrl}/api/replicate/initiate-restoration`;
    log.info({ url: restorationUrl }, 'Calling internal restoration API.');

    // Pass the orderId to the restoration API
    const restorationResponse = await fetch(restorationUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoUrls, orderId }), // Pass orderId here
    });

    if (!restorationResponse.ok) {
      const errorBody = await restorationResponse.text();
      throw new Error(`Failed to initiate restoration: ${restorationResponse.status} ${errorBody}`);
    }

    // The predictions are now created in the initiate-restoration endpoint directly.
    // We can remove the logic for creating them here.
    log.info({ orderId }, 'Successfully delegated prediction creation to restoration API.');

  } catch (error: any) {
    log.error({
      error: error.message,
      stack: error.stack,
      cause: error.cause,
    }, 'Error triggering image restoration process.');

    // Update order status to reflect the failure
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ status: 'restoration_failed' })
      .eq('id', orderId);

    if (updateError) {
      log.error({ error: updateError.message, orderId }, 'Failed to update order status to restoration_failed.');
    }
    // We don't re-throw here because a failure to trigger restoration
    // shouldn't block the webhook from returning a 200 OK to Stripe.
  }
}