import {
  Controller,
  Get,
  Patch,
  Delete,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@modules/auth/guards/permissions.guard';
import { RequirePermissions } from '@modules/auth/decorators/permissions.decorator';
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '@modules/auth/strategies/jwt.strategy';
import { User } from '@/database/entities/user.entity';
import { OrganizationMembership } from '@database/entities/organization-membership.entity';

/**
 * Users Controller
 * Handles user management operations within organization context
 */
@ApiTags('Users')
@Controller('users')
// @UseGuards(JwtAuthGuard, PermissionsGuard)
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Get users in current organization
   */
  @Get()
  @RequirePermissions('users:read')
  @ApiOperation({
    summary: 'Get organization users',
    description: 'Get all users in the current organization with optional filtering and pagination',
  })
  @ApiQuery({ name: 'q', required: false, description: 'Search query for name or email' })
  @ApiQuery({ name: 'role', required: false, description: 'Filter by user role' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by user status' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 20)' })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Users retrieved successfully' },
        data: {
          type: 'object',
          properties: {
            users: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'uuid' },
                  email: { type: 'string', example: 'john.doe@example.com' },
                  firstName: { type: 'string', example: 'John' },
                  lastName: { type: 'string', example: 'Doe' },
                  membership: {
                    type: 'object',
                    properties: {
                      role: { type: 'string', example: 'admin' },
                      status: { type: 'string', example: 'active' },
                      joinedAt: { type: 'string', example: '2023-01-01T00:00:00.000Z' },
                    },
                  },
                },
              },
            },
            total: { type: 'number', example: 50 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 20 },
          },
        },
      },
    },
  })
  async getUsers(
    @Query('q') q?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentUser() currentUser?: AuthenticatedUser,
  ): Promise<{
    users: Array<User & { membership: OrganizationMembership }>;
    total: number;
    page: number;
    limit: number;
  }> {
    return this.usersService.getUsers(currentUser, {
      q,
      role,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /**
   * Get user by ID
   */
  @Get(':id')
  @RequirePermissions('users:read')
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Get detailed information about a specific user in the organization',
  })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'User retrieved successfully' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid' },
            email: { type: 'string', example: 'john.doe@example.com' },
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            phone: { type: 'string', example: '+1234567890' },
            avatarUrl: { type: 'string', example: 'https://example.com/avatar.jpg' },
            membership: {
              type: 'object',
              properties: {
                role: { type: 'string', example: 'admin' },
                status: { type: 'string', example: 'active' },
                joinedAt: { type: 'string', example: '2023-01-01T00:00:00.000Z' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found in organization',
  })
  async getUserById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<User & { membership: OrganizationMembership }> {
    return this.usersService.getUserById(id, currentUser);
  }

  /**
   * Update user profile
   */
  @Patch(':id')
  @RequirePermissions('users:write')
  @ApiOperation({
    summary: 'Update user profile',
    description: 'Update user profile information (users can update their own profile, admins can update any user)',
  })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'User updated successfully' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid' },
            email: { type: 'string', example: 'john.doe@example.com' },
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            phone: { type: 'string', example: '+1234567890' },
            timezone: { type: 'string', example: 'America/New_York' },
            locale: { type: 'string', example: 'en' },
            updatedAt: { type: 'string', example: '2023-01-01T00:00:00.000Z' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Phone number already in use',
  })
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<User> {
    return this.usersService.updateUser(id, updateUserDto, currentUser);
  }

  /**
   * Upload user avatar
   */
  @Post(':id/avatar')
  @RequirePermissions('users:write')
  @ApiOperation({
    summary: 'Upload user avatar',
    description: 'Upload avatar image for user profile',
  })
  @ApiResponse({
    status: 200,
    description: 'Avatar uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Avatar uploaded successfully' },
        data: {
          type: 'object',
          properties: {
            avatarUrl: { type: 'string', example: 'https://example.com/avatar.jpg' },
          },
        },
      },
    },
  })
  async uploadAvatar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('avatarUrl') avatarUrl: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<{ avatarUrl: string }> {
    return this.usersService.uploadAvatar(id, avatarUrl, currentUser);
  }

  /**
   * Deactivate user
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('users:delete')
  @ApiOperation({
    summary: 'Deactivate user',
    description: 'Deactivate user account (soft delete) - only admins can perform this action',
  })
  @ApiResponse({
    status: 200,
    description: 'User deactivated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'User deactivated successfully' },
        data: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions or cannot deactivate own account/organization owner',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async deactivateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    return this.usersService.deactivateUser(id, currentUser);
  }

  /**
   * Reactivate user
   */
  @Post(':id/reactivate')
  @RequirePermissions('users:write')
  @ApiOperation({
    summary: 'Reactivate user',
    description: 'Reactivate previously deactivated user - only admins can perform this action',
  })
  @ApiResponse({
    status: 200,
    description: 'User reactivated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'User reactivated successfully' },
        data: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Inactive user not found',
  })
  async reactivateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    return this.usersService.reactivateUser(id, currentUser);
  }

  /**
   * Get user's organization memberships
   */
  @Get(':id/memberships')
  @RequirePermissions('users:read')
  @ApiOperation({
    summary: 'Get user memberships',
    description: 'Get all organization memberships for a user',
  })
  @ApiResponse({
    status: 200,
    description: 'User memberships retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'User memberships retrieved successfully' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'uuid' },
              role: { type: 'string', example: 'admin' },
              status: { type: 'string', example: 'active' },
              joinedAt: { type: 'string', example: '2023-01-01T00:00:00.000Z' },
              organization: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'uuid' },
                  name: { type: 'string', example: 'Acme Corporation' },
                  slug: { type: 'string', example: 'acme-corporation' },
                },
              },
            },
          },
        },
      },
    },
  })
  async getUserMemberships(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrganizationMembership[]> {
    return this.usersService.getUserMemberships(id);
  }
}
