import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import sharp from 'sharp';
import * as crypto from 'crypto';
import * as path from 'path';

/**
 * Image processing options interface
 */
export interface ImageProcessingOptions {
  fileId: string;
  filename: string;
  buffer: Buffer;
  mimeType: string;
  organizationId?: string;
  userId?: string;
  generateThumbnails?: boolean;
  optimizeForWeb?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Thumbnail configuration interface
 */
export interface ThumbnailConfig {
  name: string;
  width: number;
  height: number;
  fit: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  quality: number;
}

/**
 * Processing result interface
 */
export interface ImageProcessingResult {
  processedBuffer: Buffer;
  thumbnails: Array<{
    name: string;
    buffer: Buffer;
    width: number;
    height: number;
    size: number;
    format: string;
  }>;
  metadata: {
    originalWidth: number;
    originalHeight: number;
    originalSize: number;
    processedWidth: number;
    processedHeight: number;
    processedSize: number;
    format: string;
    hasAlpha: boolean;
    colorSpace: string;
    compressionRatio: number;
  };
  processingTime: number;
}

/**
 * Image Processor Service
 * Handles image optimization, resizing, and thumbnail generation
 * Implements efficient processing with Sharp library
 */
@Injectable()
export class ImageProcessorService {
  private readonly logger = new Logger(ImageProcessorService.name);
  private readonly isEnabled: boolean;
  private readonly defaultThumbnails: ThumbnailConfig[];
  private readonly maxImageSize: number;
  private readonly defaultQuality: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.isEnabled = this.configService.get<boolean>('IMAGE_PROCESSING_ENABLED', true);
    this.maxImageSize = this.configService.get<number>('MAX_IMAGE_SIZE', 50 * 1024 * 1024); // 50MB
    this.defaultQuality = this.configService.get<number>('DEFAULT_IMAGE_QUALITY', 85);

    // Define default thumbnail configurations
    this.defaultThumbnails = [
      { name: 'thumbnail', width: 150, height: 150, fit: 'cover', quality: 80 },
      { name: 'small', width: 300, height: 300, fit: 'inside', quality: 85 },
      { name: 'medium', width: 600, height: 600, fit: 'inside', quality: 85 },
      { name: 'large', width: 1200, height: 1200, fit: 'inside', quality: 90 },
    ];

    if (this.isEnabled) {
      this.logger.log('Image processing service initialized');
    } else {
      this.logger.warn('Image processing is disabled');
    }
  }

