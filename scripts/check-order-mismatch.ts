// Script to check for order identifier mismatch
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrderMismatch() {
  const checkoutSessionId = 'cs_test_a1ALIn1p9iJwPqFFZDQwmMXGh2NoalZbYiB2yzn1aB7pxY2nGYwNCfAeUX';
  const batchId = 'b216ccee-cd70-44bd-8794-a982d2382f50';
  
  console.log('=== ORDER IDENTIFIER MISMATCH CHECK ===\n');
  console.log(`Checkout Session ID: ${checkoutSessionId}`);
  console.log(`Batch ID from URL: ${batchId}`);
  
  // 1. Check if order exists with checkout session ID
  console.log('\n1. Checking for order with checkout session ID...');
  try {
    const { data: orderBySession, error: sessionError } = await supabase
      .from('orders')
      .select('*')
      .eq('stripe_checkout_session_id', checkoutSessionId)
      .single();
    
    if (orderBySession) {
      console.log('✅ Order found by checkout session ID!');
      console.log(`   Order ID: ${orderBySession.id}`);
      console.log(`   Order Number: ${orderBySession.order_number}`);
      console.log(`   Status: ${orderBySession.status}`);
      console.log(`   Metadata: ${JSON.stringify(orderBySession.metadata)}`);
    } else {
      console.log('❌ No order found with checkout session ID');
    }
  } catch (err) {
    console.log('❌ Error checking by session ID:', err);
  }
  
  // 2. Check if any orders contain the batch_id in metadata
  console.log('\n2. Checking for orders with batch_id in metadata...');
  try {
    const { data: ordersWithBatch, error } = await supabase
      .from('orders')
      .select('*')
      .contains('metadata', { batch_id: batchId });
    
    if (ordersWithBatch && ordersWithBatch.length > 0) {
      console.log(`✅ Found ${ordersWithBatch.length} order(s) with batch_id in metadata:`);
      ordersWithBatch.forEach(order => {
        console.log(`   - Order ${order.order_number}: ${order.stripe_checkout_session_id}`);
      });
    } else {
      console.log('❌ No orders found with this batch_id in metadata');
    }
  } catch (err) {
    console.log('❌ Error checking by batch_id:', err);
  }
  
  // 3. Check recent orders to see the pattern
  console.log('\n3. Checking recent orders to understand the pattern...');
  try {
    const { data: recentOrders, error } = await supabase
      .from('orders')
      .select('id, order_number, stripe_checkout_session_id, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (recentOrders && recentOrders.length > 0) {
      console.log(`✅ Recent orders:`);
      recentOrders.forEach(order => {
        console.log(`\n   Order: ${order.order_number}`);
        console.log(`   Session ID: ${order.stripe_checkout_session_id}`);
        console.log(`   Metadata: ${JSON.stringify(order.metadata)}`);
        console.log(`   Created: ${order.created_at}`);
      });
    }
  } catch (err) {
    console.log('❌ Error fetching recent orders:', err);
  }
  
  // 4. Check the restoration_jobs table for this batch_id
  console.log('\n\n4. Checking restoration_jobs table for batch_id...');
  try {
    const { data: jobs, error } = await supabase
      .from('restoration_jobs')
      .select('*')
      .or(`metadata->batch_id.eq.${batchId},metadata->session_id.eq.${batchId}`);
    
    if (jobs && jobs.length > 0) {
      console.log(`✅ Found ${jobs.length} restoration job(s) related to this batch:`);
      jobs.forEach(job => {
        console.log(`   - Job ${job.id}: Order ${job.order_id}, Status: ${job.status}`);
      });
    } else {
      console.log('❌ No restoration jobs found for this batch_id');
    }
  } catch (err) {
    console.log('❌ Error checking restoration jobs:', err);
  }
  
  console.log('\n\n=== ANALYSIS ===');
  console.log('The issue appears to be that:');
  console.log('1. The webhook expects batch_id in Stripe session metadata');
  console.log('2. The processing page is using session_id (Stripe checkout session ID)');
  console.log('3. These might not be the same value, causing the lookup to fail');
  console.log('\nPossible solutions:');
  console.log('1. Ensure batch_id is properly set in Stripe session metadata during checkout');
  console.log('2. Update the processing page to use the correct identifier');
  console.log('3. Check Vercel logs to see if webhooks are actually being received');
}

// Run the check
checkOrderMismatch().catch(console.error);
