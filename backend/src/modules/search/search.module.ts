import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { SearchController } from './search.controller';
import { SearchService } from './services/search.service';
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
    ConfigModule,
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
