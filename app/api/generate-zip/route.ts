import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import JSZip from 'jszip';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { batchId } = await request.json();

    if (!batchId) {
      return NextResponse.json({ error: 'Missing batchId' }, { status: 400 });
    }

    // Fetch order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('image_batch_id', batchId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Fetch all predictions for this batch
    const { data: predictions, error: predictionsError } = await supabase
      .from('predictions')
      .select('*')
      .eq('order_id', order.id)
      .eq('status', 'succeeded');

    if (predictionsError || !predictions || predictions.length === 0) {
      return NextResponse.json({ error: 'No completed predictions found' }, { status: 404 });
    }

    // Create ZIP file
    const zip = new JSZip();

    // Add original images
    const originalUrls = order.input_image_urls || [];
    for (let i = 0; i < originalUrls.length; i++) {
      try {
        const response = await fetch(originalUrls[i]);
        if (response.ok) {
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          zip.file(`original_${i + 1}.jpg`, arrayBuffer);
        }
      } catch (error) {
        console.error(`Failed to add original image ${i + 1}:`, error);
      }
    }

    // Add restored images
    for (let i = 0; i < predictions.length; i++) {
      try {
        const restoredUrl = predictions[i].output_image_url;
        if (restoredUrl) {
          const response = await fetch(restoredUrl);
          if (response.ok) {
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            zip.file(`restored_${i + 1}.png`, arrayBuffer);
          }
        }
      } catch (error) {
        console.error(`Failed to add restored image ${i + 1}:`, error);
      }
    }

    // Generate ZIP
    const zipContent = await zip.generateAsync({ type: 'base64' });

    // Create a unique filename
    const timestamp = new Date().getTime();
    const filename = `photos_${order.id}_${timestamp}.zip`;

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('photos')
      .upload(`downloads/${filename}`, Buffer.from(zipContent, 'base64'), {
        contentType: 'application/zip',
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('photos')
      .getPublicUrl(`downloads/${filename}`);

    // Return the download URL
    return NextResponse.json({ 
      downloadUrl: publicUrl,
      filename: filename,
      expiresIn: '24 hours' // Note: Implement actual expiration if needed
    });

  } catch (error) {
    console.error('Error generating ZIP:', error);
    return NextResponse.json({ 
      error: 'Failed to generate ZIP file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
