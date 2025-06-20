// lib/workers/email-worker.ts
import { 
  getPendingEmails, 
  updateEmailStatus,
  markEmailFailed 
} from '@/lib/db/email-queue';
import { 
  sendOrderConfirmationEmail, 
  sendRestorationCompleteEmail, 
  sendPhotosToFamilyEmail 
} from '@/lib/sendgrid';
import logger from '@/lib/logger';

export class EmailWorker {
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
      logger.warn('Email worker is already running');
      return;
    }

    this.isRunning = true;
    logger.info({ pollInterval: this.pollInterval }, 'Starting email worker');

    // Run immediately, then on interval
    this.processEmails();
    this.intervalId = setInterval(() => {
      this.processEmails();
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
    logger.info('Email worker stopped');
  }

  private async processEmails() {
    if (!this.isRunning) return;

    const log = logger.child({ worker: 'email' });
    
    try {
      // Get pending emails that need to be sent
      const pendingEmails = await getPendingEmails();

      log.info({ 
        pendingCount: pendingEmails.length 
      }, 'Processing pending emails');

      // Process each pending email
      for (const email of pendingEmails) {
        await this.sendEmail(email);
      }

    } catch (error) {
      log.error({ error }, 'Error in email worker process');
    }
  }

  private async sendEmail(email: any) {
    const log = logger.child({ 
      emailId: email.id, 
      emailType: email.email_type,
      toEmail: email.to_email,
      worker: 'email' 
    });
    
    try {
      log.info('Sending email');

      // Mark as sending
      await updateEmailStatus(email.id, 'sending');

      // Send email based on type
      switch (email.email_type) {
        case 'order_confirmation':
          await this.sendOrderConfirmationEmail(email);
          break;
        case 'restoration_complete':
          await this.sendRestorationCompleteEmail(email);
          break;
        case 'share_family':
          await this.sendSharePhotosEmail(email);
          break;
        default:
          throw new Error(`Unknown email type: ${email.email_type}`);
      }

      // Mark as sent
      await updateEmailStatus(email.id, 'sent', {
        sent_at: new Date().toISOString()
      });

      log.info('Email sent successfully');

    } catch (error) {
      log.error({ error }, 'Failed to send email');
      
      // Increment retry count
      const retryCount = (email.attempt_number || 0) + 1;
      
      if (retryCount >= this.maxRetries) {
        await markEmailFailed(email.id, `Max retries exceeded: ${error}`);
        log.error({ retryCount }, 'Email failed after max retries');
      } else {
        await updateEmailStatus(email.id, 'pending', {
          attempt_number: retryCount,
          error_message: `Retry ${retryCount}: ${error}`,
          scheduled_for: new Date(Date.now() + (retryCount * 60000)).toISOString() // Exponential backoff
        });
        log.warn({ retryCount }, 'Email will be retried');
      }
    }
  }

  private async sendOrderConfirmationEmail(email: any) {
    const log = logger.child({ emailId: email.id });

    try {
      await sendOrderConfirmationEmail({
        to: email.to_email,
        dynamicData: {
          customerName: email.to_name,
          ...email.dynamic_data
        },
        attachments: email.attachments
      });

      log.info('Order confirmation email sent');

    } catch (error) {
      log.error({ error }, 'Failed to send order confirmation email');
      throw error;
    }
  }

  private async sendRestorationCompleteEmail(email: any) {
    const log = logger.child({ emailId: email.id });

    try {
      // Use the restoration complete email function
      await sendRestorationCompleteEmail({
        to: email.to_email,
        dynamicData: {
          customerName: email.to_name,
          ...email.dynamic_data
        },
        attachments: email.attachments
      });

      log.info('Restoration complete email sent');

    } catch (error) {
      log.error({ error }, 'Failed to send restoration complete email');
      throw error;
    }
  }

  private async sendSharePhotosEmail(email: any) {
    const log = logger.child({ emailId: email.id });

    try {
      // Use the photos to family email function
      await sendPhotosToFamilyEmail({
        to: email.to_email,
        dynamicData: {
          customerName: email.to_name,
          ...email.dynamic_data
        },
        attachments: email.attachments
      });

      log.info('Share photos email sent');

    } catch (error) {
      log.error({ error }, 'Failed to send share photos email');
      throw error;
    }
  }
}

// Export singleton instance
export const emailWorker = new EmailWorker();
