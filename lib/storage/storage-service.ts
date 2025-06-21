// lib/storage/storage-service.ts
import supabaseAdmin from '@/lib/supabaseAdmin';
import { Database } from '@/lib/database.types';
import { v4 as uuidv4 } from 'uuid';
import logger from '@/lib/logger';
import { downloadFileAsBuffer } from '@/lib/supabase-utils';
import JSZip from 'jszip';
import { generateDownloadFilename, generateZipFilename } from '@/lib/utils/filename-utils';

type FileUpload = Database['public']['Tables']['file_uploads']['Row'];
type Image = Database['public']['Tables']['images']['Row'];
type UploadStatus = Database['public']['Enums']['upload_status_enum'];
type ImageStatus = Database['public']['Enums']['image_status_enum'];

export interface UploadResult {
  id: string;
  sessionId: string;
  storagePath: string;
  publicUrl: string;
  fileSize: number;
}

export interface MoveResult {
  originalPath: string;
  newPath: string;
  publicUrl: string;
  imageId: string;
}

export class StorageService {
  private readonly bucket = 'photos';
  
  /**
   * Upload files to temporary storage before payment
   */
  async uploadTemporary(
    sessionId: string,
    files: File[],
    customerEmail?: string
  ): Promise<UploadResult[]> {
    logger.info({ sessionId, fileCount: files.length }, 'Starting temporary upload');
    
    const results: UploadResult[] = [];
    
    for (const file of files) {
      try {
        // Generate unique filename
        const fileExtension = file.name.split('.').pop() || '';
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uniqueFileName = `${uuidv4()}_${sanitizedName}`;
        const storagePath = `uploads/temp/${sessionId}/${uniqueFileName}`;
        
        // Upload to Supabase storage
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from(this.bucket)
          .upload(storagePath, file, {
            contentType: file.type,
            upsert: false
          });
          
        if (uploadError) {
          logger.error({ error: uploadError, sessionId, fileName: file.name }, 'Failed to upload file');
          throw uploadError;
        }
        
        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
          .from(this.bucket)
          .getPublicUrl(storagePath);
          
        // Create file_uploads record
        const { data: fileRecord, error: dbError } = await supabaseAdmin
          .from('file_uploads')
          .insert({
            upload_session_id: sessionId,
            customer_email: customerEmail,
            original_filename: file.name,
            storage_path: storagePath,
            file_size_bytes: file.size,
            mime_type: file.type,
            status: 'uploaded' as UploadStatus,
            metadata: {
              unique_filename: uniqueFileName,
              upload_timestamp: new Date().toISOString()
            }
          })
          .select()
          .single();
          
        if (dbError) {
          logger.error({ error: dbError, sessionId }, 'Failed to create file upload record');
          throw dbError;
        }
        
        results.push({
          id: fileRecord.id,
          sessionId,
          storagePath,
          publicUrl: urlData.publicUrl,
          fileSize: file.size
        });
        
        logger.info({ sessionId, fileName: file.name, storagePath }, 'File uploaded successfully');
        
      } catch (error) {
        logger.error({ error, sessionId, fileName: file.name }, 'Failed to upload file');
        throw error;
      }
    }
    
    return results;
  }
  
