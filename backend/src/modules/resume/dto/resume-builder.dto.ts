import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsUUID,
  IsObject,
  IsNumber,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ResumeVisibility } from '../../../database/entities/user-resume.entity';
import { SectionType } from '../../../database/entities/resume-section.entity';

export class CreateResumeDto {
  @ApiProperty({ description: 'Resume title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Template ID to use' })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({ description: 'Whether this is the primary resume' })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ enum: ResumeVisibility, description: 'Resume visibility' })
  @IsOptional()
  @IsEnum(ResumeVisibility)
  visibility?: ResumeVisibility;

  @ApiPropertyOptional({ description: 'Resume data structure' })
  @IsOptional()
  @IsObject()
  data?: {
    personalInfo?: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
      website?: string;
      linkedin?: string;
      github?: string;
      portfolio?: string;
      profileImage?: string;
    };
    summary?: string;
    experience?: Array<{
      id: string;
      company: string;
      position: string;
      startDate: string;
      endDate?: string;
      current: boolean;
      location?: string;
      description: string;
      achievements?: string[];
      technologies?: string[];
    }>;
    education?: Array<{
      id: string;
      institution: string;
      degree: string;
      field: string;
      startDate: string;
      endDate?: string;
      current: boolean;
      gpa?: number;
      honors?: string[];
      coursework?: string[];
    }>;
    skills?: Array<{
      id: string;
      name: string;
      category: string;
      level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
      yearsExperience?: number;
      verified?: boolean;
    }>;
    projects?: Array<{
      id: string;
      name: string;
      description: string;
      startDate: string;
      endDate?: string;
      url?: string;
      repository?: string;
      technologies: string[];
      achievements?: string[];
    }>;
    certifications?: Array<{
      id: string;
      name: string;
      issuer: string;
      issueDate: string;
      expiryDate?: string;
      credentialId?: string;
      url?: string;
    }>;
    languages?: Array<{
      id: string;
      name: string;
      proficiency: 'basic' | 'conversational' | 'fluent' | 'native';
    }>;
    hobbies?: string[];
    references?: Array<{
      id: string;
      name: string;
      position: string;
      company: string;
      email: string;
      phone?: string;
      relationship: string;
    }>;
    customSections?: Array<{
      id: string;
      title: string;
      content: string;
      type: 'text' | 'list' | 'table';
    }>;
  };

  @ApiPropertyOptional({ description: 'Resume customization settings' })
  @IsOptional()
  @IsObject()
  customization?: {
    theme?: {
      primaryColor?: string;
      secondaryColor?: string;
      accentColor?: string;
      fontFamily?: string;
      fontSize?: number;
    };
    layout?: {
      margins?: Record<string, number>;
      spacing?: number;
      sectionOrder?: string[];
    };
    visibility?: {
      showProfileImage?: boolean;
      showReferences?: boolean;
      showHobbies?: boolean;
    };
  };

  @ApiPropertyOptional({ description: 'Resume metadata' })
  @IsOptional()
  @IsObject()
  metadata?: {
    targetJobTitles?: string[];
    keywords?: string[];
    autoSaveEnabled?: boolean;
  };
}

export class UpdateResumeDto extends PartialType(CreateResumeDto) {
  @ApiPropertyOptional({ description: 'Whether this is an auto-save update' })
  @IsOptional()
  @IsBoolean()
  isAutoSave?: boolean;
}

export class SearchResumesDto {
  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'Filter by template ID' })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({ enum: ResumeVisibility, description: 'Filter by visibility' })
  @IsOptional()
  @IsEnum(ResumeVisibility)
  visibility?: ResumeVisibility;

  @ApiPropertyOptional({ description: 'Filter by primary status' })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

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

export class UpdateSectionDto {
  @ApiPropertyOptional({ enum: SectionType, description: 'Section type' })
  @IsOptional()
  @IsEnum(SectionType)
  type?: SectionType;

  @ApiPropertyOptional({ description: 'Section title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Section content' })
  @IsOptional()
  @IsObject()
  content?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Section order index' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  orderIndex?: number;

  @ApiPropertyOptional({ description: 'Whether section is visible' })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional({ description: 'Section styling options' })
  @IsOptional()
  @IsObject()
  styling?: {
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
    fontSize?: number;
    fontWeight?: string;
    margin?: Record<string, number>;
    padding?: Record<string, number>;
    alignment?: 'left' | 'center' | 'right' | 'justify';
  };

  @ApiPropertyOptional({ description: 'Section configuration' })
  @IsOptional()
  @IsObject()
  config?: {
    showTitle?: boolean;
    showDivider?: boolean;
    collapsible?: boolean;
    maxItems?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    displayFormat?: 'list' | 'grid' | 'timeline' | 'table';
  };
}

export class ReorderSectionsDto {
  @ApiProperty({ description: 'Ordered array of section IDs', type: [String] })
  @IsArray()
  @IsUUID(undefined, { each: true })
  sectionIds: string[];
}

export class ShareResumeDto {
  @ApiPropertyOptional({ enum: ResumeVisibility, description: 'Resume visibility for sharing' })
  @IsOptional()
  @IsEnum(ResumeVisibility)
  visibility?: ResumeVisibility;

