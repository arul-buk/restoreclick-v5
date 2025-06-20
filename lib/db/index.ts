// lib/db/index.ts
// Centralized exports for all database services

export * from './customers';
export * from './orders';
export * from './restoration-jobs';
export * from './email-queue';

// Re-export storage service
export { storageService, StorageService } from '../storage/storage-service';

// Re-export database types
export type { Database } from '../database.types';
