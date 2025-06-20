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
import { 
  OrderRestorationPoller, 
  OrderPhoto, 
  OrderPollingStatus, 
  sharePhotos,
  getOrderIdFromCheckoutSession 
} from '@/lib/order-restoration-data';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { trackRestorationComplete, trackPhotoDownload, trackPhotoShare, trackPurchase, trackPageView } from '@/lib/analytics';

interface ProcessedPhoto {
  id: string;
  originalUrl: string;
  restoredUrl: string;
}

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const orderId = searchParams.get('order_id'); // Support direct order ID

  const [photos, setPhotos] = useState<ProcessedPhoto[]>([]);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pollingStatus, setPollingStatus] = useState<OrderPollingStatus | null>(null);
  const [poller, setPoller] = useState<OrderRestorationPoller | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);

  // Modal states
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isProcessingEmailSend, setIsProcessingEmailSend] = useState(false);

  // Initialize data fetching and polling
  useEffect(() => {
    // Track page view
    trackPageView('/payment-success');
    
    const initializeData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Determine order ID from URL parameters
        let resolvedOrderId = orderId;
        
        if (!resolvedOrderId && sessionId) {
          // Try to get order ID from checkout session ID
          resolvedOrderId = await getOrderIdFromCheckoutSession(sessionId);
        }

        if (!resolvedOrderId) {
          setError('No order ID or session ID provided in URL');
          setIsLoading(false);
          return;
        }

        setCurrentOrderId(resolvedOrderId);

        // Create and start order poller
        const orderPoller = new OrderRestorationPoller(resolvedOrderId, {
          onProgress: (status: OrderPollingStatus) => {
            setPollingStatus(status);
            console.log('Order polling progress:', status);
          },
          onComplete: (completedPhotos: OrderPhoto[]) => {
            const processedPhotos = completedPhotos
              .filter(photo => photo.status === 'completed' && photo.restoredUrl)
              .map(photo => ({
                id: photo.id,
                originalUrl: photo.originalUrl,
                restoredUrl: photo.restoredUrl!
              }));
            
            setPhotos(processedPhotos);
            setIsLoading(false);
            
            // Track restoration completion
            if (resolvedOrderId && processedPhotos.length > 0) {
              trackRestorationComplete(resolvedOrderId, processedPhotos.length);
            }
            
            console.log('All order photos completed:', processedPhotos);
          },
          onError: (error: Error) => {
            setError(`Failed to load photos: ${error.message}`);
            setIsLoading(false);
            console.error('Order polling error:', error);
          }
        });

        setPoller(orderPoller);
        await orderPoller.startPolling();

      } catch (err) {
        console.error('Error initializing order data:', err);
        setError('Failed to load your restored photos');
        setIsLoading(false);
      }
    };

    initializeData();

    // Cleanup on unmount
    return () => {
      if (poller) {
        poller.stopPolling();
      }
    };
  }, [sessionId, orderId]);

  // Handle thumbnail clicks
  const handleThumbnailClick = useCallback((photoId: string) => {
    const index = photos.findIndex(photo => photo.id === photoId);
    if (index !== -1) {
      setActivePhotoIndex(index);
    }
  }, [photos]);

  // Handle share modal
  const handleShareClick = useCallback(() => {
    setIsShareModalOpen(true);
  }, []);

  const handleShareModalClose = useCallback(() => {
    setIsShareModalOpen(false);
  }, []);

  const handleShareSend = useCallback(async (formData: { 
    recipientName: string; 
    recipientEmail: string; 
    message: string; 
    sharerName: string 
  }) => {
    if (!currentOrderId) return;

    try {
      setIsProcessingEmailSend(true);
      
      const result = await sharePhotos(currentOrderId, {
        recipientEmail: formData.recipientEmail,
        recipientName: formData.recipientName,
        message: formData.message,
        sharerName: formData.sharerName
      });

      console.log('Photos shared successfully:', result);
      setIsShareModalOpen(false);
      
      // Track photo sharing
      trackPhotoShare('family', photos.length, currentOrderId);
      
      // Show success message (you might want to add a toast notification here)
      alert(`Photos shared successfully with ${formData.recipientEmail}!`);
      
    } catch (error) {
      console.error('Error sharing photos:', error);
      alert('Failed to share photos. Please try again.');
    } finally {
      setIsProcessingEmailSend(false);
    }
  }, [currentOrderId, photos]);

  // Handle email modal
  const handleSendToMyEmailClick = useCallback(() => {
    setIsEmailModalOpen(true);
  }, []);

  const handleEmailModalClose = useCallback(() => {
    setIsEmailModalOpen(false);
  }, []);

  const handleEmailSend = useCallback(async (formData: { 
    recipientEmail: string; 
    message: string 
  }) => {
    if (!currentOrderId) return;

    try {
      setIsProcessingEmailSend(true);
      
      const result = await sharePhotos(currentOrderId, {
        recipientEmail: formData.recipientEmail,
        message: formData.message || 'Here are your restored photos!'
      });

      console.log('Photos emailed successfully:', result);
      setIsEmailModalOpen(false);
      
      // Show success message
      alert(`Photos sent successfully to ${formData.recipientEmail}!`);
      
    } catch (error) {
      console.error('Error sending photos:', error);
      alert('Failed to send photos. Please try again.');
    } finally {
      setIsProcessingEmailSend(false);
    }
  }, [currentOrderId]);

  // Loading state
  if (isLoading) {
    return (
      <ProcessingOverlay
        totalImages={pollingStatus?.totalImages || 1}
        currentImage={pollingStatus?.processingImages || 1}
        completedImages={pollingStatus?.completedImages || 0}
        elapsedTime={pollingStatus?.elapsedTime || 0}
        maxTime={600000} // 10 minutes
      />
    );
  }

  // Error state
  if (error) {
    return (
      <ProcessingError
        failedImages={[]}
        timedOutImages={[]}
        onRetry={() => window.location.reload()}
        onContinue={() => window.location.href = '/pricing'}
      />
    );
  }

  // No photos state
  if (photos.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Photos Found</h1>
          <p className="text-gray-600 mb-6">We couldn't find any restored photos for this order.</p>
          <Button asChild>
            <Link href="/pricing">Return to Pricing</Link>
          </Button>
        </div>
      </div>
    );
  }

  const activePhoto = photos[activePhotoIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 flex items-end justify-center min-h-[120px] sm:min-h-[140px] lg:min-h-[160px]">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
              Your Photos Have Been Restored! 🎉
            </h1>
            <p className="text-base sm:text-lg text-gray-600">
              {photos.length === 1 
                ? 'Your photo has been professionally restored and is ready for download.'
                : `All ${photos.length} of your photos have been professionally restored and are ready for download.`
              }
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Mobile Layout */}
        <div className="lg:hidden space-y-4">
          {/* Interactive Viewer - Mobile */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <InteractiveViewer
              photo={{
                originalUrl: activePhoto.originalUrl,
                restoredUrl: activePhoto.restoredUrl
              }}
            />
          </div>

          {/* Thumbnail Gallery - Mobile */}
          {photos.length > 1 && (
            <ThumbnailGallery
              photos={photos.map(photo => ({
                id: photo.id,
                restoredUrl: photo.restoredUrl
              }))}
              activePhotoId={activePhoto.id}
              onThumbnailClick={handleThumbnailClick}
            />
          )}

          {/* Action Panel - Mobile */}
          <ActionPanel
            activePhoto={{
              id: activePhoto.id,
              restoredUrl: activePhoto.restoredUrl
            }}
            allPhotos={photos.map(photo => ({
              id: photo.id,
              restoredUrl: photo.restoredUrl
            }))}
            onShareClick={handleShareClick}
            onSendToMyEmailClick={handleSendToMyEmailClick}
            isLoading={isProcessingEmailSend}
          />

          {/* Re-engagement Section - Mobile */}
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Love Your Results? 
            </h2>
            <p className="text-gray-600 mb-6">
              We&apos;ve restored your photos with care. Download, share, or send them to yourself!
            </p>
            <Button size="lg" asChild className="w-full">
              <Link href="/pricing">Restore More Photos</Link>
            </Button>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:block">
          <div className="grid grid-cols-12 gap-6">
            {/* Left Column - Photos */}
            <div className="col-span-8 space-y-4">
              {/* Interactive Viewer - Desktop */}
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <InteractiveViewer
                  photo={{
                    originalUrl: activePhoto.originalUrl,
                    restoredUrl: activePhoto.restoredUrl
                  }}
                />
              </div>
              
              {/* Thumbnail Gallery - Desktop */}
              {photos.length > 1 && (
                <div className="flex-shrink-0">
                  <ThumbnailGallery
                    photos={photos.map(photo => ({
                      id: photo.id,
                      restoredUrl: photo.restoredUrl
                    }))}
                    activePhotoId={activePhoto.id}
                    onThumbnailClick={handleThumbnailClick}
                  />
                </div>
              )}

              {/* Re-engagement Section - Desktop */}
              <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Love Your Results? 
                </h2>
                <p className="text-gray-600 mb-8">
                  We&apos;ve restored your photos with care. Download, share, or send them to yourself!
                </p>
                <Button size="lg" asChild>
                  <Link href="/pricing">Restore More Photos</Link>
                </Button>
              </div>
            </div>

            {/* Right Column - Action Panel */}
            <div className="col-span-4">
              <div className="sticky top-8 space-y-6">
                <ActionPanel
                  activePhoto={{
                    id: activePhoto.id,
                    restoredUrl: activePhoto.restoredUrl
                  }}
                  allPhotos={photos.map(photo => ({
                    id: photo.id,
                    restoredUrl: photo.restoredUrl
                  }))}
                  onShareClick={handleShareClick}
                  onSendToMyEmailClick={handleSendToMyEmailClick}
                  isLoading={isProcessingEmailSend}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={handleShareModalClose}
        onSend={handleShareSend}
        recipientName=""
        recipientEmail=""
        message=""
        isLoading={isProcessingEmailSend}
      />

      <EmailModal
        isOpen={isEmailModalOpen}
        onClose={handleEmailModalClose}
        onSend={handleEmailSend}
        isLoading={isProcessingEmailSend}
      />
    </div>
  );
}
