import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CertificatesController } from './certificates.controller';
import { CertificateService } from './services/certificate.service';
import { Certificate } from '../../database/entities/certificate.entity';
import { Enrollment } from '../../database/entities/enrollment.entity';
import { Course } from '../../database/entities/course.entity';
import { User } from '../../database/entities/user.entity';
import { Organization } from '../../database/entities/organization.entity';
import { File } from '../../database/entities/file.entity';
import { FileManagerService } from '../files/services/file-manager.service';
import { S3Service } from '../files/services/s3.service';
import { VirusScannerService } from '../files/services/virus-scanner.service';
import { ImageProcessorService } from '../files/services/image-processor.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Certificate,
      Enrollment,
      Course,
      User,
      Organization,
      File,
    ]),
    
  ],
  controllers: [CertificatesController],
  providers: [CertificateService, FileManagerService, S3Service, VirusScannerService, ImageProcessorService],
  exports: [CertificateService],
})
export class CertificatesModule {}
