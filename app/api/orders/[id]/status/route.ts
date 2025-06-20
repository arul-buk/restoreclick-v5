// app/api/orders/[id]/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getOrderById } from '@/lib/db/orders';
import { getRestorationJobsByOrder } from '@/lib/db/restoration-jobs';
import logger from '@/lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: orderId } = params;
  const log = logger.child({ api_route: 'GET /api/orders/[id]/status', orderId });

  if (!orderId) {
    log.warn('Order ID is required');
    return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
  }

  try {
    log.info('Fetching order status');

    // 1. Get order details
    const order = await getOrderById(orderId);
    if (!order) {
      log.warn('Order not found');
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 2. Get restoration jobs for this order
    const restorationJobs = await getRestorationJobsByOrder(orderId);
    
    // 3. Calculate completion statistics
    const totalJobs = restorationJobs.length;
    const completedJobs = restorationJobs.filter(job => job.status === 'completed').length;
    const failedJobs = restorationJobs.filter(job => job.status === 'failed').length;
    const processingJobs = restorationJobs.filter(job => 
      job.status === 'pending' || job.status === 'processing'
    ).length;

    // 4. Determine overall status
    let overallStatus: 'pending' | 'processing' | 'completed' | 'failed';
    if (processingJobs > 0) {
      overallStatus = 'processing';
    } else if (completedJobs > 0 && failedJobs === 0) {
      overallStatus = 'completed';
    } else if (completedJobs === 0 && failedJobs > 0) {
      overallStatus = 'failed';
    } else if (completedJobs > 0 && failedJobs > 0) {
      overallStatus = 'completed'; // Partial completion
    } else {
      overallStatus = 'pending';
    }

    // 5. Calculate progress percentage
    const progressPercentage = totalJobs > 0 
      ? Math.round(((completedJobs + failedJobs) / totalJobs) * 100)
      : 0;

    // 6. Get restored image URLs for completed jobs
    const restoredImages = restorationJobs
      .filter(job => job.status === 'completed' && job.metadata && typeof job.metadata === 'object')
      .map(job => {
        const metadata = job.metadata as any;
        // Handle both test mode (mock_output_url) and production mode (restored_image_url)
        const restoredImageUrl = metadata.mock_output_url || metadata.restored_image_url;
        
        if (!restoredImageUrl) return null;
        
        return {
          id: job.id,
          originalImageId: job.original_image_id,
          restoredImageUrl,
          originalImageUrl: metadata.original_image_url,
          isTestMode: metadata.test_mode === true
        };
      })
      .filter(Boolean); // Remove null entries

    const response = {
      order: {
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
        customerEmail: order.customer_email,
        totalAmount: order.total_amount,
        currency: order.currency,
        createdAt: order.created_at,
        updatedAt: order.updated_at
      },
      restoration: {
        overallStatus,
        progressPercentage,
        totalJobs,
        completedJobs,
        failedJobs,
        processingJobs,
        restoredImages
      },
      jobs: restorationJobs.map(job => ({
        id: job.id,
        status: job.status,
        originalImageId: job.original_image_id,
        externalId: job.external_job_id,
        errorMessage: job.error_message,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
        completedAt: job.completed_at,
        metadata: job.metadata
      }))
    };

    log.info({ 
      overallStatus, 
      progressPercentage, 
      totalJobs, 
      completedJobs 
    }, 'Order status retrieved successfully');

    return NextResponse.json(response);

  } catch (error: any) {
    log.error({ 
      error_message: error.message, 
      stack: error.stack 
    }, 'Unexpected error in GET /api/orders/[id]/status');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
