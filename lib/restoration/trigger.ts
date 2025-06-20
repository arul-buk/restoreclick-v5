// lib/restoration/trigger.ts
import supabaseAdmin from '@/lib/supabaseAdmin';
import logger from '@/lib/logger';
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

/**
 * Trigger restoration processing for pending jobs in an order
 */
export async function triggerRestorationForOrder(orderId: string): Promise<void> {
  const log = logger.child({ orderId, function: 'triggerRestorationForOrder' });
  log.info('Starting restoration processing for order');

  try {
    // Get all pending restoration jobs for this order
    const { data: pendingJobs, error: fetchError } = await supabaseAdmin
      .from('restoration_jobs')
      .select(`
        id,
        original_image_id,
        input_parameters,
        metadata,
        images!restoration_jobs_original_image_id_fkey!inner(order_id, public_url)
      `)
      .eq('images.order_id', orderId)
      .eq('status', 'pending');

    if (fetchError) {
      log.error({ error: fetchError }, 'Failed to fetch pending restoration jobs');
      throw fetchError;
    }

    if (!pendingJobs || pendingJobs.length === 0) {
      log.warn('No pending restoration jobs found for order');
      return;
    }

    log.info({ jobCount: pendingJobs.length }, 'Found pending restoration jobs');

    // Process each job
    for (const job of pendingJobs) {
      try {
        log.info({ jobId: job.id }, 'Submitting job to Replicate');

        const useRealReplicate = process.env.REPLICATE_TEST_STATUS === 'TRUE';
        let prediction;

        if (useRealReplicate) {
          // Use real Replicate API
          log.info({ jobId: job.id }, 'Using real Replicate API');
          prediction = await replicate.predictions.create({
            version: "85ae46551612b8f778348846b6ce1ce1b340e384fe2062399c0c412be29e107d",
            input: {
              input_image: job.input_parameters.input_image,
              seed: job.input_parameters.seed || Math.floor(Math.random() * 1000000),
              output_format: process.env.REPLICATE_OUTPUT_FORMAT || 'png',
              safety_tolerance: parseInt(process.env.REPLICATE_SAFETY_TOLERANCE || '0')
            },
            webhook: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/replicate`,
            webhook_events_filter: ["completed"]
          });
        } else {
          // Use mock response for testing
          log.info({ jobId: job.id }, 'Using mock Replicate response for testing');
          const mockImageUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/images/showcase-scratches-after.png`;
          prediction = {
            id: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            status: 'succeeded',
            output: mockImageUrl,
            urls: {
              get: `https://api.replicate.com/v1/predictions/mock_${Date.now()}`
            }
          };
        }

        // Update job status with external ID
        const { error: updateError } = await supabaseAdmin
          .from('restoration_jobs')
          .update({
            status: useRealReplicate ? 'processing' : 'completed',
            external_job_id: prediction.id,
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...(useRealReplicate ? {} : {
              completed_at: new Date().toISOString()
            }),
            metadata: {
              ...job.metadata,
              replicate_prediction_id: prediction.id,
              submitted_at: new Date().toISOString(),
              replicate_status: prediction.status,
              test_mode: !useRealReplicate,
              ...(useRealReplicate ? {} : { mock_output_url: prediction.output })
            }
          })
          .eq('id', job.id);

        if (updateError) {
          log.error({ error: updateError, jobId: job.id }, 'Failed to update job status');
          continue;
        }

        log.info({ 
          jobId: job.id, 
          externalId: prediction.id,
          replicateStatus: prediction.status,
          testMode: !useRealReplicate,
          outputUrl: useRealReplicate ? undefined : prediction.output
        }, useRealReplicate ? 'Job submitted to Replicate successfully' : 'Job completed with mock response');

      } catch (jobError) {
        log.error({ error: jobError, jobId: job.id }, 'Failed to submit job to Replicate');
        
        // Mark job as failed
        await supabaseAdmin
          .from('restoration_jobs')
          .update({
            status: 'failed',
            failed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            error_message: `Failed to submit to Replicate: ${jobError}`
          })
          .eq('id', job.id);
      }
    }

    log.info({ orderId, processedJobs: pendingJobs.length }, 'Restoration processing triggered successfully');

  } catch (error) {
    log.error({ error }, 'Failed to trigger restoration processing');
    throw error;
  }
}
