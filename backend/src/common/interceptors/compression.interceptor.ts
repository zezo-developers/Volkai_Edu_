import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request, Response } from 'express';
import { ResponseOptimizationService } from '../services/response-optimization.service';
import { ConfigService } from '@nestjs/config';

export interface CompressionConfig {
  enabled: boolean;
  threshold: number;
  level: number;
  excludePaths: string[];
  excludeContentTypes: string[];
  includeContentTypes: string[];
}

/**
 * Response Compression Interceptor
 * Automatically compresses API responses based on client capabilities and configuration
 */
@Injectable()
export class CompressionInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CompressionInterceptor.name);
  private readonly config: CompressionConfig;

  constructor(
    private readonly responseOptimizationService: ResponseOptimizationService,
    private readonly configService: ConfigService,
  ) {
    this.config = {
      enabled: this.configService.get<boolean>('COMPRESSION_ENABLED', true),
      threshold: this.configService.get<number>('COMPRESSION_THRESHOLD', 1024), // 1KB
      level: this.configService.get<number>('COMPRESSION_LEVEL', 6),
      excludePaths: this.configService.get<string[]>('COMPRESSION_EXCLUDE_PATHS', [
        '/health',
        '/metrics',
        '/api/files/download',
        '/api/files/stream',
      ]),
      excludeContentTypes: this.configService.get<string[]>('COMPRESSION_EXCLUDE_TYPES', [
        'image/*',
        'video/*',
        'audio/*',
        'application/zip',
        'application/gzip',
        'application/x-compressed',
      ]),
      includeContentTypes: this.configService.get<string[]>('COMPRESSION_INCLUDE_TYPES', [
        'application/json',
        'text/plain',
        'text/html',
        'text/css',
        'text/javascript',
        'application/javascript',
        'application/xml',
        'text/xml',
      ]),
    };
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // Skip compression if disabled or not applicable
    if (!this.shouldCompress(request, response)) {
      return next.handle();
    }

    return next.handle().pipe(
      map(async (data) => {
        try {
          // Skip compression for non-object responses
          if (typeof data !== 'object' || data === null) {
            return data;
          }

          // Determine data type for optimization
          const dataType = this.determineDataType(request.path, data);
          
          // Get optimization options for this data type
          const serializationOptions = this.responseOptimizationService.optimizeForDataType(data, dataType);

          // Optimize response
          const optimizationResult = await this.responseOptimizationService.optimizeResponse(
            data,
            request,
            response,
            {
              compression: {
                threshold: this.config.threshold,
                level: this.config.level,
              },
              serialization: serializationOptions,
              cacheHeaders: this.shouldIncludeCacheHeaders(request),
            }
          );

          // Set optimized headers
          Object.entries(optimizationResult.headers).forEach(([key, value]) => {
            response.setHeader(key, value);
          });

          // Add performance metrics headers
          response.setHeader('X-Response-Time', optimizationResult.metrics.totalTime.toString());
          response.setHeader('X-Compression-Ratio', optimizationResult.metrics.compressionRatio.toFixed(3));
          response.setHeader('X-Original-Size', optimizationResult.metrics.originalSize.toString());
          response.setHeader('X-Compressed-Size', optimizationResult.metrics.compressedSize.toString());

          // Log compression metrics for monitoring
          if (optimizationResult.metrics.compressionRatio < 0.8) {
            this.logger.log(
              `High compression achieved: ${(1 - optimizationResult.metrics.compressionRatio) * 100}% ` +
              `reduction for ${request.method} ${request.path}`
            );
          }

          // Return optimized data
          return optimizationResult.optimizedData;
        } catch (error) {
          this.logger.error(`Compression error for ${request.method} ${request.path}:`, error);
          return data; // Fallback to uncompressed data
        }
      })
    );
  }

  /**
   * Determine if response should be compressed
   */
  private shouldCompress(request: Request, response: Response): boolean {
    // Check if compression is enabled
    if (!this.config.enabled) {
      return false;
    }

    // Check if client accepts compression
    const acceptEncoding = request.get('Accept-Encoding') || '';
    if (!acceptEncoding.includes('gzip') && !acceptEncoding.includes('deflate') && !acceptEncoding.includes('br')) {
      return false;
    }

    // Check excluded paths
    if (this.config.excludePaths.some(path => request.path.startsWith(path))) {
      return false;
    }

    // Check if response is already compressed
    if (response.getHeader('Content-Encoding')) {
      return false;
    }

    // Check content type
    const contentType = response.getHeader('Content-Type') as string || 'application/json';
    
    // If include list is specified, only compress those types
    if (this.config.includeContentTypes.length > 0) {
      return this.config.includeContentTypes.some(type => this.matchesContentType(contentType, type));
    }

    // Otherwise, compress unless explicitly excluded
    return !this.config.excludeContentTypes.some(type => this.matchesContentType(contentType, type));
  }

  /**
   * Check if content type matches pattern
   */
  private matchesContentType(contentType: string, pattern: string): boolean {
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      return contentType.startsWith(prefix);
    }
    return contentType.includes(pattern);
  }

  /**
   * Determine data type for optimization
   */
  private determineDataType(path: string, data: any): 'user' | 'course' | 'organization' | 'search' | 'analytics' {
    // Analyze path to determine data type
    if (path.includes('/users') || path.includes('/profile')) {
      return 'user';
    }
    
    if (path.includes('/courses') || path.includes('/lessons')) {
      return 'course';
    }
    
    if (path.includes('/organizations') || path.includes('/org')) {
      return 'organization';
    }
    
    if (path.includes('/search') || path.includes('/query')) {
      return 'search';
    }
    
    if (path.includes('/analytics') || path.includes('/stats') || path.includes('/metrics')) {
      return 'analytics';
    }

    // Analyze data structure
    if (Array.isArray(data) && data.length > 0) {
      const firstItem = data[0];
      if (firstItem.email || firstItem.firstName) return 'user';
      if (firstItem.title || firstItem.instructor) return 'course';
      if (firstItem.name || firstItem.slug) return 'organization';
    }

    if (data.data && Array.isArray(data.data)) {
      return this.determineDataType(path, data.data);
    }

    return 'search'; // Default fallback
  }

  /**
   * Determine if cache headers should be included
   */
  private shouldIncludeCacheHeaders(request: Request): boolean {
    // Include cache headers for GET requests to data endpoints
    if (request.method !== 'GET') {
      return false;
    }

    // Exclude cache headers for user-specific or real-time data
    const excludeCachePaths = [
      '/api/users/profile',
      '/api/auth/',
      '/api/notifications',
      '/api/realtime',
      '/api/admin',
    ];

    return !excludeCachePaths.some(path => request.path.startsWith(path));
  }
}

