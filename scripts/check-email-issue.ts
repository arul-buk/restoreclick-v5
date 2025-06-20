// scripts/check-email-issue.ts
import supabaseAdmin from '../lib/supabaseAdmin';

async function checkWhyNoEmail() {
  console.log('🔍 Checking Why No Restoration Complete Email...\n');

  const orderId = '4ff4b481-cd35-485a-9fcc-4830219be60c';
  const imageId = '5751c990-b3ea-49e7-8346-eb844ef13e31';

  // Check if all jobs for this order are completed
  const { data: allJobs } = await supabaseAdmin
    .from('restoration_jobs')
    .select('id, status, completed_at')
    .eq('original_image_id', imageId);

  console.log('📋 All restoration jobs for this order:');
  for (const job of allJobs || []) {
    console.log(`- Job ${job.id}: ${job.status} ${job.completed_at ? '(completed)' : '(pending)'}`);
  }

  const allCompleted = allJobs?.every(job => job.status === 'completed') || false;
  console.log(`\n✅ All jobs completed: ${allCompleted}`);

  // Check if restoration complete email exists
  const { data: emails } = await supabaseAdmin
    .from('email_queue')
    .select('*')
    .eq('order_id', orderId)
    .eq('email_type', 'restoration_complete');

  console.log(`📧 Restoration complete emails: ${emails?.length || 0}`);

  if (allCompleted && (!emails || emails.length === 0)) {
    console.log('\n❌ ISSUE: All jobs completed but no restoration email queued');
    console.log('💡 The restoration worker should have triggered the email after job completion');
    console.log('💡 This suggests the restoration worker is not running or has a bug');
    
    console.log('\n🔧 Let me manually trigger the restoration complete email...');
    
    // Manually queue the restoration complete email
    const { queueEmail } = await import('../lib/db/email-queue');
    const { getOrderById } = await import('../lib/db/orders');
    
    const order = await getOrderById(orderId);
    
    if (order) {
      await queueEmail({
        orderId: order.id,
        emailType: 'restoration_complete',
        toEmail: order.customers?.email || '',
        toName: order.customers?.name || 'Valued customer',
        subject: `Your Photos Are Ready! - Order ${order.order_number}`,
        sendgridTemplateId: process.env.SENDGRID_RESTORATION_COMPLETE_TEMPLATE_ID,
        dynamicData: {
          customer_name: order.customers?.name || 'Valued customer',
          customer_email: order.customers?.email || '',
          order_id: order.order_number,
          order_date: new Date(order.created_at).toLocaleDateString(),
          number_of_photos: allJobs?.length || 0,
          view_photos_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment-success?session_id=${order.stripe_checkout_session_id}`
        }
      });
      
      console.log('✅ Restoration complete email manually queued!');
      console.log('📧 Check your email - it should arrive shortly');
    }
  }
}

checkWhyNoEmail();
