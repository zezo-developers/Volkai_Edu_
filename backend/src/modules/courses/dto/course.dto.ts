import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
  IsUUID,
  IsDateString,
  ValidateNested,
  Min,
  Max,
  IsObject,
  IsUrl
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  CourseStatus,
  CourseDifficulty,
  CourseAccessType,
} from '../../../database/entities/course.entity';
import {
  ModuleStatus,
} from '../../../database/entities/module.entity';
import {
  LessonType,
  LessonStatus,
} from '../../../database/entities/lesson.entity';

export class CreateCourseDto {
  @ApiProperty({ description: 'Course title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Course description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Course short description' })
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @ApiProperty({ enum: CourseDifficulty, description: 'Course difficulty level', default: CourseDifficulty.BEGINNER })
  @IsEnum(CourseDifficulty)
  @IsOptional()
  difficulty: CourseDifficulty = CourseDifficulty.BEGINNER;

  @ApiPropertyOptional({ description: 'Course duration in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional({ description: 'Course price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: 'Course currency' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ enum: CourseAccessType, description: 'Course access type' })
  @IsEnum(CourseAccessType)
  accessType: CourseAccessType;

  @ApiPropertyOptional({ description: 'Access code for restricted courses' })
  @IsOptional()
  @IsString()
  accessCode?: string;

  @ApiPropertyOptional({ description: 'Course thumbnail file ID' })
  @IsOptional()
  @IsUUID()
  thumbnailId?: string;

  @ApiPropertyOptional({ description: 'Course video file ID' })
  @IsOptional()
  @IsUUID()
  videoId?: string;

