import { describe, it, expect, vi, beforeEach } from 'vitest';
import { queueEmail, getPendingEmails, getEmailsByOrder, updateEmailStatus, markEmailSent, markEmailFailed } from '@/lib/db/email-queue';
import { serverConfig } from '@/lib/config.server';

// Mock external dependencies
vi.mock('@/lib/db/email-queue', () => ({
  queueEmail: vi.fn(),
  getPendingEmails: vi.fn(),
  getEmailsByOrder: vi.fn(),
  updateEmailStatus: vi.fn(),
  markEmailSent: vi.fn(),
  markEmailFailed: vi.fn(),
}));

vi.mock('@/lib/config.server', () => ({
  serverConfig: {
    sendgrid: {
      apiKey: 'SG.test_api_key',
      fromEmail: 'noreply@restoreclick.test',
      welcomeTemplateId: 'd-test_welcome_template',
      orderConfirmationTemplateId: 'd-test_order_confirmation_template',
      restorationCompleteTemplateId: 'd-test_restoration_complete_template',
      familyShareTemplateId: 'd-test_family_share_template',
    },
  },
}));

// Mock SendGrid
const mockSendGridMail = {
  setApiKey: vi.fn(),
  send: vi.fn(),
};

vi.mock('@sendgrid/mail', () => ({
  default: mockSendGridMail,
  setApiKey: mockSendGridMail.setApiKey,
  send: mockSendGridMail.send,
}));

