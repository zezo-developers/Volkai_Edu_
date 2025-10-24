import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { ErrorSanitizationService, ErrorContext } from '../services/error-sanitization.service';

/**
 * Global exception filter that handles all unhandled exceptions
 * Provides consistent error response format and proper logging
 */
@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly errorSanitizationService: ErrorSanitizationService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Extract basic error information
    const { status, message, errors } = this.extractErrorInfo(exception);
    console.log('GlobalExceptionFilter caught an exception:', {
      status,
      message,
      errors,
    });
    // Generate error code
    const errorCode = this.errorSanitizationService.generateErrorCode(exception, status);
    
    // Build error context
    const context: ErrorContext = {
      request: {
        method: request.method,
        url: request.url,
        headers: request.headers,
        body: request.body,
        params: request.params,
        query: request.query,
        ip: this.getClientIp(request),
        userAgent: request.get('User-Agent'),
      },
      user: this.extractUserInfo(request),
      requestId: (request as any).requestId || this.generateRequestId(),
      timestamp: new Date().toISOString(),
    };

    // Sanitize error for response
    const sanitizedError = this.errorSanitizationService.sanitizeError(
      exception,
      status,
      message,
      context,
      errorCode,
      errors,
    );

    // Log error with sanitized context
    this.errorSanitizationService.logError(exception, context, sanitizedError);

    // Send response
    response.status(status).json({
      success: false,
      ...sanitizedError,
    });
  }

  /**
   * Extract error information from exception
   */
  private extractErrorInfo(exception: unknown): {
    status: number;
    message: string;
    errors?: string[];
  } {
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: string[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message = (responseObj.message as string) || message;
        errors = Array.isArray(responseObj.message) 
          ? responseObj.message as string[]
          : responseObj.error ? [responseObj.error as string] : undefined;
      }
    } else if (exception instanceof QueryFailedError) {
      // Handle database errors with specific mappings
      status = HttpStatus.BAD_REQUEST;
      message = this.mapDatabaseError(exception);
    } else if (exception instanceof Error) {
      // Handle generic errors
      message = exception.message;
      
      // Map specific error types to appropriate status codes
      if (exception.name === 'ValidationError') {
        status = HttpStatus.BAD_REQUEST;
      } else if (exception.name === 'UnauthorizedError') {
        status = HttpStatus.UNAUTHORIZED;
      } else if (exception.name === 'ForbiddenError') {
        status = HttpStatus.FORBIDDEN;
      } else if (exception.name === 'NotFoundError') {
        status = HttpStatus.NOT_FOUND;
      } else if (exception.name === 'ConflictError') {
        status = HttpStatus.CONFLICT;
      } else if (exception.name === 'TooManyRequestsError') {
        status = HttpStatus.TOO_MANY_REQUESTS;
      }
    }

    return { status, message, errors };
  }

  /**
   * Map database errors to user-friendly messages
   */
  private mapDatabaseError(error: QueryFailedError): string {
    const dbError = error as QueryFailedError & { 
      code?: string; 
      detail?: string; 
      constraint?: string;
    };

    // PostgreSQL error codes
    switch (dbError.code) {
      case '23505': // Unique constraint violation
        return 'Resource already exists';
      case '23503': // Foreign key constraint violation
        return 'Referenced resource does not exist';
      case '23502': // Not null constraint violation
        return 'Required field is missing';
      case '23514': // Check constraint violation
        return 'Invalid data value';
      case '42703': // Undefined column
        return 'Invalid field specified';
      case '42P01': // Undefined table
        return 'Resource type not found';
      case '08006': // Connection failure
        return 'Database connection failed';
      case '57014': // Query canceled
        return 'Operation timeout';
      case '53300': // Too many connections
        return 'Service temporarily unavailable';
      default:
        return 'Database operation failed';
    }
  }

  /**
   * Extract user information from request
   */
  private extractUserInfo(request: Request): ErrorContext['user'] | undefined {
    const user = (request as any).user;
    if (!user) return undefined;

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }

  /**
   * Get client IP address
   */
  private getClientIp(request: Request): string {
    return (
      request.get('CF-Connecting-IP') ||
      request.get('X-Forwarded-For')?.split(',')[0] ||
      request.get('X-Real-IP') ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      '127.0.0.1'
    );
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
