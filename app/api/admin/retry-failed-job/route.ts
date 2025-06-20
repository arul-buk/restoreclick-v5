import { NextRequest, NextResponse } from 'next/server';
import { triggerRestorationForOrder } from '@/lib/restoration/trigger';
import supabaseAdmin from '@/lib/supabaseAdmin';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();
    
    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    logger.info({ orderId }, 'Retrying failed jobs for order');

    // First get the image IDs for this order
    const { data: images, error: imageError } = await supabaseAdmin
      .from('images')
      .select('id')
      .eq('order_id', orderId);

    if (imageError) {
      throw new Error(`Failed to get images: ${imageError.message}`);
    }

    if (!images || images.length === 0) {
      return NextResponse.json({ 
        success: false,
        message: 'No images found for this order'
      });
    }

    const imageIds = images.map(img => img.id);

    // Reset failed jobs to pending
    const { data: resetResult, error: resetError } = await supabaseAdmin
      .from('restoration_jobs')
      .update({
        status: 'pending',
        external_job_id: null,
        error_message: null,
        failed_at: null,
        updated_at: new Date().toISOString(),
        metadata: {
          retry_attempt: true,
          retry_timestamp: new Date().toISOString()
        }
      })
      .eq('status', 'failed')
      .in('original_image_id', imageIds)
      .select('id, status');

    if (resetError) {
      throw new Error(`Failed to reset jobs: ${resetError.message}`);
    }

    if (!resetResult || resetResult.length === 0) {
      return NextResponse.json({ 
        success: false,
        message: 'No failed jobs found for this order'
      });
    }

    // Trigger restoration processing
    await triggerRestorationForOrder(orderId);

    return NextResponse.json({ 
      success: true,
      message: `Reset and retried ${resetResult.length} failed jobs`,
      resetJobs: resetResult
    });
    
  } catch (error) {
    logger.error({ error }, 'Failed to retry failed jobs');
    return NextResponse.json({ 
      error: 'Failed to retry failed jobs',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
