# GenericError Component

A reusable React component for displaying unexpected server-side errors, API failures, and database issues in a user-friendly, brand-consistent manner.

## Features

- **Brand-Consistent Design**: Uses RestoreClickV4's color palette, typography, and shadow system
- **Warm, Reassuring Messaging**: Takes blame away from the user with gentle language
- **Retry Functionality**: Provides a clear "Try That Again" button
- **Contact Support**: Optional contact options for persistent issues
- **Flexible Messaging**: Accepts custom error messages
- **Responsive Design**: Works seamlessly across all device sizes

## Props

```typescript
interface GenericErrorProps {
  onRetry: () => void;              // Function to retry the failed action
  message?: string;                 // Optional custom error message
  showContactOption?: boolean;      // Whether to show contact support (default: true)
}
```

## Usage Examples

### Basic Usage
```tsx
import GenericError from '@/components/GenericError';

function MyComponent() {
  const [error, setError] = useState<string | null>(null);

  const handleRetry = () => {
    setError(null);
    // Retry the failed operation
    fetchData();
  };

  if (error) {
    return (
      <GenericError
        onRetry={handleRetry}
        message={error}
      />
    );
  }

  return <div>Normal content...</div>;
}
```

### API Error Handling
```tsx
const handleApiCall = async () => {
  try {
    const response = await fetch('/api/some-endpoint');
    if (!response.ok) {
      throw new Error('Failed to load data');
    }
    // Handle success
  } catch (error) {
    setError(error.message);
  }
};

// In render:
{error && (
  <GenericError
    onRetry={() => {
      setError(null);
      handleApiCall();
    }}
    message="We're having trouble loading your data right now."
  />
)}
```

### Full Page Error
```tsx
function ErrorPage() {
  return (
    <div className="min-h-screen bg-brand-background flex items-center justify-center px-4">
      <GenericError
        onRetry={() => window.location.reload()}
        message="Something went wrong while processing your request."
      />
    </div>
  );
}
```

### Without Contact Options
```tsx
<GenericError
  onRetry={handleRetry}
  message="Upload failed. Please try again."
  showContactOption={false}
/>
```

## When to Use

### ✅ Good Use Cases
- **API Failures**: 500 errors, network timeouts, server errors
- **Database Issues**: Connection failures, query errors
- **File Upload Problems**: Storage service failures
- **Payment Processing Errors**: Stripe API failures
- **Unexpected Exceptions**: Unhandled errors in try-catch blocks

### ❌ Avoid Using For
- **Validation Errors**: Use inline field validation instead
- **404 Errors**: Use the custom 404 page (`/app/not-found.tsx`)
- **Authentication Issues**: Use dedicated auth error handling
- **User Input Errors**: Use form-specific error messages

## Design System Integration

The component automatically uses:
- **Colors**: `bg-brand-background`, `text-brand-text`, `bg-brand-cta`
- **Typography**: `font-serif` for headlines, proper text hierarchy
- **Shadows**: `shadow-soft` and `shadow-soft-md` for depth
- **Borders**: `border-brand-text/20` for subtle borders
- **Icons**: Lucide React icons (`AlertTriangle`, `RefreshCw`, `Mail`)

## Accessibility

- **Semantic HTML**: Uses proper heading hierarchy and button elements
- **Focus Management**: Retry button is keyboard accessible
- **Screen Readers**: Clear, descriptive text and proper ARIA labels
- **Color Contrast**: Meets WCAG guidelines with brand colors

## Error Message Guidelines

### Good Messages
```
"We're having trouble loading your photos right now."
"Your upload couldn't be completed due to a temporary issue."
"We couldn't process your payment at this time."
```

### Avoid
```
"Error 500: Internal Server Error"
"Database connection failed"
"Uncaught TypeError: Cannot read property..."
```

## Integration Examples

### Payment Success Page
```tsx
// Already integrated in /app/payment-success/PaymentSuccessContent.tsx
if (error) {
  return (
    <div className="min-h-screen bg-brand-background flex items-center justify-center px-4">
      <GenericError
        onRetry={() => window.location.reload()}
        message={error}
      />
    </div>
  );
}
```

### Upload Component
```tsx
const [uploadError, setUploadError] = useState<string | null>(null);

const handleUpload = async (files: File[]) => {
  try {
    setUploadError(null);
    await uploadFiles(files);
  } catch (error) {
    setUploadError("We couldn't upload your photos. Please try again.");
  }
};

return (
  <div>
    {uploadError ? (
      <GenericError
        onRetry={() => handleUpload(selectedFiles)}
        message={uploadError}
      />
    ) : (
      <UploadInterface onUpload={handleUpload} />
    )}
  </div>
);
```

## Customization

The component is designed to be consistent with the RestoreClickV4 brand. For different styling needs, consider:

1. **Creating variants** with additional props
2. **Extending the component** for specific use cases
3. **Using CSS custom properties** for theme variations

## Testing

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import GenericError from '@/components/GenericError';

test('calls onRetry when button is clicked', () => {
  const mockRetry = jest.fn();
  render(<GenericError onRetry={mockRetry} />);
  
  fireEvent.click(screen.getByText('Try That Again'));
  expect(mockRetry).toHaveBeenCalledTimes(1);
});

test('displays custom message', () => {
  const customMessage = "Custom error message";
  render(<GenericError onRetry={() => {}} message={customMessage} />);
  
  expect(screen.getByText(customMessage)).toBeInTheDocument();
});
```
