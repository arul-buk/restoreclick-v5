import { NextRequest, NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';
import logger from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

const sanitizeFilename = (filename: string): string => {
  // Replaces spaces with underscores, removes non-alphanumeric characters (except dots and hyphens), and converts to lowercase.
  return filename
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/[^a-zA-Z0-9._-]/g, '') // Remove unwanted characters
    .toLowerCase(); // Convert to lowercase
};

export async function POST(req: NextRequest) {
  const log = logger.child({ api_route: 'POST /api/upload-temporary-images' });
  log.info('Attempting to upload temporary images.');

  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[]; // Assuming client sends files under the key 'files'

    if (!files || files.length === 0) {
      log.warn('No files received for upload.');
      return NextResponse.json({ error: 'No files received.' }, { status: 400 });
    }

    const batchId = uuidv4();
    const uploadedFilePaths: string[] = [];
    const uploadPromises = [];

    log.info({ batchId, file_count: files.length }, 'Generated batch ID and processing files.');

    for (const file of files) {
      if (!(file instanceof File)) {
        log.warn({ received_item: file }, 'Received an item that is not a File object in the form data.');
        // Optionally skip this item or return an error
        continue; 
      }
      const sanitizedFilename = sanitizeFilename(file.name);
      const filePath = `temporary-uploads/${batchId}/${sanitizedFilename}`;
      
      // Convert File to Buffer for Supabase upload if needed, or pass stream directly
      // For simplicity, let's assume direct upload works or use arrayBuffer
      const fileBuffer = Buffer.from(await file.arrayBuffer());

      uploadPromises.push(
        supabaseAdmin.storage
          .from('photos') // Your bucket name
          .upload(filePath, fileBuffer, {
            contentType: file.type,
            // upsert: false, // Set to true if you want to overwrite, false to error on conflict
          })
          .then(({ data, error }) => {
            if (error) {
              log.error({ error, file_name: file.name, batchId }, 'Supabase storage upload error.');
              throw error; // Propagate error to be caught by Promise.all
            }
            if (data) {
              uploadedFilePaths.push(data.path);
              log.info({ path: data.path, batchId }, 'File uploaded successfully to Supabase.');
            }
          })
      );
    }

    await Promise.all(uploadPromises);

    log.info({ batchId, uploaded_paths: uploadedFilePaths }, 'All files for batch processed.');
    return NextResponse.json({ batchId, uploadedFilePaths }, { status: 200 });

  } catch (error: any) {
    log.error(
      { error_message: error.message, error_stack: error.stack }, 
      'Error in temporary image upload process.'
    );
    // Check if it's a Supabase storage error to provide more specific feedback
    if (error.name === 'StorageApiError' || error.message?.includes('Storage')) {
        return NextResponse.json({ error: 'Failed to upload images to storage.', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error during upload.' }, { status: 500 });
  }
}
