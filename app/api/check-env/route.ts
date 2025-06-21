import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Generate a secure random string for the secret
// In production, you should set this as an environment variable
const ENV_CHECK_SECRET = process.env.ENV_CHECK_SECRET || 'debug-secret-2025';

export async function GET(request: Request) {
  // Get the secret from query params
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  
  // Verify the secret
  if (secret !== ENV_CHECK_SECRET) {
    return NextResponse.json(
      { error: 'Invalid secret' }, 
      { status: 403 }
    );
  }

  try {
    // 1. Test Supabase connection
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    let supabaseResult = {
      connected: false,
      error: 'Not configured',
      orderCount: 0
    };

    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey, {
          auth: { persistSession: false }
        });
        
        const { count, error } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true });
        
        supabaseResult = {
          connected: !error,
          error: error?.message || null,
          orderCount: count || 0
        };
      } catch (error: any) {
        supabaseResult.error = error.message;
      }
    }

    // 2. Test Stripe connection
    let stripeResult = {
      connected: false,
      error: 'Not configured',
      accountId: null as string | null
    };

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (stripeKey) {
      try {
        const stripe = new Stripe(stripeKey, { 
          apiVersion: '2024-11-20.acacia' 
        });
        const account = await stripe.accounts.retrieve();
        stripeResult = {
          connected: true,
          error: null,
          accountId: account.id
        };
      } catch (error: any) {
        stripeResult.error = error.message;
      }
    }

    // 3. Check webhook secret
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    // 4. Get environment info
    const envInfo = {
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      vercelRegion: process.env.VERCEL_REGION,
      nextPublicUrl: process.env.NEXT_PUBLIC_APP_URL,
      nextPublicSupabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...',
      stripeKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 10) + '...',
      supabaseKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10) + '...',
      webhookSecretPrefix: webhookSecret ? '***' + webhookSecret.slice(-4) : 'Not set'
    };
    
    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      environment: envInfo,
      services: {
        supabase: {
          ...supabaseResult,
          url: supabaseUrl ? '✓ Set' : 'Not set',
          key: supabaseKey ? '✓ Set' : 'Not set',
        },
        stripe: {
          ...stripeResult,
          key: stripeKey ? '✓ Set' : 'Not set',
          webhookSecret: webhookSecret ? '✓ Set' : 'Not set'
        }
      }
    });
    
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
