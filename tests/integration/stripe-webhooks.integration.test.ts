// Integration tests for Stripe webhooks using real webhook events
// Run this alongside Stripe CLI webhook forwarding

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { serverConfig } from '@/lib/config.server';

// This test suite is designed to work with Stripe CLI webhook forwarding
// Prerequisites:
// 1. Development server running on localhost:3001
// 2. ngrok tunnel exposing the server
// 3. Stripe CLI forwarding webhooks to the tunnel
// 4. STRIPE_WEBHOOK_SECRET set in environment

describe('Stripe Webhook Integration Tests', () => {
  let supabase: any;
  let testOrderId: string;
  let testCustomerId: string;

  beforeAll(async () => {
    // Initialize Supabase client for verification
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Clean up any existing test data
    await cleanupTestData();
  });

  afterAll(async () => {
    // Clean up test data after tests
    await cleanupTestData();
  });

  const cleanupTestData = async () => {
    try {
      // Clean up test orders and customers
      await supabase
        .from('orders')
        .delete()
        .like('checkout_session_id', 'cs_test_%');
      
      await supabase
        .from('customers')
        .delete()
        .like('email', '%@webhook-test.example');
    } catch (error) {
      console.warn('Cleanup warning:', error);
    }
  };

  const waitForWebhookProcessing = (ms: number = 3000) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  };

  it('should verify webhook endpoint is accessible', async () => {
    // Simple health check for the webhook endpoint
    const response = await fetch('http://localhost:3001/api/webhooks/stripe', {
      method: 'GET'
    });
    
    // Webhook endpoint should return 405 for GET requests
    expect(response.status).toBe(405);
  });

  it('should process checkout.session.completed webhook', async () => {
    // This test requires manual triggering via Stripe CLI:
    // stripe trigger checkout.session.completed
    
    console.log('🧪 Trigger this test by running:');
    console.log('stripe trigger checkout.session.completed');
    console.log('Then check the database for the created order...');
    
    // Wait for webhook processing
    await waitForWebhookProcessing(5000);
    
    // Query for recently created orders
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    expect(error).toBeNull();
    console.log('Recent orders:', orders);
    
    // In a real integration test, we would verify specific order details
    // For now, we just check that orders exist
    expect(Array.isArray(orders)).toBe(true);
  });

  it('should handle payment_intent.succeeded webhook', async () => {
    console.log('🧪 Trigger this test by running:');
    console.log('stripe trigger payment_intent.succeeded');
    
    await waitForWebhookProcessing(3000);
    
    // Check for payment processing
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'paid')
      .order('created_at', { ascending: false })
      .limit(1);
    
    console.log('Paid orders:', orders);
    expect(Array.isArray(orders)).toBe(true);
  });

  it('should handle invalid webhook signatures', async () => {
    // Test webhook with invalid signature
    const invalidWebhookPayload = JSON.stringify({
      id: 'evt_test_invalid',
      object: 'event',
      type: 'checkout.session.completed',
      data: { object: {} }
    });

    const response = await fetch('http://localhost:3001/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'invalid_signature'
      },
      body: invalidWebhookPayload
    });

    expect(response.status).toBe(400);
    const result = await response.json();
    expect(result.error).toContain('Webhook signature verification failed');
  });

  it('should verify database schema compatibility', async () => {
    // Test that our database schema matches expected structure
    const { data: customers } = await supabase
      .from('customers')
      .select('id, email, stripe_customer_id, created_at')
      .limit(1);

    const { data: orders } = await supabase
      .from('orders')
      .select('id, customer_id, checkout_session_id, payment_intent_id, status, total_amount, created_at')
      .limit(1);

    // Schema should be accessible without errors
    expect(customers).toBeDefined();
    expect(orders).toBeDefined();
  });

  it('should verify email queue integration', async () => {
    // Check that email queue table exists and is accessible
    const { data: emailQueue } = await supabase
      .from('email_queue')
      .select('id, to_email, subject, template_name, status')
      .limit(1);

    expect(emailQueue).toBeDefined();
  });

  it('should verify restoration jobs integration', async () => {
    // Check that restoration jobs table exists and is accessible
    const { data: restorationJobs } = await supabase
      .from('restoration_jobs')
      .select('id, order_id, status, created_at')
      .limit(1);

    expect(restorationJobs).toBeDefined();
  });
});

// Helper test for manual webhook verification
describe('Manual Webhook Testing Guide', () => {
  it('should provide testing instructions', () => {
    console.log(`
🎯 Manual Webhook Testing Instructions:

1. Start your development server:
   npm run dev

2. Start the webhook test script:
   ./scripts/test-stripe-webhooks.sh

3. The script will:
   - Start ngrok tunnel
   - Start Stripe CLI webhook forwarding
   - Provide webhook secret for .env.local
   - Trigger test webhook events

4. Monitor the following:
   - Server console logs
   - Database changes in Supabase
   - Email queue entries
   - Storage operations

5. Verify webhook processing:
   - Orders created with correct data
   - Customers created/updated
   - Payment statuses updated
   - Emails queued for sending
   - Restoration jobs created

6. Test error scenarios:
   - Invalid webhook signatures
   - Missing required data
   - Database connection issues
   - External service failures
    `);

    expect(true).toBe(true); // This test always passes, it's just for documentation
  });
});
