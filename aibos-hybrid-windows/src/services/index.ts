// Enterprise Services Index - Single source of truth
export { SystemService } from './system/index.ts';
export { FileIndexerService, fileIndexer } from './fileIndexer.ts';
export { enhancedSearchProvider } from './enhancedSearchProvider.ts';
export { systemIntegration } from './systemIntegration.ts';

// Core utilities
export * from './core/logger.ts';

// Types
export type { SystemInfo, SystemCapabilities, PowerState } from './system/types.ts';
export type { FileMetadata, SearchFilters, IndexingProgress } from './fileIndexer.ts';
export type { SearchResult, SearchProvider } from '../types/search.ts';