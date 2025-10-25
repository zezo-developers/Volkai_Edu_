import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as path from 'path';
import { 
  File, 
  FileOwnerType, 
  FileAccessLevel, 
  VirusScanStatus, 
  FileProcessingStatus 
} from '@database/entities/file.entity';
import { AuthenticatedUser } from '@modules/auth/strategies/jwt.strategy';
import { S3Service, PresignedUrlResponse } from './s3.service';
import { VirusScannerService } from './virus-scanner.service';
import { ImageProcessorService } from './image-processor.service';

/**
 * File upload request interface
 */
export interface FileUploadRequest {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  accessLevel?: FileAccessLevel;
  description?: string;
  tags?: string[];
  expiresIn?: number; // hours
}

/**
 * File search filters interface
 */
export interface FileSearchFilters {
  ownerId?: string;
  organizationId?: string;
  ownerType?: FileOwnerType;
  accessLevel?: FileAccessLevel;
  mimeType?: string;
  tags?: string[];
  filename?: string;
  virusScanStatus?: VirusScanStatus;
  processingStatus?: FileProcessingStatus;
  isArchived?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'filename' | 'sizeBytes' | 'downloadCount';
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * File statistics interface
 */
export interface FileStatistics {
  totalFiles: number;
  totalSize: number;
  filesByType: Record<string, number>;
  filesByAccessLevel: Record<string, number>;
  virusScanStats: Record<string, number>;
  processingStats: Record<string, number>;
  storageUsage: {
    used: number;
    limit: number;
    percentage: number;
  };
}

/**
 * File Manager Service
 * Orchestrates file operations including upload, processing, virus scanning, and access control
 * Implements comprehensive file lifecycle management
 */
@Injectable()
export class FileManagerService {
  private readonly logger = new Logger(FileManagerService.name);
  private readonly defaultStorageLimit: number;
  private readonly maxFileSize: number;
  private readonly allowedMimeTypes: string[];

  constructor(
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    private readonly s3Service: S3Service,
    private readonly virusScannerService: VirusScannerService,
    private readonly imageProcessorService: ImageProcessorService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {
    this.defaultStorageLimit = this.configService.get<number>('DEFAULT_STORAGE_LIMIT', 10 * 1024 * 1024 * 1024); // 10GB
    this.maxFileSize = this.configService.get<number>('MAX_FILE_SIZE', 100 * 1024 * 1024); // 100MB
    this.allowedMimeTypes = this.configService.get<string>('ALLOWED_MIME_TYPES', '').split(',').filter(Boolean);
  }

  /**
   * Generate presigned URL for file upload
   */
  async generateUploadUrl(
    request: FileUploadRequest,
    currentUser: AuthenticatedUser,
  ): Promise<PresignedUrlResponse & { fileId: string }> {
    const { filename, mimeType, sizeBytes, accessLevel = FileAccessLevel.PRIVATE, description, tags = [], expiresIn } = request;

    this.logger.log(`Generating upload URL for: ${filename} (${sizeBytes} bytes) by user: ${currentUser.id}`);

    try {
      // Validate upload request
      await this.validateUploadRequest(request, currentUser);

      // // Check storage quota
      await this.checkStorageQuota(currentUser.currentOrganizationId, sizeBytes);

      // // Create file record
      const file = this.fileRepository.create({
        ownerId: currentUser.id,
        organizationId: currentUser.currentOrganizationId,
        ownerType: FileOwnerType.USER,
        filename: this.sanitizeFilename(filename),
        originalFilename: filename,
        mimeType,
        sizeBytes,
        accessLevel,
        description,
        tags: tags.map(tag => tag.toLowerCase()),
        virusScanStatus: VirusScanStatus.PENDING,
        processingStatus: FileProcessingStatus.PENDING,
        storagePath: '', // Will be set after S3 response
        expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 60 * 60 * 1000) : undefined,
        metadata: {
          uploadedBy: currentUser.id,
          uploadedAt: new Date().toISOString(),
          userAgent: 'api', // Could be extracted from request headers
        },
      });

      const savedFile = await this.fileRepository.save(file);

      // // Generate S3 presigned URL
      const s3Options = {
        filename,
        mimeType,
        sizeBytes,
        organizationId: currentUser.currentOrganizationId,
        userId: currentUser.id,
        isPublic: accessLevel === FileAccessLevel.PUBLIC,
        expiresIn: 3600, // 1 hour
      };

      const presignedResponse = await this.s3Service.generatePresignedUploadUrl(s3Options);

      // // Update file with storage path
      await this.fileRepository.update(savedFile.id, {
        storagePath: presignedResponse.storagePath,
        publicUrl: presignedResponse.downloadUrl.startsWith('http') ? presignedResponse.downloadUrl : undefined,
      });

      // // Emit file upload initiated event
      this.eventEmitter.emit('file.uploadInitiated', {
        fileId: savedFile.id,
        filename,
        mimeType,
        sizeBytes,
        userId: currentUser.id,
        organizationId: currentUser.currentOrganizationId,
      });

      // this.logger.log(`Upload URL generated for file: ${savedFile.id}`);

      return {
        ...presignedResponse,
        fileId: savedFile.id,
      };
    } catch (error) {
      this.logger.error(`Failed to generate upload URL for ${filename}:`, error);
      throw error;
    }
  }

