/**
 * Utility functions for generating user-friendly filenames
 */

export interface FileInfo {
  originalFilename?: string;
  mimeType?: string;
  type?: 'original' | 'restored';
  index?: number;
  fallbackId?: string;
}

/**
 * Get file extension from MIME type
 */
export function getExtensionFromMimeType(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
    case 'image/jpg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/gif':
      return '.gif';
    case 'image/bmp':
      return '.bmp';
    case 'image/tiff':
      return '.tiff';
    default:
      return '.jpg'; // Default fallback
  }
}

/**
 * Sanitize filename by removing/replacing invalid characters
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
}

/**
 * Generate user-friendly filename for downloads
 */
export function generateDownloadFilename(fileInfo: FileInfo): string {
  const { originalFilename, mimeType = 'image/png', type = 'restored', index, fallbackId } = fileInfo;
  
  let baseName: string;
  let extension: string;
  
  // Determine extension
  extension = getExtensionFromMimeType(mimeType);
  
  if (originalFilename) {
    // Extract base name without extension
    baseName = originalFilename.replace(/\.[^/.]+$/, '');
    baseName = sanitizeFilename(baseName);
    
    // Add type suffix for restored images
    if (type === 'restored') {
      baseName += '_restored';
    } else if (type === 'original') {
      baseName += '_original';
    }
  } else {
    // Generate fallback name
    if (type === 'restored') {
      baseName = index ? `restored_photo_${index}` : `restored_photo`;
    } else {
      baseName = index ? `original_photo_${index}` : `original_photo`;
    }
    
    // Add unique identifier if available
    if (fallbackId) {
      baseName += `_${fallbackId.substring(0, 8)}`;
    }
  }
  
  return `${baseName}${extension}`;
}

/**
 * Generate ZIP filename for order
 */
export function generateZipFilename(orderId: string, orderNumber?: string): string {
  const sanitizedOrderNumber = orderNumber ? sanitizeFilename(orderNumber) : orderId.substring(0, 8);
  return `RestoreClick_Order_${sanitizedOrderNumber}.zip`;
}

/**
 * Extract base filename without extension
 */
export function getBaseFilename(filename: string): string {
  return filename.replace(/\.[^/.]+$/, '');
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const match = filename.match(/\.[^/.]+$/);
  return match ? match[0] : '';
}
