import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { serverConfig } from '@/lib/config.server';

export async function GET() {
  try {
    // Get the price ID from environment variables
    const priceId = serverConfig.stripe.proPlanPriceId;
    
    if (!priceId) {
      return NextResponse.json(
        { error: 'Stripe price ID not configured' },
        { status: 500 }
      );
    }

    // Fetch the price from Stripe
    const price = await stripe.prices.retrieve(priceId);

    // Return the price in the smallest currency unit (e.g., cents)
    return NextResponse.json({
      id: price.id,
      unitAmount: price.unit_amount, // Price in cents
      currency: price.currency,
      type: price.type,
    });
  } catch (error) {
    console.error('Error fetching price:', error);
    return NextResponse.json(
      { error: 'Failed to fetch price' },
      { status: 500 }
    );
  }
}

// Prevent caching to always get fresh price data
export const dynamic = 'force-dynamic';
