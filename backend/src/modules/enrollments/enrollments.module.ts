import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnrollmentsController } from './enrollments.controller';
import { EnrollmentService } from './services/enrollment.service';
import { Enrollment } from '../../database/entities/enrollment.entity';
import { LessonProgress } from '../../database/entities/lesson-progress.entity';
import { Course } from '../../database/entities/course.entity';
import { Module as CourseModule } from '../../database/entities/module.entity';
import { Lesson } from '../../database/entities/lesson.entity';
import { User } from '../../database/entities/user.entity';
import { Certificate } from '../../database/entities/certificate.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Enrollment,
      LessonProgress,
      Course,
      CourseModule,
      Lesson,
      User,
      Certificate,
    ]),
  ],
  controllers: [EnrollmentsController],
  providers: [EnrollmentService],
  exports: [EnrollmentService],
})
export class EnrollmentsModule {}
