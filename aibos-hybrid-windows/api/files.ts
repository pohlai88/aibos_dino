/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { InMemoryStorage } from "./modules/filesystem.ts";
import { SupabaseStorage } from "./modules/supabaseStorage.ts";
import { FileOperations } from "./modules/fileOperations.ts";
import { formatSize } from "./modules/utils.ts";
import { isValidPath, ValidationErrorCodes } from "./modules/validation.ts";
import { FileOperationErrorCodes, FileStorage } from "./modules/types.ts";

// Path validation helper - using the centralized validation
function validateApiPath(path: string): boolean {
  return isValidPath(path) && !path.includes("..") && /^[a-zA-Z0-9_\/-]*$/.test(path);
}

// Initialize storage based on environment
const storage: FileStorage = Deno.env.get("STORAGE_TYPE") === "supabase"
  ? new SupabaseStorage()
  : new InMemoryStorage();

const fileOps = new FileOperations(storage);

// Log storage backend and environment on startup
console.log(
  `🚀 File API server running on http://localhost:8000\n` +
  `📦 Storage backend: ${Deno.env.get("STORAGE_TYPE") || "memory"}\n` +
  `🕐 Started at: ${new Date().toISOString()}`
);

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const url = new URL(req.url);
  const path = url.searchParams.get("path") || "";

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-tenant-id, Authorization, X-Request-Id",
    "X-Request-Id": requestId,
  };

  // Log all requests for auditing
  console.log(`[${requestId}] ${req.method} ${url.pathname}${path ? `?path=${path}` : ''}`);

  // Health check endpoint
  if (url.pathname === "/health") {
    return Response.json({
      ok: true,
      requestId,
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      storage: Deno.env.get("STORAGE_TYPE") || "memory",
    }, { headers });
  }

  // Handle OPTIONS requests
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  // Path validation
  if (!validateApiPath(path)) {
    return responseError("Invalid path format.", headers, 422, requestId, ValidationErrorCodes.INVALID_CHARS);
  }

  try {
    switch (req.method) {
      case "GET": {
        const result = await fileOps.getFileTree(path);
        if (!result.success) {
          const errorMessage = typeof result.error === 'string' ? result.error : result.error?.message || 'Unknown error';
          return responseError(errorMessage, headers, 404, requestId);
        }

        // Format file sizes for display
        const formatted = (result.data as any[]).map((item) => ({
          ...item,
          size: item.size ? formatSize(item.size) : undefined,
        }));

        return Response.json({
          success: true,
          data: { files: formatted, path },
          requestId
        }, { headers });
      }

      case "POST": {
        let body;
        try {
          body = await req.json();
        } catch {
          return responseError("Invalid JSON body.", headers, 400, requestId, "ERR_INVALID_JSON");
        }

        // Validate body structure
        if (!body || typeof body !== 'object') {
          return responseError("Request body must be an object.", headers, 400, requestId, "ERR_INVALID_BODY");
        }

        const { action, name, itemId, targetPath, content } = body;

        // Validate action
        if (typeof action !== 'string') {
          return responseError("Action must be a string.", headers, 400, requestId, "ERR_INVALID_ACTION");
        }

        let result;

        switch (action) {
          case "createFolder":
            if (!name || typeof name !== 'string') {
              return responseError("Folder name is required and must be a string.", headers, 422, requestId, ValidationErrorCodes.EMPTY_NAME);
            }
            result = await fileOps.createFolder(path, name);
            break;

          case "createFile":
            if (!name || typeof name !== 'string') {
              return responseError("File name is required and must be a string.", headers, 422, requestId, ValidationErrorCodes.EMPTY_NAME);
            }
            result = await fileOps.createFile(path, name, content || "", (content || "").length);
            break;

          case "rename":
            if (!itemId || typeof itemId !== 'string' || !name || typeof name !== 'string') {
              return responseError("Item ID and new name are required and must be strings.", headers, 422, requestId, ValidationErrorCodes.EMPTY_NAME);
            }
            result = await fileOps.renameItem(path, itemId, name);
            break;

          case "delete":
            if (!itemId || typeof itemId !== 'string') {
              return responseError("Item ID is required and must be a string.", headers, 422, requestId, "ERR_MISSING_ITEM_ID");
            }
            result = await fileOps.deleteItem(path, itemId);
            break;

          case "copy":
            if (!itemId || typeof itemId !== 'string' || !targetPath || typeof targetPath !== 'string') {
              return responseError("Item ID and target path are required and must be strings.", headers, 422, requestId, "ERR_MISSING_PARAMS");
            }
            if (!validateApiPath(targetPath)) {
              return responseError("Invalid target path format.", headers, 422, requestId, ValidationErrorCodes.INVALID_CHARS);
            }
            result = await fileOps.copyItem(path, targetPath, itemId);
            break;

          case "move":
            if (!itemId || typeof itemId !== 'string' || !targetPath || typeof targetPath !== 'string') {
              return responseError("Item ID and target path are required and must be strings.", headers, 422, requestId, "ERR_MISSING_PARAMS");
            }
            if (!validateApiPath(targetPath)) {
              return responseError("Invalid target path format.", headers, 422, requestId, ValidationErrorCodes.INVALID_CHARS);
            }
            result = await fileOps.moveItem(path, targetPath, itemId);
            break;

          default:
            return responseError(`Invalid action: ${action}`, headers, 400, requestId, "ERR_INVALID_ACTION");
        }

        // Determine appropriate status code based on error type
        let statusCode = 200;
        if (!result.success) {
          const errorMessage = typeof result.error === 'string' ? result.error : result.error?.message || 'Unknown error';
          const errorCode = typeof result.error === 'object' ? result.error?.code : undefined;
          
          // Map error types to appropriate HTTP status codes
          if (errorCode === FileOperationErrorCodes.ALREADY_EXISTS) {
            statusCode = 409; // Conflict
          } else if (errorCode === FileOperationErrorCodes.NOT_FOUND) {
            statusCode = 404; // Not Found
          } else if (errorCode?.startsWith('ERR_INVALID_') || errorCode?.startsWith('ERR_MISSING_')) {
            statusCode = 422; // Unprocessable Entity
          } else {
            statusCode = 400; // Bad Request
          }
          
          return responseError(errorMessage, headers, statusCode, requestId, errorCode);
        }

        return Response.json({ ...result, requestId }, { headers, status: statusCode });
      }

      default:
        return responseError("Method not allowed.", headers, 405, requestId, "ERR_METHOD_NOT_ALLOWED");
    }
  } catch (e) {
    console.error(`[${requestId}] API Error:`, e, { url: req.url, method: req.method, path });
    return responseError("Internal server error.", headers, 500, requestId, "ERR_INTERNAL");
  }
});

function responseError(
  message: string, 
  headers: HeadersInit, 
  status = 400, 
  requestId?: string,
  code?: string
) {
  const response = {
    success: false,
    error: message,
    requestId,
    ...(code && { code }),
  };

  return Response.json(response, { status, headers });
}
