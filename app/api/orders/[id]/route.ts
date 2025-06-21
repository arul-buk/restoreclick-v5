// /app/api/orders/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';
import logger from '@/lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const orderId = params.id;
  const log = logger.child({ api_route: `GET /api/orders/${orderId}` });

  if (!orderId) {
    return NextResponse.json({ error: 'Order ID is required.' }, { status: 400 });
  }

  try {
    log.info('Fetching complete order data.');
    
    // Get order details
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError) {
      log.error({ error: orderError }, 'Failed to fetch order from database.');
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    // Get images for this order
    const { data: images, error: imagesError } = await supabaseAdmin
      .from('images')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (imagesError) {
      log.error({ error: imagesError }, 'Failed to fetch images from database.');
      throw imagesError;
    }

    // Enhance image data with original filenames and better naming
    const enhancedImages = images?.map(image => {
      let originalFilename = 'photo'; // default fallback
      
      // For restored images, try to get the original filename from the parent image
      if (image.type === 'restored' && image.parent_image_id) {
        const parentImage = images.find(img => img.id === image.parent_image_id);
        if (parentImage?.metadata?.original_filename) {
          originalFilename = parentImage.metadata.original_filename;
        }
      } else if (image.metadata?.original_filename) {
        // For original images, use their own filename
        originalFilename = image.metadata.original_filename;
      }
      
      const enhanced = {
        ...image,
        original_filename: originalFilename,
        display_name: image.type === 'restored' 
          ? `${originalFilename.replace(/\.[^/.]+$/, '') || 'photo'}_restored`
          : originalFilename,
        file_extension: image.mime_type === 'image/png' ? '.png' 
          : image.mime_type === 'image/jpeg' ? '.jpg'
          : image.mime_type === 'image/webp' ? '.webp'
          : '.jpg' // default fallback
      };
      
      return enhanced;
    }) || [];

    // Get predictions (legacy support)
    const { data: predictions, error: predictionsError } = await supabaseAdmin
      .from('predictions')
      .select('*')
      .eq('order_id', orderId);

    if (predictionsError) {
      log.warn({ error: predictionsError }, 'Failed to fetch predictions - may not exist for this order.');
    }

    const response = {
      ...order,
      images: enhancedImages,
      predictions: predictions || []
    };

    return NextResponse.json(response);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error({ error: errorMessage }, 'Error fetching order data.');
    return NextResponse.json({ error: 'Failed to fetch order data.' }, { status: 500 });
  }
}
