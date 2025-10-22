import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@database/entities/user.entity';
import { OrganizationMembership } from '@database/entities/organization-membership.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

/**
 * Users Module
 * Provides user management functionality within organization context
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([User, OrganizationMembership]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
