// middleware.ts

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { publicConfig } from './lib/config.public'; // Use the public config
import logger from './lib/logger';

const isPublicRoute = createRouteMatcher([
  '/',
  '/api/price',
  '/api/checkout', // Use this for checkout
  '/api/upload-temporary-images',
  '/api/webhooks/stripe',
  '/api/replicate/initiate-restoration', // Allow webhook to trigger restoration
  '/api/replicate/predictions/(.*)', // Allow polling for Replicate prediction status
  '/api/stripe/session/(.*)', // Allow fetching session data on success page
  '/api/orders/(.*)', // Allow polling for order and prediction status
  '/api/predictions/by-batch/(.*)', // Allow fetching predictions by batch ID on payment success page
  '/blog(.*)', // Make blog list and individual posts public
  '/restore-old-photos',
  '/faq',
  '/payment',
  '/payment-success',
  '/our-story', // Added "Our Story" page
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/(.*)', // General webhook pattern if needed, covered by specific /stripe one too
  publicConfig.featureFlags.enablePublicPricingPage ? '/pricing' : ''
]);

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) {
    logger.info({ path: req.nextUrl.pathname }, "Protecting route.");
    auth().protect();
  }
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};