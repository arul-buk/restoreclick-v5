/**
 * Trigger completion flow for orders that have completed restoration jobs
 * but are still stuck in processing status
 */

import { createClient } from '@supabase/supabase-js';
import { getRestorationJobsByOrder } from '@/lib/db/restoration-jobs';
import { getOrderById, updateOrderStatus } from '@/lib/db/orders';
import { queueEmail } from '@/lib/db/email-queue';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function triggerCompletionForStuckOrders() {
  console.log('🔧 Triggering Completion for Stuck Orders');
  console.log('==========================================');

  try {
    // Get all orders stuck in processing status
    const { data: stuckOrders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        created_at,
        stripe_checkout_session_id,
        customers!inner(email, name)
      `)
      .eq('status', 'processing')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('❌ Error fetching stuck orders:', ordersError);
      return;
    }

    if (!stuckOrders || stuckOrders.length === 0) {
      console.log('✅ No stuck orders found');
      return;
    }

    console.log(`📋 Found ${stuckOrders.length} stuck orders to process`);

    for (const order of stuckOrders) {
      const customer = Array.isArray(order.customers) ? order.customers[0] : order.customers;
      console.log(`\n🔍 Processing Order: ${order.order_number} (${customer?.email})`);

      try {
        // Get all restoration jobs for this order
        const allJobs = await getRestorationJobsByOrder(order.id);
        
        const completedJobs = allJobs.filter(job => job.status === 'completed');
        const failedJobs = allJobs.filter(job => job.status === 'failed');
        const activeJobs = allJobs.filter(job => 
          job.status === 'pending' || job.status === 'processing'
        );

        console.log(`   📊 Jobs Status:`);
        console.log(`     - Total: ${allJobs.length}`);
        console.log(`     - Completed: ${completedJobs.length}`);
        console.log(`     - Failed: ${failedJobs.length}`);
        console.log(`     - Active: ${activeJobs.length}`);

        // If no active jobs remaining, order processing is complete
        if (activeJobs.length === 0 && completedJobs.length > 0) {
          console.log(`   ✅ Order has completed jobs, triggering completion flow`);

          // Update order status
          await updateOrderStatus(order.id, 'completed');
          console.log(`   📝 Updated order status to: completed`);

          // Check if restoration complete email already exists
          const { data: existingEmails } = await supabase
            .from('email_queue')
            .select('id, status')
            .eq('order_id', order.id)
            .eq('email_type', 'restoration_complete');

          if (existingEmails && existingEmails.length > 0) {
            console.log(`   📧 Restoration complete email already exists (${existingEmails[0].status})`);
          } else {
            // Queue restoration complete email
            await queueRestorationCompleteEmail(order, completedJobs);
            console.log(`   📧 Queued restoration complete email`);
          }

        } else if (activeJobs.length > 0) {
          console.log(`   ⏳ Order still has ${activeJobs.length} active jobs, skipping`);
        } else {
          console.log(`   ⚠️ Order has no completed jobs, marking as failed`);
          await updateOrderStatus(order.id, 'failed');
        }

      } catch (error) {
        console.error(`   ❌ Error processing order ${order.order_number}:`, error);
      }
    }

    console.log('\n✅ Completed processing stuck orders');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

async function queueRestorationCompleteEmail(order: any, completedJobs: any[]) {
  try {
    // Prepare restored image URLs
    const restoredImageUrls = completedJobs
      .map(job => job.metadata?.restored_image_url)
      .filter(Boolean);

    // Prepare original image URLs  
    const originalImageUrls = completedJobs
      .map(job => job.metadata?.original_image_url)
      .filter(Boolean);

    const customer = Array.isArray(order.customers) ? order.customers[0] : order.customers;

    await queueEmail({
      orderId: order.id,
      emailType: 'restoration_complete',
      toEmail: customer?.email || '',
      toName: customer?.name || 'Valued customer',
      subject: `Your Photos Are Ready! - Order ${order.order_number}`,
      sendgridTemplateId: process.env.SENDGRID_RESTORATION_COMPLETE_TEMPLATE_ID,
      dynamicData: {
        customer_name: customer?.name || 'Valued customer',
        customer_email: customer?.email || '',
        order_id: order.order_number,
        order_date: new Date(order.created_at).toLocaleDateString(),
        number_of_photos: completedJobs.length,
        original_image_urls: originalImageUrls,
        restored_image_urls: restoredImageUrls,
        view_photos_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment-success?session_id=${order.stripe_checkout_session_id}`
      }
    });

  } catch (error) {
    console.error('Failed to queue restoration complete email:', error);
    throw error;
  }
}

triggerCompletionForStuckOrders();
