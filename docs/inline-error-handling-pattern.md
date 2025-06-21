# Inline Error Handling Pattern

This document outlines the recommended pattern for handling user-fixable errors with inline, contextual error messages in RestoreClickV4.

## When to Use Inline Errors

Use inline error messages for:
- ✅ **User-fixable errors**: File validation, form errors, upload issues
- ✅ **API validation errors**: 400 Bad Request responses
- ✅ **Temporary failures**: Network issues, rate limits
- ✅ **Input-related errors**: File size, format, missing fields

Avoid inline errors for:
- ❌ **Server errors (500s)**: Use GenericError component instead
- ❌ **Authentication errors**: Use dedicated auth error handling
- ❌ **404 errors**: Use custom 404 page
- ❌ **Critical system failures**: Use full-page error states

## Implementation Pattern

### 1. State Management
```tsx
const [uploadError, setUploadError] = useState<string | null>(null);
const [isLoading, setIsLoading] = useState(false);
```

### 2. Error Handling in API Calls
```tsx
const handleApiCall = async () => {
  setIsLoading(true);
  setUploadError(null); // Clear previous errors

  try {
    const response = await fetch('/api/endpoint', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      // Extract user-friendly error message
      const errorData = await response.json().catch(() => ({ 
        message: 'Something went wrong. Please try again.' 
      }));
      const errorMessage = errorData?.error || errorData?.message || 'Operation failed.';
      
      // Set inline error instead of just toast
      setUploadError(errorMessage);
      return;
    }

    // Handle success...
    const result = await response.json();
    
  } catch (error) {
    // Only set error if not already set by response handling
    if (!uploadError) {
      setUploadError('Network error. Please check your connection and try again.');
    }
  } finally {
    setIsLoading(false);
  }
};
```

### 3. Error Display Component
```tsx
{uploadError && (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
    <div className="flex items-start">
      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-red-800 font-medium mb-2">Error</p>
        <p className="text-red-700 text-sm mb-3">{uploadError}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setUploadError(null);
            handleApiCall(); // Retry the operation
          }}
          className="border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
        >
          Try Again
        </Button>
      </div>
    </div>
  </div>
)}
```

### 4. Clear Errors on User Action
```tsx
// Clear errors when user starts a new action
const onFileSelect = useCallback((files: File[]) => {
  setUploadError(null); // Clear previous errors
  // Handle file selection...
}, []);

// Clear errors on form input change
const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setUploadError(null); // Clear previous errors
  // Handle input change...
};
```

## Error Message Guidelines

### Good Error Messages
```
✅ "File size exceeds 10MB limit. Please choose a smaller file."
✅ "Invalid file format. Only JPEG, PNG, and WebP are supported."
✅ "Upload failed due to network issues. Please try again."
✅ "Payment processing temporarily unavailable. Please retry in a moment."
```

### Avoid These Messages
```
❌ "Error 413: Payload Too Large"
❌ "CORS policy violation"
❌ "Uncaught TypeError: Cannot read property..."
❌ "Internal server error"
```

## Styling Guidelines

### Error Container
- **Background**: `bg-red-50` for subtle red background
- **Border**: `border-red-200` for soft red border
- **Padding**: `p-4` for comfortable spacing
- **Border Radius**: `rounded-lg` for consistency

### Text Colors
- **Title**: `text-red-800` for strong contrast
- **Message**: `text-red-700` for readable error text
- **Icon**: `text-red-600` for visual consistency

### Retry Button
- **Variant**: `outline` with red color scheme
- **Classes**: `border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400`
- **Size**: `sm` for compact appearance

## Complete Example

```tsx
"use client";

import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ExampleComponent() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/example', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          message: 'Something went wrong. Please try again.' 
        }));
        setError(errorData?.error || errorData?.message || 'Operation failed.');
        return;
      }

      // Handle success
      const result = await response.json();
      console.log('Success:', result);
      
    } catch (err) {
      if (!error) {
        setError('Network error. Please check your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Your form/upload UI here */}
      
      {/* Inline Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-800 font-medium mb-2">Error</p>
              <p className="text-red-700 text-sm mb-3">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setError(null);
                  // Retry logic here
                }}
                className="border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
                disabled={isLoading}
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      <Button 
        onClick={() => handleSubmit(new FormData())}
        disabled={isLoading}
      >
        {isLoading ? 'Processing...' : 'Submit'}
      </Button>
    </div>
  );
}
```

## Benefits of This Pattern

1. **Immediate Feedback**: Users see errors right where they occurred
2. **Clear Actions**: Retry button provides obvious next step
3. **Contextual**: Error appears near the relevant UI element
4. **Accessible**: Proper color contrast and screen reader support
5. **Consistent**: Follows RestoreClickV4 design patterns
6. **User-Friendly**: Clear, actionable error messages

## Integration with Existing Components

This pattern is already implemented in:
- **Photo Upload Component** (`/app/restore-old-photos/restore-photos-client.tsx`)
- **Contact Form** (`/app/contact/ContactPageClient.tsx`)

Consider implementing this pattern in:
- Form validation errors
- File upload components
- API interaction components
- User input validation
