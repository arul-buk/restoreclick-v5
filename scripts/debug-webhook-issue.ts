// Debug script to investigate webhook processing issues
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import logger from '../lib/logger';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'SET' : 'NOT SET');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugWebhookIssue() {
  const checkoutSessionId = 'cs_test_a1ALIn1p9iJwPqFFZDQwmMXGh2NoalZbYiB2yzn1aB7pxY2nGYwNCfAeUX';
  
  console.log('=== WEBHOOK DEBUG ANALYSIS ===');
  console.log(`Investigating checkout session: ${checkoutSessionId}`);
  
  // 1. Check if order exists in database
  console.log('\n1. Checking for existing order...');
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('stripe_checkout_session_id', checkoutSessionId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('❌ Order NOT FOUND in database');
        console.log('This confirms the webhook did not create the order');
      } else {
        console.log('❌ Database error:', error);
      }
    } else {
      console.log('✅ Order found:', order);
      console.log('Order ID:', order.id);
      console.log('Status:', order.status);
      console.log('Created at:', order.created_at);
    }
  } catch (err) {
    console.log('❌ Error checking order:', err);
  }
  
  // 2. Check recent webhook logs/events
  console.log('\n2. Checking recent orders (last 24 hours)...');
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const { data: recentOrders, error } = await supabase
      .from('orders')
      .select('id, order_number, stripe_checkout_session_id, created_at, status')
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.log('❌ Error fetching recent orders:', error);
    } else {
      console.log(`✅ Found ${recentOrders.length} recent orders:`);
      recentOrders.forEach((order: any) => {
        console.log(`  - ${order.order_number} (${order.stripe_checkout_session_id}) - ${order.status} - ${order.created_at}`);
      });
    }
  } catch (err) {
    console.log('❌ Error checking recent orders:', err);
  }
  
  // 3. Check environment variables
  console.log('\n3. Checking environment configuration...');
  const requiredEnvVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  requiredEnvVars.forEach(envVar => {
    const value = process.env[envVar];
    if (value) {
      console.log(`✅ ${envVar}: ${value.substring(0, 10)}...`);
    } else {
      console.log(`❌ ${envVar}: NOT SET`);
    }
  });
  
  // 4. Test database connection
  console.log('\n4. Testing database connection...');
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('❌ Database connection failed:', error);
    } else {
      console.log('✅ Database connection successful');
    }
  } catch (err) {
    console.log('❌ Database connection error:', err);
  }
  
  console.log('\n=== RECOMMENDATIONS ===');
  console.log('1. Check Vercel webhook logs: https://vercel.com/dashboard → Functions → View Function Logs');
  console.log('2. Verify Stripe webhook endpoint is configured: https://dashboard.stripe.com/webhooks');
  console.log('3. Check webhook secret matches between Stripe and Vercel environment variables');
  console.log('4. Test webhook endpoint manually with Stripe CLI: stripe listen --forward-to your-vercel-url/api/webhooks/stripe');
}

// Run the debug script
debugWebhookIssue().catch(console.error);
