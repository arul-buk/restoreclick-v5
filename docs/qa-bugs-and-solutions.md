# QA Testing: Identified Bugs and Recommended Solutions

## Overview
This document provides a comprehensive list of all bugs and issues identified during QA testing of the RestoreClickV4 application. Each issue is documented with its root cause and the most suitable solution approach.

## Critical Production Blockers (Priority 1)

### Bug #1: Upload Route Content-Type Handling in E2E Tests
**Status**: 🔴 Failing  
**Location**: `/app/api/upload-temporary-images/route.ts`  
**Current Behavior**: E2E test expects 200 response but receives 500 error  
**Root Cause**: NextRequest in test environment doesn't properly handle FormData passed as body

**Most Suitable Solution**:
1. Modify the E2E test to properly mock the NextRequest with FormData:
   ```typescript
   // Instead of passing FormData as body directly
   const uploadRequest = new NextRequest(url, {
     method: 'POST',
     body: uploadFormData,
   });
   
   // Create a proper mock that implements formData() method
   const uploadRequest = {
     formData: async () => uploadFormData,
     headers: new Headers({ 'content-type': 'multipart/form-data' }),
   } as unknown as NextRequest;
   ```

2. Alternative: Use a test utility to create proper NextRequest instances with FormData support

### Bug #2: Payment Webhook Event Type Undefined
**Status**: 🔴 Failing  
**Location**: `/app/api/webhooks/stripe/route.ts`  
**Current Behavior**: `event.type` is undefined causing 500 error  
**Root Cause**: The webhook handler uses `buffer()` and `stripe.webhooks.constructEvent()` but the mock doesn't properly simulate this flow

**Most Suitable Solution**:
1. In E2E tests, properly mock the Stripe webhook signature verification:
   ```typescript
   // Mock stripe.webhooks.constructEvent to return the event object
   vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(mockStripeEvent);
   ```

2. Ensure the mock request includes proper headers:
   ```typescript
   headers: {
     'stripe-signature': 'test_signature',
     'content-type': 'application/json'
   }
   ```

3. For real integration testing, use Stripe CLI with ngrok as already documented

## Type and Schema Mismatches (Priority 2)

### Bug #3: UploadResult Type Missing Required Fields
**Status**: 🟡 Type Error  
**Impact**: Tests fail to compile or have runtime errors

**Most Suitable Solution**:
1. Define a proper UploadResult interface that matches the actual storage service response:
   ```typescript
   interface UploadResult {
     id: string;
     sessionId: string;
     storagePath: string;
     publicUrl: string;
     fileSize: number;
   }
   ```

2. Update all mock data in tests to include all required fields

### Bug #4: Restoration Job Metadata Type Mismatch
**Status**: 🟡 Type Error  
**Location**: Webhook handler and restoration job creation  
**Issue**: Metadata structure doesn't match database schema

**Most Suitable Solution**:
1. Define a proper metadata type for restoration jobs:
   ```typescript
   interface RestorationJobMetadata {
     order_id: string;
     original_path: string;
     moved_from_session: string;
   }
   ```

2. Ensure database schema accepts this metadata structure as JSONB

### Bug #5: Storage Service Method Name Inconsistency
**Status**: 🟡 Type Error  
**Location**: `/app/api/orders/[id]/predictions/route.ts`  
**Issue**: Code calls `saveRestoredImage` but method is `saveRestored`

**Most Suitable Solution**:
1. Update the code to use the correct method name:
   ```typescript
   // Change from:
   storageService.saveRestoredImage(...)
   // To:
   storageService.saveRestored(...)
   ```

## Code Quality Issues (Priority 3)

### Bug #6: Spread Operator Misuse in Typed Objects
**Status**: 🟡 Type Error  
**Location**: `/app/api/orders/[id]/predictions/route.ts` line 96  
**Issue**: Using spread operator on non-object types

**Most Suitable Solution**:
1. Check the type before spreading:
   ```typescript
   const metadata = typeof job.metadata === 'object' && job.metadata !== null
     ? { ...job.metadata }
     : {};
   ```

### Bug #7: JSON Property Access Without Type Guards
**Status**: 🟡 Runtime Error Risk  
**Location**: `/app/api/orders/[id]/predictions/route.ts` lines 170-171  
**Issue**: Accessing properties on JSON columns without type checking

**Most Suitable Solution**:
1. Add type guards for JSON data:
   ```typescript
   interface OutputData {
     original_image_url?: string;
     restored_image_url?: string;
   }
   
   const outputData = job.output_data as OutputData | null;
   const originalUrl = outputData?.original_image_url || '';
   const restoredUrl = outputData?.restored_image_url || '';
   ```

## Environment and Configuration Issues (Priority 4)

### Bug #8: Environment Variables Not Loaded in All Tests
**Status**: 🟡 Configuration Issue  
**Impact**: Some tests fail due to missing environment variables

**Most Suitable Solution**:
1. Ensure all tests use the Vitest config that loads environment variables:
   ```typescript
   // vitest.config.ts
   export default defineConfig({
     test: {
       env: {
         NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
         // ... other required env vars
       }
     }
   });
   ```

2. Create a test setup file that validates all required env vars are present

### Bug #9: Stripe CLI/Ngrok Integration Not Implemented
**Status**: 🟡 Missing Integration  
**Impact**: Webhook tests rely on mocks instead of real integration

**Most Suitable Solution**:
1. The solution is already documented in `/docs/stripe-webhook-testing.md`
2. Create automated scripts to:
   - Check if Stripe CLI is installed
   - Check if ngrok is running
   - Automatically start required services for integration tests
   - Skip integration tests if services aren't available

## Testing Principle Violations (Priority 5)

### Bug #10: Tests Modified to Pass Instead of Fixing Code
**Status**: 🔴 Critical Testing Anti-Pattern  
**Impact**: Tests no longer serve as specification

**Most Suitable Solution**:
1. Restore all original test expectations:
   - E2E upload test should expect 200, not 500
   - Payment webhook test should expect successful processing
   - All type assertions should match intended behavior

2. Create a test restoration script that:
   - Identifies all weakened assertions
   - Restores original expectations
   - Documents why each test was restored

## Implementation Recommendations

### Phase 1: Immediate Actions
1. Fix critical E2E test failures (Bugs #1 and #2)
2. Restore all test expectations to original requirements (Bug #10)

### Phase 2: Type Safety
1. Fix all type mismatches (Bugs #3-5)
2. Add proper type guards (Bugs #6-7)

### Phase 3: Infrastructure
1. Ensure proper environment setup (Bug #8)
2. Implement real integration testing (Bug #9)

### Testing Strategy
- **Unit Tests**: Keep mocked for speed and reliability
- **Integration Tests**: Use real services (Stripe CLI, Supabase)
- **E2E Tests**: Test complete user journeys with minimal mocking

## Success Criteria
- All tests pass without modifying test expectations
- 100% type safety with no TypeScript errors
- Real webhook integration tests using Stripe CLI
- Complete user journey works end-to-end

## Next Steps
1. Get approval on solution approaches
2. Implement fixes in priority order
3. Run full test suite after each fix
4. Document any new issues discovered
5. Achieve 100% test coverage with all tests passing
