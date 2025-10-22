import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsUUID,
  IsDateString,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  EnrollmentStatus
} from '../../../database/entities/enrollment.entity';

export class EnrollUserDto {
  @ApiProperty({ description: 'Course ID to enroll in' })
  @IsUUID()
  courseId: string;

  @ApiPropertyOptional({ description: 'Enrollment access code (if required)' })
  @IsOptional()
  @IsString()
  accessCode?: string;

  @ApiPropertyOptional({ description: 'Additional enrollment metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateLessonProgressDto {
  @ApiPropertyOptional({
    description: 'Progress percentage',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progressPercentage?: number;

  @ApiPropertyOptional({ description: 'Time spent on lesson in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  timeSpent?: number;

  @ApiPropertyOptional({ description: 'Bookmark position (for video content)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bookmarkPosition?: number;

  @ApiPropertyOptional({ description: 'Lesson interaction data' })
  @IsOptional()
  @IsObject()
  interactionData?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Additional progress metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class EnrollmentResponseDto {
  @ApiProperty({ description: 'Enrollment ID' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Course ID' })
  courseId: string;

  @ApiProperty({ enum: EnrollmentStatus, description: 'Enrollment status' })
  status: EnrollmentStatus;

  @ApiProperty({ description: 'Enrollment date' })
  enrolledAt: Date;

  @ApiPropertyOptional({ description: 'Completion date' })
  completedAt?: Date;

  @ApiPropertyOptional({ description: 'Expiry date' })
  expiresAt?: Date;

  @ApiProperty({ description: 'Overall progress percentage' })
  progressPercentage: number;

  @ApiProperty({ description: 'Total time spent in seconds' })
  totalTimeSpent: number;

  @ApiProperty({ description: 'Current score' })
  currentScore: number;

  @ApiProperty({ description: 'Best score achieved' })
  bestScore: number;

  @ApiProperty({ description: 'Number of lessons completed' })
  completedLessons: number;

  @ApiProperty({ description: 'Total number of lessons' })
  totalLessons: number;

  @ApiProperty({ description: 'Number of assessments completed' })
  completedAssessments: number;

  @ApiProperty({ description: 'Total number of assessments' })
  totalAssessments: number;

  @ApiProperty({ description: 'Last activity date' })
  lastActivityAt: Date;

  @ApiPropertyOptional({ description: 'Course details' })
  course?: {
    id: string;
    title: string;
    description?: string;
    thumbnailUrl?: string;
    duration?: number;
    difficulty?: string;
  };

  @ApiPropertyOptional({ description: 'Certificate ID if course is completed' })
  certificateId?: string;

  constructor(enrollment: any) {
    this.id = enrollment.id;
    this.userId = enrollment.userId;
    this.courseId = enrollment.courseId;
    this.status = enrollment.status;
    this.enrolledAt = enrollment.enrolledAt;
    this.completedAt = enrollment.completedAt;
    this.expiresAt = enrollment.expiresAt;
    this.progressPercentage = enrollment.progressPercentage;
    this.totalTimeSpent = enrollment.totalTimeSpent;
    this.currentScore = enrollment.currentScore;
    this.bestScore = enrollment.bestScore;
    this.completedLessons = enrollment.completedLessons;
    this.totalLessons = enrollment.totalLessons;
    this.completedAssessments = enrollment.completedAssessments;
    this.totalAssessments = enrollment.totalAssessments;
    this.lastActivityAt = enrollment.lastActivityAt;
    this.course = enrollment.course;
    this.certificateId = enrollment.certificateId;
  }
}

export class LessonProgressResponseDto {
  @ApiProperty({ description: 'Progress ID' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Lesson ID' })
  lessonId: string;

  @ApiProperty({ description: 'Enrollment ID' })
  enrollmentId: string;

  @ApiProperty({ enum: null, description: 'Progress status' })
  status: any;

  @ApiProperty({ description: 'Progress percentage' })
  progressPercentage: number;

  @ApiProperty({ description: 'Time spent in seconds' })
  timeSpent: number;

  @ApiPropertyOptional({ description: 'Bookmark position' })
  bookmarkPosition?: number;

  @ApiProperty({ description: 'First access date' })
  firstAccessedAt: Date;

  @ApiPropertyOptional({ description: 'Completion date' })
  completedAt?: Date;

  @ApiProperty({ description: 'Last activity date' })
  lastActivityAt: Date;

  @ApiPropertyOptional({ description: 'Interaction data' })
  interactionData?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Lesson details' })
  lesson?: {
    id: string;
    title: string;
    type: string;
    duration?: number;
    sortOrder: number;
  };

  constructor(progress: any) {
    this.id = progress.id;
    this.userId = progress.userId;
    this.lessonId = progress.lessonId;
    this.enrollmentId = progress.enrollmentId;
    this.status = progress.status;
    this.progressPercentage = progress.progressPercentage;
    this.timeSpent = progress.timeSpent;
    this.bookmarkPosition = progress.bookmarkPosition;
    this.firstAccessedAt = progress.firstAccessedAt;
    this.completedAt = progress.completedAt;
    this.lastActivityAt = progress.lastActivityAt;
    this.interactionData = progress.interactionData;
    this.lesson = progress.lesson;
  }
}

export class EnrollmentProgressResponseDto {
  @ApiProperty({ description: 'Enrollment details' })
  enrollment: EnrollmentResponseDto;

  @ApiProperty({
    type: [LessonProgressResponseDto],
    description: 'Lesson progress details',
  })
  lessonProgress: LessonProgressResponseDto[];

  @ApiProperty({ description: 'Module progress summary' })
  moduleProgress: {
    moduleId: string;
    title: string;
    completedLessons: number;
    totalLessons: number;
    progressPercentage: number;
    timeSpent: number;
  }[];

  @ApiProperty({ description: 'Recent activity' })
  recentActivity: {
    date: Date;
    type: string;
    description: string;
    lessonId?: string;
    lessonTitle?: string;
  }[];

  @ApiProperty({ description: 'Progress statistics' })
  statistics: {
    totalTimeSpent: number;
    averageSessionDuration: number;
    streakDays: number;
    lastActiveDate: Date;
    completionRate: number;
  };

  constructor(data: any) {
    this.enrollment = new EnrollmentResponseDto(data.enrollment);
    this.lessonProgress = data.lessonProgress.map(
      (progress: any) => new LessonProgressResponseDto(progress),
    );
    this.moduleProgress = data.moduleProgress;
    this.recentActivity = data.recentActivity;
    this.statistics = data.statistics;
  }
}

export class EnrollmentListResponseDto {
  @ApiProperty({ type: [EnrollmentResponseDto], description: 'List of enrollments' })
  items: EnrollmentResponseDto[];

  @ApiProperty({ description: 'Total number of items' })
  total: number;

  @ApiProperty({ description: 'Current page' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  constructor(data: any) {
    this.items = data.items.map((item: any) => new EnrollmentResponseDto(item));
    this.total = data.total;
    this.page = data.page;
    this.limit = data.limit;
    this.totalPages = data.totalPages;
  }
}

export class CourseProgressAnalyticsDto {
  @ApiProperty({ description: 'Course ID' })
  courseId: string;

  @ApiProperty({ description: 'Total enrollments' })
  totalEnrollments: number;

  @ApiProperty({ description: 'Active enrollments' })
  activeEnrollments: number;

  @ApiProperty({ description: 'Completed enrollments' })
  completedEnrollments: number;

  @ApiProperty({ description: 'Dropped enrollments' })
  droppedEnrollments: number;

  @ApiProperty({ description: 'Completion rate percentage' })
  completionRate: number;

  @ApiProperty({ description: 'Average progress percentage' })
  averageProgress: number;

  @ApiProperty({ description: 'Average time spent per enrollment (seconds)' })
  averageTimeSpent: number;

  @ApiProperty({ description: 'Average score' })
  averageScore: number;

  @ApiProperty({ description: 'Enrollment trends over time' })
  enrollmentTrends: {
    date: string;
    enrollments: number;
    completions: number;
  }[];

  @ApiProperty({ description: 'Lesson completion rates' })
  lessonCompletionRates: {
    lessonId: string;
    lessonTitle: string;
    completionRate: number;
    averageTimeSpent: number;
  }[];

  @ApiProperty({ description: 'Assessment performance' })
  assessmentPerformance: {
    assessmentId: string;
    assessmentTitle: string;
    averageScore: number;
    passRate: number;
    averageAttempts: number;
  }[];

  @ApiProperty({ description: 'Student engagement metrics' })
  engagementMetrics: {
    averageSessionDuration: number;
    averageSessionsPerWeek: number;
    retentionRate: number;
    dropoffPoints: string[];
  };

  constructor(data: any) {
    this.courseId = data.courseId;
    this.totalEnrollments = data.totalEnrollments;
    this.activeEnrollments = data.activeEnrollments;
    this.completedEnrollments = data.completedEnrollments;
    this.droppedEnrollments = data.droppedEnrollments;
    this.completionRate = data.completionRate;
    this.averageProgress = data.averageProgress;
    this.averageTimeSpent = data.averageTimeSpent;
    this.averageScore = data.averageScore;
    this.enrollmentTrends = data.enrollmentTrends;
    this.lessonCompletionRates = data.lessonCompletionRates;
    this.assessmentPerformance = data.assessmentPerformance;
    this.engagementMetrics = data.engagementMetrics;
  }
}
