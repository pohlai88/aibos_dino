/**
 * Check if an object has a specific property
 */
export function hasOwn(obj: any, key: string): boolean {
  return Object.hasOwn(obj, key);
}

/**
 * Sleep for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format file size in human-readable format
 */
export function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 0) return "0 B"; // Handle negative values gracefully
  
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  
  // Safe calculation with bounds checking
  const i = Math.min(
    bytes > 0 ? Math.floor(Math.log(bytes) / Math.log(k)) : 0,
    sizes.length - 1
  );
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

/**
 * Get current date in ISO format
 */
export function currentDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Generate a unique identifier with fallback for older environments
 */
export function generateId(): string {
  // Use crypto.randomUUID() if available (modern environments)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for older environments
  return Math.random().toString(36).substr(2, 9) + 
         Date.now().toString(36) + 
         Math.random().toString(36).substr(2, 9);
}

/**
 * Normalize path by removing extra slashes and dots
 * Preserves root path "/" while normalizing others
 */
export function normalizePath(path: string): string {
  if (!path || typeof path !== 'string') {
    return '';
  }
  
  return path
    .replace(/\/+/g, '/') // Replace multiple slashes with single slash
    .replace(/\/$/, path === "/" ? "/" : ""); // Remove trailing slash except for root
}

/**
 * Get parent directory path
 * Returns empty string for root path or single-level paths
 */
export function getParentPath(path: string): string {
  if (!path || typeof path !== 'string') {
    return '';
  }
  
  const normalized = normalizePath(path);
  const lastSlash = normalized.lastIndexOf('/');
  
  // Return empty string for root path or single-level paths
  return lastSlash === -1 || lastSlash === 0 ? "" : normalized.substring(0, lastSlash);
}

/**
 * Get file name from path
 * Returns the full path if no directory separator is found
 */
export function getFileName(path: string): string {
  if (!path || typeof path !== 'string') {
    return '';
  }
  
  const normalized = normalizePath(path);
  const lastSlash = normalized.lastIndexOf('/');
  return lastSlash === -1 ? normalized : normalized.substring(lastSlash + 1);
}

/**
 * Join path segments safely
 */
export function joinPath(...segments: string[]): string {
  return segments
    .filter(segment => segment && typeof segment === 'string')
    .map(segment => segment.replace(/^\/+|\/+$/g, '')) // Remove leading/trailing slashes
    .join('/')
    .replace(/\/+/g, '/'); // Normalize multiple slashes
}

/**
 * Check if a path is absolute (starts with "/")
 */
export function isAbsolutePath(path: string): boolean {
  return typeof path === 'string' && path.startsWith('/');
}

/**
 * Check if a path is relative (doesn't start with "/")
 */
export function isRelativePath(path: string): boolean {
  return typeof path === 'string' && !path.startsWith('/');
}
  