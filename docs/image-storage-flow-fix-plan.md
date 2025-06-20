# Image Storage Flow Fix Implementation Plan

## Current State Analysis

### Problems Identified

1. **Missing Image Movement Logic**: 
   - Images are uploaded to `temporary-uploads/` but never moved to `originals/`
   - The `input_image_url` in predictions table points to `temporary-uploads/` instead of `originals/`
   - No code exists to handle the movement from `temporary-uploads/` to `originals/`

2. **Incorrect Storage URLs**:
   - `output_image_url` correctly stores Supabase URLs from `restored/` folder
   - `input_image_url` incorrectly stores URLs from `temporary-uploads/` folder
   - Orders table has empty `input_image_urls` because images aren't in `originals/`

3. **Incomplete Flow**:
   - Payment webhook creates predictions with `temporary-uploads/` URLs
   - These temporary URLs are sent to Replicate
   - No process moves images to permanent storage

## Required Changes

### 1. Update Stripe Webhook - Move Images to Originals
**File**: `/app/api/webhooks/stripe/route.ts`
**Priority**: CRITICAL
**Changes**:
```typescript
// After successful payment (line ~137)
// BEFORE creating predictions, add image movement logic:

// Move images from temporary-uploads to originals
const movedImageUrls: string[] = [];
for (const file of listData) {
  const tempPath = `temporary-uploads/${batchId}/${file.name}`;
  const permanentPath = `originals/${batchId}/${file.name}`;
  
  // Download from temp location
  const { data: fileData, error: downloadError } = await supabaseAdmin.storage
    .from('photos')
    .download(tempPath);
    
  if (downloadError) {
    logger.error({ error: downloadError, tempPath }, 'Failed to download temp file');
    continue;
  }
  
  // Upload to permanent location
  const { error: uploadError } = await supabaseAdmin.storage
    .from('photos')
    .upload(permanentPath, fileData, {
      contentType: 'image/jpeg',
      upsert: false
    });
    
  if (uploadError) {
    logger.error({ error: uploadError, permanentPath }, 'Failed to upload to originals');
    continue;
  }
  
  // Get public URL for permanent location
  const { data: publicUrlData } = supabaseAdmin.storage
    .from('photos')
    .getPublicUrl(permanentPath);
    
  movedImageUrls.push(publicUrlData.publicUrl);
  
  // Delete from temporary location
  const { error: deleteError } = await supabaseAdmin.storage
    .from('photos')
    .remove([tempPath]);
    
  if (deleteError) {
    logger.warn({ error: deleteError, tempPath }, 'Failed to delete temp file');
  }
}

// Update the order with the permanent URLs
const { error: updateOrderError } = await supabaseAdmin
  .from('orders')
  .update({ input_image_urls: movedImageUrls })
  .eq('id', newOrder.id);
```

### 2. Update Prediction Creation Logic
**File**: `/app/api/webhooks/stripe/route.ts`
**Priority**: CRITICAL
**Changes**:
```typescript
// Update line ~162 to use permanent URL instead of temp URL
// Change from:
input_image_url: inputImageUrl, // This was from temporary-uploads

// To:
input_image_url: movedImageUrls[index], // Use the permanent URL from originals
```

### 3. Create Cleanup Job for Temporary Uploads
**File**: `/app/api/cleanup-temp-uploads/route.ts` (NEW)
**Priority**: HIGH
**Purpose**: Clean up abandoned temporary uploads older than 24 hours
```typescript
export async function POST(req: NextRequest) {
  // List all files in temporary-uploads
  // Check created_at timestamp
  // Delete files older than 24 hours that don't have associated orders
}
```

### 4. Update Replicate Prediction Handler
**File**: `/app/api/replicate/predictions/[id]/route.ts`
**Priority**: MEDIUM
**Changes**:
- Already correctly saves to `restored/` folder
- No changes needed

### 5. Add Validation Script
**File**: `/scripts/validate-storage-urls.ts` (NEW)
**Priority**: MEDIUM
**Purpose**: Validate all predictions have correct storage URLs
```typescript
// Check all predictions
// Verify input_image_url contains /originals/
// Verify output_image_url contains /restored/
// Report any that use /temporary-uploads/
```

## Implementation Sequence

1. **Phase 1 - Critical Path** (Do First)
   - Update Stripe webhook to move images from `temporary-uploads/` to `originals/`
   - Update prediction creation to use `originals/` URLs
   - Update order record with permanent image URLs

2. **Phase 2 - Data Fix** (Do Second)
   - Create script to fix existing predictions with wrong URLs
   - Move any existing images from `temporary-uploads/` to `originals/`
   - Update database records

3. **Phase 3 - Maintenance** (Do Third)
   - Create cleanup job for abandoned temporary uploads
   - Add validation script for monitoring
   - Add tests

## Testing Plan

1. **Manual Test Flow**:
   - Upload images (verify in `temporary-uploads/`)
   - Complete payment
   - Verify images moved to `originals/`
   - Verify predictions have `originals/` URLs
   - Verify order has `input_image_urls` populated
   - Wait for restoration
   - Verify restored images in `restored/` folder
   - Test email attachments work with new URLs

2. **Validation Checks**:
   - No images remain in `temporary-uploads/` after payment
   - All `input_image_url` fields contain `/originals/`
   - All `output_image_url` fields contain `/restored/`
   - Order `input_image_urls` is populated
   - Emails include all attachments

## Rollback Plan

If issues occur:
1. Revert webhook changes
2. Images will remain in `temporary-uploads/` (current behavior)
3. Fix issues and redeploy

## Success Criteria

- [ ] Images automatically move from `temporary-uploads/` to `originals/` on payment
- [ ] Predictions table has correct `originals/` URLs in `input_image_url`
- [ ] Orders table has populated `input_image_urls` field
- [ ] All emails include both original and restored image attachments
- [ ] No images accumulate in `temporary-uploads/` folder
- [ ] Replicate receives and processes images from `originals/` URLs
