# Payment Success Page Redesign Specification

## Overview
Transform the existing payment-success page into a comprehensive, interactive experience for viewing and sharing restored photos. This page will be accessed after a successful payment and will display the user's restored photos with various interaction options.

## Technical Context
- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **State Management**: React useState hooks
- **Authentication**: None (Clerk has been removed)
- **Database**: Supabase
- **File Storage**: Assumed to be Supabase Storage or similar cloud storage

## URL Structure
- **Path**: `/payment-success?batch_id={batchId}`
- **Query Parameter**: `batch_id` - Unique identifier for the restoration batch

## Data Structure

### Photo Object
```typescript
interface Photo {
  id: string;
  originalUrl: string;  // URL to original photo
  restoredUrl: string;  // URL to restored photo
}

interface RestorationData {
  photos: Photo[];
}
```

## Component Architecture

### 1. Main Page Layout Component
**File**: `app/payment-success/page.tsx`

#### Requirements:
- Fetch restoration data based on `batch_id` from URL search parameters
- Implement `getRestorationData(batchId: string)` function that returns `RestorationData`
- Manage state for:
  - `activePhoto`: Currently selected photo (initialize with first photo)
  - `isLoading`: Loading state for API calls
  - `isShareModalOpen`: Share modal visibility state

#### Layout Structure:
```
┌─────────────────────────────────────────┐
│ Header Section                          │
│ - "Your Memories are Ready!"            │
│ - Descriptive subtitle                  │
├─────────────────────────────────────────┤
│ Main Content Area (Desktop: side-by-side)│
│ ┌─────────────┐ ┌─────────────────────┐ │
│ │Interactive  │ │   Action Panel      │ │
│ │  Viewer     │ │ - Download buttons  │ │
│ │             │ │ - Share button      │ │
│ │             │ │ - Email button      │ │
│ └─────────────┘ └─────────────────────┘ │
├─────────────────────────────────────────┤
│ Thumbnail Gallery                       │
│ [thumb1] [thumb2] [thumb3] ...         │
├─────────────────────────────────────────┤
│ Re-engagement Section                   │
│ [ Restore More Photos ]                 │
└─────────────────────────────────────────┘
```

#### Implementation Details:
```typescript
// Data fetching function (to be implemented)
async function getRestorationData(batchId: string): Promise<RestorationData> {
  // Option 1: Fetch from Supabase directly
  // const { data, error } = await supabase
  //   .from('restoration_batches')
  //   .select('photos')
  //   .eq('id', batchId)
  //   .single();
  
  // Option 2: Fetch from API endpoint
  // const response = await fetch(`/api/restorations/${batchId}`);
  // return response.json();
}
```

### 2. InteractiveViewer Component
**File**: `components/restoration/InteractiveViewer.tsx`

#### Props:
```typescript
interface InteractiveViewerProps {
  photo: {
    originalUrl: string;
    restoredUrl: string;
  };
}
```

#### Requirements:
- Implement before-after image slider
- Options:
  1. Use `react-before-after-slider-component` package
  2. Build custom slider using HTML range input and CSS masking
- Ensure responsive design
- Large, accessible slider handle for touch/mouse
- Maintain image aspect ratio
- Contain images within component boundaries

#### Example Implementation Structure:
```typescript
// If using custom implementation
const InteractiveViewer: React.FC<InteractiveViewerProps> = ({ photo }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  
  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg">
      {/* Before image */}
      <img src={photo.originalUrl} className="absolute inset-0 w-full h-full object-contain" />
      
      {/* After image with mask */}
      <div 
        className="absolute inset-0" 
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <img src={photo.restoredUrl} className="w-full h-full object-contain" />
      </div>
      
      {/* Slider control */}
      <input
        type="range"
        min="0"
        max="100"
        value={sliderPosition}
        onChange={(e) => setSliderPosition(Number(e.target.value))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
      />
      
      {/* Slider handle */}
      <div 
        className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center">
          <svg>...</svg>
        </div>
      </div>
    </div>
  );
};
```

