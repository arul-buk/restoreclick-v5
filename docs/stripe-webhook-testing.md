# Stripe Webhook Testing with Stripe CLI and ngrok

This document outlines the approach for testing Stripe webhooks using Stripe CLI and ngrok for real webhook event delivery.

## Prerequisites

1. **Stripe CLI** - Already installed
2. **ngrok** - Already configured
3. **Local development server** running on port 3001

## Setup Process

### 1. Start the Development Server
```bash
npm run dev
# Server should be running on http://localhost:3001
```

### 2. Expose Local Server with ngrok
```bash
ngrok http 3001
# Note the HTTPS URL (e.g., https://abc123.ngrok.io)
```

### 3. Configure Stripe CLI Webhook Forwarding
```bash
stripe listen --forward-to https://abc123.ngrok.io/api/webhooks/stripe
# This will output a webhook signing secret (whsec_...)
```

### 4. Update Environment Variables
Add the webhook signing secret to your `.env.local`:
```env
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdef...
```

## Testing Scenarios

### 1. Checkout Session Completed Event
```bash
# Trigger a test checkout.session.completed event
stripe trigger checkout.session.completed
```

### 2. Payment Intent Events
```bash
# Trigger payment intent succeeded
stripe trigger payment_intent.succeeded

# Trigger payment intent failed
stripe trigger payment_intent.payment_failed
```

### 3. Custom Test Events
```bash
# Send a specific event with custom data
stripe events resend evt_1234567890abcdef
```

## Integration Test Structure

### Test File: `tests/integration/stripe-webhooks.integration.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('Stripe Webhook Integration Tests', () => {
  let ngrokUrl: string;
  let stripeListenProcess: any;

  beforeAll(async () => {
    // Start ngrok and get the URL
    // Start stripe listen process
    // Wait for webhook endpoint to be ready
  });

  afterAll(async () => {
    // Clean up processes
  });

  it('should handle checkout.session.completed webhook', async () => {
    // Trigger the webhook event
    await execAsync('stripe trigger checkout.session.completed');
    
    // Wait for event processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verify database changes
    // Check that order was created
    // Verify customer was created/updated
    // Confirm email was queued
  });

  it('should handle payment_intent.succeeded webhook', async () => {
    // Similar structure for payment intent events
  });

  it('should handle webhook signature validation', async () => {
    // Test with invalid signature
    // Verify proper error handling
  });
});
```

## Verification Steps

### 1. Database Verification
After triggering webhook events, verify:
- Orders are created with correct status
- Customers are created/updated
- Payment intents are linked properly
- Metadata is stored correctly

### 2. Email Queue Verification
Check that appropriate emails are queued:
- Order confirmation emails
- Payment success notifications
- Error notifications (for failed payments)

### 3. Storage Operations
Verify that storage operations are triggered:
- Images moved to originals folder
- Restoration jobs created
- File paths updated in database

## Debugging

### View Webhook Logs
```bash
# View recent webhook events
stripe events list --limit 10

# Get details of specific event
stripe events retrieve evt_1234567890abcdef
```

### Check Local Logs
Monitor the development server logs for:
- Webhook receipt confirmation
- Processing errors
- Database operation results

### Stripe Dashboard
Use the Stripe Dashboard to:
- View webhook delivery attempts
- Check event details
- Monitor webhook endpoint health

## Benefits of This Approach

1. **Real Event Data**: Uses actual Stripe event payloads
2. **Signature Verification**: Tests real webhook signature validation
3. **End-to-End Testing**: Covers the complete webhook processing flow
4. **Error Scenarios**: Can test various failure modes
5. **Performance Testing**: Measures actual processing times

## Test Data Management

### Setup Test Data
```bash
# Create test products and prices
stripe products create --name "Test Photo Restoration"
stripe prices create --unit-amount 2999 --currency usd --product prod_test123
```

### Cleanup Test Data
```bash
# Clean up test customers, orders, etc.
# This should be automated in test teardown
```

## Continuous Integration

For CI/CD pipelines, consider:
- Using Stripe's test mode exclusively
- Mocking external dependencies (email, storage)
- Running integration tests in a separate stage
- Using Docker containers for consistent environments

## Security Considerations

1. **Test Mode Only**: Always use Stripe test keys
2. **Webhook Secrets**: Rotate test webhook secrets regularly
3. **Data Isolation**: Ensure test data doesn't affect production
4. **Access Control**: Limit access to test Stripe accounts
