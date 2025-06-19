// lib/supabase-utils.ts
import supabaseAdmin from '@/lib/supabaseAdmin'; // Ensure this path is correct for your supabaseAdmin instance
import logger from './logger';

/**
 * Parses a Supabase public URL to extract the bucket name and file path.
 * @param publicUrl - The public URL of the Supabase storage item.
 * @returns An object containing the bucket name and file path, or null if parsing fails.
 */
export function getSupabaseStoragePathFromUrl(publicUrl: string): { bucketName: string; filePath: string } | null {
  try {
    const url = new URL(publicUrl);
    // Example URL: https://<project_ref>.supabase.co/storage/v1/object/public/<bucket_name>/<file_path>
    // Example URL for signed: https://<project_ref>.supabase.co/storage/v1/object/sign/<bucket_name>/<file_path>?token=...
    const pathSegments = url.pathname.split('/');

    let bucketNameIndex = -1;
    if (pathSegments.includes('public')) {
      bucketNameIndex = pathSegments.indexOf('public') + 1;
    } else if (pathSegments.includes('sign')) {
      bucketNameIndex = pathSegments.indexOf('sign') + 1;
    }

    if (bucketNameIndex === -1 || bucketNameIndex >= pathSegments.length) {
      logger.error({ publicUrl }, 'Could not determine bucket name from Supabase URL.');
      return null;
    }

    const bucketName = pathSegments[bucketNameIndex];
    const filePath = pathSegments.slice(bucketNameIndex + 1).join('/');

    if (!bucketName || !filePath) {
      logger.error({ publicUrl, bucketName, filePath }, 'Invalid bucket name or file path extracted.');
      return null;
    }
    return { bucketName, filePath };
  } catch (error) {
    logger.error({ error, publicUrl }, 'Failed to parse Supabase storage URL.');
    return null;
  }
}

/**
 * Downloads a file from Supabase storage as a Buffer.
 * @param bucketName - The name of the Supabase storage bucket.
 * @param filePath - The path to the file within the bucket.
 * @returns A Promise that resolves to a Buffer containing the file data.
 * @throws Will throw an error if the download fails.
 */
export async function downloadFileAsBuffer(bucketName: string, filePath: string): Promise<Buffer> {
  logger.info({ bucketName, filePath }, 'Attempting to download file from Supabase storage.');
  const { data, error } = await supabaseAdmin.storage
    .from(bucketName)
    .download(filePath);

  if (error) {
    logger.error({ error, bucketName, filePath }, 'Error downloading file from Supabase storage.');
    throw error;
  }

  if (!data) {
    logger.error({ bucketName, filePath }, 'No data received when downloading file from Supabase storage.');
    throw new Error('No data received from Supabase storage download.');
  }

  // Convert Blob to Buffer
  const arrayBuffer = await data.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  logger.info({ bucketName, filePath, size: buffer.length }, 'File downloaded successfully as buffer.');
  return buffer;
}
