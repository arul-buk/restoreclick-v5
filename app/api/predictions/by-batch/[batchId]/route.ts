import { NextRequest, NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';
import logger from '@/lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: { batchId: string } }
) {
  const { batchId } = params;
  const log = logger.child({ api_route: 'GET /api/predictions/by-batch/[batchId]', batchId });

  if (!batchId) {
    log.warn('Batch ID is required.');
    return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 });
  }

  try {
    log.info('Fetching order by image_batch_id.');
    // First, find the order associated with this image_batch_id
    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id') // This is the order_id
      .eq('image_batch_id', batchId)
      .single();

    if (orderError) {
      log.error({ error: orderError }, 'Error fetching order by image_batch_id.');
      if (orderError.code === 'PGRST116') { // Not found
        return NextResponse.json({ error: 'Order not found for this batch ID' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch order details' }, { status: 500 });
    }

    if (!orderData) {
      log.warn('No order found for the given batch ID.');
      return NextResponse.json({ error: 'Order not found for this batch ID' }, { status: 404 });
    }

    const orderId = orderData.id;
    log.info({ orderId }, 'Order found. Fetching associated predictions.');

    // Now, fetch all predictions for that order_id
    const { data: predictionsData, error: predictionsError } = await supabaseAdmin
      .from('predictions')
      .select('*') // Select all prediction fields
      .eq('order_id', orderId)
      .order('created_at', { ascending: true }); // Optional: order them

    if (predictionsError) {
      log.error({ error: predictionsError, orderId }, 'Error fetching predictions for order.');
      return NextResponse.json({ error: 'Failed to fetch predictions' }, { status: 500 });
    }

    log.info({ count: predictionsData?.length || 0 }, 'Successfully fetched predictions.');
    return NextResponse.json(predictionsData || []);

  } catch (error: any) {
    log.error({ error_message: error.message, stack: error.stack }, 'Unexpected error in GET /api/predictions/by-batch/[batchId].');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
