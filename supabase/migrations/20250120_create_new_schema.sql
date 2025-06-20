-- RestoreClick Database Schema - Clean Slate Implementation
-- This migration creates the complete new database schema from scratch

-- Drop existing tables if they exist (clean slate)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS download_links CASCADE;
DROP TABLE IF EXISTS email_queue CASCADE;
DROP TABLE IF EXISTS restoration_jobs CASCADE;
DROP TABLE IF EXISTS images CASCADE;
DROP TABLE IF EXISTS file_uploads CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

-- Drop existing enums if they exist
DROP TYPE IF EXISTS order_status_enum CASCADE;
DROP TYPE IF EXISTS payment_status_enum CASCADE;
DROP TYPE IF EXISTS image_type_enum CASCADE;
DROP TYPE IF EXISTS image_status_enum CASCADE;
DROP TYPE IF EXISTS job_status_enum CASCADE;
DROP TYPE IF EXISTS email_status_enum CASCADE;
DROP TYPE IF EXISTS email_type_enum CASCADE;
DROP TYPE IF EXISTS upload_status_enum CASCADE;
DROP TYPE IF EXISTS download_link_type_enum CASCADE;

-- Create enums
CREATE TYPE order_status_enum AS ENUM (
    'pending_payment',
    'processing', 
    'completed',
    'failed',
    'refunded'
);

CREATE TYPE payment_status_enum AS ENUM (
    'pending',
    'paid',
    'failed',
    'refunded'
);

CREATE TYPE image_type_enum AS ENUM (
    'original',
    'restored'
);

CREATE TYPE image_status_enum AS ENUM (
    'pending',
    'uploaded',
    'processing',
    'completed',
    'failed'
);

CREATE TYPE job_status_enum AS ENUM (
    'pending',
    'queued',
    'processing',
    'completed',
    'failed',
    'cancelled'
);

CREATE TYPE email_status_enum AS ENUM (
    'pending',
    'sending',
    'sent',
    'failed',
    'bounced'
);

CREATE TYPE email_type_enum AS ENUM (
    'order_confirmation',
    'restoration_complete',
    'share_family'
);

CREATE TYPE upload_status_enum AS ENUM (
    'pending',
    'uploaded',
    'moved_to_permanent',
    'expired',
    'deleted'
);

CREATE TYPE download_link_type_enum AS ENUM (
    'single_image',
    'zip_all',
    'share'
);

-- 1. CUSTOMERS TABLE
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    phone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. ORDERS TABLE
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(20) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id),
    status order_status_enum NOT NULL DEFAULT 'pending_payment',
    
    -- Payment Information
    payment_method VARCHAR(50),
    payment_status payment_status_enum DEFAULT 'pending',
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
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 3. IMAGES TABLE
CREATE TABLE images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    type image_type_enum NOT NULL,
    status image_status_enum NOT NULL DEFAULT 'pending',
    
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
    parent_image_id UUID REFERENCES images(id),
    processing_started_at TIMESTAMP WITH TIME ZONE,
    processing_completed_at TIMESTAMP WITH TIME ZONE,
    processing_duration_ms INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 4. RESTORATION JOBS TABLE
CREATE TABLE restoration_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_image_id UUID REFERENCES images(id) ON DELETE CASCADE,
    restored_image_id UUID REFERENCES images(id),
    
    -- External Service Information
    external_provider VARCHAR(50) NOT NULL DEFAULT 'replicate',
    external_job_id VARCHAR(255) UNIQUE,
    external_status VARCHAR(50),
    
    -- Job Status
    status job_status_enum NOT NULL DEFAULT 'pending',
    
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
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 5. EMAIL QUEUE TABLE
CREATE TABLE email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    email_type email_type_enum NOT NULL,
    
    -- Recipient Information
    to_email VARCHAR(255) NOT NULL,
    to_name VARCHAR(255),
    cc_emails TEXT[],
    
    -- Email Status
    status email_status_enum NOT NULL DEFAULT 'pending',
    
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
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 6. AUDIT LOGS TABLE
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    
    -- Change Information
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    
    -- Context
    performed_by VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 7. FILE UPLOADS TABLE
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
    status upload_status_enum NOT NULL DEFAULT 'pending',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 8. DOWNLOAD LINKS TABLE
CREATE TABLE download_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    
    -- Link Configuration
    link_type download_link_type_enum NOT NULL,
    target_images UUID[],
    
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

-- CREATE INDEXES

-- Customers
CREATE INDEX idx_customers_email ON customers(email);

