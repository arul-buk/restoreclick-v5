'use client';

import React from 'react';

interface ProcessingErrorProps {
  failedImages: string[];
  timedOutImages: string[];
  onRetry: () => void;
  onContinue: () => void;
  isRetrying?: boolean;
}

const ProcessingError: React.FC<ProcessingErrorProps> = ({
  failedImages,
  timedOutImages,
  onRetry,
  onContinue,
  isRetrying = false
}) => {
  const totalFailedCount = failedImages.length + timedOutImages.length;
  const hasTimeouts = timedOutImages.length > 0;
  const hasFailures = failedImages.length > 0;

  const getErrorMessage = () => {
    if (hasTimeouts && hasFailures) {
      return `${totalFailedCount} photo(s) couldn't be processed - ${timedOutImages.length} timed out and ${failedImages.length} failed.`;
    } else if (hasTimeouts) {
      return `${timedOutImages.length} photo(s) timed out during processing.`;
    } else {
      return `${failedImages.length} photo(s) failed to process.`;
    }
  };

  const getErrorDescription = () => {
    if (hasTimeouts && hasFailures) {
      return "Some photos took too long to process while others encountered errors. This can happen with very damaged photos or temporary service issues.";
    } else if (hasTimeouts) {
      return "These photos took longer than expected to process. This can happen with severely damaged or very large photos.";
    } else {
      return "These photos encountered processing errors. This can happen with corrupted files or unsupported formats.";
    }
  };

  return (
    <div className="bg-brand-background border border-brand-text/20 rounded-lg p-6 mb-6">
      {/* Error Icon and Title */}
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="w-6 h-6 text-brand-text" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="font-serif text-lg font-semibold text-brand-text">
            Processing Issues Detected
          </h3>
          <p className="text-brand-text/80 mt-1">
            {getErrorMessage()}
          </p>
        </div>
      </div>

      {/* Error Details */}
      <div className="mt-4 ml-9">
        <div className="bg-white rounded-md p-4 border border-brand-text/20">
          <p className="text-brand-text/80 mb-3">
            {getErrorDescription()}
          </p>
          
          {/* Troubleshooting Steps */}
          <div className="mb-4">
            <h4 className="font-semibold text-brand-text mb-2">What you can try:</h4>
            <ul className="text-sm text-brand-text/70 space-y-1">
              {hasTimeouts && (
                <>
                  <li>• Wait a moment and try again - the service may be busy</li>
                  <li>• Try uploading smaller or less damaged photos first</li>
                </>
              )}
              {hasFailures && (
                <>
                  <li>• Check if the photo file is corrupted or in an unsupported format</li>
                  <li>• Try uploading a different version of the same photo</li>
                </>
              )}
              <li>• Contact support if the issue persists</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onRetry}
              disabled={isRetrying}
              className="flex-1 px-4 py-2 bg-brand-text text-white rounded-md hover:bg-brand-text/90 disabled:bg-brand-text/50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
            >
              {isRetrying ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Retrying...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                  Retry Failed Photos
                </>
              )}
            </button>
            <button
              onClick={onContinue}
              className="flex-1 px-4 py-2 border border-brand-text/20 rounded-md text-brand-text hover:bg-brand-background transition-colors duration-200 flex items-center justify-center"
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              Continue Without Them
            </button>
          </div>

          {/* Support Contact */}
          <div className="mt-4 pt-4 border-t border-brand-text/20">
            <p className="text-xs text-brand-text/70">
              Still having issues? 
              <a href="/contact" className="ml-1 underline hover:text-brand-text">
                Contact our support team
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessingError;
