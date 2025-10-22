import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { File } from '@database/entities/file.entity';
import { FilesController } from './files.controller';
import { FileManagerService } from './services/file-manager.service';
import { S3Service } from './services/s3.service';
import { VirusScannerService } from './services/virus-scanner.service';
import { ImageProcessorService } from './services/image-processor.service';

/**
 * Files Module
 * Provides comprehensive file management functionality including:
 * - Secure file upload with presigned URLs
 * - Virus scanning and malware detection
 * - Image processing and optimization
 * - CDN integration for performance
 * - Access control and permissions
 * - File lifecycle management
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([File]),
  ],
  controllers: [FilesController],
  providers: [
    FileManagerService,
    S3Service,
    VirusScannerService,
    ImageProcessorService,
  ],
  exports: [
    FileManagerService,
    S3Service,
    VirusScannerService,
    ImageProcessorService,
  ],
})
export class FilesModule {}
