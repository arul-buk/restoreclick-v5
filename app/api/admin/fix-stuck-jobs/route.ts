import { NextRequest, NextResponse } from 'next/server';
import { restorationWorker } from '@/lib/workers/restoration-worker';
import { getRestorationJobsByStatus } from '@/lib/db/restoration-jobs';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    logger.info('Manual fix for stuck jobs triggered');
    
    // Get all processing jobs
    const processingJobs = await getRestorationJobsByStatus('processing');
    
    if (processingJobs.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: 'No processing jobs found',
        jobsFound: 0
      });
    }

    logger.info({ jobCount: processingJobs.length }, 'Found processing jobs to check');

    // Manually trigger the worker to check these jobs
    for (const job of processingJobs) {
      try {
        // Use the private method via reflection to check job status
        await (restorationWorker as any).pollJobStatus(job);
        logger.info({ jobId: job.id }, 'Manually checked job status');
      } catch (error) {
        logger.error({ error, jobId: job.id }, 'Failed to check job status');
      }
    }

    return NextResponse.json({ 
      success: true,
      message: `Checked ${processingJobs.length} processing jobs`,
      jobsChecked: processingJobs.length,
      jobs: processingJobs.map(job => ({
        id: job.id,
        external_job_id: job.external_job_id,
        status: job.status,
        updated_at: job.updated_at
      }))
    });
    
  } catch (error) {
    logger.error({ error }, 'Failed to fix stuck jobs');
    return NextResponse.json({ 
      error: 'Failed to fix stuck jobs',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
