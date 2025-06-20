#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testEmailSystem() {
  console.log('🧪 Email System Test Script\n');

  // Test configuration
  const testOrderId = process.argv[2];
  if (!testOrderId) {
    console.error('❌ Please provide an order ID as argument: npm run test-email <order-id>');
    process.exit(1);
  }

  console.log(`📋 Testing order: ${testOrderId}\n`);

  try {
    // 1. Check order status
    console.log('1️⃣ Checking order status...');
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, predictions(*)')
      .eq('id', testOrderId)
      .single();

    if (orderError || !order) {
      console.error('❌ Order not found:', orderError);
      process.exit(1);
    }

    console.log(`✅ Order found:
    - Customer: ${order.customer_email}
    - Total images: ${order.input_image_urls?.length || 0}
    - Batch ID: ${order.image_batch_id}
    - Restoration email sent: ${order.restoration_email_sent || false}
    `);

    // 2. Check predictions status
    console.log('2️⃣ Checking predictions status...');
    const predictions = order.predictions || [];
    const completedCount = predictions.filter((p: any) => p.status === 'succeeded').length;
    const failedCount = predictions.filter((p: any) => p.status === 'failed').length;
    const processingCount = predictions.filter((p: any) => p.status === 'processing').length;

    console.log(`✅ Predictions status:
    - Total: ${predictions.length}
    - Completed: ${completedCount}
    - Failed: ${failedCount}
    - Processing: ${processingCount}
    `);

    // 3. Test ZIP generation
    console.log('3️⃣ Testing ZIP generation...');
    const zipResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/generate-zip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchId: order.image_batch_id })
    });

    if (zipResponse.ok) {
      const zipData = await zipResponse.json();
      console.log(`✅ ZIP generation successful:
    - Download URL: ${zipData.downloadUrl}
    - Filename: ${zipData.filename}
    `);
    } else {
      console.error('❌ ZIP generation failed:', await zipResponse.text());
    }

    // 4. Test order completion check
    console.log('4️⃣ Testing order completion check...');
    const checkResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/check-order-completion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: testOrderId })
    });

    if (checkResponse.ok) {
      const checkData = await checkResponse.json();
      console.log(`✅ Order completion check:
    - Email sent: ${checkData.emailSent}
    - Message: ${checkData.message}
    - Attachments: ${checkData.attachmentCount || 0}
    - ZIP URL: ${checkData.zipUrl || 'N/A'}
    `);
    } else {
      console.error('❌ Order completion check failed:', await checkResponse.text());
    }

    // 5. Verify email tracking
    console.log('5️⃣ Verifying email tracking...');
    const { data: updatedOrder } = await supabase
      .from('orders')
      .select('restoration_email_sent, restoration_email_sent_at')
      .eq('id', testOrderId)
      .single();

    if (updatedOrder) {
      console.log(`✅ Email tracking status:
    - Restoration email sent: ${updatedOrder.restoration_email_sent}
    - Sent at: ${updatedOrder.restoration_email_sent_at || 'N/A'}
    `);
    }

    console.log('\n✅ Email system test completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testEmailSystem();