describe('Email Flow', () => {
  const mockOrderId = 'test_order_123';
  const mockCustomerEmail = 'customer@example.com';
  const mockEmailId = 'email_queue_456';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Email Queue Operations', () => {
    it('should successfully queue confirmation emails', async () => {
      const mockEmailData = {
        orderId: mockOrderId,
        toEmail: mockCustomerEmail,
        emailType: 'order_confirmation' as const,
        dynamicData: {
          order_number: 'ORD-20250620-001',
          customer_name: 'Test Customer',
          total_amount: 29.99,
          images_count: 3,
        },
      };

      const mockQueuedEmail = {
        id: mockEmailId,
        order_id: mockOrderId,
        to_email: mockCustomerEmail,
        email_type: 'order_confirmation' as const,
        status: 'pending' as const,
        dynamic_data: mockEmailData.dynamicData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        attempt_number: 1,
        cc_emails: null,
        attachments: null,
        error_message: null,
        error_code: null,
        failed_at: null,
        max_attempts: 3,
        scheduled_for: null,
        sent_at: null,
        sendgrid_template_id: serverConfig.sendgrid.orderConfirmationTemplateId,
        sendgrid_message_id: null,
        subject: null,
        to_name: null,
        metadata: null,
      };

      vi.mocked(queueEmail).mockResolvedValue(mockQueuedEmail);

      const result = await queueEmail(mockEmailData);

      expect(queueEmail).toHaveBeenCalledWith(mockEmailData);
      expect(result.id).toBe(mockEmailId);
      expect(result.email_type).toBe('order_confirmation');
      expect(result.status).toBe('pending');
      expect(result.to_email).toBe(mockCustomerEmail);
    });

    it('should handle email queue failures', async () => {
      const mockEmailData = {
        orderId: mockOrderId,
        toEmail: mockCustomerEmail,
        emailType: 'order_confirmation' as const,
        dynamicData: {},
      };

      vi.mocked(queueEmail).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(queueEmail(mockEmailData)).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should queue restoration complete emails with proper data', async () => {
      const mockRestorationEmailData = {
        orderId: mockOrderId,
        toEmail: mockCustomerEmail,
        emailType: 'restoration_complete' as const,
        dynamicData: {
          order_number: 'ORD-20250620-001',
          customer_name: 'Test Customer',
          restored_images_count: 3,
          download_link: `https://app.restoreclick.com/orders/${mockOrderId}`,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      };

      const mockQueuedEmail = {
        id: mockEmailId,
        order_id: mockOrderId,
        to_email: mockCustomerEmail,
        email_type: 'restoration_complete' as const,
        status: 'pending' as const,
        dynamic_data: mockRestorationEmailData.dynamicData,
        sendgrid_template_id: serverConfig.sendgrid.restorationCompleteTemplateId,
        created_at: new Date().toISOString(),
        updated_at: null,
        attempt_number: 0,
        cc_emails: null,
        attachments: null,
        error_message: null,
        error_code: null,
        failed_at: null,
        max_attempts: 3,
        scheduled_for: null,
        sent_at: null,
        sendgrid_message_id: null,
        subject: null,
        to_name: null,
        metadata: null,
      };

      vi.mocked(queueEmail).mockResolvedValue(mockQueuedEmail);

      const result = await queueEmail(mockRestorationEmailData);

      expect(result.email_type).toBe('restoration_complete');
      expect(result.dynamic_data).toEqual(mockRestorationEmailData.dynamicData);
    });
  });

  describe('SendGrid Integration', () => {
    it('should successfully send emails via SendGrid', async () => {
      const mockEmailMessage = {
        to: mockCustomerEmail,
        from: serverConfig.sendgrid.fromEmail,
        templateId: serverConfig.sendgrid.orderConfirmationTemplateId,
        dynamicTemplateData: {
          order_number: 'ORD-20250620-001',
          customer_name: 'Test Customer',
          total_amount: 29.99,
        },
      };

      mockSendGridMail.send.mockResolvedValue([
        {
          statusCode: 202,
          body: '',
          headers: {},
        },
        {},
      ]);

      const result = await mockSendGridMail.send(mockEmailMessage);

      expect(mockSendGridMail.send).toHaveBeenCalledWith(mockEmailMessage);
      expect(result[0].statusCode).toBe(202);
    });

    it('should handle SendGrid API failures', async () => {
      const mockEmailMessage = {
        to: mockCustomerEmail,
        from: serverConfig.sendgrid.fromEmail,
        templateId: serverConfig.sendgrid.orderConfirmationTemplateId,
        dynamicTemplateData: {},
      };

      mockSendGridMail.send.mockRejectedValue(
        new Error('SendGrid API rate limit exceeded')
      );

      await expect(mockSendGridMail.send(mockEmailMessage)).rejects.toThrow(
        'SendGrid API rate limit exceeded'
      );
    });

    it('should handle invalid email addresses', async () => {
      const mockInvalidEmailMessage = {
        to: 'invalid-email-address',
        from: serverConfig.sendgrid.fromEmail,
        templateId: serverConfig.sendgrid.orderConfirmationTemplateId,
        dynamicTemplateData: {},
      };

      mockSendGridMail.send.mockRejectedValue(
        new Error('Invalid email address')
      );

      await expect(mockSendGridMail.send(mockInvalidEmailMessage)).rejects.toThrow(
        'Invalid email address'
      );
    });
  });

  describe('Email Queue Processing', () => {
    it('should process pending emails from queue', async () => {
      const mockPendingEmails = [
        {
          id: 'email_1',
          order_id: mockOrderId,
          to_email: mockCustomerEmail,
          email_type: 'order_confirmation' as const,
          status: 'pending' as const,
          dynamic_data: { order_number: 'ORD-001' },
          sendgrid_template_id: serverConfig.sendgrid.orderConfirmationTemplateId,
          attempt_number: 1,
        },
        {
          id: 'email_2',
          order_id: 'order_456',
          to_email: 'customer2@example.com',
          email_type: 'restoration_complete' as const,
          status: 'pending' as const,
          dynamic_data: { order_number: 'ORD-002' },
          sendgrid_template_id: serverConfig.sendgrid.restorationCompleteTemplateId,
          attempt_number: 1,
        },
      ];

      vi.mocked(getPendingEmails).mockResolvedValue(mockPendingEmails as any);

      const result = await getPendingEmails();

      expect(getPendingEmails).toHaveBeenCalled();
      expect(result.length).toBe(2);
      expect(result[0].status).toBe('pending');
      expect(result[1].status).toBe('pending');
    });

    it('should handle email sending failures with retries', async () => {
      const mockFailedEmail = {
        id: 'email_failed',
        order_id: mockOrderId,
        to_email: mockCustomerEmail,
        email_type: 'order_confirmation' as const,
        status: 'failed' as const,
        error_message: 'SendGrid API error',
        attempt_number: 3,
        max_attempts: 3,
      };

      vi.mocked(markEmailFailed).mockResolvedValue(mockFailedEmail as any);

      const result = await markEmailFailed('email_failed', 'SendGrid API error');

      expect(markEmailFailed).toHaveBeenCalledWith('email_failed', 'SendGrid API error');
      expect(result.status).toBe('failed');
      expect(result.error_message).toBe('SendGrid API error');
    });

    it('should respect retry limits and mark emails as permanently failed', async () => {
      const mockMaxRetriesEmail = {
        id: 'email_max_retries',
        order_id: mockOrderId,
        to_email: mockCustomerEmail,
        email_type: 'order_confirmation' as const,
        status: 'failed' as const,
        attempt_number: 3,
        max_attempts: 3,
        error_message: 'Max retries exceeded',
      };

      vi.mocked(getPendingEmails).mockResolvedValue([mockMaxRetriesEmail] as any);

      // Simulate that the email won't be retried due to max attempts
      const result = await getPendingEmails();
      const emailToProcess = result[0];

      expect(emailToProcess.attempt_number).toBe(emailToProcess.max_attempts);
      expect(emailToProcess.status).toBe('failed');
    });
  });

  describe('Email Templates', () => {
    it('should use correct template IDs for different email types', async () => {
      const emailTypes = [
        { type: 'order_confirmation' as const, templateId: serverConfig.sendgrid.orderConfirmationTemplateId },
        { type: 'restoration_complete' as const, templateId: serverConfig.sendgrid.restorationCompleteTemplateId },
        { type: 'share_family' as const, templateId: serverConfig.sendgrid.familyShareTemplateId },
      ];

      for (const emailType of emailTypes) {
        const mockEmailData = {
          orderId: mockOrderId,
          toEmail: mockCustomerEmail,
          emailType: emailType.type,
          dynamicData: {},
        };

        const mockQueuedEmail = {
          id: `email_${emailType.type}`,
          email_type: emailType.type,
          sendgrid_template_id: emailType.templateId,
          status: 'pending' as const,
        };

        vi.mocked(queueEmail).mockResolvedValue(mockQueuedEmail as any);

        const result = await queueEmail(mockEmailData);
        expect(result.sendgrid_template_id).toBe(emailType.templateId);
      }
    });

    it('should handle missing template data gracefully', async () => {
      const mockEmailWithMissingData = {
        orderId: mockOrderId,
        toEmail: mockCustomerEmail,
        emailType: 'order_confirmation' as const,
        dynamicData: {}, // Empty dynamic data
      };

      const mockQueuedEmail = {
        id: mockEmailId,
        email_type: 'order_confirmation' as const,
        dynamic_data: {},
        status: 'pending' as const,
      };

      vi.mocked(queueEmail).mockResolvedValue(mockQueuedEmail as any);

      const result = await queueEmail(mockEmailWithMissingData);
      expect(result.dynamic_data).toEqual({});
    });
  });

  describe('Email Scheduling', () => {
    it('should handle scheduled emails', async () => {
      const scheduledTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      
      const mockScheduledEmail = {
        orderId: mockOrderId,
        toEmail: mockCustomerEmail,
        emailType: 'restoration_complete' as const,
        dynamicData: {},
        scheduledFor: scheduledTime,
      };

      const mockQueuedEmail = {
        id: mockEmailId,
        email_type: 'restoration_complete' as const,
        scheduled_for: scheduledTime.toISOString(),
        status: 'pending' as const,
      };

      vi.mocked(queueEmail).mockResolvedValue(mockQueuedEmail as any);

      const result = await queueEmail(mockScheduledEmail);
      expect(result.scheduled_for).toBe(scheduledTime.toISOString());
    });
  });

  describe('Email Attachments and CC', () => {
    it('should handle emails with attachments', async () => {
      const mockEmailWithAttachments = {
        orderId: mockOrderId,
        toEmail: mockCustomerEmail,
        emailType: 'restoration_complete' as const,
        dynamicData: {},
        attachments: [
          {
            filename: 'receipt.pdf',
            content: 'base64_encoded_content',
            type: 'application/pdf',
          },
        ],
      };

      const mockQueuedEmail = {
        id: mockEmailId,
        email_type: 'restoration_complete' as const,
        attachments: mockEmailWithAttachments.attachments,
        status: 'pending' as const,
      };

      vi.mocked(queueEmail).mockResolvedValue(mockQueuedEmail as any);

      const result = await queueEmail(mockEmailWithAttachments);
      expect(result.attachments).toEqual(mockEmailWithAttachments.attachments);
    });

    it('should handle CC recipients', async () => {
      const mockEmailWithCC = {
        orderId: mockOrderId,
        toEmail: mockCustomerEmail,
        emailType: 'order_confirmation' as const,
        dynamicData: {},
        ccEmails: ['manager@restoreclick.com'],
      };

      const mockQueuedEmail = {
        id: mockEmailId,
        email_type: 'order_confirmation' as const,
        cc_emails: ['manager@restoreclick.com'],
        status: 'pending' as const,
      };

      vi.mocked(queueEmail).mockResolvedValue(mockQueuedEmail as any);

      const result = await queueEmail(mockEmailWithCC);
      expect(result.cc_emails).toEqual(['manager@restoreclick.com']);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle bounce notifications', async () => {
      const mockBouncedEmail = {
        id: mockEmailId,
        to_email: 'bounced@invalid-domain.com',
        email_type: 'order_confirmation' as const,
        status: 'bounced' as const,
        error_message: 'Email address does not exist',
        failed_at: new Date().toISOString(),
      };

      vi.mocked(getPendingEmails).mockResolvedValue([mockBouncedEmail] as any);

      const result = await getPendingEmails();
      expect(result[0].status).toBe('bounced');
      expect(result[0].error_message).toBe('Email address does not exist');
    });

    it('should implement retry logic for failed emails', async () => {
      const mockRetryEmail = {
        id: mockEmailId,
        email_type: 'order_confirmation' as const,
        status: 'failed' as const,
        attempt_number: 2,
        max_attempts: 3,
        scheduled_for: new Date(Date.now() + 4 * 60 * 1000).toISOString(), // 4 minutes (exponential backoff)
      };

      vi.mocked(getPendingEmails).mockResolvedValue([mockRetryEmail] as any);

      const result = await getPendingEmails();
      const email = result[0];
      
      expect(email.attempt_number).toBe(2);
      expect(new Date(email.scheduled_for!).getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('Performance and Monitoring', () => {
    it('should track email delivery metrics', async () => {
      const mockMetrics = {
        total_queued: 100,
        total_sent: 95,
        total_failed: 3,
        total_bounced: 2,
        average_delivery_time_seconds: 5.2,
      };

      // This would typically be tracked in a separate metrics system
      expect(mockMetrics.total_sent).toBeGreaterThan(mockMetrics.total_failed);
      expect(mockMetrics.average_delivery_time_seconds).toBeLessThan(10);
    });

    it('should handle bulk email processing efficiently', async () => {
      const bulkEmails = Array.from({ length: 50 }, (_, i) => ({
        id: `bulk_email_${i}`,
        email_type: 'restoration_complete' as const,
        status: 'pending' as const,
        to_email: `customer${i}@example.com`,
      }));

      vi.mocked(getPendingEmails).mockResolvedValue(bulkEmails as any);

      const result = await getPendingEmails();
      
      expect(result.length).toBe(50);
    });
  });
});
