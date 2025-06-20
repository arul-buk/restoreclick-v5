# Email System Deployment & QA Plan

## Executive Summary
This document outlines a comprehensive plan to fix and test the email system for RestoreClickV4, ensuring all three email types (Order Confirmation, Restoration Complete, and Share with Family) function correctly with proper attachments and download URLs.

## Current Issues
1. **Duplicate Emails**: Restoration complete emails are being sent twice
2. **Missing Images**: Not all restored images are being included in emails
3. **Missing ZIP URLs**: No download URL for zipped files in restoration complete email
4. **Inconsistent Attachments**: Some images missing from attachments

## Email Requirements

### 1. Order Confirmation Email
**When Sent**: Immediately after successful payment
**Recipients**: Customer who placed the order
**Content Required**:
- ✅ Order information (Order ID, Date, Amount, Number of Photos)
- ❌ Download URL for original images (individual or zipped)
- ❌ Attachments: ALL original images

### 2. Restoration Complete Email
**When Sent**: When ALL images in an order are successfully restored
**Recipients**: Customer who placed the order
**Content Required**:
- ✅ Order information
- ❌ Download URL for zipped file containing ALL images (original + restored)
- ❌ Attachments: ALL original AND restored images as individual files

### 3. Share with Family Email
**When Sent**: When user clicks "Send to Family" on payment-success page
**Recipients**: Email addresses specified by the user
**Content Required**:
- ✅ Sender information and personal message
- ❌ Download URL for images
- ❌ Attachments: ALL original AND restored images

## Implementation Fixes Required

### 1. Fix Duplicate Email Issue
**Root Cause**: Restoration complete email is triggered multiple times
**Fix**: 
- Add email deduplication logic
- Track sent emails in database
- Check before sending if email already sent for this order

### 2. Fix Missing Images Issue
**Root Cause**: Not waiting for all restorations to complete
**Fix**:
- Ensure ALL predictions are succeeded before sending restoration complete
- Properly fetch all input_image_urls from database
- Verify all restored image URLs are included

### 3. Add ZIP Download Functionality
**Root Cause**: ZIP creation not implemented for email links
**Fix**:
- Create API endpoint to generate ZIP files on demand
- Generate secure, time-limited download URLs
- Include ZIP download URL in email template data

### 4. Fix Attachment Logic
**Root Cause**: Incorrect field names and incomplete image fetching
**Fix**:
- Use correct database field: `input_image_urls`
- Ensure all images are downloaded and attached
- Add proper error handling for failed downloads

## Testing Plan

### Pre-Deployment Checklist
- [ ] Review all email template IDs in environment variables
- [ ] Verify SendGrid API key has proper permissions
- [ ] Check database has `input_image_urls` field populated for test orders
- [ ] Ensure test orders have multiple images (at least 2-3)

### Test Scenarios

#### Scenario 1: Order Confirmation Email
1. Place a test order with 3 images
2. Complete payment
3. **Verify Email Contains**:
   - Order ID, Date, Amount ($9.99), Number of Photos (3)
   - Download URL for original images
   - 3 attachments (all original images)
4. **Verify Email Does NOT**:
   - Send duplicate emails
   - Include restored images (not ready yet)

#### Scenario 2: Restoration Complete Email
1. Wait for all 3 images to be restored
2. **Verify Email Contains**:
   - Order information
   - ZIP download URL with all 6 images (3 original + 3 restored)
   - 6 attachments (3 original + 3 restored)
3. **Verify Email Does NOT**:
   - Send multiple times
   - Miss any images
4. **Test ZIP Download**:
   - Click ZIP URL
   - Verify ZIP contains all 6 images
   - Verify images are properly named

#### Scenario 3: Share with Family Email
1. From payment-success page, click "Send to Family"
2. Enter recipient email and message
3. **Verify Email Contains**:
   - Sender name and personal message
   - Download URLs for images
   - 6 attachments (3 original + 3 restored)
4. **Verify Email Does NOT**:
   - Send to wrong recipient
   - Miss any images

### Email Client Testing
Test in multiple email clients:
- [ ] Gmail (Web)
- [ ] Outlook (Web)
- [ ] Apple Mail
- [ ] Mobile Gmail App
- [ ] Mobile Outlook App

### Performance Testing
- [ ] Test with orders containing 1, 5, 10, and 20 images
- [ ] Verify email sending time remains under 30 seconds
- [ ] Check attachment size limits (typically 25MB total)

## Deployment Steps

### Phase 1: Code Fixes
1. Fix duplicate email prevention
2. Fix image fetching logic
3. Implement ZIP download API
4. Update email templates with download URLs
5. Fix attachment creation logic

### Phase 2: Staging Testing
1. Deploy to staging environment
2. Run all test scenarios
3. Fix any issues found
4. Re-test failed scenarios

### Phase 3: Production Deployment
1. Deploy during low-traffic period
2. Monitor email logs for errors
3. Test with real order immediately
4. Have rollback plan ready

## Monitoring & Success Metrics

### Key Metrics to Track
- Email delivery rate (target: >98%)
- Email open rate
- Attachment download rate
- ZIP download success rate
- Duplicate email rate (target: 0%)
- Missing image rate (target: 0%)

### Log Monitoring
Monitor for:
- "Failed to download image" errors
- "Email already sent" logs
- SendGrid API errors
- Attachment size limit errors

## Rollback Plan
If issues occur after deployment:
1. Revert code changes
2. Clear any email tracking records
3. Manually send emails for affected orders
4. Document issues for post-mortem

## Post-Deployment Validation
- [ ] Check 10 recent orders for correct emails
- [ ] Verify no duplicate emails in last 24 hours
- [ ] Confirm all attachments present
- [ ] Test ZIP downloads working
- [ ] Customer feedback positive

## Timeline
- **Day 1**: Implement fixes (4 hours)
- **Day 2**: Staging testing (2 hours)
- **Day 3**: Production deployment & monitoring (2 hours)

## Success Criteria
✅ Zero duplicate emails
✅ All images included in appropriate emails
✅ ZIP downloads functional
✅ All attachments delivered successfully
✅ Customer satisfaction with email functionality
