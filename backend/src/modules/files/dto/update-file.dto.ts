import { IsString, IsEnum, IsOptional, IsArray, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { FileAccessLevel } from '@database/entities/file.entity';
import { SanitizeText } from '@common/decorators/sanitize.decorator';

/**
 * Data Transfer Object for updating file metadata
 * Allows partial updates to file properties
 */
export class UpdateFileDto {
  @ApiProperty({
    description: 'New filename (without changing the actual file)',
    example: 'updated-document.pdf',
    required: false,
    minLength: 1,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Filename cannot be empty' })
  @MaxLength(255, { message: 'Filename must not exceed 255 characters' })
  @SanitizeText()
  filename?: string;

  @ApiProperty({
    description: 'File description',
    example: 'Updated project document with latest changes',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  @SanitizeText()
  description?: string;

  @ApiProperty({
    description: 'File tags for categorization',
    example: ['project', 'document', 'updated'],
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
    description: 'File access level',
    example: FileAccessLevel.ORGANIZATION,
    enum: FileAccessLevel,
    required: false,
  })
  @IsOptional()
  @IsEnum(FileAccessLevel, { message: 'Access level must be a valid value' })
  accessLevel?: FileAccessLevel;
}
