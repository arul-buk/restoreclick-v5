/**
 * @file This file contains server-side authentication helpers.
 * These functions are meant to be used in API routes and server components
 * to check the current user's session and permissions.
 */

import { auth } from '@clerk/nextjs/server';
import supabaseAdmin from './supabaseAdmin';
import logger from './logger';

// Define the possible user roles in our system.
type UserRole = 'user' | 'admin';

/**
 * Retrieves the full user profile from our database, including their role.
 * This is the central function for fetching the current user's application-specific data.
 *
 * @returns {Promise<{profile: {id: string, email: string, role: UserRole} | null}>} An object containing the user's profile or null if not found/authenticated.
 */
export async function getCurrentUser() {
  // First, get the basic authentication data from Clerk.
  const { userId } = auth();

  if (!userId) {
    // If there's no user ID from Clerk, there's no session.
    return { profile: null };
  }

  // Now, use the Clerk user ID to fetch our custom profile data from Supabase.
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, email, role')
    .eq('clerk_user_id', userId)
    .single();

  if (error) {
    // If there was an error fetching the profile, log it. This shouldn't happen for a valid user.
    logger.error({ error, clerk_user_id: userId }, "Failed to fetch user profile from database.");
    return { profile: null };
  }

  // Return the profile data, asserting the role type for type safety.
  return { profile: { ...data, role: data.role as UserRole } };
}

/**
 * A specific helper function to quickly check if the current user is an admin.
 * This is useful for protecting admin-only API routes or server components.
 *
 * @returns {Promise<boolean>} True if the user is an admin, false otherwise.
 */
export async function isAdmin(): Promise<boolean> {
  const { profile } = await getCurrentUser();
  
  // If there's no profile or the role is not 'admin', return false.
  if (!profile || profile.role !== 'admin') {
    return false;
  }

  // Otherwise, the user is an admin.
  return true;
}