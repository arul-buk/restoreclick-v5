'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import InteractiveViewer from '@/components/restoration/InteractiveViewer';
import ActionPanel from '@/components/restoration/ActionPanel';
import ThumbnailGallery from '@/components/restoration/ThumbnailGallery';
import ShareModal from '@/components/restoration/ShareModal';
import EmailModal from '@/components/restoration/EmailModal';
import ProcessingOverlay from '@/components/restoration/ProcessingOverlay';
import ProcessingError from '@/components/restoration/ProcessingError';
import { RestorationPoller, Photo, PollingStatus, retryFailedPredictions } from '@/lib/restoration-data';

interface ProcessedPhoto {
  id: string;
  originalUrl: string;
  restoredUrl: string;
}

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const batchId = searchParams.get('batch_id');

  const [photos, setPhotos] = useState<ProcessedPhoto[]>([]);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);
  const [pollingStatus, setPollingStatus] = useState<PollingStatus | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isShareLoading, setIsShareLoading] = useState(false);
  const [showProcessingError, setShowProcessingError] = useState(false);
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const [timedOutImages, setTimedOutImages] = useState<string[]>([]);
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [poller, setPoller] = useState<RestorationPoller | null>(null);

  // Filter photos to only include successfully processed ones
  const getProcessedPhotos = (allPhotos: Photo[]): ProcessedPhoto[] => {
    return allPhotos
      .filter((photo): photo is Photo & { restoredUrl: string } => 
        photo.status === 'succeeded' && photo.restoredUrl !== null
      )
      .map(photo => ({
        id: photo.id,
        originalUrl: photo.originalUrl,
        restoredUrl: photo.restoredUrl
      }));
  };

  const handlePollingProgress = useCallback((status: PollingStatus) => {
    setPollingStatus(status);
    
    // Update failed and timed out images
    setFailedImages(prev => {
      const newFailed = status.processingImages.length === 0 && status.completedImages < status.totalImages
        ? [...prev] // Keep existing failed images
        : prev.filter(id => !status.processingImages.includes(id)); // Remove if now processing
      return newFailed;
    });
    setTimedOutImages(status.timedOutImages);
  }, []);

  const handlePollingComplete = useCallback((allPhotos: Photo[]) => {
    const processedPhotos = getProcessedPhotos(allPhotos);
    const failed = allPhotos.filter(p => p.status === 'failed').map(p => p.id);
    const timedOut = allPhotos.filter(p => 
      (p.status === 'starting' || p.status === 'processing') && 
      pollingStatus?.timedOutImages.includes(p.id)
    ).map(p => p.id);

    setPhotos(processedPhotos);
    setFailedImages(failed);
    setTimedOutImages(timedOut);
    setIsPolling(false);
    setIsLoading(false);

    // Show error state if there are failures or timeouts
    if (failed.length > 0 || timedOut.length > 0) {
      setShowProcessingError(true);
    }
  }, [pollingStatus]);

  const handlePollingError = useCallback((error: Error) => {
    console.error('Polling error:', error);
    setError(error.message);
    setIsPolling(false);
    setIsLoading(false);
  }, []);

  const startPolling = useCallback(async (batchId: string) => {
    // Stop any existing polling first
    if (poller) {
      console.log('Stopping existing poller before starting new one');
      poller.stopPolling();
    }

    setIsLoading(true);
    setIsPolling(true);
    setError(null);
    setShowProcessingError(false);

    const newPoller = new RestorationPoller(batchId, {
      onProgress: handlePollingProgress,
      onComplete: handlePollingComplete,
      onError: handlePollingError,
    });

    setPoller(newPoller);

    try {
      await newPoller.startPolling();
    } catch (error) {
      console.error('Failed to start polling:', error);
      
      // Check if it's a connection error
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        setError('Unable to connect to server. Please check your connection and try again.');
      } else {
        setError('Failed to start monitoring photo processing');
      }
      
      setIsLoading(false);
      setIsPolling(false);
    }
  }, [handlePollingProgress, handlePollingComplete, handlePollingError, poller]);

  const handleRetryFailed = useCallback(async () => {
    const allFailedIds = [...failedImages, ...timedOutImages];
    if (allFailedIds.length === 0 || !batchId) return;

    setIsRetrying(true);
    try {
      await retryFailedPredictions(allFailedIds);
      // Restart polling for the batch
      await startPolling(batchId);
    } catch (error) {
      console.error('Failed to retry predictions:', error);
      setError('Failed to retry failed photos');
    } finally {
      setIsRetrying(false);
    }
  }, [failedImages, timedOutImages, batchId, startPolling]);

  const handleContinueWithoutFailed = useCallback(() => {
    setShowProcessingError(false);
    setFailedImages([]);
    setTimedOutImages([]);
  }, []);

  const handleCancelProcessing = useCallback(() => {
    if (poller) {
      poller.stopPolling();
    }
    setIsPolling(false);
    setIsLoading(false);
    setError('Processing was cancelled by user');
  }, [poller]);

  const handleShareWithFamily = async (formData: {
    recipientName: string;
    recipientEmail: string;
    message: string;
  }) => {
    setIsShareLoading(true);
    try {
      const photoUrls = photos.map(photo => photo.restoredUrl);
      console.log('handleShareWithFamily: Attempting to send photo links with data:', { email: formData.recipientEmail, photoUrls, actionType: 'share', recipientName: formData.recipientName, message: formData.message });
      
      const response = await fetch('/api/send-photo-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.recipientEmail,
          photoUrls,
          actionType: 'share',
          recipientName: formData.recipientName,
          message: formData.message,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        console.error('handleShareWithFamily: API response not OK:', response.status, response.statusText, errorBody);
        throw new Error(`Failed to send email: ${errorBody.error || response.statusText}`);
      }

      // Success - close modal and show success message
      setShowShareModal(false);
      // You could add a toast notification here
      console.log('handleShareWithFamily: Photos shared successfully!');
      console.log('handleShareWithFamily: Share modal should now close.');
    } catch (error: any) { // Cast error to any to access message
      console.error('handleShareWithFamily: Error sharing photos:', error);
      console.log('handleShareWithFamily: Error occurred while sharing photos:', error.message);
      // You could add error toast notification here
    } finally {
      setIsShareLoading(false);
      console.log('handleShareWithFamily: Share loading state reset to false.');
    }
  };

  const handleSendToMyEmail = async (email: string, message?: string) => {
    setIsEmailLoading(true);
    try {
      const photoUrls = photos.map(photo => photo.restoredUrl);
      
      const response = await fetch('/api/send-photo-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          photoUrls,
          actionType: 'download',
          message,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      // Success - close modal and show success message
      setShowEmailModal(false);
      // You could add a toast notification here
      console.log('Photos sent to email successfully!');
    } catch (error) {
      console.error('Error sending photos to email:', error);
      // You could add error toast notification here
    } finally {
      setIsEmailLoading(false);
    }
  };

  // Initialize polling on mount
  useEffect(() => {
    if (batchId && !poller) {
      console.log(`Initializing polling for batch ${batchId}`);
      startPolling(batchId);
    } else if (!batchId) {
      setError('No batch ID provided');
      setIsLoading(false);
    }

    // Cleanup on unmount
    return () => {
      if (poller) {
        console.log('Cleaning up poller on unmount');
        poller.stopPolling();
      }
    };
  }, [batchId, startPolling, poller]);

  // Show processing overlay while polling
  if (isPolling && pollingStatus) {
    const maxTimeForBatch = pollingStatus.totalImages * 120000; // 2 minutes per image
    return (
      <ProcessingOverlay
        totalImages={pollingStatus.totalImages}
        currentImage={pollingStatus.currentImage}
        completedImages={pollingStatus.completedImages}
        elapsedTime={pollingStatus.elapsedTime}
        maxTime={maxTimeForBatch}
        onCancel={handleCancelProcessing}
      />
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your restored photos...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && photos.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => batchId && startPolling(batchId)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show no photos found state
  if (photos.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Restored Photos Found</h2>
            <p className="text-gray-600 mb-4">
              We couldn't find any successfully restored photos for this batch. This might be because:
            </p>
            <ul className="text-sm text-gray-500 text-left mb-4 space-y-1">
              <li>• The photos are still being processed</li>
              <li>• There was an issue with the restoration process</li>
              <li>• The batch ID is invalid</li>
            </ul>
            <button
              onClick={() => batchId && startPolling(batchId)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors mr-2"
            >
              Check Again
            </button>
            <a
              href="/"
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
            >
              Go Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  const activePhoto = photos[activePhotoIndex];

  // Main content
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header Section */}
        <div className="text-center mb-12">
          <svg className="w-16 h-16 text-yellow-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Your Memories are Ready!
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            We've carefully restored your photo(s). Drag the slider below to see the magic!
          </p>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Interactive Viewer - Takes up 2 columns on desktop */}
          <div className="lg:col-span-2">
            {activePhoto && (
              <InteractiveViewer
                photo={{
                  originalUrl: activePhoto.originalUrl,
                  restoredUrl: activePhoto.restoredUrl
                }}
              />
            )}
          </div>

          {/* Action Panel - Takes up 1 column on desktop */}
          <div className="lg:col-span-1">
            {activePhoto && (
              <ActionPanel
                activePhoto={{
                  id: activePhoto.id,
                  restoredUrl: activePhoto.restoredUrl
                }}
                allPhotos={photos.map(photo => ({
                  id: photo.id,
                  restoredUrl: photo.restoredUrl
                }))}
                onShareClick={() => {
                  setShowShareModal(true);
                  console.log('showShareModal set to true');
                }}
                onSendToMyEmailClick={() => setShowEmailModal(true)}
                isLoading={isRetrying}
              />
            )}
          </div>
        </div>

        {/* Thumbnail Gallery Area */}
        {photos.length > 1 && (
          <div className="mb-12">
            <ThumbnailGallery
              photos={photos.map(photo => ({
                id: photo.id,
                restoredUrl: photo.restoredUrl
              }))}
              activePhotoId={activePhoto?.id || ''}
              onThumbnailClick={(photoId: string) => setActivePhotoIndex(photos.findIndex(p => p.id === photoId))}
            />
          </div>
        )}

        {/* Re-engagement Section */}
        <div className="text-center bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Love the results?
          </h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Bring more of your precious memories back to life. Our AI-powered restoration 
            technology can help you preserve your family's history for generations to come.
          </p>
          <a
            href="/"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Restore More Photos
          </a>
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        onSend={handleShareWithFamily}
        recipientName={''}
        recipientEmail={''}
        message={''}
        isLoading={isShareLoading}
      />

      {/* Email Modal */}
      <EmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onSend={handleSendToMyEmail}
        isLoading={isEmailLoading}
      />

      {/* Processing Error Modal */}
      {showProcessingError && (
        <ProcessingError
          failedImages={failedImages}
          timedOutImages={timedOutImages}
          onRetry={handleRetryFailed}
          onContinue={handleContinueWithoutFailed}
        />
      )}
    </div>
  );
}
