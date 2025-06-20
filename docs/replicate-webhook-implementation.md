# Replicate Webhook Implementation Plan

## Overview
Replace the current polling-based approach with Replicate webhooks for real-time, efficient prediction status updates.

## Current Issues with Polling
1. **RestorationWorker not starting** - Missing imports, broken functions
2. **Inefficient** - Polls every 30 seconds regardless of activity  
3. **Unreliable** - Jobs get stuck when worker fails
4. **High API usage** - Constant requests to Replicate API

## Webhook Benefits
1. **Real-time** - Immediate notification when predictions complete
2. **Efficient** - Only called when status changes
3. **Reliable** - Replicate handles retries automatically
4. **Simple** - No worker management needed

## Implementation Steps

### 1. Update Prediction Creation (lib/restoration/trigger.ts)

```typescript
// Add webhook URL when creating predictions
const prediction = await replicate.predictions.create({
  model: process.env.REPLICATE_MODEL || 'flux-kontext-apps/restore-image',
  input: {
    input_image: job.input_parameters.input_image,
    seed: job.input_parameters.seed || Math.floor(Math.random() * 1000000),
    output_format: process.env.REPLICATE_OUTPUT_FORMAT || 'png',
    safety_tolerance: parseInt(process.env.REPLICATE_SAFETY_TOLERANCE || '0')
  },
  // Add webhook configuration
  webhook: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/replicate`,
  webhook_events_filter: ["start", "output", "logs", "completed"]
});
```

### 2. Create Webhook Endpoint (app/api/webhooks/replicate/route.ts)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getRestorationJobByExternalId, updateRestorationJobStatus } from '@/lib/db/restoration-jobs';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, output, error } = body;
    
    logger.info({ predictionId: id, status }, 'Received Replicate webhook');

    // Find the restoration job by external ID
    const job = await getRestorationJobByExternalId(id);
    if (!job) {
      logger.warn({ predictionId: id }, 'No restoration job found for prediction');
      return NextResponse.json({ success: true }); // Return success to avoid retries
    }

    // Update job based on status
    switch (status) {
      case 'succeeded':
        await handleJobSuccess(job, body);
        break;
      case 'failed':
      case 'canceled':
        await handleJobFailure(job, body);
        break;
      default:
        // Update metadata for intermediate statuses
        await updateRestorationJobStatus(job.id, {
          metadata: {
            ...job.metadata,
            replicate_status: status,
            last_webhook_received: new Date().toISOString()
          }
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Error processing Replicate webhook');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleJobSuccess(job: any, prediction: any) {
  // Store the restored image and update job status
  // Implementation similar to current webhook endpoint
}

async function handleJobFailure(job: any, prediction: any) {
  // Mark job as failed with error details
}
```

### 3. Environment Variables

Add to Doppler:
```
REPLICATE_WEBHOOK_SECRET=your_webhook_secret_here
```

### 4. Remove Polling Worker

Once webhooks are working:
1. Remove RestorationWorker polling logic
2. Keep only email worker in WorkerManager
3. Remove polling-related API endpoints

## Migration Plan

### Phase 1: Implement Webhooks (Immediate)
1. ✅ Create webhook endpoint
2. ✅ Update prediction creation to include webhook URL
3. ✅ Test with new orders

### Phase 2: Fix Current Stuck Job (Immediate)
1. ✅ Manual fix for order 20250620-000012 (already done)
2. ✅ Verify webhook works for new orders

### Phase 3: Remove Polling (After webhook validation)
1. Remove RestorationWorker polling logic
2. Clean up unused functions
3. Update documentation

## Testing

### Local Testing
```bash
# Use ngrok to expose local webhook endpoint
ngrok http 3001

# Update NEXT_PUBLIC_APP_URL to ngrok URL for testing
# Create test order and verify webhook is called
```

### Production Testing
```bash
# Webhooks will work automatically with production URL
# Monitor logs for webhook calls and job completions
```

## Webhook Security

1. **Verify webhook signatures** using REPLICATE_WEBHOOK_SECRET
2. **Validate payload structure** before processing
3. **Rate limiting** to prevent abuse
4. **Idempotency** to handle duplicate webhooks

## Monitoring

1. **Log all webhook calls** with prediction ID and status
2. **Alert on webhook failures** or missing jobs
3. **Track webhook latency** and success rates
4. **Dashboard for webhook health** and job completion rates
