import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

import { stripe } from '@/lib/stripe';
import { serverConfig } from '@/lib/config.server';
import supabaseAdmin from '@/lib/supabaseAdmin';
import Replicate from 'replicate';
import { v4 as uuidv4 } from 'uuid';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || '',
});

export async function POST(req: Request) {
  // Get the headers
  const headerPayload = await headers();
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

  return new Response('Invalid webhook', { status: 400 });
}

export const dynamic = 'force-dynamic';
