import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { File, VirusScanStatus, FileProcessingStatus } from '@database/entities/file.entity';
import { S3Service } from './s3.service';

/**
 * Cleanup statistics interface
 */
export interface CleanupStatistics {
  expiredFiles: number;
  orphanedFiles: number;
  infectedFiles: number;
  failedProcessingFiles: number;
  totalCleaned: number;
  spaceSaved: number;
  errors: string[];
}

/**
 * File Cleanup Service
 * Handles automatic cleanup of expired, orphaned, and infected files
 * Implements comprehensive file lifecycle management
 */
@Injectable()
export class FileCleanupService {
  private readonly logger = new Logger(FileCleanupService.name);
  private readonly isEnabled: boolean;
  private readonly retentionDays: number;
  private readonly batchSize: number;
  private readonly cleanupInfectedFiles: boolean;
  private readonly cleanupFailedFiles: boolean;

  constructor(
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    private readonly s3Service: S3Service,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.isEnabled = this.configService.get<boolean>('FILE_CLEANUP_ENABLED', true);
    this.retentionDays = this.configService.get<number>('FILE_RETENTION_DAYS', 365);
    this.batchSize = this.configService.get<number>('CLEANUP_BATCH_SIZE', 100);
    this.cleanupInfectedFiles = this.configService.get<boolean>('CLEANUP_INFECTED_FILES', true);
    this.cleanupFailedFiles = this.configService.get<boolean>('CLEANUP_FAILED_FILES', true);

    if (this.isEnabled) {
      this.logger.log(
        `File cleanup service initialized - Retention: ${this.retentionDays} days, ` +
        `Batch size: ${this.batchSize}, Infected cleanup: ${this.cleanupInfectedFiles}, ` +
        `Failed cleanup: ${this.cleanupFailedFiles}`
      );
    } else {
      this.logger.warn('File cleanup service is disabled');
    }
  }

  /**
   * Scheduled cleanup job - runs daily at 2 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async scheduledCleanup(): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    this.logger.log('Starting scheduled file cleanup');

    try {
      const stats = await this.performCleanup();
      
      this.logger.log(
        `Scheduled cleanup completed - Files cleaned: ${stats.totalCleaned}, ` +
        `Space saved: ${this.formatBytes(stats.spaceSaved)}, Errors: ${stats.errors.length}`
      );

      // Emit cleanup completed event
      this.eventEmitter.emit('file-cleanup.completed', {
        type: 'scheduled',
        statistics: stats,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Scheduled cleanup failed:', error);
      
      // Emit cleanup error event
      this.eventEmitter.emit('file-cleanup.error', {
        type: 'scheduled',
        error: error.message,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Manual cleanup trigger
   */
  async performManualCleanup(): Promise<CleanupStatistics> {
    this.logger.log('Starting manual file cleanup');

    try {
      const stats = await this.performCleanup();
      
      this.logger.log(
        `Manual cleanup completed - Files cleaned: ${stats.totalCleaned}, ` +
        `Space saved: ${this.formatBytes(stats.spaceSaved)}`
      );

      // Emit cleanup completed event
      this.eventEmitter.emit('file-cleanup.completed', {
        type: 'manual',
        statistics: stats,
        timestamp: new Date(),
      });

      return stats;
    } catch (error) {
      this.logger.error('Manual cleanup failed:', error);
      
      // Emit cleanup error event
      this.eventEmitter.emit('file-cleanup.error', {
        type: 'manual',
        error: error.message,
        timestamp: new Date(),
      });

      throw error;
    }
  }

  /**
   * Perform comprehensive file cleanup
   */
  private async performCleanup(): Promise<CleanupStatistics> {
    const stats: CleanupStatistics = {
      expiredFiles: 0,
      orphanedFiles: 0,
      infectedFiles: 0,
      failedProcessingFiles: 0,
      totalCleaned: 0,
      spaceSaved: 0,
      errors: [],
    };

    // Clean expired files
    try {
      const expiredStats = await this.cleanupExpiredFiles();
      stats.expiredFiles = expiredStats.count;
      stats.spaceSaved += expiredStats.spaceSaved;
    } catch (error) {
      stats.errors.push(`Expired files cleanup: ${error.message}`);
    }

    // Clean orphaned files (files without database records)
    try {
      const orphanedStats = await this.cleanupOrphanedFiles();
      stats.orphanedFiles = orphanedStats.count;
      stats.spaceSaved += orphanedStats.spaceSaved;
    } catch (error) {
      stats.errors.push(`Orphaned files cleanup: ${error.message}`);
    }

    // Clean infected files
    if (this.cleanupInfectedFiles) {
      try {
        const infectedStats = await this.cleanupInfectedFiles2();
        stats.infectedFiles = infectedStats.count;
        stats.spaceSaved += infectedStats.spaceSaved;
      } catch (error) {
        stats.errors.push(`Infected files cleanup: ${error.message}`);
      }
    }

    // Clean failed processing files
    if (this.cleanupFailedFiles) {
      try {
        const failedStats = await this.cleanupFailedProcessingFiles();
        stats.failedProcessingFiles = failedStats.count;
        stats.spaceSaved += failedStats.spaceSaved;
      } catch (error) {
        stats.errors.push(`Failed processing files cleanup: ${error.message}`);
      }
    }

    // Clean old archived files
    try {
      const archivedStats = await this.cleanupOldArchivedFiles();
      stats.totalCleaned += archivedStats.count;
      stats.spaceSaved += archivedStats.spaceSaved;
    } catch (error) {
      stats.errors.push(`Archived files cleanup: ${error.message}`);
    }

    stats.totalCleaned = stats.expiredFiles + stats.orphanedFiles + stats.infectedFiles + stats.failedProcessingFiles;

    return stats;
  }

