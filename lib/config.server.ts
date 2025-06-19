// lib/config.server.ts

/**
 * @file This file contains all server-side only configurations and secrets.
 * It is crucial that this file is ONLY imported into server-side code.
 */

function getRequiredServerEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
      console.error(`[Server Config] Missing required environment variable: ${key}`);
      throw new Error(`[Server Config] Missing required environment variable: ${key}`);
    }
    return value;
  }

function getOptionalServerEnv(key: string): string | undefined {
    return process.env[key];
  }
  
  export const serverConfig = {
  app: {
    url: getRequiredServerEnv('NEXT_PUBLIC_APP_URL'),
  },

    supabase: {
      url: getRequiredServerEnv('NEXT_PUBLIC_SUPABASE_URL'),
      serviceRoleKey: getRequiredServerEnv('SUPABASE_SERVICE_ROLE_KEY'),
    },
    stripe: {
      secretKey: getRequiredServerEnv('STRIPE_SECRET_KEY'),
      webhookSecret: getRequiredServerEnv('STRIPE_WEBHOOK_SECRET'),
      proPlanPriceId: getRequiredServerEnv('STRIPE_PRICE_ID'),
    },

    sendgrid: {
      apiKey: getRequiredServerEnv('SENDGRID_API_KEY'),
      fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com',
      welcomeTemplateId: getRequiredServerEnv('SENDGRID_WELCOME_TEMPLATE_ID'),
      orderConfirmationTemplateId: getRequiredServerEnv('SENDGRID_ORDER_CONFIRMATION_TEMPLATE_ID'),
      restorationCompleteTemplateId: getRequiredServerEnv('SENDGRID_RESTORATION_COMPLETE_TEMPLATE_ID'),
      familyShareTemplateId: getRequiredServerEnv('SENDGRID_FAMILY_SHARE_TEMPLATE_ID'),
    },
  };