/**
 * Retry utility with exponential backoff for API calls and database operations
 */

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryCondition?: (error: any) => boolean;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  retryCondition: (error) => {
    // Retry on network errors, 5xx errors, but not 4xx client errors
    if (error?.status >= 400 && error?.status < 500) {
      return false; // Don't retry client errors
    }
    return true; // Retry network errors and server errors
  }
};

/**
 * Retry an async operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error;
  
  for (let attempt = 0; attempt < finalConfig.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Check if we should retry this error
      if (finalConfig.retryCondition && !finalConfig.retryCondition(error)) {
        throw error;
      }
      
      // Don't wait after the last attempt
      if (attempt < finalConfig.maxRetries - 1) {
        const delay = Math.min(
          finalConfig.initialDelay * Math.pow(finalConfig.backoffMultiplier, attempt),
          finalConfig.maxDelay
        );
        
        console.log(`Retry attempt ${attempt + 1}/${finalConfig.maxRetries} after ${delay}ms delay`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}

/**
 * Retry wrapper specifically for database operations
 */
export async function retryDatabaseOperation<T>(
  operation: () => Promise<T>,
  operationName: string = 'database operation'
): Promise<T> {
  return retryWithBackoff(operation, {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryCondition: (error) => {
      // Retry on connection errors, timeouts, but not constraint violations
      const errorMessage = error?.message?.toLowerCase() || '';
      if (errorMessage.includes('constraint') || 
          errorMessage.includes('duplicate') ||
          errorMessage.includes('unique')) {
        return false; // Don't retry constraint violations
      }
      return true;
    }
  });
}

/**
 * Retry wrapper specifically for API calls
 */
export async function retryApiCall<T>(
  operation: () => Promise<T>,
  operationName: string = 'API call'
): Promise<T> {
  return retryWithBackoff(operation, {
    maxRetries: 3,
    initialDelay: 2000,
    maxDelay: 15000,
    backoffMultiplier: 2,
    retryCondition: (error) => {
      // Retry on 5xx errors and network errors, but not 4xx client errors
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return true;
    }
  });
}
