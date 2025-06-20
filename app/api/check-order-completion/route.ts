import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendRestorationCompleteEmail } from '@/lib/sendgrid';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }

    // Check if restoration complete email already sent
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, predictions(*)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check if email already sent
    if (order.restoration_email_sent) {
      return NextResponse.json({ 
        message: 'Restoration complete email already sent',
        emailSent: true 
      });
    }

    // Check if all predictions are completed
    const predictions = order.predictions || [];
    
    // If input_image_urls is empty, use the number of predictions as total
    const inputImageCount = order.input_image_urls?.length || 0;
    const totalImages = inputImageCount > 0 ? inputImageCount : predictions.length;
    
    // Count only predictions that have succeeded AND have output URLs
    const completedPredictions = predictions.filter((p: any) => 
      p.status === 'succeeded' && p.output_image_url
    );

    console.log('Order completion check:', {
      orderId,
      inputImageCount,
      totalPredictions: predictions.length,
      totalImages,
      completedWithUrls: completedPredictions.length,
      predictions: predictions.map((p: any) => ({
        id: p.id,
        status: p.status,
        hasOutput: !!p.output_image_url
      }))
    });

    if (completedPredictions.length < totalImages || totalImages === 0) {
      return NextResponse.json({ 
        message: 'Not all images restored yet',
        emailSent: false,
        progress: {
          total: totalImages,
          completed: completedPredictions.length
        }
      });
    }

    // Generate ZIP download URL
    const zipResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/generate-zip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchId: order.image_batch_id })
    });

    let zipDownloadUrl = '';
    if (zipResponse.ok) {
      const zipData = await zipResponse.json();
      zipDownloadUrl = zipData.downloadUrl;
    }

    // Prepare email data
    const attachments = [];
    let originalImageUrls = order.input_image_urls || [];
    const restoredImageUrls = completedPredictions.map((p: any) => p.output_image_url).filter(Boolean);

    // If input_image_urls is empty, try to get original images from predictions
    if (originalImageUrls.length === 0 && predictions.length > 0) {
      // Get original images from predictions' input_image_url field
      originalImageUrls = predictions
        .map((p: any) => p.input_image_url)
        .filter(Boolean);
      
      console.log('Retrieved original URLs from predictions:', originalImageUrls);
    }

    // Download and attach all images
    for (let i = 0; i < originalImageUrls.length; i++) {
      try {
        const response = await fetch(originalImageUrls[i]);
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          attachments.push({
            content: Buffer.from(buffer).toString('base64'),
            filename: `original_${i + 1}.jpg`,
            type: 'image/jpeg',
            disposition: 'attachment' as const
          });
        }
      } catch (error) {
        console.error(`Failed to attach original image ${i + 1}:`, error);
      }
    }

    for (let i = 0; i < restoredImageUrls.length; i++) {
      try {
        const response = await fetch(restoredImageUrls[i]);
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          attachments.push({
            content: Buffer.from(buffer).toString('base64'),
            filename: `restored_${i + 1}.png`,
            type: 'image/png',
            disposition: 'attachment' as const
          });
        }
      } catch (error) {
        console.error(`Failed to attach restored image ${i + 1}:`, error);
      }
    }

    // Send restoration complete email
    const dynamicData = {
      order_id: order.id,
      customer_name: order.customer_name || 'Valued Customer',
      customer_email: order.customer_email,
      order_date: new Date(order.created_at).toLocaleDateString(),
      total_amount_paid: order.total_amount || 9.99,
      number_of_photos: totalImages,
      view_restorations_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment-success?batch_id=${order.image_batch_id}`,
      zip_download_url: zipDownloadUrl,
      original_image_urls: originalImageUrls,
      restored_image_urls: restoredImageUrls,
      download_links: [zipDownloadUrl], // Array format for template compatibility
      logo_url: `${process.env.NEXT_PUBLIC_APP_URL}/images/logo.png`
    };

    await sendRestorationCompleteEmail({
      to: order.customer_email,
      dynamicData,
      attachments: attachments.length > 0 ? attachments : undefined
    });

    // Mark email as sent
    await supabase
      .from('orders')
      .update({ restoration_email_sent: true })
      .eq('id', orderId);

    return NextResponse.json({ 
      message: 'Restoration complete email sent successfully',
      emailSent: true,
      attachmentCount: attachments.length,
      zipUrl: zipDownloadUrl
    });

  } catch (error) {
    console.error('Error in check-order-completion:', error);
    return NextResponse.json({ 
      error: 'Failed to process order completion',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
