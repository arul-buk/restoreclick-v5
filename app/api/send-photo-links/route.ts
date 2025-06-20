import { NextRequest, NextResponse } from 'next/server';
import { sendOrderConfirmationEmail, sendRestorationCompleteEmail, sendPhotosToFamilyEmail } from '@/lib/sendgrid';
import { serverConfig } from '@/lib/config.server';
import { createClient } from '@supabase/supabase-js';

// Helper function to download image and convert to base64
async function downloadImageAsBase64(url: string): Promise<{ content: string; filename: string; type: string }> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Content = buffer.toString('base64');
    
    // Extract filename from URL or generate one
    const urlParts = url.split('/');
    const filename = urlParts[urlParts.length - 1] || 'image.jpg';
    
    // Determine content type from URL or default to image/jpeg
    let contentType = 'image/jpeg';
    if (filename.toLowerCase().includes('.png')) {
      contentType = 'image/png';
    } else if (filename.toLowerCase().includes('.webp')) {
      contentType = 'image/webp';
    }
    
    return {
      content: base64Content,
      filename: filename,
      type: contentType
    };
  } catch (error) {
    console.error('Error downloading image:', error);
    throw error;
  }
}

// Helper function to create attachments from photo URLs
async function createAttachmentsFromUrls(photoUrls: string[], prefix: string = ''): Promise<any[]> {
  const attachments = [];
  
  for (let i = 0; i < photoUrls.length; i++) {
    try {
      const imageData = await downloadImageAsBase64(photoUrls[i]);
      attachments.push({
        content: imageData.content,
        filename: prefix ? `${prefix}_${i + 1}_${imageData.filename}` : `image_${i + 1}_${imageData.filename}`,
        type: imageData.type,
        disposition: 'attachment'
      });
    } catch (error) {
      console.error(`Failed to download image ${i + 1}:`, error);
      // Continue with other images even if one fails
    }
  }
  
  return attachments;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { email, photoUrls, actionType, recipientName, message, sharerName, batchId, orderNumber, numberOfPhotos } = await request.json();

    if (!email || !photoUrls || !actionType) {
      return NextResponse.json({ error: 'Missing required fields: email, photoUrls, or actionType' }, { status: 400 });
    }

    if (!Array.isArray(photoUrls) || photoUrls.length === 0) {
      return NextResponse.json({ error: 'photoUrls must be a non-empty array' }, { status: 400 });
    }

    const logo_url = `${serverConfig.app.url}/images/logo.png`;
    let templateId = '';
    let dynamicTemplateData: Record<string, any> = { logo_url };

    // Fetch order details if batchId is provided
    let orderDetails = null;
    if (batchId) {
      try {
        console.log('Fetching order details for batchId:', batchId);
        const { data: order, error } = await supabase
          .from('orders')
          .select('*')
          .eq('image_batch_id', batchId)
          .single();

        console.log('Order query result:', { order, error });
        
        if (!error && order) {
          orderDetails = order;
          console.log('Found order details:', orderDetails);
        } else {
          console.log('No order found or error occurred:', error);
        }
      } catch (err) {
        console.log('Could not fetch order details:', err);
        // Continue without order details
      }
    }

    if (actionType === 'download') {
      templateId = serverConfig.sendgrid.restorationCompleteTemplateId; // Use restoration complete template, not order confirmation
      dynamicTemplateData.subject = 'Your Restored Photo Download Links';
      dynamicTemplateData.header = 'Access Your Restored Photos';
      dynamicTemplateData.body = 'Thank you for using our service! Click the links below to download your restored photos:';
      
      // Include order information for the template - using exact variable names from HTML
      if (orderDetails) {
        // Map to exact template variable names from the restoration complete template
        dynamicTemplateData.customer_name = orderDetails.customer_email || email; // Template expects {{customer_name}}
        dynamicTemplateData.order_id = orderDetails.id || batchId; // Template expects {{order_id}}
        
        // For restoration complete email, we need the image URLs
        if (photoUrls.length > 0) {
          dynamicTemplateData.original_image_url = photoUrls[0]; // Original photo URL
          dynamicTemplateData.restored_image_url = photoUrls[0]; // Restored photo URL
          dynamicTemplateData.original_image_inline_cid = 'original_image'; // For email attachments
          dynamicTemplateData.restored_image_inline_cid = 'restored_image'; // For email attachments
        }
        
        console.log('Using order details for restoration complete template:', {
          customer_name: dynamicTemplateData.customer_name,
          order_id: dynamicTemplateData.order_id,
          original_image_url: dynamicTemplateData.original_image_url,
          restored_image_url: dynamicTemplateData.restored_image_url
        });
      } else {
        // Fallback values if order details not available
        dynamicTemplateData.customer_name = email || 'Valued Customer';
        dynamicTemplateData.order_id = orderNumber || batchId || 'N/A';
        
        if (photoUrls.length > 0) {
          dynamicTemplateData.original_image_url = photoUrls[0];
          dynamicTemplateData.restored_image_url = photoUrls[0];
          dynamicTemplateData.original_image_inline_cid = 'original_image';
          dynamicTemplateData.restored_image_inline_cid = 'restored_image';
        }
        
        console.log('Using fallback values for restoration complete template:', {
          customer_name: dynamicTemplateData.customer_name,
          order_id: dynamicTemplateData.order_id,
          original_image_url: dynamicTemplateData.original_image_url,
          restored_image_url: dynamicTemplateData.restored_image_url
        });
      }

    } else if (actionType === 'share') {
      templateId = serverConfig.sendgrid.familyShareTemplateId;
      dynamicTemplateData.photo_urls = photoUrls;
      dynamicTemplateData.sharer_name = sharerName || 'A friend or family member'; // Use the new sharerName
      dynamicTemplateData.recipient_name = recipientName; // Use the actual recipientName
      dynamicTemplateData.subject = 'Photos Shared With You!';
      dynamicTemplateData.header = `${dynamicTemplateData.sharer_name} has shared some photos with you:`;
      dynamicTemplateData.personalized_message = message; // Pass the message from the form
      dynamicTemplateData.body = 'View the beautiful memories below:';
      // Add any other fields your share template expects

    } else {
      return NextResponse.json({ error: 'Invalid actionType' }, { status: 400 });
    }

    // Prepare attachments based on action type
    let attachments: any[] = [];
    
    if (actionType === 'download') {
      // For restoration complete email: attach ALL original and restored images
      console.log('Creating attachments for restoration complete email...');
      
      // Get original images from the batch (if available in database)
      let originalImageUrls: string[] = [];
      if (orderDetails && orderDetails.input_image_urls) {
        originalImageUrls = Array.isArray(orderDetails.input_image_urls) 
          ? orderDetails.input_image_urls 
          : [orderDetails.input_image_urls];
      }
      
      // If input_image_urls is empty, try to get original images from predictions
      if (originalImageUrls.length === 0 && batchId) {
        console.log('input_image_urls is empty, fetching from predictions...');
        const { data: predictions, error } = await supabase
          .from('predictions')
          .select('input_image_url')
          .eq('batch_id', batchId);
        
        if (!error && predictions) {
          originalImageUrls = predictions
            .map(p => p.input_image_url)
            .filter(Boolean);
          console.log(`Retrieved ${originalImageUrls.length} original URLs from predictions`);
        }
      }
      
      // Create attachments for original images
      if (originalImageUrls.length > 0) {
        const originalAttachments = await createAttachmentsFromUrls(originalImageUrls, 'original');
        attachments.push(...originalAttachments);
      }
      
      // Create attachments for restored images
      if (photoUrls.length > 0) {
        const restoredAttachments = await createAttachmentsFromUrls(photoUrls, 'restored');
        attachments.push(...restoredAttachments);
      }
      
      // Generate ZIP download URL
      let zipDownloadUrl = '';
      try {
        const zipResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/generate-zip`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batchId })
        });
        
        if (zipResponse.ok) {
          const zipData = await zipResponse.json();
          zipDownloadUrl = zipData.downloadUrl;
          console.log('Generated ZIP download URL:', zipDownloadUrl);
        } else {
          console.error('Failed to generate ZIP:', await zipResponse.text());
        }
      } catch (error) {
        console.error('Error generating ZIP:', error);
      }
      
      // Add explicit URLs to template data for direct access
      dynamicTemplateData.original_image_urls = originalImageUrls;
      dynamicTemplateData.restored_image_urls = photoUrls;
      dynamicTemplateData.zip_download_url = zipDownloadUrl;
      dynamicTemplateData.download_links = photoUrls.map((url, index) => ({
        url,
        filename: `restored_image_${index + 1}.png`,
        label: `Restored Photo ${index + 1}`
      }));
      
      // For single image compatibility (if template expects single URLs)
      if (originalImageUrls.length > 0) {
        dynamicTemplateData.original_image_url = originalImageUrls[0];
      }
      if (photoUrls.length > 0) {
        dynamicTemplateData.restored_image_url = photoUrls[0];
      }
      
      console.log(`Created ${attachments.length} attachments and ${originalImageUrls.length + photoUrls.length} URLs for restoration complete email`);
      
      // Send restoration complete email with attachments
      await sendRestorationCompleteEmail({
        to: email,
        dynamicData: dynamicTemplateData,
        attachments: attachments
      });
      
    } else if (actionType === 'share') {
      // For family share email: attach ALL original and restored images
      console.log('Creating attachments for family share email...');
      
      // Get original images from the batch (if available in database)
      let originalImageUrls: string[] = [];
      if (orderDetails && orderDetails.input_image_urls) {
        originalImageUrls = Array.isArray(orderDetails.input_image_urls) 
          ? orderDetails.input_image_urls 
          : [orderDetails.input_image_urls];
      }
      
      // If input_image_urls is empty, try to get original images from predictions
      if (originalImageUrls.length === 0 && batchId) {
        console.log('input_image_urls is empty, fetching from predictions...');
        const { data: predictions, error } = await supabase
          .from('predictions')
          .select('input_image_url')
          .eq('batch_id', batchId);
        
        if (!error && predictions) {
          originalImageUrls = predictions
            .map(p => p.input_image_url)
            .filter(Boolean);
          console.log(`Retrieved ${originalImageUrls.length} original URLs from predictions`);
        }
      }
      
      // Create attachments for original images
      if (originalImageUrls.length > 0) {
        const originalAttachments = await createAttachmentsFromUrls(originalImageUrls, 'original');
        attachments.push(...originalAttachments);
      }
      
      // Create attachments for restored images
      if (photoUrls.length > 0) {
        const restoredAttachments = await createAttachmentsFromUrls(photoUrls, 'restored');
        attachments.push(...restoredAttachments);
      }
      
      // Add explicit URLs to template data for direct access
      dynamicTemplateData.original_image_urls = originalImageUrls;
      dynamicTemplateData.restored_image_urls = photoUrls;
      dynamicTemplateData.photo_urls = photoUrls; // Legacy compatibility
      dynamicTemplateData.download_links = photoUrls.map((url, index) => ({
        url,
        filename: `restored_image_${index + 1}.png`,
        label: `Restored Photo ${index + 1}`
      }));
      
      // For single image compatibility (if template expects single URLs)
      if (originalImageUrls.length > 0) {
        dynamicTemplateData.original_image_url = originalImageUrls[0];
      }
      if (photoUrls.length > 0) {
        dynamicTemplateData.restored_image_url = photoUrls[0];
      }
      
      console.log(`Created ${attachments.length} attachments and ${originalImageUrls.length + photoUrls.length} URLs for family share email`);
      
      // Send family share email with attachments
      await sendPhotosToFamilyEmail({
        to: email,
        dynamicData: dynamicTemplateData,
        attachments: attachments
      });
      
    } else if (actionType === 'order_confirmation') {
      // For order confirmation email: attach ALL original images only
      console.log('Creating attachments for order confirmation email...');
      
      // Get original images from the batch (if available in database)
      let originalImageUrls: string[] = [];
      if (orderDetails && orderDetails.input_image_urls) {
        originalImageUrls = Array.isArray(orderDetails.input_image_urls) 
          ? orderDetails.input_image_urls 
          : [orderDetails.input_image_urls];
      }
      
      // If input_image_urls is empty, try to get original images from predictions
      if (originalImageUrls.length === 0 && batchId) {
        console.log('input_image_urls is empty, fetching from predictions...');
        const { data: predictions, error } = await supabase
          .from('predictions')
          .select('input_image_url')
          .eq('batch_id', batchId);
        
        if (!error && predictions) {
          originalImageUrls = predictions
            .map(p => p.input_image_url)
            .filter(Boolean);
          console.log(`Retrieved ${originalImageUrls.length} original URLs from predictions`);
        }
      }
      
      // Create attachments for original images only
      if (originalImageUrls.length > 0) {
        const originalAttachments = await createAttachmentsFromUrls(originalImageUrls, 'original');
        attachments.push(...originalAttachments);
      }
      
      // Add explicit URLs to template data for direct access
      dynamicTemplateData.original_image_urls = originalImageUrls;
      dynamicTemplateData.uploaded_image_urls = originalImageUrls; // Alternative naming
      
      // For single image compatibility (if template expects single URLs)
      if (originalImageUrls.length > 0) {
        dynamicTemplateData.original_image_url = originalImageUrls[0];
        dynamicTemplateData.uploaded_image_url = originalImageUrls[0]; // Alternative naming
      }
      
      console.log(`Created ${attachments.length} attachments and ${originalImageUrls.length} URLs for order confirmation email`);
      
      // Send order confirmation email with attachments
      await sendOrderConfirmationEmail({
        to: email,
        dynamicData: dynamicTemplateData,
        attachments: attachments
      });
      
    } else {
      return NextResponse.json({ error: 'Invalid actionType' }, { status: 400 });
    }

    return NextResponse.json({ message: `${actionType} email sent successfully to ${email}` });

  } catch (error) {
    console.error('Error in /api/send-photo-links:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to send email', details: errorMessage }, { status: 500 });
  }
}
