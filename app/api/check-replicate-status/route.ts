import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import logger from '@/lib/logger';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(request: NextRequest) {
  try {
    const { predictionId } = await request.json();
    
    if (!predictionId) {
      return NextResponse.json({ error: 'predictionId is required' }, { status: 400 });
    }

    logger.info({ predictionId }, 'Checking Replicate prediction status');
    
    const prediction = await replicate.predictions.get(predictionId);
    
    return NextResponse.json({ 
      success: true,
      prediction: {
        id: prediction.id,
        status: prediction.status,
        output: prediction.output,
        error: prediction.error,
        created_at: prediction.created_at,
        completed_at: prediction.completed_at
      }
    });
    
  } catch (error) {
    logger.error({ error }, 'Failed to check Replicate status');
    return NextResponse.json({ 
      error: 'Failed to check Replicate status',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
