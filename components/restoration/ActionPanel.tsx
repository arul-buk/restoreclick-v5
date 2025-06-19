"use client";

import { Button } from '@/components/ui/button';
import { Download, Share2, Mail, Archive, Loader2 } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

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
      
      const blob = await response.blob();
      const extension = activePhoto.restoredUrl.split('.').pop() || 'jpg';
      const filename = `restored-photo-${currentIndex}.${extension}`;
      
      saveAs(blob, filename);
    } catch (error) {
      console.error('Error downloading photo:', error);
      // Fallback: open in new tab

    }
  };

  const handleDownloadAll = async () => {
    try {
      const zip = new JSZip();
      
      // Fetch each image and add to zip
      for (let i = 0; i < allPhotos.length; i++) {
        const photo = allPhotos[i];
        try {
          const response = await fetch(photo.restoredUrl);
          if (!response.ok) throw new Error(`Failed to fetch photo ${i + 1}`);
          
          const blob = await response.blob();
          const extension = photo.restoredUrl.split('.').pop() || 'jpg';
          zip.file(`restored-photo-${i + 1}.${extension}`, blob);
        } catch (error) {
          console.error(`Error downloading photo ${i + 1}:`, error);
          // Continue with other photos
        }
      }
      
      // Generate and download zip
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'restored-photos.zip');
    } catch (error) {
      console.error('Error creating ZIP file:', error);
      // You might want to show a toast notification here
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
      {/* Photo Index */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900">
          Restored Photo {currentIndex} of {totalPhotos}
        </h3>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        {/* Download This Photo */}
        <Button 
          onClick={handleDownloadSingle}
          className="w-full" 
          size="lg"
        >
          <Download className="w-4 h-4 mr-2" />
          Download This Photo
        </Button>

        {/* Download All Photos (only show if multiple photos) */}
        {allPhotos.length > 1 && (
          <Button 
            onClick={handleDownloadAll}
            variant="outline" 
            className="w-full" 
            size="lg"
          >
            <Archive className="w-4 h-4 mr-2" />
            Download All Photos (.zip)
          </Button>
        )}

        {/* Share with Family */}
        <Button 
          onClick={onShareClick}
          variant="outline" 
          className="w-full" 
          size="lg"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share with Family
        </Button>

        {/* Send to My Email */}
        <Button 
          onClick={onSendToMyEmailClick}
          variant="outline" 
          className="w-full" 
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
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
        <h4 className="font-medium text-gray-900 mb-2">💡 Tips:</h4>
        <ul className="space-y-1">
          <li>• Use the slider above to compare before and after</li>
          <li>• Click thumbnails below to view different photos</li>
          <li>• Share with family to spread the joy!</li>
        </ul>
      </div>
    </div>
  );
};

export default ActionPanel;
