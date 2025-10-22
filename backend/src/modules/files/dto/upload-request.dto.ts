import { IsString, IsNumber, IsEnum, IsOptional, IsArray, Min, Max, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { FileAccessLevel } from '@database/entities/file.entity';
import { SanitizeText } from '@common/decorators/sanitize.decorator';

/**
 * Data Transfer Object for file upload request
 * Validates file metadata and upload parameters
 */
export class UploadRequestDto {
  @ApiProperty({
    description: 'Original filename with extension',
    example: 'document.pdf',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @MinLength(1, { message: 'Filename cannot be empty' })
  @MaxLength(255, { message: 'Filename must not exceed 255 characters' })
  @SanitizeText()
  filename: string;

  @ApiProperty({
    description: 'MIME type of the file',
    example: 'application/pdf',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100, { message: 'MIME type must not exceed 100 characters' })
  mimeType: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 1048576,
    minimum: 1,
    maximum: 104857600, // 100MB
  })
  @IsNumber({}, { message: 'Size must be a valid number' })
  @Min(1, { message: 'File size must be greater than 0' })
  @Max(104857600, { message: 'File size must not exceed 100MB' })
  sizeBytes: number;

  @ApiProperty({
    description: 'File access level',
    example: FileAccessLevel.PRIVATE,
    enum: FileAccessLevel,
    required: false,
    default: FileAccessLevel.PRIVATE,
  })
  @IsOptional()
  @IsEnum(FileAccessLevel, { message: 'Access level must be a valid value' })
  accessLevel?: FileAccessLevel;

  @ApiProperty({
    description: 'File description (optional)',
    example: 'Important project document',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  @SanitizeText()
  description?: string;

  @ApiProperty({
    description: 'File tags for categorization (optional)',
    example: ['project', 'document', 'important'],
    required: false,
    type: [String],
    maxItems: 10,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => 
    Array.isArray(value) 
      ? value.slice(0, 10).map((tag: string) => tag.toLowerCase().trim()).filter(Boolean)
      : []
  )
  tags?: string[];

  @ApiProperty({
    description: 'Upload URL expiration time in hours (optional)',
    example: 1,
    required: false,
    minimum: 1,
    maximum: 24,
    default: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Expiration time must be a valid number' })
  @Min(1, { message: 'Expiration time must be at least 1 hour' })
  @Max(24, { message: 'Expiration time must not exceed 24 hours' })
  expiresIn?: number;
}
