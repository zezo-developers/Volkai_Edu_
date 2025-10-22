import { IsString, IsOptional, MinLength, MaxLength, IsIn, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrganizationSize } from '@database/entities/organization.entity';

/**
 * Data Transfer Object for creating organization
 */
export class CreateOrganizationDto {
  @ApiProperty({
    description: 'Organization name',
    example: 'Acme Corporation',
    minLength: 2,
    maxLength: 255,
  })
  @IsString()
  @MinLength(2, { message: 'Organization name must be at least 2 characters long' })
  @MaxLength(255, { message: 'Organization name must not exceed 255 characters' })
  name: string;

  @ApiProperty({
    description: 'Organization domain (optional)',
    example: 'acme.com',
    required: false,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Domain must not exceed 255 characters' })
  domain?: string;

  @ApiProperty({
    description: 'Organization website URL (optional)',
    example: 'https://www.acme.com',
    required: false,
    maxLength: 255,
  })
  @IsOptional()
  @IsUrl({}, { message: 'Website must be a valid URL' })
  @MaxLength(255, { message: 'Website URL must not exceed 255 characters' })
  website?: string;

  @ApiProperty({
    description: 'Industry sector (optional)',
    example: 'Technology',
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Industry must not exceed 100 characters' })
  industry?: string;

  @ApiProperty({
    description: 'Organization size (optional)',
    example: 'medium',
    required: false,
    enum: OrganizationSize,
  })
  @IsOptional()
  @IsIn(Object.values(OrganizationSize), {
    message: 'Size must be one of: startup, small, medium, large, enterprise',
  })
  size?: OrganizationSize;
}
