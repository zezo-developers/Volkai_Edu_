import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  IsDate,
  IsUUID,
  IsEmail,
  IsObject,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { 
  ApplicationStatus, 
  ApplicationStage, 
  ApplicationSource 
} from '../../../database/entities/job-application.entity';

export class CreateApplicationDto {
  @ApiProperty({ description: 'Job ID' })
  @IsUUID()
  jobId: string;

  @ApiPropertyOptional({ description: 'External candidate email (for non-registered users)' })
  @IsOptional()
  @IsEmail()
  externalEmail?: string;

  @ApiPropertyOptional({ description: 'External candidate name (for non-registered users)' })
  @IsOptional()
  @IsString()
  externalName?: string;

  @ApiPropertyOptional({ description: 'Resume ID' })
  @IsOptional()
  @IsUUID()
  resumeId?: string;

  @ApiPropertyOptional({ description: 'Cover letter' })
  @IsOptional()
  @IsString()
  coverLetter?: string;

  @ApiPropertyOptional({ enum: ApplicationSource, description: 'Application source' })
  @IsOptional()
  @IsEnum(ApplicationSource)
  source?: ApplicationSource;

  @ApiPropertyOptional({ description: 'Application form data' })
  @IsOptional()
  @IsObject()
  formData?: {
    customFields?: Record<string, any>;
    questionnaire?: Array<{
      question: string;
      answer: string;
      type: 'text' | 'boolean' | 'choice' | 'file';
    }>;
    attachments?: Array<{
      name: string;
      url: string;
      type: string;
      size: number;
    }>;
  };
}

export class UpdateApplicationDto {
  @ApiPropertyOptional({ enum: ApplicationStatus, description: 'Application status' })
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @ApiPropertyOptional({ enum: ApplicationStage, description: 'Application stage' })
  @IsOptional()
  @IsEnum(ApplicationStage)
  stage?: ApplicationStage;

