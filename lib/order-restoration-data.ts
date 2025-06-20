// Order-based data fetching utilities for restoration data
// This replaces the batch-based approach with the new order-centric architecture

import { retryApiCall, retryDatabaseOperation } from './utils/retry';

export interface OrderPhoto {
  id: string;
  originalImageId: string;
  originalUrl: string;
  restoredUrl: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  metadata?: any;
}

export interface OrderStatus {
  order: {
    id: string;
    orderNumber: string;
    status: string;
    customerEmail: string;
    totalAmount: number;
    currency: string;
    createdAt: string;
    updatedAt: string;
  };
  restoration: {
    overallStatus: 'pending' | 'processing' | 'completed' | 'failed';
    progressPercentage: number;
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    processingJobs: number;
    restoredImages: Array<{
      id: string;
      originalImageId: string;
      restoredImageUrl: string;
      originalImageUrl?: string;
    }>;
  };
  jobs: Array<{
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    originalImageId: string;
    externalId: string | null;
    errorMessage: string | null;
    createdAt: string;
    updatedAt: string;
    completedAt: string | null;
    metadata: any;
  }>;
}

export interface OrderPollingStatus {
  totalImages: number;
  completedImages: number;
  failedImages: number;
  processingImages: number;
  progressPercentage: number;
  elapsedTime: number;
  estimatedTimeRemaining: number;
  overallStatus: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface OrderPollingConfig {
  initialInterval: number;
  maxInterval: number;
  backoffMultiplier: number;
  maxDuration: number;
  onProgress?: (status: OrderPollingStatus) => void;
  onComplete?: (photos: OrderPhoto[]) => void;
  onError?: (error: Error) => void;
}

// Polling configuration constants - more conservative intervals
const INITIAL_POLL_INTERVAL = 60000; // Start with 60 seconds (1 minute)
const MAX_POLL_INTERVAL = 60000; // Max 60 seconds between polls (1 minute)
const BACKOFF_MULTIPLIER = 1.5; // Gentler backoff
const MAX_POLL_DURATION = 300000; // 5 minutes total timeout
const MAX_CONSECUTIVE_NO_CHANGES = 3; // Increase interval after 3 unchanged polls

/**
 * Fetches order status and restoration data for a given order ID
 */
export async function getOrderStatus(orderId: string): Promise<OrderStatus> {
  return retryApiCall(async () => {
    const response = await fetch(`/api/orders/${orderId}/status`);
    
    if (!response.ok) {
      const error = new Error(`Failed to fetch order status: ${response.statusText}`);
      (error as any).status = response.status;
      throw error;
    }
    
    const orderStatus = await response.json();
    console.log(`[DEBUG] Order status for ${orderId}:`, orderStatus);
    
    return orderStatus;
  }, `getOrderStatus for order ${orderId}`);
}

/**
 * Fetches order predictions/restoration jobs for a given order ID
 */
export async function getOrderPredictions(orderId: string): Promise<{ predictions: any[] }> {
  try {
    const response = await fetch(`/api/orders/${orderId}/predictions`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Order not found');
      }
      throw new Error(`Failed to fetch order predictions: ${response.statusText}`);
    }
    
    const predictions = await response.json();
    console.log(`[DEBUG] Order predictions for ${orderId}:`, predictions);
    
    return { predictions };
  } catch (error) {
    console.error('Error fetching order predictions:', error);
    throw error;
  }
}

/**
 * Transforms order status data to OrderPhoto format for component compatibility
 */
export function transformOrderStatusToPhotos(orderStatus: OrderStatus): OrderPhoto[] {
  const photos: OrderPhoto[] = [];
  
  // Process completed jobs with restored images
  for (const restoredImage of orderStatus.restoration.restoredImages) {
    const job = orderStatus.jobs.find(j => j.originalImageId === restoredImage.originalImageId);
    if (job) {
      photos.push({
        id: job.id,
        originalImageId: restoredImage.originalImageId,
        originalUrl: restoredImage.originalImageUrl || '',
        restoredUrl: restoredImage.restoredImageUrl,
        status: 'completed',
        metadata: job.metadata
      });
    }
  }
  
  // Process other jobs (pending, processing, failed)
  for (const job of orderStatus.jobs) {
    // Skip if already processed as completed
    if (photos.some(p => p.id === job.id)) {
      continue;
    }
    
    const originalUrl = job.metadata?.original_image_url || '';
    photos.push({
      id: job.id,
      originalImageId: job.originalImageId,
      originalUrl,
      restoredUrl: job.metadata?.restored_image_url || null,
      status: job.status,
      metadata: job.metadata
    });
  }
  
  return photos;
}

