import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@modules/auth/guards/permissions.guard';
import { RequirePermissions } from '@modules/auth/decorators/permissions.decorator';
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '@modules/auth/strategies/jwt.strategy';
import { Organization } from '@database/entities/organization.entity';
import { OrganizationMembership } from '@database/entities/organization-membership.entity';

/**
 * Organizations Controller
 * Handles organization management, member invitations, and multi-tenancy operations
 */
@ApiTags('Organizations')
@Controller('orgs')
// @UseGuards(JwtAuthGuard, PermissionsGuard)
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  /**
   * Get user's organizations
   */
  @Get()
  @ApiOperation({
    summary: 'Get user organizations',
    description: 'Get all organizations the current user is a member of',
  })
  @ApiResponse({
    status: 200,
    description: 'Organizations retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Organizations retrieved successfully' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'uuid' },
              name: { type: 'string', example: 'Acme Corporation' },
              slug: { type: 'string', example: 'acme-corporation' },
              status: { type: 'string', example: 'active' },
              createdAt: { type: 'string', example: '2023-01-01T00:00:00.000Z' },
            },
          },
        },
      },
    },
  })
  async getUserOrganizations(@CurrentUser() currentUser: AuthenticatedUser): Promise<Organization[]> {
    return this.organizationsService.getUserOrganizations(currentUser.id);
  }

  /**
   * Create new organization
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create organization',
    description: 'Create a new organization and become its owner',
  })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        statusCode: { type: 'number', example: 201 },
        message: { type: 'string', example: 'Organization created successfully' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid' },
            name: { type: 'string', example: 'Acme Corporation' },
            slug: { type: 'string', example: 'acme-corporation' },
            status: { type: 'string', example: 'trial' },
            createdAt: { type: 'string', example: '2023-01-01T00:00:00.000Z' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Domain already in use',
  })
  async createOrganization(
    @Body() createOrganizationDto: CreateOrganizationDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<Organization> {
    console.log('user 324: ', currentUser);
    return this.organizationsService.createOrganization(createOrganizationDto, currentUser);
  }

  /**
   * Get organization details
   */
  @Get(':orgId')
  // @RequirePermissions('read:organization')
  @ApiOperation({
    summary: 'Get organization details',
    description: 'Get detailed information about an organization including member count and usage stats',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization details retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Organization details retrieved successfully' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid' },
            name: { type: 'string', example: 'Acme Corporation' },
            slug: { type: 'string', example: 'acme-corporation' },
            domain: { type: 'string', example: 'acme.com' },
            website: { type: 'string', example: 'https://www.acme.com' },
            industry: { type: 'string', example: 'Technology' },
            size: { type: 'string', example: 'medium' },
            status: { type: 'string', example: 'active' },
            memberCount: { type: 'number', example: 25 },
            usage: {
              type: 'object',
              properties: {
                users: { type: 'number', example: 25 },
                courses: { type: 'number', example: 10 },
                jobs: { type: 'number', example: 5 },
                storage: { type: 'number', example: 1024 },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied to this organization',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
  })
  async getOrganizationById(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<Organization & { memberCount: number; usage: any }> {
    return this.organizationsService.getOrganizationById(orgId, currentUser);
  }

  /**
   * Update organization
   */
  @Patch(':orgId')
  // @RequirePermissions('manage:organization')
  @ApiOperation({
    summary: 'Update organization',
    description: 'Update organization information (admin/owner only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization updated successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: 409,
    description: 'Domain already in use',
  })
  async updateOrganization(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<Organization> {
    return this.organizationsService.updateOrganization(orgId, updateOrganizationDto, currentUser);
  }

  /**
   * Delete organization
   */
  @Delete(':orgId')
  @HttpCode(HttpStatus.OK)
  // @RequirePermissions('manage:organization')
  @ApiOperation({
    summary: 'Delete organization',
    description: 'Delete organization (owner only) - soft delete',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Only organization owner can delete',
  })
  async deleteOrganization(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    return this.organizationsService.deleteOrganization(orgId, currentUser);
  }

  /**
   * Get organization members
   */
  @Get(':orgId/members')
  // @RequirePermissions('read:users')
  @ApiOperation({
    summary: 'Get organization members',
    description: 'Get all members of the organization with filtering and pagination',
  })
  @ApiQuery({ name: 'role', required: false, description: 'Filter by member role' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by member status' })
  @ApiQuery({ name: 'q', required: false, description: 'Search query for name or email' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 20)' })
  @ApiResponse({
    status: 200,
    description: 'Organization members retrieved successfully',
  })
  async getOrganizationMembers(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentUser() currentUser?: AuthenticatedUser,
  ): Promise<{
    members: Array<OrganizationMembership & { user: any }>;
    total: number;
    page: number;
    limit: number;
  }> {
    return this.organizationsService.getOrganizationMembers(orgId, currentUser, {
      role,
      status,
      q,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /**
   * Invite member to organization
   */
  @Post(':orgId/members')
  // @RequirePermissions('manage:users')
  @ApiOperation({
    summary: 'Invite member',
    description: 'Invite a new member to the organization',
  })
  @ApiResponse({
    status: 201,
    description: 'Member invited successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        statusCode: { type: 'number', example: 201 },
        message: { type: 'string', example: 'Member invited successfully' },
        data: {
          type: 'object',
          properties: {
            invitation: {
              type: 'object',
              properties: {
                id: { type: 'string', example: 'uuid' },
                role: { type: 'string', example: 'admin' },
                status: { type: 'string', example: 'invited' },
                invitedAt: { type: 'string', example: '2023-01-01T00:00:00.000Z' },
              },
            },
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
    status: 409,
    description: 'User is already a member',
  })
  async inviteMember(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() inviteMemberDto: InviteMemberDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<{ invitation: OrganizationMembership }> {
    return this.organizationsService.inviteMember(orgId, inviteMemberDto, currentUser);
  }

  /**
   * Update member role or status
   */
  @Patch(':orgId/members/:userId')
  // @RequirePermissions('manage:users')
  @ApiOperation({
    summary: 'Update member',
    description: 'Update member role or status in the organization',
  })
  @ApiResponse({
    status: 200,
    description: 'Member updated successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions or cannot update owner',
  })
  async updateMember(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() updateMemberDto: UpdateMemberDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<OrganizationMembership> {
    return this.organizationsService.updateMember(orgId, userId, updateMemberDto, currentUser);
  }

  /**
   * Remove member from organization
   */
  @Delete(':orgId/members/:userId')
  @HttpCode(HttpStatus.OK)
  // @RequirePermissions('manage:users')
  @ApiOperation({
    summary: 'Remove member',
    description: 'Remove member from the organization',
  })
  @ApiResponse({
    status: 200,
    description: 'Member removed successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions or cannot remove owner/self',
  })
  async removeMember(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    return this.organizationsService.removeMember(orgId, userId, currentUser);
  }

  /**
   * Get organization settings
   */
  @Get(':orgId/settings')
  // @RequirePermissions('read:organization')
  @ApiOperation({
    summary: 'Get organization settings',
    description: 'Get organization configuration settings',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization settings retrieved successfully',
  })
  async getOrganizationSettings(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<Record<string, unknown>> {
    return this.organizationsService.getOrganizationSettings(orgId, currentUser);
  }

  /**
   * Update organization settings
   */
  @Patch(':orgId/settings')
  // @RequirePermissions('manage:organization')
  @ApiOperation({
    summary: 'Update organization settings',
    description: 'Update organization configuration settings',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization settings updated successfully',
  })
  async updateOrganizationSettings(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() settings: Record<string, unknown>,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<Record<string, unknown>> {
    return this.organizationsService.updateOrganizationSettings(orgId, settings, currentUser);
  }

  /**
   * Switch current organization context
   */
  @Post(':orgId/switch')
  // @RequirePermissions('read:organization')
  @ApiOperation({
    summary: 'Switch organization context',
    description: 'Switch the current user context to a different organization',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization context switched successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Organization context switched successfully' },
        data: {
          type: 'object',
          properties: {
            organizationId: { type: 'string', example: 'uuid' },
            organizationName: { type: 'string', example: 'Acme Corporation' },
            role: { type: 'string', example: 'admin' },
            permissions: {
              type: 'array',
              items: { type: 'string' },
              example: ['read:users', 'write:users', 'manage:organization'],
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied to this organization',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found or user not a member',
  })
  async switchOrganization(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<{
    organizationId: string;
    organizationName: string;
    role: string;
    permissions: string[];
  }> {
    return this.organizationsService.switchOrganizationContext(orgId, currentUser);
  }

  /**
   * Get organization audit logs
   */
  @Get(':orgId/audit-logs')
  // @RequirePermissions('read:organization')
  @ApiOperation({
    summary: 'Get organization audit logs',
    description: 'Get audit logs for organization activities with filtering and pagination',
  })
  @ApiQuery({ name: 'action', required: false, description: 'Filter by action type' })
  @ApiQuery({ name: 'actorId', required: false, description: 'Filter by actor user ID' })
  @ApiQuery({ name: 'resourceType', required: false, description: 'Filter by resource type' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Filter from date (ISO string)' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Filter to date (ISO string)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 50)' })
  @ApiResponse({
    status: 200,
    description: 'Audit logs retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Audit logs retrieved successfully' },
        data: {
          type: 'object',
          properties: {
            logs: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'uuid' },
                  action: { type: 'string', example: 'user.create' },
                  resourceType: { type: 'string', example: 'user' },
                  resourceId: { type: 'string', example: 'uuid' },
                  actorName: { type: 'string', example: 'John Doe' },
                  createdAt: { type: 'string', example: '2023-01-01T00:00:00.000Z' },
                  metadata: { type: 'object', example: {} },
                },
              },
            },
            total: { type: 'number', example: 150 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 50 },
          },
        },
      },
    },
  })
  async getOrganizationAuditLogs(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Query('action') action?: string,
    @Query('actorId') actorId?: string,
    @Query('resourceType') resourceType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentUser() currentUser?: AuthenticatedUser,
  ): Promise<{
    logs: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.organizationsService.getOrganizationAuditLogs(orgId, currentUser, {
      action,
      actorId,
      resourceType,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
