import { Module } from '@nestjs/common';
import { CoursesModule } from '../courses/courses.module';
import { AssessmentsModule } from '../assessments/assessments.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { CertificatesModule } from '../certificates/certificates.module';

@Module({
  imports: [
    CoursesModule,
    // AssessmentsModule,
    // EnrollmentsModule,
    // CertificatesModule,
  ],
  exports: [
    CoursesModule,
    // AssessmentsModule,
    // EnrollmentsModule,
    // CertificatesModule,
  ],
})
export class LMSModule {}
