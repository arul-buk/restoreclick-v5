// lib/analytics.ts
// Google Tag Manager and Analytics utilities for RestoreClick

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: Record<string, any>[];
  }
}

// Initialize dataLayer if it doesn't exist
if (typeof window !== 'undefined' && !window.dataLayer) {
  window.dataLayer = [];
}

/**
 * Send a custom event to Google Tag Manager
 */
export const trackEvent = (eventName: string, parameters?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, {
      event_category: 'RestoreClick',
      ...parameters,
    });
  }
};

/**
 * Track page views
 */
export const trackPageView = (url: string, title?: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', process.env.NEXT_PUBLIC_GTM_ID, {
      page_title: title,
      page_location: url,
    });
  }
};

/**
 * Track photo upload events
 */
export const trackPhotoUpload = (photoCount: number, batchId?: string) => {
  trackEvent('photo_upload', {
    event_category: 'Restoration',
    photo_count: photoCount,
    batch_id: batchId,
    value: photoCount, // Number of photos as value
  });
};

/**
 * Track restoration completion
 */
export const trackRestorationComplete = (orderId: string, photoCount: number, processingTime?: number) => {
  trackEvent('restoration_complete', {
    event_category: 'Restoration',
    order_id: orderId,
    photo_count: photoCount,
    processing_time_minutes: processingTime,
    value: photoCount,
  });
};

/**
 * Track photo downloads
 */
export const trackPhotoDownload = (downloadType: 'single' | 'zip', photoCount: number, orderId?: string) => {
  trackEvent('photo_download', {
    event_category: 'Engagement',
    download_type: downloadType,
    photo_count: photoCount,
    order_id: orderId,
    value: photoCount,
  });
};

/**
 * Track photo sharing
 */
export const trackPhotoShare = (shareType: 'email' | 'family', recipientCount: number, orderId?: string) => {
  trackEvent('photo_share', {
    event_category: 'Engagement',
    share_type: shareType,
    recipient_count: recipientCount,
    order_id: orderId,
    value: recipientCount,
  });
};

/**
 * Track purchase events (e-commerce)
 */
export const trackPurchase = (orderId: string, value: number, currency: string = 'USD', photoCount: number) => {
  trackEvent('purchase', {
    event_category: 'E-commerce',
    transaction_id: orderId,
    value: value,
    currency: currency,
    items: [{
      item_id: 'photo_restoration',
      item_name: 'Photo Restoration Service',
      item_category: 'Digital Services',
      quantity: photoCount,
      price: value / photoCount,
    }],
  });
};

/**
 * Track form submissions
 */
export const trackFormSubmission = (formName: string, success: boolean = true) => {
  trackEvent('form_submit', {
    event_category: 'Lead Generation',
    form_name: formName,
    success: success,
  });
};

/**
 * Track user engagement milestones
 */
export const trackEngagement = (action: string, details?: Record<string, any>) => {
  trackEvent('user_engagement', {
    event_category: 'Engagement',
    engagement_action: action,
    ...details,
  });
};

/**
 * Track errors for debugging
 */
export const trackError = (errorType: string, errorMessage: string, context?: string) => {
  trackEvent('exception', {
    event_category: 'Error',
    description: `${errorType}: ${errorMessage}`,
    fatal: false,
    context: context,
  });
};