  @ApiPropertyOptional({ description: 'Share link expiry in days' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  expiryDays?: number;
}

export class ResumeResponseDto {
  @ApiProperty({ description: 'Resume ID' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiPropertyOptional({ description: 'Template ID' })
  templateId?: string;

  @ApiProperty({ description: 'Resume title' })
  title: string;

  @ApiProperty({ description: 'Whether this is the primary resume' })
  isPrimary: boolean;

  @ApiProperty({ enum: ResumeVisibility, description: 'Resume visibility' })
  visibility: ResumeVisibility;

  @ApiProperty({ description: 'Resume data structure' })
  data: Record<string, any>;

  @ApiPropertyOptional({ description: 'Generated PDF URL' })
  pdfUrl?: string;

  @ApiPropertyOptional({ description: 'Last PDF generation timestamp' })
  lastGeneratedAt?: Date;

  @ApiProperty({ description: 'Resume view count' })
  viewCount: number;

  @ApiProperty({ description: 'Resume download count' })
  downloadCount: number;

  @ApiProperty({ description: 'Resume share count' })
  shareCount: number;

  @ApiProperty({ description: 'Resume analytics data' })
  analytics: Record<string, any>;

  @ApiProperty({ description: 'Resume customization settings' })
  customization: Record<string, any>;

  @ApiProperty({ description: 'Resume metadata' })
  metadata: Record<string, any>;

  @ApiPropertyOptional({ description: 'Public sharing token' })
  shareToken?: string;

  @ApiPropertyOptional({ description: 'Share token expiry date' })
  shareExpiresAt?: Date;

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

  @ApiPropertyOptional({ description: 'Template details' })
  template?: {
    id: string;
    name: string;
    category: string;
    previewImageUrl?: string;
  };

  @ApiPropertyOptional({ description: 'Resume sections' })
  sections?: Array<{
    id: string;
    type: SectionType;
    title?: string;
    orderIndex: number;
    isVisible: boolean;
  }>;

  @ApiPropertyOptional({ description: 'Virtual properties' })
  virtualProperties?: {
    isPubliclyAccessible: boolean;
    isShareLinkValid: boolean;
    completionPercentage: number;
    estimatedAtsScore: number;
  };

  constructor(resume: any) {
    this.id = resume.id;
    this.userId = resume.userId;
    this.templateId = resume.templateId;
    this.title = resume.title;
    this.isPrimary = resume.isPrimary;
    this.visibility = resume.visibility;
    this.data = resume.data;
    this.pdfUrl = resume.pdfUrl;
    this.lastGeneratedAt = resume.lastGeneratedAt;
    this.viewCount = resume.viewCount;
    this.downloadCount = resume.downloadCount;
    this.shareCount = resume.shareCount;
    this.analytics = resume.analytics;
    this.customization = resume.customization;
    this.metadata = resume.metadata;
    this.shareToken = resume.shareToken;
    this.shareExpiresAt = resume.shareExpiresAt;
    this.createdAt = resume.createdAt;
    this.updatedAt = resume.updatedAt;

    if (resume.user) {
      this.user = {
        id: resume.user.id,
        firstName: resume.user.firstName,
        lastName: resume.user.lastName,
        email: resume.user.email,
      };
    }

    if (resume.template) {
      this.template = {
        id: resume.template.id,
        name: resume.template.name,
        category: resume.template.category,
        previewImageUrl: resume.template.previewImageUrl,
      };
    }

    if (resume.sections) {
      this.sections = resume.sections.map((section: any) => ({
        id: section.id,
        type: section.type,
        title: section.title,
        orderIndex: section.orderIndex,
        isVisible: section.isVisible,
      }));
    }

    this.virtualProperties = {
      isPubliclyAccessible: resume.isPubliclyAccessible || false,
      isShareLinkValid: resume.isShareLinkValid || false,
      completionPercentage: resume.completionPercentage || 0,
      estimatedAtsScore: resume.estimatedAtsScore || 0,
    };
  }
}

export class ResumeListResponseDto {
  @ApiProperty({ type: [ResumeResponseDto], description: 'List of resumes' })
  items: ResumeResponseDto[];

  @ApiProperty({ description: 'Total number of items' })
  total: number;

  @ApiProperty({ description: 'Current page' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  constructor(data: any) {
    this.items = data.items.map((item: any) => new ResumeResponseDto(item));
    this.total = data.total;
    this.page = data.page;
    this.limit = data.limit;
    this.totalPages = data.totalPages;
  }
}

export class ResumeAnalyticsDto {
  @ApiProperty({ description: 'Resume view count' })
  viewCount: number;

  @ApiProperty({ description: 'Resume download count' })
  downloadCount: number;

  @ApiProperty({ description: 'Resume share count' })
  shareCount: number;

  @ApiProperty({ description: 'Completion percentage' })
  completionPercentage: number;

  @ApiProperty({ description: 'Estimated ATS score' })
  atsScore: number;

  @ApiProperty({ description: 'Detailed analytics data' })
  analytics: {
    viewsByDate?: Record<string, number>;
    downloadsByDate?: Record<string, number>;
    sharesByDate?: Record<string, number>;
    viewerLocations?: Record<string, number>;
    referrers?: Record<string, number>;
    deviceTypes?: Record<string, number>;
  };

  @ApiProperty({ description: 'Last updated timestamp' })
  lastUpdated: Date;

  @ApiProperty({ description: 'Improvement recommendations', type: [String] })
  recommendations: string[];

  constructor(data: any) {
    this.viewCount = data.viewCount;
    this.downloadCount = data.downloadCount;
    this.shareCount = data.shareCount;
    this.completionPercentage = data.completionPercentage;
    this.atsScore = data.atsScore;
    this.analytics = data.analytics;
    this.lastUpdated = data.lastUpdated;
    this.recommendations = data.recommendations;
  }
}
