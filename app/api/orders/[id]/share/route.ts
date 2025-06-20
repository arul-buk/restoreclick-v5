// app/api/orders/[id]/share/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getOrderById } from '@/lib/db/orders';
import { getRestorationJobsByOrder } from '@/lib/db/restoration-jobs';
import { queueEmail } from '@/lib/db/email-queue';
import logger from '@/lib/logger';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: orderId } = params;
  const log = logger.child({ api_route: 'POST /api/orders/[id]/share', orderId });

  if (!orderId) {
    log.warn('Order ID is required');
    return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { recipientEmail, recipientName, message, sharerName, emailType = 'share_family' } = body;

    if (!recipientEmail) {
      log.warn('Recipient email is required');
      return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 });
    }

    log.info({ recipientEmail, emailType }, 'Processing photo share request');

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
        error: 'No restored photos available to share' 
      }, { status: 400 });
    }

    // 3. Prepare image URLs for sharing
    const originalImageUrls = completedJobs
      .map(job => {
        const metadata = job.metadata as any;
        return metadata?.original_image_url;
      })
      .filter(Boolean);

    const restoredImageUrls = completedJobs
      .map(job => {
        const metadata = job.metadata as any;
        return metadata?.restored_image_url;
      })
      .filter(Boolean);

    // 4. Prepare email attachments
    const attachments = await prepareShareEmailAttachments(originalImageUrls, restoredImageUrls);

    // 5. Queue the share email
    await queueEmail({
      orderId: order.id,
      emailType,
      toEmail: recipientEmail,
      toName: recipientName || undefined,
      subject: `${sharerName || order.customer_name || order.customer_email} shared restored photos with you!`,
      dynamicData: {
        sender_name: sharerName || order.customer_name || order.customer_email,
        sender_email: order.customer_email,
        recipient_name: recipientName || recipientEmail,
        recipient_email: recipientEmail,
        order_id: order.order_number,
        order_date: new Date(order.created_at).toLocaleDateString(),
        number_of_photos: completedJobs.length,
        personal_message: message || '',
        // Include both original and restored image URLs
        original_image_urls: originalImageUrls,
        restored_image_urls: restoredImageUrls,
        // View photos URL
        view_photos_url: `${process.env.NEXT_PUBLIC_APP_URL}/shared-photos/${order.id}`
      },
      attachments
    });

    log.info({ 
      recipientEmail,
      photoCount: completedJobs.length 
    }, 'Share photos email queued successfully');

    return NextResponse.json({ 
      success: true,
      message: 'Photos shared successfully',
      photoCount: completedJobs.length
    });

  } catch (error: any) {
    log.error({ 
      error_message: error.message, 
      stack: error.stack 
    }, 'Unexpected error in POST /api/orders/[id]/share');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function prepareShareEmailAttachments(
  originalUrls: string[], 
  restoredUrls: string[]
): Promise<Array<{
  filename: string;
  content: string;
  type: string;
  disposition: string;
}>> {
  const { getSupabaseStoragePathFromUrl, downloadFileAsBuffer } = await import('@/lib/supabase-utils');
  const attachments = [];

  // Add original images
  for (const [index, imageUrl] of originalUrls.entries()) {
    try {
      const pathDetails = getSupabaseStoragePathFromUrl(imageUrl);
      if (pathDetails && pathDetails.bucketName && pathDetails.filePath) {
        const { bucketName, filePath } = pathDetails;
        const imageBuffer = await downloadFileAsBuffer(bucketName, filePath);
        attachments.push({
          content: imageBuffer.toString('base64'),
          filename: `original_${index + 1}_${filePath.split('/').pop() || 'image.jpg'}`,
          type: 'image/jpeg',
          disposition: 'attachment',
        });
      }
    } catch (error) {
      logger.error({ error, imageUrl }, 'Failed to prepare original image attachment for sharing');
    }
  }

  // Add restored images
  for (const [index, imageUrl] of restoredUrls.entries()) {
    try {
      const pathDetails = getSupabaseStoragePathFromUrl(imageUrl);
      if (pathDetails && pathDetails.bucketName && pathDetails.filePath) {
        const { bucketName, filePath } = pathDetails;
        const imageBuffer = await downloadFileAsBuffer(bucketName, filePath);
        attachments.push({
          content: imageBuffer.toString('base64'),
          filename: `restored_${index + 1}_${filePath.split('/').pop() || 'image.jpg'}`,
          type: 'image/jpeg',
          disposition: 'attachment',
        });
      }
    } catch (error) {
      logger.error({ error, imageUrl }, 'Failed to prepare restored image attachment for sharing');
    }
  }

  return attachments;
}
