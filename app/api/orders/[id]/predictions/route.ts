// app/api/orders/[id]/predictions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getOrderById } from '@/lib/db/orders';
import { getRestorationJobsByOrder } from '@/lib/db/restoration-jobs';
import logger from '@/lib/logger';
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: orderId } = params;
  const log = logger.child({ api_route: 'GET /api/orders/[id]/predictions', orderId });

  if (!orderId) {
    log.warn('Order ID is required');
    return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
  }

  try {
    log.info('Fetching order and restoration jobs');

    // 1. Verify order exists
    const order = await getOrderById(orderId);
    if (!order) {
      log.warn('Order not found');
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 2. Get all restoration jobs for this order
    const restorationJobs = await getRestorationJobsByOrder(orderId);
    
    if (restorationJobs.length === 0) {
      log.info('No restoration jobs found for order');
      return NextResponse.json([]);
    }

    // 3. Check for jobs that need Replicate polling (not in final state)
    const activeJobs = restorationJobs.filter(job => 
      job.status === 'pending' || job.status === 'processing'
    );

    if (activeJobs.length > 0) {
      log.info({ count: activeJobs.length }, 'Polling Replicate for active jobs');
      
      // Poll Replicate for each active job and update database
      const { updateRestorationJobStatus } = await import('@/lib/db/restoration-jobs');
      const supabaseAdmin = (await import('@/lib/supabaseAdmin')).default;
      
      for (const job of activeJobs) {
        if (!job.external_job_id) {
          log.warn({ jobId: job.id }, 'Job missing external_job_id, skipping Replicate poll');
          continue;
        }

        try {
          log.info({ jobId: job.id, externalId: job.external_job_id }, 'Polling Replicate for job status');
          
          const replicatePrediction = await replicate.predictions.get(job.external_job_id);
          
          if (replicatePrediction.status !== job.status) {
            log.info({ 
              jobId: job.id,
              externalId: job.external_job_id,
              oldStatus: job.status, 
              newStatus: replicatePrediction.status 
            }, 'Status changed, updating database');
            
            // Map Replicate status to our job status
            let newStatus: 'pending' | 'processing' | 'completed' | 'failed';
            switch (replicatePrediction.status) {
              case 'starting':
                newStatus = 'pending';
                break;
              case 'processing':
                newStatus = 'processing';
                break;
              case 'succeeded':
                newStatus = 'completed';
                break;
              case 'failed':
              case 'canceled':
                newStatus = 'failed';
                break;
              default:
                newStatus = 'pending';
            }
            
            // Update job status
            const updateData: any = {
              status: newStatus,
              metadata: {
                ...(typeof job.metadata === 'object' && job.metadata !== null && !Array.isArray(job.metadata) ? job.metadata : {}),
                replicate_status: replicatePrediction.status,
                last_polled: new Date().toISOString()
              }
            };
            
            // If succeeded, save the restored image
            if (replicatePrediction.status === 'succeeded' && replicatePrediction.output) {
              const { storageService } = await import('@/lib/storage/storage-service');
              
              try {
                // Download restored image from Replicate
                const imageUrl = replicatePrediction.output as string;
                const imageResponse = await fetch(imageUrl);
                if (!imageResponse.ok) {
                  throw new Error(`Failed to download image: ${imageResponse.statusText}`);
                }
                const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
                
                // Save restored image
                if (!job.original_image_id) {
                  throw new Error('Original image ID is missing');
                }
                
                const restoredImageId = await storageService.saveRestored(
                  job.original_image_id,
                  imageBuffer,
                  {
                    replicate_prediction_id: replicatePrediction.id,
                    replicate_version: replicatePrediction.version
                  }
                );
                
                // Get the saved image details
                const { data: restoredImage } = await supabaseAdmin
                  .from('images')
                  .select('public_url, storage_path')
                  .eq('id', restoredImageId)
                  .single();
                
                if (restoredImage) {
                  updateData.metadata.restored_image_url = restoredImage.public_url;
                  updateData.metadata.restored_image_path = restoredImage.storage_path;
                }
                
                log.info({ 
                  jobId: job.id,
                  restoredImageUrl: updateData.metadata.restored_image_url 
                }, 'Restored image saved successfully');
                
              } catch (saveError) {
                log.error({ 
                  error: saveError, 
                  jobId: job.id 
                }, 'Failed to save restored image');
                updateData.metadata.save_error = saveError;
              }
            }
            
            // If failed, store the error
            if (replicatePrediction.status === 'failed' && replicatePrediction.error) {
              updateData.error_message = replicatePrediction.error;
              updateData.metadata.replicate_error = replicatePrediction.error;
            }
            
            await updateRestorationJobStatus(job.id, updateData);
            
            // Update the local job object for response
            Object.assign(job, updateData);
            
            log.info({ 
              jobId: job.id, 
              newStatus 
            }, 'Job updated successfully');
          } else {
            log.info({ 
              jobId: job.id, 
              status: job.status 
            }, 'No status change detected');
          }
        } catch (replicateError) {
          log.error({ 
            error: replicateError, 
            jobId: job.id,
            externalId: job.external_job_id 
          }, 'Error polling Replicate for job');
          // Continue with other jobs even if one fails
        }
      }
    }

    // 4. Transform restoration jobs to match expected prediction format for backward compatibility
    const predictions = restorationJobs.map(job => ({
      id: job.id,
      order_id: orderId,
      replicate_id: job.external_job_id,
      input_image_url: (typeof job.metadata === 'object' && job.metadata !== null && !Array.isArray(job.metadata) && 'original_image_url' in job.metadata) 
        ? job.metadata.original_image_url 
        : null,
      output_image_url: (typeof job.metadata === 'object' && job.metadata !== null && !Array.isArray(job.metadata) && 'restored_image_url' in job.metadata) 
        ? job.metadata.restored_image_url 
        : null,
      status: job.status,
      error_message: job.error_message,
      created_at: job.created_at,
      updated_at: job.updated_at,
      // Additional fields for enhanced functionality
      original_image_id: job.original_image_id,
      job_status: job.status,
      metadata: job.metadata
    }));

    log.info({ count: predictions.length }, 'Successfully fetched predictions');
    return NextResponse.json(predictions);

  } catch (error: any) {
    log.error({ 
      error_message: error.message, 
      stack: error.stack 
    }, 'Unexpected error in GET /api/orders/[id]/predictions');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
