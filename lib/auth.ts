/**
 * Authentication utilities - Authentication has been removed from this application
 */

import logger from './logger';

/**
 * Get the current user (authentication removed)
 * @returns null since authentication is disabled
 */
export async function getCurrentUser() {
  logger.info('getCurrentUser called - authentication has been removed');
  return null;
}

/**
 * Check if user is authenticated (authentication removed)
 * @returns false since authentication is disabled
 */
export function isAuthenticated() {
  return false;
}