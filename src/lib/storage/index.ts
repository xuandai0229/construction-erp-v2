import { DocumentStorageProvider } from './types';
import { LocalStorageProvider } from './local-storage-provider';

export * from './types';
export * from './local-storage-provider'; // Export utils if needed elsewhere

// Export a singleton instance. 
// In Phase C2, this could switch between LocalStorageProvider and S3StorageProvider 
// based on environment variables.
export const storageProvider: DocumentStorageProvider = new LocalStorageProvider();
