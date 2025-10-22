import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsUUID,
  IsNumber,
  IsObject,
  IsUrl,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  AiInterviewStatus,
  InterviewFormat,
} from '../../../database/entities/ai-mock-interview.entity';
import { InterviewDifficulty } from '../../../database/entities/interview-question-bank.entity';
import { QuestionType } from '../../../database/entities/interview-question.entity';

export class CreateAiMockInterviewDto {
  @ApiPropertyOptional({ description: 'User ID (admin only)' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({ description: 'Job role for interview preparation' })
  @IsString()
  jobRole: string;

  @ApiPropertyOptional({ description: 'Job description or requirements' })
  @IsOptional()
  @IsString()
  jobDescription?: string;

  @ApiPropertyOptional({ description: 'Company name for context' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ enum: InterviewDifficulty, description: 'Interview difficulty level' })
  @IsOptional()
  @IsEnum(InterviewDifficulty)
  difficulty?: InterviewDifficulty;

  @ApiPropertyOptional({ description: 'Interview duration in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(15)
  @Max(120)
  durationMinutes?: number;

  @ApiPropertyOptional({ enum: InterviewFormat, description: 'Interview format' })
  @IsOptional()
  @IsEnum(InterviewFormat)
  format?: InterviewFormat;

  @ApiPropertyOptional({ description: 'Question types to focus on', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  questionTypes?: string[];

  @ApiPropertyOptional({ description: 'Focus areas for the interview', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  focusAreas?: string[];

  @ApiPropertyOptional({ description: 'Enable hints during interview' })
  @IsOptional()
  @IsBoolean()
  enableHints?: boolean;

  @ApiPropertyOptional({ description: 'Enable pause functionality' })
  @IsOptional()
  @IsBoolean()
  enablePause?: boolean;

  @ApiPropertyOptional({ description: 'Record the interview session' })
  @IsOptional()
  @IsBoolean()
  recordSession?: boolean;

  @ApiPropertyOptional({ description: 'Enable real-time analysis' })
  @IsOptional()
  @IsBoolean()
  realTimeAnalysis?: boolean;

  @ApiPropertyOptional({ description: 'Custom instructions for the AI' })
  @IsOptional()
  @IsString()
  customInstructions?: string;

  @ApiPropertyOptional({ description: 'User agent string' })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({ description: 'Device type' })
  @IsOptional()
  @IsString()
  deviceType?: string;

  @ApiPropertyOptional({ description: 'Browser information' })
  @IsOptional()
  @IsString()
  browserInfo?: string;
}

export class UpdateAiMockInterviewDto extends PartialType(CreateAiMockInterviewDto) {
  @ApiPropertyOptional({ enum: AiInterviewStatus, description: 'Interview status' })
  @IsOptional()
  @IsEnum(AiInterviewStatus)
  status?: AiInterviewStatus;
}

export class StartAiInterviewDto {
  @ApiPropertyOptional({ description: 'Network quality assessment' })
  @IsOptional()
  @IsString()
  networkQuality?: string;

  @ApiPropertyOptional({ description: 'Location where interview is starting' })
  @IsOptional()
  @IsString()
  location?: string;
}

export class SubmitAiResponseDto {
  @ApiProperty({ description: 'Question text that was answered' })
  @IsString()
  questionText: string;

  @ApiProperty({ description: 'User response text' })
  @IsString()
  response: string;

  @ApiPropertyOptional({ description: 'Audio recording URL' })
  @IsOptional()
  @IsUrl()
  audioUrl?: string;

  @ApiPropertyOptional({ description: 'Video recording URL' })
  @IsOptional()
  @IsUrl()
  videoUrl?: string;

  @ApiPropertyOptional({ description: 'Response time in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  responseTime?: number;

  @ApiPropertyOptional({ description: 'Skill category being assessed' })
  @IsOptional()
  @IsString()
  skillCategory?: string;

  @ApiPropertyOptional({ description: 'Additional response metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class AiMockInterviewResponseDto {
  @ApiProperty({ description: 'AI Mock Interview ID' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Job role' })
  jobRole: string;

  @ApiPropertyOptional({ description: 'Job description' })
  jobDescription?: string;

  @ApiPropertyOptional({ description: 'Company name' })
  companyName?: string;

  @ApiProperty({ enum: InterviewDifficulty, description: 'Interview difficulty' })
  difficulty: InterviewDifficulty;

  @ApiProperty({ description: 'Duration in minutes' })
  durationMinutes: number;

  @ApiProperty({ enum: InterviewFormat, description: 'Interview format' })
  format: InterviewFormat;

  @ApiProperty({ enum: AiInterviewStatus, description: 'Interview status' })
  status: AiInterviewStatus;

  @ApiPropertyOptional({ description: 'Interview start time' })
  startedAt?: Date;

  @ApiPropertyOptional({ description: 'Interview completion time' })
  completedAt?: Date;

  @ApiProperty({ description: 'Interview configuration' })
  config: {
    questionTypes?: string[];
    focusAreas?: string[];
    enableHints?: boolean;
    enablePause?: boolean;
    recordSession?: boolean;
    realTimeAnalysis?: boolean;
    customInstructions?: string;
  };

  @ApiPropertyOptional({ description: 'Overall interview score' })
  overallScore?: number;

  @ApiProperty({ description: 'Performance metrics' })
  performanceMetrics: {
    averageResponseTime?: number;
    totalSpeakingTime?: number;
    pauseCount?: number;
    fillerWordCount?: number;
    confidenceLevel?: number;
    engagementScore?: number;
  };

  @ApiProperty({ description: 'Improvement areas', type: [String] })
  improvementAreas: string[];

  @ApiProperty({ description: 'Identified strengths', type: [String] })
  strengths: string[];

  @ApiProperty({ description: 'Skills assessed', type: [String] })
  skillsAssessed: string[];

  @ApiProperty({ description: 'Skill scores breakdown' })
  skillScores: Record<string, number>;

  @ApiPropertyOptional({ description: 'AI feedback' })
  aiFeedback?: {
    overallScore?: number;
    strengths?: string[];
    improvementAreas?: string[];
    detailedAnalysis?: {
      communication?: number;
      technicalKnowledge?: number;
      problemSolving?: number;
      leadership?: number;
      teamwork?: number;
    };
    recommendations?: string[];
    nextSteps?: string[];
  };

  @ApiProperty({ description: 'Interview analytics' })
  analytics: {
    questionsAsked?: number;
    questionsAnswered?: number;
    averageQuestionScore?: number;
    timeDistribution?: Record<string, number>;
    emotionalAnalysis?: {
      dominant_emotion?: string;
      confidence_trend?: number[];
      stress_indicators?: string[];
    };
  };

  @ApiProperty({ description: 'Follow-up recommendations' })
  followUpRecommendations: {
    courses?: Array<{
      title: string;
      description: string;
      url?: string;
      priority: 'high' | 'medium' | 'low';
    }>;
    practice_areas?: string[];
    resources?: Array<{
      title: string;
      type: 'article' | 'video' | 'book' | 'course';
      url: string;
    }>;
  };

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'User details' })
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };

  @ApiPropertyOptional({ description: 'Virtual properties' })
  virtualProperties?: {
    duration: number;
    isActive: boolean;
    isCompleted: boolean;
    completionRate: number;
    averageScore: number;
  };

  constructor(interview: any) {
    this.id = interview.id;
    this.userId = interview.userId;
    this.jobRole = interview.jobRole;
    this.jobDescription = interview.jobDescription;
    this.companyName = interview.companyName;
    this.difficulty = interview.difficulty;
    this.durationMinutes = interview.durationMinutes;
    this.format = interview.format;
    this.status = interview.status;
    this.startedAt = interview.startedAt;
    this.completedAt = interview.completedAt;
    this.config = interview.config;
    this.overallScore = interview.overallScore;
    this.performanceMetrics = interview.performanceMetrics;
    this.improvementAreas = interview.improvementAreas;
    this.strengths = interview.strengths;
    this.skillsAssessed = interview.skillsAssessed;
    this.skillScores = interview.skillScores;
    this.aiFeedback = interview.aiFeedback;
    this.analytics = interview.analytics;
    this.followUpRecommendations = interview.followUpRecommendations;
    this.createdAt = interview.createdAt;
    this.updatedAt = interview.updatedAt;

    if (interview.user) {
      this.user = {
        id: interview.user.id,
        firstName: interview.user.firstName,
        lastName: interview.user.lastName,
        email: interview.user.email,
      };
    }

    this.virtualProperties = {
      duration: interview.duration || 0,
      isActive: interview.isActive || false,
      isCompleted: interview.isCompleted || false,
      completionRate: interview.completionRate || 0,
      averageScore: interview.averageScore || 0,
    };
  }
}

export class AiMockInterviewListResponseDto {
  @ApiProperty({ type: [AiMockInterviewResponseDto], description: 'List of AI mock interviews' })
  items: AiMockInterviewResponseDto[];

  @ApiProperty({ description: 'Total number of items' })
  total: number;

  @ApiProperty({ description: 'Current page' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  constructor(data: any) {
    this.items = data.items.map((item: any) => new AiMockInterviewResponseDto(item));
    this.total = data.total;
    this.page = data.page;
    this.limit = data.limit;
    this.totalPages = data.totalPages;
  }
}

export class AiInterviewQuestionDto {
  @ApiProperty({ description: 'Question text' })
  text: string;

  @ApiProperty({ enum: QuestionType, description: 'Question type' })
  type: QuestionType;

  @ApiPropertyOptional({ description: 'Expected answer guidelines' })
  expectedAnswer?: string;

  @ApiPropertyOptional({ description: 'Follow-up questions', type: [String] })
  followUpQuestions?: string[];

  @ApiPropertyOptional({ description: 'Question hints', type: [String] })
  hints?: string[];

  @ApiProperty({ description: 'Time limit in seconds' })
  timeLimit?: number;

  constructor(data: any) {
    this.text = data.text;
    this.type = data.type;
    this.expectedAnswer = data.expectedAnswer;
    this.followUpQuestions = data.followUpQuestions;
    this.hints = data.hints;
    this.timeLimit = data.timeLimit;
  }
}

export class AiInterviewFeedbackDto {
  @ApiProperty({ description: 'Response feedback text' })
  feedback: string;

  @ApiProperty({ description: 'Response score (0-100)' })
  score: number;

  @ApiPropertyOptional({ description: 'Next question' })
  nextQuestion?: string;

  @ApiPropertyOptional({ description: 'Improvement suggestions', type: [String] })
  suggestions?: string[];

  @ApiPropertyOptional({ description: 'Strengths identified', type: [String] })
  strengths?: string[];

  constructor(data: any) {
    this.feedback = data.feedback;
    this.score = data.score;
    this.nextQuestion = data.nextQuestion;
    this.suggestions = data.suggestions;
    this.strengths = data.strengths;
  }
}

export class AiInterviewAnalyticsDto {
  @ApiProperty({ description: 'Total AI interviews conducted' })
  totalInterviews: number;

  @ApiProperty({ description: 'Average interview score' })
  averageScore: number;

  @ApiProperty({ description: 'Average interview duration in minutes' })
  averageDuration: number;

  @ApiProperty({ description: 'Average skill scores by category' })
  averageSkillScores: Record<string, number>;

  @ApiProperty({ description: 'Improvement trend (score change)' })
  improvementTrend: number;

  @ApiProperty({ description: 'Completion rate percentage' })
  completionRate: number;

  @ApiProperty({ description: 'Most common improvement areas', type: [String] })
  commonImprovementAreas: string[];

  @ApiProperty({ description: 'Most common strengths', type: [String] })
  commonStrengths: string[];

  @ApiProperty({ description: 'Interview performance by job role' })
  performanceByRole: Array<{
    jobRole: string;
    averageScore: number;
    interviewCount: number;
  }>;

  @ApiProperty({ description: 'Performance trends over time' })
  performanceTrends: Array<{
    date: string;
    averageScore: number;
    interviewCount: number;
  }>;

  @ApiProperty({ description: 'Skill development progress' })
  skillDevelopment: Array<{
    skill: string;
    initialScore: number;
    currentScore: number;
    improvement: number;
  }>;

  constructor(data: any) {
    this.totalInterviews = data.totalInterviews;
    this.averageScore = data.averageScore;
    this.averageDuration = data.averageDuration;
    this.averageSkillScores = data.averageSkillScores;
    this.improvementTrend = data.improvementTrend;
    this.completionRate = data.completionRate;
    this.commonImprovementAreas = data.commonImprovementAreas || [];
    this.commonStrengths = data.commonStrengths || [];
    this.performanceByRole = data.performanceByRole || [];
    this.performanceTrends = data.performanceTrends || [];
    this.skillDevelopment = data.skillDevelopment || [];
  }
}

export class AiInterviewReportDto {
  @ApiProperty({ description: 'Interview ID' })
  interviewId: string;

  @ApiProperty({ description: 'Job role' })
  jobRole: string;

  @ApiProperty({ description: 'Interview difficulty' })
  difficulty: InterviewDifficulty;

  @ApiProperty({ description: 'Interview duration in minutes' })
  duration: number;

  @ApiProperty({ description: 'Overall score' })
  overallScore: number;

  @ApiProperty({ description: 'Completion rate percentage' })
  completionRate: number;

  @ApiProperty({ description: 'Identified strengths', type: [String] })
  strengths: string[];

  @ApiProperty({ description: 'Improvement areas', type: [String] })
  improvementAreas: string[];

  @ApiProperty({ description: 'Skill scores breakdown' })
  skillScores: Record<string, number>;

  @ApiProperty({ description: 'Performance metrics' })
  performanceMetrics: Record<string, any>;

  @ApiProperty({ description: 'AI feedback' })
  feedback: Record<string, any>;

  @ApiProperty({ description: 'Recommendations' })
  recommendations: Record<string, any>;

  @ApiProperty({ description: 'Interview date' })
  createdAt: Date;

  @ApiPropertyOptional({ description: 'Completion date' })
  completedAt?: Date;

  constructor(data: any) {
    this.interviewId = data.interviewId;
    this.jobRole = data.jobRole;
    this.difficulty = data.difficulty;
    this.duration = data.duration;
    this.overallScore = data.overallScore;
    this.completionRate = data.completionRate;
    this.strengths = data.strengths;
    this.improvementAreas = data.improvementAreas;
    this.skillScores = data.skillScores;
    this.performanceMetrics = data.performanceMetrics;
    this.feedback = data.feedback;
    this.recommendations = data.recommendations;
    this.createdAt = data.createdAt;
    this.completedAt = data.completedAt;
  }
}
