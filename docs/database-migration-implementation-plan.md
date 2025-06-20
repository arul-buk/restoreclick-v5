# RestoreClick Database Migration Implementation Plan

## Executive Summary

This document provides a detailed, step-by-step implementation plan for migrating RestoreClick to the new database architecture. Since we're starting with a clean slate (no data migration required), we can focus on building the new system correctly from the ground up.

## Current System Analysis

### Existing Database Tables
- `orders` - Basic order tracking with Stripe integration
- `predictions` - Image restoration jobs linked to orders
- `profiles` - User profiles (Clerk-based, now removed)
- `photos` - Photo storage tracking
- `referrals` - Referral system
- `points_transactions` - Points/rewards system

### Reusable Components

#### 1. API Routes (Partial Reuse)
- `/api/upload-temporary-images` - Can be adapted for new upload flow
- `/api/webhooks/stripe` - Core logic reusable, needs refactoring
- `/api/send-photo-links` - Email logic can be extracted
- `/api/generate-zip` - ZIP generation logic reusable
- `/api/orders/[id]` - Query structure can be adapted

#### 2. Utility Libraries (Full Reuse)
- `/lib/supabaseAdmin.ts` - Database client
- `/lib/stripe.ts` - Stripe integration
- `/lib/sendgrid.ts` - Email service
- `/lib/logger.ts` - Logging utility
- `/lib/supabase-utils.ts` - Storage utilities

#### 3. Frontend Components (Full Reuse)
- Payment success page components
- Upload components
- UI components

### Components Requiring Major Changes
1. **Database Types** - Complete regeneration needed
2. **Webhook Handlers** - Significant refactoring for new flow
3. **Order Processing** - New state management
4. **Email Queue** - New implementation needed
5. **Background Workers** - New implementation needed

## Implementation Phases

### Phase 1: Database Schema Setup (2-3 days)

#### Step 1.1: Create Migration Files
Create SQL migration files in `/supabase/migrations/`:

```
001_create_customers_table.sql
002_create_orders_table.sql
003_create_images_table.sql
004_create_restoration_jobs_table.sql
005_create_email_queue_table.sql
006_create_audit_logs_table.sql
007_create_file_uploads_table.sql
008_create_download_links_table.sql
009_create_indexes.sql
010_create_triggers.sql
```

#### Step 1.2: Apply Migrations
```bash
# Run migrations
supabase db push
```

#### Step 1.3: Generate TypeScript Types
```bash
# Generate new types
supabase gen types typescript --local > lib/database.types.ts
```

#### Step 1.4: Create Database Utilities
Create `/lib/db/`:
- `customers.ts` - Customer CRUD operations
- `orders.ts` - Order management
- `images.ts` - Image tracking
- `jobs.ts` - Restoration job management
- `email-queue.ts` - Email queue operations
- `audit.ts` - Audit logging

### Phase 2: Storage Layer Refactoring (1-2 days)

#### Step 2.1: Update Storage Structure
Create new storage buckets:
```
photos/
├── uploads/
│   ├── temp/
│   ├── originals/
│   └── restored/
└── downloads/
```

#### Step 2.2: Create Storage Service
Create `/lib/storage/storage-service.ts`:
```typescript
export class StorageService {
  async uploadTemp(sessionId: string, file: File): Promise<string>
  async moveToOriginals(sessionId: string, orderId: string): Promise<void>
  async saveRestored(orderId: string, imageData: Buffer): Promise<string>
  async createZip(orderId: string, imageIds: string[]): Promise<string>
  async cleanupTemp(olderThan: Date): Promise<void>
}
```

### Phase 3: API Routes Refactoring (3-4 days)

#### Step 3.1: Upload API
Update `/api/upload-temporary-images/route.ts`:
- Create `file_uploads` records
- Use new storage paths
- Return session info

#### Step 3.2: Checkout API
Update `/api/create-checkout-session/route.ts`:
- Pass session_id in metadata
- Include email in session

#### Step 3.3: Webhook Handler
Refactor `/api/webhooks/stripe/route.ts`:
```typescript
// New flow:
1. Verify webhook signature
2. Check idempotency (payment_intent_id)
3. Create/get customer by email
4. Create order with new schema
5. Move images from temp to originals
6. Create image records
7. Queue restoration jobs
8. Queue confirmation email
```

#### Step 3.4: New API Endpoints
Create new endpoints:
- `/api/restoration/status/[orderId]` - Check restoration progress
- `/api/download/[token]` - Token-based downloads
- `/api/email/resend/[orderId]` - Resend emails

### Phase 4: Background Workers (2-3 days)

