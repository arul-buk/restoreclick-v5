// Data fetching utilities for restoration data

export interface Photo {
  id: string;
  originalUrl: string;
  restoredUrl: string | null;
  status: 'starting' | 'processing' | 'succeeded' | 'failed';
}

export interface PollingStatus {
  totalImages: number;
  completedImages: number;
  failedImages: number;
  currentImage: number;
  elapsedTime: number;
  estimatedTimeRemaining: number;
  timedOutImages: string[];
  processingImages: string[];
}

export interface PollingConfig {
  initialInterval: number; // initial milliseconds between polls
  maxInterval: number; // maximum interval between polls
  backoffMultiplier: number; // multiplier for exponential backoff
  maxDuration: number; // maximum time to poll (2 minutes per image)
  onProgress?: (status: PollingStatus) => void;
  onComplete?: (photos: Photo[]) => void;
  onError?: (error: Error) => void;
}

const INITIAL_POLL_INTERVAL = 1000; // Start with 1 second
const MAX_POLL_INTERVAL = 10000; // Cap at 10 seconds
const BACKOFF_MULTIPLIER = 1.5; // Increase interval by 50% each time
const MAX_POLL_DURATION_PER_IMAGE = 300000; // 5 minutes per image

/**
 * Fetches restoration data for a given batch ID
 * This function adapts the existing API structure to the new component interface
 */
export async function getRestorationData(batchId: string): Promise<{ photos: Photo[] }> {
  try {
    // Use the existing API endpoint that fetches predictions by batch
    const response = await fetch(`/api/predictions/by-batch/${batchId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch restoration data: ${response.statusText}`);
    }
    
    const predictions = await response.json();
    console.log(`[DEBUG] Raw API response for batch ${batchId}:`, predictions);
    
    // Transform the prediction data to match our Photo interface
    const photos: Photo[] = predictions.map((prediction: any) => ({
      id: prediction.id,
      originalUrl: prediction.input_image_url,
      restoredUrl: prediction.output_image_url,
      status: prediction.status,
    }));
    
    console.log(`[DEBUG] Transformed photos for batch ${batchId}:`, photos);
    console.log(`[DEBUG] Photo statuses:`, photos.map(p => `${p.id}: ${p.status}`));
    
    return { photos };
  } catch (error) {
    console.error('Error fetching restoration data:', error);
    throw error;
  }
}

/**
 * Transforms a single prediction to Photo format
 */
export function transformPredictionToPhoto(prediction: any): Photo | null {
  if (prediction.status !== 'succeeded' || !prediction.input_image_url || !prediction.output_image_url) {
    return null;
  }
  
  return {
    id: prediction.id,
    originalUrl: prediction.input_image_url,
    restoredUrl: prediction.output_image_url,
    status: prediction.status,
  };
}

export class RestorationPoller {
  private batchId: string;
  private config: PollingConfig;
  private startTime: number;
  private timeouts: Map<string, number>;
  private pollInterval: NodeJS.Timeout | null = null;
  private isPolling: boolean = false;
  private currentInterval: number;
  private consecutiveNoChanges: number = 0;
  private lastPhotoStates: Map<string, string> = new Map();
  private consecutiveErrors: number = 0;
  private maxConsecutiveErrors: number = 5;
  private errorBackoffMultiplier: number = 2;

  constructor(batchId: string, config: Partial<PollingConfig> = {}) {
    this.batchId = batchId;
    this.config = {
      initialInterval: INITIAL_POLL_INTERVAL,
      maxInterval: MAX_POLL_INTERVAL,
      backoffMultiplier: BACKOFF_MULTIPLIER,
      maxDuration: MAX_POLL_DURATION_PER_IMAGE,
      ...config
    };
    this.startTime = Date.now();
    this.timeouts = new Map();
    this.currentInterval = this.config.initialInterval;
  }

