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
  ArrayMinSize,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  AssessmentType,
  AssessmentStatus,
  QuestionType,
} from '../../../database/entities/assessment.entity';
import { AssessmentAttemptStatus } from '@/database/entities/assessment-attempt.entity';

export class QuestionOptionDto {
  @ApiProperty({ description: 'Option text' })
  @IsString()
  text: string;

  @ApiProperty({ description: 'Whether this option is correct' })
  @IsBoolean()
  isCorrect: boolean;

  @ApiPropertyOptional({ description: 'Explanation for this option' })
  @IsOptional()
  @IsString()
  explanation?: string;
}

export class QuestionDto {
  @ApiProperty({ description: 'Question text' })
  @IsString()
  text: string;

  @ApiProperty({ enum: QuestionType, description: 'Type of question' })
  @IsEnum(QuestionType)
  type: QuestionType;

  @ApiProperty({ description: 'Points awarded for correct answer', minimum: 0 })
  @IsNumber()
  @Min(0)
  points: number;

  @ApiPropertyOptional({ description: 'Question explanation or hint' })
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiPropertyOptional({
    type: [QuestionOptionDto],
    description: 'Answer options (for multiple choice questions)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options?: QuestionOptionDto[];

  @ApiPropertyOptional({ description: 'Correct answer (for short answer questions)' })
  @IsOptional()
  @IsString()
  correctAnswer?: string;

  @ApiPropertyOptional({ description: 'Additional question metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class CreateAssessmentDto {
  @ApiProperty({ description: 'Assessment title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Assessment description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: AssessmentType, description: 'Type of assessment' })
  @IsEnum(AssessmentType)
  type: AssessmentType;

  @ApiPropertyOptional({ description: 'Course ID this assessment belongs to' })
  @IsUUID()
  courseId: string;

  @ApiPropertyOptional({ description: 'Module ID this assessment belongs to' })
  @IsUUID()
  moduleId: string;

  @ApiPropertyOptional({ description: 'Lesson ID this assessment belongs to' })
  @IsUUID()
  lessonId: string;

  @ApiPropertyOptional({
    type: [QuestionDto],
    description: 'Assessment questions',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionDto)
  questions?: QuestionDto[];

  @ApiPropertyOptional({
    description: 'Time limit in minutes',
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  timeLimit?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of attempts allowed',
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxAttempts?: number;

  @ApiPropertyOptional({
    description: 'Passing score percentage',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  passingScore?: number;

  @ApiPropertyOptional({ description: 'Whether to shuffle questions' })
  @IsOptional()
  @IsBoolean()
  shuffleQuestions?: boolean;

  @ApiPropertyOptional({ description: 'Whether to shuffle answer options' })
  @IsOptional()
  @IsBoolean()
  shuffleOptions?: boolean;

  @ApiPropertyOptional({ description: 'Whether to show results immediately' })
  @IsOptional()
  @IsBoolean()
  showResults?: boolean;

  @ApiPropertyOptional({ description: 'Whether to allow review after completion' })
  @IsOptional()
  @IsBoolean()
  allowReview?: boolean;

  @ApiPropertyOptional({ description: 'Assessment instructions' })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional({ description: 'Additional assessment metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateAssessmentDto extends PartialType(CreateAssessmentDto) {}

export class SearchAssessmentsDto {
  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by course ID' })
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({ description: 'Filter by module ID' })
  @IsOptional()
  @IsUUID()
  moduleId?: string;

  @ApiPropertyOptional({ description: 'Filter by lesson ID' })
  @IsOptional()
  @IsUUID()
  lessonId?: string;

  @ApiPropertyOptional({ enum: AssessmentType, description: 'Filter by assessment type' })
  @IsOptional()
  @IsEnum(AssessmentType)
  type?: AssessmentType;

  @ApiPropertyOptional({ enum: AssessmentStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(AssessmentStatus)
  status?: AssessmentStatus;

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

export class AddQuestionDto extends QuestionDto {}

export class UpdateQuestionDto extends PartialType(QuestionDto) {}

export class StartAssessmentAttemptDto {
  @ApiPropertyOptional({ description: 'Enrollment ID for tracking progress' })
  @IsOptional()
  @IsUUID()
  enrollmentId?: string;

  @ApiPropertyOptional({ description: 'Additional attempt metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class AnswerDto {
  @ApiProperty({ description: 'Question index' })
  @IsNumber()
  @Min(0)
  questionIndex: number;

  @ApiProperty({ description: 'User answer (text or selected option index)' })
  answer: string | number | string[];

  @ApiPropertyOptional({ description: 'Time spent on this question in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  timeSpent?: number;
}

export class SubmitAssessmentAttemptDto {
  @ApiProperty({
    type: [AnswerDto],
    description: 'User answers',
  })
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];

  @ApiPropertyOptional({ description: 'Total time spent in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalTimeSpent?: number;

  @ApiPropertyOptional({ description: 'Additional submission metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class AssessmentResponseDto {
  @ApiProperty({ description: 'Assessment ID' })
  id: string;

  @ApiProperty({ description: 'Assessment title' })
  title: string;

  @ApiPropertyOptional({ description: 'Assessment description' })
  description?: string;

  @ApiProperty({ enum: AssessmentType, description: 'Assessment type' })
  type: AssessmentType;

  @ApiProperty({ enum: AssessmentStatus, description: 'Assessment status' })
  status: AssessmentStatus;

  @ApiPropertyOptional({ description: 'Course ID' })
  courseId?: string;

  @ApiPropertyOptional({ description: 'Module ID' })
  moduleId?: string;

  @ApiPropertyOptional({ description: 'Lesson ID' })
  lessonId?: string;

  @ApiProperty({ description: 'Number of questions' })
  questionCount: number;

  @ApiProperty({ description: 'Total points available' })
  totalPoints: number;

  @ApiPropertyOptional({ description: 'Time limit in minutes' })
  timeLimit?: number;

  @ApiPropertyOptional({ description: 'Maximum attempts allowed' })
  maxAttempts?: number;

  @ApiPropertyOptional({ description: 'Passing score percentage' })
  passingScore?: number;

  @ApiProperty({ description: 'Whether questions are shuffled' })
  shuffleQuestions: boolean;

  @ApiProperty({ description: 'Whether options are shuffled' })
  shuffleOptions: boolean;

  @ApiProperty({ description: 'Whether results are shown immediately' })
  showResults: boolean;

  @ApiProperty({ description: 'Whether review is allowed' })
  allowReview: boolean;

  @ApiPropertyOptional({ description: 'Assessment instructions' })
  instructions?: string;

  @ApiProperty({ description: 'Assessment slug' })
  slug: string;

  @ApiProperty({ description: 'Creator ID' })
  createdBy: string;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Assessment questions (for authorized users)' })
  questions?: QuestionDto[];

  @ApiPropertyOptional({ description: 'Assessment statistics' })
  statistics?: {
    totalAttempts: number;
    averageScore: number;
    passRate: number;
  };

  constructor(assessment: any) {
    this.id = assessment.id;
    this.title = assessment.title;
    this.description = assessment.description;
    this.type = assessment.type;
    this.status = assessment.status;
    this.courseId = assessment.courseId;
    this.moduleId = assessment.moduleId;
    this.lessonId = assessment.lessonId;
    this.questionCount = assessment.questionCount;
    this.totalPoints = assessment.totalPoints;
    this.timeLimit = assessment.timeLimit;
    this.maxAttempts = assessment.maxAttempts;
    this.passingScore = assessment.passingScore;
    this.shuffleQuestions = assessment.shuffleQuestions;
    this.shuffleOptions = assessment.shuffleOptions;
    this.showResults = assessment.showResults;
    this.allowReview = assessment.allowReview;
    this.instructions = assessment.instructions;
    this.slug = assessment.slug;
    this.createdBy = assessment.createdBy;
    this.createdAt = assessment.createdAt;
    this.updatedAt = assessment.updatedAt;
    this.questions = assessment.questions;
    this.statistics = assessment.statistics;
  }
}

export class AssessmentAttemptResponseDto {
  @ApiProperty({ description: 'Attempt ID' })
  id: string;

  @ApiProperty({ description: 'Assessment ID' })
  assessmentId: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiPropertyOptional({ description: 'Enrollment ID' })
  enrollmentId?: string;

  @ApiProperty({ enum: AssessmentAttemptStatus, description: 'Attempt status' })
  status: AssessmentAttemptStatus;

  @ApiProperty({ description: 'Start time' })
  startedAt: Date;

  @ApiPropertyOptional({ description: 'Submission time' })
  submittedAt?: Date;

  @ApiPropertyOptional({ description: 'Time spent in seconds' })
  timeSpent?: number;

  @ApiPropertyOptional({ description: 'Score achieved' })
  score?: number;

  @ApiPropertyOptional({ description: 'Score percentage' })
  scorePercentage?: number;

  @ApiProperty({ description: 'Whether the attempt passed' })
  passed: boolean;

  @ApiPropertyOptional({ description: 'User answers' })
  answers?: any[];

  @ApiPropertyOptional({ description: 'Grading feedback' })
  feedback?: string;

  @ApiProperty({ description: 'Whether flagged for review' })
  flaggedForReview: boolean;

  @ApiPropertyOptional({ description: 'Flag reason' })
  flagReason?: string;

  @ApiPropertyOptional({ description: 'Assessment details' })
  assessment?: AssessmentResponseDto;

  constructor(attempt: any) {
    this.id = attempt.id;
    this.assessmentId = attempt.assessmentId;
    this.userId = attempt.userId;
    this.enrollmentId = attempt.enrollmentId;
    this.status = attempt.status;
    this.startedAt = attempt.startedAt;
    this.submittedAt = attempt.submittedAt;
    this.timeSpent = attempt.timeSpent;
    this.score = attempt.score;
    this.scorePercentage = attempt.scorePercentage;
    this.passed = attempt.passed;
    this.answers = attempt.answers;
    this.feedback = attempt.feedback;
    this.flaggedForReview = attempt.flaggedForReview;
    this.flagReason = attempt.flagReason;
    this.assessment = attempt.assessment ? new AssessmentResponseDto(attempt.assessment) : undefined;
  }
}

export class AssessmentListResponseDto {
  @ApiProperty({ type: [AssessmentResponseDto], description: 'List of assessments' })
  items: AssessmentResponseDto[];

  @ApiProperty({ description: 'Total number of items' })
  total: number;

  @ApiProperty({ description: 'Current page' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  constructor(data: any) {
    this.items = data.items.map((item: any) => new AssessmentResponseDto(item));
    this.total = data.total;
    this.page = data.page;
    this.limit = data.limit;
    this.totalPages = data.totalPages;
  }
}