/**
 * Selective Compression Interceptor
 * Applies compression only to specific routes or conditions
 */
@Injectable()
export class SelectiveCompressionInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SelectiveCompressionInterceptor.name);

  constructor(
    private readonly responseOptimizationService: ResponseOptimizationService,
    private readonly compressionPaths: string[] = [],
    private readonly compressionOptions: {
      threshold?: number;
      level?: number;
      dataTypes?: Array<'user' | 'course' | 'organization' | 'search' | 'analytics'>;
    } = {},
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // Check if this path should be compressed
    const shouldCompress = this.compressionPaths.length === 0 || 
      this.compressionPaths.some(path => request.path.startsWith(path));

    if (!shouldCompress) {
      return next.handle();
    }

    return next.handle().pipe(
      map(async (data) => {
        try {
          const dataType = this.determineDataType(request.path, data);
          
          // Check if this data type should be compressed
          if (this.compressionOptions.dataTypes && 
              !this.compressionOptions.dataTypes.includes(dataType)) {
            return data;
          }

          const serializationOptions = this.responseOptimizationService.optimizeForDataType(data, dataType);

          const optimizationResult = await this.responseOptimizationService.optimizeResponse(
            data,
            request,
            response,
            {
              compression: {
                threshold: this.compressionOptions.threshold || 1024,
                level: this.compressionOptions.level || 6,
              },
              serialization: serializationOptions,
            }
          );

          // Set headers
          Object.entries(optimizationResult.headers).forEach(([key, value]) => {
            response.setHeader(key, value);
          });

          return optimizationResult.optimizedData;
        } catch (error) {
          this.logger.error('Selective compression error:', error);
          return data;
        }
      })
    );
  }

  private determineDataType(path: string, data: any): 'user' | 'course' | 'organization' | 'search' | 'analytics' {
    // Same logic as CompressionInterceptor
    if (path.includes('/users')) return 'user';
    if (path.includes('/courses')) return 'course';
    if (path.includes('/organizations')) return 'organization';
    if (path.includes('/search')) return 'search';
    if (path.includes('/analytics')) return 'analytics';
    return 'search';
  }
}

/**
 * Streaming Compression Interceptor
 * Handles compression for streaming responses
 */
@Injectable()
export class StreamingCompressionInterceptor implements NestInterceptor {
  private readonly logger = new Logger(StreamingCompressionInterceptor.name);

  constructor(private readonly responseOptimizationService: ResponseOptimizationService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // Check if this is a streaming request
    const isStreaming = request.get('Accept') === 'application/x-ndjson' || 
                       request.query.stream === 'true';

    if (!isStreaming) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        if (data && typeof data[Symbol.asyncIterator] === 'function') {
          // Handle async iterable data for streaming
          this.responseOptimizationService.createStreamingResponse(
            data,
            response,
            {
              compression: true,
              chunkSize: 100,
            }
          );
          
          // Return empty to prevent further processing
          return null;
        }

        return data;
      })
    );
  }
}