  async startPolling(): Promise<void> {
    if (this.isPolling) {
      console.log('Polling already active, skipping start request');
      return;
    }

    this.isPolling = true;
    this.startTime = Date.now();
    this.currentInterval = this.config.initialInterval;
    this.consecutiveNoChanges = 0;
    this.consecutiveErrors = 0;
    this.lastPhotoStates.clear();

    console.log(`Starting polling for batch ${this.batchId}`);

    return new Promise((resolve, reject) => {
      const poll = async () => {
        if (!this.isPolling) {
          console.log('Polling stopped, aborting poll cycle');
          return;
        }

        try {
          const { photos } = await getRestorationData(this.batchId);
          
          // Reset error count on successful request
          this.consecutiveErrors = 0;
          
          // Check if any photo states have changed
          const hasChanges = this.detectChanges(photos);
          
          let allCompleted = true;
          let hasFailures = false;
          const timedOut: string[] = [];
          const processing: string[] = [];
          const completed: string[] = [];
          const failed: string[] = [];

          console.log(`[DEBUG] Processing ${photos.length} photos for batch ${this.batchId}`);

          for (const photo of photos) {
            console.log(`[DEBUG] Photo ${photo.id}: status=${photo.status}, originalUrl=${!!photo.originalUrl}, restoredUrl=${!!photo.restoredUrl}`);
            
            // Initialize timeout tracking for new photos
            if (!this.timeouts.has(photo.id)) {
              this.timeouts.set(photo.id, Date.now());
            }

            const photoStartTime = this.timeouts.get(photo.id)!;
            const elapsedTime = Date.now() - photoStartTime;

            // Check if photo has timed out
            if (elapsedTime > this.config.maxDuration && 
                (photo.status === 'starting' || photo.status === 'processing')) {
              console.log(`[DEBUG] Photo ${photo.id} timed out after ${elapsedTime}ms`);
              timedOut.push(photo.id);
              hasFailures = true;
              continue;
            }

            // Categorize photos by status
            if (photo.status === 'starting' || photo.status === 'processing') {
              console.log(`[DEBUG] Photo ${photo.id} still processing (${photo.status})`);
              processing.push(photo.id);
              allCompleted = false;
            } else if (photo.status === 'succeeded') {
              console.log(`[DEBUG] Photo ${photo.id} completed successfully`);
              completed.push(photo.id);
            } else if (photo.status === 'failed') {
              console.log(`[DEBUG] Photo ${photo.id} failed`);
              failed.push(photo.id);
              hasFailures = true;
            } else {
              console.log(`[DEBUG] Photo ${photo.id} has unknown status: ${photo.status}`);
            }
          }

          console.log(`[DEBUG] Polling summary: allCompleted=${allCompleted}, completed=${completed.length}, processing=${processing.length}, failed=${failed.length}, timedOut=${timedOut.length}`);

          // Calculate progress
          const totalElapsedTime = Date.now() - this.startTime;
          const completedCount = completed.length;
          const processingCount = processing.length;
          const currentImageIndex = Math.min(completedCount + 1, photos.length);
          
          // Estimate remaining time based on average completion time
          const avgTimePerImage = completedCount > 0 ? totalElapsedTime / completedCount : this.config.maxDuration;
          const estimatedTimeRemaining = processingCount * avgTimePerImage;

          const status: PollingStatus = {
            totalImages: photos.length,
            completedImages: completedCount,
            failedImages: failed.length,
            currentImage: currentImageIndex,
            elapsedTime: totalElapsedTime,
            estimatedTimeRemaining,
            timedOutImages: timedOut,
            processingImages: processing
          };

          // Call progress callback
          if (this.config.onProgress) {
            this.config.onProgress(status);
          }

          // Check if polling should stop - ALL PHOTOS COMPLETED OR FAILED
          if (allCompleted || (timedOut.length + failed.length === photos.length)) {
            console.log(`[DEBUG] Polling completed: allCompleted=${allCompleted}, failed/timedOut=${timedOut.length + failed.length}/${photos.length}`);
            this.stopPolling();
            
            if (this.config.onComplete) {
              this.config.onComplete(photos);
            }
            
            resolve();
            return;
          }

          console.log(`[DEBUG] Polling continues: ${processingCount} photos still processing`);

          // Adjust polling interval based on activity
          this.adjustPollingInterval(hasChanges);

          // Schedule next poll with current interval
          this.scheduleNextPoll(poll);

        } catch (error) {
          this.consecutiveErrors++;
          console.error(`Polling error (${this.consecutiveErrors}/${this.maxConsecutiveErrors}):`, error);
          
          // Check if we should stop due to too many consecutive errors
          if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
            console.error('Too many consecutive polling errors, stopping polling');
            this.stopPolling();
            
            if (this.config.onError) {
              this.config.onError(error as Error);
            }
            
            reject(error);
            return;
          }

          // Apply exponential backoff for errors
          const errorInterval = this.currentInterval * Math.pow(this.errorBackoffMultiplier, this.consecutiveErrors - 1);
          const cappedErrorInterval = Math.min(errorInterval, this.config.maxInterval);
          
          console.log(`Scheduling retry in ${cappedErrorInterval}ms due to error`);
          this.scheduleNextPoll(poll, cappedErrorInterval);
        }
      };

      // Start polling immediately
      poll();
    });
  }

  private detectChanges(photos: Photo[]): boolean {
    let hasChanges = false;
    
    for (const photo of photos) {
      const currentState = `${photo.id}:${photo.status}`;
      const lastState = this.lastPhotoStates.get(photo.id);
      
      if (lastState !== currentState) {
        hasChanges = true;
        this.lastPhotoStates.set(photo.id, currentState);
      }
    }
    
    return hasChanges;
  }

  private adjustPollingInterval(hasChanges: boolean): void {
    if (hasChanges) {
      // Reset to initial interval when there are changes
      this.currentInterval = this.config.initialInterval;
      this.consecutiveNoChanges = 0;
      console.log(`Changes detected, reset interval to ${this.currentInterval}ms`);
    } else {
      // Increase interval with exponential backoff when no changes
      this.consecutiveNoChanges++;
      if (this.consecutiveNoChanges >= 2) { // Start backing off after 2 consecutive no-change polls
        this.currentInterval = Math.min(
          this.currentInterval * this.config.backoffMultiplier,
          this.config.maxInterval
        );
        console.log(`No changes for ${this.consecutiveNoChanges} polls, increased interval to ${this.currentInterval}ms`);
      }
    }
  }

  private scheduleNextPoll(pollFn: () => Promise<void>, customInterval?: number): void {
    if (this.isPolling) {
      const interval = customInterval || this.currentInterval;
      this.pollInterval = setTimeout(pollFn, interval);
    }
  }

  stopPolling(): void {
    if (!this.isPolling) {
      return;
    }
    
    this.isPolling = false;
    if (this.pollInterval) {
      clearTimeout(this.pollInterval);
      this.pollInterval = null;
    }
    console.log(`Polling stopped for batch ${this.batchId}`);
  }

  isActive(): boolean {
    return this.isPolling;
  }

  getElapsedTime(): number {
    return Date.now() - this.startTime;
  }
}

// Utility function to retry failed predictions
export async function retryFailedPredictions(predictionIds: string[]): Promise<void> {
  try {
    const retryPromises = predictionIds.map(async (predictionId) => {
      const response = await fetch(`/api/replicate/predictions/${predictionId}`, {
        method: 'POST', // Trigger re-processing
      });
      
      if (!response.ok) {
        throw new Error(`Failed to retry prediction ${predictionId}: ${response.statusText}`);
      }
      
      return response.json();
    });

    await Promise.all(retryPromises);
  } catch (error) {
    console.error('Error retrying failed predictions:', error);
    throw error;
  }
}
