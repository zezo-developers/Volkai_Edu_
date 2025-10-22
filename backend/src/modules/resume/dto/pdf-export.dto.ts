import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsObject,
  IsUrl,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PdfOptionsDto {
  @ApiPropertyOptional({ description: 'Paper format', enum: ['A4', 'Letter'] })
  @IsOptional()
  @IsEnum(['A4', 'Letter'])
  format?: 'A4' | 'Letter';

  @ApiPropertyOptional({ description: 'Page margins' })
  @IsOptional()
  @IsObject()
  margins?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };

  @ApiPropertyOptional({ description: 'Font sizes' })
  @IsOptional()
  @IsObject()
  fontSize?: {
    heading: number;
    subheading: number;
    body: number;
    small: number;
  };

  @ApiPropertyOptional({ description: 'Color scheme' })
  @IsOptional()
  @IsObject()
  colors?: {
    primary: string;
    secondary: string;
    text: string;
    accent: string;
  };

  @ApiPropertyOptional({ description: 'Font family settings' })
  @IsOptional()
  @IsObject()
  fonts?: {
    primary: string;
    secondary: string;
  };

  @ApiPropertyOptional({ description: 'Whether to optimize for ATS' })
  @IsOptional()
  @IsBoolean()
  atsOptimized?: boolean;

  @ApiPropertyOptional({ description: 'Whether to include profile photo' })
  @IsOptional()
  @IsBoolean()
  includePhoto?: boolean;

  @ApiPropertyOptional({ description: 'Watermark text' })
  @IsOptional()
  @IsString()
  watermark?: string;
}

export class ExportResumeDto {
  @ApiProperty({ description: 'Export format', enum: ['pdf'] })
  @IsEnum(['pdf'])
  format: 'pdf';

  @ApiPropertyOptional({ description: 'PDF generation options' })
  @IsOptional()
  @IsObject()
  options?: PdfOptionsDto;
}

export class ExportResponseDto {
  @ApiProperty({ description: 'Whether export was successful' })
  success: boolean;

  @ApiProperty({ description: 'Generated filename' })
  filename: string;

  @ApiProperty({ description: 'Download URL' })
  @IsUrl()
  downloadUrl: string;

  @ApiProperty({ description: 'File size in bytes' })
  @IsNumber()
  fileSize: number;

  @ApiProperty({ description: 'Export format' })
  format: string;

  @ApiProperty({ description: 'Generation timestamp' })
  generatedAt: Date;

  @ApiPropertyOptional({ description: 'Error message if failed' })
  error?: string;

  constructor(data: any) {
    this.success = data.success;
    this.filename = data.filename;
    this.downloadUrl = data.downloadUrl;
    this.fileSize = data.fileSize;
    this.format = data.format;
    this.generatedAt = data.generatedAt;
    this.error = data.error;
  }
}

export class ResumePreviewDto {
  @ApiProperty({ description: 'Resume ID' })
  id: string;

  @ApiProperty({ description: 'Resume title' })
  title: string;

  @ApiProperty({ description: 'Personal information' })
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    address?: string;
    profileImage?: string;
  };

  @ApiProperty({ description: 'Resume sections' })
  sections: Array<{
    type: string;
    title: string;
    isVisible: boolean;
    orderIndex: number;
  }>;

  @ApiProperty({ description: 'Completion percentage' })
  @IsNumber()
  @Min(0)
  @Max(100)
  completionPercentage: number;

  @ApiProperty({ description: 'ATS compatibility score' })
  @IsNumber()
  @Min(0)
  @Max(100)
  atsScore: number;

  @ApiProperty({ description: 'Last updated timestamp' })
  lastUpdated: Date;

  @ApiPropertyOptional({ description: 'Template information' })
  template?: {
    id: string;
    name: string;
    category: string;
    previewImageUrl?: string;
  };

  constructor(data: any) {
    this.id = data.id;
    this.title = data.title;
    this.personalInfo = data.personalInfo;
    this.sections = data.sections;
    this.completionPercentage = data.completionPercentage;
    this.atsScore = data.atsScore;
    this.lastUpdated = data.lastUpdated;
    this.template = data.template;
  }
}
