'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import logger from '@/lib/logger';

interface ManageSubscriptionButtonProps {
  isPro: boolean;
  hasStripeCustomerId: boolean;
}

export function ManageSubscriptionButton({ isPro, hasStripeCustomerId }: ManageSubscriptionButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    logger.info('Attempting to create Stripe portal session.');

    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create portal session.');
      }

      const { url } = await response.json();
      logger.info('Successfully created Stripe portal session. Redirecting...');
      window.location.href = url;
    } catch (error) {
      logger.error('Error creating Stripe portal session:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'An unknown error occurred.'}`);
      setIsLoading(false);
    }
  };

  if (!hasStripeCustomerId) {
    return null; // Don't show the button if there's no customer ID
  }

  return (
    <Button onClick={handleClick} disabled={isLoading}>
      {isLoading ? 'Redirecting...' : 'Manage Subscription'}
    </Button>
  );
}