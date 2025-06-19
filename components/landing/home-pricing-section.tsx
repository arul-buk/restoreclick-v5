"use client";

import { useState, useEffect } from "react";
import useSWR from 'swr';
import { Check, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import Link from 'next/link';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PriceData {
  id: string;
  unitAmount: number;
  currency: string;
  type: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function HomePricingSection() {
  const { data: priceData, error: priceError, isLoading: isPriceLoading } = 
    useSWR<PriceData>('/api/price', fetcher, {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshWhenOffline: false,
      refreshWhenHidden: false,
      refreshInterval: 0
    });

  useEffect(() => {
    if (priceError) {
      console.error("Error fetching price:", priceError);
      toast.error("Could not load pricing information. Please try refreshing.");
    }
    if (priceData) {
      console.log("Fetched price data for home page:", priceData);
      if (priceData.unitAmount === null || typeof priceData.unitAmount === 'undefined') {
        console.warn("Price data fetched, but unitAmount is missing or null for home page.");
      }
    }
  }, [priceData, priceError]);

  const pricePerPhoto = priceData?.unitAmount ? priceData.unitAmount / 100 : 0;

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-6">
        <h2 className="text-4xl md:text-5xl font-serif font-bold text-center text-brand-text mb-6">
          Simple, Transparent Pricing
        </h2>
        <p className="text-center text-lg text-brand-text/80 max-w-2xl mx-auto mb-12">
          Invest in preserving your legacy. No hidden fees, just beautiful restorations.
        </p>

        <div className="flex justify-center">
          {isPriceLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
              <span className="ml-2 text-brand-text">Loading pricing...</span>
            </div>
          ) : priceError ? (
            <div className="text-center text-red-500">
              <AlertCircle className="h-6 w-6 inline-block mr-2" />
              Failed to load pricing. Please try again later.
            </div>
          ) : (
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Studio Pro</CardTitle>
                <CardContent className="space-y-4">
                  <div className="flex items-center text-4xl font-bold">
                    {pricePerPhoto > 0 ? (
                      <>
                        ${pricePerPhoto}
                        <span className="text-sm font-normal text-muted-foreground">/photo</span>
                      </>
                    ) : (
                      "Price not available"
                    )}
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
                  <Button
                    size="lg"
                    className="w-full bg-brand-accent hover:bg-brand-accent/90 text-white font-semibold py-6 text-lg"
                    asChild
                  >
                    <Link href="/restore-old-photos">Restore Your Photos Now</Link>
                  </Button>
                </CardFooter>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}