  /**
   * Process image with optimization and thumbnail generation
   */
  async processImage(options: ImageProcessingOptions): Promise<ImageProcessingResult> {
    const {
      fileId,
      filename,
      buffer,
      mimeType,
      organizationId,
      userId,
      generateThumbnails = true,
      optimizeForWeb = true,
      maxWidth,
      maxHeight,
      quality = this.defaultQuality,
    } = options;

    const startTime = Date.now();
    const processId = crypto.randomUUID();

    this.logger.log(`Starting image processing for: ${filename} (ID: ${fileId}, Process ID: ${processId})`);

    // Emit processing started event
    this.eventEmitter.emit('image-processing.started', {
      fileId,
      processId,
      filename,
      organizationId,
      userId,
    });

    try {
      // Validate input
      await this.validateImageInput(buffer, filename, mimeType);

      // Get original image metadata
      const originalMetadata = await sharp(buffer).metadata();
      
      if (!originalMetadata.width || !originalMetadata.height) {
        throw new Error('Could not determine image dimensions');
      }

      this.logger.log(
        `Original image: ${originalMetadata.width}x${originalMetadata.height}, ` +
        `format: ${originalMetadata.format}, size: ${buffer.length} bytes`
      );

      // Process main image
      const processedBuffer = await this.optimizeMainImage(buffer, {
        maxWidth,
        maxHeight,
        quality,
        optimizeForWeb,
        format: originalMetadata.format as string,
      });

      const processedMetadata = await sharp(processedBuffer).metadata();

      // Generate thumbnails
      const thumbnails = generateThumbnails 
        ? await this.generateThumbnails(buffer, this.defaultThumbnails)
        : [];

      const processingTime = Date.now() - startTime;

      const result: ImageProcessingResult = {
        processedBuffer,
        thumbnails,
        metadata: {
          originalWidth: originalMetadata.width,
          originalHeight: originalMetadata.height,
          originalSize: buffer.length,
          processedWidth: processedMetadata.width || 0,
          processedHeight: processedMetadata.height || 0,
          processedSize: processedBuffer.length,
          format: processedMetadata.format || 'unknown',
          hasAlpha: originalMetadata.hasAlpha || false,
          colorSpace: originalMetadata.space || 'unknown',
          compressionRatio: Math.round((1 - processedBuffer.length / buffer.length) * 100),
        },
        processingTime,
      };

      // Emit processing completed event
      this.eventEmitter.emit('image-processing.completed', {
        fileId,
        processId,
        filename,
        result: {
          originalSize: result.metadata.originalSize,
          processedSize: result.metadata.processedSize,
          compressionRatio: result.metadata.compressionRatio,
          thumbnailCount: thumbnails.length,
          processingTime,
        },
        organizationId,
        userId,
      });

      this.logger.log(
        `Image processing completed for ${filename}: ` +
        `${result.metadata.originalSize} -> ${result.metadata.processedSize} bytes ` +
        `(${result.metadata.compressionRatio}% compression, ${thumbnails.length} thumbnails, ${processingTime}ms)`
      );

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`Image processing failed for ${filename} (Process ID: ${processId}):`, error);

      // Emit processing error event
      this.eventEmitter.emit('image-processing.error', {
        fileId,
        processId,
        filename,
        error: error.message,
        processingTime,
        organizationId,
        userId,
      });

      throw error;
    }
  }

  /**
   * Generate thumbnails for image
   */
  async generateThumbnails(
    buffer: Buffer,
    configs: ThumbnailConfig[],
  ): Promise<Array<{
    name: string;
    buffer: Buffer;
    width: number;
    height: number;
    size: number;
    format: string;
  }>> {
    const thumbnails = [];

    for (const config of configs) {
      try {
        const thumbnailBuffer = await sharp(buffer)
          .resize(config.width, config.height, { 
            fit: config.fit,
            withoutEnlargement: true,
          })
          .jpeg({ quality: config.quality, progressive: true })
          .toBuffer();

        const metadata = await sharp(thumbnailBuffer).metadata();

        thumbnails.push({
          name: config.name,
          buffer: thumbnailBuffer,
          width: metadata.width || config.width,
          height: metadata.height || config.height,
          size: thumbnailBuffer.length,
          format: 'jpeg',
        });

        this.logger.debug(`Generated ${config.name} thumbnail: ${metadata.width}x${metadata.height}`);
      } catch (error) {
        this.logger.warn(`Failed to generate ${config.name} thumbnail:`, error);
      }
    }

    return thumbnails;
  }

  /**
   * Optimize main image
   */
  private async optimizeMainImage(
    buffer: Buffer,
    options: {
      maxWidth?: number;
      maxHeight?: number;
      quality: number;
      optimizeForWeb: boolean;
      format: string;
    },
  ): Promise<Buffer> {
    const { maxWidth, maxHeight, quality, optimizeForWeb, format } = options;

    let pipeline = sharp(buffer);

    // Resize if dimensions are specified
    if (maxWidth || maxHeight) {
      pipeline = pipeline.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Apply format-specific optimizations
    if (optimizeForWeb) {
      switch (format.toLowerCase()) {
        case 'jpeg':
        case 'jpg':
          pipeline = pipeline.jpeg({
            quality,
            progressive: true,
            mozjpeg: true,
          });
          break;

        case 'png':
          pipeline = pipeline.png({
            quality,
            progressive: true,
            compressionLevel: 9,
            adaptiveFiltering: true,
          });
          break;

        case 'webp':
          pipeline = pipeline.webp({
            quality,
            effort: 6,
          });
          break;

        case 'avif':
          pipeline = pipeline.avif({
            quality,
            effort: 4,
          });
          break;

        default:
          // For other formats, convert to JPEG
          pipeline = pipeline.jpeg({
            quality,
            progressive: true,
            mozjpeg: true,
          });
          break;
      }
    }

    // Apply additional optimizations
    if (optimizeForWeb) {
      pipeline = pipeline
        .sharpen() // Slight sharpening for web display
        .normalise(); // Normalize contrast
    }

    return await pipeline.toBuffer();
  }

  /**
   * Extract image metadata
   */
  async extractMetadata(buffer: Buffer): Promise<{
    width: number;
    height: number;
    format: string;
    size: number;
    hasAlpha: boolean;
    colorSpace: string;
    density?: number;
    exif?: Record<string, unknown>;
  }> {
    try {
      const metadata:any = await sharp(buffer).metadata();
      
      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: buffer.length,
        hasAlpha: metadata.hasAlpha || false,
        colorSpace: metadata.space || 'unknown',
        density: metadata.density,
        exif: metadata.exif,
      };
    } catch (error) {
      this.logger.error('Failed to extract image metadata:', error);
      throw error;
    }
  }

  /**
   * Convert image to different format
   */
  async convertFormat(
    buffer: Buffer,
    targetFormat: 'jpeg' | 'png' | 'webp' | 'avif',
    quality: number = 85,
  ): Promise<Buffer> {
    try {
      let pipeline = sharp(buffer);

      switch (targetFormat) {
        case 'jpeg':
          pipeline = pipeline.jpeg({ quality, progressive: true });
          break;
        case 'png':
          pipeline = pipeline.png({ quality, progressive: true });
          break;
        case 'webp':
          pipeline = pipeline.webp({ quality, effort: 6 });
          break;
        case 'avif':
          pipeline = pipeline.avif({ quality, effort: 4 });
          break;
      }

      return await pipeline.toBuffer();
    } catch (error) {
      this.logger.error(`Failed to convert image to ${targetFormat}:`, error);
      throw error;
    }
  }

  /**
   * Validate image input
   */
  private async validateImageInput(buffer: Buffer, filename: string, mimeType: string): Promise<void> {
    // Check if processing is enabled
    if (!this.isEnabled) {
      throw new Error('Image processing is disabled');
    }

    // Check file size
    if (buffer.length > this.maxImageSize) {
      throw new Error(`Image size ${buffer.length} exceeds maximum allowed size ${this.maxImageSize}`);
    }

    if (buffer.length === 0) {
      throw new Error('Cannot process empty image');
    }

    // Validate MIME type
    const supportedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/tiff',
      'image/bmp',
      'image/avif',
    ];

    if (!supportedTypes.includes(mimeType)) {
      throw new Error(`Unsupported image type: ${mimeType}`);
    }

    // Try to read image metadata to ensure it's a valid image
    try {
      const metadata = await sharp(buffer).metadata();
      if (!metadata.width || !metadata.height) {
        throw new Error('Invalid image: could not determine dimensions');
      }
    } catch (error) {
      throw new Error(`Invalid image file: ${error.message}`);
    }
  }

  /**
   * Check if file is an image that can be processed
   */
  canProcessImage(mimeType: string): boolean {
    const supportedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/tiff',
      'image/bmp',
      'image/avif',
    ];

    return supportedTypes.includes(mimeType);
  }

  /**
   * Get processing service health status
   */
  async getHealthStatus(): Promise<{
    isHealthy: boolean;
    isEnabled: boolean;
    sharpVersion?: string;
    supportedFormats?: string[];
  }> {
    try {
      const supportedFormats = ['jpeg', 'png', 'webp', 'gif', 'tiff', 'bmp'];
      
      // Test Sharp functionality with a simple operation
      const testBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');
      await sharp(testBuffer).metadata();

      return {
        isHealthy: true,
        isEnabled: this.isEnabled,
        sharpVersion: sharp.versions.sharp,
        supportedFormats,
      };
    } catch (error) {
      this.logger.error('Image processor health check failed:', error);
      return {
        isHealthy: false,
        isEnabled: this.isEnabled,
      };
    }
  }
}
