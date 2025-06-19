import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import supabaseAdmin from '@/lib/supabaseAdmin';
import logger from '@/lib/logger';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});



export async function POST(req: NextRequest) {
  const log = logger.child({ api_route: 'POST /api/replicate/initiate-restoration' });
  log.info('Received request to initiate image restoration.');

  try {
    const { photoUrls, orderId } = await req.json();
    log.info({ photo_count: photoUrls.length, order_id: orderId, photoUrls }, 'Received data. Creating Replicate predictions for order.');

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }

    if (!photoUrls || !Array.isArray(photoUrls) || photoUrls.length === 0) {
      return NextResponse.json({ error: 'No photo URLs provided' }, { status: 400 });
    }

    const predictionPromises = photoUrls.map((url: string, index: number) => {
      log.info({ photoUrl: url, index }, 'Starting prediction for image.');
      return replicate.predictions.create({
        model: 'flux-kontext-apps/restore-image',
        input: {
          input_image: url,
        },
      }).then((newPrediction) => {
        log.info({ replicate_id: newPrediction.id, input_image_url: url }, 'Successfully created Replicate prediction.');
        return newPrediction;
      });
    });

    const initialPredictions = await Promise.all(predictionPromises);
    log.info({ count: initialPredictions.length }, 'Successfully initiated Replicate predictions.');

    const predictionRecords = initialPredictions.map((p: any) => ({
      replicate_id: p.id,
      status: p.status,
      input_image_url: p.input.input_image,
      order_id: orderId,
      created_at: new Date(p.created_at).toISOString(),
      version: p.version,


    }));

    const { error: insertError, data: dbRecords } = await supabaseAdmin
      .from('predictions')
      .insert(predictionRecords)
      .select();

    if (insertError) {
      log.error({ error: insertError, orderId }, 'Failed to save initial prediction records.');
      throw new Error(`Failed to save initial prediction records: ${insertError.message}`);
    }
    
    if (dbRecords) {
        dbRecords.forEach((dbRecord: any) => {
          log.info({ prediction_id: dbRecord.id, replicate_id: dbRecord.replicate_id }, 'Successfully inserted prediction record into database.');
        });
    }

    log.info({ orderId, count: predictionRecords.length }, 'Successfully saved initial prediction records.');

    return NextResponse.json({
      success: true,
      message: `Successfully initiated ${initialPredictions.length} predictions.`,
    });
  } catch (error) {
    log.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'API Error in initiate-restoration');
    return NextResponse.json(
      { error: 'Failed to initiate restoration process.' },
      { status: 500 }
    );
  }
}
