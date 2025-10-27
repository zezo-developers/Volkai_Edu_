import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from '../../database/entities/course.entity';
import { Module as CourseModule } from '../../database/entities/module.entity';
import { Lesson } from '../../database/entities/lesson.entity';
import { User } from '../../database/entities/user.entity';
import { Organization } from '../../database/entities/organization.entity';
import { CourseManagementService } from './services/course-management.service';
import { CoursesController } from './courses.controller';
import { Enrollment } from '@/database/entities/enrollment.entity';
import { ModuleLessonManagementService } from './services/module-management.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Course,
      CourseModule,
      Lesson,
      User,
      Organization,
      Enrollment
    ]),
  ],
  controllers: [
    CoursesController,
  ],
  providers: [
    CourseManagementService,
    ModuleLessonManagementService
  ],
  exports: [
    CourseManagementService,
    ModuleLessonManagementService,
  ],
})
export class CoursesModule {}
