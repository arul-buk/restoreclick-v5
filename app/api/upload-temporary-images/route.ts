import { NextRequest, NextResponse } from 'next/server';
import { storageService } from '@/lib/storage/storage-service';
import logger from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  const log = logger.child({ api_route: 'POST /api/upload-temporary-images' });
  log.info('Starting temporary image upload process');

  try {
    let formData: FormData;
    
    // Handle formData retrieval with proper error handling
    try {
      formData = await req.formData();
    } catch (formDataError) {
      log.error({ error: formDataError }, 'Failed to parse form data');
      return NextResponse.json({ error: 'Invalid request format - unable to parse form data' }, { status: 400 });
    }
    
    const files = formData.getAll('files') as File[];
    const customerEmail = formData.get('customerEmail') as string;

    if (!files || files.length === 0) {
      log.warn('No files received for upload');
      return NextResponse.json({ error: 'No files received' }, { status: 400 });
    }

    // Validate file types and sizes
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    for (const file of files) {
      if (!(file instanceof File)) {
        log.warn({ received_item: file }, 'Invalid file object received');
        return NextResponse.json({ error: 'Invalid file format' }, { status: 400 });
      }
      
      if (file.size > maxFileSize) {
        log.warn({ fileName: file.name, fileSize: file.size }, 'File size exceeds limit');
        return NextResponse.json({ 
          error: `File ${file.name} exceeds 10MB limit` 
        }, { status: 400 });
      }
      
      if (!allowedTypes.includes(file.type)) {
        log.warn({ fileName: file.name, fileType: file.type }, 'Invalid file type');
        return NextResponse.json({ 
          error: `File ${file.name} has unsupported format. Only JPEG, PNG, and WebP are allowed` 
        }, { status: 400 });
      }
    }

    // Generate session ID
    const sessionId = uuidv4();
    
    log.info({ 
      sessionId, 
      fileCount: files.length, 
      customerEmail: customerEmail || 'anonymous' 
    }, 'Processing file uploads');

    // Upload files using storage service
    const uploadResults = await storageService.uploadTemporary(
      sessionId,
      files,
      customerEmail
    );

    const response = {
      sessionId,
      uploadCount: uploadResults.length,
      uploads: uploadResults.map(result => ({
        id: result.id,
        publicUrl: result.publicUrl,
        fileSize: result.fileSize
      })),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };

    log.info({ 
      sessionId, 
      uploadCount: uploadResults.length 
    }, 'Temporary upload completed successfully');

    return NextResponse.json(response, { status: 200 });

  } catch (error: any) {
    log.error({ 
      error: error.message, 
      stack: error.stack 
    }, 'Error in temporary image upload process');

    // Handle specific error types
    if (error.message?.includes('Storage')) {
      return NextResponse.json({ 
        error: 'Failed to upload images to storage', 
        details: error.message 
      }, { status: 500 });
    }

    if (error.message?.includes('Database')) {
      return NextResponse.json({ 
        error: 'Failed to save upload information', 
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      error: 'Internal server error during upload' 
    }, { status: 500 });
  }
}
