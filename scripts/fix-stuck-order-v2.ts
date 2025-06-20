// scripts/fix-stuck-order-v2.ts
import supabaseAdmin from '../lib/supabaseAdmin';
import { createRestorationJob } from '../lib/db/restoration-jobs';
import { triggerRestorationForOrder } from '../lib/restoration/trigger';

async function fixStuckOrderV2() {
  console.log('🔧 Fixing Stuck Order (Version 2)...\n');

  const orderId = '4ff4b481-cd35-485a-9fcc-4830219be60c';

  try {
    // 1. Get the stuck images that are already in the images table
    const { data: stuckImages } = await supabaseAdmin
      .from('images')
      .select('*')
      .eq('order_id', orderId)
      .eq('type', 'original')
      .eq('status', 'uploaded');

    if (!stuckImages || stuckImages.length === 0) {
      console.log('❌ No stuck images found');
      return;
    }

    console.log(`📋 Found ${stuckImages.length} stuck image(s)`);

    // 2. Update image status to moved_to_permanent (simulate the move that should have happened)
    console.log('🚀 Updating image status to moved_to_permanent...');
    for (const image of stuckImages) {
      const { error: updateError } = await supabaseAdmin
        .from('images')
        .update({ 
          status: 'moved_to_permanent',
          updated_at: new Date().toISOString()
        })
        .eq('id', image.id);

      if (updateError) {
        console.error(`❌ Failed to update image ${image.id}:`, updateError);
      } else {
        console.log(`✅ Updated image ${image.id} status to moved_to_permanent`);
      }
    }

    // 3. Create restoration jobs for each image
    console.log('\n🔧 Creating restoration jobs...');
    for (const image of stuckImages) {
      try {
        const restorationJob = await createRestorationJob({
          originalImageId: image.id,
          inputParameters: {
            input_image: image.public_url,
            model: process.env.REPLICATE_MODEL || 'flux-kontext-apps/restore-image',
            seed: Math.floor(Math.random() * 1000000),
            output_format: process.env.REPLICATE_OUTPUT_FORMAT || 'png',
            safety_tolerance: parseInt(process.env.REPLICATE_SAFETY_TOLERANCE || '0')
          },
          metadata: {
            order_id: orderId,
            original_path: image.storage_path,
            original_image_url: image.public_url,
            manually_fixed: true,
            fixed_at: new Date().toISOString()
          }
        });

        console.log(`✅ Created restoration job: ${restorationJob.id} for image ${image.id}`);

      } catch (jobError) {
        console.error(`❌ Failed to create restoration job for image ${image.id}:`, jobError);
      }
    }

    // 4. Trigger restoration processing
    console.log('\n🚀 Triggering restoration processing...');
    await triggerRestorationForOrder(orderId);
    console.log('✅ Restoration processing triggered');

    // 5. Verify restoration jobs were created
    const { data: jobs } = await supabaseAdmin
      .from('restoration_jobs')
      .select('id, status, created_at')
      .eq('order_id', orderId);

    console.log(`\n📊 Verification: Found ${jobs?.length || 0} restoration jobs`);
    for (const job of jobs || []) {
      console.log(`- Job ${job.id}: ${job.status}`);
    }

    console.log('\n🎉 Order fix complete!');
    console.log('📧 You should receive the restoration complete email once processing finishes');
    console.log('⏱️  Since REPLICATE_TEST_STATUS=TRUE, jobs should complete immediately with mock data');

  } catch (error) {
    console.error('❌ Error fixing order:', error);
  }
}

fixStuckOrderV2();
