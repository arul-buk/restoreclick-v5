import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import supabaseAdmin from '@/lib/supabaseAdmin';
import logger from '@/lib/logger';

export async function POST(req: NextRequest) {
  return NextResponse.json(
    { error: 'Authentication has been removed from this application' },
    { status: 401 }
  );
}
