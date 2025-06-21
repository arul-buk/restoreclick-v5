// Check the specific failed checkout session
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

async function checkFailedSession() {
  const sessionId = 'cs_test_a1ALIn1p9iJwPqFFZDQwmMXGh2NoalZbYiB2yzn1aB7pxY2nGYwNCfAeUX';
  
  console.log('=== CHECKING FAILED CHECKOUT SESSION ===\n');
  console.log(`Session ID: ${sessionId}`);
  
  // Initialize services
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-11-20.acacia' });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  try {
    // 1. Check if the session exists in Stripe
    console.log('\n1. Fetching checkout session from Stripe...');
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log(`✅ Session found in Stripe`);
    console.log(`   Status: ${session.status}`);
    console.log(`   Payment Status: ${session.payment_status}`);
    console.log(`   Created: ${new Date(session.created * 1000).toISOString()}`);
    console.log(`   Customer Email: ${session.customer_email}`);
    console.log(`   Amount: $${(session.amount_total || 0) / 100}`);
    console.log(`   Metadata:`, session.metadata);
    
    // 2. Check if order exists in database
    console.log('\n2. Checking for order in database...');
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('stripe_checkout_session_id', sessionId)
      .single();
    
    if (order) {
      console.log(`✅ Order found in database!`);
      console.log(`   Order Number: ${order.order_number}`);
      console.log(`   Order ID: ${order.id}`);
      console.log(`   Status: ${order.status}`);
    } else {
      console.log(`❌ No order found in database for this session`);
      
      // Check if there's an order with the batch_id from metadata
      if (session.metadata?.batch_id) {
        console.log(`\n   Checking for order with batch_id: ${session.metadata.batch_id}...`);
        const { data: batchOrder } = await supabase
          .from('orders')
          .select('*')
          .contains('metadata', { batch_id: session.metadata.batch_id })
          .single();
        
        if (batchOrder) {
          console.log(`   ✅ Found order with batch_id in metadata!`);
          console.log(`      Order Number: ${batchOrder.order_number}`);
        } else {
          console.log(`   ❌ No order found with batch_id either`);
        }
      }
    }
    
    // 3. Check webhook events for this session
    console.log('\n3. Checking webhook events for this session...');
    const events = await stripe.events.list({
      type: 'checkout.session.completed',
      created: {
        gte: session.created - 300, // 5 minutes before session creation
      },
      limit: 100
    });
    
    const sessionEvent = events.data.find(event => {
      const eventSession = event.data.object as Stripe.Checkout.Session;
      return eventSession.id === sessionId;
    });
    
    if (sessionEvent) {
      console.log(`✅ Found checkout.session.completed event`);
      console.log(`   Event ID: ${sessionEvent.id}`);
      console.log(`   Created: ${new Date(sessionEvent.created * 1000).toISOString()}`);
      console.log(`   Livemode: ${sessionEvent.livemode}`);
      
      // Check webhook endpoint deliveries
      console.log('\n4. Checking webhook delivery status...');
      try {
        const webhookEndpoints = await stripe.webhookEndpoints.list({ limit: 10 });
        for (const endpoint of webhookEndpoints.data) {
          if (endpoint.url.includes('restoreclickv4.vercel.app')) {
            console.log(`\n   Webhook Endpoint: ${endpoint.url}`);
            console.log(`   Status: ${endpoint.status}`);
            console.log(`   Events: ${endpoint.enabled_events.join(', ')}`);
          }
        }
      } catch (err) {
        console.log('   Could not fetch webhook endpoints');
      }
    } else {
      console.log(`❌ No checkout.session.completed event found for this session`);
      console.log(`   This suggests the webhook might not have fired`);
    }
    
    // 4. Summary and recommendations
    console.log('\n\n=== ANALYSIS ===');
    if (!order && session.payment_status === 'paid') {
      console.log('❌ CRITICAL: Payment was successful but no order was created!');
      console.log('\nPossible causes:');
      console.log('1. Webhook endpoint not properly configured in Stripe');
      console.log('2. Webhook secret mismatch between Stripe and Vercel');
      console.log('3. Runtime error in webhook handler on Vercel');
      console.log('4. Webhook endpoint returning non-2xx status code');
      
      console.log('\nRecommended actions:');
      console.log('1. Check Vercel function logs for /api/webhooks/stripe');
      console.log('2. Verify webhook endpoint in Stripe dashboard');
      console.log('3. Use Stripe CLI to test webhook locally');
      console.log('4. Manually create the missing order if needed');
    }
    
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

// Run the check
checkFailedSession().catch(console.error);
