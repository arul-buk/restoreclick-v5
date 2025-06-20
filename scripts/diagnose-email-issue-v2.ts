/**
 * Diagnose email issues with correct database schema relationships
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnoseEmailIssueV2() {
  console.log('🔍 Diagnosing Email Issue (V2 - Correct Schema)');
  console.log('================================================');

  try {
    // 1. Check recent orders (last 24 hours)
    console.log('\n1. RECENT ORDERS (Last 24 hours):');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        created_at,
        customers!inner(email, name)
      `)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('❌ Error fetching orders:', ordersError);
      return;
    }

    if (!orders || orders.length === 0) {
      console.log('⚠️ No orders found in the last 24 hours');
      return;
    }

    console.log(`📋 Found ${orders.length} recent orders:`);
    orders.forEach(order => {
      const customer = Array.isArray(order.customers) ? order.customers[0] : order.customers;
      console.log(`   - ${order.order_number} (${order.status}) - ${customer?.email} - ${order.created_at}`);
    });

    // 2. Check images and restoration jobs for recent orders
    console.log('\n2. IMAGES AND RESTORATION JOBS:');
    for (const order of orders.slice(0, 5)) { // Check first 5 orders to avoid too much output
      console.log(`\n   Order ${order.order_number}:`);
      
      // Get images for this order
      const { data: images, error: imagesError } = await supabase
        .from('images')
        .select('id, status, original_path, restored_path')
        .eq('order_id', order.id);

      if (imagesError) {
        console.error(`     ❌ Error fetching images:`, imagesError);
        continue;
      }

      if (!images || images.length === 0) {
        console.log('     ⚠️ No images found');
        continue;
      }

      console.log(`     📸 Found ${images.length} images:`);
      for (const image of images) {
        console.log(`       - Image ${image.id}: ${image.status}`);
        
        // Get restoration jobs for this image
        const { data: jobs, error: jobsError } = await supabase
          .from('restoration_jobs')
          .select('id, status, external_job_id, created_at, completed_at')
          .eq('original_image_id', image.id);

        if (jobsError) {
          console.error(`         ❌ Error fetching jobs:`, jobsError);
          continue;
        }

        if (!jobs || jobs.length === 0) {
          console.log('         ⚠️ No restoration jobs found');
        } else {
          jobs.forEach(job => {
            console.log(`         - Job ${job.id}: ${job.status} (${job.created_at})`);
            if (job.completed_at) {
              console.log(`           Completed: ${job.completed_at}`);
            }
          });
        }
      }
    }

    // 3. Check email queue for recent orders
    console.log('\n3. EMAIL QUEUE STATUS:');
    for (const order of orders.slice(0, 5)) {
      const { data: emails, error: emailsError } = await supabase
        .from('email_queue')
        .select('*')
        .eq('order_id', order.id)
        .order('created_at', { ascending: false });

      if (emailsError) {
        console.error(`❌ Error fetching emails for order ${order.order_number}:`, emailsError);
        continue;
      }

      console.log(`\n   Order ${order.order_number} emails:`);
      if (!emails || emails.length === 0) {
        console.log('     ⚠️ No emails found in queue');
      } else {
        emails.forEach(email => {
          console.log(`     - ${email.email_type}: ${email.status} (${email.created_at})`);
          if (email.sent_at) {
            console.log(`       Sent: ${email.sent_at}`);
          }
          if (email.error_message) {
            console.log(`       Error: ${email.error_message}`);
          }
        });
      }
    }

    // 4. Check for pending emails
    console.log('\n4. PENDING EMAILS:');
    const { data: pendingEmails, error: pendingError } = await supabase
      .from('email_queue')
      .select(`
        *,
        orders!inner(order_number)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (pendingError) {
      console.error('❌ Error fetching pending emails:', pendingError);
    } else if (!pendingEmails || pendingEmails.length === 0) {
      console.log('✅ No pending emails in queue');
    } else {
      console.log(`📧 Found ${pendingEmails.length} pending emails:`);
      pendingEmails.forEach(email => {
        const order = Array.isArray(email.orders) ? email.orders[0] : email.orders;
        console.log(`   - ${email.email_type} for ${order?.order_number} (${email.to_email})`);
      });
    }

    // 5. Analysis and recommendations
    console.log('\n5. ANALYSIS:');
    
    const processingOrders = orders.filter(o => o.status === 'processing');
    const completedOrders = orders.filter(o => o.status === 'completed');
    
    console.log(`   📊 Order Status Summary:`);
    console.log(`     - Processing: ${processingOrders.length}`);
    console.log(`     - Completed: ${completedOrders.length}`);
    
    if (processingOrders.length > 0) {
      console.log(`   ⚠️ ${processingOrders.length} orders are stuck in processing status`);
      console.log(`   🔍 This suggests restoration jobs are not completing properly`);
    }

    console.log('\n6. RECOMMENDATIONS:');
    console.log('   a) Check if restoration jobs are being created for uploaded images');
    console.log('   b) Verify if restoration jobs are completing successfully');
    console.log('   c) Check if restoration worker is triggering completion emails');
    console.log('   d) Verify SendGrid configuration and API key');
    console.log('   e) Check for any webhook processing failures');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

diagnoseEmailIssueV2();