/**
 * Order-based restoration poller that replaces the batch-based approach
 */
export class OrderRestorationPoller {
  private orderId: string;
  private config: OrderPollingConfig;
  private startTime: number;
  private pollInterval: NodeJS.Timeout | null = null;
  private isPolling: boolean = false;
  private currentInterval: number;
  private consecutiveNoChanges: number = 0;
  private lastStatusHash: string = '';
  private consecutiveErrors: number = 0;
  private maxConsecutiveErrors: number = 5;

  constructor(orderId: string, config: Partial<OrderPollingConfig> = {}) {
    this.orderId = orderId;
    this.config = {
      initialInterval: 5000, // 5 seconds - more conservative
      maxInterval: 30000, // 30 seconds max
      backoffMultiplier: 1.5, // Gentler backoff
      maxDuration: 300000, // 5 minutes total
      ...config
    };
    this.startTime = Date.now();
    this.currentInterval = this.config.initialInterval;
    
    console.log(`[DEBUG] OrderRestorationPoller created for ${orderId} with intervals: ${this.config.initialInterval}ms -> ${this.config.maxInterval}ms`);
  }

  async startPolling(): Promise<void> {
    if (this.isPolling) {
      console.log('Order polling already active, skipping start request');
      return;
    }

    this.isPolling = true;
    this.startTime = Date.now();
    this.currentInterval = this.config.initialInterval;
    this.consecutiveNoChanges = 0;
    this.consecutiveErrors = 0;

    console.log(`[POLLING] Starting order polling for ${this.orderId} with initial interval: ${this.currentInterval}ms`);

    return new Promise((resolve, reject) => {
      const poll = async () => {
        if (!this.isPolling) {
          resolve();
          return;
        }

        try {
          // Check if we've exceeded max duration
          const elapsedTime = this.getElapsedTime();
          if (elapsedTime > this.config.maxDuration) {
            console.log(`[POLLING] Max polling duration (${this.config.maxDuration}ms) exceeded, stopping`);
            this.stopPolling();
            
            if (this.config.onError) {
              this.config.onError(new Error('Polling timeout: Maximum duration exceeded'));
            }
            
            reject(new Error('Polling timeout'));
            return;
          }

          console.log(`[POLLING] Fetching order status for ${this.orderId} (interval: ${this.currentInterval}ms)`);

          // Fetch order status with retry logic
          const orderStatus = await retryApiCall(async () => {
            const response = await fetch(`/api/orders/${this.orderId}/status`);
            if (!response.ok) {
              const error = new Error(`Failed to fetch order status: ${response.statusText}`);
              (error as any).status = response.status;
              throw error;
            }
            return response.json();
          }, `Order status polling for ${this.orderId}`);
          
          // Reset error count on successful fetch
          this.consecutiveErrors = 0;

          // Create status hash to detect changes
          const statusHash = JSON.stringify({
            overallStatus: orderStatus.restoration.overallStatus,
            progressPercentage: orderStatus.restoration.progressPercentage,
            completedJobs: orderStatus.restoration.completedJobs,
            failedJobs: orderStatus.restoration.failedJobs,
            processingJobs: orderStatus.restoration.processingJobs
          });

          const hasChanges = statusHash !== this.lastStatusHash;
          this.lastStatusHash = statusHash;

          // Create polling status for progress callback
          const pollingStatus: OrderPollingStatus = {
            totalImages: orderStatus.restoration.totalJobs,
            completedImages: orderStatus.restoration.completedJobs,
            failedImages: orderStatus.restoration.failedJobs,
            processingImages: orderStatus.restoration.processingJobs,
            progressPercentage: orderStatus.restoration.progressPercentage,
            elapsedTime,
            estimatedTimeRemaining: this.estimateTimeRemaining(orderStatus.restoration),
            overallStatus: orderStatus.restoration.overallStatus
          };

          // Call progress callback
          if (this.config.onProgress) {
            this.config.onProgress(pollingStatus);
          }

          console.log(`[DEBUG] Order ${this.orderId} status:`, {
            overallStatus: orderStatus.restoration.overallStatus,
            progress: `${orderStatus.restoration.completedJobs}/${orderStatus.restoration.totalJobs}`,
            progressPercentage: orderStatus.restoration.progressPercentage,
            hasChanges,
            nextPollIn: `${this.currentInterval}ms`
          });

          // Check if processing is complete
          if (orderStatus.restoration.overallStatus === 'completed' || 
              orderStatus.restoration.overallStatus === 'failed' ||
              orderStatus.restoration.processingJobs === 0) {
            
            console.log(`Order processing complete with status: ${orderStatus.restoration.overallStatus}`);
            this.stopPolling();

            // Transform to photos format and call completion callback
            const photos = transformOrderStatusToPhotos(orderStatus);
            
            if (this.config.onComplete) {
              this.config.onComplete(photos);
            }
            
            resolve();
            return;
          }

          console.log(`[DEBUG] Order polling continues: ${orderStatus.restoration.processingJobs} jobs still processing, next poll in ${this.currentInterval}ms`);

          // Adjust polling interval based on activity
          this.adjustPollingInterval(hasChanges);

          // Schedule next poll
          this.scheduleNextPoll(poll);

        } catch (error) {
          this.consecutiveErrors++;
          console.error(`Order polling error (${this.consecutiveErrors}/${this.maxConsecutiveErrors}):`, error);
          
          if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
            console.error('Too many consecutive polling errors, stopping order polling');
            this.stopPolling();
            
            if (this.config.onError) {
              this.config.onError(error as Error);
            }
            
            reject(error);
            return;
          }

          // Apply exponential backoff for errors
          const errorInterval = this.currentInterval * Math.pow(2, this.consecutiveErrors - 1);
          const cappedErrorInterval = Math.min(errorInterval, this.config.maxInterval);
          
          console.log(`Scheduling order polling retry in ${cappedErrorInterval}ms due to error`);
          this.scheduleNextPoll(poll, cappedErrorInterval);
        }
      };

      // Start polling immediately
      poll();
    });
  }

  private estimateTimeRemaining(restoration: OrderStatus['restoration']): number {
    if (restoration.processingJobs === 0) return 0;
    
    const elapsedTime = this.getElapsedTime();
    const completedJobs = restoration.completedJobs + restoration.failedJobs;
    
    if (completedJobs === 0) {
      // No jobs completed yet, use average time per job (2 minutes)
      return restoration.processingJobs * 120000;
    }
    
    const averageTimePerJob = elapsedTime / completedJobs;
    return Math.round(averageTimePerJob * restoration.processingJobs);
  }

  private adjustPollingInterval(hasChanges: boolean): void {
    if (hasChanges) {
      // Reset to initial interval when there are changes
      this.currentInterval = this.config.initialInterval;
      this.consecutiveNoChanges = 0;
      console.log(`Order changes detected, reset interval to ${this.currentInterval}ms`);
    } else {
      // Increase interval with exponential backoff when no changes
      this.consecutiveNoChanges++;
      if (this.consecutiveNoChanges >= MAX_CONSECUTIVE_NO_CHANGES) {
        this.currentInterval = Math.min(
          this.currentInterval * this.config.backoffMultiplier,
          this.config.maxInterval
        );
        console.log(`No order changes for ${this.consecutiveNoChanges} polls, increased interval to ${this.currentInterval}ms`);
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
    console.log(`Order polling stopped for ${this.orderId}`);
  }

  isActive(): boolean {
    return this.isPolling;
  }

  getElapsedTime(): number {
    return Date.now() - this.startTime;
  }
}

/**
 * Share photos with someone via email
 */
export async function sharePhotos(orderId: string, shareData: {
  recipientEmail: string;
  recipientName?: string;
  message?: string;
  sharerName?: string;
}): Promise<{ success: boolean; message: string; photoCount: number }> {
  try {
    const response = await fetch(`/api/orders/${orderId}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(shareData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to share photos');
    }

    return await response.json();
  } catch (error) {
    console.error('Error sharing photos:', error);
    throw error;
  }
}

/**
 * Download photos as ZIP file
 */
export async function downloadPhotosZip(orderId: string, type: 'all' | 'originals' | 'restored' = 'all'): Promise<{
  success: boolean;
  downloadUrl?: string;
  fileName: string;
  imageCount: number;
  downloadType: string;
  expiresAt: string;
}> {
  try {
    const response = await fetch(`/api/orders/${orderId}/download?type=${type}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create download');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating download:', error);
    throw error;
  }
}

/**
 * Get order ID from Stripe checkout session ID
 * This function helps bridge the gap between the old batch_id approach and new order-based approach
 */
export async function getOrderIdFromCheckoutSession(checkoutSessionId: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/orders/lookup?checkout_session_id=${encodeURIComponent(checkoutSessionId)}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Order not found for checkout session: ${checkoutSessionId}`);
        return null;
      }
      throw new Error(`Failed to lookup order: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`[DEBUG] Order lookup successful:`, data);
    
    return data.orderId;
  } catch (error) {
    console.error('Error getting order ID from checkout session:', error);
    return null;
  }
}
