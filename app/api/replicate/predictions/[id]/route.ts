import { NextRequest, NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';
import logger from '@/lib/logger';
import Replicate from 'replicate';
import { v4 as uuidv4 } from 'uuid';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: predictionId } = await params;
    const log = logger.child({ api_route: 'GET /api/replicate/predictions/[id]', prediction_id: predictionId });
    log.info('Polling for prediction status.');

    // Check database first to see if this prediction has already been processed
    const { data: dbPrediction, error: dbFetchError } = await supabaseAdmin
      .from('predictions')
      .select('replicate_id, order_id, status, output_image_url, error_message') // Ensure order_id is selected
      .eq('replicate_id', predictionId)
      .single();

    if (dbFetchError && dbFetchError.code !== 'PGRST116') { // PGRST116: Not found, which is fine
      log.error({ error: dbFetchError }, 'Error fetching prediction from DB.');
      return NextResponse.json({ error: 'Failed to fetch prediction from database.' }, { status: 500 });
    }

    if (dbPrediction) {
      log.info({ status: dbPrediction.status }, 'Found prediction in DB.');
      if (dbPrediction.status === 'succeeded' || dbPrediction.status === 'failed' || dbPrediction.status === 'canceled') {
        log.info('Prediction already in a final state in DB. Returning stored status.');
        // Construct a Replicate-like response object for the client
        const clientResponse = {
          id: dbPrediction.replicate_id,
          status: dbPrediction.status,
          output: dbPrediction.status === 'succeeded' ? dbPrediction.output_image_url : null,
          error: dbPrediction.status === 'failed' ? dbPrediction.error_message : null,
          // Add other fields like 'version', 'input', 'logs', 'metrics' if your client needs them
          // For now, keeping it minimal based on typical polling needs.
        };
        return NextResponse.json(clientResponse);
      }
    }
    // If not in DB with a final status, or not found, proceed to poll Replicate.

    if (!predictionId) {
      return NextResponse.json({ error: 'Prediction ID is required.' }, { status: 400 });
    }

    const prediction = await replicate.predictions.get(predictionId);

    if (prediction?.error) {
      return NextResponse.json({ error: prediction.error }, { status: 500 });
    }

    // If the prediction has reached a final state, update our database.
    log.info({ status: prediction.status }, 'Fetched prediction status from Replicate.');

    if (prediction.status === 'succeeded') {
      log.info({ output: prediction.output }, 'Prediction succeeded. Processing output.');
      if (!prediction.output || (Array.isArray(prediction.output) && prediction.output.length === 0)) {
        log.error('Prediction succeeded but no output URL was provided by Replicate.');
        // Update status to reflect error or handle as needed
        await supabaseAdmin
          .from('predictions')
          .update({
            status: 'failed', // Or a custom status like 'succeeded_no_output'
            error_message: 'Replicate succeeded but provided no output URL.',
            updated_at: new Date().toISOString(),
          })
          .eq('replicate_id', prediction.id);
        return NextResponse.json(prediction); // Return original prediction, client can see our DB status
      }

      const restoredImageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
      log.info({ restoredImageUrl }, 'Attempting to download image from Replicate URL.');
      const response = await fetch(restoredImageUrl, { cache: 'no-store' });
      log.info({ status: response.status, statusText: response.statusText }, 'Response from fetching Replicate image URL.');

      if (!response.ok) {
        log.error({ url: restoredImageUrl, status: response.status }, 'Failed to download image from Replicate.');
        await supabaseAdmin
          .from('predictions')
          .update({
            status: 'failed', // Or 'download_failed'
            error_message: `Failed to download image from Replicate. Status: ${response.status}`,
            updated_at: new Date().toISOString(),
          })
          .eq('replicate_id', prediction.id);
        // Still return the prediction, client can check DB for detailed status
        return NextResponse.json(prediction);
      }
      const imageBuffer = await response.arrayBuffer();

      let orderIdToUse: string | undefined = dbPrediction?.order_id;

      if (orderIdToUse) {
        log.info({ orderId: orderIdToUse }, "Using order_id from initial DB record.");
      } else {
        log.warn("order_id not available from initial DB check or initial record not found. Fetching details for path construction.");
        const { data: currentPredictionRecord, error: currentPredictionError } = await supabaseAdmin
          .from('predictions')
          .select('order_id') // only need order_id
          .eq('replicate_id', predictionId)
          .single();

        if (currentPredictionError || !currentPredictionRecord?.order_id) {
          log.error({ error: currentPredictionError, replicateId: predictionId }, 'Critical: Failed to retrieve order_id for a successful Replicate prediction. Cannot save image.');
          await supabaseAdmin.from('predictions').update({
            status: 'failed',
            error_message: 'Internal error: Succeeded in Replicate, but system failed to find associated order_id.',
            updated_at: new Date().toISOString(),
          }).eq('replicate_id', predictionId);
          return NextResponse.json(prediction); 
        }
        orderIdToUse = currentPredictionRecord.order_id;
      }

      if (orderIdToUse) { // orderIdToUse should now be guaranteed if we haven't returned
        const contentType = response.headers.get('content-type') || 'image/png'; // Default to png if not specified
        log.info({ contentType }, 'Determined content type for restored image.');
        const extension = `.${contentType.split('/')[1]}`;

        const fileId = uuidv4();
        const today = new Date().toISOString().split('T')[0];
        const newFilename = `${today}_${orderIdToUse.substring(0, 8)}_${fileId.substring(0, 8)}${extension}`;
        const restoredFilePath = `restored/${orderIdToUse}/${newFilename}`;
        log.info({ restoredFilePath }, 'Constructed Supabase file path for restored image.');

        log.info({ path: restoredFilePath }, 'Uploading restored image to Supabase.');

        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from('photos')
          .upload(restoredFilePath, imageBuffer, { contentType });

        if (uploadError) {
          log.error({ error: uploadError, path: restoredFilePath }, 'Supabase storage upload failed.');
          await supabaseAdmin
            .from('predictions')
            .update({
              status: 'failed', // Or 'upload_failed'
              error_message: `Supabase storage upload failed: ${uploadError.message}`,
              updated_at: new Date().toISOString(),
            })
            .eq('replicate_id', prediction.id);
          // Still return the prediction, client can check DB for detailed status
          return NextResponse.json(prediction);
        }

        log.info({ uploadData, path: restoredFilePath }, 'Successfully uploaded restored image to Supabase.');

        const { data: publicUrlData } = supabaseAdmin.storage
          .from('photos')
          .getPublicUrl(restoredFilePath);

        await supabaseAdmin
          .from('predictions')
          .update({
            status: 'succeeded',
            output_image_url: publicUrlData.publicUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('replicate_id', prediction.id);

        log.info({ prediction_id: prediction.id }, 'Successfully updated prediction with restored image URL.');

        // Fetch the updated record from DB to return to client
        const { data: updatedDbPrediction, error: fetchUpdatedError } = await supabaseAdmin
          .from('predictions')
          .select('replicate_id, status, output_image_url, error_message')
          .eq('replicate_id', prediction.id)
          .single();

        if (fetchUpdatedError) {
          log.error({ error: fetchUpdatedError }, 'Failed to fetch updated prediction from DB after storing image.');
          // Fallback to returning the Replicate prediction object, though output_image_url will be Replicate's
          return NextResponse.json(prediction);
        }

        if (updatedDbPrediction) {
          const clientResponse = {
            id: updatedDbPrediction.replicate_id,
            status: updatedDbPrediction.status,
            output: updatedDbPrediction.output_image_url, // This is the Supabase URL
            error: updatedDbPrediction.error_message,
            // Replicate's original output can be added if needed, e.g., under a different key
            // original_replicate_output: prediction.output 
          };
          log.info({ clientResponse }, 'Returning updated prediction from DB to client.');
          return NextResponse.json(clientResponse);
        }
        // Fallback if somehow not found after update
        log.warn('Updated prediction not found in DB immediately after update. Returning original Replicate object.');
        return NextResponse.json(prediction);
      }
    } else if (prediction.status === 'failed' || prediction.status === 'canceled') {
      await supabaseAdmin
        .from('predictions')
        .update({
          status: prediction.status,
          updated_at: new Date().toISOString(),
        })
        .eq('replicate_id', prediction.id);
    }

    return NextResponse.json(prediction);

  } catch (error) {
    console.error('Error fetching prediction status:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
