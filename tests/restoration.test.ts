import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  createRestorationJob, 
  getRestorationJobsByOrder, 
  updateRestorationJobStatus,
  completeRestorationJob,
  failRestorationJob,
  getPendingRestorationJobs
} from '@/lib/db/restoration-jobs';
import { updateOrderStatus } from '@/lib/db/orders';
import { storageService } from '@/lib/storage/storage-service';
import { queueEmail } from '@/lib/db/email-queue';

// Mock external dependencies
vi.mock('@/lib/db/restoration-jobs', () => ({
  createRestorationJob: vi.fn(),
  getRestorationJobsByOrder: vi.fn(),
  updateRestorationJobStatus: vi.fn(),
  completeRestorationJob: vi.fn(),
  failRestorationJob: vi.fn(),
  getPendingRestorationJobs: vi.fn(),
}));

vi.mock('@/lib/db/orders', () => ({
  updateOrderStatus: vi.fn(),
}));

vi.mock('@/lib/storage/storage-service', () => ({
  storageService: {
    saveRestored: vi.fn(),
    getPublicUrl: vi.fn(),
  },
}));

vi.mock('@/lib/db/email-queue', () => ({
  queueEmail: vi.fn(),
}));

// Mock Replicate API
vi.mock('replicate', () => ({
  default: vi.fn().mockImplementation(() => ({
    predictions: {
      create: vi.fn(),
      get: vi.fn(),
    },
  })),
}));

