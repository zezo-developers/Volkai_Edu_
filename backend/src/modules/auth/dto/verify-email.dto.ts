import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data Transfer Object for email verification
 * Validates verification token for email confirmation
 */
export class VerifyEmailDto {
  @ApiProperty({
    description: 'Email verification token received via email',
    example: 'verify_1234567890abcdef',
  })
  @IsString()
  token: string;
}
