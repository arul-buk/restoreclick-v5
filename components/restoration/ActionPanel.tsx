"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Share2, Mail, Loader2 } from 'lucide-react';
import { trackPhotoDownload } from '@/lib/analytics';

interface ActionPanelProps {
  activePhoto: { 
    id: string; 
    restoredUrl: string;
    originalFilename?: string;
    displayName?: string;
    fileExtension?: string;
  };
  allPhotos: Array<{ 
    id: string; 
    restoredUrl: string;
    originalFilename?: string;
    displayName?: string;
    fileExtension?: string;
  }>;
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
      
      // Detect MIME type from response or use default
      const contentType = response.headers.get('content-type') || 'image/png';
      const blob = new Blob([arrayBuffer], { type: contentType });
      
      // Generate user-friendly filename with improved logic
      let filename: string;
      
      if (activePhoto.displayName && activePhoto.fileExtension) {
        // Use the pre-computed display name and extension
        filename = `${activePhoto.displayName}${activePhoto.fileExtension}`;
        console.log('✅ Download filename:', filename);
      } else if (activePhoto.originalFilename) {
        // Extract base name and add "_restored" suffix
        const baseName = activePhoto.originalFilename.replace(/\.[^/.]+$/, '');
        const extension = activePhoto.fileExtension || 
          (contentType.includes('jpeg') ? '.jpg' 
          : contentType.includes('png') ? '.png'
          : contentType.includes('webp') ? '.webp' 
          : '.png');
        filename = `${baseName}_restored${extension}`;
        console.log('✅ Download filename:', filename);
      } else {
        // Try to extract filename from URL as fallback
        const urlParts = activePhoto.restoredUrl.split('/');
        const urlFilename = urlParts[urlParts.length - 1];
        
        if (urlFilename && urlFilename.includes('.') && !urlFilename.includes('?')) {
          // Try to use URL filename if it looks like a real filename
          const cleanUrlFilename = urlFilename.split('?')[0]; // Remove query params
          if (cleanUrlFilename.match(/\.(jpg|jpeg|png|webp|gif|bmp|tiff)$/i)) {
            const baseName = cleanUrlFilename.replace(/\.[^/.]+$/, '');
            const extension = contentType.includes('jpeg') ? '.jpg' 
              : contentType.includes('png') ? '.png'
              : contentType.includes('webp') ? '.webp' 
              : '.png';
            filename = `${baseName}_restored${extension}`;
            console.log('⚠️ Using URL-based filename:', filename);
          } else {
            // Fallback to descriptive name
            const extension = contentType.includes('jpeg') ? '.jpg' 
              : contentType.includes('png') ? '.png'
              : contentType.includes('webp') ? '.webp' 
              : '.png';
            filename = `restored_photo_${Date.now()}${extension}`;
            console.log('⚠️ Using timestamp fallback:', filename);
          }
        } else {
          // Fallback to descriptive name with timestamp
          const extension = contentType.includes('jpeg') ? '.jpg' 
            : contentType.includes('png') ? '.png'
            : contentType.includes('webp') ? '.webp' 
            : '.png';
          filename = `restored_photo_${Date.now()}${extension}`;
          console.log('⚠️ Using timestamp fallback:', filename);
        }
      }
      
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
      <div className="bg-brand-background rounded-lg p-3 sm:p-4 text-xs sm:text-sm text-brand-text/80 border border-brand-text/10">
        <h4 className="font-medium text-brand-text mb-2">💡 Tips:</h4>
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
