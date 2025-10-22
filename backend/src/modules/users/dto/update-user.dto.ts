import { IsString, IsOptional, MaxLength, MinLength, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data Transfer Object for updating user profile
 * Allows partial updates to user information
 */
export class UpdateUserDto {
  @ApiProperty({
    description: 'User first name',
    example: 'John',
    required: false,
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'First name must not be empty' })
  @MaxLength(100, { message: 'First name must not exceed 100 characters' })
  firstName?: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    required: false,
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Last name must not be empty' })
  @MaxLength(100, { message: 'Last name must not exceed 100 characters' })
  lastName?: string;

  @ApiProperty({
    description: 'User phone number',
    example: '+1234567890',
    required: false,
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Phone number must not exceed 20 characters' })
  phone?: string;

  @ApiProperty({
    description: 'User timezone',
    example: 'America/New_York',
    required: false,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Timezone must not exceed 50 characters' })
  timezone?: string;

  @ApiProperty({
    description: 'User locale/language preference',
    example: 'en',
    required: false,
    enum: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko'], {
    message: 'Locale must be a supported language code',
  })
  locale?: string;
}
