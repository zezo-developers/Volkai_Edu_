import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssessmentsController } from './assessments.controller';
import { AssessmentService } from './services/assessment.service';
import { Assessment } from '../../database/entities/assessment.entity';
import { AssessmentAttempt } from '../../database/entities/assessment-attempt.entity';
import { Course } from '../../database/entities/course.entity';
import { Module as CourseModule } from '../../database/entities/module.entity';
import { Lesson } from '../../database/entities/lesson.entity';
import { Enrollment } from '../../database/entities/enrollment.entity';
import { User } from '../../database/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Assessment,
      AssessmentAttempt,
      Course,
      CourseModule,
      Lesson,
      Enrollment,
      User,
    ]),
  ],
  controllers: [AssessmentsController],
  providers: [AssessmentService],
  exports: [AssessmentService],
})
export class AssessmentsModule {}
