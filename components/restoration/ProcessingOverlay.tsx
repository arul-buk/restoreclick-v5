'use client';

import React from 'react';

interface ProcessingOverlayProps {
  totalImages: number;
  currentImage: number;
  completedImages: number;
  elapsedTime: number;
  maxTime: number;
  onCancel?: () => void;
}

const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({
  totalImages,
  currentImage,
  completedImages,
  elapsedTime,
  maxTime,
  onCancel
}) => {
  const timeRemaining = Math.max(0, maxTime - elapsedTime);
  const progress = Math.min(100, (elapsedTime / maxTime) * 100);
  const completionProgress = totalImages > 0 ? (completedImages / totalImages) * 100 : 0;

  const formatTime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getProgressColor = () => {
    if (timeRemaining <= 30000) return 'bg-red-500'; // Last 30 seconds
    if (timeRemaining <= 60000) return 'bg-yellow-500'; // Last minute
    return 'bg-blue-600'; // Normal
  };

  const getProgressMessage = () => {
    if (completedImages === totalImages) {
      return "All photos processed successfully!";
    }
    if (timeRemaining <= 30000) {
      return "Almost done! Please continue waiting...";
    }
    if (timeRemaining <= 60000) {
      return "Processing is taking a bit longer than expected...";
    }
    return "We're carefully restoring your photos with AI technology.";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Processing Your Photos</h2>
          <p className="text-gray-600 text-sm">
            Please don't leave this page while we restore your precious memories.
          </p>
        </div>

        {/* Progress Message */}
        <div className="mb-6 text-center">
          <p className="text-gray-700 font-medium mb-2">{getProgressMessage()}</p>
          <p className="text-sm text-gray-500">
            {completedImages > 0 ? (
              <>Completed {completedImages} of {totalImages} photos</>
            ) : (
              <>Processing photo {currentImage} of {totalImages}</>
            )}
          </p>
        </div>

        {/* Completion Progress Bar */}
        {totalImages > 1 && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Overall Progress</span>
              <span>{Math.round(completionProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${completionProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Time Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Current Photo</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Time Information */}
        <div className="flex justify-between text-sm text-gray-600 mb-6">
          <span>Time elapsed: {formatTime(elapsedTime)}</span>
          <span>Time remaining: {formatTime(timeRemaining)}</span>
        </div>

        {/* Warning for long processing */}
        {timeRemaining <= 30000 && timeRemaining > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-yellow-800">
                Processing is taking longer than expected. This can happen with complex restorations. Please continue waiting...
              </p>
            </div>
          </div>
        )}

        {/* Timeout Warning */}
        {timeRemaining === 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-800">
                This photo is taking longer than expected to process. You can continue waiting or try again later.
              </p>
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
          <h4 className="text-sm font-medium text-blue-800 mb-1">💡 While you wait:</h4>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Our AI is analyzing every detail of your photo</li>
            <li>• Complex damage takes longer to restore properly</li>
            <li>• The wait is worth it for the best results!</li>
          </ul>
        </div>

        {/* Cancel Button */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="w-full py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors duration-200"
          >
            Cancel Processing
          </button>
        )}
      </div>
    </div>
  );
};

export default ProcessingOverlay;