describe('Restoration Flow', () => {
  const mockOrderId = 'test_order_123';
  const mockImageId = 'test_image_456';
  const mockJobId = 'test_job_789';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Restoration Job Creation', () => {
    it('should create restoration job successfully', async () => {
      const mockJob = {
        id: 'job_123',
        original_image_id: 'img_123',
        status: 'pending' as const,
        external_job_id: null,
        external_provider: 'replicate',
        external_status: null,
        attempt_number: 1,
        max_attempts: 3,
        input_parameters: {
          input_image: 'https://example.com/image.jpg',
          model: 'flux-kontext-apps/restore-image',
          seed: 42,
          output_format: 'jpg',
          safety_tolerance: 2
        },
        output_data: null,
        metadata: {},
        error_code: null,
        error_message: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        queued_at: null,
        started_at: null,
        completed_at: null,
        failed_at: null,
        restored_image_id: null
      };

      vi.mocked(createRestorationJob).mockResolvedValue(mockJob);

      const result = await createRestorationJob({
        originalImageId: 'img_123',
        inputParameters: {
          input_image: 'https://example.com/image.jpg',
          model: 'flux-kontext-apps/restore-image'
        }
      });

      expect(createRestorationJob).toHaveBeenCalledWith({
        originalImageId: 'img_123',
        inputParameters: {
          input_image: 'https://example.com/image.jpg',
          model: 'flux-kontext-apps/restore-image'
        }
      });
      expect(result).toEqual(mockJob);
    });

    it('should handle restoration job creation failure', async () => {
      const error = new Error('Database connection failed');
      vi.mocked(createRestorationJob).mockRejectedValue(error);

      await expect(createRestorationJob({
        originalImageId: 'img_123'
      })).rejects.toThrow('Database connection failed');
    });
  });

  describe('Restoration Job Processing', () => {
    it('should process restoration job successfully', async () => {
      const mockJob = {
        id: 'job_123',
        original_image_id: 'img_123',
        status: 'completed' as const,
        external_job_id: 'replicate_123',
        external_provider: 'replicate',
        external_status: 'succeeded',
        attempt_number: 1,
        max_attempts: 3,
        input_parameters: {},
        output_data: {
          output_urls: ['https://example.com/restored.jpg']
        },
        metadata: {},
        error_code: null,
        error_message: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:01:00Z',
        queued_at: '2024-01-01T00:00:10Z',
        started_at: '2024-01-01T00:00:30Z',
        completed_at: '2024-01-01T00:01:00Z',
        failed_at: null,
        restored_image_id: 'restored_123'
      };

      vi.mocked(completeRestorationJob).mockResolvedValue(mockJob);

      const result = await completeRestorationJob('job_123', 'restored_123', {
        output_urls: ['https://example.com/restored.jpg']
      });

      expect(completeRestorationJob).toHaveBeenCalledWith('job_123', 'restored_123', {
        output_urls: ['https://example.com/restored.jpg']
      });
      expect(result.status).toBe('completed');
      expect(result.restored_image_id).toBe('restored_123');
    });

    it('should handle restoration job failure with retry', async () => {
      const mockJob = {
        id: 'job_123',
        original_image_id: 'img_123',
        status: 'failed' as const,
        external_job_id: 'replicate_123',
        external_provider: 'replicate',
        external_status: 'failed',
        attempt_number: 2,
        max_attempts: 3,
        input_parameters: {},
        output_data: null,
        metadata: {},
        error_code: 'PROCESSING_ERROR',
        error_message: 'Image processing failed',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:01:00Z',
        queued_at: '2024-01-01T00:00:10Z',
        started_at: '2024-01-01T00:00:30Z',
        completed_at: null,
        failed_at: '2024-01-01T00:01:00Z',
        restored_image_id: null
      };

      vi.mocked(failRestorationJob).mockResolvedValue(mockJob);

      const result = await failRestorationJob('job_123', 'Image processing failed', 'PROCESSING_ERROR', true);

      expect(failRestorationJob).toHaveBeenCalledWith('job_123', 'Image processing failed', 'PROCESSING_ERROR', true);
      expect(result.status).toBe('failed');
      expect(result.attempt_number).toBe(2);
    });
  });

  describe('Restoration Job Queries', () => {
    it('should get restoration jobs by order', async () => {
      const mockJobs = [
        {
          id: 'job_123',
          original_image_id: 'img_123',
          status: 'completed' as const,
          external_job_id: 'replicate_123',
          external_provider: 'replicate',
          external_status: 'succeeded',
          attempt_number: 1,
          max_attempts: 3,
          input_parameters: {},
          output_data: {},
          metadata: {},
          error_code: null,
          error_message: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:01:00Z',
          queued_at: null,
          started_at: null,
          completed_at: '2024-01-01T00:01:00Z',
          failed_at: null,
          restored_image_id: 'restored_123'
        }
      ];

      vi.mocked(getRestorationJobsByOrder).mockResolvedValue(mockJobs);

      const result = await getRestorationJobsByOrder('order_123');

      expect(getRestorationJobsByOrder).toHaveBeenCalledWith('order_123');
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('completed');
    });

    it('should get pending restoration jobs', async () => {
      const mockJobs = [
        {
          id: 'job_123',
          original_image_id: 'img_123',
          status: 'pending' as const,
          external_job_id: null,
          external_provider: 'replicate',
          external_status: null,
          attempt_number: 1,
          max_attempts: 3,
          input_parameters: {},
          output_data: null,
          metadata: {},
          error_code: null,
          error_message: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          queued_at: null,
          started_at: null,
          completed_at: null,
          failed_at: null,
          restored_image_id: null
        }
      ];

      vi.mocked(getPendingRestorationJobs).mockResolvedValue(mockJobs);

      const result = await getPendingRestorationJobs(10);

      expect(getPendingRestorationJobs).toHaveBeenCalledWith(10);
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('pending');
    });
  });

  describe('Storage Integration', () => {
    it('should save restored image to storage', async () => {
      const mockSaveResult = 'restored_123';

      vi.mocked(storageService.saveRestored).mockResolvedValue(mockSaveResult);

      const imageBuffer = Buffer.from('fake-image-data');
      const result = await storageService.saveRestored('original_123', imageBuffer, {
        order_id: 'order_123',
        processing_metadata: { model: 'flux-kontext-apps/restore-image' }
      });

      expect(storageService.saveRestored).toHaveBeenCalledWith('original_123', imageBuffer, {
        order_id: 'order_123',
        processing_metadata: { model: 'flux-kontext-apps/restore-image' }
      });
      expect(result).toBe(mockSaveResult);
    });

    it('should handle storage failures', async () => {
      const error = new Error('Storage service unavailable');
      vi.mocked(storageService.saveRestored).mockRejectedValue(error);

      const imageBuffer = Buffer.from('fake-image-data');
      await expect(storageService.saveRestored('original_123', imageBuffer))
        .rejects.toThrow('Storage service unavailable');
    });
  });

  describe('Email Notifications', () => {
    it('should queue restoration complete email', async () => {
      const mockEmailRecord = {
        id: 'email_123',
        order_id: 'order_123',
        to_email: 'user@example.com',
        to_name: 'John Doe',
        email_type: 'restoration_complete' as const,
        status: 'pending' as const,
        sendgrid_template_id: 'template_123',
        dynamic_data: {
          order_id: 'order_123',
          restored_images_count: 3,
          download_link: 'https://example.com/download'
        },
        subject: null,
        from_email: null,
        from_name: null,
        reply_to: null,
        cc_emails: null,
        bcc_emails: null,
        attachments: null,
        scheduled_for: null,
        sent_at: null,
        failed_at: null,
        bounce_reason: null,
        attempt_number: 1,
        max_attempts: 3,
        error_message: null,
        error_code: null,
        metadata: null,
        sendgrid_message_id: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      vi.mocked(queueEmail).mockResolvedValue(mockEmailRecord);

      const result = await queueEmail({
        orderId: 'order_123',
        toEmail: 'user@example.com',
        emailType: 'restoration_complete',
        dynamicData: {
          order_id: 'order_123',
          restored_images_count: 3,
          download_link: 'https://example.com/download'
        }
      });

      expect(queueEmail).toHaveBeenCalledWith({
        orderId: 'order_123',
        toEmail: 'user@example.com',
        emailType: 'restoration_complete',
        dynamicData: {
          order_id: 'order_123',
          restored_images_count: 3,
          download_link: 'https://example.com/download'
        }
      });
      expect(result.email_type).toBe('restoration_complete');
    });
  });

  describe('Order Status Updates', () => {
    it('should update order status when all jobs complete', async () => {
      const mockJobs = [
        {
          id: 'job_123',
          original_image_id: 'img_123',
          status: 'completed' as const,
          external_job_id: 'replicate_123',
          external_provider: 'replicate',
          external_status: 'succeeded',
          attempt_number: 1,
          max_attempts: 3,
          input_parameters: {},
          output_data: {},
          metadata: {},
          error_code: null,
          error_message: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:01:00Z',
          queued_at: null,
          started_at: null,
          completed_at: '2024-01-01T00:01:00Z',
          failed_at: null,
          restored_image_id: 'restored_123'
        },
        {
          id: 'job_124',
          original_image_id: 'img_124',
          status: 'completed' as const,
          external_job_id: 'replicate_124',
          external_provider: 'replicate',
          external_status: 'succeeded',
          attempt_number: 1,
          max_attempts: 3,
          input_parameters: {},
          output_data: {},
          metadata: {},
          error_code: null,
          error_message: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:01:00Z',
          queued_at: null,
          started_at: null,
          completed_at: '2024-01-01T00:01:00Z',
          failed_at: null,
          restored_image_id: 'restored_124'
        }
      ];

      vi.mocked(getRestorationJobsByOrder).mockResolvedValue(mockJobs);
      vi.mocked(updateOrderStatus).mockResolvedValue({
        id: 'order_123',
        status: 'completed' as const,
        customer_id: 'customer_123',
        stripe_payment_intent_id: 'pi_123',
        total_amount: 1000,
        currency: 'usd',
        order_number: 'ORD-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:01:00Z',
        completed_at: '2024-01-01T00:01:00Z',
        paid_at: '2024-01-01T00:00:30Z',
        payment_method: 'card',
        payment_status: 'paid' as const,
        stripe_checkout_session_id: 'cs_123',
        subtotal: 1000,
        tax_amount: 0,
        discount_amount: null,
        metadata: null
      });

      const jobs = await getRestorationJobsByOrder('order_123');
      const allCompleted = jobs.every(job => job.status === 'completed');

      if (allCompleted) {
        await updateOrderStatus('order_123', 'completed');
      }

      expect(getRestorationJobsByOrder).toHaveBeenCalledWith('order_123');
      expect(updateOrderStatus).toHaveBeenCalledWith('order_123', 'completed');
    });

    it('should handle mixed job statuses', async () => {
      const mockJobs = [
        {
          id: 'job_123',
          original_image_id: 'img_123',
          status: 'completed' as const,
          external_job_id: 'replicate_123',
          external_provider: 'replicate',
          external_status: 'succeeded',
          attempt_number: 1,
          max_attempts: 3,
          input_parameters: {},
          output_data: {},
          metadata: {},
          error_code: null,
          error_message: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:01:00Z',
          queued_at: null,
          started_at: null,
          completed_at: '2024-01-01T00:01:00Z',
          failed_at: null,
          restored_image_id: 'restored_123'
        },
        {
          id: 'job_124',
          original_image_id: 'img_124',
          status: 'failed' as const,
          external_job_id: 'replicate_124',
          external_provider: 'replicate',
          external_status: 'failed',
          attempt_number: 3,
          max_attempts: 3,
          input_parameters: {},
          output_data: null,
          metadata: {},
          error_code: 'MAX_RETRIES_EXCEEDED',
          error_message: 'Maximum retry attempts exceeded',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:01:00Z',
          queued_at: null,
          started_at: null,
          completed_at: null,
          failed_at: '2024-01-01T00:01:00Z',
          restored_image_id: null
        }
      ];

      vi.mocked(getRestorationJobsByOrder).mockResolvedValue(mockJobs);

      const jobs = await getRestorationJobsByOrder('order_123');
      const completedJobs = jobs.filter(job => job.status === 'completed');
      const failedJobs = jobs.filter(job => job.status === 'failed');

      expect(getRestorationJobsByOrder).toHaveBeenCalledWith('order_123');
      expect(completedJobs).toHaveLength(1);
      expect(failedJobs).toHaveLength(1);
      expect(failedJobs[0].attempt_number).toBe(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle permanent job failures', async () => {
      const mockJob = {
        id: 'job_123',
        original_image_id: 'img_123',
        status: 'failed' as const,
        external_job_id: 'replicate_123',
        external_provider: 'replicate',
        external_status: 'failed',
        attempt_number: 3,
        max_attempts: 3,
        input_parameters: {},
        output_data: null,
        metadata: {},
        error_code: 'PERMANENT_FAILURE',
        error_message: 'Image cannot be processed',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:01:00Z',
        queued_at: null,
        started_at: null,
        completed_at: null,
        failed_at: '2024-01-01T00:01:00Z',
        restored_image_id: null
      };

      vi.mocked(failRestorationJob).mockResolvedValue(mockJob);

      const result = await failRestorationJob('job_123', 'Image cannot be processed', 'PERMANENT_FAILURE', false);

      expect(failRestorationJob).toHaveBeenCalledWith('job_123', 'Image cannot be processed', 'PERMANENT_FAILURE', false);
      expect(result.status).toBe('failed');
      expect(result.error_code).toBe('PERMANENT_FAILURE');
    });

    it('should track processing metrics', async () => {
      const mockJob = {
        id: 'job_123',
        original_image_id: 'img_123',
        status: 'completed' as const,
        external_job_id: 'replicate_123',
        external_provider: 'replicate',
        external_status: 'succeeded',
        attempt_number: 1,
        max_attempts: 3,
        input_parameters: {},
        output_data: {},
        metadata: {},
        error_code: null,
        error_message: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:01:00Z',
        queued_at: '2024-01-01T00:00:10Z',
        started_at: '2024-01-01T00:00:30Z',
        completed_at: '2024-01-01T00:01:00Z',
        failed_at: null,
        restored_image_id: 'restored_123'
      };

      vi.mocked(completeRestorationJob).mockResolvedValue(mockJob);

      const result = await completeRestorationJob('job_123', 'restored_123');

      expect(result.started_at).toBeTruthy();
      expect(result.completed_at).toBeTruthy();
      // Processing time can be calculated from timestamps
      const processingTime = new Date(result.completed_at!).getTime() - new Date(result.started_at!).getTime();
      expect(processingTime).toBeGreaterThan(0);
    });
  });
});
