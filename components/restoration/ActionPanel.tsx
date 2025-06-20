"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Share2, Mail, Loader2 } from 'lucide-react';
import { trackPhotoDownload } from '@/lib/analytics';

interface ActionPanelProps {
  activePhoto: { id: string; restoredUrl: string };
  allPhotos: Array<{ id: string; restoredUrl: string }>;
  onShareClick: () => void;
  onSendToMyEmailClick: () => void;
  isLoading: boolean;
}

const ActionPanel: React.FC<ActionPanelProps> = ({
  activePhoto,
  allPhotos,
  onShareClick,
  onSendToMyEmailClick,
  isLoading
}) => {
  const currentIndex = allPhotos.findIndex(photo => photo.id === activePhoto.id) + 1;
  const totalPhotos = allPhotos.length;

  const handleDownloadSingle = async () => {
    try {
      const response = await fetch(activePhoto.restoredUrl);
      if (!response.ok) throw new Error('Failed to fetch photo');
      
      const arrayBuffer = await response.arrayBuffer();
      // Create blob with explicit PNG MIME type
      const blob = new Blob([arrayBuffer], { type: 'image/png' });
      const filename = `restored-photo-${Date.now()}-${currentIndex}.png`;
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      // Track download
      trackPhotoDownload('single', 1);
    } catch (error) {
      console.error('Error downloading photo:', error);
      // Fallback: open in new tab
      window.open(activePhoto.restoredUrl, '_blank');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Photo Index */}
      <div className="text-center">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">
          Restored Photo {currentIndex} of {totalPhotos}
        </h3>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 sm:space-y-3">
        {/* Download This Photo */}
        <Button 
          onClick={handleDownloadSingle}
          className="w-full text-sm sm:text-base" 
          size="lg"
        >
          <Download className="w-4 h-4 mr-2" />
          Download This Photo
        </Button>

        {/* Share with Family */}
        <Button 
          onClick={onShareClick}
          variant="outline" 
          className="w-full text-sm sm:text-base" 
          size="lg"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share with Family
        </Button>

        {/* Send to My Email */}
        <Button 
          onClick={onSendToMyEmailClick}
          variant="outline" 
          className="w-full text-sm sm:text-base" 
          size="lg"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Mail className="w-4 h-4 mr-2" />
          )}
          Send to My Email
        </Button>
      </div>

      {/* Tips Section */}
      <div className="bg-gray-50 rounded-lg p-3 sm:p-4 text-xs sm:text-sm text-gray-600">
        <h4 className="font-medium text-gray-900 mb-2">💡 Tips:</h4>
        <ul className="space-y-1">
          <li>• Use the slider above to compare before and after</li>
          {allPhotos.length > 1 && <li>• Click thumbnails below to view different photos</li>}
          <li>• Share with family to spread the joy!</li>
        </ul>
      </div>
    </div>
  );
};

export default ActionPanel;
