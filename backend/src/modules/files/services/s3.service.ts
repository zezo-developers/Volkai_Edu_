import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import * as crypto from 'crypto';
import * as path from 'path';

/**
 * S3 upload options interface
 */
export interface S3UploadOptions {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  organizationId?: string;
  userId?: string;
  isPublic?: boolean;
  expiresIn?: number; // seconds
}

/**
 * Presigned URL response interface
 */
export interface PresignedUrlResponse {
  uploadUrl: string;
  downloadUrl: string;
  storagePath: string;
  expiresAt: Date;
  fields?: Record<string, string>;
}

/**
 * S3 Service
 * Handles all S3 operations including presigned URLs, file uploads, and CDN integration
 * Implements security best practices and performance optimizations
 */
@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly cdnDomain?: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get<string>('AWS_REGION', 'us-east-1');
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET', 'volkai-hr-edu-files');
    this.cdnDomain = this.configService.get<string>('AWS_CLOUDFRONT_DOMAIN');

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY', ''),
      },
    });

    this.logger.log(`S3 Service initialized for bucket: ${this.bucketName} in region: ${this.region}`);
  }

  /**
   * Generate presigned URL for file upload
   * Implements secure upload with size limits and content type validation
   */
  async generatePresignedUploadUrl(options: S3UploadOptions): Promise<PresignedUrlResponse> {
    const {
      filename,
      mimeType,
      sizeBytes,
      organizationId,
      userId,
      isPublic = false,
      expiresIn = 3600, // 1 hour default
    } = options;

    try {
      // Generate unique storage path
      const storagePath = this.generateStoragePath(filename, organizationId, userId);
      
      // Validate file size (max 100MB for regular files, 500MB for videos)
      const maxSize = mimeType.startsWith('video/') ? 500 * 1024 * 1024 : 100 * 1024 * 1024;
      if (sizeBytes > maxSize) {
        throw new Error(`File size ${sizeBytes} exceeds maximum allowed size ${maxSize}`);
      }

      // Validate MIME type
      this.validateMimeType(mimeType);

      // Create put object command
      const putObjectCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: storagePath,
        ContentType: mimeType,
        ContentLength: sizeBytes,
        Metadata: {
          'original-filename': filename,
          'uploaded-by': userId || 'anonymous',
          'organization-id': organizationId || 'none',
          'upload-timestamp': new Date().toISOString(),
        },
        ...(isPublic && {
          ACL: 'public-read',
        }),
        // Add content disposition for better download experience
        ContentDisposition: `attachment; filename="${filename}"`,
        // Add cache control for performance
        CacheControl: isPublic ? 'public, max-age=31536000' : 'private, max-age=3600',
      });

      // Generate presigned upload URL
      const uploadUrl = await getSignedUrl(this.s3Client, putObjectCommand, {
        expiresIn,
      });

      // Generate download URL
      const downloadUrl = this.getDownloadUrl(storagePath, isPublic);

      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      this.logger.log(`Generated presigned upload URL for: ${filename} at path: ${storagePath}`);

      return {
        uploadUrl,
        downloadUrl,
        storagePath,
        expiresAt,
      };
    } catch (error) {
      this.logger.error(`Failed to generate presigned URL for ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Generate presigned URL for file download
   */
  async generatePresignedDownloadUrl(
    storagePath: string,
    expiresIn: number = 3600,
    filename?: string,
  ): Promise<string> {
    try {
      const getObjectCommand = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: storagePath,
        ...(filename && {
          ResponseContentDisposition: `attachment; filename="${filename}"`,
        }),
      });

      const downloadUrl = await getSignedUrl(this.s3Client, getObjectCommand, {
        expiresIn,
      });

      this.logger.log(`Generated presigned download URL for: ${storagePath}`);
      return downloadUrl;
    } catch (error) {
      this.logger.error(`Failed to generate presigned download URL for ${storagePath}:`, error);
      throw error;
    }
  }

  /**
   * Upload file directly to S3
   */
  async uploadFile(
    buffer: Buffer,
    options: S3UploadOptions,
  ): Promise<{ storagePath: string; publicUrl?: string; cdnUrl?: string }> {
    const { filename, mimeType, organizationId, userId, isPublic = false } = options;

    try {
      const storagePath = this.generateStoragePath(filename, organizationId, userId);

      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucketName,
          Key: storagePath,
          Body: buffer,
          ContentType: mimeType,
          Metadata: {
            'original-filename': filename,
            'uploaded-by': userId || 'anonymous',
            'organization-id': organizationId || 'none',
            'upload-timestamp': new Date().toISOString(),
          },
          ...(isPublic && {
            ACL: 'public-read',
          }),
          ContentDisposition: `attachment; filename="${filename}"`,
          CacheControl: isPublic ? 'public, max-age=31536000' : 'private, max-age=3600',
        },
      });

      await upload.done();

      const publicUrl = isPublic ? this.getPublicUrl(storagePath) : undefined;
      const cdnUrl = isPublic && this.cdnDomain ? this.getCdnUrl(storagePath) : undefined;

      this.logger.log(`Successfully uploaded file: ${filename} to ${storagePath}`);

      return {
        storagePath,
        publicUrl,
        cdnUrl,
      };
    } catch (error) {
      this.logger.error(`Failed to upload file ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Delete file from S3
   */
  async deleteFile(storagePath: string): Promise<void> {
    try {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: storagePath,
      });

      await this.s3Client.send(deleteCommand);
      this.logger.log(`Successfully deleted file: ${storagePath}`);
    } catch (error) {
      this.logger.error(`Failed to delete file ${storagePath}:`, error);
      throw error;
    }
  }

  /**
   * Check if file exists in S3
   */
  async fileExists(storagePath: string): Promise<boolean> {
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: storagePath,
      });

      await this.s3Client.send(headCommand);
      return true;
    } catch (error) {
      if (error.name === 'NotFound') {
        return false;
      }
      this.logger.error(`Error checking file existence ${storagePath}:`, error);
      throw error;
    }
  }

  /**
   * Get file metadata from S3
   */
  async getFileMetadata(storagePath: string): Promise<{
    contentType: string;
    contentLength: number;
    lastModified: Date;
    metadata: Record<string, string>;
  }> {
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: storagePath,
      });

      const response = await this.s3Client.send(headCommand);

      return {
        contentType: response.ContentType || 'application/octet-stream',
        contentLength: response.ContentLength || 0,
        lastModified: response.LastModified || new Date(),
        metadata: response.Metadata || {},
      };
    } catch (error) {
      this.logger.error(`Failed to get file metadata ${storagePath}:`, error);
      throw error;
    }
  }

  /**
   * Copy file within S3
   */
  async copyFile(sourcePath: string, destinationPath: string): Promise<void> {
    try {
      const copyCommand = new CopyObjectCommand({
        Bucket: this.bucketName,
        Key: destinationPath,
        CopySource: `${this.bucketName}/${sourcePath}`,
      });

      await this.s3Client.send(copyCommand);
      this.logger.log(`Successfully copied file from ${sourcePath} to ${destinationPath}`);
    } catch (error) {
      this.logger.error(`Failed to copy file from ${sourcePath} to ${destinationPath}:`, error);
      throw error;
    }
  }

  // Private helper methods

  /**
   * Generate unique storage path for file
   */
  private generateStoragePath(filename: string, organizationId?: string, userId?: string): string {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const randomId = crypto.randomBytes(16).toString('hex');
    const extension = path.extname(filename);
    const baseName = path.basename(filename, extension);
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');

    let pathPrefix = 'files';
    
    if (organizationId) {
      pathPrefix = `organizations/${organizationId}`;
    } else if (userId) {
      pathPrefix = `users/${userId}`;
    }

    return `${pathPrefix}/${timestamp}/${randomId}_${sanitizedBaseName}${extension}`;
  }

  /**
   * Get public URL for file
   */
  private getPublicUrl(storagePath: string): string {
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${storagePath}`;
  }

  /**
   * Get CDN URL for file
   */
  private getCdnUrl(storagePath: string): string {
    if (!this.cdnDomain) {
      return this.getPublicUrl(storagePath);
    }
    return `https://${this.cdnDomain}/${storagePath}`;
  }

  /**
   * Get download URL (public or CDN)
   */
  private getDownloadUrl(storagePath: string, isPublic: boolean): string {
    if (isPublic) {
      return this.cdnDomain ? this.getCdnUrl(storagePath) : this.getPublicUrl(storagePath);
    }
    // For private files, return a placeholder that will be replaced with presigned URL
    return `private://${storagePath}`;
  }

  /**
   * Validate MIME type against allowed types
   */
  private validateMimeType(mimeType: string): void {
    const allowedTypes = [
      // Images
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'image/bmp',
      'image/tiff',
      
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'application/json',
      'application/xml',
      
      // Archives
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      'application/x-tar',
      'application/gzip',
      
      // Audio
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/mp4',
      'audio/webm',
      
      // Video
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/avi',
      'video/quicktime',
      'video/x-msvideo',
    ];

    if (!allowedTypes.includes(mimeType)) {
      throw new Error(`MIME type ${mimeType} is not allowed`);
    }
  }
}
