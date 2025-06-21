// Script to validate environment credentials
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function validateCredentials() {
  console.log('=== ENVIRONMENT CREDENTIAL VALIDATION ===\n');
  
  // 1. Check Stripe credentials
  console.log('1. Validating Stripe credentials...');
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    console.log('❌ STRIPE_SECRET_KEY is not set');
  } else {
    console.log(`✅ STRIPE_SECRET_KEY is set (length: ${stripeKey.length})`);
    
    // Check if it looks like a valid key
    if (stripeKey.startsWith('sk_test_') || stripeKey.startsWith('sk_live_')) {
      console.log('✅ Key format looks valid');
      
      // Try to initialize Stripe
      try {
        const stripe = new Stripe(stripeKey, { apiVersion: '2025-05-28.basil' });
        const account = await stripe.accounts.retrieve();
        console.log(`✅ Stripe connection successful! Account: ${account.id}`);
      } catch (error: any) {
        console.log(`❌ Stripe connection failed: ${error.message}`);
      }
    } else {
      console.log('❌ Key format looks invalid (should start with sk_test_ or sk_live_)');
    }
  }
  
  // 2. Check Stripe webhook secret
  console.log('\n2. Checking Stripe webhook secret...');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.log('❌ STRIPE_WEBHOOK_SECRET is not set');
  } else {
    console.log(`✅ STRIPE_WEBHOOK_SECRET is set (length: ${webhookSecret.length})`);
    if (webhookSecret.startsWith('whsec_')) {
      console.log('✅ Webhook secret format looks valid');
    } else {
      console.log('❌ Webhook secret format looks invalid (should start with whsec_)');
    }
  }
  
  // 3. Check Supabase credentials
  console.log('\n3. Validating Supabase credentials...');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl) {
    console.log('❌ NEXT_PUBLIC_SUPABASE_URL is not set');
  } else {
    console.log(`✅ NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl}`);
  }
  
  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY is not set');
  } else {
    console.log(`✅ SUPABASE_SERVICE_ROLE_KEY is set (length: ${supabaseKey.length})`);
    
    // Check if it looks like a valid key
    if (supabaseKey.length > 100 && supabaseKey.includes('.')) {
      console.log('✅ Key format looks valid (JWT format)');
      
      // Try to connect to Supabase
      if (supabaseUrl) {
        try {
          const supabase = createClient(supabaseUrl, supabaseKey);
          const { count, error } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true });
          
          if (error) {
            console.log(`❌ Supabase connection failed: ${error.message}`);
          } else {
            console.log(`✅ Supabase connection successful! Orders table accessible`);
          }
        } catch (error: any) {
          console.log(`❌ Supabase initialization failed: ${error.message}`);
        }
      }
    } else {
      console.log('❌ Key format looks invalid (should be a long JWT token)');
      console.log(`   Current value starts with: ${supabaseKey.substring(0, 20)}...`);
    }
  }
  
  // 4. Summary
  console.log('\n=== SUMMARY ===');
  console.log('Please ensure all credentials are correctly set in your .env.local file.');
  console.log('The values should match those in your Stripe and Supabase dashboards.');
  console.log('\nFor Vercel deployment:');
  console.log('1. Go to https://vercel.com/dashboard');
  console.log('2. Select your project');
  console.log('3. Go to Settings → Environment Variables');
  console.log('4. Ensure all these variables are set with the correct values');
}

// Run validation
validateCredentials().catch(console.error);