  /**
   * Clean up expired files
   */
  private async cleanupExpiredFiles(): Promise<{ count: number; spaceSaved: number }> {
    this.logger.log('Cleaning up expired files');

    const expiredFiles = await this.fileRepository.find({
      where: {
        expiresAt: LessThan(new Date()),
      },
      take: this.batchSize,
    });

    let count = 0;
    let spaceSaved = 0;

    for (const file of expiredFiles) {
      try {
        // Delete from S3
        await this.s3Service.deleteFile(file.storagePath);
        
        // Delete from database
        await this.fileRepository.remove(file);
        
        count++;
        spaceSaved += file.sizeBytes;
        
        this.logger.debug(`Deleted expired file: ${file.id} (${file.filename})`);
      } catch (error) {
        this.logger.warn(`Failed to delete expired file ${file.id}:`, error);
      }
    }

    this.logger.log(`Cleaned up ${count} expired files, saved ${this.formatBytes(spaceSaved)}`);
    return { count, spaceSaved };
  }

  /**
   * Clean up orphaned files (files in S3 without database records)
   */
  private async cleanupOrphanedFiles(): Promise<{ count: number; spaceSaved: number }> {
    this.logger.log('Cleaning up orphaned files');
    
    // This is a simplified implementation
    // In a real scenario, you would list S3 objects and compare with database records
    // For now, we'll return zero counts
    
    return { count: 0, spaceSaved: 0 };
  }

  /**
   * Clean up infected files
   */
  private async cleanupInfectedFiles2(): Promise<{ count: number; spaceSaved: number }> {
    this.logger.log('Cleaning up infected files');

    const infectedFiles = await this.fileRepository.find({
      where: {
        virusScanStatus: VirusScanStatus.INFECTED,
      },
      take: this.batchSize,
    });

    let count = 0;
    let spaceSaved = 0;

    for (const file of infectedFiles) {
      try {
        // Delete from S3
        await this.s3Service.deleteFile(file.storagePath);
        
        // Delete from database
        await this.fileRepository.remove(file);
        
        count++;
        spaceSaved += file.sizeBytes;
        
        this.logger.debug(`Deleted infected file: ${file.id} (${file.filename})`);
        
        // Emit infected file deleted event
        this.eventEmitter.emit('file.infectedDeleted', {
          fileId: file.id,
          filename: file.filename,
          virusScanResult: file.virusScanResult,
          organizationId: file.organizationId,
        });
      } catch (error) {
        this.logger.warn(`Failed to delete infected file ${file.id}:`, error);
      }
    }

    this.logger.log(`Cleaned up ${count} infected files, saved ${this.formatBytes(spaceSaved)}`);
    return { count, spaceSaved };
  }