  @ApiPropertyOptional({ description: 'Application rating (1-5)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ description: 'Assigned recruiter/HR user ID' })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'Internal notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Screening data' })
  @IsOptional()
  @IsObject()
  screeningData?: {
    autoScreeningScore?: number;
    skillsMatch?: {
      required: string[];
      matched: string[];
      missing: string[];
      score: number;
    };
    experienceMatch?: {
      required: string;
      candidate: string;
      score: number;
    };
    salaryExpectation?: {
      min?: number;
      max?: number;
      currency: string;
      negotiable: boolean;
    };
    availability?: {
      startDate?: Date;
      noticePeriod?: string;
      relocate?: boolean;
    };
  };
}

export class SearchApplicationsDto {
  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by job ID' })
  @IsOptional()
  @IsUUID()
  jobId?: string;

  @ApiPropertyOptional({ description: 'Filter by candidate ID' })
  @IsOptional()
  @IsUUID()
  candidateId?: string;

  @ApiPropertyOptional({ enum: ApplicationStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @ApiPropertyOptional({ enum: ApplicationStage, description: 'Filter by stage' })
  @IsOptional()
  @IsEnum(ApplicationStage)
  stage?: ApplicationStage;

  @ApiPropertyOptional({ description: 'Filter by assigned recruiter' })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({ enum: ApplicationSource, description: 'Filter by source' })
  @IsOptional()
  @IsEnum(ApplicationSource)
  source?: ApplicationSource;

  @ApiPropertyOptional({ description: 'Minimum rating filter' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({ description: 'Filter applications applied after this date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  appliedAfter?: Date;

  @ApiPropertyOptional({ description: 'Filter applications applied before this date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  appliedBefore?: Date;

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

export class BulkUpdateApplicationsDto {
  @ApiProperty({ description: 'Application IDs to update', type: [String] })
  @IsArray()
  @IsUUID(undefined, { each: true })
  applicationIds: string[];

  @ApiPropertyOptional({ enum: ApplicationStatus, description: 'New status' })
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @ApiPropertyOptional({ enum: ApplicationStage, description: 'New stage' })
  @IsOptional()
  @IsEnum(ApplicationStage)
  stage?: ApplicationStage;

  @ApiPropertyOptional({ description: 'Assign to user ID' })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'Bulk update notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ApplicationResponseDto {
  @ApiProperty({ description: 'Application ID' })
  id: string;

  @ApiProperty({ description: 'Job ID' })
  jobId: string;

  @ApiPropertyOptional({ description: 'Candidate user ID' })
  candidateId?: string;

  @ApiPropertyOptional({ description: 'External candidate email' })
  externalEmail?: string;

  @ApiPropertyOptional({ description: 'External candidate name' })
  externalName?: string;

  @ApiPropertyOptional({ description: 'Resume ID' })
  resumeId?: string;

  @ApiPropertyOptional({ description: 'Cover letter' })
  coverLetter?: string;

  @ApiProperty({ enum: ApplicationStatus, description: 'Application status' })
  status: ApplicationStatus;

  @ApiProperty({ enum: ApplicationStage, description: 'Application stage' })
  stage: ApplicationStage;

  @ApiProperty({ enum: ApplicationSource, description: 'Application source' })
  source: ApplicationSource;

  @ApiPropertyOptional({ description: 'Internal notes' })
  notes?: string;

  @ApiPropertyOptional({ description: 'Application rating' })
  rating?: number;

  @ApiPropertyOptional({ description: 'Assigned recruiter user ID' })
  assignedTo?: string;

  @ApiProperty({ description: 'Application submitted date' })
  appliedAt: Date;

  @ApiProperty({ description: 'Last activity timestamp' })
  lastActivityAt: Date;

  @ApiProperty({ description: 'Application form data' })
  formData: Record<string, any>;

  @ApiProperty({ description: 'Application timeline' })
  timeline: Array<{
    id: string;
    action: string;
    description: string;
    performedBy: string;
    performedByName: string;
    timestamp: Date;
    metadata?: Record<string, any>;
  }>;

  @ApiProperty({ description: 'Screening results' })
  screeningData: Record<string, any>;

  @ApiProperty({ description: 'Communication history' })
  communications: Array<{
    id: string;
    type: string;
    direction: string;
    subject?: string;
    content: string;
    sentBy: string;
    sentByName: string;
    timestamp: Date;
  }>;

  @ApiProperty({ description: 'Interview data' })
  interviewData: Record<string, any>;

  @ApiPropertyOptional({ description: 'Rejection details' })
  rejectionData?: Record<string, any>;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Job details' })
  job?: {
    id: string;
    title: string;
    department?: string;
    location?: string;
  };

  @ApiPropertyOptional({ description: 'Candidate details' })
  candidate?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };

  @ApiPropertyOptional({ description: 'Resume details' })
  resume?: {
    id: string;
    title: string;
    pdfUrl?: string;
  };

  @ApiPropertyOptional({ description: 'Assignee details' })
  assignee?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };

  @ApiPropertyOptional({ description: 'Virtual properties' })
  virtualProperties?: {
    candidateName: string;
    candidateEmail: string;
    isExternal: boolean;
    daysSinceApplied: number;
    daysSinceLastActivity: number;
    isStale: boolean;
  };

  constructor(application: any) {
    this.id = application.id;
    this.jobId = application.jobId;
    this.candidateId = application.candidateId;
    this.externalEmail = application.externalEmail;
    this.externalName = application.externalName;
    this.resumeId = application.resumeId;
    this.coverLetter = application.coverLetter;
    this.status = application.status;
    this.stage = application.stage;
    this.source = application.source;
    this.notes = application.notes;
    this.rating = application.rating;
    this.assignedTo = application.assignedTo;
    this.appliedAt = application.appliedAt;
    this.lastActivityAt = application.lastActivityAt;
    this.formData = application.formData || {};
    this.timeline = application.timeline || [];
    this.screeningData = application.screeningData || {};
    this.communications = application.communications || [];
    this.interviewData = application.interviewData || {};
    this.rejectionData = application.rejectionData;
    this.createdAt = application.createdAt;
    this.updatedAt = application.updatedAt;

    if (application.job) {
      this.job = {
        id: application.job.id,
        title: application.job.title,
        department: application.job.department,
        location: application.job.location,
      };
    }

    if (application.candidate) {
      this.candidate = {
        id: application.candidate.id,
        firstName: application.candidate.firstName,
        lastName: application.candidate.lastName,
        email: application.candidate.email,
      };
    }

    if (application.resume) {
      this.resume = {
        id: application.resume.id,
        title: application.resume.title,
        pdfUrl: application.resume.pdfUrl,
      };
    }

    if (application.assignee) {
      this.assignee = {
        id: application.assignee.id,
        firstName: application.assignee.firstName,
        lastName: application.assignee.lastName,
        email: application.assignee.email,
      };
    }

    this.virtualProperties = {
      candidateName: application.candidateName,
      candidateEmail: application.candidateEmail,
      isExternal: application.isExternal,
      daysSinceApplied: application.daysSinceApplied,
      daysSinceLastActivity: application.daysSinceLastActivity,
      isStale: application.isStale,
    };
  }
}

export class ApplicationListResponseDto {
  @ApiProperty({ type: [ApplicationResponseDto], description: 'List of applications' })
  items: ApplicationResponseDto[];

  @ApiProperty({ description: 'Total number of items' })
  total: number;

  @ApiProperty({ description: 'Current page' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  constructor(data: any) {
    this.items = data.items.map((item: any) => new ApplicationResponseDto(item));
    this.total = data.total;
    this.page = data.page;
    this.limit = data.limit;
    this.totalPages = data.totalPages;
  }
}

export class ApplicationTimelineDto {
  @ApiProperty({ description: 'Application ID' })
  applicationId: string;

  @ApiProperty({ description: 'Timeline events' })
  timeline: Array<{
    id: string;
    action: string;
    description: string;
    performedBy: string;
    performedByName: string;
    timestamp: Date;
    metadata?: Record<string, any>;
  }>;

  @ApiProperty({ description: 'Communication history' })
  communications: Array<{
    id: string;
    type: string;
    direction: string;
    subject?: string;
    content: string;
    sentBy: string;
    sentByName: string;
    timestamp: Date;
  }>;

  constructor(data: any) {
    this.applicationId = data.applicationId;
    this.timeline = data.timeline;
    this.communications = data.communications;
  }
}

export class ScreeningResultsDto {
  @ApiProperty({ description: 'Application ID' })
  applicationId: string;

  @ApiProperty({ description: 'Auto-screening score (0-100)' })
  autoScreeningScore: number;

  @ApiPropertyOptional({ description: 'Skills matching results' })
  skillsMatch?: {
    required: string[];
    matched: string[];
    missing: string[];
    score: number;
  };

  @ApiPropertyOptional({ description: 'Experience matching results' })
  experienceMatch?: {
    required: string;
    candidate: string;
    score: number;
  };

  @ApiPropertyOptional({ description: 'Salary expectation' })
  salaryExpectation?: {
    min?: number;
    max?: number;
    currency: string;
    negotiable: boolean;
  };

  @ApiPropertyOptional({ description: 'Candidate availability' })
  availability?: {
    startDate?: Date;
    noticePeriod?: string;
    relocate?: boolean;
  };

  @ApiProperty({ description: 'Screening recommendations' })
  recommendations: string[];

  constructor(data: any) {
    this.applicationId = data.applicationId;
    this.autoScreeningScore = data.autoScreeningScore;
    this.skillsMatch = data.skillsMatch;
    this.experienceMatch = data.experienceMatch;
    this.salaryExpectation = data.salaryExpectation;
    this.availability = data.availability;
    this.recommendations = data.recommendations;
  }
}
