// Clean payment test file focusing on Stripe webhook functionality

// Mock modules at the top level
vi.mock('stripe', () => {
  const mockConstructEvent = vi.fn();
  const mockStripeInstance = {
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
    webhooks: {
      constructEvent: mockConstructEvent,
    },
  };
  
  const mockStripe = vi.fn().mockImplementation(() => mockStripeInstance);
  // Attach the instance and constructEvent as properties for test access
  (mockStripe as any).mockInstance = mockStripeInstance;
  (mockStripe as any).mockConstructEvent = mockConstructEvent;
  
  return {
    default: mockStripe,
  };
});

vi.mock('@/lib/db/orders', () => ({
  getOrderByCheckoutSession: vi.fn(),
  createOrder: vi.fn(),
  updateOrderStatus: vi.fn(),
  getOrderByPaymentIntent: vi.fn(),
}));

vi.mock('@/lib/db/customers', () => ({
  getOrCreateCustomer: vi.fn(),
}));

vi.mock('@/lib/storage/storage-service', () => ({
  storageService: {
    moveToOriginals: vi.fn(),
    saveRestored: vi.fn(),
  },
}));

vi.mock('@/lib/db/restoration-jobs', () => ({
  createRestorationJob: vi.fn(),
}));

vi.mock('@/lib/db/email-queue', () => ({
  queueEmail: vi.fn(),
}));

