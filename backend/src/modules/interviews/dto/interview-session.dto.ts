import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsUUID,
  IsDateString,
  IsNumber,
  IsObject,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  InterviewType,
  InterviewMode,
  InterviewStatus,
} from '../../../database/entities/interview-session.entity';
import { InterviewDifficulty } from '../../../database/entities/interview-question-bank.entity';

export class CreateInterviewSessionDto {
  @ApiProperty({ description: 'Candidate user ID' })
  @IsUUID()
  candidateId: string;

  @ApiPropertyOptional({ description: 'Interviewer user ID' })
  @IsOptional()
  @IsUUID()
  interviewerId?: string;

  @ApiPropertyOptional({ description: 'Job ID this interview is for' })
  @IsOptional()
  @IsUUID()
  jobId?: string;

  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiProperty({ enum: InterviewType, description: 'Interview type' })
  @IsEnum(InterviewType)
  type: InterviewType;

  @ApiProperty({ enum: InterviewMode, description: 'Interview mode' })
  @IsEnum(InterviewMode)
  mode: InterviewMode;

  @ApiProperty({ description: 'Scheduled interview time' })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({ description: 'Interview duration in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(15)
  @Max(480)
  durationMinutes?: number;

  @ApiPropertyOptional({ enum: InterviewDifficulty, description: 'Interview difficulty' })
  @IsOptional()
  @IsEnum(InterviewDifficulty)
  difficulty?: InterviewDifficulty;

  @ApiPropertyOptional({ description: 'Interview tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Whether this is an AI-powered interview' })
  @IsOptional()
  @IsBoolean()
  isAiInterview?: boolean;

  @ApiPropertyOptional({ description: 'AI interview configuration' })
  @IsOptional()
  @IsObject()
  aiConfig?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Preparation time in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(30)
  preparationTime?: number;

  @ApiPropertyOptional({ description: 'Whether candidate can reschedule' })
  @IsOptional()
  @IsBoolean()
  allowReschedule?: boolean;

  @ApiPropertyOptional({ description: 'Reschedule deadline in hours' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(168)
  rescheduleDeadlineHours?: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateInterviewSessionDto extends PartialType(CreateInterviewSessionDto) {
  @ApiPropertyOptional({ enum: InterviewStatus, description: 'Interview status' })
  @IsOptional()
  @IsEnum(InterviewStatus)
  status?: InterviewStatus;

  @ApiPropertyOptional({ description: 'Interview notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Interview feedback' })
  @IsOptional()
  @IsObject()
  feedback?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Interview score (1-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  score?: number;
}

export class SearchInterviewSessionsDto {
  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by candidate ID' })
  @IsOptional()
  @IsUUID()
  candidateId?: string;

  @ApiPropertyOptional({ description: 'Filter by interviewer ID' })
  @IsOptional()
  @IsUUID()
  interviewerId?: string;

  @ApiPropertyOptional({ description: 'Filter by job ID' })
  @IsOptional()
  @IsUUID()
  jobId?: string;

  @ApiPropertyOptional({ enum: InterviewType, description: 'Filter by interview type' })
  @IsOptional()
  @IsEnum(InterviewType)
  type?: InterviewType;

  @ApiPropertyOptional({ enum: InterviewStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(InterviewStatus)
  status?: InterviewStatus;

  @ApiPropertyOptional({ enum: InterviewMode, description: 'Filter by mode' })
  @IsOptional()
  @IsEnum(InterviewMode)
  mode?: InterviewMode;

  @ApiPropertyOptional({ description: 'Start date filter' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date filter' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

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

export class RescheduleInterviewDto {
  @ApiProperty({ description: 'New scheduled time' })
  @IsDateString()
  newScheduledAt: string;

  @ApiPropertyOptional({ description: 'Reason for rescheduling' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class StartInterviewDto {
  @ApiPropertyOptional({ description: 'Location where interview is being started' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Device information' })
  @IsOptional()
  @IsObject()
  deviceInfo?: Record<string, any>;
}

export class CompleteInterviewDto {
  @ApiPropertyOptional({ description: 'Interview score (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  score?: number;

  @ApiPropertyOptional({ description: 'Interview feedback' })
  @IsOptional()
  @IsObject()
  feedback?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Interview notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class InterviewSessionResponseDto {
  @ApiProperty({ description: 'Interview session ID' })
  id: string;

  @ApiProperty({ description: 'Organization ID' })
  organizationId?: string;

  @ApiProperty({ description: 'Candidate user ID' })
  candidateId: string;

  @ApiProperty({ description: 'Interviewer user ID' })
  interviewerId?: string;

  @ApiProperty({ description: 'Job ID' })
  jobId?: string;

  @ApiProperty({ enum: InterviewType, description: 'Interview type' })
  type: InterviewType;

  @ApiProperty({ enum: InterviewMode, description: 'Interview mode' })
  mode: InterviewMode;

  @ApiProperty({ enum: InterviewStatus, description: 'Interview status' })
  status: InterviewStatus;

  @ApiProperty({ description: 'Scheduled interview time' })
  scheduledAt: Date;

  @ApiPropertyOptional({ description: 'Interview start time' })
  startedAt?: Date;

  @ApiPropertyOptional({ description: 'Interview end time' })
  endedAt?: Date;

  @ApiPropertyOptional({ description: 'Interview duration in minutes' })
  durationMinutes?: number;

  @ApiPropertyOptional({ description: 'Meeting URL' })
  meetingUrl?: string;

  @ApiPropertyOptional({ description: 'Meeting ID' })
  meetingId?: string;

  @ApiPropertyOptional({ description: 'Recording URL' })
  recordingUrl?: string;

  @ApiPropertyOptional({ description: 'Interview notes' })
  notes?: string;

  @ApiPropertyOptional({ description: 'Interview feedback' })
  feedback?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Interview score' })
  score?: number;

  @ApiPropertyOptional({ description: 'Interview difficulty' })
  difficulty?: string;

  @ApiProperty({ description: 'Interview tags', type: [String] })
  tags: string[];

  @ApiProperty({ description: 'Whether interview is AI-powered' })
  isAiInterview: boolean;

  @ApiPropertyOptional({ description: 'AI configuration' })
  aiConfig?: Record<string, any>;

  @ApiProperty({ description: 'Preparation time in minutes' })
  preparationTime: number;

  @ApiProperty({ description: 'Whether candidate can reschedule' })
  allowReschedule: boolean;

  @ApiProperty({ description: 'Reschedule deadline hours' })
  rescheduleDeadlineHours: number;

  @ApiProperty({ description: 'Reminder sent status' })
  reminderSent: boolean;

  @ApiProperty({ description: 'Follow-up sent status' })
  followupSent: boolean;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Candidate details' })
  candidate?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profilePictureUrl?: string;
  };

  @ApiPropertyOptional({ description: 'Interviewer details' })
  interviewer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profilePictureUrl?: string;
  };

  @ApiPropertyOptional({ description: 'Job details' })
  job?: {
    id: string;
    title: string;
    department?: string;
    type: string;
  };

  @ApiPropertyOptional({ description: 'Interview responses count' })
  responseCount?: number;

  @ApiPropertyOptional({ description: 'Virtual properties' })
  virtualProperties?: {
    actualDuration: number;
    isUpcoming: boolean;
    isPast: boolean;
    canStart: boolean;
    canReschedule: boolean;
  };

  constructor(session: any) {
    this.id = session.id;
    this.organizationId = session.organizationId;
    this.candidateId = session.candidateId;
    this.interviewerId = session.interviewerId;
    this.jobId = session.jobId;
    this.type = session.type;
    this.mode = session.mode;
    this.status = session.status;
    this.scheduledAt = session.scheduledAt;
    this.startedAt = session.startedAt;
    this.endedAt = session.endedAt;
    this.durationMinutes = session.durationMinutes;
    this.meetingUrl = session.meetingUrl;
    this.meetingId = session.meetingId;
    this.recordingUrl = session.recordingUrl;
    this.notes = session.notes;
    this.feedback = session.feedback;
    this.score = session.score;
    this.difficulty = session.difficulty;
    this.tags = session.tags || [];
    this.isAiInterview = session.isAiInterview;
    this.aiConfig = session.aiConfig;
    this.preparationTime = session.preparationTime;
    this.allowReschedule = session.allowReschedule;
    this.rescheduleDeadlineHours = session.rescheduleDeadlineHours;
    this.reminderSent = session.reminderSent;
    this.followupSent = session.followupSent;
    this.createdAt = session.createdAt;
    this.updatedAt = session.updatedAt;

    // Related entities
    if (session.candidate) {
      this.candidate = {
        id: session.candidate.id,
        firstName: session.candidate.firstName,
        lastName: session.candidate.lastName,
        email: session.candidate.email,
        profilePictureUrl: session.candidate.profilePictureUrl,
      };
    }

    if (session.interviewer) {
      this.interviewer = {
        id: session.interviewer.id,
        firstName: session.interviewer.firstName,
        lastName: session.interviewer.lastName,
        email: session.interviewer.email,
        profilePictureUrl: session.interviewer.profilePictureUrl,
      };
    }

    if (session.job) {
      this.job = {
        id: session.job.id,
        title: session.job.title,
        department: session.job.department,
        type: session.job.type,
      };
    }

    // Calculated properties
    this.responseCount = session.responses?.length || 0;
    
    this.virtualProperties = {
      actualDuration: session.actualDuration || 0,
      isUpcoming: session.isUpcoming || false,
      isPast: session.isPast || false,
      canStart: session.canStart || false,
      canReschedule: session.canReschedule || false,
    };
  }
}

export class InterviewSessionListResponseDto {
  @ApiProperty({ type: [InterviewSessionResponseDto], description: 'List of interview sessions' })
  items: InterviewSessionResponseDto[];

  @ApiProperty({ description: 'Total number of items' })
  total: number;

  @ApiProperty({ description: 'Current page' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  constructor(data: any) {
    this.items = data.items.map((item: any) => new InterviewSessionResponseDto(item));
    this.total = data.total;
    this.page = data.page;
    this.limit = data.limit;
    this.totalPages = data.totalPages;
  }
}

export class InterviewCalendarEventDto {
  @ApiProperty({ description: 'Event ID' })
  id: string;

  @ApiProperty({ description: 'Event title' })
  title: string;

  @ApiProperty({ description: 'Event start time' })
  start: Date;

  @ApiProperty({ description: 'Event end time' })
  end: Date;

  @ApiProperty({ description: 'Event description' })
  description?: string;

  @ApiProperty({ description: 'Event location or meeting URL' })
  location?: string;

  @ApiProperty({ description: 'Event type' })
  type: InterviewType;

  @ApiProperty({ description: 'Event status' })
  status: InterviewStatus;

  @ApiProperty({ description: 'Candidate name' })
  candidateName: string;

  @ApiProperty({ description: 'Interviewer name' })
  interviewerName?: string;

  constructor(session: any) {
    this.id = session.id;
    this.title = `Interview: ${session.candidate?.firstName} ${session.candidate?.lastName}`;
    this.start = session.scheduledAt;
    this.end = new Date(session.scheduledAt.getTime() + (session.durationMinutes || 60) * 60 * 1000);
    this.description = `${session.type} interview${session.job ? ` for ${session.job.title}` : ''}`;
    this.location = session.meetingUrl || session.mode;
    this.type = session.type;
    this.status = session.status;
    this.candidateName = `${session.candidate?.firstName} ${session.candidate?.lastName}`;
    this.interviewerName = session.interviewer ? 
      `${session.interviewer.firstName} ${session.interviewer.lastName}` : undefined;
  }
}

export class InterviewStatsDto {
  @ApiProperty({ description: 'Total interviews scheduled' })
  totalScheduled: number;

  @ApiProperty({ description: 'Completed interviews' })
  completed: number;

  @ApiProperty({ description: 'Cancelled interviews' })
  cancelled: number;

  @ApiProperty({ description: 'No-show interviews' })
  noShows: number;

  @ApiProperty({ description: 'Average interview score' })
  averageScore: number;

  @ApiProperty({ description: 'Average interview duration' })
  averageDuration: number;

  @ApiProperty({ description: 'Interviews by type' })
  byType: Record<InterviewType, number>;

  @ApiProperty({ description: 'Interviews by status' })
  byStatus: Record<InterviewStatus, number>;

  @ApiProperty({ description: 'Monthly interview trends' })
  monthlyTrends: Array<{
    month: string;
    scheduled: number;
    completed: number;
    averageScore: number;
  }>;

  constructor(data: any) {
    this.totalScheduled = data.totalScheduled;
    this.completed = data.completed;
    this.cancelled = data.cancelled;
    this.noShows = data.noShows;
    this.averageScore = data.averageScore;
    this.averageDuration = data.averageDuration;
    this.byType = data.byType;
    this.byStatus = data.byStatus;
    this.monthlyTrends = data.monthlyTrends;
  }
}
