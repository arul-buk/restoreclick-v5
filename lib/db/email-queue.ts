// lib/db/email-queue.ts
import supabaseAdmin from '@/lib/supabaseAdmin';
import logger from '@/lib/logger';
import type { Database } from '@/lib/database.types';

type EmailQueue = Database['public']['Tables']['email_queue']['Row'];
type EmailQueueInsert = Database['public']['Tables']['email_queue']['Insert'];
type EmailQueueUpdate = Database['public']['Tables']['email_queue']['Update'];
type EmailStatus = Database['public']['Enums']['email_status_enum'];
type EmailType = Database['public']['Enums']['email_type_enum'];

export interface QueueEmailInput {
  orderId: string;
  emailType: EmailType;
  toEmail: string;
  toName?: string;
  ccEmails?: string[];
  subject?: string;
  dynamicData?: Record<string, any>;
  attachments?: Array<{
    filename: string;
    content: string; // base64 or buffer
    type?: string;
  }>;
  sendgridTemplateId?: string;
  scheduledFor?: Date;
}

/**
 * Queue an email for delivery
 */
export async function queueEmail(input: QueueEmailInput): Promise<EmailQueue> {
  logger.info({ 
    orderId: input.orderId, 
    emailType: input.emailType, 
    toEmail: input.toEmail 
  }, 'Queueing email');
  
  const emailData: EmailQueueInsert = {
    order_id: input.orderId,
    email_type: input.emailType,
    to_email: input.toEmail,
    to_name: input.toName,
    cc_emails: input.ccEmails,
    subject: input.subject,
    dynamic_data: input.dynamicData || {},
    attachments: input.attachments || [],
    sendgrid_template_id: input.sendgridTemplateId,
    scheduled_for: input.scheduledFor?.toISOString() || new Date().toISOString(),
    status: 'pending',
    attempt_number: 0,
    max_attempts: 3
  };
  
  const { data: email, error } = await supabaseAdmin
    .from('email_queue')
    .insert(emailData)
    .select()
    .single();
    
  if (error) {
    logger.error({ error, emailData }, 'Failed to queue email');
    throw error;
  }
  
  logger.info({ emailId: email.id, orderId: input.orderId, emailType: input.emailType }, 'Email queued successfully');
  
  return email;
}

/**
 * Get pending emails for processing
 */
export async function getPendingEmails(limit: number = 10): Promise<EmailQueue[]> {
  const { data: emails, error } = await supabaseAdmin
    .from('email_queue')
    .select(`
      *,
      orders (
        id,
        order_number,
        customer_id,
        total_amount,
        currency,
        created_at,
        customers (
          email,
          name
        )
      )
    `)
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(limit);
    
  if (error) {
    logger.error({ error }, 'Failed to fetch pending emails');
    throw error;
  }
  
  return emails || [];
}

/**
 * Update email status
 */
export async function updateEmailStatus(
  emailId: string, 
  status: EmailStatus, 
  updates?: Partial<EmailQueueUpdate>
): Promise<EmailQueue> {
  const updateData: EmailQueueUpdate = { 
    status,
    ...updates
  };
  
  // Set timestamps based on status
  const now = new Date().toISOString();
  switch (status) {
    case 'sending':
      // Don't update sent_at yet
      break;
    case 'sent':
      updateData.sent_at = now;
      break;
    case 'failed':
    case 'bounced':
      updateData.failed_at = now;
      break;
  }
  
  const { data: email, error } = await supabaseAdmin
    .from('email_queue')
    .update(updateData)
    .eq('id', emailId)
    .select()
    .single();
    
  if (error) {
    logger.error({ error, emailId, status }, 'Failed to update email status');
    throw error;
  }
  
  logger.info({ emailId, status }, 'Email status updated');
  
  return email;
}

/**
 * Mark email as sent with SendGrid message ID
 */
export async function markEmailSent(emailId: string, sendgridMessageId: string): Promise<EmailQueue> {
  const { data: email, error } = await supabaseAdmin
    .from('email_queue')
    .update({
      status: 'sent',
      sendgrid_message_id: sendgridMessageId,
      sent_at: new Date().toISOString()
    })
    .eq('id', emailId)
    .select()
    .single();
    
  if (error) {
    logger.error({ error, emailId, sendgridMessageId }, 'Failed to mark email as sent');
    throw error;
  }
  
  logger.info({ emailId, sendgridMessageId }, 'Email marked as sent');
  
  return email;
}