  /**
   * Move files from temporary to permanent storage after payment
   */
  async moveToOriginals(sessionId: string, orderId: string): Promise<MoveResult[]> {
    logger.info({ sessionId, orderId }, 'Moving files from temp to originals');
    
    // Get all uploaded files for this session
    const { data: fileUploads, error: fetchError } = await supabaseAdmin
      .from('file_uploads')
      .select('*')
      .eq('upload_session_id', sessionId)
      .eq('status', 'uploaded');
      
    if (fetchError) {
      logger.error({ error: fetchError, sessionId }, 'Failed to fetch file uploads');
      throw fetchError;
    }
    
    if (!fileUploads || fileUploads.length === 0) {
      logger.warn({ sessionId }, 'No files found to move');
      return [];
    }
    
    const results: MoveResult[] = [];
    
    for (const fileUpload of fileUploads) {
      try {
        // Generate new path in originals folder
        const fileName = fileUpload.storage_path.split('/').pop() || '';
        const newPath = `uploads/originals/${orderId}/${fileName}`;
        
        // Move file in storage
        const { error: moveError } = await supabaseAdmin.storage
          .from(this.bucket)
          .move(fileUpload.storage_path, newPath);
          
        if (moveError) {
          logger.error({ error: moveError, oldPath: fileUpload.storage_path, newPath }, 'Failed to move file');
          throw moveError;
        }
        
        // Get new public URL
        const { data: urlData } = supabaseAdmin.storage
          .from(this.bucket)
          .getPublicUrl(newPath);
        
        // Create image record
        const { data: imageRecord, error: imageError } = await supabaseAdmin
          .from('images')
          .insert({
            order_id: orderId,
            type: 'original',
            status: 'uploaded' as ImageStatus,
            storage_bucket: this.bucket,
            storage_path: newPath,
            public_url: urlData.publicUrl,
            file_size_bytes: fileUpload.file_size_bytes,
            mime_type: fileUpload.mime_type,
            metadata: {
              original_filename: fileUpload.original_filename,
              moved_from_temp: fileUpload.storage_path,
              session_id: sessionId
            }
          })
          .select()
          .single();
          
        if (imageError) {
          logger.error({ error: imageError, orderId }, 'Failed to create image record');
          throw imageError;
        }
        
        // Update file upload status
        await supabaseAdmin
          .from('file_uploads')
          .update({ 
            status: 'moved_to_permanent' as UploadStatus,
            metadata: {
              ...fileUpload.metadata as any,
              moved_to: newPath,
              image_id: imageRecord.id,
              moved_at: new Date().toISOString()
            }
          })
          .eq('id', fileUpload.id);
        
        results.push({
          originalPath: fileUpload.storage_path,
          newPath,
          publicUrl: urlData.publicUrl,
          imageId: imageRecord.id
        });
        
        logger.info({ 
          sessionId, 
          orderId, 
          oldPath: fileUpload.storage_path, 
          newPath,
          imageId: imageRecord.id 
        }, 'File moved successfully');
        
      } catch (error) {
        logger.error({ error, sessionId, orderId, fileId: fileUpload.id }, 'Failed to move file');
        throw error;
      }
    }
    
    return results;
  }
  
  /**
   * Save restored image from external service
   */
  async saveRestored(
    originalImageId: string,
    imageData: Buffer,
    metadata?: Record<string, any>
  ): Promise<string> {
    logger.info({ originalImageId, dataSize: imageData.length }, 'Saving restored image');
    
    // Get original image info
    const { data: originalImage, error: fetchError } = await supabaseAdmin
      .from('images')
      .select('*')
      .eq('id', originalImageId)
      .single();
      
    if (fetchError || !originalImage) {
      logger.error({ error: fetchError, originalImageId }, 'Failed to fetch original image');
      throw fetchError || new Error('Original image not found');
    }
    
    // Generate restored image path
    const orderId = originalImage.order_id;
    const originalFileName = originalImage.storage_path.split('/').pop() || '';
    const restoredFileName = `restored_${originalFileName}`;
    const restoredPath = `uploads/restored/${orderId}/${restoredFileName}`;
    
    // Upload restored image
    const { error: uploadError } = await supabaseAdmin.storage
      .from(this.bucket)
      .upload(restoredPath, imageData, {
        contentType: originalImage.mime_type || 'image/jpeg',
        upsert: true
      });
      
    if (uploadError) {
      logger.error({ error: uploadError, restoredPath }, 'Failed to upload restored image');
      throw uploadError;
    }
    
    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(this.bucket)
      .getPublicUrl(restoredPath);
    
    // Create restored image record
    const { data: restoredImage, error: createError } = await supabaseAdmin
      .from('images')
      .insert({
        order_id: orderId,
        type: 'restored',
        status: 'completed' as ImageStatus,
        storage_bucket: this.bucket,
        storage_path: restoredPath,
        public_url: urlData.publicUrl,
        file_size_bytes: imageData.length,
        mime_type: originalImage.mime_type,
        parent_image_id: originalImageId,
        processing_completed_at: new Date().toISOString(),
        metadata: {
          ...metadata,
          restored_from: originalImage.storage_path,
          restored_at: new Date().toISOString()
        }
      })
      .select()
      .single();
      
    if (createError) {
      logger.error({ error: createError, orderId }, 'Failed to create restored image record');
      throw createError;
    }
    
    logger.info({ 
      originalImageId, 
      restoredImageId: restoredImage.id, 
      restoredPath 
    }, 'Restored image saved successfully');
    
    return restoredImage.id;
  }
  
