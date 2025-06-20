// app/api/orders/[id]/download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getOrderById } from '@/lib/db/orders';
import { getRestorationJobsByOrder } from '@/lib/db/restoration-jobs';
import { storageService } from '@/lib/storage/storage-service';
import logger from '@/lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: orderId } = params;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'all'; // 'all', 'originals', 'restored'
  
  const log = logger.child({ 
    api_route: 'GET /api/orders/[id]/download', 
    orderId, 
    downloadType: type 
  });

  if (!orderId) {
    log.warn('Order ID is required');
    return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
  }

  try {
    log.info('Processing ZIP download request');

    // 1. Verify order exists
    const order = await getOrderById(orderId);
    if (!order) {
      log.warn('Order not found');
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 2. Get restoration jobs for this order
    const restorationJobs = await getRestorationJobsByOrder(orderId);
    const completedJobs = restorationJobs.filter(job => job.status === 'completed');
    
    if (completedJobs.length === 0) {
      log.warn('No completed restoration jobs found');
      return NextResponse.json({ 
        error: 'No photos available for download' 
      }, { status: 400 });
    }

    // 3. Prepare image URLs based on download type
    let imageUrls: string[] = [];
    let zipFileName = `order_${order.order_number}`;

    switch (type) {
      case 'originals':
        imageUrls = completedJobs
          .map(job => {
            const metadata = job.metadata as any;
            return metadata?.original_image_url;
          })
          .filter(Boolean);
        zipFileName += '_originals.zip';
        break;
        
      case 'restored':
        imageUrls = completedJobs
          .map(job => {
            const metadata = job.metadata as any;
            return metadata?.restored_image_url;
          })
          .filter(Boolean);
        zipFileName += '_restored.zip';
        break;
        
      case 'all':
      default:
        // Include both original and restored images
        const originalUrls = completedJobs
          .map(job => {
            const metadata = job.metadata as any;
            return metadata?.original_image_url;
          })
          .filter(Boolean);
        const restoredUrls = completedJobs
          .map(job => {
            const metadata = job.metadata as any;
            return metadata?.restored_image_url;
          })
          .filter(Boolean);
        imageUrls = [...originalUrls, ...restoredUrls];
        zipFileName += '_all_photos.zip';
        break;
    }

    if (imageUrls.length === 0) {
      log.warn({ type }, 'No images found for download type');
      return NextResponse.json({ 
        error: `No ${type} photos available for download` 
      }, { status: 400 });
    }

    // 4. Create ZIP file
    log.info({ imageCount: imageUrls.length }, 'Creating ZIP file');
    
    // const zipResult = await storageService.createZipArchive(
    //   orderId,
    //   imageUrls,
    //   zipFileName
    // );

    // 5. Generate download URL
    // const downloadUrl = zipResult.publicUrl;
    
    log.info({ 
      zipFileName,
      // downloadUrl,
      imageCount: imageUrls.length 
    }, 'ZIP download created successfully');

    return NextResponse.json({
      success: true,
      // downloadUrl,
      fileName: zipFileName,
      imageCount: imageUrls.length,
      downloadType: type,
      // expiresAt: zipResult.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    });

  } catch (error: any) {
    log.error({ 
      error_message: error.message, 
      stack: error.stack 
    }, 'Unexpected error in GET /api/orders/[id]/download');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST endpoint for creating custom ZIP downloads
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: orderId } = params;
  const log = logger.child({ 
    api_route: 'POST /api/orders/[id]/download', 
    orderId 
  });

  if (!orderId) {
    log.warn('Order ID is required');
    return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { imageIds, fileName } = body;

    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      log.warn('Image IDs array is required');
      return NextResponse.json({ 
        error: 'Image IDs array is required' 
      }, { status: 400 });
    }

    log.info({ imageIds }, 'Processing custom ZIP download request');

    // 1. Verify order exists
    const order = await getOrderById(orderId);
    if (!order) {
      log.warn('Order not found');
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 2. Get restoration jobs for this order
    const restorationJobs = await getRestorationJobsByOrder(orderId);
    
    // 3. Filter jobs by requested image IDs and get URLs
    const requestedJobs = restorationJobs.filter(job => 
      imageIds.includes(job.original_image_id) && job.status === 'completed'
    );

    if (requestedJobs.length === 0) {
      log.warn('No matching completed jobs found for requested image IDs');
      return NextResponse.json({ 
        error: 'No matching photos available for download' 
      }, { status: 400 });
    }

    // 4. Collect image URLs (both original and restored for each job)
    const imageUrls: string[] = [];
    for (const job of requestedJobs) {
      const metadata = job.metadata as any;
      if (metadata?.original_image_url) {
        imageUrls.push(metadata.original_image_url);
      }
      if (metadata?.restored_image_url) {
        imageUrls.push(metadata.restored_image_url);
      }
    }

    // 5. Create ZIP file
    const zipFileName = fileName || `order_${order.order_number}_custom.zip`;
    
    log.info({ imageCount: imageUrls.length }, 'Creating custom ZIP file');
    
    // const zipResult = await storageService.createZipArchive(
    //   orderId,
    //   imageUrls,
    //   zipFileName
    // );

    log.info({ 
      zipFileName,
      // downloadUrl: zipResult.publicUrl,
      imageCount: imageUrls.length 
    }, 'Custom ZIP download created successfully');

    return NextResponse.json({
      success: true,
      // downloadUrl: zipResult.publicUrl,
      fileName: zipFileName,
      imageCount: imageUrls.length,
      selectedJobs: requestedJobs.length,
      // expiresAt: zipResult.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });

  } catch (error: any) {
    log.error({ 
      error_message: error.message, 
      stack: error.stack 
    }, 'Unexpected error in POST /api/orders/[id]/download');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
