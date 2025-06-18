// app/api/checkout/route.ts

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
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
    const { userId } = auth(); // Attempt to get Clerk user ID
    const headersList = headers();
    const origin = headersList.get('origin') || 'http://localhost:3001';
    const body: CheckoutRequest = await req.json().catch(() => ({}));

    const priceId = body.priceId || serverConfig.stripe.proPlanPriceId;
    const quantity = body.quantity || 1;
    const mode = body.mode || 'payment';
    const imageBatchId = body.imageBatchId; // Expect imageBatchId from client

    let successUrl = body.successUrl || `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`;
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
        ...(imageBatchId && { imageBatchId: imageBatchId }), // Use camelCase to match webhook handler
      },
    };

    if (userId) {
      log.info({ clerk_user_id: userId, body }, 'Authenticated user initiated checkout process.');
      const { data: profile, error: dbError } = await supabaseAdmin
        .from('profiles')
        .select('email, stripe_customer_id')
        .eq('clerk_user_id', userId)
        .single();

      if (dbError || !profile?.email) {
        log.error({ error: dbError, clerk_user_id: userId, profile_data: profile }, 'User profile not found or email missing for authenticated user.');
        // For authenticated users, profile is expected. If not found, could be an issue.
        // Depending on strictness, could return error or proceed as guest-like.
        // For now, let's proceed cautiously and error if profile is missing for an auth'd user.
        return new NextResponse('User profile not found for authenticated user', { status: 404 });
      }

      stripeSessionParams.metadata = {
        ...stripeSessionParams.metadata, // This already includes image_batch_id if present
        clerk_user_id: userId,
      };

      if (profile.stripe_customer_id) {
        stripeSessionParams.customer = profile.stripe_customer_id;
      } else {
        stripeSessionParams.customer_email = profile.email;
      }
      log.info({ 
        email: profile.email, 
        price_id: priceId, 
        quantity,
        mode,
        existing_customer_id: profile.stripe_customer_id 
      }, 'Attempting to create Stripe Checkout session for authenticated user.');

    } else {
      log.info({ body }, 'Guest user initiated checkout process.');
      // For guest users, Stripe will collect the email on the checkout page.
      // customer_email is not set here to allow Stripe's UI to collect it.
      // Ensure Stripe Checkout form is configured to collect email if not automatically doing so.
      log.info({ 
        price_id: priceId, 
        quantity,
        mode
      }, 'Attempting to create Stripe Checkout session for guest user.');
    }

    const stripeSession = await stripe.checkout.sessions.create(stripeSessionParams);

    if (!stripeSession.url) {
      log.error({ clerk_user_id: userId || 'guest' }, 'Stripe failed to return a valid checkout session URL.');
      throw new Error('Failed to create Stripe session: No URL returned.');
    }

    log.info({ 
      user: userId || 'guest',
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