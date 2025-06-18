// types/global.d.ts

declare global {
    interface Window {
      dataLayer: Record<string, any>[];
    }
  }
  
  // This empty export is needed to treat this file as a module.
  export {};