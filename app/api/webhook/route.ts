import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { Webhook } from 'svix';
import { WebhookEvent } from '@clerk/nextjs/server';
import { stripe } from '@/lib/stripe';
import { serverConfig } from '@/lib/config.server';
import supabaseAdmin from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  // Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");
  const stripe_signature = headerPayload.get("stripe-signature");

  // If there are no headers and no signature, it's not a webhook we can process
  if ((!svix_id || !svix_timestamp || !svix_signature) && !stripe_signature) {
    return new Response('No webhook signature', { status: 400 });
  }

  // Handle Stripe webhook
  if (stripe_signature) {
    try {
      const body = await req.text();
      const event = stripe.webhooks.constructEvent(
        body,
        stripe_signature,
        serverConfig.stripe.webhookSecret
      );

      // Handle the event
      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object;
          console.log('Checkout session completed:', session);
          // Handle successful checkout
          const imageBatchId = session.client_reference_id;

          if (!imageBatchId) {
            console.error('No imageBatchId found in checkout session.');
            return new Response('No imageBatchId found', { status: 400 });
          }

          console.log('Attempting to insert order with imageBatchId:', imageBatchId);
          const { data, error } = await supabaseAdmin.from('orders').insert({
            id: session.id, // Use session ID as order ID
            image_batch_id: imageBatchId,
            amount_total: session.amount_total,
            currency: session.currency,
            customer_email: session.customer_details?.email,
            payment_status: session.payment_status,
            status: 'pending' // Initial status
          });

          if (error) {
            console.error('Error inserting order:', error);
            return new Response(`Webhook Error: ${error.message}`, { status: 500 });
          }

          console.log('Order created successfully:', data);
          break;
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object;
          console.log('PaymentIntent was successful!', paymentIntent);
          break;
        case 'payment_method.attached':
          const paymentMethod = event.data.object;
          console.log('PaymentMethod was attached!', paymentMethod);
          break;
        // ... handle other event types
        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      return NextResponse.json({ received: true });
    } catch (err) {
      console.error(`Webhook Error: ${err}`);
      return new Response(`Webhook Error: ${err}`, { status: 400 });
    }
  }

  // Handle Clerk webhook
  if (svix_id && svix_timestamp && svix_signature) {
    // Clerk webhook handling logic here
    // ...
  }


  return new Response('Invalid webhook', { status: 400 });
}

export const dynamic = 'force-dynamic';
