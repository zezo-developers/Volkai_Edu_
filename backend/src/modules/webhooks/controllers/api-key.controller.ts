import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../database/entities/user.entity';
import { ApiKeyService } from '../services/api-key.service';
import { 
  CreateApiKeyDto,
  UpdateApiKeyDto,
  CreatePartnerKeyDto,
  CreateWebhookKeyDto,
  ApiKeyUsageQueryDto,
} from '../dto/api-key.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';

@ApiTags('API Keys')
@Controller('api-keys')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post()
  @ApiOperation({ summary: 'Create API key' })
  @ApiResponse({ status: 201, description: 'API key created successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN)
  async createApiKey(
    @Body() createDto: CreateApiKeyDto,
    @CurrentUser() user: any
  ) {
    const { apiKey, plainKey } = await this.apiKeyService.createApiKey(
      createDto,
      user.id
    );

    return {
      success: true,
      data: {
        apiKey: {
          ...apiKey,
          keyHash: undefined, // Don't expose hash
        },
        key: plainKey, // Only returned once
      },
      message: 'API key created successfully. Please save the key as it will not be shown again.',
    };
  }

  @Post('partner')
  @ApiOperation({ summary: 'Create partner API key' })
  @ApiResponse({ status: 201, description: 'Partner API key created successfully' })
  @Roles(Role.ADMIN, Role.ORGANIZATION_ADMIN)
  async createPartnerKey(
    @Body() createDto: CreatePartnerKeyDto,
    @CurrentUser() user: any
  ) {
    const { apiKey, plainKey } = await this.apiKeyService.createPartnerKey(
      createDto.name,
      createDto.scopes,
      user.id,
      createDto.organizationId,
      createDto.description
    );

    return {
      success: true,
      data: {
        apiKey: {
          ...apiKey,
          keyHash: undefined,
        },
        key: plainKey,
      },
      message: 'Partner API key created successfully. Please save the key as it will not be shown again.',
    };
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Create webhook API key' })
  @ApiResponse({ status: 201, description: 'Webhook API key created successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN)
  async createWebhookKey(
    @Body() createDto: CreateWebhookKeyDto,
    @CurrentUser() user: any
  ) {
    const { apiKey, plainKey } = await this.apiKeyService.createWebhookKey(
      createDto.name,
      createDto.webhookUrl,
      user.id,
      createDto.organizationId,
      createDto.description
    );

    return {
      success: true,
      data: {
        apiKey: {
          ...apiKey,
          keyHash: undefined,
        },
        key: plainKey,
      },
      message: 'Webhook API key created successfully. Please save the key as it will not be shown again.',
    };
  }

  @Get()
  @ApiOperation({ summary: 'List API keys' })
  @ApiResponse({ status: 200, description: 'API keys retrieved successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN, Role.ORGANIZATION_MEMBER)
  async getApiKeys(
    @Query('organizationId') organizationId?: string,
    @Query('includeInactive') includeInactive = false,
    @CurrentUser() user?: any
  ) {
    let apiKeys;

    if (user.role === Role.ADMIN) {
      // Admin can see all keys or filter by organization
      if (organizationId) {
        apiKeys = await this.apiKeyService.getApiKeysByOrganization(
          organizationId,
          includeInactive
        );
      } else {
        // Get system-level keys (no organization)
        apiKeys = await this.apiKeyService.getApiKeysByOrganization(
          null,
          includeInactive
        );
      }
    } else {
      // Users can only see their organization's keys or their own keys
      const orgId = organizationId || user.organizationId;
      if (orgId) {
        apiKeys = await this.apiKeyService.getApiKeysByOrganization(
          orgId,
          includeInactive
        );
      } else {
        apiKeys = await this.apiKeyService.getApiKeysByUser(
          user.id,
          includeInactive
        );
      }
    }

    // Remove sensitive data
    const sanitizedKeys = apiKeys.map(key => ({
      ...key,
      keyHash: undefined,
      credentials: undefined,
    }));

    return {
      success: true,
      data: sanitizedKeys,
      message: 'API keys retrieved successfully',
    };
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my API keys' })
  @ApiResponse({ status: 200, description: 'User API keys retrieved successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN, Role.ORGANIZATION_MEMBER)
  async getMyApiKeys(
    @Query('includeInactive') includeInactive = false,
    @CurrentUser() user: any
  ) {
    const apiKeys = await this.apiKeyService.getApiKeysByUser(
      user.id,
      includeInactive
    );

    const sanitizedKeys = apiKeys.map(key => ({
      ...key,
      keyHash: undefined,
      credentials: undefined,
    }));

    return {
      success: true,
      data: sanitizedKeys,
      message: 'Your API keys retrieved successfully',
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get API key details' })
  @ApiResponse({ status: 200, description: 'API key retrieved successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN, Role.ORGANIZATION_MEMBER)
  async getApiKey(@Param('id') id: string) {
    const apiKey = await this.apiKeyService.getApiKeyById(id);

    return {
      success: true,
      data: {
        ...apiKey,
        keyHash: undefined,
        credentials: undefined,
      },
      message: 'API key retrieved successfully',
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update API key' })
  @ApiResponse({ status: 200, description: 'API key updated successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN)
  async updateApiKey(
    @Param('id') id: string,
    @Body() updateDto: UpdateApiKeyDto
  ) {
    const apiKey = await this.apiKeyService.updateApiKey(id, updateDto);

    return {
      success: true,
      data: {
        ...apiKey,
        keyHash: undefined,
        credentials: undefined,
      },
      message: 'API key updated successfully',
    };
  }

  @Post(':id/regenerate')
  @ApiOperation({ summary: 'Regenerate API key' })
  @ApiResponse({ status: 200, description: 'API key regenerated successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN)
  async regenerateApiKey(@Param('id') id: string) {
    const { apiKey, plainKey } = await this.apiKeyService.regenerateApiKey(id);

    return {
      success: true,
      data: {
        apiKey: {
          ...apiKey,
          keyHash: undefined,
        },
        key: plainKey,
      },
      message: 'API key regenerated successfully. Please save the new key as it will not be shown again.',
    };
  }

  @Post(':id/revoke')
  @ApiOperation({ summary: 'Revoke API key' })
  @ApiResponse({ status: 200, description: 'API key revoked successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN)
  async revokeApiKey(
    @Param('id') id: string,
    @Body('reason') reason?: string
  ) {
    const apiKey = await this.apiKeyService.revokeApiKey(id, reason);

    return {
      success: true,
      data: {
        ...apiKey,
        keyHash: undefined,
        credentials: undefined,
      },
      message: 'API key revoked successfully',
    };
  }

  @Post(':id/suspend')
  @ApiOperation({ summary: 'Suspend API key' })
  @ApiResponse({ status: 200, description: 'API key suspended successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN)
  async suspendApiKey(
    @Param('id') id: string,
    @Body('reason') reason?: string
  ) {
    const apiKey = await this.apiKeyService.suspendApiKey(id, reason);

    return {
      success: true,
      data: {
        ...apiKey,
        keyHash: undefined,
        credentials: undefined,
      },
      message: 'API key suspended successfully',
    };
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate API key' })
  @ApiResponse({ status: 200, description: 'API key activated successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN)
  async activateApiKey(@Param('id') id: string) {
    const apiKey = await this.apiKeyService.activateApiKey(id);

    return {
      success: true,
      data: {
        ...apiKey,
        keyHash: undefined,
        credentials: undefined,
      },
      message: 'API key activated successfully',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete API key' })
  @ApiResponse({ status: 200, description: 'API key deleted successfully' })
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN)
  async deleteApiKey(@Param('id') id: string) {
    await this.apiKeyService.deleteApiKey(id);

    return {
      success: true,
      message: 'API key deleted successfully',
    };
  }

  @Get(':id/usage')
  @ApiOperation({ summary: 'Get API key usage analytics' })
  @ApiResponse({ status: 200, description: 'API key usage retrieved successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN, Role.ORGANIZATION_MEMBER)
  async getApiKeyUsage(
    @Param('id') id: string,
    @Query() queryDto: ApiKeyUsageQueryDto
  ) {
    const usage = await this.apiKeyService.getUsageAnalytics(
      id,
      queryDto.days
    );

    return {
      success: true,
      data: usage,
      message: 'API key usage analytics retrieved successfully',
    };
  }

  @Get(':id/rate-limit')
  @ApiOperation({ summary: 'Check API key rate limit status' })
  @ApiResponse({ status: 200, description: 'Rate limit status retrieved successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN, Role.ORGANIZATION_MEMBER)
  async checkRateLimit(@Param('id') id: string) {
    const apiKey = await this.apiKeyService.getApiKeyById(id);
    const rateLimitStatus = await this.apiKeyService.checkRateLimit(apiKey);

    return {
      success: true,
      data: rateLimitStatus,
      message: 'Rate limit status retrieved successfully',
    };
  }

  @Get('organization/:organizationId/usage')
  @ApiOperation({ summary: 'Get organization API usage analytics' })
  @ApiResponse({ status: 200, description: 'Organization usage analytics retrieved successfully' })
  @Roles(Role.ADMIN, Role.ORGANIZATION_ADMIN)
  async getOrganizationUsage(
    @Param('organizationId') organizationId: string,
    @Query() queryDto: ApiKeyUsageQueryDto
  ) {
    const usage = await this.apiKeyService.getOrganizationUsageAnalytics(
      organizationId,
      queryDto.days
    );

    return {
      success: true,
      data: usage,
      message: 'Organization usage analytics retrieved successfully',
    };
  }

  @Get('scopes/available')
  @ApiOperation({ summary: 'Get available API scopes' })
  @ApiResponse({ status: 200, description: 'Available scopes retrieved successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN, Role.ORGANIZATION_MEMBER)
  async getAvailableScopes() {
    const scopes = [
      {
        scope: 'user:read',
        description: 'Read user information',
        category: 'User Management',
      },
      {
        scope: 'user:write',
        description: 'Create and update users',
        category: 'User Management',
      },
      {
        scope: 'user:delete',
        description: 'Delete users',
        category: 'User Management',
      },
      {
        scope: 'org:read',
        description: 'Read organization information',
        category: 'Organization Management',
      },
      {
        scope: 'org:write',
        description: 'Create and update organizations',
        category: 'Organization Management',
      },
      {
        scope: 'org:admin',
        description: 'Full organization administration',
        category: 'Organization Management',
      },
      {
        scope: 'course:read',
        description: 'Read course information',
        category: 'Learning Management',
      },
      {
        scope: 'course:write',
        description: 'Create and update courses',
        category: 'Learning Management',
      },
      {
        scope: 'course:publish',
        description: 'Publish and unpublish courses',
        category: 'Learning Management',
      },
      {
        scope: 'assessment:read',
        description: 'Read assessment information',
        category: 'Assessment',
      },
      {
        scope: 'assessment:write',
        description: 'Create and update assessments',
        category: 'Assessment',
      },
      {
        scope: 'assessment:grade',
        description: 'Grade assessments',
        category: 'Assessment',
      },
      {
        scope: 'interview:read',
        description: 'Read interview information',
        category: 'Interview Management',
      },
      {
        scope: 'interview:write',
        description: 'Create and update interviews',
        category: 'Interview Management',
      },
      {
        scope: 'interview:schedule',
        description: 'Schedule interviews',
        category: 'Interview Management',
      },
      {
        scope: 'job:read',
        description: 'Read job postings',
        category: 'HR/ATS',
      },
      {
        scope: 'job:write',
        description: 'Create and update job postings',
        category: 'HR/ATS',
      },
      {
        scope: 'job:apply',
        description: 'Submit job applications',
        category: 'HR/ATS',
      },
      {
        scope: 'billing:read',
        description: 'Read billing information',
        category: 'Billing',
      },
      {
        scope: 'billing:write',
        description: 'Manage billing and subscriptions',
        category: 'Billing',
      },
      {
        scope: 'analytics:read',
        description: 'Read analytics data',
        category: 'Analytics',
      },
      {
        scope: 'analytics:write',
        description: 'Create analytics events',
        category: 'Analytics',
      },
      {
        scope: 'webhook:read',
        description: 'Read webhook information',
        category: 'Webhooks',
      },
      {
        scope: 'webhook:write',
        description: 'Create and update webhooks',
        category: 'Webhooks',
      },
      {
        scope: 'webhook:manage',
        description: 'Full webhook management',
        category: 'Webhooks',
      },
      {
        scope: 'admin:read',
        description: 'Read admin information',
        category: 'Administration',
      },
      {
        scope: 'admin:write',
        description: 'Perform admin operations',
        category: 'Administration',
      },
      {
        scope: 'admin:system',
        description: 'System administration',
        category: 'Administration',
      },
      {
        scope: '*',
        description: 'Full access to all resources',
        category: 'Special',
      },
      {
        scope: 'read:*',
        description: 'Read-only access to all resources',
        category: 'Special',
      },
    ];

    return {
      success: true,
      data: scopes,
      message: 'Available API scopes retrieved successfully',
    };
  }

  @Post('cleanup-expired')
  @ApiOperation({ summary: 'Cleanup expired API keys' })
  @ApiResponse({ status: 200, description: 'Expired API keys cleaned up successfully' })
  @Roles(Role.ADMIN)
  async cleanupExpiredKeys() {
    const count = await this.apiKeyService.cleanupExpiredKeys();

    return {
      success: true,
      data: { expiredKeysCount: count },
      message: `${count} expired API keys have been marked as expired`,
    };
  }

  @Get('system/stats')
  @ApiOperation({ summary: 'Get system API key statistics' })
  @ApiResponse({ status: 200, description: 'System statistics retrieved successfully' })
  @Roles(Role.ADMIN)
  async getSystemStats() {
    const stats = await this.apiKeyService.getSystemStats();

    return {
      success: true,
      data: stats,
      message: 'System API key statistics retrieved successfully',
    };
  }
}
