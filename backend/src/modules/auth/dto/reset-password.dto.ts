import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword, IsSecureString } from '@common/decorators/validate-input.decorator';

/**
 * Data Transfer Object for password reset
 * Validates token and new password for secure password reset
 */
export class ResetPasswordDto {
  @ApiProperty({
    description: 'Password reset token received via email',
    example: 'reset_1234567890abcdef',
  })
  @IsSecureString({ message: 'Invalid reset token format' })
  token: string;

  @ApiProperty({
    description: 'New password (minimum 12 characters, must be strong and not breached)',
    example: 'NewSecurePass123!@#',
    minLength: 12,
    maxLength: 128,
  })
  @IsStrongPassword({ 
    message: 'Password must be at least 12 characters long, contain uppercase, lowercase, numbers, and special characters. It must not be a common password or found in data breaches.' 
  })
  newPassword: string;
}
