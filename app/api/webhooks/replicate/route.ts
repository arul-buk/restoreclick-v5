import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getRestorationJobByExternalId, updateRestorationJobStatus, getRestorationJobsByOrder } from '@/lib/db/restoration-jobs';
import { getOrderById, updateOrderStatus } from '@/lib/db/orders';
import { queueEmail } from '@/lib/db/email-queue';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { storageService } from '@/lib/storage/storage-service';
import logger from '@/lib/logger';

const WEBHOOK_SECRET = process.env.REPLICATE_WEBHOOK_SECRET!;
const MAX_DIFF_IN_SECONDS = 5 * 60; // 5 minutes

export async function POST(request: NextRequest) {
  const log = logger.child({ api_route: 'POST /api/webhooks/replicate' });
  
  try {
    // Get webhook headers
    const webhookId = request.headers.get('webhook-id');
    const webhookTimestamp = request.headers.get('webhook-timestamp');
    const webhookSignatures = request.headers.get('webhook-signature');

    // Validate required headers
    if (!webhookId || !webhookTimestamp || !webhookSignatures) {
      log.error('Missing required webhook headers');
      return NextResponse.json({ error: 'Missing required headers' }, { status: 400 });
    }

    // Validate timestamp
    const timestamp = parseInt(webhookTimestamp);
    const now = Math.floor(Date.now() / 1000);
    const diff = Math.abs(now - timestamp);
    
    if (diff > MAX_DIFF_IN_SECONDS) {
      log.error({ diff }, `Webhook timestamp is too old: ${diff} seconds`);
      return NextResponse.json({ error: `Webhook timestamp is too old: ${diff} seconds` }, { status: 400 });
    }

    // Get raw request body
    const body = await request.text();
    
    // Verify webhook signature
    const signedContent = `${webhookId}.${webhookTimestamp}.${body}`;
    const secretKey = WEBHOOK_SECRET.split('_')[1];
    const secretBytes = Buffer.from(secretKey, 'base64');
    
    const computedSignature = crypto
      .createHmac('sha256', secretBytes)
      .update(signedContent)
      .digest('base64');

    const expectedSignatures = webhookSignatures
      .split(' ')
      .map(sig => sig.split(',')[1]);

    const isValid = expectedSignatures.some(expectedSig => 
      crypto.timingSafeEqual(
        Buffer.from(expectedSig),
        Buffer.from(computedSignature)
      )
    );

    if (!isValid) {
      log.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 403 });
    }

    // Parse webhook payload
    const prediction = JSON.parse(body);
    const { id: predictionId, status, output, error } = prediction;
    
    log.info({ predictionId, status }, 'Received verified Replicate webhook');

    // Find the restoration job by external ID
    const job = await getRestorationJobByExternalId(predictionId);
    if (!job) {
      log.warn({ predictionId }, 'No restoration job found for prediction');
      return NextResponse.json({ success: true }); // Return success to avoid retries
    }

    log.info({ jobId: job.id, predictionId, status }, 'Processing webhook for restoration job');

    // Update job based on status
    switch (status) {
      case 'succeeded':
        await handleJobSuccess(job, prediction, log);
        break;
        
      case 'failed':
      case 'canceled':
        await handleJobFailure(job, prediction, log);
        break;
        
      default:
        // Update metadata for intermediate statuses
        await updateRestorationJobStatus(job.id, 'processing', {
          metadata: {
            ...(job.metadata as object || {}),
            replicate_status: status,
            last_webhook_received: new Date().toISOString()
          }
        });
        log.info({ jobId: job.id, status }, 'Updated job with intermediate status');
    }

    return NextResponse.json({ success: true });
    
  } catch (error) {
    log.error({ error }, 'Error processing Replicate webhook');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleJobSuccess(job: any, prediction: any, log: any) {
  try {
    const { output } = prediction;
    
    if (!output) {
      throw new Error('No output URL in successful prediction');
    }

    log.info({ jobId: job.id, outputUrl: output }, 'Processing successful prediction');

    // Download and store the restored image
    const response = await fetch(output);
    if (!response.ok) {
      throw new Error(`Failed to download restored image: ${response.statusText}`);
    }

    const imageBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(imageBuffer);

    // Get order ID from job relationship
    const orderId = job.images?.order_id;
    if (!orderId) {
      throw new Error('No order ID found in restoration job');
    }

    // Generate storage path using standardized folder structure
    const originalFilename = job.metadata?.original_filename || 'restored_image.png';
    const fileExtension = originalFilename.split('.').pop() || 'png';
    const restoredFilename = `restored_${job.id}.${fileExtension}`;
    const storagePath = `uploads/restored/${orderId}/${restoredFilename}`;

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('photos')
      .upload(storagePath, buffer, {
        contentType: `image/${fileExtension}`,
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Failed to upload restored image: ${uploadError.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('photos')
      .getPublicUrl(storagePath);

    const restoredImageUrl = publicUrlData.publicUrl;

    // Create restored image record in database
    const { data: restoredImageData, error: imageError } = await supabaseAdmin
      .from('images')
      .insert({
        order_id: orderId,
        type: 'restored',
        status: 'completed',
        storage_bucket: 'photos',
        storage_path: storagePath,
        public_url: restoredImageUrl,
        file_size_bytes: buffer.length,
        mime_type: `image/${fileExtension}`,
        parent_image_id: job.original_image_id,
        processing_completed_at: new Date().toISOString(),
        metadata: {
          restoration_job_id: job.id,
          original_replicate_output: output,
          processed_via_webhook: true
        }
      })
      .select()
      .single();

    if (imageError) {
      log.error({ error: imageError }, 'Failed to create restored image record');
      throw new Error(`Failed to create restored image record: ${imageError.message}`);
    }

    // Update restoration job with the restored image ID
    await supabaseAdmin
      .from('restoration_jobs')
      .update({ 
        restored_image_id: restoredImageData.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);

    // Update restoration job to completed
    await updateRestorationJobStatus(job.id, 'completed', {
      completed_at: new Date().toISOString(),
      metadata: {
        ...(job.metadata as object || {}),
        replicate_status: 'succeeded',
        restored_image_url: restoredImageUrl,
        original_replicate_output: output,
        webhook_processed_at: new Date().toISOString()
      }
    });

    log.info({ 
      jobId: job.id, 
      orderId,
      restoredImageUrl,
      originalOutput: output 
    }, 'Job completed successfully via webhook');

    // Check if all jobs for this order are complete and trigger completion flow
    await checkOrderCompletion(orderId, log);

  } catch (error) {
    log.error({ error, jobId: job.id }, 'Failed to process successful prediction');
    
    // Mark job as failed
    await updateRestorationJobStatus(job.id, 'failed', {
      failed_at: new Date().toISOString(),
      error_message: `Webhook processing failed: ${error}`,
      metadata: {
        ...(job.metadata as object || {}),
        replicate_status: 'succeeded',
        webhook_error: error instanceof Error ? error.message : String(error),
        webhook_processed_at: new Date().toISOString()
      }
    });
  }
}

async function handleJobFailure(job: any, prediction: any, log: any) {
  try {
    const { status, error } = prediction;
    
    await updateRestorationJobStatus(job.id, 'failed', {
      failed_at: new Date().toISOString(),
      error_message: error || `Prediction ${status}`,
      metadata: {
        ...(job.metadata as object || {}),
        replicate_status: status,
        replicate_error: error,
        webhook_processed_at: new Date().toISOString()
      }
    });

    log.info({ jobId: job.id, status, error }, 'Job marked as failed via webhook');
    
    // Check if order completion status needs to be updated
    const orderId = job.images?.order_id;
    if (orderId) {
      await checkOrderCompletion(orderId, log);
    } else {
      log.warn({ jobId: job.id }, 'No order ID found for failed job, cannot check order completion');
    }
    
  } catch (updateError) {
    log.error({ error: updateError, jobId: job.id }, 'Failed to update failed job');
  }
}

async function checkOrderCompletion(orderId: string, log: any) {
  try {
    log.info({ orderId }, 'Checking order completion status');

    // Get all restoration jobs for this order
    const allJobs = await getRestorationJobsByOrder(orderId);
    
    const completedJobs = allJobs.filter(job => job.status === 'completed');
    const failedJobs = allJobs.filter(job => job.status === 'failed');
    const activeJobs = allJobs.filter(job => 
      job.status === 'pending' || job.status === 'processing'
    );

    log.info({
      orderId,
      totalJobs: allJobs.length,
      completedJobs: completedJobs.length,
      failedJobs: failedJobs.length,
      activeJobs: activeJobs.length
    }, 'Order completion status check');

    // If no active jobs remaining, order processing is complete
    if (activeJobs.length === 0) {
      const order = await getOrderById(orderId);
      if (!order) {
        log.error({ orderId }, 'Order not found during completion check');
        return;
      }

      // Update order status
      const newStatus = completedJobs.length > 0 ? 'completed' : 'failed';
      await updateOrderStatus(orderId, newStatus);

      // Queue restoration complete email if we have any completed jobs
      if (completedJobs.length > 0) {
        await queueRestorationCompleteEmail(order, completedJobs, log);
      }

      log.info({ 
        orderId,
        newStatus,
        completedCount: completedJobs.length 
      }, 'Order processing completed via webhook');
    } else {
      log.info({ 
        orderId,
        activeJobsRemaining: activeJobs.length 
      }, 'Order still has active jobs, waiting for completion');
    }

  } catch (error) {
    log.error({ error, orderId }, 'Error checking order completion in webhook');
  }
}

async function queueRestorationCompleteEmail(order: any, completedJobs: any[], log: any) {
  try {
    log.info({ 
      orderId: order.id,
      completedJobsCount: completedJobs.length 
    }, 'Queuing restoration complete email');

    // Prepare restored image URLs
    const restoredImageUrls = completedJobs
      .map(job => job.metadata?.restored_image_url)
      .filter(Boolean);

    // Prepare original image URLs  
    const originalImageUrls = completedJobs
      .map(job => job.metadata?.original_image_url)
      .filter(Boolean);

    // Prepare email attachments
    const attachments = await prepareEmailAttachments(originalImageUrls, restoredImageUrls, log);

    await queueEmail({
      orderId: order.id,
      emailType: 'restoration_complete',
      toEmail: order.customers?.email || '',
      toName: order.customers?.name || 'Valued customer',
      subject: `Your Photos Are Ready! - Order ${order.order_number}`,
      sendgridTemplateId: process.env.SENDGRID_RESTORATION_COMPLETE_TEMPLATE_ID,
      attachments: attachments,
      dynamicData: {
        customer_name: order.customers?.name || 'Valued customer',
        customer_email: order.customers?.email || '',
        order_id: order.order_number,
        order_date: new Date(order.created_at).toLocaleDateString(),
        number_of_photos: completedJobs.length,
        original_image_urls: originalImageUrls,
        restored_image_urls: restoredImageUrls,
        view_photos_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment-success?session_id=${order.stripe_checkout_session_id}`
      }
    });

    log.info({ 
      orderId: order.id,
      restoredCount: completedJobs.length,
      attachmentCount: attachments.length
    }, 'Restoration complete email queued successfully with attachments');

  } catch (error) {
    log.error({ error, orderId: order.id }, 'Failed to queue restoration complete email');
  }
}

// Add this function to prepare email attachments
async function prepareEmailAttachments(originalImageUrls: string[], restoredImageUrls: string[], log: any) {
  const attachments = [];

  // Add original images as attachments
  for (const originalImageUrl of originalImageUrls) {
    const response = await fetch(originalImageUrl);
    if (!response.ok) {
      log.error(`Failed to download original image: ${response.statusText}`);
      continue;
    }

    const imageBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(imageBuffer);

    const attachment = {
      filename: originalImageUrl.split('/').pop() || 'original_image.jpg',
      content: buffer.toString('base64'),
      type: 'image/jpeg'
    };

    attachments.push(attachment);
  }

  // Add restored images as attachments
  for (const restoredImageUrl of restoredImageUrls) {
    const response = await fetch(restoredImageUrl);
    if (!response.ok) {
      log.error(`Failed to download restored image: ${response.statusText}`);
      continue;
    }

    const imageBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(imageBuffer);

    const attachment = {
      filename: restoredImageUrl.split('/').pop() || 'restored_image.jpg',
      content: buffer.toString('base64'),
      type: 'image/jpeg'
    };

    attachments.push(attachment);
  }

  return attachments;
}
