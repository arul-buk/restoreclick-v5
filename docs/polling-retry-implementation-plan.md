# Polling and Retry Implementation Plan for RestoreClick

## Overview
This document outlines the implementation plan for robust polling, automatic retry logic, and improved error handling in the RestoreClick application. The plan addresses issues with delayed Replicate responses, database update failures, and user experience during photo processing.

## Current Issues
1. Predictions can get stuck in "starting" status in the database even when Replicate has completed processing
2. No automatic retry mechanism for failed database updates
3. Users have no clear indication of processing status or timeouts
4. No alerting mechanism for failed transactions

## Implementation Plan

### 1. Automatic Retry Logic for Database Updates

#### Location: `/app/api/replicate/predictions/[id]/route.ts`

**Implementation Steps:**
1. Add retry wrapper function for database operations
2. Implement exponential backoff strategy
3. Add logging for retry attempts
4. Set maximum retry attempts (3-5 attempts)

**Code Structure:**
```typescript
// Add retry utility function
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}

// Wrap database updates with retry logic
await retryWithBackoff(async () => {
  const { error } = await supabaseAdmin
    .from('predictions')
    .update({
      status: 'succeeded',
      output_image_url: finalRestoredImageUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('replicate_id', prediction.id);
    
  if (error) throw error;
});
```

### 2. Enhanced Polling Mechanism

#### Location: `/lib/restoration-data.ts`

**Implementation Steps:**
1. Add polling configuration with timeout management
2. Implement per-image timeout tracking (2 minutes)
3. Add progress tracking for multiple images
4. Return detailed status information

**New Interface:**
```typescript
interface PollingConfig {
  interval: number; // milliseconds between polls
  maxDuration: number; // maximum time to poll (2 minutes per image)
  onProgress?: (status: PollingStatus) => void;
}

interface PollingStatus {
  totalImages: number;
  completedImages: number;
  failedImages: number;
  currentImage: number;
  elapsedTime: number;
  estimatedTimeRemaining: number;
  timedOutImages: string[];
}
```

### 3. UI Processing State Implementation

#### Location: `/app/payment-success/page.tsx`

**Implementation Steps:**
1. Add processing state component
2. Implement countdown timer (2 minutes per image)
3. Show progress indicators
4. Add "Don't leave this page" messaging
5. Handle timeout scenarios with retry options

**New Components:**

#### A. ProcessingOverlay Component
```typescript
interface ProcessingOverlayProps {
  totalImages: number;
  currentImage: number;
  elapsedTime: number;
  maxTime: number;
  onCancel?: () => void;
}

const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({
  totalImages,
  currentImage,
  elapsedTime,
  maxTime,
  onCancel
}) => {
  const timeRemaining = maxTime - elapsedTime;
  const progress = (elapsedTime / maxTime) * 100;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Processing Your Photos</h2>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-2">
            Please don't leave this page while we restore your photos.
          </p>
          <p className="text-sm text-gray-500">
            Processing image {currentImage} of {totalImages}
          </p>
        </div>
        
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        
        <div className="flex justify-between text-sm text-gray-600 mb-6">
          <span>Time elapsed: {formatTime(elapsedTime)}</span>
          <span>Time remaining: {formatTime(timeRemaining)}</span>
        </div>
        
        {timeRemaining <= 30000 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
            <p className="text-sm text-yellow-800">
              Processing is taking longer than expected. Please continue waiting...
            </p>
          </div>
        )}
        
        <button
          onClick={onCancel}
          className="w-full py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Cancel Processing
        </button>
      </div>
    </div>
  );
};
```

#### B. Error State Component
```typescript
interface ProcessingErrorProps {
  failedImages: string[];
  onRetry: () => void;
  onContinue: () => void;
}

const ProcessingError: React.FC<ProcessingErrorProps> = ({
  failedImages,
  onRetry,
  onContinue
}) => {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-red-800 mb-2">
        Some photos couldn't be processed
      </h3>
      <p className="text-red-700 mb-4">
        {failedImages.length} photo(s) failed to process within the time limit.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry Failed Photos
        </button>
        <button
          onClick={onContinue}
          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
        >
          Continue Without Them
        </button>
      </div>
    </div>
  );
};
```

### 4. Enhanced Polling Logic

#### Location: Update `/app/payment-success/page.tsx`