vi.mock('@/lib/config.server', () => ({
  serverConfig: {
    stripe: {
      secretKey: 'sk_test_mock_key',
      webhookSecret: 'whsec_mocked_secret_for_tests',
      publishableKey: 'pk_test_mock_key',
    },
    replicate: {
      apiToken: 'r_mock_token',
    },
  },
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { POST as handleStripeWebhook } from '@/app/api/webhooks/stripe/route';
import * as dbOrders from '@/lib/db/orders';
import * as dbCustomers from '@/lib/db/customers';
import { storageService } from '@/lib/storage/storage-service';
import { createRestorationJob } from '@/lib/db/restoration-jobs';
import { queueEmail } from '@/lib/db/email-queue';
import { serverConfig } from '@/lib/config.server';

describe('POST /api/webhooks/stripe', () => {
  let mockStripeInstance: any;

  const mockStripeEvent = (type: string, data: any) => ({
    id: `evt_mock_${Date.now()}`,
    object: 'event',
    type,
    data: { object: data },
    created: Math.floor(Date.now() / 1000),
  });

  const mockCheckoutSessionData = {
    id: 'cs_test_session_123',
    payment_intent: 'pi_test_payment_123',
    customer: 'cus_test_customer_123',
    customer_details: { email: 'test@example.com' },
    metadata: { session_id: 'session_456' },
    payment_method_types: ['card'],
  };

  const generateMockRequest = (body: any, signature: string) => {
    const bodyString = JSON.stringify(body);
    const req = new NextRequest('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': signature, 'Content-Type': 'application/json' },
      body: bodyString,
    });
    return req;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Get the mock stripe instance that the route handler will use
    const stripeModule = vi.mocked(Stripe);
    mockStripeInstance = (stripeModule as any).mockInstance;
    
    // Mock stripe.webhooks.constructEvent with proper signature handling
    (stripeModule as any).mockConstructEvent.mockImplementation((bodyOrRequest: any, sig: string, secret: string) => {
      console.log(`Mock constructEvent received - sig: "${sig}", secret: "${secret}"`);
      const expectedSecret = serverConfig.stripe.webhookSecret;

      if (secret !== expectedSecret) {
        const err = new Error('Webhook secret does not match.');
        (err as any).type = 'StripeSignatureVerificationError';
        throw err;
      }

      if (!sig || sig === 'invalid_signature') {
        const err = new Error('Webhook signature verification failed.');
        (err as any).type = 'StripeSignatureVerificationError';
        throw err;
      }

      // For valid signatures, parse and return the event
      const body = typeof bodyOrRequest === 'string' ? bodyOrRequest : bodyOrRequest.toString();
      try {
        return JSON.parse(body);
      } catch (e) {
        const err = new Error('Invalid JSON payload');
        (err as any).type = 'StripeSignatureVerificationError';
        throw err;
      }
    });

    // Reset all mocks
    vi.mocked(dbOrders.getOrderByCheckoutSession).mockReset();
    vi.mocked(dbOrders.createOrder).mockReset();
    vi.mocked(dbCustomers.getOrCreateCustomer).mockReset();
    vi.mocked(storageService.moveToOriginals).mockReset();
    vi.mocked(storageService.saveRestored).mockReset();
    vi.mocked(createRestorationJob).mockReset();
    vi.mocked(queueEmail).mockReset();
  });

  it('should return 200 for unhandled relevant events', async () => {
    const event = mockStripeEvent('customer.created', {});
    const req = generateMockRequest(event, 'mock_signature_valid');
    const response = await handleStripeWebhook(req);
    expect(response.status).toBe(200);
    const jsonResponse = await response.json();
    expect(jsonResponse).toEqual({ received: true });
  });

  it('should handle checkout.session.completed event successfully', async () => {
    const event = mockStripeEvent('checkout.session.completed', mockCheckoutSessionData);
    
    // Mock successful database operations
    vi.mocked(dbOrders.getOrderByCheckoutSession).mockResolvedValueOnce(null);
    vi.mocked(dbCustomers.getOrCreateCustomer).mockResolvedValueOnce({
      id: 'cus_mock_123',
      email: 'test@example.com',
      stripe_customer_id: 'cus_test_customer_123',
    } as any);
    vi.mocked(dbOrders.createOrder).mockResolvedValueOnce({
      id: 'order_123',
      customer_id: 'cus_mock_123',
      status: 'pending',
    } as any);
    vi.mocked(storageService.moveToOriginals).mockResolvedValueOnce([
      { imageId: 'img1', publicUrl: 'url1' },
      { imageId: 'img2', publicUrl: 'url2' },
    ] as any);
    vi.mocked(createRestorationJob).mockResolvedValueOnce({ id: 'job_123' } as any);
    vi.mocked(queueEmail).mockResolvedValueOnce({} as any);

    const req = generateMockRequest(event, 'mock_signature_valid');
    const response = await handleStripeWebhook(req);

    expect(response.status).toBe(200);
    const jsonResponse = await response.json();
    expect(jsonResponse).toEqual({ received: true });
    expect(dbOrders.getOrderByCheckoutSession).toHaveBeenCalledWith(event.data.object.id);
  });

  it('should return 200 and skip if order already exists (idempotency)', async () => {
    const event = mockStripeEvent('checkout.session.completed', mockCheckoutSessionData);
    vi.mocked(dbOrders.getOrderByCheckoutSession).mockResolvedValueOnce({
      id: 'existing_order_123',
      status: 'completed',
    } as any);

    const req = generateMockRequest(event, 'mock_signature_valid');
    const response = await handleStripeWebhook(req);

    expect(response.status).toBe(200);
    const jsonResponse = await response.json();
    expect(jsonResponse).toEqual({ received: true });
    expect(dbOrders.getOrderByCheckoutSession).toHaveBeenCalledWith('cs_test_session_123');
  });

  it('should return 400 if stripe-signature is missing', async () => {
    const event = mockStripeEvent('checkout.session.completed', mockCheckoutSessionData);
    const req = generateMockRequest(event, '');

    const response = await handleStripeWebhook(req);

    expect(response.status).toBe(400);
    const jsonResponse = await response.json();
    expect(jsonResponse.error).toBe('Webhook error: Unable to extract timestamp and signatures from header');
  });

  it('should return 400 if webhook signature is invalid', async () => {
    const event = mockStripeEvent('checkout.session.completed', {});
    const req = generateMockRequest(event, 'mock_signature_invalid');

    const response = await handleStripeWebhook(req);
    expect(response.status).toBe(400);
    const jsonResponse = await response.json();
    expect(jsonResponse.error).toBe('Webhook error: No signatures found matching the expected signature for payload.');
  });

  it('should return 500 if handleCheckoutSessionCompleted throws an error', async () => {
    const event = mockStripeEvent('checkout.session.completed', mockCheckoutSessionData);
    vi.mocked(dbOrders.getOrderByCheckoutSession).mockResolvedValueOnce(null);
    vi.mocked(dbCustomers.getOrCreateCustomer).mockRejectedValueOnce(new Error('DB error creating customer'));

    const req = generateMockRequest(event, 'mock_signature_valid');
    const response = await handleStripeWebhook(req);

    expect(response.status).toBe(500);
    const jsonResponse = await response.json();
    expect(jsonResponse.error).toBe('Internal server error handling event');
  });

  it('should still queue order_confirmation email if image processing fails', async () => {
    const event = mockStripeEvent('checkout.session.completed', mockCheckoutSessionData);
    
    vi.mocked(dbOrders.getOrderByCheckoutSession).mockResolvedValueOnce(null);
    vi.mocked(dbCustomers.getOrCreateCustomer).mockResolvedValueOnce({
      id: 'cus_mock_123',
      email: 'test@example.com',
    } as any);
    vi.mocked(dbOrders.createOrder).mockResolvedValueOnce({
      id: 'order_123',
      status: 'pending',
    } as any);
    vi.mocked(storageService.moveToOriginals).mockRejectedValueOnce(new Error('Storage error'));
    vi.mocked(queueEmail).mockResolvedValueOnce({} as any);

    const req = generateMockRequest(event, 'mock_signature_valid');
    const response = await handleStripeWebhook(req);
    expect(response.status).toBe(200);
    const jsonResponse = await response.json();
    expect(jsonResponse).toEqual({ received: true });
    expect(queueEmail).toHaveBeenCalledWith(expect.objectContaining({
      type: 'order_confirmation',
    }));
  });
});
