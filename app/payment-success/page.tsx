"use client";

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import RestoredPhotoCard from '@/components/restoration/restored-photo-card';
import EmailConfirmationModal from '@/components/restoration/email-confirmation-modal';
import ImageModal from '@/components/shared/image-modal';
import BeforeAfterSlider from '@/components/restoration/before-after-slider';
import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';


// This type represents the data structure used within this component for rendering
interface LivePrediction {
  id: string; // DB prediction ID (UUID)
  order_id: string;
  replicate_id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  input_image_url?: string | null;
  output_image_url?: string | null; // This will hold the final Supabase URL
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

// This type represents the raw data fetched from the polling API
interface ApiPredictionResponse {
  id: string; // This is the replicate_id
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string | null; // This is the supabase URL from the backend
  error?: string | null;
}

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const batchId = searchParams.get('batch_id');


  const [livePredictions, setLivePredictions] = useState<LivePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("Verifying your order details...");
  const [overallError, setOverallError] = useState<string | null>(null);

  // State for the email confirmation modal
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [currentPhotoSrcForDownload, setCurrentPhotoSrcForDownload] = useState<string | null>(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  // State for the image comparison modal
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [modalBeforeSrc, setModalBeforeSrc] = useState("");
  const [modalAfterSrc, setModalAfterSrc] = useState("");
  const [modalAltText, setModalAltText] = useState("");

  // Ref to hold the polling interval IDs
  const intervalRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Effect for fetching initial prediction data based on batchId
  useEffect(() => {
    if (!batchId) {
      setOverallError('Missing batch identifier.');
      setIsLoading(false);
      return;
    }

    // Reset state for new batch ID
    setIsLoading(true);
    setOverallError(null);
    setLivePredictions([]);
    setStatusMessage('Fetching your restoration details...');

    const fetchInitialPredictions = async () => {
      let attempts = 0;
      const maxAttempts = 5;
      const initialDelay = 1000; // 1 second

      while (attempts < maxAttempts) {
        try {
          const response = await fetch(`/api/predictions/by-batch/${batchId}`);

          if (response.ok) {
            const data: LivePrediction[] = await response.json();
            if (data && data.length > 0) {
              setLivePredictions(data);
              setOverallError(null);
              setIsLoading(false);
              return; // Success, exit the loop
            }
            // If data is empty, it might be a transient state. Let's retry.
            setStatusMessage('Order found, waiting for restorations to be linked...');
          } else if (response.status === 404) {
            // This is the expected case during the race condition
            setStatusMessage(`Waiting for order processing (attempt ${attempts + 1}/${maxAttempts})...`);
          } else {
            // Handle other server errors
            const errorData = await response.json().catch(() => ({ error: 'An unknown server error occurred.' }));
            setOverallError(errorData.error || `An error occurred: ${response.statusText}`);
            setIsLoading(false);
            return; // Exit on non-404 server errors
          }
        } catch (error) {
          console.error(`Attempt ${attempts + 1} failed:`, error);
          setOverallError('An unexpected network error occurred. Retrying...');
        }

        attempts++;
        if (attempts < maxAttempts) {
          const delay = initialDelay * Math.pow(2, attempts - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          setOverallError('Could not retrieve your order details after several attempts. Please refresh the page or contact support.');
          setStatusMessage('Failed to load details.');
          setIsLoading(false);
        }
      }
    };

    fetchInitialPredictions();

    // Cleanup function to clear all intervals when batchId changes
    return () => {
      console.log('[Polling] Cleaning up all intervals on batchId change.');
      for (const id in intervalRef.current) {
        clearInterval(intervalRef.current[id]);
      }
      intervalRef.current = {};
    };
  }, [batchId]);

  // Effect for polling individual prediction statuses
  useEffect(() => {
    livePredictions.forEach(prediction => {
      // Only start polling if the prediction is in a non-final state and not already being polled.
      if ((prediction.status === 'starting' || prediction.status === 'processing') && !intervalRef.current[prediction.id]) {
        console.log(`[Polling] Starting for prediction: ${prediction.id}`);
        intervalRef.current[prediction.id] = setInterval(async () => {
          console.log(`[Polling] Checking prediction: ${prediction.id} (Replicate ID: ${prediction.replicate_id})`);
          try {
            const response = await fetch(`/api/replicate/predictions/${prediction.replicate_id}`);
            const data: ApiPredictionResponse = await response.json();

            if (response.ok) {
              // Stop polling if the prediction has reached a final state.
              if (data.status === 'succeeded' || data.status === 'failed' || data.status === 'canceled') {
                console.log(`[Polling] Final status ${data.status} for prediction: ${prediction.id}. Stopping poll.`);
                clearInterval(intervalRef.current[prediction.id]);
                delete intervalRef.current[prediction.id];
              }
              
              // Update the prediction in our state.
              setLivePredictions(prev => prev.map(p => 
                p.replicate_id === data.id 
                  ? { ...p, status: data.status, output_image_url: data.output, error_message: data.error } 
                  : p
              ));
            } else {
              // If the API returns an error, log it and stop polling for this prediction.
              console.error(`[Polling] API error for prediction ${prediction.replicate_id}:`, data.error);
              clearInterval(intervalRef.current[prediction.id]);
              delete intervalRef.current[prediction.id];
            }
          } catch (error) {
            console.error(`Error during polling for prediction ${prediction.replicate_id}:`, error);
            // Stop polling on network or parsing errors
            clearInterval(intervalRef.current[prediction.id]);
            delete intervalRef.current[prediction.id];
          }
        }, 5000); // Poll every 5 seconds
      }
    });

    // Cleanup function: This runs on component unmount or when livePredictions changes.
    // It's crucial for stopping polling for predictions that are now finalized.
    return () => {
      for (const predictionId in intervalRef.current) {
        const prediction = livePredictions.find(p => p.id === predictionId);
        // If a prediction is no longer in the list or has finished, clear its interval.
        if (!prediction || prediction.status === 'succeeded' || prediction.status === 'failed' || prediction.status === 'canceled') {
          console.log(`[Polling] Cleaning up finalized prediction: ${predictionId}`);
          clearInterval(intervalRef.current[predictionId]);
          delete intervalRef.current[predictionId];
        }
      }
    };
  }, [livePredictions]);

  // Effect to update the overall status message based on current predictions
  useEffect(() => {
    if (livePredictions.length === 0) {
      if (!isLoading && !overallError) {
        // This state can happen if the initial fetch is done but returns no predictions
        setStatusMessage('No restorations were found for this order.');
      }
      return;
    }

    const SucceededCount = livePredictions.filter(p => p.status === 'succeeded').length;
    const FailedCount = livePredictions.filter(p => p.status === 'failed').length;
    const CanceledCount = livePredictions.filter(p => p.status === 'canceled').length;
    const ProcessingCount = livePredictions.filter(p => p.status === 'processing' || p.status === 'starting').length;
    const TotalCount = livePredictions.length;

    if (ProcessingCount > 0) {
      setStatusMessage(`Restoring your memories... (${SucceededCount + FailedCount + CanceledCount}/${TotalCount} complete)`);
    } else if (SucceededCount + FailedCount + CanceledCount === TotalCount) {
      setStatusMessage(`Processing complete. ${SucceededCount} succeeded, ${FailedCount} failed.`);
    } else {
      setStatusMessage('Updating restoration statuses...');
    }
  }, [livePredictions, isLoading, overallError]);

  const handleDownloadClick = (photoSrc: string | null, downloadAll: boolean) => {
    // User is not signed in, open the email confirmation modal for guest checkout
    setCurrentPhotoSrcForDownload(photoSrc);
    setIsDownloadingAll(downloadAll);
    setIsEmailModalOpen(true);
  };

  const handleEmailModalClose = () => {
    setIsEmailModalOpen(false);
    setCurrentPhotoSrcForDownload(null);
    setIsDownloadingAll(false);
  };

  const handleConfirmDownload = (email: string, targetSrc: string | string[]) => {
    // Here you would typically call an API to send the download link(s) to the user's email.
    console.log(`Emailing download links for: ${targetSrc} to ${email}`);
  };

  const handleImageClick = (beforeSrc: string, afterSrc: string, alt: string) => {
    setModalBeforeSrc(beforeSrc);
    setModalAfterSrc(afterSrc);
    setModalAltText(alt);
    setIsImageModalOpen(true);
  };

  const handleImageModalClose = () => {
    setIsImageModalOpen(false);
    setModalBeforeSrc("");
    setModalAfterSrc("");
    setModalAltText("");
  };

  // Render different UI based on loading, error, or success states
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-brand-background text-brand-text p-6 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-brand-primary mb-6" />
        <h1 className="font-serif text-3xl font-bold text-brand-text mb-2">
          Loading Your Restorations
        </h1>
        <p className="text-lg text-brand-text/80 max-w-md">
          {statusMessage}
        </p>
      </div>
    );
  }

