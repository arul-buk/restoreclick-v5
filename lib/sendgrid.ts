// lib/sendgrid.ts

import sgMail from '@sendgrid/mail';
import logger from './logger';
import { serverConfig } from './config.server'; // Use the server config

sgMail.setApiKey(serverConfig.sendgrid.apiKey);

export async function sendWelcomeEmail(params: { to: string; dynamicData: { [key: string]: any; } }): Promise<void> {
  const { to, dynamicData } = params;

  const msg = {
    to: to,
    from: serverConfig.sendgrid.fromEmail,
    templateId: serverConfig.sendgrid.welcomeTemplateId,
    dynamic_template_data: dynamicData,
  };

  try {
    await sgMail.send(msg);
    logger.info({ to }, "Successfully sent welcome email via SendGrid.");
  } catch (error) {
    logger.error({ error, to }, "Failed to send welcome email.");
  }
}