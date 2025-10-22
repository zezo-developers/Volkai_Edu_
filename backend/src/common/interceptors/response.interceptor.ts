import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';

/**
 * Interface for standardized API response format
 */
export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  meta?: {
    timestamp: string;
    path: string;
    method: string;
    requestId?: string;
  };
}

/**
 * Response interceptor that standardizes all API responses
 * Ensures consistent response format across the entire application
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  private readonly logger = new Logger(ResponseInterceptor.name);
  private readonly isProduction: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    return next.handle().pipe(
      map((data) => {
        const statusCode = response.statusCode;
        
        // Don't transform if data is already in the correct format
        if (data && typeof data === 'object' && 'success' in data) {
          return this.sanitizeResponseData(data as ApiResponse<T>, request);
        }

        // Create standardized response
        const apiResponse: ApiResponse<T> = {
          success: statusCode >= 200 && statusCode < 300,
          statusCode,
          message: this.getDefaultMessage(statusCode),
          ...(data !== null && data !== undefined && { data: this.sanitizeData(data) }),
          meta: {
            timestamp: new Date().toISOString(),
            path: this.sanitizePath(request.url),
            method: request.method,
            ...(request['requestId'] && { requestId: request['requestId'] }),
          },
        };

        return apiResponse;
      }),
      catchError((error) => {
        // Log unexpected errors that weren't caught by the global filter
        this.logger.warn('Unhandled error in response interceptor', {
          error: error.message,
          path: request.url,
          method: request.method,
        });
        
        // Re-throw to be handled by global exception filter
        return throwError(() => error);
      }),
    );
  }

  /**
   * Get default success message based on HTTP status code
   */
  private getDefaultMessage(statusCode: number): string {
    switch (statusCode) {
      case 200:
        return 'Operation completed successfully';
      case 201:
        return 'Resource created successfully';
      case 202:
        return 'Request accepted for processing';
      case 204:
        return 'Operation completed successfully';
      default:
        return 'Operation completed';
    }
  }

  /**
   * Sanitize response data to remove sensitive information
   */
  private sanitizeResponseData(response: ApiResponse<T>, request: Request): ApiResponse<T> {
    const sanitized = { ...response };
    
    // Sanitize path in meta
    if (sanitized.meta) {
      sanitized.meta.path = this.sanitizePath(sanitized.meta.path);
    }
    
    // Add request ID if available
    const requestId = (request as any).requestId;
    if (requestId && sanitized.meta) {
      sanitized.meta = { ...sanitized.meta, requestId };
    }
    
    // Sanitize data if present
    if (sanitized.data) {
      sanitized.data = this.sanitizeData(sanitized.data);
    }
    
    return sanitized;
  }

  /**
   * Sanitize data to remove sensitive information
   */
  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    // Handle arrays
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    // Handle objects
    const sanitized = { ...data };
    
    // Remove sensitive fields in production
    if (this.isProduction) {
      const sensitiveFields = [
        'password',
        'passwordHash',
        'refreshTokenHash',
        'emailVerificationToken',
        'passwordResetToken',
        'twoFactorSecret',
        'apiKey',
        'secret',
        'privateKey',
        'connectionString',
        'databaseUrl',
      ];

      for (const field of sensitiveFields) {
        if (sanitized[field]) {
          delete sanitized[field];
        }
      }
    }

    // Recursively sanitize nested objects
    for (const key in sanitized) {
      if (sanitized[key] && typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    }

    return sanitized;
  }

  /**
   * Sanitize URL path to remove sensitive information
   */
  private sanitizePath(path: string): string {
    if (!path) return path;

    // Remove query parameters that might contain sensitive data
    const [pathname, queryString] = path.split('?');
    
    if (!queryString) return pathname;

    // Filter out sensitive query parameters
    const sensitiveParams = [
      'token',
      'apiKey',
      'api_key',
      'password',
      'secret',
      'auth',
      'authorization',
    ];

    const params = new URLSearchParams(queryString);
    const sanitizedParams = new URLSearchParams();

    for (const [key, value] of params.entries()) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveParams.some(param => 
        lowerKey.includes(param.toLowerCase())
      );

      if (isSensitive) {
        sanitizedParams.set(key, '[REDACTED]');
      } else {
        sanitizedParams.set(key, value);
      }
    }

    const sanitizedQuery = sanitizedParams.toString();
    return sanitizedQuery ? `${pathname}?${sanitizedQuery}` : pathname;
  }
}
