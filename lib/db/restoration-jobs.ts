// lib/db/restoration-jobs.ts
import supabaseAdmin from '@/lib/supabaseAdmin';
import logger from '@/lib/logger';
import type { Database } from '@/lib/database.types';

type RestorationJob = Database['public']['Tables']['restoration_jobs']['Row'];
type RestorationJobInsert = Database['public']['Tables']['restoration_jobs']['Insert'];
type RestorationJobUpdate = Database['public']['Tables']['restoration_jobs']['Update'];
type JobStatus = Database['public']['Enums']['job_status_enum'];

export interface CreateRestorationJobInput {
  originalImageId: string;
  inputParameters?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Create a new restoration job
 */
export async function createRestorationJob(input: CreateRestorationJobInput): Promise<RestorationJob> {
  logger.info({ originalImageId: input.originalImageId }, 'Creating restoration job');
  
  const jobData: RestorationJobInsert = {
    original_image_id: input.originalImageId,
    status: 'pending',
    external_provider: 'replicate',
    attempt_number: 1,
    max_attempts: 3,
    input_parameters: input.inputParameters || {},
    metadata: input.metadata || {}
  };
  
  const { data: job, error } = await supabaseAdmin
    .from('restoration_jobs')
    .insert(jobData)
    .select()
    .single();
    
  if (error) {
    logger.error({ error, jobData }, 'Failed to create restoration job');
    throw error;
  }
  
  logger.info({ jobId: job.id, originalImageId: input.originalImageId }, 'Restoration job created');
  
  return job;
}

/**
 * Update restoration job status
 */
export async function updateRestorationJobStatus(
  jobId: string, 
  status: JobStatus, 
  updates?: Partial<RestorationJobUpdate>
): Promise<RestorationJob> {
  const updateData: RestorationJobUpdate = { 
    status,
    ...updates
  };
  
  // Set timestamps based on status
  const now = new Date().toISOString();
  switch (status) {
    case 'queued':
      updateData.queued_at = now;
      break;
    case 'processing':
      updateData.started_at = now;
      break;
    case 'completed':
      updateData.completed_at = now;
      break;
    case 'failed':
      updateData.failed_at = now;
      break;
  }
  
  const { data: job, error } = await supabaseAdmin
    .from('restoration_jobs')
    .update(updateData)
    .eq('id', jobId)
    .select()
    .single();
    
  if (error) {
    logger.error({ error, jobId, status }, 'Failed to update restoration job status');
    throw error;
  }
  
  logger.info({ jobId, status }, 'Restoration job status updated');
  
  return job;
}

/**
 * Set external job ID (e.g., Replicate prediction ID)
 */
export async function setExternalJobId(jobId: string, externalJobId: string, externalStatus?: string): Promise<RestorationJob> {
  const { data: job, error } = await supabaseAdmin
    .from('restoration_jobs')
    .update({
      external_job_id: externalJobId,
      external_status: externalStatus,
      status: 'queued'
    })
    .eq('id', jobId)
    .select()
    .single();
    
  if (error) {
    logger.error({ error, jobId, externalJobId }, 'Failed to set external job ID');
    throw error;
  }
  
  logger.info({ jobId, externalJobId }, 'External job ID set');
  
  return job;
}

/**
 * Mark job as completed with restored image
 */
export async function completeRestorationJob(
  jobId: string, 
  restoredImageId: string, 
  outputData?: Record<string, any>
): Promise<RestorationJob> {
  const { data: job, error } = await supabaseAdmin
    .from('restoration_jobs')
    .update({
      status: 'completed',
      restored_image_id: restoredImageId,
      completed_at: new Date().toISOString(),
      output_data: outputData || {}
    })
    .eq('id', jobId)
    .select()
    .single();
    
  if (error) {
    logger.error({ error, jobId, restoredImageId }, 'Failed to complete restoration job');
    throw error;
  }
  
  logger.info({ jobId, restoredImageId }, 'Restoration job completed');
  
  return job;
}

/**
 * Mark job as failed with error details
 */
export async function failRestorationJob(
  jobId: string, 
  errorMessage: string, 
  errorCode?: string,
  shouldRetry: boolean = true
): Promise<RestorationJob> {
  // Get current job to check attempt number
  const { data: currentJob, error: fetchError } = await supabaseAdmin
    .from('restoration_jobs')
    .select('attempt_number, max_attempts')
    .eq('id', jobId)
    .single();
    
  if (fetchError) {
    logger.error({ error: fetchError, jobId }, 'Failed to fetch job for failure update');
    throw fetchError;
  }
  
  const attemptNumber = currentJob.attempt_number || 1;
  const maxAttempts = currentJob.max_attempts || 3;
  const canRetry = shouldRetry && attemptNumber < maxAttempts;
  
  const updateData: RestorationJobUpdate = {
    error_message: errorMessage,
    error_code: errorCode,
    failed_at: new Date().toISOString()
  };
  
  if (canRetry) {
    // Increment attempt number and reset to pending for retry
    updateData.status = 'pending';
    updateData.attempt_number = attemptNumber + 1;
    logger.info({ jobId, attemptNumber, maxAttempts }, 'Job failed, will retry');
  } else {
    // Mark as permanently failed
    updateData.status = 'failed';
    logger.info({ jobId, attemptNumber, maxAttempts }, 'Job failed permanently');
  }
  
  const { data: job, error } = await supabaseAdmin
    .from('restoration_jobs')
    .update(updateData)
    .eq('id', jobId)
    .select()
    .single();
    
  if (error) {
    logger.error({ error, jobId }, 'Failed to update job failure');
    throw error;
  }
  
  return job;
}

/**
 * Get pending restoration jobs for processing
 */
export async function getPendingRestorationJobs(limit: number = 10): Promise<RestorationJob[]> {
  const { data: jobs, error } = await supabaseAdmin
    .from('restoration_jobs')
    .select(`
      *,
      images!restoration_jobs_original_image_id_fkey (
        id,
        order_id,
        storage_path,
        public_url,
        mime_type
      )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);
    
  if (error) {
    logger.error({ error }, 'Failed to fetch pending restoration jobs');
    throw error;
  }
  
  return jobs || [];
}

/**
 * Get restoration jobs by order ID
 */
export async function getRestorationJobsByOrder(orderId: string): Promise<RestorationJob[]> {
  // First get all image IDs for this order
  const { data: orderImages, error: imageError } = await supabaseAdmin
    .from('images')
    .select('id')
    .eq('order_id', orderId);

  if (imageError) {
    logger.error({ error: imageError, orderId }, 'Failed to fetch images for order');
    throw imageError;
  }

  if (!orderImages || orderImages.length === 0) {
    logger.info({ orderId }, 'No images found for order');
    return [];
  }

  const imageIds = orderImages.map(img => img.id);

  // Then get restoration jobs for those images
  const { data: jobs, error } = await supabaseAdmin
    .from('restoration_jobs')
    .select(`
      *,
      images!restoration_jobs_original_image_id_fkey (
        id,
        order_id,
        type,
        status,
        storage_path,
        public_url
      ),
      restored_images:images!restoration_jobs_restored_image_id_fkey (
        id,
        storage_path,
        public_url
      )
    `)
    .in('original_image_id', imageIds)
    .order('created_at', { ascending: true });
    
  if (error) {
    logger.error({ error, orderId }, 'Failed to fetch restoration jobs for order');
    throw error;
  }
  
  return jobs || [];
}

/**
 * Get restoration job by external job ID with order information
 */
export async function getRestorationJobByExternalId(externalJobId: string): Promise<RestorationJob | null> {
  const { data: job, error } = await supabaseAdmin
    .from('restoration_jobs')
    .select(`
      *,
      images!restoration_jobs_original_image_id_fkey!inner(
        order_id
      )
    `)
    .eq('external_job_id', externalJobId)
    .maybeSingle();
    
  if (error) {
    logger.error({ error, externalJobId }, 'Failed to fetch restoration job by external ID');
    throw error;
  }
  
  return job;
}

/**
 * Get restoration job statistics
 */
export async function getRestorationJobStats(): Promise<{
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}> {
  const { data, error } = await supabaseAdmin
    .from('restoration_jobs')
    .select('status');

  if (error) {
    logger.error({ error }, 'Failed to get restoration job stats');
    throw error;
  }

  const stats = {
    total: data.length,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0
  };

  data.forEach(job => {
    switch (job.status) {
      case 'pending':
        stats.pending++;
        break;
      case 'processing':
        stats.processing++;
        break;
      case 'completed':
        stats.completed++;
        break;
      case 'failed':
        stats.failed++;
        break;
    }
  });

  return stats;
}

/**
 * Get restoration jobs by status
 */
export async function getRestorationJobsByStatus(status: string, limit: number = 50): Promise<RestorationJob[]> {
  logger.info({ status, limit }, 'Getting restoration jobs by status');
  
  const { data: jobs, error } = await supabaseAdmin
    .from('restoration_jobs')
    .select(`
      *,
      images!restoration_jobs_original_image_id_fkey(
        id,
        order_id,
        public_url,
        storage_path
      )
    `)
    .eq('status', status)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    logger.error({ error, status }, 'Failed to get restoration jobs by status');
    throw error;
  }

  logger.info({ status, count: jobs?.length || 0 }, 'Retrieved restoration jobs by status');
  
  return jobs || [];
}

/**
 * Mark restoration job as failed
 */
export async function markRestorationJobFailed(jobId: string, errorMessage: string): Promise<void> {
  logger.info({ jobId, errorMessage }, 'Marking restoration job as failed');
  
  const { error } = await supabaseAdmin
    .from('restoration_jobs')
    .update({
      status: 'failed',
      failed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      error_message: errorMessage
    })
    .eq('id', jobId);

  if (error) {
    logger.error({ error, jobId }, 'Failed to mark restoration job as failed');
    throw error;
  }

  logger.info({ jobId }, 'Restoration job marked as failed');
}
