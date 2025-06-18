// src/app/api/get-prediction/[id]/route.ts
import { NextResponse } from 'next/server';

type RouteContext = {
  params?: Promise<Record<string, string | string[] | undefined>>;
};

export async function GET(
  _request: Request,
  context: unknown
) {
  const ctx = context as Promise<RouteContext>;
  const resolvedCtx = await ctx;
  
  if (!resolvedCtx.params) {
    return NextResponse.json({ error: 'Prediction ID is required' }, { status: 400 });
  }
  
  const params = await resolvedCtx.params;
  
  if (!params || !params['id']) {
    return NextResponse.json({ error: 'Prediction ID is required' }, { status: 400 });
  }
  
  const predictionId = Array.isArray(params['id']) ? params['id'][0] : params['id'];
  
  if (!predictionId) {
    return NextResponse.json({ error: 'Prediction ID is required' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://api.replicate.com/v1/predictions/${predictionId}`,
      {
        headers: {
          Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        // Add cache: 'no-store' to ensure we always get the latest status
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Replicate API error:', errorData);
      return NextResponse.json({ error: 'Failed to fetch prediction status from Replicate.', details: errorData }, { status: response.status });
    }

    const prediction = await response.json();
    return NextResponse.json(prediction);

  } catch (error) {
    console.error('Internal server error fetching prediction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}