  /**
   * Clean up files with failed processing
   */
  private async cleanupFailedProcessingFiles(): Promise<{ count: number; spaceSaved: number }> {
    this.logger.log('Cleaning up files with failed processing');

    // Clean files that have been in failed state for more than 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const failedFiles = await this.fileRepository.find({
      where: {
        processingStatus: FileProcessingStatus.FAILED,
        updatedAt: LessThan(sevenDaysAgo),
      },
      take: this.batchSize,
    });

    let count = 0;
    let spaceSaved = 0;

    for (const file of failedFiles) {
      try {
        // Delete from S3
        await this.s3Service.deleteFile(file.storagePath);
        
        // Delete from database
        await this.fileRepository.remove(file);
        
        count++;
        spaceSaved += file.sizeBytes;
        
        this.logger.debug(`Deleted failed processing file: ${file.id} (${file.filename})`);
      } catch (error) {
        this.logger.warn(`Failed to delete failed processing file ${file.id}:`, error);
      }
    }

    this.logger.log(`Cleaned up ${count} failed processing files, saved ${this.formatBytes(spaceSaved)}`);
    return { count, spaceSaved };
  }

  /**
   * Clean up old archived files
   */
  private async cleanupOldArchivedFiles(): Promise<{ count: number; spaceSaved: number }> {
    this.logger.log('Cleaning up old archived files');

    const retentionDate = new Date(Date.now() - this.retentionDays * 24 * 60 * 60 * 1000);

    const oldArchivedFiles = await this.fileRepository.find({
      where: {
        isArchived: true,
        updatedAt: LessThan(retentionDate),
      },
      take: this.batchSize,
    });

    let count = 0;
    let spaceSaved = 0;

    for (const file of oldArchivedFiles) {
      try {
        // Delete from S3
        await this.s3Service.deleteFile(file.storagePath);
        
        // Delete from database
        await this.fileRepository.remove(file);
        
        count++;
        spaceSaved += file.sizeBytes;
        
        this.logger.debug(`Deleted old archived file: ${file.id} (${file.filename})`);
      } catch (error) {
        this.logger.warn(`Failed to delete old archived file ${file.id}:`, error);
      }
    }

    this.logger.log(`Cleaned up ${count} old archived files, saved ${this.formatBytes(spaceSaved)}`);
    return { count, spaceSaved };
  }

  /**
   * Archive old files instead of deleting them
   */
  async archiveOldFiles(olderThanDays: number = 180): Promise<{ count: number; spaceSaved: number }> {
    this.logger.log(`Archiving files older than ${olderThanDays} days`);

    const archiveDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const oldFiles = await this.fileRepository.find({
      where: {
        createdAt: LessThan(archiveDate),
        isArchived: false,
        lastAccessedAt: LessThan(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)), // Not accessed in 30 days
      },
      take: this.batchSize,
    });

    let count = 0;
    let spaceSaved = 0;

    for (const file of oldFiles) {
      try {
        // Mark as archived
        await this.fileRepository.update(file.id, {
          isArchived: true,
          updatedAt: new Date(),
        });
        
        count++;
        spaceSaved += file.sizeBytes; // Space that could be moved to cheaper storage
        
        this.logger.debug(`Archived old file: ${file.id} (${file.filename})`);
      } catch (error) {
        this.logger.warn(`Failed to archive old file ${file.id}:`, error);
      }
    }

    this.logger.log(`Archived ${count} old files, potential savings: ${this.formatBytes(spaceSaved)}`);
    return { count, spaceSaved };
  }

  /**
   * Get cleanup statistics without performing cleanup
   */
  async getCleanupStatistics(): Promise<{
    expiredFiles: number;
    infectedFiles: number;
    failedProcessingFiles: number;
    oldArchivedFiles: number;
    potentialSpaceSaving: number;
  }> {
    const [expiredCount, infectedCount, failedCount, oldArchivedCount] = await Promise.all([
      this.fileRepository.count({
        where: { expiresAt: LessThan(new Date()) },
      }),
      this.fileRepository.count({
        where: { virusScanStatus: VirusScanStatus.INFECTED },
      }),
      this.fileRepository.count({
        where: {
          processingStatus: FileProcessingStatus.FAILED,
          updatedAt: LessThan(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
        },
      }),
      this.fileRepository.count({
        where: {
          isArchived: true,
          updatedAt: LessThan(new Date(Date.now() - this.retentionDays * 24 * 60 * 60 * 1000)),
        },
      }),
    ]);

    // Calculate potential space saving (simplified)
    const filesToClean = await this.fileRepository.find({
      where: [
        { expiresAt: LessThan(new Date()) },
        { virusScanStatus: VirusScanStatus.INFECTED },
        {
          processingStatus: FileProcessingStatus.FAILED,
          updatedAt: LessThan(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
        },
      ],
      select: ['sizeBytes'],
    });

    const potentialSpaceSaving = filesToClean.reduce((sum, file) => sum + file.sizeBytes, 0);

    return {
      expiredFiles: expiredCount,
      infectedFiles: infectedCount,
      failedProcessingFiles: failedCount,
      oldArchivedFiles: oldArchivedCount,
      potentialSpaceSaving,
    };
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<{
    isHealthy: boolean;
    isEnabled: boolean;
    retentionDays: number;
    lastCleanupStats?: CleanupStatistics;
  }> {
    return {
      isHealthy: true,
      isEnabled: this.isEnabled,
      retentionDays: this.retentionDays,
    };
  }
}