#### Step 4.1: Worker Infrastructure
Create `/workers/`:
```
workers/
├── base-worker.ts      # Base class for all workers
├── restoration-worker.ts
├── email-worker.ts
└── cleanup-worker.ts
```

#### Step 4.2: Restoration Worker
```typescript
export class RestorationWorker extends BaseWorker {
  async processJob(job: RestorationJob): Promise<void> {
    // 1. Call Replicate API
    // 2. Poll for completion
    // 3. Download result
    // 4. Save to storage
    // 5. Update records
    // 6. Handle errors with retry
  }
}
```

#### Step 4.3: Email Worker
```typescript
export class EmailWorker extends BaseWorker {
  async processEmail(email: EmailQueueItem): Promise<void> {
    // 1. Gather attachments
    // 2. Build template data
    // 3. Send via SendGrid
    // 4. Update status
    // 5. Handle failures
  }
}
```

#### Step 4.4: Worker Deployment
Create `/app/api/workers/[worker]/route.ts`:
- Cron-triggered endpoints
- Or use Vercel Cron/Supabase Edge Functions

### Phase 5: Frontend Updates (2-3 days)

#### Step 5.1: Update Data Fetching
Update `/app/payment-success/page.tsx`:
- Use new order structure
- Fetch from new tables
- Handle new image URLs

#### Step 5.2: Update Types
Create `/types/database.ts`:
```typescript
export interface Order {
  id: string
  orderNumber: string
  status: OrderStatus
  // ... new schema
}

export interface Image {
  id: string
  orderId: string
  type: 'original' | 'restored'
  // ... new schema
}
```

### Phase 6: Testing & Deployment (2-3 days)

#### Step 6.1: Create Test Suite
Create `/tests/`:
- `upload.test.ts` - Upload flow
- `payment.test.ts` - Payment processing
- `restoration.test.ts` - Image restoration
- `email.test.ts` - Email delivery

#### Step 6.2: End-to-End Testing
Test complete flows:
1. Upload → Payment → Restoration → Email
2. Error scenarios
3. Retry mechanisms
4. Cleanup processes

## Detailed Implementation Steps

### Step-by-Step Code Changes

#### 1. Database Migration Files

**File: `/supabase/migrations/001_create_customers_table.sql`**
```sql
-- Copy exact schema from database-redesign-proposal.md
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    phone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_customers_email ON customers(email);
```

#### 2. Update Stripe Webhook

**File: `/app/api/webhooks/stripe/route.ts`**
Key changes:
```typescript
// BEFORE: Direct order creation
const { data: newOrder } = await supabaseAdmin
  .from('orders')
  .insert({...})

// AFTER: Multi-step process
// 1. Get/create customer
const customer = await getOrCreateCustomer(customerEmail);

// 2. Create order with new schema
const order = await createOrder({
  customerId: customer.id,
  orderNumber: generateOrderNumber(),
  // ... new fields
});

// 3. Move images with proper tracking
await moveImagesToOriginals(sessionId, order.id);

// 4. Queue jobs instead of direct processing
await queueRestorationJobs(order.id);
```

#### 3. Create Storage Service

**File: `/lib/storage/storage-service.ts`**
```typescript
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { v4 as uuidv4 } from 'uuid';

export class StorageService {
  private bucket = 'photos';

  async uploadTemp(sessionId: string, file: File): Promise<string> {
    const fileName = `${uuidv4()}_${file.name}`;
    const path = `uploads/temp/${sessionId}/${fileName}`;
    
    const { data, error } = await supabaseAdmin.storage
      .from(this.bucket)
      .upload(path, file);
      
    if (error) throw error;
    return path;
  }

  async moveToOriginals(sessionId: string, orderId: string): Promise<string[]> {
    // List temp files
    const { data: files } = await supabaseAdmin.storage
      .from(this.bucket)
      .list(`uploads/temp/${sessionId}`);
      
    const movedPaths = [];
    
    for (const file of files || []) {
      const oldPath = `uploads/temp/${sessionId}/${file.name}`;
      const newPath = `uploads/originals/${orderId}/${file.name}`;
      
      // Move file
      await supabaseAdmin.storage
        .from(this.bucket)
        .move(oldPath, newPath);
        
      movedPaths.push(newPath);
    }
    
    return movedPaths;
  }
}
```

#### 4. Create Order Service

