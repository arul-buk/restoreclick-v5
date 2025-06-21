'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  OrderRestorationPoller, 
  OrderPollingStatus, 
  OrderPhoto,
  getOrderIdFromCheckoutSession 
} from '@/lib/order-restoration-data';
import { trackPageView } from '@/lib/analytics';

export default function ProcessingPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [pollingStatus, setPollingStatus] = useState<'loading' | 'processing' | 'completed' | 'error'>('loading');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(120); // 2 minutes default

  useEffect(() => {
    trackPageView('Processing Page');
  }, []);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId) {
      router.push('/');
      return;
    }

    const initializeProcessing = async () => {
      try {
        const orderIdResult = await getOrderIdFromCheckoutSession(sessionId);
        if (!orderIdResult) {
          setPollingStatus('error');
          return;
        }
        setOrderId(orderIdResult);
        startPolling(orderIdResult);
      } catch (error) {
        console.error('Error getting order ID:', error);
        setPollingStatus('error');
      }
    };

    initializeProcessing();
  }, [searchParams, router]);

  useEffect(() => {
    // Timer for elapsed time
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const startPolling = (orderIdToUse: string) => {
    const poller = new OrderRestorationPoller(orderIdToUse, {
      onProgress: (status: OrderPollingStatus) => {
        setPollingStatus('processing');
        setProgress(status.progressPercentage);
        
        // Estimate remaining time based on progress
        if (status.progressPercentage > 0) {
          const avgTimePerPercent = timeElapsed / status.progressPercentage;
          const remainingPercent = 100 - status.progressPercentage;
          setEstimatedTimeRemaining(Math.round(avgTimePerPercent * remainingPercent));
        }
      },
      onComplete: (photos: OrderPhoto[]) => {
        console.log('Processing complete, received photos:', photos);
        
        // Verify we have successfully completed photos with restored URLs
        const completedPhotos = photos.filter(photo => 
          photo.status === 'completed' && photo.restoredUrl
        );
        
        console.log(`Completed photos with restored URLs: ${completedPhotos.length}/${photos.length}`);
        
        setPollingStatus('completed');
        
        // Only redirect if we have at least one successfully completed photo
        if (completedPhotos.length > 0) {
          const sessionId = searchParams.get('session_id');
          console.log('Redirecting to payment-success with completed photos');
          router.push(`/payment-success?session_id=${sessionId}`);
        } else {
          console.error('No completed photos found, redirecting to processing-failed page');
          const sessionId = searchParams.get('session_id');
          router.push(`/processing-failed?session_id=${sessionId}`);
        }
      },
      onError: (error: Error) => {
        console.error('Polling error:', error);
        // Redirect to processing failed page instead of showing error state
        const sessionId = searchParams.get('session_id');
        router.push(`/processing-failed?session_id=${sessionId}`);
      }
    });

    poller.startPolling();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusMessage = () => {
    switch (pollingStatus) {
      case 'loading':
        return 'Preparing your photos for restoration...';
      case 'processing':
        return 'Restoring your photos with AI...';
      case 'completed':
        return 'Restoration complete! Redirecting...';
      case 'error':
        return 'Something went wrong during processing.';
      default:
        return 'Processing...';
    }
  };

  const getProgressMessage = () => {
    if (pollingStatus === 'processing' && progress > 0) {
      return `${progress}% complete`;
    }
    return '';
  };

  return (
    <div className="min-h-screen bg-brand-background text-brand-text flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-soft p-8 text-center">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-brand-text mb-2">
            Restoring Your Photos
          </h1>
          <p className="text-brand-text/80 leading-relaxed">
            Please don't leave this page while we restore your photos
          </p>
        </div>

        {/* Processing Animation */}
        <div className="mb-8">
          {pollingStatus === 'error' ? (
            <div className="w-20 h-20 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
          ) : (
            <div className="relative w-20 h-20 mx-auto mb-4">
              <div className="absolute inset-0 border-4 border-brand-accent/30 rounded-full"></div>
              <div 
                className="absolute inset-0 border-4 border-brand-cta rounded-full animate-spin"
                style={{
                  borderTopColor: 'transparent',
                  borderRightColor: 'transparent',
                }}
              ></div>
              {pollingStatus === 'processing' && progress > 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-semibold text-brand-cta">
                    {progress}%
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status Message */}
        <div className="mb-6">
          <p className="text-lg font-medium text-brand-text mb-2">
            {getStatusMessage()}
          </p>
          {getProgressMessage() && (
            <p className="text-sm text-brand-cta font-medium">
              {getProgressMessage()}
            </p>
          )}
        </div>

        {/* Progress Bar */}
        {pollingStatus === 'processing' && (
          <div className="mb-6">
            <div className="w-full bg-brand-accent/20 rounded-full h-2">
              <div 
                className="bg-brand-cta h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Time Information */}
        <div className="text-sm text-brand-text/60 space-y-1">
          <p>Time elapsed: {formatTime(timeElapsed)}</p>
          {pollingStatus === 'processing' && estimatedTimeRemaining > 0 && (
            <p>Estimated time remaining: {formatTime(estimatedTimeRemaining)}</p>
          )}
        </div>

        {/* Error Actions */}
        {pollingStatus === 'error' && (
          <div className="mt-6 space-y-3">
            <p className="text-red-600 text-sm">
              We encountered an issue processing your photos. Please try again or contact support.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-brand-cta text-white rounded-lg hover:bg-brand-cta/90 transition-colors font-medium"
              >
                Try Again
              </button>
              <button
                onClick={() => router.push('/contact')}
                className="px-4 py-2 border border-brand-text/20 text-brand-text rounded-lg hover:bg-brand-background transition-colors font-medium"
              >
                Contact Support
              </button>
            </div>
          </div>
        )}

        {/* Tips */}
        {pollingStatus === 'processing' && (
          <div className="mt-8 p-4 bg-brand-accent/10 rounded-lg border border-brand-accent/20">
            <p className="text-xs text-brand-text/80 leading-relaxed">
              💡 <strong>Tip:</strong> The restoration process typically takes 1-3 minutes per photo. 
              Severely damaged photos may take longer to process.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
