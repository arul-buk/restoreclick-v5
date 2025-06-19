import { NextRequest, NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';
import logger from '@/lib/logger';
import Replicate from 'replicate';
import { GET as getReplicatePrediction } from '@/app/api/replicate/predictions/[id]/route';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

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

    if (!predictionsData || predictionsData.length === 0) {
      log.info('No predictions found for order.');
      return NextResponse.json([]);
    }

    // Check for predictions that need Replicate polling (not in final state)
    const nonFinalPredictions = predictionsData.filter(pred => 
      pred.status === 'starting' || pred.status === 'processing'
    );

    if (nonFinalPredictions.length > 0) {
      log.info({ count: nonFinalPredictions.length }, 'Polling Replicate for non-final predictions.');
      
      // Poll Replicate for each non-final prediction and update database
      for (const prediction of nonFinalPredictions) {
        try {
          log.info({ replicateId: prediction.replicate_id }, 'Polling Replicate for prediction status.');
          
          const replicatePrediction = await replicate.predictions.get(prediction.replicate_id);
          
          if (replicatePrediction.status !== prediction.status) {
            log.info({ 
              replicateId: prediction.replicate_id, 
              oldStatus: prediction.status, 
              newStatus: replicatePrediction.status 
            }, 'Status changed, updating database.');
            
            // Update database with new status
            const updateData: any = {
              status: replicatePrediction.status,
              updated_at: new Date().toISOString(),
            };
            
            // If succeeded, store the output URL
            if (replicatePrediction.status === 'succeeded' && replicatePrediction.output) {
              updateData.output_image_url = replicatePrediction.output;

              // Trigger the email sending logic by calling the other GET endpoint
              // We need to construct a mock request and params object for it
              const mockRequest = new NextRequest(req.url); // Use the current request URL
              const mockParams = { params: Promise.resolve({ id: prediction.replicate_id }) };
              
              log.info({ replicateId: prediction.replicate_id }, 'Triggering email send via /api/replicate/predictions/[id].');
              // Await the call to ensure email sending completes before returning
              await getReplicatePrediction(mockRequest, mockParams);
            }
            
            // If failed, store the error
            if (replicatePrediction.status === 'failed' && replicatePrediction.error) {
              updateData.error_message = replicatePrediction.error;
            }
            
            await supabaseAdmin
              .from('predictions')
              .update(updateData)
              .eq('replicate_id', prediction.replicate_id);
              
            // Update the local prediction object for response
            Object.assign(prediction, updateData);
            
            log.info({ replicateId: prediction.replicate_id, newStatus: replicatePrediction.status }, 'Database updated successfully.');
          } else {
            log.info({ replicateId: prediction.replicate_id, status: prediction.status }, 'No status change detected.');
          }
        } catch (replicateError) {
          log.error({ error: replicateError, replicateId: prediction.replicate_id }, 'Error polling Replicate for prediction.');
          // Continue with other predictions even if one fails
        }
      }
    }

    log.info({ count: predictionsData?.length || 0 }, 'Successfully fetched predictions.');
    return NextResponse.json(predictionsData || []);

  } catch (error: any) {
    log.error({ error_message: error.message, stack: error.stack }, 'Unexpected error in GET /api/predictions/by-batch/[batchId].');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
