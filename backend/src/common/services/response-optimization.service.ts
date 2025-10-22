import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import * as zlib from 'zlib';
import { promisify } from 'util';

export interface CompressionOptions {
  threshold: number; // Minimum size to compress (bytes)
  level: number; // Compression level (1-9)
  chunkSize: number; // Chunk size for streaming
  windowBits: number; // Window size
  memLevel: number; // Memory level
}

export interface SerializationOptions {
  excludeFields?: string[];
  includeFields?: string[];
  dateFormat?: 'iso' | 'timestamp' | 'custom';
  numberPrecision?: number;
  booleanAsNumber?: boolean;
  nullAsEmpty?: boolean;
}

export interface PaginationConfig {
  defaultLimit: number;
  maxLimit: number;
  includeTotalCount: boolean;
  includePageInfo: boolean;
  cursorBased: boolean;
}

export interface ResponseMetrics {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  serializationTime: number;
  compressionTime: number;
  totalTime: number;
}

/**
 * Response Optimization Service
 * Provides comprehensive API response optimization including compression,
 * serialization, and pagination
 */
@Injectable()
export class ResponseOptimizationService {
  private readonly logger = new Logger(ResponseOptimizationService.name);
  
  private readonly defaultCompressionOptions: CompressionOptions = {
    threshold: 1024, // 1KB
    level: 6, // Balanced compression
    chunkSize: 16 * 1024, // 16KB chunks
    windowBits: 15,
    memLevel: 8,
  };

  private readonly defaultPaginationConfig: PaginationConfig = {
    defaultLimit: 20,
    maxLimit: 100,
    includeTotalCount: true,
    includePageInfo: true,
    cursorBased: false,
  };

  private readonly gzip = promisify(zlib.gzip);
  private readonly deflate = promisify(zlib.deflate);
  private readonly brotliCompress = promisify(zlib.brotliCompress);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Optimize API response with compression and serialization
   */
  async optimizeResponse<T>(
    data: T,
    request: Request,
    response: Response,
    options: {
      compression?: Partial<CompressionOptions>;
      serialization?: SerializationOptions;
      cacheHeaders?: boolean;
    } = {},
  ): Promise<{
    optimizedData: string | Buffer;
    metrics: ResponseMetrics;
    headers: Record<string, string>;
  }> {
    const startTime = Date.now();
    
    // Serialize data
    const serializationStart = Date.now();
    const serializedData = this.serializeData(data, options.serialization);
    const serializationTime = Date.now() - serializationStart;
    
    const originalSize = Buffer.byteLength(serializedData, 'utf8');
    
    // Determine compression method
    const compressionMethod = this.selectCompressionMethod(request);
    
    // Compress if beneficial
    const compressionStart = Date.now();
    const compressionResult = await this.compressData(
      serializedData,
      compressionMethod,
      { ...this.defaultCompressionOptions, ...options.compression }
    );
    const compressionTime = Date.now() - compressionStart;
    
    const totalTime = Date.now() - startTime;
    
    // Generate headers
    const headers = this.generateOptimizedHeaders(
      compressionResult.method,
      compressionResult.data.length,
      options.cacheHeaders
    );
    
    const metrics: ResponseMetrics = {
      originalSize,
      compressedSize: compressionResult.data.length,
      compressionRatio: originalSize > 0 ? compressionResult.data.length / originalSize : 1,
      serializationTime,
      compressionTime,
      totalTime,
    };

    return {
      optimizedData: compressionResult.data,
      metrics,
      headers,
    };
  }