### 3. ActionPanel Component
**File**: `components/restoration/ActionPanel.tsx`

#### Props:
```typescript
interface ActionPanelProps {
  activePhoto: { id: string; restoredUrl: string };
  allPhotos: Array<{ id: string; restoredUrl: string }>;
  onShareClick: () => void;
  onSendToMyEmailClick: () => void;
  isLoading: boolean;
}
```

#### Requirements:
- Display current photo index (e.g., "Restored Photo 1 of 3")
- **Button 1: Download This Photo**
  - Use `<a>` tag with `download` attribute
  - `href` points to `activePhoto.restoredUrl`
- **Button 2: Download All Photos (.zip)**
  - Only visible if `allPhotos.length > 1`
  - Implement `handleDownloadAll()` function
  - Use library like `jszip` to create ZIP file
- **Button 3: Share with Family**
  - Calls `onShareClick` prop
- **Button 4: Send to My Email**
  - Calls `onSendToMyEmailClick` prop
  - Show spinner when `isLoading` is true
  - Disable when loading

#### ZIP Download Implementation:
```typescript
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

async function handleDownloadAll(photos: Array<{ id: string; restoredUrl: string }>) {
  const zip = new JSZip();
  
  // Fetch each image and add to zip
  for (let i = 0; i < photos.length; i++) {
    const response = await fetch(photos[i].restoredUrl);
    const blob = await response.blob();
    zip.file(`restored-photo-${i + 1}.jpg`, blob);
  }
  
  // Generate and download zip
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, 'restored-photos.zip');
}
```

### 4. ThumbnailGallery Component
**File**: `components/restoration/ThumbnailGallery.tsx`

#### Props:
```typescript
interface ThumbnailGalleryProps {
  photos: Array<{ id: string; restoredUrl: string }>;
  activePhotoId: string;
  onThumbnailClick: (photoId: string) => void;
}
```

#### Requirements:
- Horizontal scrolling container (`overflow-x: auto`)
- Render thumbnails as clickable elements
- Active thumbnail styling (e.g., 2px blue border)
- Smooth scrolling behavior
- Responsive sizing

#### Example Structure:
```typescript
<div className="flex gap-2 overflow-x-auto py-4 px-2">
  {photos.map((photo) => (
    <button
      key={photo.id}
      onClick={() => onThumbnailClick(photo.id)}
      className={`
        flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden
        ${photo.id === activePhotoId ? 'ring-2 ring-blue-500' : 'ring-1 ring-gray-300'}
      `}
    >
      <img 
        src={photo.restoredUrl} 
        alt="Restored photo thumbnail"
        className="w-full h-full object-cover"
      />
    </button>
  ))}
</div>
```

### 5. ShareModal Component
**File**: `components/restoration/ShareModal.tsx`

#### Props:
```typescript
interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (formData: {
    recipientName: string;
    recipientEmail: string;
    message: string;
  }) => void;
  isLoading: boolean;
}
```

#### Requirements:
- Modal overlay (dark background)
- Close button (X) in top-right
- Form fields:
  - Recipient's Name (text input)
  - Recipient's Email (email input with validation)
  - Personal Message (textarea)
- Email validation
- Disable send button if email invalid or empty
- Show spinner when loading

#### Form Validation:
```typescript
const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};
```

## API Integration

### Email Sending
- Adapt existing `/api/send-photo-links/route.ts` endpoint or create new endpoint
- Payload should include:
  - Photo URLs
  - Recipient information
  - Personal message

### Data Fetching Options

#### Option 1: Direct Supabase Query
```typescript
import supabaseAdmin from '@/lib/supabaseAdmin';

async function getRestorationData(batchId: string) {
  const { data, error } = await supabaseAdmin
    .from('restoration_batches')
    .select(`
      id,
      photos (
        id,
        original_url,
        restored_url
      )
    `)
    .eq('id', batchId)
    .single();
    
  if (error) throw error;
  
  return {
    photos: data.photos.map(photo => ({
      id: photo.id,
      originalUrl: photo.original_url,
      restoredUrl: photo.restored_url
    }))
  };
}
```