  @ApiPropertyOptional({ description: 'Course category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Course tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Course learning objectives', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  learningObjectives?: string;

  @IsOptional()
  estimatedDurationMinutes?: number;

  @IsOptional()
  @IsBoolean()
  allowEnrollment?: boolean;

  @ApiPropertyOptional({ description: 'Course prerequisites', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisites?: string;

  @ApiPropertyOptional({ description: 'Course language' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Course certificate template' })
  @IsOptional()
  @IsString()
  certificateTemplate?: string;

  @ApiPropertyOptional({ description: 'Maximum enrollment limit' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxEnrollments?: number;

  @ApiPropertyOptional({ description: 'Course enrollment start date' })
  @IsOptional()
  @IsDateString()
  enrollmentStartDate?: string;

  @ApiPropertyOptional({ description: 'Course enrollment end date' })
  @IsOptional()
  @IsDateString()
  enrollmentEndDate?: string;

  @ApiPropertyOptional({ description: 'Course start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Course end date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Additional course metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateCourseDto extends PartialType(CreateCourseDto) {}

export class SearchCoursesDto {
  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ enum: CourseDifficulty, description: 'Filter by difficulty' })
  @IsOptional()
  @IsEnum(CourseDifficulty)
  difficulty?: CourseDifficulty;

  @ApiPropertyOptional({ enum: CourseStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  @ApiPropertyOptional({ enum: CourseAccessType, description: 'Filter by access type' })
  @IsOptional()
  @IsEnum(CourseAccessType)
  accessType?: CourseAccessType;

  @ApiPropertyOptional({ description: 'Filter by instructor ID' })
  @IsOptional()
  @IsUUID()
  instructorId?: string;

  @ApiPropertyOptional({ description: 'Filter by tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Minimum price' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum price' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort field' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], description: 'Sort order' })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}

export class CloneCourseDto {
  @ApiProperty({ description: 'New course title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Whether to include enrollments' })
  @IsOptional()
  @IsBoolean()
  includeEnrollments?: boolean;

  @ApiPropertyOptional({ description: 'Whether to include assessments' })
  @IsOptional()
  @IsBoolean()
  includeAssessments?: boolean;

  @ApiPropertyOptional({ description: 'Additional clone options' })
  @IsOptional()
  @IsObject()
  options?: Record<string, any>;
}

export class CreateModuleDto {
  @ApiProperty({ description: 'Module title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Module description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Module sort order' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Module duration in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional({ description: 'Additional module metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateModuleDto extends PartialType(CreateModuleDto) {}

export class ReorderModulesDto {
  @ApiProperty({ description: 'Array of module IDs in new order', type: [String] })
  @IsArray()
  @IsUUID(undefined, { each: true })
  moduleIds: string[];
}

export class CreateLessonDto {
  @ApiProperty({ description: 'Lesson title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Lesson description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: LessonType, description: 'Lesson type' })
  @IsEnum(LessonType)
  type: LessonType;

  @ApiPropertyOptional({ description: 'Lesson content' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Lesson sort order' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Lesson duration in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional({ description: 'Video file ID for video lessons' })
  @IsOptional()
  @IsUUID()
  videoId?: string;

  @ApiPropertyOptional({ description: 'Attachment file IDs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  attachmentIds?: string[];

  @ApiPropertyOptional({ description: 'Whether lesson is free preview' })
  @IsOptional()
  @IsBoolean()
  isFreePreview?: boolean;

  @ApiPropertyOptional({ description: 'Additional lesson metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateLessonDto extends PartialType(CreateLessonDto) {}

export class ReorderLessonsDto {
  @ApiProperty({ description: 'Array of lesson IDs in new order', type: [String] })
  @IsArray()
  @IsUUID(undefined, { each: true })
  lessonIds: string[];
}

export class CourseResponseDto {
  @ApiProperty({ description: 'Course ID' })
  id: string;

  @ApiProperty({ description: 'Course title' })
  title: string;

  @ApiPropertyOptional({ description: 'Course description' })
  description?: string;

  @ApiPropertyOptional({ description: 'Course short description' })
  shortDescription?: string;

  @ApiProperty({ description: 'Course slug' })
  slug: string;

  @ApiProperty({ enum: CourseStatus, description: 'Course status' })
  status: CourseStatus;

  @ApiProperty({ enum: CourseDifficulty, description: 'Course difficulty' })
  difficulty: CourseDifficulty;

  @ApiPropertyOptional({ description: 'Course duration in minutes' })
  duration?: number;

  @ApiPropertyOptional({ description: 'Course price' })
  price?: number;

  @ApiPropertyOptional({ description: 'Course currency' })
  currency?: string;

  @ApiProperty({ enum: CourseAccessType, description: 'Course access type' })
  accessType: CourseAccessType;

  @ApiPropertyOptional({ description: 'Course thumbnail URL' })
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: 'Course video URL' })
  videoUrl?: string;

  @ApiPropertyOptional({ description: 'Course category' })
  category?: string;

  @ApiPropertyOptional({ description: 'Course tags', type: [String] })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Course learning objectives', type: [String] })
  learningObjectives?: string[];

  @ApiPropertyOptional({ description: 'Course prerequisites', type: [String] })
  prerequisites?: string[];

  @ApiPropertyOptional({ description: 'Course language' })
  language?: string;

  @ApiProperty({ description: 'Course rating' })
  rating: number;

  @ApiProperty({ description: 'Course review count' })
  reviewCount: number;

  @ApiProperty({ description: 'Course enrollment count' })
  enrollmentCount: number;

  @ApiProperty({ description: 'Course completion count' })
  completionCount: number;

  @ApiProperty({ description: 'Course instructor' })
  instructor: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profilePictureUrl?: string;
  };

  @ApiProperty({ description: 'Course creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Course last update date' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Course modules' })
  modules?: ModuleResponseDto[];

  @ApiPropertyOptional({ description: 'Course statistics' })
  statistics?: {
    totalLessons: number;
    totalAssessments: number;
    averageCompletionTime: number;
    completionRate: number;
  };

  constructor(course: any) {
    this.id = course.id;
    this.title = course.title;
    this.description = course.description;
    this.shortDescription = course.shortDescription;
    this.slug = course.slug;
    this.status = course.status;
    this.difficulty = course.difficulty;
    this.duration = course.duration;
    this.price = course.price;
    this.currency = course.currency;
    this.accessType = course.accessType;
    this.thumbnailUrl = course.thumbnailUrl;
    this.videoUrl = course.videoUrl;
    this.category = course.category;
    this.tags = course.tags;
    this.learningObjectives = course.learningObjectives;
    this.prerequisites = course.prerequisites;
    this.language = course.language;
    this.rating = course.rating;
    this.reviewCount = course.reviewCount;
    this.enrollmentCount = course.enrollmentCount;
    this.completionCount = course.completionCount;
    this.instructor = course.instructor;
    this.createdAt = course.createdAt;
    this.updatedAt = course.updatedAt;
    this.modules = course.modules?.map((module: any) => new ModuleResponseDto(module));
    this.statistics = course.statistics;
  }
}

export class ModuleResponseDto {
  @ApiProperty({ description: 'Module ID' })
  id: string;

  @ApiProperty({ description: 'Module title' })
  title: string;

  @ApiPropertyOptional({ description: 'Module description' })
  description?: string;

  @ApiProperty({ description: 'Module slug' })
  slug: string;

  @ApiProperty({ enum: ModuleStatus, description: 'Module status' })
  status: ModuleStatus;

  @ApiProperty({ description: 'Module sort order' })
  sortOrder: number;

  @ApiPropertyOptional({ description: 'Module duration in minutes' })
  duration?: number;

  @ApiProperty({ description: 'Course ID' })
  courseId: string;

  @ApiProperty({ description: 'Module creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Module last update date' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Module lessons' })
  lessons?: LessonResponseDto[];

  @ApiPropertyOptional({ description: 'Module statistics' })
  statistics?: {
    totalLessons: number;
    completionRate: number;
    averageTimeSpent: number;
  };

  constructor(module: any) {
    this.id = module.id;
    this.title = module.title;
    this.description = module.description;
    this.slug = module.slug;
    this.status = module.status;
    this.sortOrder = module.sortOrder;
    this.duration = module.duration;
    this.courseId = module.courseId;
    this.createdAt = module.createdAt;
    this.updatedAt = module.updatedAt;
    this.lessons = module.lessons?.map((lesson: any) => new LessonResponseDto(lesson));
    this.statistics = module.statistics;
  }
}

export class LessonResponseDto {
  @ApiProperty({ description: 'Lesson ID' })
  id: string;

  @ApiProperty({ description: 'Lesson title' })
  title: string;

  @ApiPropertyOptional({ description: 'Lesson description' })
  description?: string;

  @ApiProperty({ description: 'Lesson slug' })
  slug: string;

  @ApiProperty({ enum: LessonType, description: 'Lesson type' })
  type: LessonType;

  @ApiProperty({ enum: LessonStatus, description: 'Lesson status' })
  status: LessonStatus;

  @ApiPropertyOptional({ description: 'Lesson content' })
  content?: string;

  @ApiProperty({ description: 'Lesson sort order' })
  sortOrder: number;

  @ApiPropertyOptional({ description: 'Lesson duration in minutes' })
  duration?: number;

  @ApiPropertyOptional({ description: 'Video URL for video lessons' })
  videoUrl?: string;

  @ApiProperty({ description: 'Whether lesson is free preview' })
  isFreePreview: boolean;

  @ApiProperty({ description: 'Module ID' })
  moduleId: string;

  @ApiProperty({ description: 'Lesson creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Lesson last update date' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Lesson attachments' })
  attachments?: {
    id: string;
    filename: string;
    url: string;
    size: number;
    mimeType: string;
  }[];

  @ApiPropertyOptional({ description: 'Lesson statistics' })
  statistics?: {
    completionRate: number;
    averageTimeSpent: number;
    viewCount: number;
  };

  constructor(lesson: any) {
    this.id = lesson.id;
    this.title = lesson.title;
    this.description = lesson.description;
    this.slug = lesson.slug;
    this.type = lesson.type;
    this.status = lesson.status;
    this.content = lesson.content;
    this.sortOrder = lesson.sortOrder;
    this.duration = lesson.duration;
    this.videoUrl = lesson.videoUrl;
    this.isFreePreview = lesson.isFreePreview;
    this.moduleId = lesson.moduleId;
    this.createdAt = lesson.createdAt;
    this.updatedAt = lesson.updatedAt;
    this.attachments = lesson.attachments;
    this.statistics = lesson.statistics;
  }
}

export class CourseListResponseDto {
  @ApiProperty({ type: [CourseResponseDto], description: 'List of courses' })
  items: CourseResponseDto[];

  @ApiProperty({ description: 'Total number of items' })
  total: number;

  @ApiProperty({ description: 'Current page' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  constructor(data: any) {
    this.items = data.items.map((item: any) => new CourseResponseDto(item));
    this.total = data.total;
    this.page = data.page;
    this.limit = data.limit;
    this.totalPages = data.totalPages;
  }
}

export class CourseStatisticsDto {
  @ApiProperty({ description: 'Course ID' })
  courseId: string;

  @ApiProperty({ description: 'Total enrollments' })
  totalEnrollments: number;

  @ApiProperty({ description: 'Active enrollments' })
  activeEnrollments: number;

  @ApiProperty({ description: 'Completed enrollments' })
  completedEnrollments: number;

  @ApiProperty({ description: 'Completion rate percentage' })
  completionRate: number;

  @ApiProperty({ description: 'Average rating' })
  averageRating: number;

  @ApiProperty({ description: 'Total reviews' })
  totalReviews: number;

  @ApiProperty({ description: 'Total revenue' })
  totalRevenue: number;

  @ApiProperty({ description: 'Average completion time in hours' })
  averageCompletionTime: number;

  constructor(data: any) {
    this.courseId = data.courseId;
    this.totalEnrollments = data.totalEnrollments;
    this.activeEnrollments = data.activeEnrollments;
    this.completedEnrollments = data.completedEnrollments;
    this.completionRate = data.completionRate;
    this.averageRating = data.averageRating;
    this.totalReviews = data.totalReviews;
    this.totalRevenue = data.totalRevenue;
    this.averageCompletionTime = data.averageCompletionTime;
  }
}
