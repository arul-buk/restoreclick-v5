// payment.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import Stripe from 'stripe';

// Set environment variables for tests
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

// Mock server config before any other imports
vi.mock('@/lib/config.server', () => ({
  serverConfig: {
    stripe: {
      secretKey: 'sk_test_mock_key',
      webhookSecret: 'whsec_mocked_secret_for_tests',
      publishableKey: 'pk_test_mock_key',
      proPlanPriceId: 'price_test_mock_id',
    },
    replicate: {
      apiToken: 'r_mock_token',
    },
    app: {
      url: 'http://localhost:3000',
    },
  },
}));

// Mock Stripe constructor to return our mock instance
vi.mock('stripe', () => ({
  default: vi.fn(() => ({
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
    webhooks: {
      constructEvent: vi.fn(),
    },
  })),
}));

// Mock the stripe export from @/lib/stripe
vi.mock('@/lib/stripe', () => ({
  stripe: {
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
    webhooks: {
      constructEvent: vi.fn(),
    },
  },
}));

import { POST as handleCreateCheckoutSession } from '@/app/api/create-checkout-session/route';
import type { Database } from '@/lib/database.types';
import { stripe } from '@/lib/stripe';

// Type aliases for cleaner code
type Customer = Database['public']['Tables']['customers']['Row'];
type Order = Database['public']['Tables']['orders']['Row'];
type OrderStatus = Database['public']['Enums']['order_status_enum'];

// Helper function to generate mock NextRequest
function generateMockRequest(body: any): NextRequest {
  const url = 'http://localhost:3000/api/create-checkout-session';
  const headers = new Headers({
    'content-type': 'application/json',
  });
  
  return new NextRequest(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

describe('Payment Flow - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Checkout Session Creation', () => {
    it('should create checkout session successfully', async () => {
      const mockSession = {
        id: 'cs_123',
        url: 'https://checkout.stripe.com/pay/cs_123',
        payment_intent: 'pi_123',
        customer: 'cus_stripe123',
        amount_total: 1000,
        currency: 'usd',
        status: 'open'
      };

      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue(mockSession as any);

      const request = generateMockRequest({
        priceId: 'price_test_mock_id',
        sessionId: 'session_123',
        quantity: 1
      });

      const response = await handleCreateCheckoutSession(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.url).toBe('https://checkout.stripe.com/pay/cs_123');
      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith({
        payment_method_types: ['card'],
        line_items: [
          {
            price: 'price_test_mock_id',
            quantity: 1,
          },
        ],
        mode: 'payment',
        metadata: {
          session_id: 'session_123',
        },
        success_url: 'http://localhost:3000/payment-success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'http://localhost:3000/pricing',
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
        customer_creation: 'always',
      });
    });

    it('should handle missing priceId', async () => {
      const request = generateMockRequest({
        sessionId: 'session_123',
        quantity: 1
        // Missing priceId
      });

      const response = await handleCreateCheckoutSession(request);

      expect(response.status).toBe(400);
      const text = await response.text();
      expect(text).toBe('Price ID is required');
    });

    it('should handle missing sessionId', async () => {
      const request = generateMockRequest({
        priceId: 'price_test_mock_id',
        quantity: 1
        // Missing sessionId
      });

      const response = await handleCreateCheckoutSession(request);

      expect(response.status).toBe(400);
      const text = await response.text();
      expect(text).toBe('Session ID is required');
    });

    it('should handle Stripe API errors during checkout session creation', async () => {
      vi.mocked(stripe.checkout.sessions.create).mockRejectedValue(new Error('Stripe API error'));

      const request = generateMockRequest({
        priceId: 'price_test_mock_id',
        sessionId: 'session_123',
        quantity: 1
      });

      const response = await handleCreateCheckoutSession(request);

      expect(response.status).toBe(500);
    });

    it('should handle invalid JSON in request body', async () => {
      const url = 'http://localhost:3000/api/create-checkout-session';
      const headers = new Headers({
        'content-type': 'application/json',
      });
      
      const request = new NextRequest(url, {
        method: 'POST',
        headers,
        body: 'invalid json',
      });

      const response = await handleCreateCheckoutSession(request);

      expect(response.status).toBe(500);
    });
  });
});

/*
=============================================================================
STRIPE WEBHOOK INTEGRATION TESTS
=============================================================================

⚠️  IMPORTANT: Webhook tests require Stripe CLI and ngrok setup!

Before running webhook integration tests, ensure you have:

1. Stripe CLI installed and authenticated:
   ```bash
   brew install stripe/stripe-cli/stripe
   stripe login
   ```

2. ngrok installed and running:
   ```bash
   brew install ngrok
   ngrok http 3000
   ```

3. Start your development server:
   ```bash
   npm run dev
   ```

4. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

5. Run the webhook integration tests:
   ```bash
   npm run test:webhooks
   ```

The webhook integration tests are located in:
- tests/integration/stripe-webhooks.test.ts

These tests will:
- Create real Stripe checkout sessions
- Trigger actual webhook events using Stripe CLI
- Verify the complete payment flow end-to-end
- Test order creation, status updates, and restoration job creation
- Validate email queue operations

For manual webhook testing, use:
```bash
stripe trigger checkout.session.completed
```

See docs/stripe-webhook-testing.md for detailed setup instructions.
=============================================================================
*/
