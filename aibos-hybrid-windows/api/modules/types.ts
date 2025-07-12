/**
 * Represents a file or folder in the virtual file system.
 * Using discriminated unions for better type safety.
 */
export type FileItem = File | Folder;

/**
 * Represents a file in the virtual file system.
 */
export interface File {
  /** Unique identifier for the item */
  id: string;
  /** Display name of the file */
  name: string;
  /** Type discriminator - always "file" */
  type: "file";
  /** File size in bytes (required for files) */
  size: number;
  /** Last modification date in ISO format */
  modified: string;
  /** Unicode emoji or icon representation */
  icon: string;
  /** Full path string (e.g. "Adobe/Photoshop") */
  path: string;
}

/**
 * Represents a folder in the virtual file system.
 */
export interface Folder {
  /** Unique identifier for the item */
  id: string;
  /** Display name of the folder */
  name: string;
  /** Type discriminator - always "folder" */
  type: "folder";
  /** Last modification date in ISO format */
  modified: string;
  /** Unicode emoji or icon representation */
  icon: string;
  /** Full path string (e.g. "Adobe/Photoshop") */
  path: string;
}

/**
 * Structured error information for operations
 */
export interface OperationError {
  /** Human-readable error message */
  message: string;
  /** Optional error code for programmatic handling */
  code?: string;
  /** Optional additional context */
  details?: Record<string, any>;
}

/**
 * Standard structure returned by operations.
 */
export interface OperationResult<T = FileItem | FileItem[]> {
  success: boolean;
  data?: T;
  error?: string | OperationError;
}

/**
 * Abstraction for file system storage backends.
 */
export interface FileStorage {
  getFiles(path: string): Promise<FileItem[]>;
  saveFiles(path: string, files: FileItem[]): Promise<void>;
  deleteFile(path: string, itemId: string): Promise<boolean>;
}

/**
 * Utility types for cleaner function signatures
 */
export type FileItemOnly = File;
export type FolderItem = Folder;
export type FileItemArray = FileItem[];

/**
 * Type guards for runtime type checking
 */
export function isFile(item: FileItem): item is File {
  return item.type === "file";
}

export function isFolder(item: FileItem): item is Folder {
  return item.type === "folder";
}

export function isValidOperationResult<T>(result: any): result is OperationResult<T> {
  return typeof result === "object" && 
         result !== null && 
         typeof result.success === "boolean";
}

/**
 * Enhanced type guard for operation results with data validation
 */
export function isValidOperationResultWithData<T>(
  result: any, 
  dataValidator?: (data: any) => data is T
): result is OperationResult<T> {
  if (!isValidOperationResult(result)) {
    return false;
  }
  
  if (result.success && result.data !== undefined) {
    return dataValidator ? dataValidator(result.data) : true;
  }
  
  return true;
}

/**
 * Type guard for checking if operation result has error
 */
export function hasError(result: OperationResult): result is OperationResult & { error: string | OperationError } {
  return !result.success && result.error !== undefined;
}

/**
 * Type guard for checking if operation result has data
 */
export function hasData<T>(result: OperationResult<T>): result is OperationResult<T> & { data: T } {
  return result.success && result.data !== undefined;
}

/**
 * Legacy type for backward compatibility
 * Used by legacy file upload/download APIs
 */
export type FileMetadata = {
  name: string;
  size: number;
  mimeType: string;
};

/**
 * Common error codes for file operations
 */
export const FileOperationErrorCodes = {
  NOT_FOUND: "FILE_NOT_FOUND",
  ALREADY_EXISTS: "FILE_ALREADY_EXISTS",
  INVALID_NAME: "INVALID_FILE_NAME",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  STORAGE_ERROR: "STORAGE_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
} as const;

export type FileOperationErrorCode = typeof FileOperationErrorCodes[keyof typeof FileOperationErrorCodes];
