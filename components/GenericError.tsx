"use client";

import { ServerCrash, RefreshCw } from 'lucide-react';

interface GenericErrorProps {
  onRetry: () => void;
  message?: string;
}

export default function GenericError({ onRetry, message }: GenericErrorProps) {
  return (
    <div className="w-full max-w-lg mx-auto rounded-xl bg-red-50 p-6 sm:p-8 border border-red-200">
      <div className="flex flex-col items-center text-center">
        <ServerCrash className="h-12 w-12 text-red-500 mb-4" />
        
        <h2 className="font-serif text-3xl font-bold text-red-900">
          Oh Dear, a Little Hiccup.
        </h2>
        
        <p className="mt-2 text-base text-red-800">
          {message || "I'm so sorry, it seems we've run into a temporary technical issue on our end. Please don't worry, your photos and information are safe."}
        </p>
        
        <div className="w-full flex items-center justify-center mt-8">
          <button
            onClick={onRetry}
            className="flex items-center justify-center w-full sm:w-auto rounded-lg px-6 py-3 font-semibold text-white shadow-sm transition bg-red-600 hover:bg-red-700"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Try That Again
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-red-200 w-full">
            <p className="text-sm text-gray-600">
              If the problem continues, you can email me directly at <a href="mailto:lily@restore.click" className="font-semibold text-blue-600 underline">lily@restore.click</a>.
            </p>
        </div>
      </div>
    </div>
  );
}
