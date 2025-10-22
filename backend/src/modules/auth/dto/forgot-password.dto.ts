import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data Transfer Object for forgot password request
 * Validates email for password reset flow
 */
export class ForgotPasswordDto {
  @ApiProperty({
    description: 'User email address for password reset',
    example: 'john.doe@example.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;
}
