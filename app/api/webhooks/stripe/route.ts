// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Readable } from 'stream';
import supabaseAdmin from '@/lib/supabaseAdmin'; // For server-side operations
import { sendOrderConfirmationEmail } from '@/lib/sendgrid';
import { downloadFileAsBuffer, getSupabaseStoragePathFromUrl } from '@/lib/supabase-utils';
import logger from '@/lib/logger';
import { serverConfig } from '@/lib/config.server';
import Replicate from 'replicate';
import { v4 as uuidv4 } from 'uuid';

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN, // Ensure REPLICATE_API_TOKEN is set in your environment
});

const stripe = new Stripe(serverConfig.stripe.secretKey, {
  apiVersion: '2025-05-28.basil',
});

const relevantEvents = new Set([
  'checkout.session.completed',
  // Add other events you might want to handle, e.g., 'payment_intent.succeeded'
]);

async function buffer(readable: Readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export async function POST(req: NextRequest) {
  const rawBody = await buffer(req.body as unknown as Readable);
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = serverConfig.stripe.webhookSecret;
  let event: Stripe.Event;

  if (!sig || !webhookSecret) {
    logger.error('Stripe webhook secret or signature missing.');
    return NextResponse.json({ error: 'Webhook secret not configured.' }, { status: 400 });
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
          const session = event.data.object as Stripe.Checkout.Session;
          logger.info({ sessionId: session.id }, 'Checkout session completed event received.');

          const customerEmail = session.customer_details?.email;
          const batchId = session.metadata?.batch_id; 
          const totalAmountPaid = session.amount_total ? session.amount_total / 100 : 0;
          const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
          let listData: { name: string; id: string; updated_at: string; created_at: string; last_accessed_at: string; metadata: Record<string, any>; }[] | null = null;

          if (!customerEmail) {
            logger.error('Customer email not found in checkout session.');
            return NextResponse.json({ error: 'Customer email missing.' }, { status: 400 });
          }
          if (!batchId) {
            logger.error('Batch ID not found in checkout session metadata.');
            return NextResponse.json({ error: 'Batch ID missing.' }, { status: 400 });
          }
          if (!paymentIntentId) {
            logger.error('Payment Intent ID not found in checkout session.');
            return NextResponse.json({ error: 'Payment Intent ID missing.' }, { status: 400 });
          }

          // 1. IDEMPOTENCY CHECK
          try {
            const { data: existingOrder, error: checkOrderError } = await supabaseAdmin
              .from('orders')
              .select('id')
              .eq('stripe_payment_intent_id', paymentIntentId)
              .maybeSingle();

            if (checkOrderError) {
              logger.error({ error: checkOrderError, paymentIntentId }, 'Error checking for existing order.');
              return NextResponse.json({ error: 'Failed to check for existing order.' }, { status: 500 });
            }

            if (existingOrder) {
              logger.info({ paymentIntentId, orderId: existingOrder.id }, 'Duplicate checkout.session.completed event. Order already exists. Skipping.');
              return NextResponse.json({ received: true, message: 'Order already processed.' });
            }
          } catch (e) {
              logger.error({ error: e, paymentIntentId }, 'Exception during existing order check.');
              return NextResponse.json({ error: 'Internal server error during order check.' }, { status: 500 });
          }

          // 2. CREATE ORDER (if not existing)
          const { data: newOrder, error: insertOrderError } = await supabaseAdmin
            .from('orders')
            .insert([
              {
                image_batch_id: batchId,
                customer_email: customerEmail,
                stripe_payment_intent_id: paymentIntentId,
                amount: totalAmountPaid, // Changed from total_amount
                currency: session.currency?.toUpperCase(),
                status: 'completed',
              },
            ])
            .select('id, customer_email, image_batch_id, stripe_payment_intent_id, amount, currency, status') // Select specific fields
            .single();

          if (insertOrderError || !newOrder) {
            logger.error({ error: insertOrderError, batchId, paymentIntentId }, 'Failed to insert order into database.');
            return NextResponse.json({ error: 'Failed to create order in database.' }, { status: 500 });
          }

          logger.info({ orderId: newOrder.id, batchId }, 'Order successfully created in database.');

          // 3. INITIATE REPLICATE PREDICTIONS
          try {
            const { data: storageListData, error: listError } = await supabaseAdmin.storage
              .from('photos')
              .list(`temporary-uploads/${batchId}`, { sortBy: { column: 'name', order: 'asc' } });

            if (listError) {
              logger.error({ error: listError, batchId, orderId: newOrder.id }, 'Error listing temporary images from storage for Replicate.');
              // Continue to email, but predictions might not be created.
            } else {
              listData = storageListData; // Assign to higher scoped variable
            }
            
            if (listData && listData.length > 0) {
              const predictionPromises = listData.map(async (file) => {
                const originalImagePath = `temporary-uploads/${batchId}/${file.name}`;
                const { data: publicUrlData } = supabaseAdmin.storage
                  .from('photos')
                  .getPublicUrl(originalImagePath);
                
                const inputImageUrl = publicUrlData.publicUrl;
                if (!inputImageUrl) {
                    logger.error({originalImagePath, orderId: newOrder.id}, "Failed to get public URL for Replicate input image");
                    return null; 
                }
                logger.info({ inputImageUrl, orderId: newOrder.id }, 'Initiating Replicate prediction for image.');

                const replicatePrediction = await replicate.predictions.create({
                  model: 'flux-kontext-apps/restore-image',
                  input: { input_image: inputImageUrl },
                });

                const { error: predictionInsertError } = await supabaseAdmin
                  .from('predictions')
                  .insert({
                    id: uuidv4(),
                    order_id: newOrder.id, // Link to the order created in this webhook
                    replicate_id: replicatePrediction.id,
                    input_image_url: inputImageUrl,
                    status: replicatePrediction.status,
                  });

                if (predictionInsertError) {
                  logger.error({ error: predictionInsertError, orderId: newOrder.id, replicateId: replicatePrediction.id }, 'Error inserting prediction into DB.');
                } else {
                    logger.info({ predictionId: replicatePrediction.id, orderId: newOrder.id }, "Prediction record inserted.")
                }
                return replicatePrediction;
              });
              await Promise.all(predictionPromises.filter(p => p !== null));
              logger.info({ orderId: newOrder.id }, 'All Replicate predictions initiated and records inserted (or attempted).');
            } else {
              logger.warn({ batchId, orderId: newOrder.id }, 'No temporary images found for batchId to initiate Replicate predictions.');
            }
          } catch (replicateError) {
            logger.error({ error: replicateError, orderId: newOrder.id }, 'Error initiating Replicate predictions.');
          }

          // 4. SEND ORDER CONFIRMATION EMAIL
          const { data: finalPredictionImages, error: finalPredictionImagesError } = await supabaseAdmin
            .from('predictions')
            .select('input_image_url')
            .eq('order_id', newOrder.id) // Query by the actual order ID (UUID)
            .not('input_image_url', 'is', null);

          if (finalPredictionImagesError) {
            logger.error({ error: finalPredictionImagesError, orderId: newOrder.id }, 'Failed to fetch original image URLs from predictions table for order confirmation.');
          }

          const finalOriginalImageUrls: string[] = finalPredictionImages ? finalPredictionImages.map(p => p.input_image_url).filter(url => url) : [];
          if (finalOriginalImageUrls.length === 0 && listData && listData.length > 0) { // only warn if we expected images
            logger.warn({ orderId: newOrder.id }, 'No original image URLs found in predictions for order confirmation email, though images were processed for Replicate.');
          }

          const attachments = [];
          for (const imageUrl of finalOriginalImageUrls) {
            try {
              const pathDetails = getSupabaseStoragePathFromUrl(imageUrl);
              if (pathDetails && pathDetails.bucketName && pathDetails.filePath) {
                const { bucketName, filePath } = pathDetails;
                const imageBuffer = await downloadFileAsBuffer(bucketName, filePath);
                attachments.push({
                  content: imageBuffer.toString('base64'),
                  filename: filePath.split('/').pop() || 'original_image.jpg',
                  type: 'image/jpeg', 
                  disposition: 'attachment',
                });
              } else {
                logger.warn({ imageUrl, orderId: newOrder.id }, "Could not derive path details for email attachment.")
              }
            } catch (downloadError) {
              logger.error({ downloadError, imageUrl, orderId: newOrder.id }, 'Failed to download or prepare image attachment for order confirmation.');
            }
          }

          const dynamicData = {
            customer_email: newOrder.customer_email, // Use email from newOrder for consistency
            order_id: newOrder.id, // Use the actual order ID (UUID)
            order_date: new Date(session.created * 1000).toLocaleDateString(),
            total_amount_paid: `$${(newOrder.amount || 0).toFixed(2)} ${newOrder.currency || ''}`,
            number_of_photos: finalOriginalImageUrls.length,
            payment_intent_id: newOrder.stripe_payment_intent_id,
          };

          await sendOrderConfirmationEmail({
            to: newOrder.customer_email as string,
            dynamicData: dynamicData,
            attachments: attachments.length > 0 ? attachments : undefined,
          });

          logger.info({ orderId: newOrder.id, customerEmail: newOrder.customer_email }, 'Order confirmation email sent.');
          break;

        default:
          logger.warn(`Unhandled relevant event type: ${event.type}`);
      }
    } catch (error) {
      logger.error({ error, eventType: event.type }, 'Error handling Stripe event.');
      // Consider if a 500 response is more appropriate here for unhandled errors within the try block
      // return NextResponse.json({ error: 'Internal server error handling event.' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