  /**
   * Create ZIP file containing multiple images
   */
  async createZip(orderId: string, imageIds: string[]): Promise<string> {
    logger.info({ orderId, imageCount: imageIds.length }, 'Creating ZIP file');
    
    // Get image records and order info
    const [imagesResult, orderResult] = await Promise.all([
      supabaseAdmin
        .from('images')
        .select('*')
        .in('id', imageIds),
      supabaseAdmin
        .from('orders')
        .select('order_number')
        .eq('id', orderId)
        .single()
    ]);
    
    if (imagesResult.error) {
      logger.error({ error: imagesResult.error, orderId, imageIds }, 'Failed to fetch images for ZIP');
      throw imagesResult.error;
    }
    
    const images = imagesResult.data;
    const orderNumber = orderResult.data?.order_number;
    
    if (!images || images.length === 0) {
      throw new Error('No images found for ZIP creation');
    }
    
    // Create ZIP
    const zip = new JSZip();
    
    for (const image of images) {
      try {
        // Download image data
        const imageBuffer = await downloadFileAsBuffer(image.storage_bucket, image.storage_path);
        
        // Generate user-friendly filename using utility function
        const fileName = generateDownloadFilename({
          originalFilename: image.metadata?.original_filename,
          mimeType: image.mime_type || 'image/png',
          type: image.type as 'original' | 'restored',
          fallbackId: image.id
        });
        
        zip.file(fileName, imageBuffer);
        
      } catch (error) {
        logger.error({ error, imageId: image.id, orderId }, 'Failed to add image to ZIP');
        // Continue with other images
      }
    }
    
    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    
    // Save ZIP to storage with user-friendly name
    const zipFileName = generateZipFilename(orderId, orderNumber);
    const zipPath = `downloads/${orderId}/${zipFileName}`;
    
    const { error: uploadError } = await supabaseAdmin.storage
      .from(this.bucket)
      .upload(zipPath, zipBuffer, {
        contentType: 'application/zip',
        upsert: true
      });
      
    if (uploadError) {
      logger.error({ error: uploadError, zipPath }, 'Failed to upload ZIP file');
      throw uploadError;
    }
    
    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(this.bucket)
      .getPublicUrl(zipPath);
    
    logger.info({ orderId, zipPath, imageCount: images.length }, 'ZIP file created successfully');
    
    return urlData.publicUrl;
  }
  
  /**
   * Cleanup expired temporary uploads
   */
  async cleanupExpiredUploads(): Promise<number> {
    logger.info('Starting cleanup of expired uploads');
    
    // Get expired uploads
    const { data: expiredUploads, error: fetchError } = await supabaseAdmin
      .from('file_uploads')
      .select('*')
      .lt('expires_at', new Date().toISOString())
      .in('status', ['pending', 'uploaded']);
      
    if (fetchError) {
      logger.error({ error: fetchError }, 'Failed to fetch expired uploads');
      throw fetchError;
    }
    
    if (!expiredUploads || expiredUploads.length === 0) {
      logger.info('No expired uploads to clean up');
      return 0;
    }
    
    let cleanedCount = 0;
    
    for (const upload of expiredUploads) {
      try {
        // Delete from storage
        const { error: deleteError } = await supabaseAdmin.storage
          .from(this.bucket)
          .remove([upload.storage_path]);
          
        if (deleteError) {
          logger.error({ error: deleteError, path: upload.storage_path }, 'Failed to delete expired file');
          continue;
        }
        
        // Update status
        await supabaseAdmin
          .from('file_uploads')
          .update({ 
            status: 'expired' as UploadStatus,
            metadata: {
              ...upload.metadata as any,
              cleaned_up_at: new Date().toISOString()
            }
          })
          .eq('id', upload.id);
        
        cleanedCount++;
        
      } catch (error) {
        logger.error({ error, uploadId: upload.id }, 'Failed to cleanup expired upload');
      }
    }
    
    logger.info({ cleanedCount, totalExpired: expiredUploads.length }, 'Cleanup completed');
    
    return cleanedCount;
  }
  
  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    tempUploads: number;
    originalImages: number;
    restoredImages: number;
    totalSize: number;
  }> {
    const [tempUploads, originalImages, restoredImages] = await Promise.all([
      supabaseAdmin.from('file_uploads').select('file_size_bytes', { count: 'exact' }).eq('status', 'uploaded'),
      supabaseAdmin.from('images').select('file_size_bytes', { count: 'exact' }).eq('type', 'original'),
      supabaseAdmin.from('images').select('file_size_bytes', { count: 'exact' }).eq('type', 'restored')
    ]);
    
    const calculateTotalSize = (data: any[]) => 
      data?.reduce((sum, item) => sum + (item.file_size_bytes || 0), 0) || 0;
    
    return {
      tempUploads: tempUploads.count || 0,
      originalImages: originalImages.count || 0,
      restoredImages: restoredImages.count || 0,
      totalSize: calculateTotalSize([
        ...(tempUploads.data || []),
        ...(originalImages.data || []),
        ...(restoredImages.data || [])
      ])
    };
  }
}

// Export singleton instance
export const storageService = new StorageService();
