import Link from 'next/link';
import { Camera, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="bg-brand-background min-h-screen flex items-center justify-center px-4">
      <main className="w-full max-w-lg mx-auto text-center">
        <div className="bg-white rounded-lg shadow-soft p-8 sm:p-12">
          
          {/* Icon */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <Camera className="h-10 w-10 text-amber-600" />
          </div>

          {/* Headline */}
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-brand-text mb-4">
            Oops! This Page Seems a Little Faded.
          </h1>
          
          {/* Main message */}
          <p className="text-base sm:text-lg leading-7 text-brand-text/80 mb-4">
            I'm so sorry, but it looks like the page you were trying to find doesn't exist or may have been moved. It's easy to get lost when looking through old memories!
          </p>

          {/* Reassuring message */}
          <p className="text-brand-text/70 mb-8">
            Let's get you back to where the magic happens.
          </p>
          
          {/* Action buttons */}
          <div className="space-y-4">
            <Link 
              href="/" 
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-cta px-8 py-3 font-semibold text-white shadow-soft transition hover:bg-brand-cta/90 hover:shadow-soft-md"
            >
              <Home className="h-5 w-5" />
              Return to Homepage
            </Link>
            
            <div className="text-sm text-brand-text/60">
              or{' '}
              <Link 
                href="/restore-old-photos" 
                className="text-brand-cta hover:text-brand-cta/80 font-medium underline"
              >
                start restoring photos
              </Link>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
