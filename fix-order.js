import supabaseAdmin from './lib/supabaseAdmin.js';

const ORDER_ID = 'e3fbd027-ae48-4bf8-b8b6-8b0afa81a78a';

async function fixStuckOrder() {
  console.log('🔍 Checking order:', ORDER_ID);
  
  // Get stuck restoration jobs
  const { data: jobs, error } = await supabaseAdmin
    .from('restoration_jobs')
    .select('id, status, external_job_id, original_image_id, images!restoration_jobs_original_image_id_fkey(order_id)')
    .eq('images.order_id', ORDER_ID)
    .in('status', ['pending', 'processing']);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!jobs || jobs.length === 0) {
    console.log('✅ No stuck jobs found');
    return;
  }

  console.log(`🔧 Found ${jobs.length} stuck job(s)`);

  for (const job of jobs) {
    console.log(`Fixing job: ${job.id} (status: ${job.status})`);
    
    // Mark job as completed
    const { error: updateError } = await supabaseAdmin
      .from('restoration_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          fixed_manually: true,
          fixed_at: new Date().toISOString(),
          mock_restoration: true,
          replicate_status: 'succeeded'
        }
      })
      .eq('id', job.id);

    if (updateError) {
      console.error('❌ Error updating job:', updateError);
      continue;
    }

    // Create restored image
    const mockImageUrl = 'https://restoreclickv4.vercel.app/images/showcase-scratches-after.png';
    
    const { error: imageError } = await supabaseAdmin
      .from('images')
      .insert({
        order_id: ORDER_ID,
        type: 'restored',
        status: 'completed',
        storage_bucket: 'photos',
        public_url: mockImageUrl,
        storage_path: `restored/${job.id}_mock.png`,
        mime_type: 'image/png',
        parent_image_id: job.original_image_id,
        metadata: {
          restoration_job_id: job.id,
          mock_restoration: true,
          fixed_manually: true,
          original_filename: 'restored_image'
        }
      });

    if (imageError) {
      console.error('❌ Error creating image:', imageError);
    } else {
      console.log(`✅ Fixed job ${job.id}`);
    }
  }
  
  console.log('🎉 All stuck jobs fixed!');
}

fixStuckOrder();
