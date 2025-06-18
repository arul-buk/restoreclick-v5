// lib/config.server.ts

/**
 * @file This file contains all server-side only configurations and secrets.
 * It is crucial that this file is ONLY imported into server-side code.
 */

function getRequiredServerEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`[Server Config] Missing required environment variable: ${key}`);
    }
    return value;
  }
  
  export const serverConfig = {
  app: {
    url: getRequiredServerEnv('NEXT_PUBLIC_APP_URL'),
  },
    clerk: {
      secretKey: getRequiredServerEnv('CLERK_SECRET_KEY'),
      webhookSecret: getRequiredServerEnv('CLERK_WEBHOOK_SECRET'),
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
    },
  };