  /**
   * Create paginated response
   */
  createPaginatedResponse<T>(
    data: T[],
    totalCount: number,
    page: number,
    limit: number,
    request: Request,
    config: Partial<PaginationConfig> = {},
  ): {
    data: T[];
    pagination: any;
    links?: any;
  } {
    const paginationConfig = { ...this.defaultPaginationConfig, ...config };
    
    // Ensure limit doesn't exceed maximum
    const effectiveLimit = Math.min(limit, paginationConfig.maxLimit);
    const totalPages = Math.ceil(totalCount / effectiveLimit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;
    
    const pagination: any = {
      page,
      limit: effectiveLimit,
      hasNext,
      hasPrev,
    };

    if (paginationConfig.includeTotalCount) {
      pagination.totalCount = totalCount;
      pagination.totalPages = totalPages;
    }

    if (paginationConfig.includePageInfo) {
      pagination.startIndex = (page - 1) * effectiveLimit + 1;
      pagination.endIndex = Math.min(page * effectiveLimit, totalCount);
    }

    // Generate navigation links
    const links = this.generatePaginationLinks(request, page, totalPages, effectiveLimit);

    return {
      data,
      pagination,
      ...(Object.keys(links).length > 0 && { links }),
    };
  }

  /**
   * Create cursor-based paginated response
   */
  createCursorPaginatedResponse<T>(
    data: T[],
    cursor: string | null,
    limit: number,
    hasMore: boolean,
    getCursor: (item: T) => string,
  ): {
    data: T[];
    pagination: {
      cursor: string | null;
      nextCursor: string | null;
      limit: number;
      hasMore: boolean;
    };
  } {
    const nextCursor = data.length > 0 && hasMore ? getCursor(data[data.length - 1]) : null;

    return {
      data,
      pagination: {
        cursor,
        nextCursor,
        limit,
        hasMore,
      },
    };
  }

  /**
   * Optimize data serialization
   */
  serializeData<T>(data: T, options: SerializationOptions = {}): string {
    try {
      // Apply field filtering
      const filteredData = this.filterFields(data, options);
      
      // Apply data transformations
      const transformedData = this.transformData(filteredData, options);
      
      // Serialize to JSON
      return JSON.stringify(transformedData, this.createReplacer(options), 0);
    } catch (error) {
      this.logger.error('Data serialization error:', error);
      return JSON.stringify({ error: 'Serialization failed' });
    }
  }

  /**
   * Compress data using the best available method
   */
  private async compressData(
    data: string,
    method: 'gzip' | 'deflate' | 'br' | 'none',
    options: CompressionOptions,
  ): Promise<{ data: string | Buffer; method: string }> {
    const dataBuffer = Buffer.from(data, 'utf8');
    
    // Skip compression for small data
    if (dataBuffer.length < options.threshold) {
      return { data, method: 'none' };
    }

    try {
      switch (method) {
        case 'br':
          const brotliOptions = {
            params: {
              [zlib.constants.BROTLI_PARAM_QUALITY]: Math.min(options.level, 11),
              [zlib.constants.BROTLI_PARAM_SIZE_HINT]: dataBuffer.length,
            },
          };
          const brotliCompressed = await this.brotliCompress(dataBuffer, brotliOptions);
          return { data: brotliCompressed, method: 'br' };

        case 'gzip':
          const gzipOptions = {
            level: options.level,
            chunkSize: options.chunkSize,
            windowBits: options.windowBits,
            memLevel: options.memLevel,
          };
          const gzipCompressed = await this.gzip(dataBuffer, gzipOptions);
          return { data: gzipCompressed, method: 'gzip' };

        case 'deflate':
          const deflateOptions = {
            level: options.level,
            chunkSize: options.chunkSize,
            windowBits: options.windowBits,
            memLevel: options.memLevel,
          };
          const deflateCompressed = await this.deflate(dataBuffer, deflateOptions);
          return { data: deflateCompressed, method: 'deflate' };

        default:
          return { data, method: 'none' };
      }
    } catch (error) {
      this.logger.error(`Compression error (${method}):`, error);
      return { data, method: 'none' };
    }
  }

  /**
   * Select optimal compression method based on client support
   */
  private selectCompressionMethod(request: Request): 'gzip' | 'deflate' | 'br' | 'none' {
    const acceptEncoding = request.get('Accept-Encoding') || '';
    
    // Prefer Brotli for modern browsers
    if (acceptEncoding.includes('br')) {
      return 'br';
    }
    
    // Fallback to gzip (widely supported)
    if (acceptEncoding.includes('gzip')) {
      return 'gzip';
    }
    
    // Fallback to deflate
    if (acceptEncoding.includes('deflate')) {
      return 'deflate';
    }
    
    return 'none';
  }

  /**
   * Generate optimized response headers
   */
  private generateOptimizedHeaders(
    compressionMethod: string,
    contentLength: number,
    includeCacheHeaders: boolean = true,
  ): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': contentLength.toString(),
    };

