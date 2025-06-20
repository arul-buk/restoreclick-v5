// lib/workers/worker-manager.ts
import { restorationWorker } from './restoration-worker';
import { emailWorker } from './email-worker';
import logger from '@/lib/logger';

export class WorkerManager {
  private isStarted = false;

  start() {
    if (this.isStarted) {
      logger.warn('Worker manager is already started');
      return;
    }

    logger.info('Starting worker manager');
    
    // Start both workers
    restorationWorker.start();
    emailWorker.start();
    
    this.isStarted = true;
    logger.info('Worker manager started successfully');
  }

  stop() {
    if (!this.isStarted) {
      return;
    }

    logger.info('Stopping worker manager');
    
    // Stop both workers
    restorationWorker.stop();
    emailWorker.stop();
    
    this.isStarted = false;
    logger.info('Worker manager stopped');
  }

  getStatus() {
    return {
      isStarted: this.isStarted,
      workers: {
        restoration: restorationWorker,
        email: emailWorker
      }
    };
  }
}

// Export singleton instance
export const workerManager = new WorkerManager();

// Auto-start workers in production
if (process.env.NODE_ENV === 'production' || process.env.AUTO_START_WORKERS === 'true') {
  console.log(`[${new Date().toISOString()}] AUTO-STARTING WORKERS - NODE_ENV: ${process.env.NODE_ENV}, AUTO_START_WORKERS: ${process.env.AUTO_START_WORKERS}`);
  workerManager.start();
} else {
  console.log(`[${new Date().toISOString()}] WORKERS NOT AUTO-STARTED - NODE_ENV: ${process.env.NODE_ENV}, AUTO_START_WORKERS: ${process.env.AUTO_START_WORKERS}`);
}
