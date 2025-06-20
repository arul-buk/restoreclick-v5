# RestoreClick Database & Data Flow Redesign Proposal

## Executive Summary

This document proposes a complete redesign of the RestoreClick database schema and data flow architecture. The new design prioritizes:
- Data consistency and integrity
- Scalability for high-volume operations
- Clear separation of concerns
- Audit trails and debugging capabilities
- Future extensibility

## Current System Issues

1. **Data Inconsistency**: Images stored in wrong locations, URLs pointing to temporary storage
2. **Poor State Management**: No clear workflow states, missing transition tracking
3. **Lack of Audit Trail**: No history of changes, difficult debugging
4. **Tight Coupling**: Business logic mixed with storage logic
5. **Missing Abstractions**: Direct dependency on external services without abstraction layer

## Proposed Database Schema

### Core Tables

#### 1. customers
```sql
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

#### 2. orders
```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(20) UNIQUE NOT NULL, -- Format: YYYYMMDD-NNNNNN
    customer_id UUID REFERENCES customers(id),
    status VARCHAR(50) NOT NULL DEFAULT 'pending_payment',
    -- Status: pending_payment, processing, completed, failed, refunded
    
    -- Payment Information
    payment_method VARCHAR(50),
    payment_status VARCHAR(50) DEFAULT 'pending',
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    stripe_checkout_session_id VARCHAR(255) UNIQUE,
    
    -- Pricing
    currency VARCHAR(3) DEFAULT 'USD',
    subtotal DECIMAL(10,2),
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    CONSTRAINT chk_order_status CHECK (status IN ('pending_payment', 'processing', 'completed', 'failed', 'refunded'))
);

CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_order_number ON orders(order_number);
```

#### 3. images
```sql
CREATE TABLE images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'original' or 'restored'
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- Status: pending, uploaded, processing, completed, failed
    
    -- Storage Information
    storage_bucket VARCHAR(100) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    public_url TEXT,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    
    -- Image Metadata
    width INTEGER,
    height INTEGER,
    format VARCHAR(20),
    
    -- Processing Information
    parent_image_id UUID REFERENCES images(id), -- For restored images
    processing_started_at TIMESTAMP WITH TIME ZONE,
    processing_completed_at TIMESTAMP WITH TIME ZONE,
    processing_duration_ms INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    CONSTRAINT chk_image_type CHECK (type IN ('original', 'restored')),
    CONSTRAINT chk_image_status CHECK (status IN ('pending', 'uploaded', 'processing', 'completed', 'failed'))
);

CREATE INDEX idx_images_order_id ON images(order_id);
CREATE INDEX idx_images_type ON images(type);
CREATE INDEX idx_images_status ON images(status);
CREATE INDEX idx_images_parent_image_id ON images(parent_image_id);
```

#### 4. restoration_jobs
```sql
CREATE TABLE restoration_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_image_id UUID REFERENCES images(id) ON DELETE CASCADE,
    restored_image_id UUID REFERENCES images(id),
    
    -- External Service Information
    external_provider VARCHAR(50) NOT NULL DEFAULT 'replicate',
    external_job_id VARCHAR(255) UNIQUE,
    external_status VARCHAR(50),
    
    -- Job Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- Status: pending, queued, processing, completed, failed, cancelled
    
    -- Attempt Tracking
    attempt_number INTEGER DEFAULT 1,
    max_attempts INTEGER DEFAULT 3,
    
    -- Error Handling
    error_message TEXT,
    error_code VARCHAR(50),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    queued_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    input_parameters JSONB DEFAULT '{}'::jsonb,
    output_data JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    CONSTRAINT chk_job_status CHECK (status IN ('pending', 'queued', 'processing', 'completed', 'failed', 'cancelled'))
);

CREATE INDEX idx_restoration_jobs_original_image_id ON restoration_jobs(original_image_id);
CREATE INDEX idx_restoration_jobs_status ON restoration_jobs(status);
CREATE INDEX idx_restoration_jobs_external_job_id ON restoration_jobs(external_job_id);
```

#### 5. email_queue
```sql
CREATE TABLE email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    email_type VARCHAR(50) NOT NULL,
    -- Types: order_confirmation, restoration_complete, share_family
    
    -- Recipient Information
    to_email VARCHAR(255) NOT NULL,
    to_name VARCHAR(255),
    cc_emails TEXT[], -- Array of CC emails
    
    -- Email Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- Status: pending, sending, sent, failed, bounced
    
    -- SendGrid Information
    sendgrid_template_id VARCHAR(255),
    sendgrid_message_id VARCHAR(255),
    
    -- Content
    subject VARCHAR(500),
    dynamic_data JSONB DEFAULT '{}'::jsonb,
    attachments JSONB DEFAULT '[]'::jsonb,
    
    -- Attempt Tracking
    attempt_number INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    -- Error Handling
    error_message TEXT,
    error_code VARCHAR(50),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    CONSTRAINT chk_email_status CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'bounced'))
);

