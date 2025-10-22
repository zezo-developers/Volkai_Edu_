import { IsString, IsOptional, MinLength, MaxLength, IsIn, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrganizationSize } from '@database/entities/organization.entity';

/**
 * Data Transfer Object for updating organization
 */
export class UpdateOrganizationDto {
  @ApiProperty({
    description: 'Organization name',
    example: 'Acme Corporation',
    required: false,
    minLength: 2,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Organization name must be at least 2 characters long' })
  @MaxLength(255, { message: 'Organization name must not exceed 255 characters' })
  name?: string;

  @ApiProperty({
    description: 'Organization domain',
    example: 'acme.com',
    required: false,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Domain must not exceed 255 characters' })
  domain?: string;

  @ApiProperty({
    description: 'Organization website URL',
    example: 'https://www.acme.com',
    required: false,
    maxLength: 255,
  })
  @IsOptional()
  @IsUrl({}, { message: 'Website must be a valid URL' })
  @MaxLength(255, { message: 'Website URL must not exceed 255 characters' })
  website?: string;

  @ApiProperty({
    description: 'Industry sector',
    example: 'Technology',
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Industry must not exceed 100 characters' })
  industry?: string;

  @ApiProperty({
    description: 'Organization size',
    example: 'medium',
    required: false,
    enum: OrganizationSize,
  })
  @IsOptional()
  @IsIn(Object.values(OrganizationSize), {
    message: 'Size must be one of: startup, small, medium, large, enterprise',
  })
  size?: OrganizationSize;

  @ApiProperty({
    description: 'Organization timezone',
    example: 'America/New_York',
    required: false,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Timezone must not exceed 50 characters' })
  timezone?: string;
}
