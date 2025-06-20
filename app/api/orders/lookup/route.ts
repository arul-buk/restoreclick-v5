// app/api/orders/lookup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getOrderByCheckoutSession } from '@/lib/db/orders';
import logger from '@/lib/logger';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const checkoutSessionId = searchParams.get('checkout_session_id');
  const sessionId = searchParams.get('session_id');
  
  const log = logger.child({ 
    api_route: 'GET /api/orders/lookup',
    checkoutSessionId,
    sessionId
  });

  if (!checkoutSessionId && !sessionId) {
    log.warn('No checkout session ID or session ID provided');
    return NextResponse.json({ 
      error: 'checkout_session_id or session_id parameter is required' 
    }, { status: 400 });
  }

  try {
    log.info('Looking up order by checkout session');

    // Try to find order by checkout session ID first
    let order = null;
    if (checkoutSessionId) {
      order = await getOrderByCheckoutSession(checkoutSessionId);
    }

    // If not found and we have a session_id, try using that as order ID directly
    // This is a temporary bridge for the transition period
    if (!order && sessionId) {
      const { getOrderById } = await import('@/lib/db/orders');
      try {
        order = await getOrderById(sessionId);
      } catch (error) {
        // Ignore error, order might not exist with session ID as order ID
        log.debug({ error }, 'Order not found with session ID as order ID');
      }
    }

    if (!order) {
      log.warn('Order not found for provided identifiers');
      return NextResponse.json({ 
        error: 'Order not found' 
      }, { status: 404 });
    }

    log.info({ orderId: order.id }, 'Order found successfully');

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.order_number,
      status: order.status,
      customerEmail: order.customer_email,
      createdAt: order.created_at
    });

  } catch (error: any) {
    log.error({ 
      error_message: error.message, 
      stack: error.stack 
    }, 'Unexpected error in GET /api/orders/lookup');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