#### Option 2: API Endpoint
Create `/api/restorations/[batchId]/route.ts`:
```typescript
export async function GET(
  request: Request,
  { params }: { params: { batchId: string } }
) {
  // Fetch from database
  // Return formatted data
}
```

## Styling Guidelines

### Color Palette
- Background: `bg-gray-50` (soft off-white)
- Primary buttons: `bg-blue-600 hover:bg-blue-700`
- Secondary buttons: `bg-gray-600 hover:bg-gray-700`
- Text: `text-gray-900` (primary), `text-gray-600` (secondary)

### Responsive Design
- Mobile: Stack components vertically
- Desktop: Side-by-side layout for viewer and action panel
- Use Tailwind responsive prefixes: `sm:`, `md:`, `lg:`

### Typography
- Header: `text-4xl font-bold` (desktop), `text-2xl` (mobile)
- Subheader: `text-lg text-gray-600`
- Buttons: `text-base font-medium`

## State Management Flow

```typescript
// Main page state
const [photos, setPhotos] = useState<Photo[]>([]);
const [activePhoto, setActivePhoto] = useState<Photo | null>(null);
const [isLoading, setIsLoading] = useState(false);
const [isShareModalOpen, setIsShareModalOpen] = useState(false);

// Handlers
const handleThumbnailClick = (photoId: string) => {
  const photo = photos.find(p => p.id === photoId);
  if (photo) setActivePhoto(photo);
};

const handleShareClick = () => {
  setIsShareModalOpen(true);
};

const handleSendEmail = async (formData) => {
  setIsLoading(true);
  try {
    await sendEmail(formData);
    // Show success message
  } catch (error) {
    // Handle error
  } finally {
    setIsLoading(false);
  }
};
```

## Error Handling

- Display user-friendly error messages
- Implement retry mechanisms for failed API calls
- Fallback UI for missing images
- Handle edge cases:
  - No photos in batch
  - Invalid batch_id
  - Network errors

## Performance Considerations

- Lazy load images in thumbnail gallery
- Optimize image sizes for thumbnails
- Implement loading skeletons
- Cache fetched data when appropriate

## Accessibility

- Keyboard navigation for all interactive elements
- ARIA labels for buttons and controls
- Focus management for modal
- Alt text for all images
- Sufficient color contrast

## Testing Checklist

- [ ] Data fetching with valid batch_id
- [ ] Data fetching with invalid batch_id
- [ ] Before-after slider functionality
- [ ] Download single photo
- [ ] Download all photos as ZIP
- [ ] Share modal form validation
- [ ] Email sending functionality
- [ ] Thumbnail gallery navigation
- [ ] Responsive design on all screen sizes
- [ ] Loading states
- [ ] Error states
- [ ] Keyboard accessibility

## Dependencies to Install

```json
{
  "dependencies": {
    "jszip": "^3.10.1",
    "file-saver": "^2.0.5",
    "react-before-after-slider-component": "^1.1.8"
  }
}
```

## Migration Notes

- The existing `payment-success/page.tsx` will be completely replaced
- Existing components like `EmailConfirmationModal` may be repurposed for the email functionality
- The `BeforeAfterSlider` component might exist and can be adapted

## Implementation Order

1. Set up main page with data fetching
2. Create InteractiveViewer component
3. Create ActionPanel component
4. Create ThumbnailGallery component
5. Create ShareModal component
6. Wire up all state and handlers
7. Implement API integrations
8. Add error handling and loading states
9. Test and refine
10. Update documentation and CHANGELOG

## Questions for Clarification (if needed)

1. Database schema for restoration_batches and photos tables
2. Existing API endpoints that can be reused
3. Email template preferences
4. Share functionality specifics (email vs shareable link)
5. Analytics/tracking requirements
