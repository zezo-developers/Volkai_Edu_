import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SanitizedError {
  statusCode: number;
  message: string;
  errorCode?: string;
  errors?: string[];
  timestamp: string;
  path: string;
  method: string;
  requestId?: string;
  // Development-only fields
  stack?: string;
  originalMessage?: string;
  details?: any;
}

export interface ErrorContext {
  request: {
    method: string;
    url: string;
    headers?: any;
    body?: any;
    params?: any;
    query?: any;
    ip?: string;
    userAgent?: string;
  };
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
  requestId?: string;
  timestamp: string;
}

/**
 * Error Sanitization Service
 * Handles production-safe error message sanitization and logging
 */
@Injectable()
export class ErrorSanitizationService {
  private readonly logger = new Logger(ErrorSanitizationService.name);
  private readonly isProduction: boolean;
  private readonly isDevelopment: boolean;

  // Production-safe error messages mapped by error codes
  private readonly errorCodeMessages = {
    // Authentication & Authorization
    'AUTH_001': 'Authentication required',
    'AUTH_002': 'Invalid credentials',
    'AUTH_003': 'Access denied',
    'AUTH_004': 'Token expired',
    'AUTH_005': 'Account locked',
    'AUTH_006': 'Email verification required',
    
    // Validation
    'VAL_001': 'Invalid input data',
    'VAL_002': 'Required field missing',
    'VAL_003': 'Invalid format',
    'VAL_004': 'Value out of range',
    'VAL_005': 'File too large',
    'VAL_006': 'Unsupported file type',
    
    // Database
    'DB_001': 'Resource not found',
    'DB_002': 'Resource already exists',
    'DB_003': 'Database operation failed',
    'DB_004': 'Constraint violation',
    'DB_005': 'Connection timeout',
    
    // Business Logic
    'BIZ_001': 'Operation not allowed',
    'BIZ_002': 'Insufficient permissions',
    'BIZ_003': 'Resource limit exceeded',
    'BIZ_004': 'Invalid operation state',
    'BIZ_005': 'Dependency not satisfied',
    
    // External Services
    'EXT_001': 'External service unavailable',
    'EXT_002': 'External service timeout',
    'EXT_003': 'External service error',
    'EXT_004': 'API limit exceeded',
    
    // System
    'SYS_001': 'Internal server error',
    'SYS_002': 'Service temporarily unavailable',
    'SYS_003': 'Configuration error',
    'SYS_004': 'Resource exhausted',
    'SYS_005': 'Maintenance mode',
  };

