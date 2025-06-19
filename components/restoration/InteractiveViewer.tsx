"use client";

import { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface InteractiveViewerProps {
  photo: {
    originalUrl: string;
    restoredUrl: string;
  };
}

const InteractiveViewer: React.FC<InteractiveViewerProps> = ({ photo }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(percentage);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-96 md:h-[500px] overflow-hidden rounded-lg bg-gray-100 shadow-lg cursor-ew-resize"
      onMouseMove={handleMouseMove}
    >
      {/* Before image (background) */}
      <img 
        src={photo.originalUrl} 
        alt="Original photo"
        className="absolute inset-0 w-full h-full object-contain select-none"
        draggable={false}
      />
      
      {/* After image (clipped) */}
      <div 
        className="absolute inset-0 overflow-hidden" 
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <img 
          src={photo.restoredUrl} 
          alt="Restored photo"
          className="w-full h-full object-contain select-none"
          draggable={false}
        />
      </div>
      
      {/* Slider handle */}
      <div 
        className="absolute top-0 bottom-0 w-1 bg-white shadow-lg z-20 pointer-events-none"
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-gray-300">
          <ChevronLeft className="w-3 h-3 text-gray-600 -mr-1" />
          <ChevronRight className="w-3 h-3 text-gray-600 -ml-1" />
        </div>
      </div>
      
      {/* Labels */}
      <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium z-20 pointer-events-none">
        Before
      </div>
      <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium z-20 pointer-events-none">
        After
      </div>
    </div>
  );
};

export default InteractiveViewer;
