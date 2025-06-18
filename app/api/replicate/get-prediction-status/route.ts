// src/app/api/get-prediction-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import Replicate from 'replicate';

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

// Model identifier - using direct format as per Replicate documentation
const MODEL_IDENTIFIER = "flux-kontext-apps/restore-image";

export async function GET(req: NextRequest) {
  if (!process.env.REPLICATE_API_TOKEN || !MODEL_IDENTIFIER) {
    console.error('Missing required environment variables:', {
      hasApiToken: !!process.env.REPLICATE_API_TOKEN,
      hasModelIdentifier: !!MODEL_IDENTIFIER
    });
    return NextResponse.json(
      { error: 'Server configuration error: Replicate API configuration is incomplete.' }, 
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const predictionId = searchParams.get('prediction_id');

  if (!predictionId) {
    return NextResponse.json(
      { error: 'Prediction ID is required' }, 
      { status: 400 }
    );
  }

  try {
    console.log(`Fetching prediction status for ID: ${predictionId}`);
    
    // Get the prediction details
    const prediction = await replicate.predictions.get(predictionId);

    if (!prediction) {
      return NextResponse.json(
        { error: 'Prediction not found' }, 
        { status: 404 }
      );
    }

    // If prediction is complete and succeeded, download from Replicate and upload to Vercel Blob
    if (prediction.status === 'succeeded' && prediction.output) {
      // Assuming prediction.output is the URL of the restored image from Replicate
      const imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;

      // Download the image from Replicate
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image from Replicate: ${response.statusText}`);
      }
      const imageBlob = await response.blob();

      // Upload the image to Vercel Blob Storage
      // Use a unique filename, e.g., based on prediction ID or a hash
      const filename = `restored-${predictionId}.png`; // Or derive from original filename
      const { url: vercelBlobUrl } = await put(filename, imageBlob, {
        access: 'public',
      });

      return NextResponse.json({ status: prediction.status, output: vercelBlobUrl }, { status: 200 });
    }

    // Format the response in a consistent way with initiate-restoration
    const response = {
      id: prediction.id,
      status: prediction.status,
      input: prediction.input,
      output: prediction.output,
      error: prediction.error,
      logs: prediction.logs,
      metrics: prediction.metrics,
      created_at: prediction.created_at,
      started_at: prediction.started_at,
      completed_at: prediction.completed_at
    };
    
    return NextResponse.json(response);

  } catch (error) {
    console.error(`Error fetching prediction ${predictionId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: `Failed to get prediction status: ${errorMessage}`,
        details: error instanceof Error ? error.stack : undefined
      }, 
      { status: 500 }
    );
  }
}