  if (overallError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-brand-background text-brand-text p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-6" />
        <h1 className="font-serif text-3xl font-bold text-brand-text mb-2">
          An Error Occurred
        </h1>
        <p className="text-lg text-brand-text/80 max-w-md mb-6">{overallError}</p>
        <Link href="/">
          <Button variant="outline">Return to Homepage</Button>
        </Link>
      </div>
    );
  }

  // Main content rendering logic
  return (
    <div className="bg-brand-background text-brand-text min-h-screen py-16">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="text-center mb-12">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h1 className="font-serif text-4xl lg:text-5xl font-bold text-brand-text mb-4">
            {livePredictions.every(p => p.status === 'succeeded') 
              ? "Success! Your Photos Are Restored."
              : "Restorations In Progress..."}
          </h1>
          <p className="text-lg text-brand-text/80 max-w-2xl mx-auto leading-relaxed">
            Thank you for your trust. Your precious memories are being meticulously restored.
            A detailed receipt has been sent to your email address.
          </p>
          <p className="text-xl text-brand-primary/90 max-w-md mt-4 animate-pulse">{statusMessage}</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {livePredictions.map((prediction) => (
            <RestoredPhotoCard
              key={prediction.id} 
              photo={{
                id: prediction.id,
                beforeSrc: prediction.input_image_url || `/placeholder.svg?width=400&height=300&text=Original`,
                afterSrc: prediction.output_image_url || 
                          (prediction.status === 'succeeded' 
                            ? `/placeholder.svg?width=400&height=300&text=Restored` 
                            : (prediction.status === 'processing' || prediction.status === 'starting')
                              ? `/placeholder.svg?width=400&height=300&text=Processing`
                              : `/placeholder.svg?width=400&height=300&text=${prediction.status}`),
                title: `Photo ID: ${prediction.id.substring(0,8)}...`,
                description: `Status: ${prediction.status}${(prediction.status === 'processing' || prediction.status === 'starting') ? '...' : ''}`,
              }}
              onDownloadClick={() => prediction.output_image_url && prediction.status === 'succeeded' ? handleDownloadClick(prediction.output_image_url, false) : null}
              onImageClick={() => prediction.input_image_url && prediction.output_image_url && prediction.status === 'succeeded' ? handleImageClick(
                prediction.input_image_url, 
                prediction.output_image_url, 
                `Restoration for ${prediction.id.substring(0,8)}`
              ) : null}
            />
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            size="lg" 
            className="text-lg px-8 py-6"
            onClick={() => handleDownloadClick(null, true)}
            disabled={livePredictions.some(p => p.status !== 'succeeded') || livePredictions.length === 0}
          >
            Download All Restorations
          </Button>
          <Button variant="outline" size="lg" className="text-lg px-8 py-6" asChild>
            <Link href="/">Return to Homepage</Link>
          </Button>
        </div>
      </div>

      <EmailConfirmationModal
        isOpen={isEmailModalOpen}
        onClose={handleEmailModalClose}
        onConfirmDownload={handleConfirmDownload}
        downloadTargetSrc={currentPhotoSrcForDownload}
        isDownloadingAll={isDownloadingAll}
        allPhotoSrcs={livePredictions.filter(p => p.status === 'succeeded' && p.output_image_url).map(p => p.output_image_url!)}
        isSignedIn={false}
      />

      <ImageModal isOpen={isImageModalOpen} onClose={handleImageModalClose}>
        <div className="w-full h-full flex items-center justify-center p-4">
          {modalBeforeSrc && modalAfterSrc && (
            <BeforeAfterSlider beforeSrc={modalBeforeSrc} afterSrc={modalAfterSrc} alt={modalAltText} />
          )}
        </div>
      </ImageModal>
    </div>
  );
}
