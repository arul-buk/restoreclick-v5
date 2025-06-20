/**
 * Final comprehensive email diagnosis with correct schema
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function finalEmailDiagnosis() {
  console.log('🔍 FINAL EMAIL DIAGNOSIS');
  console.log('========================');

  try {
    // 1. Get the most recent order for detailed analysis
    console.log('\n1. MOST RECENT ORDER ANALYSIS:');
    const { data: recentOrder, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        created_at,
        customers!inner(email, name)
      `)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (orderError || !recentOrder) {
      console.error('❌ Error fetching recent order:', orderError);
      return;
    }

    const customer = Array.isArray(recentOrder.customers) ? recentOrder.customers[0] : recentOrder.customers;
    console.log(`📋 Analyzing Order: ${recentOrder.order_number}`);
    console.log(`   Status: ${recentOrder.status}`);
    console.log(`   Customer: ${customer?.email}`);
    console.log(`   Created: ${recentOrder.created_at}`);

    // 2. Check images for this order
    console.log('\n2. IMAGES FOR THIS ORDER:');
    const { data: images, error: imagesError } = await supabase
      .from('images')
      .select('*')
      .eq('order_id', recentOrder.id);

    if (imagesError) {
      console.error('❌ Error fetching images:', imagesError);
      return;
    }

    if (!images || images.length === 0) {
      console.log('⚠️ No images found for this order');
      return;
    }

    console.log(`📸 Found ${images.length} images:`);
    images.forEach(image => {
      console.log(`   - Image ${image.id}:`);
      console.log(`     Type: ${image.type}`);
      console.log(`     Status: ${image.status}`);
      console.log(`     Storage Path: ${image.storage_path}`);
      console.log(`     Public URL: ${image.public_url}`);
    });

    // 3. Check restoration jobs for these images
    console.log('\n3. RESTORATION JOBS:');
    for (const image of images) {
      const { data: jobs, error: jobsError } = await supabase
        .from('restoration_jobs')
        .select('*')
        .eq('original_image_id', image.id);

      if (jobsError) {
        console.error(`❌ Error fetching jobs for image ${image.id}:`, jobsError);
        continue;
      }

      console.log(`\n   Image ${image.id} (${image.type}) restoration jobs:`);
      if (!jobs || jobs.length === 0) {
        console.log('     ⚠️ No restoration jobs found');
      } else {
        jobs.forEach(job => {
          console.log(`     - Job ${job.id}:`);
          console.log(`       Status: ${job.status}`);
          console.log(`       External ID: ${job.external_job_id}`);
          console.log(`       Created: ${job.created_at}`);
          if (job.completed_at) {
            console.log(`       Completed: ${job.completed_at}`);
          }
          if (job.error_message) {
            console.log(`       Error: ${job.error_message}`);
          }
        });
      }
    }

    // 4. Check emails for this order
    console.log('\n4. EMAILS FOR THIS ORDER:');
    const { data: emails, error: emailsError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('order_id', recentOrder.id)
      .order('created_at', { ascending: false });

    if (emailsError) {
      console.error('❌ Error fetching emails:', emailsError);
    } else if (!emails || emails.length === 0) {
      console.log('⚠️ No emails found for this order');
    } else {
      console.log(`📧 Found ${emails.length} emails:`);
      emails.forEach(email => {
        console.log(`   - ${email.email_type}:`);
        console.log(`     Status: ${email.status}`);
        console.log(`     To: ${email.to_email}`);
        console.log(`     Created: ${email.created_at}`);
        if (email.sent_at) {
          console.log(`     Sent: ${email.sent_at}`);
        }
        if (email.error_message) {
          console.log(`     Error: ${email.error_message}`);
        }
      });
    }

    // 5. Overall system status
    console.log('\n5. SYSTEM STATUS SUMMARY:');
    
    // Count orders by status
    const { data: orderStats } = await supabase
      .from('orders')
      .select('status')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (orderStats) {
      const statusCounts = orderStats.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('📊 Last 24h Order Status:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });
    }

    // Count restoration jobs by status
    const { data: jobStats } = await supabase
      .from('restoration_jobs')
      .select('status')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (jobStats) {
      const jobStatusCounts = jobStats.reduce((acc, job) => {
        acc[job.status] = (acc[job.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('🔧 Last 24h Restoration Job Status:');
      Object.entries(jobStatusCounts).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });
    }

    // Count emails by type and status
    const { data: emailStats } = await supabase
      .from('email_queue')
      .select('email_type, status')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (emailStats) {
      console.log('📧 Last 24h Email Status:');
      const emailCounts = emailStats.reduce((acc, email) => {
        const key = `${email.email_type}_${email.status}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      Object.entries(emailCounts).forEach(([key, count]) => {
        console.log(`   ${key}: ${count}`);
      });
    }

    console.log('\n6. DIAGNOSIS:');
    console.log('🔍 Based on the analysis:');
    
    if (recentOrder.status === 'processing') {
      console.log('❌ ISSUE: Orders are stuck in processing status');
      console.log('   This means restoration jobs are not completing properly');
    }
    
    const hasRestorationJobs = images.some(async (image) => {
      const { data } = await supabase
        .from('restoration_jobs')
        .select('id')
        .eq('original_image_id', image.id)
        .limit(1);
      return data && data.length > 0;
    });

    console.log('\n7. NEXT STEPS:');
    console.log('   1. Check if restoration jobs are being created');
    console.log('   2. Check if restoration worker is processing jobs');
    console.log('   3. Check if Replicate webhooks are working');
    console.log('   4. Verify restoration complete email triggering');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

finalEmailDiagnosis();
