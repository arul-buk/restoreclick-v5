// Temporary debug endpoint to check environment variables on Vercel
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Only allow in development or with secret query param
  const secret = req.nextUrl.searchParams.get('secret');
  if (process.env.NODE_ENV === 'production' && secret !== 'debug-webhook-issue-2025') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const envCheck = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    vercel_env: process.env.VERCEL_ENV,
    stripe: {
      secret_key_set: !!process.env.STRIPE_SECRET_KEY,
      secret_key_prefix: process.env.STRIPE_SECRET_KEY?.substring(0, 7),
      webhook_secret_set: !!process.env.STRIPE_WEBHOOK_SECRET,
      webhook_secret_prefix: process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 10),
    },
    supabase: {
      url_set: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      service_key_set: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      service_key_prefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20),
    },
    other: {
      app_url: process.env.NEXT_PUBLIC_APP_URL,
      replicate_api_token_set: !!process.env.REPLICATE_API_TOKEN,
    }
  };

  return NextResponse.json(envCheck);
}
