import { IsIn, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MembershipRole, MembershipStatus } from '@database/entities/organization-membership.entity';

/**
 * Data Transfer Object for updating organization member
 */
export class UpdateMemberDto {
  @ApiProperty({
    description: 'Member role',
    example: 'admin',
    required: false,
    enum: MembershipRole,
  })
  @IsOptional()
  @IsIn(Object.values(MembershipRole), {
    message: 'Role must be one of: owner, admin, manager, hr, interviewer, learner',
  })
  role?: MembershipRole;

  @ApiProperty({
    description: 'Member status',
    example: 'active',
    required: false,
    enum: ['active', 'inactive'],
  })
  @IsOptional()
  @IsIn(['active', 'inactive'], {
    message: 'Status must be either active or inactive',
  })
  status?: 'active' | 'inactive';
}
