// app/api/stripe/customer-portal/route.ts
/**
 * @file This API route is responsible for creating a Stripe Customer Portal session.
 * It allows authenticated users to securely manage their Stripe subscriptions and payment methods.
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server'; // Clerk for server-side authentication
import supabaseAdmin from '@/lib/supabaseAdmin'; // Supabase admin client for database access
import { stripe } from '@/lib/stripe'; // Stripe client for API calls
import logger from '@/lib/logger'; // Centralized logger
import { serverConfig } from '@/lib/config.server'; // Centralized server configuration

export async function POST(req: Request) {
  // Create a child logger for this specific API route
  const log = logger.child({ api_route: 'POST /api/stripe/customer-portal' });

  try {
    const { userId } = auth(); // Get the authenticated user's ID from Clerk

    if (!userId) {
      log.warn('Unauthorized attempt to access Stripe Customer Portal: No Clerk user ID found.');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    log.info({ clerk_user_id: userId }, 'Authenticated user requesting Stripe Customer Portal session.');

    // Fetch the user's profile from Supabase to get their Stripe Customer ID
    const { data: profile, error: dbError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id') // Only need the stripe_customer_id
      .eq('clerk_user_id', userId)
      .single();

    if (dbError) {
      log.error({ error: dbError, clerk_user_id: userId }, 'Error fetching user profile from Supabase for Stripe Customer Portal.');
      return new NextResponse('Internal Server Error: Could not fetch profile.', { status: 500 });
    }

    // If the user does not have a stripe_customer_id, they haven't subscribed yet.
    if (!profile || !profile.stripe_customer_id) {
      log.info({ clerk_user_id: userId }, 'User does not have a Stripe Customer ID. Cannot create Customer Portal session.');
      return new NextResponse('You do not have an active Stripe subscription to manage.', { status: 400 });
    }

    const stripeCustomerId = profile.stripe_customer_id;
    const origin = req.headers.get('origin') || 'http://localhost:3001'; // Get the origin for return_url

    log.info({ clerk_user_id: userId, stripe_customer_id: stripeCustomerId }, 'Creating Stripe Customer Portal session.');

    // Create a Customer Portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId, // Use the user's Stripe Customer ID
      return_url: `${origin}/account`, // URL to redirect the user back to after they finish in the portal
    });

    if (!portalSession.url) {
      log.error({ clerk_user_id: userId, stripe_customer_id: stripeCustomerId }, 'Stripe failed to return a Customer Portal session URL.');
      throw new Error('Failed to create Stripe Customer Portal session: No URL returned.');
    }

    log.info({ clerk_user_id: userId, stripe_customer_id: stripeCustomerId, portal_url: portalSession.url }, 'Successfully created Stripe Customer Portal session.');
    return NextResponse.json({ url: portalSession.url });

  } catch (error: any) {
    // Log any unexpected errors
    log.error({ error_message: error.message, error_stack: error.stack }, '[STRIPE_PORTAL_ERROR] An unexpected error occurred while creating Customer Portal session.');
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}