  // Sensitive patterns to remove from error messages
  private readonly sensitivePatterns = [
    // File paths
    /\/[a-zA-Z0-9_\-\/\.]+\.(js|ts|py|php|java|cpp|c|rb|go)/gi,
    // Database connection strings
    /(?:mongodb|mysql|postgres|redis):\/\/[^\s]+/gi,
    // API keys and tokens
    /(?:api[_\-]?key|token|secret|password)["\s]*[:=]["\s]*[a-zA-Z0-9_\-]+/gi,
    // IP addresses (internal)
    /\b(?:10\.|172\.(?:1[6-9]|2[0-9]|3[01])\.|192\.168\.)\d{1,3}\.\d{1,3}\b/g,
    // Stack trace file paths
    /at\s+[^\s]+\s+\([^)]*\)/g,
    // Environment variables
    /process\.env\.[A-Z_]+/gi,
    // Database table/column names
    /(?:table|column|field)\s+["`']?[a-zA-Z_][a-zA-Z0-9_]*["`']?/gi,
  ];

  // Common error message mappings for production
  private readonly productionMessageMap = {
    // Database errors
    'duplicate key value violates unique constraint': 'Resource already exists',
    'violates foreign key constraint': 'Referenced resource not found',
    'violates not-null constraint': 'Required field missing',
    'connection terminated': 'Database temporarily unavailable',
    'timeout expired': 'Request timeout',
    
    // Authentication errors
    'jwt expired': 'Session expired',
    'jwt malformed': 'Invalid authentication token',
    'invalid signature': 'Invalid authentication token',
    'no authorization token was found': 'Authentication required',
    
    // Validation errors
    'validation failed': 'Invalid input data',
    'cast error': 'Invalid data format',
    'path is required': 'Required field missing',
    
    // File upload errors
    'file too large': 'File size exceeds limit',
    'unexpected field': 'Invalid file field',
    'limit reached': 'Upload limit exceeded',
    
    // Rate limiting
    'too many requests': 'Rate limit exceeded',
    'quota exceeded': 'Usage limit exceeded',
    
    // Generic errors
    'internal server error': 'An unexpected error occurred',
    'service unavailable': 'Service temporarily unavailable',
    'bad gateway': 'External service error',
    'gateway timeout': 'Request timeout',
  };

  constructor(private readonly configService: ConfigService) {
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    this.isDevelopment = this.configService.get<string>('NODE_ENV') === 'development';
  }

  /**
   * Sanitize error for production response
   */
  sanitizeError(
    exception: unknown,
    statusCode: number,
    originalMessage: string,
    context: ErrorContext,
    errorCode?: string,
    errors?: string[],
  ): SanitizedError {
    const sanitizedMessage = this.sanitizeMessage(originalMessage, errorCode);
    const sanitizedErrors = errors ? this.sanitizeErrorArray(errors) : undefined;

    const baseResponse: SanitizedError = {
      statusCode,
      message: sanitizedMessage,
      ...(errorCode && { errorCode }),
      ...(sanitizedErrors && { errors: sanitizedErrors }),
      timestamp: context.timestamp,
      path: context.request.url,
      method: context.request.method,
      ...(context.requestId && { requestId: context.requestId }),
    };

    // Add development-only information
    if (this.isDevelopment) {
      return {
        ...baseResponse,
        stack: exception instanceof Error ? exception.stack : undefined,
        originalMessage,
        details: this.extractSafeDetails(exception),
      };
    }

    return baseResponse;
  }

  /**
   * Sanitize error message for production
   */
  private sanitizeMessage(message: string, errorCode?: string): string {
    if (!message) {
      return this.errorCodeMessages['SYS_001'] || 'An error occurred';
    }

    // Use error code message if available
    if (errorCode && this.errorCodeMessages[errorCode]) {
      return this.errorCodeMessages[errorCode];
    }

    // In production, use mapped safe messages
    if (this.isProduction) {
      const lowerMessage = message.toLowerCase();
      
      // Check for known error patterns
      for (const [pattern, safeMessage] of Object.entries(this.productionMessageMap)) {
        if (lowerMessage.includes(pattern.toLowerCase())) {
          return safeMessage;
        }
      }

      // Remove sensitive information from message
      let sanitized = this.removeSensitiveInfo(message);
      
      // If message is too technical or contains sensitive info, use generic message
      if (this.containsSensitiveInfo(sanitized) || this.isTechnicalMessage(sanitized)) {
        return 'An error occurred while processing your request';
      }

      return sanitized;
    }

    // In development, return original message but still remove sensitive info
    return this.removeSensitiveInfo(message);
  }

  /**
   * Sanitize array of error messages
   */
  private sanitizeErrorArray(errors: string[]): string[] {
    return errors.map(error => this.sanitizeMessage(error));
  }

  /**
   * Remove sensitive information from error messages
   */
  private removeSensitiveInfo(message: string): string {
    let sanitized = message;

    // Apply all sensitive pattern removals
    for (const pattern of this.sensitivePatterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }

    // Remove specific sensitive keywords
    sanitized = sanitized
      .replace(/password\s*[:=]\s*[^\s]+/gi, 'password: [REDACTED]')
      .replace(/token\s*[:=]\s*[^\s]+/gi, 'token: [REDACTED]')
      .replace(/key\s*[:=]\s*[^\s]+/gi, 'key: [REDACTED]')
      .replace(/secret\s*[:=]\s*[^\s]+/gi, 'secret: [REDACTED]')
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP_REDACTED]')
      .replace(/localhost:\d+/g, '[HOST_REDACTED]')
      .replace(/127\.0\.0\.1:\d+/g, '[HOST_REDACTED]');

    return sanitized.trim();
  }

  /**
   * Check if message contains sensitive information
   */
  private containsSensitiveInfo(message: string): boolean {
    const sensitiveKeywords = [
      'password', 'token', 'secret', 'key', 'auth', 'credential',
      'database', 'connection', 'query', 'sql', 'mongodb', 'redis',
      'process.env', 'config', 'internal', 'stack', 'trace',
      'localhost', '127.0.0.1', 'file://', 'path:', 'directory',
    ];

    const lowerMessage = message.toLowerCase();
    return sensitiveKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Check if message is too technical for end users
   */
  private isTechnicalMessage(message: string): boolean {
    const technicalPatterns = [
      /\b(?:TypeError|ReferenceError|SyntaxError|RangeError)\b/i,
      /\b(?:undefined|null|NaN)\s+(?:is not|cannot)\b/i,
      /\b(?:Cannot read property|Cannot set property)\b/i,
      /\b(?:function|method|constructor|prototype)\b/i,
      /\b(?:module|require|import|export)\b/i,
      /\b(?:async|await|promise|callback)\b/i,
      /\b(?:buffer|stream|socket|connection)\b/i,
      /\b(?:ENOENT|EACCES|EPERM|ENOTDIR)\b/i,
    ];

    return technicalPatterns.some(pattern => pattern.test(message));
  }

  /**
   * Extract safe details from exception for development
   */
  private extractSafeDetails(exception: unknown): any {
    if (!this.isDevelopment) {
      return undefined;
    }

    if (exception instanceof Error) {
      const details: any = {
        name: exception.name,
        message: exception.message,
      };

      // Add safe properties from specific error types
      if ('code' in exception) {
        details.code = exception.code;
      }
      if ('status' in exception) {
        details.status = exception.status;
      }
      if ('statusCode' in exception) {
        details.statusCode = exception.statusCode;
      }

      return details;
    }

    return typeof exception === 'object' ? exception : { value: exception };
  }

  /**
   * Generate error code based on exception type and context
   */
  generateErrorCode(exception: unknown, statusCode: number): string {
    // Authentication/Authorization errors
    if (statusCode === 401) return 'AUTH_001';
    if (statusCode === 403) return 'AUTH_003';
    
    // Validation errors
    if (statusCode === 400) return 'VAL_001';
    if (statusCode === 422) return 'VAL_001';
    
    // Not found errors
    if (statusCode === 404) return 'DB_001';
    
    // Conflict errors
    if (statusCode === 409) return 'DB_002';
    
    // Rate limiting
    if (statusCode === 429) return 'BIZ_003';
    
    // Server errors
    if (statusCode >= 500) {
      if (exception instanceof Error) {
        const message = exception.message.toLowerCase();
        if (message.includes('database') || message.includes('connection')) {
          return 'DB_003';
        }
        if (message.includes('timeout')) {
          return 'DB_005';
        }
        if (message.includes('external') || message.includes('service')) {
          return 'EXT_001';
        }
      }
      return 'SYS_001';
    }
    
    return 'SYS_001'; // Default fallback
  }

  /**
   * Log error with appropriate level and sanitized context
   */
  logError(
    exception: unknown,
    context: ErrorContext,
    sanitizedError: SanitizedError,
  ): void {
    const logContext = this.sanitizeLogContext(context);
    const logMessage = `${context.request.method} ${context.request.url} - ${sanitizedError.statusCode} - ${sanitizedError.message}`;

    if (sanitizedError.statusCode >= 500) {
      this.logger.error(logMessage, {
        exception: this.isDevelopment ? exception : undefined,
        sanitizedError,
        context: logContext,
        stack: exception instanceof Error ? exception.stack : undefined,
      });
    } else if (sanitizedError.statusCode >= 400) {
      this.logger.warn(logMessage, {
        sanitizedError,
        context: logContext,
      });
    } else {
      this.logger.log(logMessage, {
        sanitizedError,
        context: logContext,
      });
    }
  }

  /**
   * Sanitize logging context to remove sensitive information
   */
  private sanitizeLogContext(context: ErrorContext): any {
    const sanitizedContext = {
      ...context,
      request: {
        ...context.request,
        headers: this.sanitizeHeaders(context.request.headers),
        body: this.sanitizeBody(context.request.body),
      },
    };

    // Remove sensitive user information in production
    if (this.isProduction && sanitizedContext.user) {
      sanitizedContext.user = {
        id: sanitizedContext.user.id,
        role: sanitizedContext.user.role,
        // Remove email and other PII in production logs
      };
    }

    return sanitizedContext;
  }

  /**
   * Sanitize request headers for logging
   */
  private sanitizeHeaders(headers: any): any {
    if (!headers) return headers;

    const sanitized = { ...headers };
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
      'x-access-token',
      'x-refresh-token',
    ];

    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Sanitize request body for logging
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return body;

    const sanitized = { ...body };
    const sensitiveFields = [
      'password',
      'currentPassword',
      'newPassword',
      'confirmPassword',
      'token',
      'refreshToken',
      'accessToken',
      'secret',
      'key',
      'apiKey',
      'creditCard',
      'ssn',
      'socialSecurityNumber',
    ];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Get error code message for client display
   */
  getErrorCodeMessage(errorCode: string): string {
    return this.errorCodeMessages[errorCode] || 'An error occurred';
  }

  /**
   * Check if error should be reported to monitoring service
   */
  shouldReportError(statusCode: number, exception: unknown): boolean {
    // Always report 5xx errors
    if (statusCode >= 500) return true;
    
    // Report authentication failures (potential attacks)
    if (statusCode === 401 || statusCode === 403) return true;
    
    // Report rate limiting (potential abuse)
    if (statusCode === 429) return true;
    
    // Don't report client errors (4xx except above)
    return false;
  }
}
