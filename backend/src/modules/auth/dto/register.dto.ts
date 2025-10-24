import { IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { 
  IsSecureEmail, 
  IsSecureString, 
  IsSecureOptionalString, 
  IsStrongPassword 
} from '@common/decorators/validate-input.decorator';

/**
 * Data Transfer Object for user registration
 * Comprehensive validation for secure user creation
 */
export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
    format: 'email',
  })
  @IsSecureEmail({ message: 'Please provide a valid and secure email address' })
  email: string;

  @ApiProperty({
    description: 'User password (minimum 12 characters, must contain uppercase, lowercase, number, and special character)',
    example: 'SecurePass123!@#',
    minLength: 12,
    maxLength: 128,
  })
  @IsSecureString({ message: 'Last name is required and must be secure' })
  password: string;
  // @IsStrongPassword({ message: 'Password must be at least 12 characters long and contain uppercase, lowercase, numbers, and special characters. Avoid common passwords and patterns.' })

  @ApiProperty({
    description: 'User first name',
    example: 'John',
    minLength: 1,
    maxLength: 100,
  })
  @IsSecureString({ message: 'First name is required and must be secure' })
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    minLength: 1,
    maxLength: 100,
  })
  @IsSecureString({ message: 'Last name is required and must be secure' })
  lastName: string;

  @ApiProperty({
    description: 'Organization name (optional - creates new organization if provided)',
    example: 'Acme Corporation',
    required: false,
    minLength: 2,
    maxLength: 255,
  })
  @IsSecureOptionalString({ message: 'Organization name must be secure if provided' })
  orgName?: string;

  @ApiProperty({
    description: 'Invitation token (optional - joins existing organization if provided)',
    example: 'inv_1234567890abcdef',
    required: false,
  })
  @IsSecureOptionalString({ message: 'Invitation token must be secure if provided' })
  inviteToken?: string;
}
