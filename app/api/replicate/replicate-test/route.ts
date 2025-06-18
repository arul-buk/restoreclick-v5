import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import { put } from '@vercel/blob';
import { randomUUID } from 'crypto';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get('image') as File | null;

    if (!imageFile) {
      return NextResponse.json({ error: 'No image file provided.' }, { status: 400 });
    }

    console.log('Uploading source image to Vercel Blob...');
    const imageBuffer = await imageFile.arrayBuffer();
    const blob = await put(
      `test-${randomUUID()}-${imageFile.name}`,
      imageBuffer,
      {
        access: 'public',
        contentType: imageFile.type,
        token: process.env.BLOB_READ_WRITE_TOKEN!,
      }
    );
    console.log(`Source image uploaded: ${blob.url}`);

    console.log('Creating prediction with Replicate...');
    const prediction = await replicate.predictions.create({
      // Make sure to use the exact model version from the documentation
      version: '85ae46551612b8f778348846b6ce1ce1b340e384fe2062399c0c412be29e107d',
      input: {
        input_image: blob.url,
        // These parameters are based on the model's expected input
        scale: 2,
        face_enhance: true,
      },
      // Optional: configure a webhook to be notified upon completion
      // webhook: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/replicate`,
      // webhook_events_filter: ['completed']
    });

    if (prediction?.error) {
      throw new Error(JSON.stringify(prediction.error));
    }

    console.log('Prediction started:', prediction.id);
    return NextResponse.json(prediction);

  } catch (error) {
    console.error('Error in replicate-test API:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
