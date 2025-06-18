// lib/stripe.ts

import Stripe from 'stripe';
import { serverConfig } from './config.server'; // Use the server config

export const stripe = new Stripe(serverConfig.stripe.secretKey, {
  apiVersion: '2025-05-28.basil' as any,
  typescript: true,
});