// Script to verify webhook setup and test order creation
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stripeKey = process.env.STRIPE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey || !stripeKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const stripe = new Stripe(stripeKey, { apiVersion: '2025-05-28.basil' });

async function verifyWebhookSetup() {
  console.log('=== WEBHOOK SETUP VERIFICATION ===\n');

  // 1. Check Stripe webhook endpoints
  console.log('1. Checking Stripe webhook endpoints...');
  try {
    const webhookEndpoints = await stripe.webhookEndpoints.list({ limit: 10 });
    
    if (webhookEndpoints.data.length === 0) {
      console.log('❌ No webhook endpoints configured in Stripe');
    } else {
      console.log(`✅ Found ${webhookEndpoints.data.length} webhook endpoint(s):`);
      webhookEndpoints.data.forEach(endpoint => {
        console.log(`   - URL: ${endpoint.url}`);
        console.log(`   - Status: ${endpoint.status}`);
        console.log(`   - Events: ${endpoint.enabled_events.join(', ')}`);
        console.log(`   - Created: ${new Date(endpoint.created * 1000).toISOString()}`);
        console.log('');
      });
    }
  } catch (error) {
    console.log('❌ Error fetching webhook endpoints:', error);
  }

  // 2. Check recent Stripe events
  console.log('\n2. Checking recent Stripe checkout.session.completed events...');
  try {
    const events = await stripe.events.list({
      type: 'checkout.session.completed',
      limit: 5
    });

    if (events.data.length === 0) {
      console.log('❌ No recent checkout.session.completed events found');
    } else {
      console.log(`✅ Found ${events.data.length} recent checkout event(s):`);
      
      for (const event of events.data) {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`\n   Event ID: ${event.id}`);
        console.log(`   Created: ${new Date(event.created * 1000).toISOString()}`);
        console.log(`   Session ID: ${session.id}`);
        console.log(`   Payment Status: ${session.payment_status}`);
        console.log(`   Customer Email: ${session.customer_details?.email}`);
        console.log(`   Metadata batch_id: ${session.metadata?.batch_id}`);
        
        // Check if this session has a corresponding order
        if (session.id) {
          const { data: order, error } = await supabase
            .from('orders')
            .select('id, order_number, status, created_at')
            .eq('stripe_checkout_session_id', session.id)
            .single();
            
          if (order) {
            console.log(`   ✅ Order found: ${order.order_number} (${order.status})`);
          } else {
            console.log(`   ❌ No order found for this session`);
          }
        }
      }
    }
  } catch (error) {
    console.log('❌ Error fetching Stripe events:', error);
  }

  // 3. Test order creation directly
  console.log('\n\n3. Testing direct order creation in database...');
  try {
    const testOrderData = {
      order_number: `TEST-${Date.now()}`,
      customer_id: 'test-customer-id',
      status: 'test',
      payment_status: 'test',
      stripe_payment_intent_id: `pi_test_${Date.now()}`,
      stripe_checkout_session_id: `cs_test_${Date.now()}`,
      total_amount: 0,
      currency: 'USD',
      subtotal: 0,
      tax_amount: 0,
      discount_amount: 0,
      payment_method: 'test',
      paid_at: new Date().toISOString(),
      metadata: { test: true }
    };

    const { data: testOrder, error } = await supabase
      .from('orders')
      .insert(testOrderData)
      .select()
      .single();

    if (error) {
      console.log('❌ Failed to create test order:', error);
    } else {
      console.log('✅ Successfully created test order:', testOrder.order_number);
      
      // Clean up test order
      await supabase
        .from('orders')
        .delete()
        .eq('id', testOrder.id);
      console.log('   (Test order deleted)');
    }
  } catch (error) {
    console.log('❌ Error testing order creation:', error);
  }

  // 4. Check for the specific failed session
  const failedSessionId = 'cs_test_a1ALIn1p9iJwPqFFZDQwmMXGh2NoalZbYiB2yzn1aB7pxY2nGYwNCfAeUX';
  console.log(`\n\n4. Checking specific failed session: ${failedSessionId}`);
  
  try {
    // Check in Stripe
    const session = await stripe.checkout.sessions.retrieve(failedSessionId);
    console.log('✅ Session found in Stripe:');
    console.log(`   - Payment Status: ${session.payment_status}`);
    console.log(`   - Created: ${new Date(session.created * 1000).toISOString()}`);
    console.log(`   - Customer Email: ${session.customer_details?.email}`);
    console.log(`   - Metadata batch_id: ${session.metadata?.batch_id}`);
    console.log(`   - Payment Intent: ${session.payment_intent}`);
  } catch (error: any) {
    if (error.code === 'resource_missing') {
      console.log('❌ Session not found in Stripe (might be test mode mismatch)');
    } else {
      console.log('❌ Error retrieving session from Stripe:', error.message);
    }
  }

  console.log('\n\n=== RECOMMENDATIONS ===');
  console.log('1. Verify webhook URL in Stripe dashboard matches your Vercel deployment URL');
  console.log('2. Check Vercel Function logs for webhook endpoint errors');
  console.log('3. Ensure STRIPE_WEBHOOK_SECRET on Vercel matches the signing secret from Stripe');
  console.log('4. Test webhook with Stripe CLI: stripe trigger checkout.session.completed');
  console.log('5. Check if there\'s a delay between payment and webhook processing');
}

// Run verification
verifyWebhookSetup().catch(console.error);
