// lib/config.public.ts

/**
 * @file This file contains all public-facing, client-side safe configurations.
 */

export const publicConfig = {
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    },
    gtm: {
      id: process.env.NEXT_PUBLIC_GTM_ID || '',
    },
    featureFlags: {
      enablePublicPricingPage: true,
    },
  };