CREATE INDEX idx_email_queue_order_id ON email_queue(order_id);
CREATE INDEX idx_email_queue_status ON email_queue(status);
CREATE INDEX idx_email_queue_scheduled_for ON email_queue(scheduled_for);
CREATE INDEX idx_email_queue_email_type ON email_queue(email_type);
```

#### 6. audit_logs
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL, -- 'order', 'image', 'restoration_job', etc.
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'deleted', 'status_changed'
    
    -- Change Information
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    
    -- Context
    performed_by VARCHAR(255), -- System, webhook, user email, etc.
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

### Supporting Tables

#### 7. file_uploads
```sql
CREATE TABLE file_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upload_session_id VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    
    -- File Information
    original_filename VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    
    -- Upload Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- Status: pending, uploaded, moved_to_permanent, expired, deleted
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    CONSTRAINT chk_upload_status CHECK (status IN ('pending', 'uploaded', 'moved_to_permanent', 'expired', 'deleted'))
);

CREATE INDEX idx_file_uploads_session_id ON file_uploads(upload_session_id);
CREATE INDEX idx_file_uploads_expires_at ON file_uploads(expires_at);
CREATE INDEX idx_file_uploads_status ON file_uploads(status);
```

#### 8. download_links
```sql
CREATE TABLE download_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    
    -- Link Configuration
    link_type VARCHAR(50) NOT NULL, -- 'single_image', 'zip_all', 'share'
    target_images UUID[], -- Array of image IDs
    
    -- Access Control
    max_downloads INTEGER DEFAULT 10,
    download_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_download_links_token ON download_links(token);
CREATE INDEX idx_download_links_order_id ON download_links(order_id);
CREATE INDEX idx_download_links_expires_at ON download_links(expires_at);
```

## Data Flow Architecture

### 1. Image Upload Flow
```
User Upload → Temporary Storage → Payment → Permanent Storage → Database Record

1. User selects images
2. Frontend uploads to /api/upload
3. API stores in 'uploads/temp/{session_id}/'
4. Creates file_uploads records (status: 'uploaded')
5. Returns upload session ID to frontend
```

### 2. Payment & Order Creation Flow
```
Checkout → Stripe → Webhook → Order Creation → Image Processing

1. Frontend creates Stripe checkout with session_id
2. User completes payment
3. Stripe webhook received
4. Create customer record (if new)
5. Create order record
6. Move images from temp to 'uploads/originals/{order_id}/'
7. Create image records (type: 'original', status: 'uploaded')
8. Update file_uploads (status: 'moved_to_permanent')
9. Queue restoration jobs
10. Send order confirmation email
```

### 3. Image Restoration Flow
```
Queue → External API → Storage → Notification

1. Create restoration_job for each original image
2. Worker picks up pending jobs
3. Call Replicate API with original image URL
4. Poll for completion
5. Download restored image
6. Store in 'uploads/restored/{order_id}/'
7. Create image record (type: 'restored', status: 'completed')
8. Update restoration_job (status: 'completed')
9. Check if all jobs complete
10. Send restoration complete email
```

### 4. Email Flow
```
Event → Queue → Worker → SendGrid → Delivery

1. Event triggers email (order created, restoration complete, etc.)
2. Create email_queue record with template and data
3. Worker picks up pending emails
4. Prepare attachments from image records
5. Call SendGrid API
6. Update email_queue with result
7. Handle failures with exponential backoff
```

### 5. Download Flow
```
Request → Token Validation → File Assembly → Delivery

1. User requests download
2. Create download_link with token
3. User accesses /download/{token}
4. Validate token and expiry
5. Assembly files (single or ZIP)
6. Stream to user
7. Update download_count
```

## Key Design Principles

### 1. State Management
- Every entity has clear state transitions
- States are enforced at database level
- Audit trail for all state changes

### 2. Idempotency
- Unique constraints prevent duplicate processing
- External IDs tracked to prevent double-submission
- Webhook deduplication built-in

### 3. Error Recovery
- Retry logic with exponential backoff
- Dead letter queues for failed operations
- Clear error tracking and reporting

### 4. Scalability
- Queue-based processing for async operations
- Horizontal scaling for workers
- Efficient indexing for common queries

### 5. Data Integrity
- Foreign key constraints
- Check constraints for valid states
- Transactional consistency

## Migration Strategy

### Phase 1: Schema Creation
1. Create new schema alongside existing
2. Set up triggers for audit logging
3. Create views for backward compatibility

### Phase 2: Data Migration
1. Migrate customers from orders
2. Split predictions into images and restoration_jobs
3. Normalize storage paths
4. Backfill audit logs

### Phase 3: Code Migration
1. Update APIs to use new schema
2. Implement queue workers
3. Update email system
4. Migrate storage logic

### Phase 4: Cleanup
1. Remove old tables
2. Archive legacy data
3. Update documentation

## Benefits of New Design

1. **Clear Data Model**: Each entity has single responsibility
2. **Audit Trail**: Complete history of all changes
3. **Scalability**: Queue-based processing, efficient queries
4. **Reliability**: Retry logic, error tracking, idempotency
5. **Flexibility**: JSONB metadata fields for extensibility
6. **Security**: Proper access control, token-based downloads
7. **Maintainability**: Clear separation of concerns

## Next Steps

1. Review and approve design
2. Create detailed API specifications
3. Plan migration timeline
4. Set up development environment
5. Begin phased implementation