**Implementation:**
```typescript
const POLL_INTERVAL = 2000; // 2 seconds
const MAX_POLL_DURATION = 120000; // 2 minutes per image

const pollPredictions = async (batchId: string) => {
  const startTime = Date.now();
  const timeouts = new Map<string, number>(); // Track timeout per prediction
  
  const pollInterval = setInterval(async () => {
    try {
      const predictions = await fetch(`/api/predictions/by-batch/${batchId}`).then(r => r.json());
      
      let allCompleted = true;
      let hasFailures = false;
      const timedOut: string[] = [];
      
      for (const prediction of predictions) {
        // Initialize timeout tracking
        if (!timeouts.has(prediction.id)) {
          timeouts.set(prediction.id, Date.now());
        }
        
        const predictionStartTime = timeouts.get(prediction.id)!;
        const elapsedTime = Date.now() - predictionStartTime;
        
        // Check if prediction has timed out
        if (elapsedTime > MAX_POLL_DURATION && prediction.status === 'starting') {
          timedOut.push(prediction.id);
          hasFailures = true;
          continue;
        }
        
        // Check if still processing
        if (prediction.status === 'starting' || prediction.status === 'processing') {
          allCompleted = false;
        } else if (prediction.status === 'failed') {
          hasFailures = true;
        }
      }
      
      // Update UI with progress
      setPollingStatus({
        totalImages: predictions.length,
        completedImages: predictions.filter(p => p.status === 'succeeded').length,
        failedImages: predictions.filter(p => p.status === 'failed').length,
        timedOutImages: timedOut,
        elapsedTime: Date.now() - startTime
      });
      
      // Stop polling if all completed or timed out
      if (allCompleted || timedOut.length === predictions.length) {
        clearInterval(pollInterval);
        setIsPolling(false);
        
        if (hasFailures || timedOut.length > 0) {
          setShowError(true);
        }
      }
    } catch (error) {
      console.error('Polling error:', error);
      clearInterval(pollInterval);
      setIsPolling(false);
      setShowError(true);
    }
  }, POLL_INTERVAL);
  
  return () => clearInterval(pollInterval);
};
```

### 5. Future Feature: Alert Mechanism

#### Document for Future Implementation: `/docs/alert-monitoring-spec.md`

```markdown
# Alert and Monitoring Specification

## Overview
Implement alerting for failed or stuck predictions to ensure timely intervention.

## Alert Triggers
1. Prediction stuck in "starting" status > 5 minutes
2. Database update failures after max retries
3. Stripe webhook processing failures
4. Email sending failures

## Implementation Options
1. **Supabase Edge Functions** - Monitor database for stuck predictions
2. **Third-party Services** - Integrate with services like:
   - Sentry for error tracking
   - PagerDuty for critical alerts
   - Slack webhooks for team notifications

## Alert Payload
```json
{
  "type": "stuck_prediction",
  "prediction_id": "xxx",
  "order_id": "xxx",
  "customer_email": "xxx",
  "stuck_duration": 300000,
  "created_at": "2025-06-19T12:00:00Z"
}
```

## Recommended Implementation
1. Create Supabase Edge Function to run every 5 minutes
2. Query predictions with status='starting' and created_at > 5 minutes ago
3. Send alerts via webhook to monitoring service
4. Log alert history for analysis
```

## Implementation Priority

1. **Phase 1 (Immediate):**
   - Implement retry logic for database updates
   - Add processing overlay with timeout handling
   - Enhance polling mechanism with per-image timeouts

2. **Phase 2 (Next Sprint):**
   - Add comprehensive error handling UI
   - Implement retry functionality for failed images
   - Add progress tracking for multiple images

3. **Phase 3 (Future):**
   - Implement alert mechanism
   - Add monitoring dashboard
   - Create admin tools for manual intervention

## Testing Strategy

1. **Unit Tests:**
   - Test retry logic with simulated failures
   - Test timeout calculations
   - Test progress tracking

2. **Integration Tests:**
   - Test full polling flow with delays
   - Test error scenarios
   - Test UI state transitions

3. **Manual Testing:**
   - Test with slow Replicate responses
   - Test with network interruptions
   - Test with multiple images

## Success Metrics

1. Reduce "stuck prediction" incidents by 90%
2. Provide clear user feedback within 5 seconds of any state change
3. Successfully retry and recover from 95% of transient failures
4. Alert on critical failures within 5 minutes

## Notes for AI Implementation

When implementing this plan:
1. Start with the retry logic as it's the foundation
2. Test each component in isolation before integration
3. Use the existing logger for all retry attempts and failures
4. Maintain backward compatibility with current API contracts
5. Update CHANGELOG.md with all changes
6. Consider adding feature flags for gradual rollout
