import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import logger from '@/lib/logger';

export async function POST(req: Request) {
  try {
    const { priceId, quantity = 1, sessionId } = await req.json();

    if (!priceId) {
      return new NextResponse('Price ID is required', { status: 400 });
    }

    if (!sessionId) {
      return new NextResponse('Session ID is required', { status: 400 });
    }

    logger.info({ priceId, quantity, sessionId }, 'Creating checkout session');

    // Create a checkout session with session_id in metadata
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: quantity,
        },
      ],
      mode: 'payment',
      metadata: {
        session_id: sessionId, // Changed from batch_id to session_id
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/processing?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      customer_creation: 'always',
    });

    logger.info({ 
      checkoutSessionId: session.id, 
      sessionId,
      url: session.url 
    }, 'Checkout session created successfully');

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url 
    });
  } catch (err) {
    logger.error({ error: err }, 'Error creating checkout session');
    return new NextResponse('Internal server error', { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
