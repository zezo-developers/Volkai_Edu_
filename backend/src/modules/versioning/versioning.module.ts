import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VersioningController } from './versioning.controller';
import { VersioningService } from './services/versioning.service';
import { Course } from '../../database/entities/course.entity';
import { Module as CourseModule } from '../../database/entities/module.entity';
import { Lesson } from '../../database/entities/lesson.entity';
import { Assessment } from '../../database/entities/assessment.entity';
import { User } from '../../database/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Course,
      CourseModule,
      Lesson,
      Assessment,
      User,
    ]),
  ],
  controllers: [VersioningController],
  providers: [VersioningService],
  exports: [VersioningService],
})
export class VersioningModule {}
