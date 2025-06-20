# Email System Deployment Checklist

## Pre-Deployment Steps

### 1. Database Migration
Run this SQL in your Supabase SQL editor:

```sql
-- Add email tracking fields to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS restoration_email_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS restoration_email_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS order_confirmation_email_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS order_confirmation_email_sent_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_restoration_email_sent ON orders(restoration_email_sent);
CREATE INDEX IF NOT EXISTS idx_orders_order_confirmation_email_sent ON orders(order_confirmation_email_sent);

-- Add comments for documentation
COMMENT ON COLUMN orders.restoration_email_sent IS 'Tracks whether restoration complete email has been sent to prevent duplicates';
COMMENT ON COLUMN orders.restoration_email_sent_at IS 'Timestamp when restoration complete email was sent';
COMMENT ON COLUMN orders.order_confirmation_email_sent IS 'Tracks whether order confirmation email has been sent';
COMMENT ON COLUMN orders.order_confirmation_email_sent_at IS 'Timestamp when order confirmation email was sent';
```

### 2. Environment Variables
Ensure these are set in your `.env.local` and production environment:

```env
# SendGrid
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_ORDER_CONFIRMATION_TEMPLATE_ID=your_order_confirmation_template_id
SENDGRID_RESTORATION_COMPLETE_TEMPLATE_ID=your_restoration_complete_template_id
SENDGRID_FAMILY_SHARE_TEMPLATE_ID=your_family_share_template_id

# App URL (needed for ZIP generation)
NEXT_PUBLIC_APP_URL=https://your-app-domain.com

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. SendGrid Template Variables
Ensure your SendGrid templates have these variables:

**All Templates:**
- `{{order_id}}`
- `{{customer_name}}`
- `{{customer_email}}`
- `{{logo_url}}`

**Order Confirmation Template:**
- `{{order_date}}`
- `{{total_amount_paid}}`
- `{{number_of_photos}}`
- `{{original_image_urls}}` (array)

**Restoration Complete Template:**
- `{{order_date}}`
- `{{total_amount_paid}}`
- `{{number_of_photos}}`
- `{{view_restorations_url}}`
- `{{zip_download_url}}`
- `{{original_image_urls}}` (array)
- `{{restored_image_urls}}` (array)

**Family Share Template:**
- `{{sender_name}}`
- `{{personal_message}}`
- `{{photo_urls}}` (array)
- `{{original_image_urls}}` (array)
- `{{restored_image_urls}}` (array)

## Testing Steps

### 1. Test Email System Script
```bash
# Install dependencies if not already done
npm install

# Run test for a specific order
npm run test-email <order-id>
```

### 2. Manual Testing Flow

#### A. Test Order Confirmation Email
1. Create a new order with 2-3 images
2. Complete payment
3. Check that order confirmation email is sent immediately
4. Verify email contains:
   - ✅ Order details (ID, date, amount)
   - ✅ All original images as attachments
   - ❌ No restored images (not ready yet)

#### B. Test Restoration Complete Email
1. Wait for all images to be restored
2. Check logs to ensure `/api/check-order-completion` is called
3. Verify only ONE restoration complete email is sent
4. Verify email contains:
   - ✅ Order details
   - ✅ ZIP download URL
   - ✅ All original images as attachments
   - ✅ All restored images as attachments
5. Test ZIP download:
   - Click the ZIP URL in email
   - Verify ZIP contains all images
   - Check file names are correct

#### C. Test Share with Family Email
1. Go to payment-success page
2. Click "Send to Family"
3. Enter recipient email
4. Verify email contains:
   - ✅ Personal message
   - ✅ All original images as attachments
   - ✅ All restored images as attachments

### 3. Edge Case Testing

#### Test Partial Restoration
1. Create order with 3 images
2. Simulate one image failing
3. Verify restoration complete email is NOT sent
4. Fix the failed image
5. Verify email is sent when all complete

#### Test Duplicate Prevention
1. Find an order that already received restoration complete email
2. Manually trigger `/api/check-order-completion` for that order
3. Verify NO duplicate email is sent
4. Check logs for "Email already sent" message

## Production Deployment

### 1. Deploy Code
```bash
# Deploy to production
git push origin main

# Or use your deployment method
vercel --prod
```

### 2. Monitor Logs
Watch for these log messages:
- "Order completion check result"
- "Restoration complete email sent successfully"
- "Email already sent"
- "Failed to download image" (should be rare)

### 3. Post-Deployment Verification
1. Place a real order
2. Monitor the entire flow
3. Check all three email types
4. Verify no duplicates in 24 hours

## Rollback Plan
If issues occur:

1. **Revert Code**:
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Clear Email Tracking** (if needed):
   ```sql
   UPDATE orders 
   SET restoration_email_sent = FALSE,
       restoration_email_sent_at = NULL
   WHERE created_at > NOW() - INTERVAL '1 day';
   ```

3. **Manual Email Sending**:
   - Use Supabase dashboard to identify affected orders
   - Manually trigger emails for those orders

## Success Metrics
Monitor these over the first 24 hours:

- ✅ Zero duplicate restoration complete emails
- ✅ 100% of completed orders receive restoration email
- ✅ All attachments delivered successfully
- ✅ ZIP downloads working for all users
- ✅ No customer complaints about missing emails

## Common Issues & Solutions

### Issue: "Failed to download image" in logs
**Solution**: Check if image URLs are accessible. May need to refresh Supabase storage URLs.

### Issue: ZIP generation fails
**Solution**: Check Supabase storage bucket permissions. Ensure 'photos' bucket exists and is public.

### Issue: Emails not sending
**Solution**: Verify SendGrid API key and template IDs. Check SendGrid dashboard for bounces.

### Issue: Missing attachments
**Solution**: Check attachment size. SendGrid has 30MB total limit per email.

## Contact for Issues
If you encounter any issues during deployment:
1. Check application logs
2. Review this checklist
3. Test with the email system script
4. Check SendGrid activity feed
