import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsUUID,
  IsNumber,
  IsObject,
  ValidateNested,
  Min,
  Max,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { InterviewDifficulty } from '../../../database/entities/interview-question-bank.entity';
import { QuestionType } from '../../../database/entities/interview-question.entity';

export class CreateQuestionBankDto {
  @ApiProperty({ description: 'Question bank name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Question bank description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Question category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ enum: InterviewDifficulty, description: 'Default difficulty level' })
  @IsOptional()
  @IsEnum(InterviewDifficulty)
  difficulty?: InterviewDifficulty;

  @ApiPropertyOptional({ description: 'Question bank tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Whether bank is publicly available' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Icon URL' })
  @IsOptional()
  @IsUrl()
  iconUrl?: string;

  @ApiPropertyOptional({ description: 'Color theme' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Allow random question selection' })
  @IsOptional()
  @IsBoolean()
  allowRandomSelection?: boolean;

  @ApiPropertyOptional({ description: 'Default time limit in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(180)
  defaultTimeLimit?: number;

  @ApiPropertyOptional({ description: 'Require all questions to be answered' })
  @IsOptional()
  @IsBoolean()
  requireAllQuestions?: boolean;

  @ApiPropertyOptional({ description: 'Shuffle questions order' })
  @IsOptional()
  @IsBoolean()
  shuffleQuestions?: boolean;
}

export class UpdateQuestionBankDto extends PartialType(CreateQuestionBankDto) {
  @ApiPropertyOptional({ description: 'Whether bank is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SearchQuestionBanksDto {
  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ enum: InterviewDifficulty, description: 'Filter by difficulty' })
  @IsOptional()
  @IsEnum(InterviewDifficulty)
  difficulty?: InterviewDifficulty;

  @ApiPropertyOptional({ description: 'Filter by tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Filter by public status' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Filter by creator' })
  @IsOptional()
  @IsUUID()
  createdBy?: string;

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

export class CreateQuestionDto {
  @ApiProperty({ description: 'Question text' })
  @IsString()
  questionText: string;

  @ApiPropertyOptional({ description: 'Expected answer or guidelines' })
  @IsOptional()
  @IsString()
  expectedAnswer?: string;

  @ApiPropertyOptional({ description: 'Follow-up questions', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  followUpQuestions?: string[];

  @ApiPropertyOptional({ description: 'Evaluation criteria' })
  @IsOptional()
  @IsObject()
  evaluationCriteria?: Record<string, number>;

  @ApiPropertyOptional({ description: 'Time limit in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(180)
  timeLimitMinutes?: number;

  @ApiPropertyOptional({ enum: InterviewDifficulty, description: 'Question difficulty' })
  @IsOptional()
  @IsEnum(InterviewDifficulty)
  difficulty?: InterviewDifficulty;

  @ApiPropertyOptional({ enum: QuestionType, description: 'Question type' })
  @IsOptional()
  @IsEnum(QuestionType)
  type?: QuestionType;

  @ApiPropertyOptional({ description: 'Question tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Question hints', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hints?: string[];

  @ApiPropertyOptional({ description: 'Sample answers' })
  @IsOptional()
  @IsArray()
  sampleAnswers?: Array<{
    answer: string;
    rating: number;
    explanation?: string;
  }>;

  @ApiPropertyOptional({ description: 'Question resources' })
  @IsOptional()
  @IsArray()
  resources?: Array<{
    title: string;
    url: string;
    type: 'article' | 'video' | 'documentation' | 'book';
  }>;

  @ApiPropertyOptional({ description: 'Question configuration' })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Question order index' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  orderIndex?: number;
}

export class UpdateQuestionDto extends PartialType(CreateQuestionDto) {
  @ApiPropertyOptional({ description: 'Whether question is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class BulkImportQuestionsDto {
  @ApiProperty({ description: 'Questions to import', type: [CreateQuestionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions: CreateQuestionDto[];

  @ApiPropertyOptional({ description: 'Whether to skip validation errors' })
  @IsOptional()
  @IsBoolean()
  skipErrors?: boolean;
}

export class QuestionBankResponseDto {
  @ApiProperty({ description: 'Question bank ID' })
  id: string;

  @ApiProperty({ description: 'Organization ID' })
  organizationId?: string;

  @ApiProperty({ description: 'Question bank name' })
  name: string;

  @ApiPropertyOptional({ description: 'Question bank description' })
  description?: string;

  @ApiPropertyOptional({ description: 'Question category' })
  category?: string;

  @ApiPropertyOptional({ enum: InterviewDifficulty, description: 'Default difficulty' })
  difficulty?: InterviewDifficulty;

  @ApiProperty({ description: 'Question bank tags', type: [String] })
  tags: string[];

  @ApiProperty({ description: 'Whether bank is publicly available' })
  isPublic: boolean;

  @ApiProperty({ description: 'Whether bank is active' })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Icon URL' })
  iconUrl?: string;

  @ApiPropertyOptional({ description: 'Color theme' })
  color?: string;

  @ApiProperty({ description: 'Bank statistics' })
  statistics: {
    totalQuestions: number;
    totalUsage: number;
    averageRating: number;
    lastUsed?: Date;
  };

  @ApiProperty({ description: 'Bank configuration' })
  config: {
    allowRandomSelection: boolean;
    defaultTimeLimit?: number;
    requireAllQuestions: boolean;
    shuffleQuestions: boolean;
  };

  @ApiProperty({ description: 'Creator user ID' })
  createdBy: string;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Creator details' })
  creator?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };

  @ApiPropertyOptional({ description: 'Organization details' })
  organization?: {
    id: string;
    name: string;
    slug: string;
  };

  @ApiPropertyOptional({ description: 'Virtual properties' })
  virtualProperties?: {
    questionCount: number;
    averageDifficulty: string;
    isOwner: boolean;
    canEdit: boolean;
  };

  constructor(bank: any) {
    this.id = bank.id;
    this.organizationId = bank.organizationId;
    this.name = bank.name;
    this.description = bank.description;
    this.category = bank.category;
    this.difficulty = bank.difficulty;
    this.tags = bank.tags || [];
    this.isPublic = bank.isPublic;
    this.isActive = bank.isActive;
    this.iconUrl = bank.iconUrl;
    this.color = bank.color;
    this.statistics = bank.statistics;
    this.config = bank.config;
    this.createdBy = bank.createdBy;
    this.createdAt = bank.createdAt;
    this.updatedAt = bank.updatedAt;

    if (bank.creator) {
      this.creator = {
        id: bank.creator.id,
        firstName: bank.creator.firstName,
        lastName: bank.creator.lastName,
        email: bank.creator.email,
      };
    }

    if (bank.organization) {
      this.organization = {
        id: bank.organization.id,
        name: bank.organization.name,
        slug: bank.organization.slug,
      };
    }

    this.virtualProperties = {
      questionCount: bank.questionCount || 0,
      averageDifficulty: bank.averageDifficulty || 'medium',
      isOwner: bank.isOwner || false,
      canEdit: bank.canEdit || false,
    };
  }
}

export class QuestionBankListResponseDto {
  @ApiProperty({ type: [QuestionBankResponseDto], description: 'List of question banks' })
  items: QuestionBankResponseDto[];

  @ApiProperty({ description: 'Total number of items' })
  total: number;

  @ApiProperty({ description: 'Current page' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  constructor(data: any) {
    this.items = data.items.map((item: any) => new QuestionBankResponseDto(item));
    this.total = data.total;
    this.page = data.page;
    this.limit = data.limit;
    this.totalPages = data.totalPages;
  }
}

export class QuestionResponseDto {
  @ApiProperty({ description: 'Question ID' })
  id: string;

  @ApiProperty({ description: 'Question bank ID' })
  questionBankId: string;

  @ApiProperty({ description: 'Question text' })
  questionText: string;

  @ApiPropertyOptional({ description: 'Expected answer' })
  expectedAnswer?: string;

  @ApiProperty({ description: 'Follow-up questions', type: [String] })
  followUpQuestions: string[];

  @ApiProperty({ description: 'Evaluation criteria' })
  evaluationCriteria: Record<string, number>;

  @ApiPropertyOptional({ description: 'Time limit in minutes' })
  timeLimitMinutes?: number;

  @ApiProperty({ enum: InterviewDifficulty, description: 'Question difficulty' })
  difficulty: InterviewDifficulty;

  @ApiProperty({ enum: QuestionType, description: 'Question type' })
  type: QuestionType;

  @ApiProperty({ description: 'Question tags', type: [String] })
  tags: string[];

  @ApiProperty({ description: 'Question hints', type: [String] })
  hints: string[];

  @ApiProperty({ description: 'Sample answers' })
  sampleAnswers: Array<{
    answer: string;
    rating: number;
    explanation?: string;
  }>;

  @ApiProperty({ description: 'Question resources' })
  resources: Array<{
    title: string;
    url: string;
    type: 'article' | 'video' | 'documentation' | 'book';
  }>;

  @ApiProperty({ description: 'Question statistics' })
  statistics: {
    timesUsed: number;
    averageScore: number;
    averageTime: number;
    successRate: number;
    lastUsed?: Date;
  };

  @ApiProperty({ description: 'Question configuration' })
  config: Record<string, any>;

  @ApiProperty({ description: 'Whether question is active' })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Question order index' })
  orderIndex?: number;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Virtual properties' })
  virtualProperties?: {
    difficultyScore: number;
    averageResponseTime: number;
    usageCount: number;
    successRate: number;
    isPopular: boolean;
    needsImprovement: boolean;
  };

  constructor(question: any) {
    this.id = question.id;
    this.questionBankId = question.questionBankId;
    this.questionText = question.questionText;
    this.expectedAnswer = question.expectedAnswer;
    this.followUpQuestions = question.followUpQuestions || [];
    this.evaluationCriteria = question.evaluationCriteria || {};
    this.timeLimitMinutes = question.timeLimitMinutes;
    this.difficulty = question.difficulty;
    this.type = question.type;
    this.tags = question.tags || [];
    this.hints = question.hints || [];
    this.sampleAnswers = question.sampleAnswers || [];
    this.resources = question.resources || [];
    this.statistics = question.statistics || {};
    this.config = question.config || {};
    this.isActive = question.isActive;
    this.orderIndex = question.orderIndex;
    this.createdAt = question.createdAt;
    this.updatedAt = question.updatedAt;

    this.virtualProperties = {
      difficultyScore: question.difficultyScore || 0,
      averageResponseTime: question.averageResponseTime || 0,
      usageCount: question.usageCount || 0,
      successRate: question.successRate || 0,
      isPopular: question.isPopular || false,
      needsImprovement: question.needsImprovement || false,
    };
  }
}

export class QuestionListResponseDto {
  @ApiProperty({ type: [QuestionResponseDto], description: 'List of questions' })
  items: QuestionResponseDto[];

  @ApiProperty({ description: 'Total number of items' })
  total: number;

  @ApiProperty({ description: 'Current page' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  @ApiPropertyOptional({ description: 'Question bank details' })
  questionBank?: QuestionBankResponseDto;

  constructor(data: any) {
    this.items = data.items.map((item: any) => new QuestionResponseDto(item));
    this.total = data.total;
    this.page = data.page;
    this.limit = data.limit;
    this.totalPages = data.totalPages;
    
    if (data.questionBank) {
      this.questionBank = new QuestionBankResponseDto(data.questionBank);
    }
  }
}

export class QuestionBankStatsDto {
  @ApiProperty({ description: 'Total questions in bank' })
  totalQuestions: number;

  @ApiProperty({ description: 'Total usage count' })
  totalUsage: number;

  @ApiProperty({ description: 'Average rating' })
  averageRating: number;

  @ApiPropertyOptional({ description: 'Last used date' })
  lastUsed?: Date;

  @ApiProperty({ description: 'Questions by difficulty level' })
  questionsByDifficulty: Record<string, number>;

  @ApiProperty({ description: 'Questions by type' })
  questionsByType: Record<string, number>;

  @ApiProperty({ description: 'Average question score' })
  averageScore: number;

  @ApiProperty({ description: 'Popular questions' })
  popularQuestions: Array<{
    id: string;
    questionText: string;
    usageCount: number;
    averageScore: number;
  }>;

  @ApiProperty({ description: 'Recent activity' })
  recentActivity: Array<{
    id: string;
    questionText: string;
    action: string;
    timestamp: Date;
  }>;

  constructor(data: any) {
    this.totalQuestions = data.totalQuestions;
    this.totalUsage = data.totalUsage;
    this.averageRating = data.averageRating;
    this.lastUsed = data.lastUsed;
    this.questionsByDifficulty = data.questionsByDifficulty;
    this.questionsByType = data.questionsByType;
    this.averageScore = data.averageScore;
    this.popularQuestions = data.popularQuestions || [];
    this.recentActivity = data.recentActivity || [];
  }
}

export class QuestionSelectionDto {
  @ApiProperty({ description: 'Question bank ID' })
  @IsUUID()
  questionBankId: string;

  @ApiPropertyOptional({ description: 'Number of questions to select' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  count?: number;

  @ApiPropertyOptional({ enum: InterviewDifficulty, description: 'Filter by difficulty' })
  @IsOptional()
  @IsEnum(InterviewDifficulty)
  difficulty?: InterviewDifficulty;

  @ApiPropertyOptional({ description: 'Filter by question types', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  types?: QuestionType[];

  @ApiPropertyOptional({ description: 'Filter by tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Whether to randomize selection' })
  @IsOptional()
  @IsBoolean()
  randomize?: boolean;
}

export class QuestionSelectionResponseDto {
  @ApiProperty({ type: [QuestionResponseDto], description: 'Selected questions' })
  questions: QuestionResponseDto[];

  @ApiProperty({ description: 'Selection criteria used' })
  criteria: {
    questionBankId: string;
    count: number;
    difficulty?: InterviewDifficulty;
    types?: QuestionType[];
    tags?: string[];
    randomized: boolean;
  };

  @ApiProperty({ description: 'Total available questions' })
  totalAvailable: number;

  @ApiProperty({ description: 'Selection timestamp' })
  selectedAt: Date;

  constructor(data: any) {
    this.questions = data.questions.map((q: any) => new QuestionResponseDto(q));
    this.criteria = data.criteria;
    this.totalAvailable = data.totalAvailable;
    this.selectedAt = data.selectedAt || new Date();
  }
}
