// app/account/page.tsx
// This is a Server Component, meaning it runs on the server.
// It fetches data directly from the database and renders the UI.

import { auth } from '@clerk/nextjs/server'; // Import auth helper for server-side authentication
import supabaseAdmin from '@/lib/supabaseAdmin'; // Import the Supabase admin client for server-side access
import { logger } from '@/lib/logger'; // Import the logger for structured logging
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'; // Assuming shadcn-ui Card components
// Import the new Client Component for the button
import { ManageSubscriptionButton } from '@/components/manage-subscription-button'; 

// Define the shape of the profile data we expect from Supabase
interface UserProfile {
  id: string;
  clerk_user_id: string;
  email: string;
  is_pro: boolean;
  stripe_customer_id: string | null; // Add the stripe_customer_id
  // Add other profile fields as needed
}

export default async function AccountPage() {
  const { userId } = auth(); // Get the authenticated user's ID from Clerk

  // If no user ID is present, it means the user is not authenticated.
  // This case should ideally be handled by middleware, but it's good for robustness.
  if (!userId) {
    logger.warn('Access attempt to /account without authentication. Redirecting to sign-in.');
    // In a production app, you might use permanentRedirect from next/navigation
    return <p>Please sign in to view your account.</p>; // Or client-side redirect
  }

  let userProfile: UserProfile | null = null;
  let errorFetchingProfile: string | null = null;

  try {
    // Fetch the user's profile from Supabase using their Clerk user ID.
    // Ensure 'stripe_customer_id' is selected.
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, clerk_user_id, email, is_pro, stripe_customer_id') // Select all necessary fields
      .eq('clerk_user_id', userId)
      .single();

    if (error) {
      // Log the error if fetching from Supabase fails
      logger.error(`Failed to fetch user profile for userId: ${userId}. Error: ${error.message}`);
      errorFetchingProfile = `Error fetching your profile: ${error.message}`;
    } else if (data) {
      // If data is successfully retrieved, assign it to userProfile
      userProfile = data as UserProfile;
      logger.info(`Successfully fetched user profile for userId: ${userId}`);
    } else {
      // This case handles if data is null but no explicit error occurred (e.g., user not found)
      logger.warn(`No profile found in Supabase for userId: ${userId}`);
      errorFetchingProfile = 'No profile found. Please contact support.';
    }
  } catch (err: any) {
    // Catch any unexpected errors during the Supabase call
    logger.error(`Unexpected error while fetching profile for userId: ${userId}. Error: ${err.message}`);
    errorFetchingProfile = 'An unexpected error occurred while loading your profile.';
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Your Account</CardTitle>
          <CardDescription>Manage your profile and subscription settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {errorFetchingProfile ? (
            <div className="text-red-500 bg-red-100 p-3 rounded">
              <p>{errorFetchingProfile}</p>
            </div>
          ) : userProfile ? (
            <div className="space-y-4">
              <p>
                <strong>Email:</strong> {userProfile.email}
              </p>
              <p>
                <strong>Subscription Status:</strong>{' '}
                {userProfile.is_pro ? (
                  <span className="text-green-600 font-semibold">Pro Plan</span>
                ) : (
                  <span className="text-gray-600">Free Tier</span>
                )}
              </p>
              <p className="text-sm text-gray-500">
                To manage your payment method or subscription, you'll be redirected to Stripe's secure portal.
              </p>
              {/* Render the new Client Component here, passing necessary props */}
              <ManageSubscriptionButton
                isPro={userProfile.is_pro}
                hasStripeCustomerId={!!userProfile.stripe_customer_id} // Convert to boolean
              />
            </div>
          ) : (
            <p>Loading profile...</p> // Should not happen if userId is present and no error, but good fallback
          )}
        </CardContent>
      </Card>
    </div>
  );
}