'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { Hourglass, MailCheck, MessageSquareHeart } from 'lucide-react';
import { trackPageView } from '@/lib/analytics';

export default function ProcessingFailedPageClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const orderId = searchParams.get('order_id');

  useEffect(() => {
    trackPageView('Processing Failed Page');
  }, []);

  return (
    <div className="bg-brand-background text-brand-text min-h-screen flex items-center justify-center px-4 py-12">
      <main className="w-full max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-soft p-6 sm:p-10 text-center">
          
          {/* Gentle Icon */}
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <Hourglass className="h-10 w-10 text-amber-500" />
          </div>

          {/* Main Headline */}
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-brand-text">
            Oops! We've Hit a Temporary Snag.
          </h1>
          
          {/* Reassuring Body Text */}
          <p className="mt-4 text-base sm:text-lg leading-relaxed text-brand-text/80">
            I am so sorry about this. It seems the digital restoration room is a little busy right now, and the process didn't complete on the first try.
            <br/><br/>
            <strong>Please don't worry, your order is safe and this is usually just a temporary hiccup.</strong>
          </p>

          {/* Automatic Retry Information */}
          <div className="mt-6 rounded-lg bg-green-50 p-4 border border-green-200">
            <p className="font-semibold text-green-800">
              Our system is already scheduled to try restoring your photos again automatically in the next 5 minutes.
            </p>
          </div>

          {/* Clear, Step-by-Step Action Plan */}
          <div className="mt-8 text-left">
            <h2 className="font-serif text-2xl font-semibold text-brand-text mb-4">What to do now:</h2>
            <ol className="space-y-4">
              
              <li className="flex items-start">
                <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-brand-accent/20 text-brand-accent font-bold">1</div>
                <div className="ml-4">
                  <h3 className="font-semibold text-brand-text">First, Check Your Email</h3>
                  <p className="text-brand-text/80">Sometimes the photos finish processing, but this page doesn't update correctly. Please check your inbox to see if you've already received an email from me with your restored photos.</p>
                </div>
              </li>

              <li className="flex items-start">
                <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-brand-accent/20 text-brand-accent font-bold">2</div>
                <div className="ml-4">
                  <h3 className="font-semibold text-brand-text">Wait Just a Moment</h3>
                  <p className="text-brand-text/80">If there's no email yet, please give our automatic retry about <strong>10 minutes</strong> to work its magic. You can close this page and wait for the email to arrive.</p>
                </div>
              </li>
              
              <li className="flex items-start">
                <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-brand-accent/20 text-brand-accent font-bold">3</div>
                <div className="ml-4">
                  <h3 className="font-semibold text-brand-text">Still Nothing? I'm Here to Help.</h3>
                  <p className="text-brand-text/80">If you've waited 10 minutes and still haven't received an email, please send me a message directly at <a href="mailto:lily@restore.click" className="font-semibold text-brand-cta underline hover:text-brand-cta/80">lily@restore.click</a>. I will personally look into your order and make sure everything is sorted out for you.</p>
                </div>
              </li>

            </ol>
          </div>
          
          {/* Additional Actions */}
          <div className="mt-8 space-y-4">
            {/* Check Status Button */}
            {sessionId && (
              <div className="text-center">
                <Link 
                  href={`/processing?session_id=${sessionId}`}
                  className="inline-block rounded-lg bg-brand-cta px-6 py-3 font-semibold text-white transition hover:bg-brand-cta/90 mr-4"
                >
                  Check Status Again
                </Link>
              </div>
            )}
            
            {/* Contact Support */}
            <div className="text-center">
              <Link 
                href="/contact"
                className="inline-block rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700 mr-4"
              >
                Contact Support
              </Link>
            </div>
          </div>
          
          {/* Button to return home */}
          <div className="mt-6">
            <Link 
              href="/" 
              className="inline-block rounded-lg bg-brand-text/10 px-8 py-3 font-semibold text-brand-text transition hover:bg-brand-text/20"
            >
              Return to Homepage
            </Link>
          </div>

          {/* Order Information */}
          {(sessionId || orderId) && (
            <div className="mt-8 p-4 bg-brand-background rounded-lg border border-brand-text/10">
              <p className="text-sm text-brand-text/60">
                <strong>Reference Information:</strong>
                {orderId && <span className="block">Order ID: {orderId}</span>}
                {sessionId && <span className="block">Session ID: {sessionId}</span>}
              </p>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
