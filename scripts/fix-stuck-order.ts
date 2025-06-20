// scripts/fix-stuck-order.ts
import supabaseAdmin from '../lib/supabaseAdmin';
import { createRestorationJob } from '../lib/db/restoration-jobs';
import { triggerRestorationForOrder } from '../lib/restoration/trigger';
import { storageService } from '../lib/storage/storage-service';

async function fixStuckOrder() {
  console.log('🔧 Fixing Stuck Order...\n');

  const orderId = '4ff4b481-cd35-485a-9fcc-4830219be60c';
  const sessionId = '447093eb-7afd-461b-9491-63a0dc1d2bea';

  try {
    // 1. Get the stuck image
    const { data: stuckImages } = await supabaseAdmin
      .from('images')
      .select('*')
      .eq('order_id', orderId)
      .eq('status', 'uploaded');

    if (!stuckImages || stuckImages.length === 0) {
      console.log('❌ No stuck images found');
      return;
    }

    console.log(`📋 Found ${stuckImages.length} stuck image(s)`);

    // 2. Move images to permanent storage
    console.log('🚀 Moving images to permanent storage...');
    const moveResults = await storageService.moveToOriginals(sessionId, orderId);
    
    console.log(`✅ Moved ${moveResults.length} images to permanent storage`);
    for (const result of moveResults) {
      console.log(`- Image ${result.imageId}: ${result.publicUrl}`);
    }

    // 3. Create restoration jobs
    console.log('\n🔧 Creating restoration jobs...');
    for (const moveResult of moveResults) {
      try {
        const restorationJob = await createRestorationJob({
          originalImageId: moveResult.imageId,
          inputParameters: {
            input_image: moveResult.publicUrl,
            model: process.env.REPLICATE_MODEL || 'flux-kontext-apps/restore-image',
            seed: Math.floor(Math.random() * 1000000),
            output_format: process.env.REPLICATE_OUTPUT_FORMAT || 'png',
            safety_tolerance: parseInt(process.env.REPLICATE_SAFETY_TOLERANCE || '0')
          },
          metadata: {
            order_id: orderId,
            original_path: moveResult.originalPath,
            moved_from_session: sessionId,
            original_image_url: moveResult.publicUrl,
            manually_fixed: true,
            fixed_at: new Date().toISOString()
          }
        });

        console.log(`✅ Created restoration job: ${restorationJob.id}`);

      } catch (jobError) {
        console.error(`❌ Failed to create restoration job for image ${moveResult.imageId}:`, jobError);
      }
    }

    // 4. Trigger restoration processing
    console.log('\n🚀 Triggering restoration processing...');
    await triggerRestorationForOrder(orderId);
    console.log('✅ Restoration processing triggered');

    // 5. Update order status
    console.log('\n📝 Updating order status...');
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ 
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('❌ Failed to update order status:', updateError);
    } else {
      console.log('✅ Order status updated to processing');
    }

    console.log('\n🎉 Order fix complete!');
    console.log('📧 You should receive the restoration complete email once processing finishes');

  } catch (error) {
    console.error('❌ Error fixing order:', error);
  }
}

fixStuckOrder();
