// lib/workers/restoration-worker.ts
import { 
  getRestorationJobsByStatus, 
  updateRestorationJobStatus,
  markRestorationJobFailed 
} from '@/lib/db/restoration-jobs';
import { getOrderById, updateOrderStatus } from '@/lib/db/orders';
import { queueEmail } from '@/lib/db/email-queue';
import { storageService } from '@/lib/storage/storage-service';
import logger from '@/lib/logger';
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

export class RestorationWorker {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly pollInterval: number;
  private readonly maxRetries: number;

  constructor(pollInterval = 60000, maxRetries = 3) { // 60 seconds (1 minute) default
    this.pollInterval = pollInterval;
    this.maxRetries = maxRetries;
  }

  start() {
    if (this.isRunning) {
      logger.warn('Restoration worker is already running');
      return;
    }

    this.isRunning = true;
    logger.info({ pollInterval: this.pollInterval }, 'Starting restoration worker');
    console.log(`[${new Date().toISOString()}] RESTORATION WORKER STARTING - Interval: ${this.pollInterval}ms`);

    // Run immediately, then on interval
    this.processJobs();
    this.intervalId = setInterval(() => {
      this.processJobs();
    }, this.pollInterval);
  }

  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    logger.info('Restoration worker stopped');
  }

  private async processJobs() {
    if (!this.isRunning) return;

    const log = logger.child({ worker: 'restoration' });
    
    try {
      // Get pending jobs that need to be submitted to Replicate
      const pendingJobs = await getRestorationJobsByStatus('pending');
      
      // Get processing jobs that need status updates
      const processingJobs = await getRestorationJobsByStatus('processing');

      log.info({ 
        pendingCount: pendingJobs.length, 
        processingCount: processingJobs.length 
      }, 'Processing restoration jobs');

      // Submit pending jobs to Replicate
      for (const job of pendingJobs) {
        await this.submitJobToReplicate(job);
      }

      // Poll processing jobs for updates
      for (const job of processingJobs) {
        await this.pollJobStatus(job);
      }

    } catch (error) {
      log.error({ error }, 'Error in restoration worker process');
    }
  }

  private async submitJobToReplicate(job: any) {
    const log = logger.child({ 
      jobId: job.id, 
      worker: 'restoration' 
    });

    try {
      log.info('Submitting job to Replicate');

      const useRealReplicate = process.env.REPLICATE_TEST_STATUS === 'TRUE';
      let prediction;

      if (useRealReplicate) {
        // Use real Replicate API
        log.info({ jobId: job.id }, 'Using real Replicate API');
        prediction = await replicate.predictions.create({
          model: process.env.REPLICATE_MODEL || 'flux-kontext-apps/restore-image',
          input: {
            input_image: job.input_parameters.input_image,
            seed: job.input_parameters.seed || Math.floor(Math.random() * 1000000),
            output_format: process.env.REPLICATE_OUTPUT_FORMAT || 'png',
            safety_tolerance: parseInt(process.env.REPLICATE_SAFETY_TOLERANCE || '0')
          }
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

      // Update job with external ID and processing status
      await updateRestorationJobStatus(job.id, 'processing', {
        external_job_id: prediction.id,
        metadata: {
          ...job.metadata,
          replicate_prediction_id: prediction.id,
          submitted_at: new Date().toISOString(),
          replicate_status: prediction.status,
          original_image_url: job.metadata?.original_image_url || job.input_parameters?.input_image
        }
      });

      log.info({ 
        externalId: prediction.id,
        replicateStatus: prediction.status 
      }, 'Job submitted to Replicate successfully');

    } catch (error) {
      log.error({ error }, 'Failed to submit job to Replicate');
      
      // Increment retry count
      const retryCount = (job.retry_count || 0) + 1;
      
      if (retryCount >= this.maxRetries) {
        await markRestorationJobFailed(job.id, `Max retries exceeded: ${error}`);
        log.error({ retryCount }, 'Job failed after max retries');
      } else {
        await updateRestorationJobStatus(job.id, 'failed', {
          attempt_number: retryCount,
          error_message: `Retry ${retryCount}: ${error}`,
          metadata: {
            ...job.metadata,
            last_error: error,
            retry_at: new Date(Date.now() + (retryCount * 60000)).toISOString() // Exponential backoff
          }
        });
        log.warn({ retryCount }, 'Job will be retried');
      }
    }
  }

  private async pollJobStatus(job: any) {
    const log = logger.child({ 
      jobId: job.id, 
      externalId: job.external_id,
      worker: 'restoration' 
    });

    if (!job.external_id) {
      // Check if job has been stuck for too long
      const createdAt = new Date(job.created_at);
      const now = new Date();
      const hoursSinceCreated = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceCreated > 1) { // 1 hour timeout
        log.warn({ hoursSinceCreated }, 'Job stuck without external_id for too long, marking as failed');
        
        try {
          await markRestorationJobFailed(job.id, 'Job stuck without external_id for over 1 hour');
          return;
        } catch (error) {
          log.error({ error }, 'Failed to mark stuck job as failed');
        }
      }
      
      log.warn('Job missing external_id, cannot poll status');
      return;
    }

    // Skip polling if webhooks are enabled and job was recently updated
    const lastWebhookReceived = job.metadata?.last_webhook_received;
    if (lastWebhookReceived) {
      const timeSinceWebhook = Date.now() - new Date(lastWebhookReceived).getTime();
      const fiveMinutes = 5 * 60 * 1000;
      
      if (timeSinceWebhook < fiveMinutes) {
        log.debug({ timeSinceWebhook }, 'Skipping poll - recent webhook received');
        return;
      }
    }

    // Only poll if no recent webhook activity (fallback mechanism)
    log.info('Polling as fallback - no recent webhook activity');

    try {
      log.debug('Polling Replicate for job status');

      const prediction = await replicate.predictions.get(job.external_id);
      
      // Check if status changed
      const currentReplicateStatus = job.metadata?.replicate_status;
      if (prediction.status === currentReplicateStatus) {
        log.debug({ status: prediction.status }, 'No status change');
        return;
      }

      log.info({ 
        oldStatus: currentReplicateStatus,
        newStatus: prediction.status 
      }, 'Status changed');

      // Handle different statuses
      switch (prediction.status) {
        case 'succeeded':
          await this.handleJobSuccess(job, prediction);
          break;
          
        case 'failed':
        case 'canceled':
          await this.handleJobFailure(job, prediction);
          break;
          
        default:
          // Still processing, just update metadata
          await updateRestorationJobStatus(job.id, 'processing', {
            metadata: {
              ...job.metadata,
              replicate_status: prediction.status,
              last_polled: new Date().toISOString()
            }
          });
      }

    } catch (error) {
      log.error({ error }, 'Error polling job status');
      
      // Don't fail the job for polling errors, just log and continue
      await updateRestorationJobStatus(job.id, 'failed', {
        metadata: {
          ...job.metadata,
          last_poll_error: error,
          last_polled: new Date().toISOString()
        }
      });
    }
  }

  private async handleJobSuccess(job: any, prediction: any) {
    const log = logger.child({ 
      jobId: job.id, 
      externalId: job.external_id 
    });

    try {
      log.info('Job succeeded, saving restored image');

      // Get order info for storage path
      const order = await getOrderById(job.metadata?.order_id);
      if (!order) {
        throw new Error('Order not found for job');
      }

      // Download and save restored image
      const imageUrl = prediction.output as string;
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download restored image: ${response.statusText}`);
      }
      const imageBuffer = Buffer.from(await response.arrayBuffer());
      
      const restoredImageId = await storageService.saveRestored(
        job.original_image_id,
        imageBuffer,
        {
          replicate_prediction_id: prediction.id,
          replicate_status: prediction.status
        }
      );

      // Update job as completed
      await updateRestorationJobStatus(job.id, 'completed', {
        status: 'completed',
        completed_at: new Date().toISOString(),
        metadata: {
          ...job.metadata,
          replicate_status: prediction.status,
          restored_image_url: restoredImageId,
          completed_at: new Date().toISOString(),
          original_image_url: job.metadata?.original_image_url || job.input_parameters?.input_image
        }
      });

      log.info({ 
        restoredImageUrl: restoredImageId 
      }, 'Job completed successfully');

      // Check if all jobs for this order are complete
      await this.checkOrderCompletion(order.id);

    } catch (error) {
      log.error({ error }, 'Error handling job success');
      await markRestorationJobFailed(job.id, `Failed to save restored image: ${error}`);
    }
  }

  private async handleJobFailure(job: any, prediction: any) {
    const log = logger.child({ 
      jobId: job.id, 
      externalId: job.external_id 
    });

    const errorMessage = prediction.error || `Job ${prediction.status}`;
    log.error({ error: errorMessage }, 'Job failed');

    await markRestorationJobFailed(job.id, errorMessage);
  }

  private async checkOrderCompletion(orderId: string) {
    const log = logger.child({ orderId, worker: 'restoration' });

    try {
      // Get all restoration jobs for this order
      const { getRestorationJobsByOrder } = await import('@/lib/db/restoration-jobs');
      const allJobs = await getRestorationJobsByOrder(orderId);
      
      const completedJobs = allJobs.filter(job => job.status === 'completed');
      const failedJobs = allJobs.filter(job => job.status === 'failed');
      const activeJobs = allJobs.filter(job => 
        job.status === 'pending' || job.status === 'processing'
      );

      log.info({
        totalJobs: allJobs.length,
        completedJobs: completedJobs.length,
        failedJobs: failedJobs.length,
        activeJobs: activeJobs.length
      }, 'Checking order completion status');

      // If no active jobs remaining, order processing is complete
      if (activeJobs.length === 0) {
        const order = await getOrderById(orderId);
        if (!order) {
          log.error('Order not found');
          return;
        }

        // Update order status
        const newStatus = completedJobs.length > 0 ? 'completed' : 'failed';
        await updateOrderStatus(orderId, newStatus);

        // Queue restoration complete email if we have any completed jobs
        if (completedJobs.length > 0) {
          await this.queueRestorationCompleteEmail(order, completedJobs);
        }

        log.info({ 
          newStatus,
          completedCount: completedJobs.length 
        }, 'Order processing completed');
      }

    } catch (error) {
      log.error({ error }, 'Error checking order completion');
    }
  }

  private async queueRestorationCompleteEmail(order: any, completedJobs: any[]) {
    const log = logger.child({ orderId: order.id });

    try {
      // Prepare restored image URLs
      const restoredImageUrls = completedJobs
        .map(job => job.metadata?.restored_image_url)
        .filter(Boolean);

      // Prepare original image URLs  
      const originalImageUrls = completedJobs
        .map(job => job.metadata?.original_image_url)
        .filter(Boolean);

      await queueEmail({
        orderId: order.id,
        emailType: 'restoration_complete',
        toEmail: order.customers?.email || '',
        toName: order.customers?.name || 'Valued customer',
        subject: `Your Photos Are Ready! - Order ${order.order_number}`,
        sendgridTemplateId: process.env.SENDGRID_RESTORATION_COMPLETE_TEMPLATE_ID,
        dynamicData: {
          customer_name: order.customers?.name || 'Valued customer',
          customer_email: order.customers?.email || '',
          order_id: order.order_number,
          order_date: new Date(order.created_at).toLocaleDateString(),
          number_of_photos: completedJobs.length,
          // Include both original and restored image URLs
          original_image_urls: originalImageUrls,
          restored_image_urls: restoredImageUrls,
          // Payment success page URL
          view_photos_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment-success?session_id=${order.stripe_checkout_session_id}`
        },
        // Prepare attachments - both original and restored images
        attachments: await this.prepareRestorationEmailAttachments(originalImageUrls, restoredImageUrls)
      });

      log.info({ 
        restoredCount: completedJobs.length 
      }, 'Restoration complete email queued');

    } catch (error) {
      log.error({ error }, 'Failed to queue restoration complete email');
    }
  }

  private async prepareRestorationEmailAttachments(
    originalUrls: string[], 
    restoredUrls: string[]
  ): Promise<Array<{
    filename: string;
    content: string;
    type: string;
    disposition: string;
  }>> {
    const { getSupabaseStoragePathFromUrl, downloadFileAsBuffer } = await import('@/lib/supabase-utils');
    const attachments = [];

    // Add original images
    for (const [index, imageUrl] of originalUrls.entries()) {
      try {
        const pathDetails = getSupabaseStoragePathFromUrl(imageUrl);
        if (pathDetails && pathDetails.bucketName && pathDetails.filePath) {
          const { bucketName, filePath } = pathDetails;
          const imageBuffer = await downloadFileAsBuffer(bucketName, filePath);
          attachments.push({
            content: imageBuffer.toString('base64'),
            filename: `original_${index + 1}_${filePath.split('/').pop() || 'image.jpg'}`,
            type: 'image/jpeg',
            disposition: 'attachment',
          });
        }
      } catch (error) {
        logger.error({ error, imageUrl }, 'Failed to prepare original image attachment');
      }
    }

    // Add restored images
    for (const [index, imageUrl] of restoredUrls.entries()) {
      try {
        const pathDetails = getSupabaseStoragePathFromUrl(imageUrl);
        if (pathDetails && pathDetails.bucketName && pathDetails.filePath) {
          const { bucketName, filePath } = pathDetails;
          const imageBuffer = await downloadFileAsBuffer(bucketName, filePath);
          attachments.push({
            content: imageBuffer.toString('base64'),
            filename: `restored_${index + 1}_${filePath.split('/').pop() || 'image.jpg'}`,
            type: 'image/jpeg',
            disposition: 'attachment',
          });
        }
      } catch (error) {
        logger.error({ error, imageUrl }, 'Failed to prepare restored image attachment');
      }
    }

    return attachments;
  }
}

// Export singleton instance
export const restorationWorker = new RestorationWorker();
