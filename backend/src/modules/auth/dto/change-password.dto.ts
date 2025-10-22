import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword, IsSecureString } from '@common/decorators/validate-input.decorator';

/**
 * Data Transfer Object for password change
 * Validates current password and new password for secure password updates
 */
export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password for verification',
    example: 'CurrentPassword123!',
  })
  @IsSecureString({ message: 'Current password is required' })
  currentPassword: string;

  @ApiProperty({
    description: 'New password (minimum 12 characters, must be strong and not breached)',
    example: 'NewSecurePass123!@#',
    minLength: 12,
    maxLength: 128,
  })
  @IsStrongPassword({ 
    message: 'New password must be at least 12 characters long, contain uppercase, lowercase, numbers, and special characters. It must not be a common password or found in data breaches.' 
  })
  newPassword: string;

  @ApiProperty({
    description: 'Confirm new password (must match new password)',
    example: 'NewSecurePass123!@#',
  })
  @IsSecureString({ message: 'Password confirmation is required' })
  confirmPassword: string;
}
