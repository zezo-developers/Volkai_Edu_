import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  IsDate,
  IsUUID,
  IsObject,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { EmploymentType } from '../../../database/entities/hr-profile.entity';

export class CreateHRProfileDto {
  @ApiProperty({ description: 'User ID' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ description: 'Employee ID' })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional({ description: 'Department' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ description: 'Job position/title' })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional({ description: 'Manager user ID' })
  @IsOptional()
  @IsUUID()
  managerId?: string;

  @ApiPropertyOptional({ description: 'Hire date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  hireDate?: Date;

  @ApiPropertyOptional({ enum: EmploymentType, description: 'Employment type' })
  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @ApiPropertyOptional({ description: 'Base salary' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salary?: number;

  @ApiPropertyOptional({ description: 'Salary currency' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Employee benefits' })
  @IsOptional()
  @IsObject()
  benefits?: {
    healthInsurance?: {
      provider: string;
      plan: string;
      coverage: 'individual' | 'family';
      employerContribution: number;
    };
    retirement?: {
      plan: '401k' | 'pension' | 'other';
      employerMatch: number;
      vestingSchedule?: string;
    };
    timeOff?: {
      vacationDays: number;
      sickDays: number;
      personalDays: number;
      holidays: number;
    };
    other?: Array<{
      name: string;
      description: string;
      value?: string;
    }>;
  };

  @ApiPropertyOptional({ description: 'Emergency contact information' })
  @IsOptional()
  @IsObject()
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
    address?: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
  };

  @ApiPropertyOptional({ description: 'Work schedule and preferences' })
  @IsOptional()
  @IsObject()
  workSchedule?: {
    workingHours?: {
      monday?: { start: string; end: string; };
      tuesday?: { start: string; end: string; };
      wednesday?: { start: string; end: string; };
      thursday?: { start: string; end: string; };
      friday?: { start: string; end: string; };
      saturday?: { start: string; end: string; };
      sunday?: { start: string; end: string; };
    };
    timezone?: string;
    workLocation?: 'office' | 'remote' | 'hybrid';
    preferredWorkDays?: string[];
    flexibleHours?: boolean;
  };
}

export class UpdateHRProfileDto extends PartialType(CreateHRProfileDto) {}

export class SearchHRProfilesDto {
  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by department' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ description: 'Filter by position' })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional({ description: 'Filter by manager ID' })
  @IsOptional()
  @IsUUID()
  managerId?: string;

  @ApiPropertyOptional({ enum: EmploymentType, description: 'Filter by employment type' })
  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @ApiPropertyOptional({ description: 'Filter employees hired after this date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  hiredAfter?: Date;

  @ApiPropertyOptional({ description: 'Filter employees hired before this date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  hiredBefore?: Date;

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

export class PerformanceReviewDto {
  @ApiProperty({ description: 'Review period' })
  @IsString()
  period: string;

  @ApiProperty({ description: 'Review type' })
  @IsEnum(['annual', 'quarterly', 'monthly', 'project'])
  type: 'annual' | 'quarterly' | 'monthly' | 'project';

  @ApiProperty({ description: 'Overall rating (1-5)' })
  @IsNumber()
  @Min(1)
  @Max(5)
  overallRating: number;

  @ApiPropertyOptional({ description: 'Competency ratings' })
  @IsOptional()
  @IsObject()
  competencies?: Record<string, number>;

  @ApiPropertyOptional({ description: 'Achievements', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  achievements?: string[];

  @ApiPropertyOptional({ description: 'Areas for improvement', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  areasForImprovement?: string[];

  @ApiPropertyOptional({ description: 'Goals for next period', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  goals?: string[];

  @ApiPropertyOptional({ description: 'Review date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  reviewDate?: Date;

  @ApiPropertyOptional({ description: 'Next review date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  nextReviewDate?: Date;
}

export class GoalDto {
  @ApiProperty({ description: 'Goal title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Goal description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Goal category' })
  @IsEnum(['individual', 'team', 'company'])
  category: 'individual' | 'team' | 'company';

  @ApiProperty({ description: 'Goal priority' })
  @IsEnum(['low', 'medium', 'high'])
  priority: 'low' | 'medium' | 'high';

  @ApiPropertyOptional({ description: 'Due date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueDate?: Date;
}

export class DocumentDto {
  @ApiProperty({ description: 'Document name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Document type' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Document URL' })
  @IsString()
  url: string;

  @ApiProperty({ description: 'Document category' })
  @IsEnum(['contracts', 'certifications', 'reviews', 'other'])
  category: 'contracts' | 'certifications' | 'reviews' | 'other';
}

export class TrainingDto {
  @ApiProperty({ description: 'Training name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Training provider' })
  @IsString()
  provider: string;

  @ApiProperty({ description: 'Training category' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'Training type' })
  @IsEnum(['completed', 'planned'])
  type: 'completed' | 'planned';

  @ApiPropertyOptional({ description: 'Completion date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  completionDate?: Date;

  @ApiPropertyOptional({ description: 'Scheduled date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledDate?: Date;

  @ApiPropertyOptional({ description: 'Certificate URL' })
  @IsOptional()
  @IsString()
  certificateUrl?: string;
}

export class HRProfileResponseDto {
  @ApiProperty({ description: 'HR Profile ID' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiPropertyOptional({ description: 'Employee ID' })
  employeeId?: string;

  @ApiPropertyOptional({ description: 'Department' })
  department?: string;

  @ApiPropertyOptional({ description: 'Job position/title' })
  position?: string;

  @ApiPropertyOptional({ description: 'Manager user ID' })
  managerId?: string;

  @ApiPropertyOptional({ description: 'Hire date' })
  hireDate?: Date;

  @ApiPropertyOptional({ enum: EmploymentType, description: 'Employment type' })
  employmentType?: EmploymentType;

  @ApiPropertyOptional({ description: 'Base salary' })
  salary?: number;

  @ApiProperty({ description: 'Salary currency' })
  currency: string;

  @ApiProperty({ description: 'Employee benefits' })
  benefits: Record<string, any>;

  @ApiPropertyOptional({ description: 'Emergency contact information' })
  emergencyContact?: Record<string, any>;

  @ApiProperty({ description: 'Employee documents' })
  documents: Record<string, any>;

  @ApiProperty({ description: 'Performance tracking data' })
  performanceData: Record<string, any>;

  @ApiProperty({ description: 'Work schedule and preferences' })
  workSchedule: Record<string, any>;

  @ApiProperty({ description: 'Training and development data' })
  trainingData: Record<string, any>;

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

  @ApiPropertyOptional({ description: 'Manager details' })
  manager?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };

  @ApiPropertyOptional({ description: 'Direct reports' })
  directReports?: Array<{
    id: string;
    userId: string;
    employeeId?: string;
    position?: string;
  }>;

  @ApiPropertyOptional({ description: 'Virtual properties' })
  virtualProperties?: {
    yearsOfService: number;
    isManager: boolean;
    currentPerformanceRating: number | null;
    nextReviewDate: Date | null;
    activeGoalsCount: number;
  };

  constructor(profile: any) {
    this.id = profile.id;
    this.userId = profile.userId;
    this.employeeId = profile.employeeId;
    this.department = profile.department;
    this.position = profile.position;
    this.managerId = profile.managerId;
    this.hireDate = profile.hireDate;
    this.employmentType = profile.employmentType;
    this.salary = profile.salary;
    this.currency = profile.currency;
    this.benefits = profile.benefits || {};
    this.emergencyContact = profile.emergencyContact;
    this.documents = profile.documents || {};
    this.performanceData = profile.performanceData || {};
    this.workSchedule = profile.workSchedule || {};
    this.trainingData = profile.trainingData || {};
    this.createdAt = profile.createdAt;
    this.updatedAt = profile.updatedAt;

    if (profile.user) {
      this.user = {
        id: profile.user.id,
        firstName: profile.user.firstName,
        lastName: profile.user.lastName,
        email: profile.user.email,
      };
    }

    if (profile.manager) {
      this.manager = {
        id: profile.manager.id,
        firstName: profile.manager.firstName,
        lastName: profile.manager.lastName,
        email: profile.manager.email,
      };
    }

    if (profile.directReports) {
      this.directReports = profile.directReports.map((report: any) => ({
        id: report.id,
        userId: report.userId,
        employeeId: report.employeeId,
        position: report.position,
      }));
    }

    this.virtualProperties = {
      yearsOfService: profile.yearsOfService || 0,
      isManager: profile.isManager || false,
      currentPerformanceRating: profile.currentPerformanceRating,
      nextReviewDate: profile.nextReviewDate,
      activeGoalsCount: profile.activeGoalsCount || 0,
    };
  }
}

export class HRProfileListResponseDto {
  @ApiProperty({ type: [HRProfileResponseDto], description: 'List of HR profiles' })
  items: HRProfileResponseDto[];

  @ApiProperty({ description: 'Total number of items' })
  total: number;

  @ApiProperty({ description: 'Current page' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  constructor(data: any) {
    this.items = data.items.map((item: any) => new HRProfileResponseDto(item));
    this.total = data.total;
    this.page = data.page;
    this.limit = data.limit;
    this.totalPages = data.totalPages;
  }
}
