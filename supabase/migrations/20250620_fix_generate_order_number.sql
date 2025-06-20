-- Fix for the ambiguous column reference in generate_order_number function
-- This resolves PostgreSQL error 42702: "column reference 'order_number' is ambiguous"
-- The issue was that 'order_number' exists both as a local variable and a table column

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
    -- Fix: Explicitly qualify the column reference with table name to avoid ambiguity
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(orders.order_number FROM LENGTH(date_prefix) + 2) AS INTEGER)
    ), 0) + 1
    INTO sequence_num
    FROM orders
    WHERE orders.order_number LIKE date_prefix || '-%';
    
    -- Format as YYYYMMDD-NNNNNN
    order_number := date_prefix || '-' || LPAD(sequence_num::TEXT, 6, '0');
    
    RETURN order_number;
END;
$$ LANGUAGE plpgsql;