    // Add compression headers
    if (compressionMethod !== 'none') {
      headers['Content-Encoding'] = compressionMethod;
      headers['Vary'] = 'Accept-Encoding';
    }

    // Add cache headers
    if (includeCacheHeaders) {
      headers['Cache-Control'] = 'public, max-age=300'; // 5 minutes
      headers['ETag'] = this.generateETag(contentLength);
    }

    // Add performance headers
    headers['X-Response-Optimized'] = 'true';
    headers['X-Compression-Method'] = compressionMethod;

    return headers;
  }

  /**
   * Filter fields based on include/exclude options
   */
  private filterFields<T>(data: T, options: SerializationOptions): T {
    if (!options.includeFields && !options.excludeFields) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.filterFields(item, options)) as unknown as T;
    }

    if (data && typeof data === 'object') {
      const filtered: any = {};
      
      for (const [key, value] of Object.entries(data)) {
        // Check include fields
        if (options.includeFields && !options.includeFields.includes(key)) {
          continue;
        }
        
        // Check exclude fields
        if (options.excludeFields && options.excludeFields.includes(key)) {
          continue;
        }
        
        filtered[key] = this.filterFields(value, options);
      }
      
      return filtered;
    }

    return data;
  }

  /**
   * Transform data based on serialization options
   */
  private transformData<T>(data: T, options: SerializationOptions): T {
    if (Array.isArray(data)) {
      return data.map(item => this.transformData(item, options)) as unknown as T;
    }

    if (data && typeof data === 'object') {
      const transformed: any = {};
      
      for (const [key, value] of Object.entries(data)) {
        transformed[key] = this.transformValue(value, options);
      }
      
      return transformed;
    }

    return this.transformValue(data, options);
  }

  /**
   * Transform individual values based on options
   */
  private transformValue(value: any, options: SerializationOptions): any {
    // Handle null values
    if (value === null && options.nullAsEmpty) {
      return '';
    }

    // Handle boolean values
    if (typeof value === 'boolean' && options.booleanAsNumber) {
      return value ? 1 : 0;
    }

    // Handle date values
    if (value instanceof Date) {
      switch (options.dateFormat) {
        case 'timestamp':
          return value.getTime();
        case 'iso':
        default:
          return value.toISOString();
      }
    }

    // Handle number precision
    if (typeof value === 'number' && options.numberPrecision !== undefined) {
      return Number(value.toFixed(options.numberPrecision));
    }

    // Recursively transform objects and arrays
    if (Array.isArray(value)) {
      return value.map(item => this.transformValue(item, options));
    }

    if (value && typeof value === 'object') {
      const transformed: any = {};
      for (const [key, val] of Object.entries(value)) {
        transformed[key] = this.transformValue(val, options);
      }
      return transformed;
    }

    return value;
  }

  /**
   * Create JSON replacer function
   */
  private createReplacer(options: SerializationOptions): ((key: string, value: any) => any) | undefined {
    return (key: string, value: any) => {
      // Handle circular references
      if (typeof value === 'object' && value !== null) {
        // Simple circular reference detection
        // In production, you might want to use a more sophisticated approach
        try {
          JSON.stringify(value);
        } catch (error) {
          return '[Circular Reference]';
        }
      }

      return value;
    };
  }

  /**
   * Generate pagination links
   */
  private generatePaginationLinks(
    request: Request,
    currentPage: number,
    totalPages: number,
    limit: number,
  ): Record<string, string> {
    const baseUrl = `${request.protocol}://${request.get('host')}${request.path}`;
    const query = new URLSearchParams(request.query as any);
    
    const links: Record<string, string> = {};

    // First page
    if (currentPage > 1) {
      query.set('page', '1');
      query.set('limit', limit.toString());
      links.first = `${baseUrl}?${query.toString()}`;
    }

    // Previous page
    if (currentPage > 1) {
      query.set('page', (currentPage - 1).toString());
      links.prev = `${baseUrl}?${query.toString()}`;
    }

    // Next page
    if (currentPage < totalPages) {
      query.set('page', (currentPage + 1).toString());
      links.next = `${baseUrl}?${query.toString()}`;
    }

    // Last page
    if (currentPage < totalPages) {
      query.set('page', totalPages.toString());
      links.last = `${baseUrl}?${query.toString()}`;
    }

    return links;
  }

  /**
   * Generate ETag for response caching
   */
  private generateETag(contentLength: number): string {
    const hash = require('crypto')
      .createHash('md5')
      .update(contentLength.toString())
      .digest('hex');
    return `"${hash.substring(0, 16)}"`;
  }

  /**
   * Get response optimization metrics
   */
  getOptimizationMetrics(): {
    totalResponses: number;
    averageCompressionRatio: number;
    averageSerializationTime: number;
    averageCompressionTime: number;
    compressionMethodUsage: Record<string, number>;
  } {
    // This would be implemented with actual metrics collection
    // For now, return mock data
    return {
      totalResponses: 15420,
      averageCompressionRatio: 0.35, // 65% size reduction
      averageSerializationTime: 2.5,
      averageCompressionTime: 8.2,
      compressionMethodUsage: {
        br: 4500,
        gzip: 8200,
        deflate: 1200,
        none: 1520,
      },
    };
  }

  /**
   * Optimize response for specific data types
   */
  optimizeForDataType<T>(
    data: T,
    dataType: 'user' | 'course' | 'organization' | 'search' | 'analytics',
  ): SerializationOptions {
    const optimizations: Record<string, SerializationOptions> = {
      user: {
        excludeFields: ['passwordHash', 'refreshTokenHash', 'emailVerificationToken'],
        dateFormat: 'iso',
        numberPrecision: 2,
      },
      course: {
        excludeFields: ['internalNotes', 'draftContent'],
        dateFormat: 'iso',
        includeFields: ['id', 'title', 'description', 'status', 'publishedAt', 'instructor'],
      },
      organization: {
        excludeFields: ['billingDetails', 'internalSettings'],
        dateFormat: 'iso',
      },
      search: {
        includeFields: ['id', 'title', 'description', 'type', 'relevanceScore'],
        numberPrecision: 3,
        dateFormat: 'timestamp',
      },
      analytics: {
        numberPrecision: 2,
        dateFormat: 'timestamp',
        booleanAsNumber: true,
      },
    };

    return optimizations[dataType] || {};
  }

  /**
   * Create streaming response for large datasets
   */
  createStreamingResponse<T>(
    dataStream: AsyncIterable<T>,
    response: Response,
    options: {
      chunkSize?: number;
      compression?: boolean;
      serialization?: SerializationOptions;
    } = {},
  ): void {
    const chunkSize = options.chunkSize || 100;
    let isFirstChunk = true;
    let buffer: T[] = [];

    response.writeHead(200, {
      'Content-Type': 'application/json',
      'Transfer-Encoding': 'chunked',
      ...(options.compression && { 'Content-Encoding': 'gzip' }),
    });

    // Start JSON array
    response.write('{"data":[');

    const processChunk = async () => {
      if (buffer.length === 0) return;

      const chunk = buffer.splice(0, chunkSize);
      const serializedChunk = chunk
        .map(item => this.serializeData(item, options.serialization))
        .join(',');

      if (!isFirstChunk) {
        response.write(',');
      }
      
      response.write(serializedChunk);
      isFirstChunk = false;
    };

    (async () => {
      try {
        for await (const item of dataStream) {
          buffer.push(item);
          
          if (buffer.length >= chunkSize) {
            await processChunk();
          }
        }

        // Process remaining items
        if (buffer.length > 0) {
          await processChunk();
        }

        // End JSON array and response
        response.write(']}');
        response.end();
      } catch (error) {
        this.logger.error('Streaming response error:', error);
        response.write(`,"error":"${error.message}"`);
        response.end(']}');
      }
    })();
  }
}
