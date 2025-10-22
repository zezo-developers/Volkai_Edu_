import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from '../../database/entities/course.entity';
import { Module as CourseModule } from '../../database/entities/module.entity';
import { Lesson } from '../../database/entities/lesson.entity';
import { User } from '../../database/entities/user.entity';
import { Organization } from '../../database/entities/organization.entity';
import { CourseManagementService } from './services/course-management.service';
import { CoursesController } from './courses.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Course,
      CourseModule,
      Lesson,
      User,
      Organization,
    ]),
  ],
  controllers: [
    CoursesController,
  ],
  providers: [
    CourseManagementService,
    'ModuleManagementService' as any,
  ],
  exports: [
    CourseManagementService,
    'ModuleManagementService',
  ],
})
export class CoursesModule {}
