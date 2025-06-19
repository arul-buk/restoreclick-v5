// app/api/stripe/customer-portal/route.ts
/**
 * @file This API route is responsible for creating a Stripe Customer Portal session.
 * It allows authenticated users to securely manage their Stripe subscriptions and payment methods.
 */

import { NextResponse } from 'next/server';

import supabaseAdmin from '@/lib/supabaseAdmin'; // Supabase admin client for database access
import { stripe } from '@/lib/stripe'; // Stripe client for API calls
import logger from '@/lib/logger'; // Centralized logger
import { serverConfig } from '@/lib/config.server'; // Centralized server configuration

export async function POST(req: Request) {
  return new NextResponse('Customer Portal is not available in guest-only mode.', { status: 403 });
}