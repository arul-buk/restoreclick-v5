// app/api/checkout/route.ts

import { NextResponse } from 'next/server';

import { headers } from 'next/headers';
import type Stripe from 'stripe';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { stripe } from '@/lib/stripe';
import logger from '@/lib/logger';
import { serverConfig } from '@/lib/config.server';

type CheckoutRequest = {
  priceId?: string;
  quantity?: number;
  mode?: 'subscription' | 'payment';
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, string>;
  imageBatchId?: string; // Added to support passing the batch ID for uploaded images
};

export async function POST(req: Request) {
  const log = logger.child({ api_route: 'POST /api/checkout' });

  try {
    const headersList = headers();
    const origin = headersList.get('origin') || 'http://localhost:3001';
    const body: CheckoutRequest = await req.json().catch(() => ({}));

    const priceId = body.priceId || serverConfig.stripe.proPlanPriceId;
    const quantity = body.quantity || 1;
    const mode = body.mode || 'payment';
    const imageBatchId = body.imageBatchId; // Expect imageBatchId from client

    let successUrl = body.successUrl || `${origin}/processing?session_id={CHECKOUT_SESSION_ID}`;
    if (imageBatchId) {
      successUrl = `${successUrl}&batch_id=${imageBatchId}`;
    }
    const cancelUrl = body.cancelUrl || `${origin}/cancel`;

    let stripeSessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity,
        },
      ],
      mode,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        ...(body.metadata || {}),
        ...(imageBatchId && { batch_id: imageBatchId }), // Use snake_case to match webhook handler
      },
    };

    log.info({ body }, 'Guest user initiated checkout process.');
    // For guest users, Stripe will collect the email on the checkout page.
    // customer_email is not set here to allow Stripe's UI to collect it.
    // Ensure Stripe Checkout form is configured to collect email if not automatically doing so.

    const stripeSession = await stripe.checkout.sessions.create(stripeSessionParams);

    if (!stripeSession.url) {
      log.error({ }, 'Stripe failed to return a valid checkout session URL.');
      throw new Error('Failed to create Stripe session: No URL returned.');
    }

    log.info({ 
      user: 'guest',
      stripe_session_id: stripeSession.id, 
      session_url: stripeSession.url,
      mode
    }, 'Successfully created Stripe Checkout session.');

    return NextResponse.json({ url: stripeSession.url });

  } catch (error: any) {
    log.error({ 
      error_message: error.message, 
      error_stack: error.stack 
    }, '[STRIPE_CHECKOUT_ERROR] An unexpected error occurred during checkout session creation.');
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}