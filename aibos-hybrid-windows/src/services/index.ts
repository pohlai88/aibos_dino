// Enterprise Services Index - Single source of truth
export { SystemService } from './system';
export { FileIndexerService, fileIndexer } from './fileIndexer';
export { EnhancedSearchProvider } from './enhancedSearchProvider';
export { systemIntegration } from './systemIntegration';

// Core utilities
export * from './core';

// Types
export type { SystemInfo, SystemCapabilities, PowerState } from './system/types';
export type { FileMetadata, SearchFilters, IndexingProgress } from './fileIndexer';
export type { SearchResult, SearchProvider } from '../types/search';