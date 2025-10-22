import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  IsDate,
  IsUUID,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { JobType, WorkMode, ExperienceLevel, JobStatus } from '../../../database/entities/job.entity';

export class CreateJobDto {
  @ApiProperty({ description: 'Organization ID' })
  @IsUUID()
  organizationId: string;

  @ApiProperty({ description: 'Job title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Job description' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'Job requirements' })
  @IsOptional()
  @IsString()
  requirements?: string;

  @ApiPropertyOptional({ description: 'Job responsibilities' })
  @IsOptional()
  @IsString()
  responsibilities?: string;

  @ApiPropertyOptional({ description: 'Job location' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ enum: JobType, description: 'Job type' })
  @IsEnum(JobType)
  type: JobType;

  @ApiPropertyOptional({ enum: WorkMode, description: 'Work mode' })
  @IsOptional()
  @IsEnum(WorkMode)
  mode?: WorkMode;

  @ApiPropertyOptional({ enum: ExperienceLevel, description: 'Experience level required' })
  @IsOptional()
  @IsEnum(ExperienceLevel)
  experienceLevel?: ExperienceLevel;

  @ApiPropertyOptional({ description: 'Minimum salary' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salaryMin?: number;

  @ApiPropertyOptional({ description: 'Maximum salary' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salaryMax?: number;

  @ApiPropertyOptional({ description: 'Salary currency' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Department' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ description: 'Job tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Required skills', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skillsRequired?: string[];

  @ApiPropertyOptional({ description: 'Job expiry date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date;
}

export class UpdateJobDto extends PartialType(CreateJobDto) {
  @ApiPropertyOptional({ enum: JobStatus, description: 'Job status' })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @ApiPropertyOptional({ description: 'Job URL slug' })
  @IsOptional()
  @IsString()
  slug?: string;
}

export class SearchJobsDto {
  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by organization ID' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({ enum: JobType, description: 'Filter by job type' })
  @IsOptional()
  @IsEnum(JobType)
  type?: JobType;

  @ApiPropertyOptional({ enum: WorkMode, description: 'Filter by work mode' })
  @IsOptional()
  @IsEnum(WorkMode)
  mode?: WorkMode;

  @ApiPropertyOptional({ enum: ExperienceLevel, description: 'Filter by experience level' })
  @IsOptional()
  @IsEnum(ExperienceLevel)
  experienceLevel?: ExperienceLevel;

  @ApiPropertyOptional({ description: 'Filter by location' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Filter by department' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ description: 'Minimum salary filter' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salaryMin?: number;

  @ApiPropertyOptional({ description: 'Maximum salary filter' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salaryMax?: number;

  @ApiPropertyOptional({ description: 'Filter by skills', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({ description: 'Filter by tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ enum: JobStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

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

export class PublishJobDto {
  @ApiPropertyOptional({ description: 'Job expiry date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date;
}

export class JobResponseDto {
  @ApiProperty({ description: 'Job ID' })
  id: string;

  @ApiProperty({ description: 'Organization ID' })
  organizationId: string;

  @ApiProperty({ description: 'Job title' })
  title: string;

  @ApiProperty({ description: 'Job URL slug' })
  slug: string;

  @ApiProperty({ description: 'Job description' })
  description: string;

  @ApiPropertyOptional({ description: 'Job requirements' })
  requirements?: string;

  @ApiPropertyOptional({ description: 'Job responsibilities' })
  responsibilities?: string;

  @ApiPropertyOptional({ description: 'Job location' })
  location?: string;

  @ApiProperty({ enum: JobType, description: 'Job type' })
  type: JobType;

  @ApiProperty({ enum: WorkMode, description: 'Work mode' })
  mode: WorkMode;

  @ApiPropertyOptional({ enum: ExperienceLevel, description: 'Experience level required' })
  experienceLevel?: ExperienceLevel;

  @ApiPropertyOptional({ description: 'Minimum salary' })
  salaryMin?: number;

  @ApiPropertyOptional({ description: 'Maximum salary' })
  salaryMax?: number;

  @ApiProperty({ description: 'Salary currency' })
  currency: string;

  @ApiPropertyOptional({ description: 'Department' })
  department?: string;

  @ApiProperty({ description: 'Job tags', type: [String] })
  tags: string[];

  @ApiProperty({ description: 'Required skills', type: [String] })
  skillsRequired: string[];

  @ApiProperty({ enum: JobStatus, description: 'Job status' })
  status: JobStatus;

  @ApiPropertyOptional({ description: 'Job published date' })
  publishedAt?: Date;

  @ApiPropertyOptional({ description: 'Job expiry date' })
  expiresAt?: Date;

  @ApiProperty({ description: 'Job creator user ID' })
  createdBy: string;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Organization details' })
  organization?: {
    id: string;
    name: string;
    logo?: string;
  };

  @ApiPropertyOptional({ description: 'Creator details' })
  creator?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };

  @ApiPropertyOptional({ description: 'Virtual properties' })
  virtualProperties?: {
    isActive: boolean;
    isExpired: boolean;
    salaryRange: string;
    applicationCount?: number;
  };

  constructor(job: any) {
    this.id = job.id;
    this.organizationId = job.organizationId;
    this.title = job.title;
    this.slug = job.slug;
    this.description = job.description;
    this.requirements = job.requirements;
    this.responsibilities = job.responsibilities;
    this.location = job.location;
    this.type = job.type;
    this.mode = job.mode;
    this.experienceLevel = job.experienceLevel;
    this.salaryMin = job.salaryMin;
    this.salaryMax = job.salaryMax;
    this.currency = job.currency;
    this.department = job.department;
    this.tags = job.tags || [];
    this.skillsRequired = job.skillsRequired || [];
    this.status = job.status;
    this.publishedAt = job.publishedAt;
    this.expiresAt = job.expiresAt;
    this.createdBy = job.createdBy;
    this.createdAt = job.createdAt;
    this.updatedAt = job.updatedAt;

    if (job.organization) {
      this.organization = {
        id: job.organization.id,
        name: job.organization.name,
        logo: job.organization.logo,
      };
    }

    if (job.creator) {
      this.creator = {
        id: job.creator.id,
        firstName: job.creator.firstName,
        lastName: job.creator.lastName,
        email: job.creator.email,
      };
    }

    this.virtualProperties = {
      isActive: job.isActive,
      isExpired: job.isExpired,
      salaryRange: job.salaryRange,
      applicationCount: job.applications?.length || 0,
    };
  }
}

export class JobListResponseDto {
  @ApiProperty({ type: [JobResponseDto], description: 'List of jobs' })
  items: JobResponseDto[];

  @ApiProperty({ description: 'Total number of items' })
  total: number;

  @ApiProperty({ description: 'Current page' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  constructor(data: any) {
    this.items = data.items.map((item: any) => new JobResponseDto(item));
    this.total = data.total;
    this.page = data.page;
    this.limit = data.limit;
    this.totalPages = data.totalPages;
  }
}

export class JobStatsDto {
  @ApiProperty({ description: 'Total applications' })
  totalApplications: number;

  @ApiProperty({ description: 'Applications by status' })
  applicationsByStatus: Record<string, number>;

  @ApiProperty({ description: 'Applications by source' })
  applicationsBySource: Record<string, number>;

  @ApiProperty({ description: 'Average application rating' })
  averageRating: number;

  @ApiProperty({ description: 'Application trend over time' })
  applicationTrend: Array<{ date: string; count: number }>;

  @ApiProperty({ description: 'Top skills from applicants' })
  topSkills: Array<{ skill: string; count: number }>;

  @ApiProperty({ description: 'Average time to hire in days' })
  timeToHire: number;

  @ApiProperty({ description: 'Conversion rates at each stage' })
  conversionRates: Record<string, number>;

  constructor(data: any) {
    this.totalApplications = data.totalApplications;
    this.applicationsByStatus = data.applicationsByStatus;
    this.applicationsBySource = data.applicationsBySource;
    this.averageRating = data.averageRating;
    this.applicationTrend = data.applicationTrend;
    this.topSkills = data.topSkills;
    this.timeToHire = data.timeToHire;
    this.conversionRates = data.conversionRates;
  }
}
