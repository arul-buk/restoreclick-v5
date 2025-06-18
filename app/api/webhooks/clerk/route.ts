// app/api/webhooks/clerk/route.ts

import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { sendWelcomeEmail } from '@/lib/sendgrid';
import { serverConfig } from '@/lib/config.server'; // THIS IS THE FIX

export async function POST(req: Request) {
  const CLERK_WEBHOOK_SECRET = serverConfig.clerk.webhookSecret;

  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    logger.warn('Missing Svix headers in Clerk webhook request.');
    return new Response('Error occured -- no svix headers', { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);
  const wh = new Webhook(CLERK_WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err: any) {
    logger.warn({ error: err }, `Clerk webhook signature verification failed: ${err.message}`);
    return new Response('Error occured', { status: 400 });
  }

  const eventType = evt.type;
  logger.info({ type: eventType }, `Received Clerk webhook.`);
  
  if (eventType === 'user.created') {
    const { id: clerk_user_id, email_addresses, first_name } = evt.data;
    const email = email_addresses[0]?.email_address;

    if (!clerk_user_id || !email) {
      logger.error({ data: evt.data }, 'Missing clerk_user_id or email in user.created event.');
      return new NextResponse('Missing clerk_user_id or email', { status: 400 });
    }
    
    logger.info({ clerk_user_id, email }, "Processing new user creation.");

    const { error } = await supabaseAdmin.from('profiles').insert({ clerk_user_id, email });

    if (error) {
      logger.error({ error, clerk_user_id }, 'Error inserting new user to Supabase.');
    } else {
      logger.info({ clerk_user_id, email }, 'Successfully inserted new user to Supabase.');
    }

    await sendWelcomeEmail({
      to: email,
      dynamicData: {
        name: first_name || 'there', 
      },
    });
  }

  return new Response('', { status: 200 });
}