  async uploadFile(pdfBuffer:any, {}:any): Promise<any> {

  }

  /**
   * Process uploaded file (virus scan, image processing, etc.)
   */
  async processUploadedFile(fileId: string): Promise<any> {
    this.logger.log(`Processing uploaded file: ${fileId}`);

    const file = await this.fileRepository.findOne({
      where: { id: fileId },
      relations: ['owner', 'organization'],
    });

    if (!file) {
      throw new NotFoundException(`File not found: ${fileId}`);
    }

    try {
      // Update processing status
      await this.fileRepository.update(fileId, {
        processingStatus: FileProcessingStatus.PROCESSING,
      });

      // Verify file exists in S3
      const fileExists = await this.s3Service.fileExists(file.storagePath);
      if (!fileExists) {
        throw new Error('File not found in storage');
      }

      // Get file metadata from S3
      // const s3Metadata = await this.s3Service.getFileMetadata(file.storagePath);
      
      // // Update file with actual metadata
      // await this.fileRepository.update(fileId, {
      //   sizeBytes: s3Metadata.contentLength,
      //   checksum: await this.calculateChecksum(file.storagePath),
      // });

      // // Start virus scanning if enabled
      // if (this.virusScannerService.shouldScanFileType(file.mimeType, file.filename)) {
      //   await this.initiateVirusScan(file);
      // } else {
      //   // Mark as clean if scanning is skipped
      //   await this.fileRepository.update(fileId, {
      //     virusScanStatus: VirusScanStatus.CLEAN,
      //     virusScanAt: new Date(),
      //   });
      // }

      // // Start image processing if applicable
      // if (this.imageProcessorService.canProcessImage(file.mimeType)) {
      //   await this.initiateImageProcessing(file);
      // }

      // // Update processing status
      // await this.fileRepository.update(fileId, {
      //   processingStatus: FileProcessingStatus.COMPLETED,
      //   isProcessed: true,
      // });

      // // Emit file processed event
      // this.eventEmitter.emit('file.processed', {
      //   fileId,
      //   filename: file.filename,
      //   mimeType: file.mimeType,
      //   sizeBytes: file.sizeBytes,
      //   userId: file.ownerId,
      //   organizationId: file.organizationId,
      // });

      // this.logger.log(`File processing completed: ${fileId}`);

      // return await this.fileRepository.findOne({
      //   where: { id: fileId },
      //   relations: ['owner', 'organization'],
      // });
    } catch (error) {
      this.logger.error(`File processing failed for ${fileId}:`, error);

      // Update processing status to failed
      await this.fileRepository.update(fileId, {
        processingStatus: FileProcessingStatus.FAILED,
        processingError: error.message,
      });

      // Emit file processing error event
      this.eventEmitter.emit('file.processingError', {
        fileId,
        filename: file.filename,
        error: error.message,
        userId: file.ownerId,
        organizationId: file.organizationId,
      });

      throw error;
    }
  }

