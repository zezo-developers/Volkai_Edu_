import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from '@database/entities/organization.entity';
import { OrganizationMembership } from '@database/entities/organization-membership.entity';
import { User } from '@/database/entities/user.entity';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

/**
 * Organizations Module
 * Provides organization management, member invitations, and multi-tenancy functionality
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Organization, OrganizationMembership, User]),
  ],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