**File: `/lib/db/orders.ts`**
```typescript
export async function generateOrderNumber(): Promise<string> {
  const date = new Date();
  const datePrefix = date.toISOString().slice(0, 10).replace(/-/g, '');
  
  // Get today's order count
  const { count } = await supabaseAdmin
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .like('order_number', `${datePrefix}-%`);
    
  const sequence = (count || 0) + 1;
  return `${datePrefix}-${sequence.toString().padStart(6, '0')}`;
}

export async function createOrder(data: CreateOrderInput): Promise<Order> {
  const orderNumber = await generateOrderNumber();
  
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .insert({
      order_number: orderNumber,
      customer_id: data.customerId,
      status: 'processing',
      payment_status: 'paid',
      stripe_payment_intent_id: data.paymentIntentId,
      total_amount: data.amount,
      currency: data.currency,
      paid_at: new Date().toISOString(),
    })
    .select()
    .single();
    
  if (error) throw error;
  
  // Create audit log
  await createAuditLog({
    entity_type: 'order',
    entity_id: order.id,
    action: 'created',
    new_values: order,
  });
  
  return order;
}
```

#### 5. Create Background Worker Base

**File: `/workers/base-worker.ts`**
```typescript
export abstract class BaseWorker<T> {
  protected abstract tableName: string;
  protected abstract processItem(item: T): Promise<void>;
  
  async run(): Promise<void> {
    // Get pending items
    const { data: items } = await supabaseAdmin
      .from(this.tableName)
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10);
      
    // Process in parallel with concurrency limit
    await Promise.all(
      items?.map(item => this.safeProcess(item)) || []
    );
  }
  
  private async safeProcess(item: T): Promise<void> {
    try {
      await this.processItem(item);
    } catch (error) {
      await this.handleError(item, error);
    }
  }
  
  protected async handleError(item: any, error: any): Promise<void> {
    // Update status and increment attempts
    await supabaseAdmin
      .from(this.tableName)
      .update({
        status: 'failed',
        error_message: error.message,
        attempt_number: item.attempt_number + 1,
      })
      .eq('id', item.id);
  }
}
```

## Environment Variables

Add to `.env.local`:
```
# Existing
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
REPLICATE_API_TOKEN=
SENDGRID_API_KEY=

# New
WORKER_SECRET_KEY=<generate-random-key>
CLEANUP_RETENTION_DAYS=7
MAX_RESTORATION_ATTEMPTS=3
EMAIL_RETRY_DELAY_MS=60000
```

## Testing Checklist

### Unit Tests
- [ ] Customer creation/lookup
- [ ] Order number generation
- [ ] Storage operations
- [ ] Email queue operations
- [ ] Audit logging

### Integration Tests
- [ ] Upload → Storage flow
- [ ] Payment → Order creation
- [ ] Image movement
- [ ] Restoration job processing
- [ ] Email delivery

### End-to-End Tests
- [ ] Complete user journey
- [ ] Error recovery
- [ ] Concurrent operations
- [ ] Cleanup processes

## Deployment Steps

1. **Development Environment**
   ```bash
   # Reset database
   supabase db reset
   
   # Run migrations
   supabase db push
   
   # Generate types
   supabase gen types typescript --local > lib/database.types.ts
   ```

2. **Staging Deployment**
   - Deploy to Vercel preview
   - Run integration tests
   - Monitor for 24 hours

3. **Production Deployment**
   - Schedule maintenance window
   - Deploy database changes
   - Deploy application
   - Monitor closely

## Monitoring & Alerts

### Key Metrics
- Queue depths (restoration, email)
- Processing times
- Error rates
- Storage usage

### Alert Conditions
- Queue backup > 100 items
- Processing time > 5 minutes
- Error rate > 5%
- Storage > 80% capacity

## Rollback Plan

If issues arise:
1. Revert application deployment
2. Keep new database (no data to migrate)
3. Fix issues in staging
4. Re-deploy when ready

## Success Criteria

- [ ] All uploads stored correctly
- [ ] Orders created with proper structure
- [ ] Images moved on payment
- [ ] Restorations complete successfully
- [ ] Emails delivered with attachments
- [ ] No data inconsistencies
- [ ] Performance within targets

## Timeline

Total estimated time: **12-16 days**

- Phase 1 (Database): 2-3 days
- Phase 2 (Storage): 1-2 days
- Phase 3 (APIs): 3-4 days
- Phase 4 (Workers): 2-3 days
- Phase 5 (Frontend): 2-3 days
- Phase 6 (Testing): 2-3 days

## Notes for Implementation

1. **Start with database** - Get schema right first
2. **Test storage early** - Critical path for system
3. **Build workers incrementally** - Start with restoration
4. **Keep old system running** - Until fully migrated
5. **Monitor everything** - Especially during transition