-- Orders
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_stripe_payment_intent_id ON orders(stripe_payment_intent_id);
CREATE INDEX idx_orders_stripe_checkout_session_id ON orders(stripe_checkout_session_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- Images
CREATE INDEX idx_images_order_id ON images(order_id);
CREATE INDEX idx_images_type ON images(type);
CREATE INDEX idx_images_status ON images(status);
CREATE INDEX idx_images_parent_image_id ON images(parent_image_id);
CREATE INDEX idx_images_storage_path ON images(storage_path);

-- Restoration Jobs
CREATE INDEX idx_restoration_jobs_original_image_id ON restoration_jobs(original_image_id);
CREATE INDEX idx_restoration_jobs_restored_image_id ON restoration_jobs(restored_image_id);
CREATE INDEX idx_restoration_jobs_status ON restoration_jobs(status);
CREATE INDEX idx_restoration_jobs_external_job_id ON restoration_jobs(external_job_id);
CREATE INDEX idx_restoration_jobs_created_at ON restoration_jobs(created_at);

-- Email Queue
CREATE INDEX idx_email_queue_order_id ON email_queue(order_id);
CREATE INDEX idx_email_queue_status ON email_queue(status);
CREATE INDEX idx_email_queue_scheduled_for ON email_queue(scheduled_for);
CREATE INDEX idx_email_queue_email_type ON email_queue(email_type);
CREATE INDEX idx_email_queue_to_email ON email_queue(to_email);

-- Audit Logs
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- File Uploads
CREATE INDEX idx_file_uploads_session_id ON file_uploads(upload_session_id);
CREATE INDEX idx_file_uploads_expires_at ON file_uploads(expires_at);
CREATE INDEX idx_file_uploads_status ON file_uploads(status);
CREATE INDEX idx_file_uploads_customer_email ON file_uploads(customer_email);

-- Download Links
CREATE INDEX idx_download_links_token ON download_links(token);
CREATE INDEX idx_download_links_order_id ON download_links(order_id);
CREATE INDEX idx_download_links_expires_at ON download_links(expires_at);

-- CREATE TRIGGERS FOR UPDATED_AT

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at
CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON customers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_images_updated_at 
    BEFORE UPDATE ON images 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_restoration_jobs_updated_at 
    BEFORE UPDATE ON restoration_jobs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_queue_updated_at 
    BEFORE UPDATE ON email_queue 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_file_uploads_updated_at 
    BEFORE UPDATE ON file_uploads 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- CREATE AUDIT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    changed_fields TEXT[];
BEGIN
    -- Handle different trigger operations
    IF TG_OP = 'DELETE' THEN
        old_data = to_jsonb(OLD);
        new_data = NULL;
        changed_fields = NULL;
    ELSIF TG_OP = 'INSERT' THEN
        old_data = NULL;
        new_data = to_jsonb(NEW);
        changed_fields = NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        old_data = to_jsonb(OLD);
        new_data = to_jsonb(NEW);
        
        -- Find changed fields
        SELECT array_agg(key) INTO changed_fields
        FROM jsonb_each(old_data) o
        WHERE o.value IS DISTINCT FROM (new_data->o.key);
    END IF;

    -- Insert audit log
    INSERT INTO audit_logs (
        entity_type,
        entity_id,
        action,
        old_values,
        new_values,
        changed_fields,
        performed_by
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        LOWER(TG_OP),
        old_data,
        new_data,
        changed_fields,
        'system'
    );

    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to main tables
CREATE TRIGGER audit_customers
    AFTER INSERT OR UPDATE OR DELETE ON customers
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_orders
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_images
    AFTER INSERT OR UPDATE OR DELETE ON images
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_restoration_jobs
    AFTER INSERT OR UPDATE OR DELETE ON restoration_jobs
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

-- CREATE UTILITY FUNCTIONS

-- Function to generate order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    date_prefix TEXT;
    sequence_num INTEGER;
    order_number TEXT;
BEGIN
    -- Get current date in YYYYMMDD format
    date_prefix := to_char(CURRENT_DATE, 'YYYYMMDD');
    
    -- Get next sequence number for today
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(order_number FROM LENGTH(date_prefix) + 2) AS INTEGER)
    ), 0) + 1
    INTO sequence_num
    FROM orders
    WHERE order_number LIKE date_prefix || '-%';
    
    -- Format as YYYYMMDD-NNNNNN
    order_number := date_prefix || '-' || LPAD(sequence_num::TEXT, 6, '0');
    
    RETURN order_number;
END;
$$ LANGUAGE plpgsql;

-- Function to check order completion
CREATE OR REPLACE FUNCTION check_order_completion(order_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    total_jobs INTEGER;
    completed_jobs INTEGER;
BEGIN
    -- Count total restoration jobs for this order
    SELECT COUNT(*)
    INTO total_jobs
    FROM restoration_jobs rj
    JOIN images i ON rj.original_image_id = i.id
    WHERE i.order_id = order_uuid;
    
    -- Count completed jobs
    SELECT COUNT(*)
    INTO completed_jobs
    FROM restoration_jobs rj
    JOIN images i ON rj.original_image_id = i.id
    WHERE i.order_id = order_uuid
    AND rj.status = 'completed';
    
    -- Return true if all jobs are completed
    RETURN (total_jobs > 0 AND total_jobs = completed_jobs);
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired uploads
CREATE OR REPLACE FUNCTION cleanup_expired_uploads()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Update expired uploads
    UPDATE file_uploads
    SET status = 'expired'
    WHERE status IN ('pending', 'uploaded')
    AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE customers IS 'Customer information identified by email address';
COMMENT ON TABLE orders IS 'Order tracking with Stripe payment integration';
COMMENT ON TABLE images IS 'Image storage tracking for originals and restored images';
COMMENT ON TABLE restoration_jobs IS 'Background jobs for image restoration via external APIs';
COMMENT ON TABLE email_queue IS 'Queue for reliable email delivery with retry logic';
COMMENT ON TABLE audit_logs IS 'Complete audit trail of all database changes';
COMMENT ON TABLE file_uploads IS 'Temporary file upload tracking before payment';
COMMENT ON TABLE download_links IS 'Secure token-based download links with expiration';

COMMENT ON COLUMN orders.order_number IS 'Human-readable order number in format YYYYMMDD-NNNNNN';
COMMENT ON COLUMN images.parent_image_id IS 'References original image for restored images';
COMMENT ON COLUMN restoration_jobs.external_job_id IS 'External service job ID (e.g., Replicate prediction ID)';
COMMENT ON COLUMN email_queue.dynamic_data IS 'Template variables for email rendering';
COMMENT ON COLUMN download_links.target_images IS 'Array of image IDs included in download';

-- Create initial data (optional)
-- You can add any seed data here if needed

-- Migration complete
SELECT 'RestoreClick database schema created successfully!' as message;
