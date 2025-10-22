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
    'FileManagerModule' as any,
  ],
  controllers: [CertificatesController],
  providers: [CertificateService],
  exports: [CertificateService],
})
export class CertificatesModule {}
