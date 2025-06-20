-- Add email tracking fields to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS restoration_email_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS restoration_email_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS order_confirmation_email_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS order_confirmation_email_sent_at TIMESTAMP WITH TIME ZONE;

-- Create index for email tracking
CREATE INDEX IF NOT EXISTS idx_orders_restoration_email_sent ON orders(restoration_email_sent);
CREATE INDEX IF NOT EXISTS idx_orders_order_confirmation_email_sent ON orders(order_confirmation_email_sent);

-- Add comment for documentation
COMMENT ON COLUMN orders.restoration_email_sent IS 'Tracks whether restoration complete email has been sent to prevent duplicates';
COMMENT ON COLUMN orders.restoration_email_sent_at IS 'Timestamp when restoration complete email was sent';
COMMENT ON COLUMN orders.order_confirmation_email_sent IS 'Tracks whether order confirmation email has been sent';
COMMENT ON COLUMN orders.order_confirmation_email_sent_at IS 'Timestamp when order confirmation email was sent';
