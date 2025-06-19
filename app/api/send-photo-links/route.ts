import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/sendgrid';
import { serverConfig } from '@/lib/config.server';

export async function POST(request: Request) {
  try {
    const { email, photoUrls, actionType, recipientName, message, sharerName } = await request.json();

    if (!email || !photoUrls || !actionType) {
      return NextResponse.json({ error: 'Missing required fields: email, photoUrls, or actionType' }, { status: 400 });
    }

    if (!Array.isArray(photoUrls) || photoUrls.length === 0) {
      return NextResponse.json({ error: 'photoUrls must be a non-empty array' }, { status: 400 });
    }

    const logo_url = `${serverConfig.app.url}/images/logo.png`;
    let templateId = '';
    let dynamicTemplateData: Record<string, any> = { logo_url };

    if (actionType === 'download') {
      templateId = serverConfig.sendgrid.orderConfirmationTemplateId; // Or a dedicated download links template
      dynamicTemplateData.download_links = photoUrls.map((url, index) => ({
        url,
        filename: `restored_image_${index + 1}.png` // Or derive from URL
      }));
      // You might want a subject specific to downloads
      dynamicTemplateData.subject = 'Your Restored Photo Download Links';
      dynamicTemplateData.header = 'Access Your Restored Photos';
      dynamicTemplateData.body = 'Thank you for using our service! Click the links below to download your restored photos:';
      // Add any other fields your download template expects

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

    if (!templateId) {
        return NextResponse.json({ error: 'SendGrid template ID not configured for this action type.' }, { status: 500 });
    }

    await sendEmail({
      to: email,
      templateId,
      dynamicData: dynamicTemplateData,
    });

    return NextResponse.json({ message: `${actionType} email sent successfully to ${email}` });

  } catch (error) {
    console.error('Error in /api/send-photo-links:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to send email', details: errorMessage }, { status: 500 });
  }
}
