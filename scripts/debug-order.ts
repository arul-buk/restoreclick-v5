import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugOrder(orderId: string) {
  console.log('🔍 Debugging Order:', orderId);
  console.log('=====================================\n');

  // Get order details
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*, predictions(*)')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    console.error('❌ Order not found:', orderError);
    return;
  }

  console.log('📦 Order Details:');
  console.log('- Order ID:', order.id);
  console.log('- Customer:', order.customer_name, '(' + order.customer_email + ')');
  console.log('- Created:', new Date(order.created_at).toLocaleString());
  console.log('- Input Images:', order.input_image_urls?.length || 0);
  console.log('- Restoration Email Sent:', order.restoration_email_sent);
  console.log('- Email Sent At:', order.restoration_email_sent_at);
  console.log('\n');

  console.log('🖼️ Predictions:');
  const predictions = order.predictions || [];
  predictions.forEach((pred: any, index: number) => {
    console.log(`\nPrediction ${index + 1}:`);
    console.log('- ID:', pred.id);
    console.log('- Status:', pred.status);
    console.log('- Has Output URL:', !!pred.output_image_url);
    console.log('- Output URL:', pred.output_image_url || 'MISSING');
    console.log('- Created:', new Date(pred.created_at).toLocaleString());
    console.log('- Updated:', new Date(pred.updated_at).toLocaleString());
  });

  console.log('\n📊 Summary:');
  console.log('- Total Images Expected:', order.input_image_urls?.length || 0);
  console.log('- Total Predictions:', predictions.length);
  console.log('- Succeeded Predictions:', predictions.filter((p: any) => p.status === 'succeeded').length);
  console.log('- Predictions with Output URLs:', predictions.filter((p: any) => !!p.output_image_url).length);

  // Reset email flag for testing
  if (order.restoration_email_sent) {
    console.log('\n🔄 Resetting email flag for testing...');
    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        restoration_email_sent: false,
        restoration_email_sent_at: null 
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('❌ Failed to reset email flag:', updateError);
    } else {
      console.log('✅ Email flag reset successfully');
    }
  }
}

// Get order ID from command line
const orderId = process.argv[2];
if (!orderId) {
  console.error('Please provide an order ID');
  process.exit(1);
}

debugOrder(orderId).catch(console.error);
