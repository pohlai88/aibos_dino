import { Metrics } from "./metrics.ts";
import { EventBus } from "./eventBus.ts";

/**
 * Middleware configuration options
 */
export interface MiddlewareOptions {
  /** Enable request logging */
  enableLogging?: boolean;
  /** Enable metrics collection */
  enableMetrics?: boolean;
  /** Enable error tracking */
  enableErrorTracking?: boolean;
  /** Custom error handler */
  errorHandler?: (error: Error, requestId: string) => void;
}

/**
 * Request context for middleware
 */
export interface RequestContext {
  requestId: string;
  method: string;
  url: string;
  path: string;
  startTime: number;
  metrics?: Metrics;
  eventBus?: EventBus;
}

/**
 * Centralized error response handler
 */
export function createErrorResponse(
  message: string,
  status: number,
  requestId: string,
  code?: string,
  headers: HeadersInit = {}
): Response {
  const response = {
    success: false,
    error: message,
    requestId,
    ...(code && { code }),
  };

  return Response.json(response, { 
    status, 
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-tenant-id, Authorization, X-Request-Id",
      "X-Request-Id": requestId,
      ...headers
    }
  });
}

/**
 * Safe JSON parsing middleware
 */
export async function safeJsonParse(req: Request): Promise<any> {
  try {
    return await req.json();
  } catch (error) {
    throw new Error("Invalid JSON body");
  }
}

/**
 * Request logging middleware
 */
export function logRequest(context: RequestContext, options: MiddlewareOptions = {}): void {
  if (!options.enableLogging) return;

  const { requestId, method, url, path } = context;
  console.log(`[${requestId}] ${method} ${url}${path ? `?path=${path}` : ''}`);
}

/**
 * Request completion logging middleware
 */
export function logRequestCompletion(context: RequestContext, status: number, options: MiddlewareOptions = {}): void {
  if (!options.enableLogging) return;

  const { requestId, method, url, startTime } = context;
  const duration = Date.now() - startTime;
  const statusEmoji = status >= 400 ? "❌" : status >= 300 ? "🔄" : "✅";
  
  console.log(`${statusEmoji} [${requestId}] ${method} ${url} - ${status} (${duration}ms)`);
}

/**
 * Metrics collection middleware
 */
export function collectMetrics(context: RequestContext, status: number, options: MiddlewareOptions = {}): void {
  if (!options.enableMetrics || !context.metrics) return;

  const { method, path } = context;
  
  // Increment request counters
  context.metrics.increment(`api.requests.total`);
  context.metrics.increment(`api.requests.${method.toLowerCase()}`);
  
  // Track status codes
  if (status >= 500) {
    context.metrics.increment(`api.errors.server`);
  } else if (status >= 400) {
    context.metrics.increment(`api.errors.client`);
  } else {
    context.metrics.increment(`api.success`);
  }

  // Track response times
  const duration = Date.now() - context.startTime;
  if (duration > 1000) {
    context.metrics.increment(`api.slow_requests`);
  }
}

/**
 * Error tracking middleware
 */
export function trackError(error: Error, context: RequestContext, options: MiddlewareOptions = {}): void {
  if (!options.enableErrorTracking) return;

  const { requestId, method, url, path } = context;
  
  // Log error with context
  console.error(`[${requestId}] API Error:`, {
    error: error.message,
    stack: error.stack,
    method,
    url,
    path,
    timestamp: new Date().toISOString()
  });

  // Emit error event if event bus is available
  if (context.eventBus) {
    context.eventBus.emit('api.error', {
      error: error.message,
      requestId,
      method,
      url,
      path,
      timestamp: new Date().toISOString()
    });
  }

  // Call custom error handler if provided
  if (options.errorHandler) {
    options.errorHandler(error, requestId);
  }
}

/**
 * CORS middleware
 */
export function handleCORS(req: Request, requestId: string): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-tenant-id, Authorization, X-Request-Id",
        "X-Request-Id": requestId,
      }
    });
  }
  return null;
}

/**
 * Health check middleware
 */
export function handleHealthCheck(url: URL, requestId: string): Response | null {
  if (url.pathname === "/health") {
    return Response.json({
      ok: true,
      requestId,
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      storage: Deno.env.get("STORAGE_TYPE") || "memory",
    }, { 
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "X-Request-Id": requestId,
      }
    });
  }
  return null;
}

/**
 * Main middleware handler that orchestrates all middleware
 */
export function createMiddlewareHandler(
  handler: (req: Request, context: RequestContext) => Promise<Response>,
  options: MiddlewareOptions = {}
) {
  return async (req: Request): Promise<Response> => {
    const requestId = crypto.randomUUID();
    const url = new URL(req.url);
    const path = url.searchParams.get("path") || "";
    
    const context: RequestContext = {
      requestId,
      method: req.method,
      url: req.url,
      path,
      startTime: Date.now(),
      metrics: options.enableMetrics ? new Metrics() : undefined,
      eventBus: options.enableErrorTracking ? new EventBus() : undefined,
    };

    try {
      // Handle CORS preflight
      const corsResponse = handleCORS(req, requestId);
      if (corsResponse) return corsResponse;

      // Handle health check
      const healthResponse = handleHealthCheck(url, requestId);
      if (healthResponse) return healthResponse;

      // Log request start
      logRequest(context, options);

      // Execute main handler
      const response = await handler(req, context);

      // Log request completion
      logRequestCompletion(context, response.status, options);

      // Collect metrics
      collectMetrics(context, response.status, options);

      return response;

    } catch (error) {
      // Track error
      trackError(error as Error, context, options);

      // Return error response
      return createErrorResponse(
        "Internal server error",
        500,
        requestId,
        "ERR_INTERNAL"
      );
    }
  };
} 