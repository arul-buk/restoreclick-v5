/**
 * @file This file defines the client-side Pricing Page.
 * It displays available subscription plans and provides an interface for the user
 * to initiate the payment process by creating a Stripe Checkout session.
 */

// This directive marks the component as a Client Component, allowing the use of state and hooks.
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@clerk/nextjs'; // Import useAuth to get user ID for logging

/**
 * Renders the pricing page, allowing users to select and purchase a subscription plan.
 * @returns {JSX.Element} The rendered pricing page component.
 */
export default function PricingPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { userId } = useAuth(); // Get the user ID for better contextual logging

  /**
   * Handles the click event for the checkout button.
   * It sends a request to our backend to create a Stripe Checkout session
   * and then redirects the user to the returned Stripe URL.
   */
  const handleCheckout = async () => {
    console.log(`[Pricing Page] User ${userId} initiated checkout.`); // Basic client-side log
    setLoading(true);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Handle cases where the API call itself fails (e.g., network error, server down)
      if (!response.ok) {
        // Log the failure for debugging.
        console.error(`[Pricing Page] API call to /api/checkout failed with status: ${response.status}`);
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();

      // If the API call is successful but doesn't return a URL, it's an issue.
      if (url) {
        console.log(`[Pricing Page] Successfully received Stripe URL. Redirecting user ${userId}...`);
        // Redirect the user to the secure Stripe-hosted checkout page.
        router.push(url);
      } else {
        console.error('[Pricing Page] API call succeeded but did not return a Stripe URL.');
        throw new Error('Could not retrieve checkout URL.');
      }
    } catch (error) {
      // Catch any error during the fetch or redirection process.
      console.error('[Pricing Page] An error occurred during the checkout process:', error);
      // Display a simple alert to the user. In a real app, you might use a more elegant toast notification.
      alert('An error occurred. Please try again.');
    } finally {
      // Ensure the loading state is always reset, even if an error occurs.
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-5rem)]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Studio Pro</CardTitle>
          <CardDescription>
            Unlock all features and get unlimited access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center text-4xl font-bold">
            $10<span className="text-sm font-normal text-muted-foreground">/month</span>
          </div>
          <ul className="space-y-2">
            <li className="flex items-center">
              <Check className="mr-2 h-4 w-4 text-green-500" />
              Unlimited AI Image Restorations
            </li>
            <li className="flex items-center">
              <Check className="mr-2 h-4 w-4 text-green-500" />
              Priority Email Support
            </li>
            <li className="flex items-center">
              <Check className="mr-2 h-4 w-4 text-green-500" />
              Access to All Future Updates
            </li>
          </ul>
        </CardContent>
        <CardFooter>
          {/* 
            This button is the primary call-to-action.
            - `onClick` triggers the checkout process.
            - `disabled` prevents the user from clicking the button multiple times while a request is in progress.
          */}
          <Button className="w-full" onClick={handleCheckout} disabled={loading}>
            {loading ? 'Processing...' : 'Upgrade to Pro'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}