import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsNumber,
  IsObject,
  IsUrl,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { TemplateCategory } from '../../../database/entities/resume-template.entity';

export class CreateTemplateDto {
  @ApiProperty({ description: 'Template name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Template key' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'Template body' })
  @IsString()
  bodyTemplate: string;

  @ApiPropertyOptional({ description: 'Template channels' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  channels?: string[];
  
  @ApiPropertyOptional({ description: 'Template description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: TemplateCategory, description: 'Template category' })
  @IsOptional()
  @IsEnum(TemplateCategory)
  category?: TemplateCategory;

  @ApiPropertyOptional({ description: 'Preview image URL' })
  @IsOptional()
  @IsUrl()
  previewImageUrl?: string;

  @ApiProperty({ description: 'Template data structure' })
  @IsObject()
  templateData: {
    layout: {
      type: 'single-column' | 'two-column' | 'three-column';
      sections: Array<{
        id: string;
        type: string;
        position: { x: number; y: number; width: number; height: number };
        style: Record<string, any>;
      }>;
    };
    styles: {
      fonts: {
        primary: string;
        secondary: string;
        sizes: Record<string, number>;
      };
      colors: {
        primary: string;
        secondary: string;
        accent: string;
        text: string;
        background: string;
      };
      spacing: {
        margins: Record<string, number>;
        padding: Record<string, number>;
      };
    };
    components: Record<string, {
      template: string;
      styles: Record<string, any>;
      validation?: Record<string, any>;
    }>;
    metadata: {
      version: string;
      compatibility: string[];
      features: string[];
    };
  };

  @ApiPropertyOptional({ description: 'Whether template is premium' })
  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;

  @ApiPropertyOptional({ description: 'Template tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Template features', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional({ description: 'Template difficulty level' })
  @IsOptional()
  @IsEnum(['beginner', 'intermediate', 'advanced'])
  difficultyLevel?: 'beginner' | 'intermediate' | 'advanced';

  @ApiPropertyOptional({ description: 'Estimated completion time in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(180)
  completionTime?: number;

  @ApiPropertyOptional({ description: 'Template customization options' })
  @IsOptional()
  @IsObject()
  customizationOptions?: {
    colors?: boolean;
    fonts?: boolean;
    layout?: boolean;
    sections?: boolean;
    spacing?: boolean;
  };
}

export class UpdateTemplateDto extends PartialType(CreateTemplateDto) {
  @ApiPropertyOptional({ description: 'Whether template is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SearchTemplatesDto {
  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: TemplateCategory, description: 'Filter by category' })
  @IsOptional()
  @IsEnum(TemplateCategory)
  category?: TemplateCategory;

  @ApiPropertyOptional({ description: 'Filter by premium status' })
  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;

  @ApiPropertyOptional({ description: 'Filter by difficulty level' })
  @IsOptional()
  @IsEnum(['beginner', 'intermediate', 'advanced'])
  difficultyLevel?: 'beginner' | 'intermediate' | 'advanced';

  @ApiPropertyOptional({ description: 'Filter by tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Filter by features', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional({ description: 'Minimum rating' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({ description: 'Maximum completion time' })
  @IsOptional()
  @IsNumber()
  @Min(5)
  maxCompletionTime?: number;

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

export class CloneTemplateDto {
  @ApiProperty({ description: 'New template name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'New template description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: TemplateCategory, description: 'New template category' })
  @IsOptional()
  @IsEnum(TemplateCategory)
  category?: TemplateCategory;

  @ApiPropertyOptional({ description: 'New template tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class TemplateResponseDto {
  @ApiProperty({ description: 'Template ID' })
  id: string;

  @ApiProperty({ description: 'Template name' })
  name: string;

  @ApiPropertyOptional({ description: 'Template description' })
  description?: string;

  @ApiPropertyOptional({ enum: TemplateCategory, description: 'Template category' })
  category?: TemplateCategory;

  @ApiPropertyOptional({ description: 'Preview image URL' })
  previewImageUrl?: string;

  @ApiProperty({ description: 'Template data structure' })
  templateData: Record<string, any>;

  @ApiProperty({ description: 'Whether template is premium' })
  isPremium: boolean;

  @ApiProperty({ description: 'Whether template is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Download count' })
  downloadCount: number;

  @ApiProperty({ description: 'Template rating' })
  rating: number;

  @ApiProperty({ description: 'Number of ratings' })
  ratingCount: number;

  @ApiProperty({ description: 'Template tags', type: [String] })
  tags: string[];

  @ApiProperty({ description: 'Template features', type: [String] })
  features: string[];

  @ApiProperty({ description: 'Difficulty level' })
  difficultyLevel: string;

  @ApiPropertyOptional({ description: 'Completion time in minutes' })
  completionTime?: number;

  @ApiProperty({ description: 'Customization options' })
  customizationOptions: {
    colors: boolean;
    fonts: boolean;
    layout: boolean;
    sections: boolean;
    spacing: boolean;
  };

  @ApiPropertyOptional({ description: 'ATS compatibility score' })
  atsScore?: number;

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

  @ApiPropertyOptional({ description: 'Virtual properties' })
  virtualProperties?: {
    isPopular: boolean;
    isTrending: boolean;
    averageRating: number;
  };

  constructor(template: any) {
    this.id = template.id;
    this.name = template.name;
    this.description = template.description;
    this.category = template.category;
    this.previewImageUrl = template.previewImageUrl;
    this.templateData = template.templateData;
    this.isPremium = template.isPremium;
    this.isActive = template.isActive;
    this.downloadCount = template.downloadCount;
    this.rating = template.rating;
    this.ratingCount = template.ratingCount;
    this.tags = template.tags || [];
    this.features = template.features || [];
    this.difficultyLevel = template.difficultyLevel;
    this.completionTime = template.completionTime;
    this.customizationOptions = template.customizationOptions;
    this.atsScore = template.atsScore;
    this.createdBy = template.createdBy;
    this.createdAt = template.createdAt;
    this.updatedAt = template.updatedAt;

    if (template.creator) {
      this.creator = {
        id: template.creator.id,
        firstName: template.creator.firstName,
        lastName: template.creator.lastName,
        email: template.creator.email,
      };
    }

    this.virtualProperties = {
      isPopular: template.isPopular || false,
      isTrending: template.isTrending || false,
      averageRating: template.averageRating || 0,
    };
  }
}

export class TemplateListResponseDto {
  @ApiProperty({ type: [TemplateResponseDto], description: 'List of templates' })
  items: TemplateResponseDto[];

  @ApiProperty({ description: 'Total number of items' })
  total: number;

  @ApiProperty({ description: 'Current page' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  constructor(data: any) {
    this.items = data.items.map((item: any) => new TemplateResponseDto(item));
    this.total = data.total;
    this.page = data.page;
    this.limit = data.limit;
    this.totalPages = data.totalPages;
  }
}

export class TemplateStatsDto {
  @ApiProperty({ description: 'Total downloads' })
  totalDownloads: number;

  @ApiProperty({ description: 'Total ratings' })
  totalRatings: number;

  @ApiProperty({ description: 'Average rating' })
  averageRating: number;

  @ApiPropertyOptional({ description: 'ATS compatibility score' })
  atsScore?: number;

  @ApiProperty({ description: 'Popularity rank' })
  popularityRank: number;

  @ApiProperty({ description: 'Category rank' })
  categoryRank: number;

  @ApiProperty({ description: 'Recent downloads (last 30 days)' })
  recentDownloads: number;

  @ApiProperty({ description: 'User feedback' })
  userFeedback: Array<{
    rating: number;
    comment: string;
    date: Date;
  }>;

  @ApiProperty({ description: 'Conversion rate (views to usage)' })
  conversionRate: number;

  constructor(data: any) {
    this.totalDownloads = data.totalDownloads;
    this.totalRatings = data.totalRatings;
    this.averageRating = data.averageRating;
    this.atsScore = data.atsScore;
    this.popularityRank = data.popularityRank;
    this.categoryRank = data.categoryRank;
    this.recentDownloads = data.recentDownloads;
    this.userFeedback = data.userFeedback;
    this.conversionRate = data.conversionRate;
  }
}