/**
 * Mark email as failed with error details
 */
export async function markEmailFailed(
  emailId: string, 
  errorMessage: string, 
  errorCode?: string,
  shouldRetry: boolean = true
): Promise<EmailQueue> {
  // Get current email to check attempt number
  const { data: currentEmail, error: fetchError } = await supabaseAdmin
    .from('email_queue')
    .select('attempt_number, max_attempts')
    .eq('id', emailId)
    .single();
    
  if (fetchError) {
    logger.error({ error: fetchError, emailId }, 'Failed to fetch email for failure update');
    throw fetchError;
  }
  
  const attemptNumber = currentEmail.attempt_number || 0;
  const maxAttempts = currentEmail.max_attempts || 3;
  const canRetry = shouldRetry && attemptNumber < maxAttempts;
  
  const updateData: EmailQueueUpdate = {
    error_message: errorMessage,
    error_code: errorCode,
    failed_at: new Date().toISOString()
  };
  
  if (canRetry) {
    // Increment attempt number and reset to pending for retry
    updateData.status = 'pending';
    updateData.attempt_number = attemptNumber + 1;
    // Schedule retry with exponential backoff
    const retryDelay = Math.pow(2, attemptNumber) * 60 * 1000; // 1min, 2min, 4min
    updateData.scheduled_for = new Date(Date.now() + retryDelay).toISOString();
    logger.info({ emailId, attemptNumber, maxAttempts, retryDelay }, 'Email failed, will retry');
  } else {
    // Mark as permanently failed
    updateData.status = 'failed';
    logger.info({ emailId, attemptNumber, maxAttempts }, 'Email failed permanently');
  }
  
  const { data: email, error } = await supabaseAdmin
    .from('email_queue')
    .update(updateData)
    .eq('id', emailId)
    .select()
    .single();
    
  if (error) {
    logger.error({ error, emailId }, 'Failed to update email failure');
    throw error;
  }
  
  return email;
}

/**
 * Get emails by order ID
 */
export async function getEmailsByOrder(orderId: string): Promise<EmailQueue[]> {
  const { data: emails, error } = await supabaseAdmin
    .from('email_queue')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });
    
  if (error) {
    logger.error({ error, orderId }, 'Failed to fetch emails for order');
    throw error;
  }
  
  return emails || [];
}

/**
 * Check if specific email type already exists for order
 */
export async function emailExistsForOrder(orderId: string, emailType: EmailType): Promise<boolean> {
  const { data: emails, error } = await supabaseAdmin
    .from('email_queue')
    .select('id')
    .eq('order_id', orderId)
    .eq('email_type', emailType)
    .limit(1);
    
  if (error) {
    logger.error({ error, orderId, emailType }, 'Failed to check if email exists');
    throw error;
  }
  
  return (emails?.length || 0) > 0;
}

/**
 * Get email queue statistics
 */
export async function getEmailQueueStats(): Promise<{
  total: number;
  pending: number;
  sent: number;
  failed: number;
  bounced: number;
  averageDeliveryTime: number;
}> {
  const [totalResult, pendingResult, sentResult, failedResult, bouncedResult, timingResult] = await Promise.all([
    supabaseAdmin.from('email_queue').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('email_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin.from('email_queue').select('*', { count: 'exact', head: true }).eq('status', 'sent'),
    supabaseAdmin.from('email_queue').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
    supabaseAdmin.from('email_queue').select('*', { count: 'exact', head: true }).eq('status', 'bounced'),
    supabaseAdmin.from('email_queue')
      .select('created_at, sent_at')
      .eq('status', 'sent')
      .not('sent_at', 'is', null)
      .limit(100)
  ]);
  
  // Calculate average delivery time
  let averageDeliveryTime = 0;
  if (timingResult.data && timingResult.data.length > 0) {
    const deliveryTimes = timingResult.data
      .map(email => {
        if (email.created_at && email.sent_at) {
          return new Date(email.sent_at).getTime() - new Date(email.created_at).getTime();
        }
        return 0;
      })
      .filter(time => time > 0);
      
    if (deliveryTimes.length > 0) {
      averageDeliveryTime = deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length;
    }
  }
  
  return {
    total: totalResult.count || 0,
    pending: pendingResult.count || 0,
    sent: sentResult.count || 0,
    failed: failedResult.count || 0,
    bounced: bouncedResult.count || 0,
    averageDeliveryTime: Math.round(averageDeliveryTime / 1000) // Convert to seconds
  };
}
