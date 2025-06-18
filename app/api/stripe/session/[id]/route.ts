// /app/api/stripe/session/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import supabaseAdmin from '@/lib/supabaseAdmin';
import logger from '@/lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id;
  const log = logger.child({ api_route: `GET /api/stripe/session/${sessionId}` });

  if (!sessionId) {
    return NextResponse.json({ error: 'Stripe Session ID is required.' }, { status: 400 });
  }

  try {
    log.info('Retrieving Stripe checkout session.');
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paymentIntentId = session.payment_intent as string;

    if (!paymentIntentId) {
      log.warn({ sessionId }, 'No payment intent found for session.');
      return NextResponse.json({ error: 'Payment intent not found for this session.' }, { status: 404 });
    }

    log.info({ paymentIntentId }, 'Fetching order by payment intent ID.');
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single();

    if (error || !order) {
      log.error({ error, paymentIntentId }, 'Failed to fetch order from database.');
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    log.info({ orderId: order.id }, 'Fetching predictions for order.');
    const { data: predictions, error: predictionsError } = await supabaseAdmin
      .from('predictions')
      .select('*')
      .eq('order_id', order.id);

    if (predictionsError) {
      log.error({ error: predictionsError, orderId: order.id }, 'Failed to fetch predictions.');
      return NextResponse.json({ error: 'Failed to fetch predictions.' }, { status: 500 });
    }

    return NextResponse.json({ order, predictions });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error({ error: errorMessage }, 'Error fetching order by session ID.');
    return NextResponse.json({ error: 'Failed to fetch order details.' }, { status: 500 });
  }
}
