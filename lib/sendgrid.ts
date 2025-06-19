// lib/sendgrid.ts

import sgMail from '@sendgrid/mail';
import logger from './logger';
import { serverConfig } from './config.server'; // Use the server config

sgMail.setApiKey(serverConfig.sendgrid.apiKey);

interface Attachment {
  content: string;
  filename: string;
  type?: string;
  disposition?: 'inline' | 'attachment';
  content_id?: string;
}

export interface SendEmailParams {
  to: string;
  dynamicData?: { [key: string]: any };
  attachments?: Attachment[];
  templateId: string;
  subject?: string; // Optional: if not using a template that defines it or for non-template emails
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const { to, dynamicData, attachments, templateId, subject } = params;

  const msg: sgMail.MailDataRequired = {
    to: to,
    from: serverConfig.sendgrid.fromEmail,
    templateId: templateId,
    dynamicTemplateData: {
      ...dynamicData,
      logo_url: serverConfig.app.url ? `${serverConfig.app.url}/images/logo.png` : undefined,
    },
    attachments: attachments,
    ...(subject && { subject }), // Add subject if provided
  };

  try {
    await sgMail.send(msg);
    logger.info({ to, templateId }, "Successfully sent email via SendGrid.");
  } catch (error) {
    logger.error({ error, to, templateId }, "Failed to send email.");
    // Re-throw the error if you want calling functions to handle it
    throw error;
  }
}

export async function sendOrderConfirmationEmail(params: {
  to: string;
  dynamicData: { [key: string]: any; };
  attachments?: Attachment[];
}): Promise<void> {
  if (!serverConfig.sendgrid.orderConfirmationTemplateId) {
    logger.error("SendGrid orderConfirmationTemplateId is not configured.");
    throw new Error("Order confirmation email template ID is missing.");
  }
  await sendEmail({
    to: params.to,
    dynamicData: params.dynamicData,
    attachments: params.attachments,
    templateId: serverConfig.sendgrid.orderConfirmationTemplateId,
  }).catch(error => {
    // Error is already logged by sendEmail, additional handling if needed
  });
}

export async function sendRestorationCompleteEmail(params: {
  to: string;
  dynamicData?: { [key: string]: any };
  attachments?: Attachment[];
}): Promise<void> {
  if (!serverConfig.sendgrid.restorationCompleteTemplateId) {
    logger.error("SendGrid restorationCompleteTemplateId is not configured.");
    throw new Error("Restoration complete email template ID is missing.");
  }
  await sendEmail({
    to: params.to,
    dynamicData: params.dynamicData,
    attachments: params.attachments,
    templateId: serverConfig.sendgrid.restorationCompleteTemplateId,
  }).catch(error => {
    // Error is already logged by sendEmail
  });
}

export async function sendPhotosToFamilyEmail(params: {
  to: string; // Recipient's email
  dynamicData?: { [key: string]: any }; // e.g., senderName, personalizedMessage
  attachments: Attachment[]; // Original and restored photos
}): Promise<void> {
  if (!serverConfig.sendgrid.familyShareTemplateId) {
    logger.error("SendGrid familyShareTemplateId is not configured.");
    throw new Error("Family share email template ID is missing.");
  }
  await sendEmail({
    to: params.to,
    dynamicData: params.dynamicData,
    attachments: params.attachments,
    templateId: serverConfig.sendgrid.familyShareTemplateId,
  }).catch(error => {
    // Error is already logged by sendEmail
  });
}