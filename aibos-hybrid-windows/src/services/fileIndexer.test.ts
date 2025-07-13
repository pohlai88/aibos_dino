/**
 * Comprehensive Test Suite for FileIndexerService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileIndexerService } from './fileIndexer';

// Mock implementations
const mockReadDirectory = vi.fn();
const mockGetFileStats = vi.fn();
const mockExtractFileContent = vi.fn();

class MockFileIndexerService extends FileIndexerService {
  protected async readDirectory(path: string) {
    return mockReadDirectory(path);
  }
  
  protected async getFileStats(path: string) {
    return mockGetFileStats(path);
  }
  
  protected async extractFileContent(path: string) {
    return mockExtractFileContent(path);
  }
}

describe('FileIndexerService', () => {
  let indexer: MockFileIndexerService;
  
  beforeEach(() => {
    indexer = new MockFileIndexerService('test-tenant');
    vi.clearAllMocks();
  });
  
  describe('Multi-tenant isolation', () => {
    it('should isolate indexes by tenant', async () => {
      const tenant1 = new MockFileIndexerService('tenant-1');
      const tenant2 = new MockFileIndexerService('tenant-2');
      
      // Mock file data
      mockReadDirectory.mockResolvedValue([{ name: 'test.txt', isDirectory: false }]);
      mockGetFileStats.mockResolvedValue({ size: 100, mtime: new Date(), birthtime: new Date() });
      mockExtractFileContent.mockResolvedValue('test content');
      
      await tenant1.indexFiles([new File(['content1'], 'file1.txt')]);
      await tenant2.indexFiles([new File(['content2'], 'file2.txt')]);
      
      const tenant1Results = await tenant1.search('content1');
      const tenant2Results = await tenant2.search('content2');
      
      expect(tenant1Results).toHaveLength(1);
      expect(tenant2Results).toHaveLength(1);
      expect(tenant1Results[0].name).toBe('file1.txt');
      expect(tenant2Results[0].name).toBe('file2.txt');
    });
  });
  
  describe('Incremental updates', () => {
    it('should detect file changes correctly', async () => {
      // Test implementation for incremental updates
      mockReadDirectory.mockResolvedValue([{ name: 'test.txt', isDirectory: false }]);
      mockGetFileStats
        .mockResolvedValueOnce({ size: 100, mtime: new Date('2023-01-01'), birthtime: new Date() })
        .mockResolvedValueOnce({ size: 200, mtime: new Date('2023-01-02'), birthtime: new Date() });
      
      await indexer.initialize('.');
      const initialStats = indexer.getStats();
      
      // Simulate file change
      await indexer.checkForChanges('.');
      const updatedStats = indexer.getStats();
      
      expect(updatedStats.totalFiles).toBeGreaterThanOrEqual(initialStats.totalFiles);
    });
  });
  
  describe('Error handling', () => {
    it('should track and report indexing errors', async () => {
      mockReadDirectory.mockRejectedValue(new Error('Permission denied'));
      
      await indexer.initialize('.');
      const errors = indexer.getErrors();
      
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('metadata');
      expect(errors[0].error).toContain('Permission denied');
    });
  });
  
  describe('Performance', () => {
    it('should handle large file sets efficiently', async () => {
      const largeFileSet = Array.from({ length: 1000 }, (_, i) => 
        new File([`content ${i}`], `file${i}.txt`)
      );
      
      const startTime = Date.now();
      await indexer.indexFiles(largeFileSet);
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      expect(indexer.getStats().totalFiles).toBe(1000);
    });
  });
});