import { IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MembershipRole } from '@database/entities/organization-membership.entity';

/**
 * Data Transfer Object for inviting organization member
 */
export class InviteMemberDto {
  @ApiProperty({
    description: 'Email address of the user to invite',
    example: 'john.doe@example.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    description: 'Role to assign to the invited user',
    example: 'admin',
    enum: MembershipRole,
  })
  @IsIn(Object.values(MembershipRole), {
    message: 'Role must be one of: owner, admin, manager, hr, interviewer, learner',
  })
  role: MembershipRole;

  @ApiProperty({
    description: 'Optional invitation message',
    example: 'Welcome to our organization! We are excited to have you join our team.',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Invitation message must not exceed 500 characters' })
  message?: string;
}