  /**
   * Get file by ID with access control
   */
  async getFileById(fileId: string, currentUser: AuthenticatedUser): Promise<any> {
    const file = await this.fileRepository.findOne({
      where: { id: fileId },
      relations: ['owner', 'organization'],
    });

    if (!file) {
      throw new NotFoundException(`File not found: ${fileId}`);
    }

    // Check access permissions
    if (!this.canUserAccessFile(file, currentUser)) {
      throw new ForbiddenException('Access denied to this file');
    }

    // Increment view count
    await this.fileRepository.update(fileId, {
      viewCount: file.viewCount + 1,
      lastAccessedAt: new Date(),
    });

    return file;
  }

  /**
   * Search files with filters and pagination
   */
  async searchFiles(
    filters: FileSearchFilters,
    currentUser: AuthenticatedUser,
  ): Promise<{
    files: File[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      ownerId,
      organizationId = currentUser.currentOrganizationId,
      ownerType,
      accessLevel,
      mimeType,
      tags,
      filename,
      virusScanStatus,
      processingStatus,
      isArchived = false,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = filters;

    const queryBuilder = this.fileRepository
      .createQueryBuilder('file')
      .leftJoinAndSelect('file.owner', 'owner')
      .leftJoinAndSelect('file.organization', 'organization');

    // Apply access control filters
    queryBuilder.andWhere(
      '(file.accessLevel = :publicAccess OR ' +
      '(file.accessLevel = :orgAccess AND file.organizationId = :userOrgId) OR ' +
      '(file.accessLevel = :privateAccess AND file.ownerId = :userId))',
      {
        publicAccess: FileAccessLevel.PUBLIC,
        orgAccess: FileAccessLevel.ORGANIZATION,
        privateAccess: FileAccessLevel.PRIVATE,
        userOrgId: currentUser.currentOrganizationId,
        userId: currentUser.id,
      },
    );

    // Apply filters
    if (ownerId) {
      queryBuilder.andWhere('file.ownerId = :ownerId', { ownerId });
    }

    if (organizationId) {
      queryBuilder.andWhere('file.organizationId = :organizationId', { organizationId });
    }

    if (ownerType) {
      queryBuilder.andWhere('file.ownerType = :ownerType', { ownerType });
    }

    if (accessLevel) {
      queryBuilder.andWhere('file.accessLevel = :accessLevel', { accessLevel });
    }

    if (mimeType) {
      queryBuilder.andWhere('file.mimeType LIKE :mimeType', { mimeType: `%${mimeType}%` });
    }

    if (filename) {
      queryBuilder.andWhere('file.filename ILIKE :filename', { filename: `%${filename}%` });
    }

    if (tags && tags.length > 0) {
      queryBuilder.andWhere('file.tags && :tags', { tags });
    }

    if (virusScanStatus) {
      queryBuilder.andWhere('file.virusScanStatus = :virusScanStatus', { virusScanStatus });
    }

    if (processingStatus) {
      queryBuilder.andWhere('file.processingStatus = :processingStatus', { processingStatus });
    }

    queryBuilder.andWhere('file.isArchived = :isArchived', { isArchived });

    if (dateFrom) {
      queryBuilder.andWhere('file.createdAt >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      queryBuilder.andWhere('file.createdAt <= :dateTo', { dateTo });
    }

    // Apply sorting
    queryBuilder.orderBy(`file.${sortBy}`, sortOrder);

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const offset = (page - 1) * limit;
    const files = await queryBuilder.skip(offset).take(limit).getMany();

    return {
      files,
      total,
      page,
      limit,
    };
  }

  /**
   * Generate download URL for file
   */
  async generateDownloadUrl(
    fileId: string,
    currentUser: AuthenticatedUser,
    expiresIn: number = 3600,
  ): Promise<string> {
    const file = await this.getFileById(fileId, currentUser);

    // Check if file is virus clean
    if (file.virusScanStatus === VirusScanStatus.INFECTED) {
      throw new ForbiddenException('Cannot download infected file');
    }

    // For public files, return CDN/public URL if available
    if (file.accessLevel === FileAccessLevel.PUBLIC && file.publicUrl) {
      return file.publicUrl;
    }

    // Generate presigned download URL
    const downloadUrl = await this.s3Service.generatePresignedDownloadUrl(
      file.storagePath,
      expiresIn,
      file.originalFilename,
    );

    // Increment download count
    await this.fileRepository.update(fileId, {
      downloadCount: file.downloadCount + 1,
      lastAccessedAt: new Date(),
    });

    // Emit file downloaded event
    this.eventEmitter.emit('file.downloaded', {
      fileId,
      filename: file.filename,
      userId: currentUser.id,
      organizationId: currentUser.currentOrganizationId,
    });

    return downloadUrl;
  }

  /**
   * Update file metadata
   */
  async updateFile(
    fileId: string,
    updates: {
      filename?: string;
      description?: string;
      tags?: string[];
      accessLevel?: FileAccessLevel;
    },
    currentUser: AuthenticatedUser,
  ): Promise<any> {
    const file = await this.getFileById(fileId, currentUser);

    // Check if user can modify this file
    if (file.ownerId !== currentUser.id && !currentUser.permissions?.includes('files:manage')) {
      throw new ForbiddenException('Insufficient permissions to modify this file');
    }

    const updateData: Partial<File> = {};

    if (updates.filename) {
      updateData.filename = this.sanitizeFilename(updates.filename);
    }

    if (updates.description !== undefined) {
      updateData.description = updates.description;
    }

    if (updates.tags) {
      updateData.tags = updates.tags.map(tag => tag.toLowerCase());
    }

    if (updates.accessLevel) {
      updateData.accessLevel = updates.accessLevel;
    }

    updateData.updatedAt = new Date();

    await this.fileRepository.update(fileId, updateData);

    // Emit file updated event
    this.eventEmitter.emit('file.updated', {
      fileId,
      updates,
      userId: currentUser.id,
      organizationId: currentUser.currentOrganizationId,
    });

    return await this.fileRepository.findOne({
      where: { id: fileId },
      relations: ['owner', 'organization'],
    });
  }

  /**
   * Delete file
   */
  async deleteFile(fileId: string, currentUser: AuthenticatedUser): Promise<void> {
    const file = await this.getFileById(fileId, currentUser);

    // Check if user can delete this file
    if (file.ownerId !== currentUser.id && !currentUser.permissions?.includes('files:manage')) {
      throw new ForbiddenException('Insufficient permissions to delete this file');
    }

    try {
      // Delete from S3
      await this.s3Service.deleteFile(file.storagePath);

      // Delete thumbnails if they exist
      if (file.thumbnailUrl) {
        // Extract thumbnail paths and delete them
        // This would be implemented based on your thumbnail storage strategy
      }

      // Delete from database
      await this.fileRepository.remove(file);

      // Emit file deleted event
      this.eventEmitter.emit('file.deleted', {
        fileId,
        filename: file.filename,
        sizeBytes: file.sizeBytes,
        userId: currentUser.id,
        organizationId: currentUser.currentOrganizationId,
      });

      this.logger.log(`File deleted: ${fileId} by user: ${currentUser.id}`);
    } catch (error) {
      this.logger.error(`Failed to delete file ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Get file statistics for organization
   */
  async getFileStatistics(organizationId: string): Promise<FileStatistics> {
    const files = await this.fileRepository.find({
      where: { organizationId, isArchived: false },
    });

    const totalFiles = files.length;
    const totalSize = files.reduce((sum, file) => sum + file.sizeBytes, 0);

    const filesByType = files.reduce((acc, file) => {
      const type = file.mimeType.split('/')[0];
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const filesByAccessLevel = files.reduce((acc, file) => {
      acc[file.accessLevel] = (acc[file.accessLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const virusScanStats = files.reduce((acc, file) => {
      acc[file.virusScanStatus] = (acc[file.virusScanStatus] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const processingStats = files.reduce((acc, file) => {
      acc[file.processingStatus] = (acc[file.processingStatus] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalFiles,
      totalSize,
      filesByType,
      filesByAccessLevel,
      virusScanStats,
      processingStats,
      storageUsage: {
        used: totalSize,
        limit: this.defaultStorageLimit,
        percentage: Math.round((totalSize / this.defaultStorageLimit) * 100),
      },
    };
  }

  // Private helper methods

  /**
   * Validate upload request
   */
  private async validateUploadRequest(
    request: FileUploadRequest,
    currentUser: AuthenticatedUser,
  ): Promise<void> {
    const { filename, mimeType, sizeBytes } = request;

    // Validate file size
    if (sizeBytes > this.maxFileSize) {
      throw new BadRequestException(`File size ${sizeBytes} exceeds maximum allowed size ${this.maxFileSize}`);
    }

    if (sizeBytes <= 0) {
      throw new BadRequestException('File size must be greater than 0');
    }

    // Validate MIME type if allowlist is configured
    if (this.allowedMimeTypes.length > 0 && !this.allowedMimeTypes.includes(mimeType)) {
      throw new BadRequestException(`MIME type ${mimeType} is not allowed`);
    }

    // Validate filename
    if (!filename || filename.trim().length === 0) {
      throw new BadRequestException('Filename is required');
    }

    if (filename.length > 255) {
      throw new BadRequestException('Filename is too long (max 255 characters)');
    }

    // Check for dangerous file extensions
    const dangerousExtensions = ['.exe', '.scr', '.bat', '.cmd', '.com', '.pif', '.vbs', '.js'];
    const extension = path.extname(filename).toLowerCase();
    
    if (dangerousExtensions.includes(extension)) {
      throw new BadRequestException(`File extension ${extension} is not allowed`);
    }
  }

  /**
   * Check storage quota for organization
   */
  private async checkStorageQuota(organizationId: string, additionalSize: number): Promise<void> {
    if (!organizationId) return;

    const currentUsage = await this.fileRepository
      .createQueryBuilder('file')
      .select('SUM(file.sizeBytes)', 'totalSize')
      .where('file.organizationId = :organizationId', { organizationId })
      .andWhere('file.isArchived = false')
      .getRawOne();

    const totalSize = parseInt(currentUsage.totalSize || '0', 10);
    const newTotal = totalSize + additionalSize;

    if (newTotal > this.defaultStorageLimit) {
      throw new BadRequestException(
        `Storage quota exceeded. Current: ${totalSize}, Limit: ${this.defaultStorageLimit}, Requested: ${additionalSize}`
      );
    }
  }

  /**
   * Check if user can access file
   */
  private canUserAccessFile(file: File, user: AuthenticatedUser): boolean {
    return file.canAccess(user.id, user.currentOrganizationId);
  }

  /**
   * Sanitize filename
   */
  private sanitizeFilename(filename: string): string {
    // Remove or replace dangerous characters
    return filename
      .replace(/[<>:"/\\|?*]/g, '_') // Replace dangerous characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .substring(0, 255); // Limit length
  }

  /**
   * Calculate file checksum
   */
  private async calculateChecksum(storagePath: string): Promise<string> {
    // This would typically involve downloading the file and calculating SHA-256
    // For now, return a placeholder
    return crypto.createHash('sha256').update(storagePath + Date.now()).digest('hex');
  }

  /**
   * Initiate virus scan for file
   */
  private async initiateVirusScan(file: File): Promise<void> {
    try {
      await this.fileRepository.update(file.id, {
        virusScanStatus: VirusScanStatus.SCANNING,
      });

      // This would typically be done asynchronously
      // For now, we'll mark it as clean
      setTimeout(async () => {
        await this.fileRepository.update(file.id, {
          virusScanStatus: VirusScanStatus.CLEAN,
          virusScanAt: new Date(),
        });
      }, 1000);
    } catch (error) {
      this.logger.error(`Failed to initiate virus scan for file ${file.id}:`, error);
      await this.fileRepository.update(file.id, {
        virusScanStatus: VirusScanStatus.ERROR,
        virusScanResult: error.message,
      });
    }
  }

  /**
   * Initiate image processing for file
   */
  private async initiateImageProcessing(file: File): Promise<void> {
    try {
      // This would typically be done asynchronously
      // For now, we'll just log the intent
      this.logger.log(`Initiating image processing for file: ${file.id}`);
      
      // Mark as processed for now
      setTimeout(async () => {
        await this.fileRepository.update(file.id, {
          isProcessed: true,
        });
      }, 2000);
    } catch (error) {
      this.logger.error(`Failed to initiate image processing for file ${file.id}:`, error);
    }
  }
}
