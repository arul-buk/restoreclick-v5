// /app/api/orders/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';
import logger from '@/lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const orderId = params.id;
  const log = logger.child({ api_route: `GET /api/orders/${orderId}` });

  if (!orderId) {
    return NextResponse.json({ error: 'Order ID is required.' }, { status: 400 });
  }

  try {
    log.info('Fetching predictions for order.');
    const { data: predictions, error } = await supabaseAdmin
      .from('predictions')
      .select('*')
      .eq('order_id', orderId);

    if (error) {
      log.error({ error }, 'Failed to fetch predictions from database.');
      throw error;
    }

    return NextResponse.json({ predictions });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error({ error: errorMessage }, 'Error fetching predictions for order.');
    return NextResponse.json({ error: 'Failed to fetch predictions.' }, { status: 500 });
  }
}
