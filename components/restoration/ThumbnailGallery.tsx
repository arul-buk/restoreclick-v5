"use client";

interface ThumbnailGalleryProps {
  photos: Array<{ id: string; restoredUrl: string }>;
  activePhotoId: string;
  onThumbnailClick: (photoId: string) => void;
}

const ThumbnailGallery: React.FC<ThumbnailGalleryProps> = ({
  photos,
  activePhotoId,
  onThumbnailClick
}) => {
  if (photos.length <= 1) {
    return null; // Don't show gallery if only one photo
  }

  return (
    <div className="bg-white rounded-lg shadow-soft p-4 sm:p-6">
      <h3 className="text-base sm:text-lg font-semibold text-brand-text mb-3 sm:mb-4">
        All Your Restored Photos
      </h3>
      
      <div className="flex gap-2 sm:gap-3 overflow-x-auto py-2 px-1 scrollbar-thin scrollbar-thumb-brand-text/30 scrollbar-track-brand-background">
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            onClick={() => onThumbnailClick(photo.id)}
            className={`
              flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-lg overflow-hidden
              transition-all duration-200 hover:scale-105 relative
              ${photo.id === activePhotoId 
                ? 'ring-2 sm:ring-3 ring-brand-cta ring-offset-1 sm:ring-offset-2 shadow-lg' 
                : 'ring-1 ring-brand-text/20 hover:ring-2 hover:ring-brand-cta/50'
              }
            `}
            aria-label={`View restored photo ${index + 1}`}
          >
            <img 
              src={photo.restoredUrl} 
              alt={`Restored photo ${index + 1} thumbnail`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            
            {/* Photo number overlay */}
            <div className="absolute inset-0 bg-black/20 flex items-end justify-end p-1 pointer-events-none">
              <span className="bg-white/90 text-xs font-medium px-1 sm:px-1.5 py-0.5 rounded text-brand-text">
                {index + 1}
              </span>
            </div>
          </button>
        ))}
      </div>
      
      <p className="text-xs sm:text-sm text-brand-text/60 mt-2 sm:mt-3 text-center">
        Click any thumbnail to view that photo
      </p>
    </div>
  );
};

export default ThumbnailGallery;
