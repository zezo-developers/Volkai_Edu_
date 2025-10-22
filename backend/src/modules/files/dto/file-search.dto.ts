import { IsString, IsEnum, IsOptional, IsArray, IsBoolean, IsDateString, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { FileOwnerType, FileAccessLevel, VirusScanStatus, FileProcessingStatus } from '@database/entities/file.entity';

/**
 * Data Transfer Object for file search and filtering
 * Supports comprehensive file search with pagination and sorting
 */
export class FileSearchDto {
  @ApiProperty({
    description: 'Filter by file owner ID',
    example: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiProperty({
    description: 'Filter by organization ID',
    example: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({
    description: 'Filter by owner type',
    example: FileOwnerType.USER,
    enum: FileOwnerType,
    required: false,
  })
  @IsOptional()
  @IsEnum(FileOwnerType)
  ownerType?: FileOwnerType;

  @ApiProperty({
    description: 'Filter by access level',
    example: FileAccessLevel.PRIVATE,
    enum: FileAccessLevel,
    required: false,
  })
  @IsOptional()
  @IsEnum(FileAccessLevel)
  accessLevel?: FileAccessLevel;

  @ApiProperty({
    description: 'Filter by MIME type (partial match)',
    example: 'image/',
    required: false,
  })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiProperty({
    description: 'Filter by filename (partial match)',
    example: 'document',
    required: false,
  })
  @IsOptional()
  @IsString()
  filename?: string;

  @ApiProperty({
    description: 'Filter by tags',
    example: ['project', 'important'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => 
    Array.isArray(value) 
      ? value.map((tag: string) => tag.toLowerCase().trim()).filter(Boolean)
      : typeof value === 'string' 
        ? [value.toLowerCase().trim()]
        : []
  )
  tags?: string[];

  @ApiProperty({
    description: 'Filter by virus scan status',
    example: VirusScanStatus.CLEAN,
    enum: VirusScanStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(VirusScanStatus)
  virusScanStatus?: VirusScanStatus;

  @ApiProperty({
    description: 'Filter by processing status',
    example: FileProcessingStatus.COMPLETED,
    enum: FileProcessingStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(FileProcessingStatus)
  processingStatus?: FileProcessingStatus;

  @ApiProperty({
    description: 'Filter by archived status',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  isArchived?: boolean;

  @ApiProperty({
    description: 'Filter files created from this date (ISO string)',
    example: '2023-01-01T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'Date from must be a valid ISO date string' })
  dateFrom?: string;

  @ApiProperty({
    description: 'Filter files created until this date (ISO string)',
    example: '2023-12-31T23:59:59.999Z',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'Date to must be a valid ISO date string' })
  dateTo?: string;

  @ApiProperty({
    description: 'Page number for pagination',
    example: 1,
    required: false,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Page must be a valid number' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
    required: false,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Limit must be a valid number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit must not exceed 100' })
  limit?: number;

  @ApiProperty({
    description: 'Sort field',
    example: 'createdAt',
    required: false,
    enum: ['createdAt', 'filename', 'sizeBytes', 'downloadCount'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsEnum(['createdAt', 'filename', 'sizeBytes', 'downloadCount'], {
    message: 'Sort by must be one of: createdAt, filename, sizeBytes, downloadCount',
  })
  sortBy?: 'createdAt' | 'filename' | 'sizeBytes' | 'downloadCount';

  @ApiProperty({
    description: 'Sort order',
    example: 'DESC',
    required: false,
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'], { message: 'Sort order must be ASC or DESC' })
  sortOrder?: 'ASC' | 'DESC';
}
