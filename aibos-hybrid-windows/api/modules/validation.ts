/**
 * Result of a validation operation
 */
export type ValidationResult = {
  valid: boolean;
  message?: string;
  code?: string; // Optional error code for programmatic handling
};

/**
 * Windows reserved names that cannot be used for files or folders
 */
export const WINDOWS_RESERVED_NAMES = [
  "CON", "PRN", "AUX", "NUL",
  "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
  "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"
] as const;

/**
 * Invalid characters for file/folder names
 */
export const INVALID_NAME_CHARS = /[<>:"/\\|?*\x00-\x1f]/;

/**
 * Invalid characters for paths
 */
export const INVALID_PATH_CHARS = /[\x00-\x1f]/;

/**
 * UUID validation regex
 */
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Email validation regex
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Common validation error codes
 */
export const ValidationErrorCodes = {
  EMPTY_NAME: "ERR_EMPTY_NAME",
  LEADING_TRAILING_SPACES: "ERR_LEADING_TRAILING_SPACES",
  DOT_ONLY_NAME: "ERR_DOT_ONLY_NAME",
  NAME_TOO_LONG: "ERR_NAME_TOO_LONG",
  INVALID_CHARS: "ERR_INVALID_CHARS",
  RESERVED_NAME: "ERR_RESERVED_NAME",
  EMPTY_PATH: "ERR_EMPTY_PATH",
  PATH_TOO_LONG: "ERR_PATH_TOO_LONG",
  PATH_CONTAINS_DOTS: "ERR_PATH_CONTAINS_DOTS",
  EMPTY_ID: "ERR_EMPTY_ID",
  ID_TOO_LONG: "ERR_ID_TOO_LONG",
  INVALID_UUID: "ERR_INVALID_UUID",
  INVALID_EMAIL: "ERR_INVALID_EMAIL",
} as const;

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || typeof email !== 'string') {
    return {
      valid: false,
      message: "Email cannot be empty",
      code: ValidationErrorCodes.EMPTY_NAME,
    };
  }

  if (!EMAIL_REGEX.test(email)) {
    return {
      valid: false,
      message: "Invalid email format",
      code: ValidationErrorCodes.INVALID_EMAIL,
    };
  }
  
  return {
    valid: true,
  };
}

/**
 * Validate file or folder name
 */
export function validateFileName(name: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return {
      valid: false,
      message: "Name cannot be empty",
      code: ValidationErrorCodes.EMPTY_NAME,
    };
  }

  // Check for leading/trailing spaces
  if (name !== name.trim()) {
    return {
      valid: false,
      message: "Name cannot start or end with spaces",
      code: ValidationErrorCodes.LEADING_TRAILING_SPACES,
    };
  }

  // Check for dot-only names
  if (name === "." || name === "..") {
    return {
      valid: false,
      message: "Name cannot be '.' or '..'",
      code: ValidationErrorCodes.DOT_ONLY_NAME,
    };
  }

  if (name.length > 255) {
    return {
      valid: false,
      message: "Name is too long (max 255 characters)",
      code: ValidationErrorCodes.NAME_TOO_LONG,
    };
  }

  // Check for invalid characters
  if (INVALID_NAME_CHARS.test(name)) {
    return {
      valid: false,
      message: "Name contains invalid characters",
      code: ValidationErrorCodes.INVALID_CHARS,
    };
  }

  // Check for reserved names (Windows) - including with extensions
  const baseName = name.toUpperCase().split(".")[0];
  if (WINDOWS_RESERVED_NAMES.includes(baseName as any)) {
    return {
      valid: false,
      message: "Name is reserved by the system",
      code: ValidationErrorCodes.RESERVED_NAME,
    };
  }

  return {
    valid: true,
  };
}

/**
 * Validate file path
 */
export function validatePath(path: string): ValidationResult {
  if (!path || path.trim().length === 0) {
    return {
      valid: false,
      message: "Path cannot be empty",
      code: ValidationErrorCodes.EMPTY_PATH,
    };
  }

  if (path.includes("..")) {
    return {
      valid: false,
      message: "Path cannot contain '..'",
      code: ValidationErrorCodes.PATH_CONTAINS_DOTS,
    };
  }

  if (path.length > 4096) {
    return {
      valid: false,
      message: "Path is too long (max 4096 characters)",
      code: ValidationErrorCodes.PATH_TOO_LONG,
    };
  }

  // Check for invalid characters
  if (INVALID_PATH_CHARS.test(path)) {
    return {
      valid: false,
      message: "Path contains invalid characters",
      code: ValidationErrorCodes.INVALID_CHARS,
    };
  }

  return {
    valid: true,
  };
}

/**
 * Validate item ID
 */
export function validateItemId(id: string): ValidationResult {
  if (!id || id.trim().length === 0) {
    return {
      valid: false,
      message: "ID cannot be empty",
      code: ValidationErrorCodes.EMPTY_ID,
    };
  }

  if (id.length > 128) {
    return {
      valid: false,
      message: "ID is too long (max 128 characters)",
      code: ValidationErrorCodes.ID_TOO_LONG,
    };
  }

  // Check for valid UUID format
  if (!UUID_REGEX.test(id)) {
    return {
      valid: false,
      message: "ID is not a valid UUID",
      code: ValidationErrorCodes.INVALID_UUID,
    };
  }

  return {
    valid: true,
  };
}

/**
 * Convenience function for name validation
 */
export function isValidName(name: string): boolean {
  return validateFileName(name).valid;
}

/**
 * Convenience function for path validation
 */
export function isValidPath(path: string): boolean {
  return validatePath(path).valid;
}

/**
 * Convenience function for ID validation
 */
export function isValidId(id: string): boolean {
  return validateItemId(id).valid;
}

/**
 * Convenience function for email validation
 */
export function isValidEmail(email: string): boolean {
  return validateEmail(email).valid;
}
