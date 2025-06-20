// scripts/check-restoration-email.ts
import supabaseAdmin from '../lib/supabaseAdmin';

async function checkRestorationStatus() {
  console.log('🔍 Checking Restoration Status...\n');

  const orderId = '4ff4b481-cd35-485a-9fcc-4830219be60c';

  // 1. Check order details
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('id, order_number, status, created_at, customer_id')
    .eq('id', orderId)
    .single();

  if (orderError) {
    console.error('❌ Order error:', orderError);
    return;
  }

  console.log('📋 Order Details:');
  console.log(`- Order: ${order.order_number}`);
  console.log(`- Status: ${order.status}`);
  console.log(`- Created: ${order.created_at}`);

  // 2. Check customer
  const { data: customer } = await supabaseAdmin
    .from('customers')
    .select('email, name')
    .eq('id', order.customer_id)
    .single();

  console.log(`- Customer: ${customer?.email} (${customer?.name || 'No name'})`);

  // 3. Check restoration jobs
  const { data: jobs } = await supabaseAdmin
    .from('restoration_jobs')
    .select('id, status, completed_at, created_at')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  console.log('\n🔧 Restoration Jobs:');
  for (const job of jobs || []) {
    console.log(`- Job ${job.id}: ${job.status} ${job.completed_at ? `(completed: ${job.completed_at})` : '(pending)'}`);
  }

  // 4. Check email queue
  const { data: emails } = await supabaseAdmin
    .from('email_queue')
    .select('email_type, status, sent_at, error_message, created_at')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  console.log('\n📧 Email Queue:');
  for (const email of emails || []) {
    console.log(`- ${email.email_type}: ${email.status} ${email.sent_at ? `(sent: ${email.sent_at})` : '(not sent)'}`);
    if (email.error_message) {
      console.log(`  ❌ Error: ${email.error_message}`);
    }
  }

  // 5. Analysis
  const allCompleted = jobs?.every(job => job.status === 'completed') || false;
  const restorationEmail = emails?.find(e => e.email_type === 'restoration_complete');

  console.log('\n🎯 Analysis:');
  console.log(`✅ All jobs completed: ${allCompleted}`);
  console.log(`📬 Restoration email queued: ${!!restorationEmail}`);

  if (restorationEmail) {
    console.log(`📬 Restoration email status: ${restorationEmail.status}`);
  }

  // 6. Diagnosis
  console.log('\n🔍 Diagnosis:');
  if (allCompleted && !restorationEmail) {
    console.log('❌ ISSUE: All jobs completed but no restoration email was queued');
    console.log('💡 This suggests the restoration worker did not trigger the email');
  } else if (allCompleted && restorationEmail && restorationEmail.status === 'failed') {
    console.log('❌ ISSUE: Restoration email failed to send');
  } else if (allCompleted && restorationEmail && restorationEmail.status === 'sent') {
    console.log('✅ Restoration email was sent successfully');
  } else if (!allCompleted) {
    console.log('⏳ Restoration jobs still in progress - email will be sent when complete');
  } else {
    console.log('🔍 Need to investigate further');
  }
}

checkRestorationStatus();
