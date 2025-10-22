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
  Redirect,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../database/entities/user.entity';
import { IntegrationService } from '../services/integration.service';
import { IntegrationType, IntegrationProvider } from '../../../database/entities/integration.entity';
import { 
  CreateIntegrationDto,
  UpdateIntegrationDto,
  CreateCalendarIntegrationDto,
  CreateVideoIntegrationDto,
  CreateSocialLoginIntegrationDto,
  CreateJobBoardIntegrationDto,
  CreateMeetingDto,
  SyncIntegrationDto,
} from '../dto/integration.dto';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

@ApiTags('Integrations')
@Controller('integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class IntegrationController {
  constructor(private readonly integrationService: IntegrationService) {}

  @Post()
  @ApiOperation({ summary: 'Create integration' })
  @ApiResponse({ status: 201, description: 'Integration created successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN)
  async createIntegration(
    @Body() createDto: CreateIntegrationDto,
    @CurrentUser() user: any
  ) {
    const integration = await this.integrationService.createIntegration(
      createDto,
      user.id
    );

    return {
      success: true,
      data: integration,
      message: 'Integration created successfully',
    };
  }

  @Post('calendar')
  @ApiOperation({ summary: 'Create calendar integration' })
  @ApiResponse({ status: 201, description: 'Calendar integration created successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN)
  async createCalendarIntegration(
    @Body() createDto: CreateCalendarIntegrationDto,
    @CurrentUser() user: any
  ) {
    const integration = await this.integrationService.createCalendarIntegration(
      createDto.name,
      createDto.provider,
      createDto.oauthConfig,
      user.id,
      createDto.organizationId
    );

    return {
      success: true,
      data: integration,
      message: 'Calendar integration created successfully',
    };
  }

  @Post('video-conferencing')
  @ApiOperation({ summary: 'Create video conferencing integration' })
  @ApiResponse({ status: 201, description: 'Video conferencing integration created successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN)
  async createVideoConferencingIntegration(
    @Body() createDto: CreateVideoIntegrationDto,
    @CurrentUser() user: any
  ) {
    const integration = await this.integrationService.createVideoConferencingIntegration(
      createDto.name,
      createDto.provider,
      createDto.oauthConfig,
      user.id,
      createDto.organizationId
    );

    return {
      success: true,
      data: integration,
      message: 'Video conferencing integration created successfully',
    };
  }

  @Post('social-login')
  @ApiOperation({ summary: 'Create social login integration' })
  @ApiResponse({ status: 201, description: 'Social login integration created successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN)
  async createSocialLoginIntegration(
    @Body() createDto: CreateSocialLoginIntegrationDto,
    @CurrentUser() user: any
  ) {
    const integration = await this.integrationService.createSocialLoginIntegration(
      createDto.name,
      createDto.provider,
      createDto.oauthConfig,
      user.id,
      createDto.organizationId
    );

    return {
      success: true,
      data: integration,
      message: 'Social login integration created successfully',
    };
  }

  @Post('job-board')
  @ApiOperation({ summary: 'Create job board integration' })
  @ApiResponse({ status: 201, description: 'Job board integration created successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN)
  async createJobBoardIntegration(
    @Body() createDto: CreateJobBoardIntegrationDto,
    @CurrentUser() user: any
  ) {
    const integration = await this.integrationService.createJobBoardIntegration(
      createDto.name,
      createDto.provider,
      createDto.apiConfig,
      user.id,
      createDto.organizationId
    );

    return {
      success: true,
      data: integration,
      message: 'Job board integration created successfully',
    };
  }

  @Get()
  @ApiOperation({ summary: 'List integrations' })
  @ApiResponse({ status: 200, description: 'Integrations retrieved successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN, Role.ORGANIZATION_MEMBER)
  async getIntegrations(
    @Query('organizationId') organizationId?: string,
    @Query('type') type?: IntegrationType,
    @CurrentUser() user?: any
  ) {
    let integrations;

    if (user.role === Role.ADMIN) {
      // Admin can see all integrations
      if (organizationId) {
        integrations = await this.integrationService.getIntegrationsByOrganization(
          organizationId,
          type
        );
      } else if (type) {
        integrations = await this.integrationService.getIntegrationsByType(type);
      } else {
        // Get system integrations (no organization)
        integrations = await this.integrationService.getIntegrationsByOrganization(
          null,
          type
        );
      }
    } else {
      // Users can only see their organization's integrations
      const orgId = organizationId || user.organizationId;
      integrations = await this.integrationService.getIntegrationsByOrganization(
        orgId,
        type
      );
    }

    // Remove sensitive credentials
    const sanitizedIntegrations = integrations.map(integration => ({
      ...integration,
      credentials: {
        ...integration.credentials,
        accessToken: integration.credentials.accessToken ? '[REDACTED]' : undefined,
        refreshToken: integration.credentials.refreshToken ? '[REDACTED]' : undefined,
        apiKey: integration.credentials.apiKey ? '[REDACTED]' : undefined,
        apiSecret: integration.credentials.apiSecret ? '[REDACTED]' : undefined,
        password: integration.credentials.password ? '[REDACTED]' : undefined,
      },
      config: {
        ...integration.config,
        oauth: integration.config.oauth ? {
          ...integration.config.oauth,
          clientSecret: integration.config.oauth.clientSecret ? '[REDACTED]' : undefined,
        } : undefined,
        api: integration.config.api ? {
          ...integration.config.api,
          apiSecret: integration.config.api.apiSecret ? '[REDACTED]' : undefined,
        } : undefined,
      },
    }));

    return {
      success: true,
      data: sanitizedIntegrations,
      message: 'Integrations retrieved successfully',
    };
  }

  @Get('types')
  @ApiOperation({ summary: 'Get available integration types and providers' })
  @ApiResponse({ status: 200, description: 'Integration types retrieved successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN, Role.ORGANIZATION_MEMBER)
  async getIntegrationTypes() {
    const types = [
      {
        type: IntegrationType.CALENDAR,
        name: 'Calendar Integration',
        description: 'Sync events with calendar providers',
        providers: [
          {
            provider: IntegrationProvider.GOOGLE_CALENDAR,
            name: 'Google Calendar',
            description: 'Integrate with Google Calendar',
            authType: 'oauth',
          },
          {
            provider: IntegrationProvider.OUTLOOK_CALENDAR,
            name: 'Outlook Calendar',
            description: 'Integrate with Microsoft Outlook Calendar',
            authType: 'oauth',
          },
          {
            provider: IntegrationProvider.APPLE_CALENDAR,
            name: 'Apple Calendar',
            description: 'Integrate with Apple Calendar (iCloud)',
            authType: 'oauth',
          },
        ],
      },
      {
        type: IntegrationType.VIDEO_CONFERENCING,
        name: 'Video Conferencing',
        description: 'Create and manage video meetings',
        providers: [
          {
            provider: IntegrationProvider.ZOOM,
            name: 'Zoom',
            description: 'Integrate with Zoom for video meetings',
            authType: 'oauth',
          },
          {
            provider: IntegrationProvider.MICROSOFT_TEAMS,
            name: 'Microsoft Teams',
            description: 'Integrate with Microsoft Teams',
            authType: 'oauth',
          },
          {
            provider: IntegrationProvider.GOOGLE_MEET,
            name: 'Google Meet',
            description: 'Integrate with Google Meet',
            authType: 'oauth',
          },
          {
            provider: IntegrationProvider.WEBEX,
            name: 'Cisco Webex',
            description: 'Integrate with Cisco Webex',
            authType: 'oauth',
          },
        ],
      },
      {
        type: IntegrationType.SOCIAL_LOGIN,
        name: 'Social Login',
        description: 'Enable social authentication',
        providers: [
          {
            provider: IntegrationProvider.GOOGLE_OAUTH,
            name: 'Google OAuth',
            description: 'Login with Google',
            authType: 'oauth',
          },
          {
            provider: IntegrationProvider.MICROSOFT_OAUTH,
            name: 'Microsoft OAuth',
            description: 'Login with Microsoft',
            authType: 'oauth',
          },
          {
            provider: IntegrationProvider.LINKEDIN_OAUTH,
            name: 'LinkedIn OAuth',
            description: 'Login with LinkedIn',
            authType: 'oauth',
          },
          {
            provider: IntegrationProvider.GITHUB_OAUTH,
            name: 'GitHub OAuth',
            description: 'Login with GitHub',
            authType: 'oauth',
          },
          {
            provider: IntegrationProvider.FACEBOOK_OAUTH,
            name: 'Facebook OAuth',
            description: 'Login with Facebook',
            authType: 'oauth',
          },
        ],
      },
      {
        type: IntegrationType.JOB_BOARD,
        name: 'Job Board Syndication',
        description: 'Sync job postings with job boards',
        providers: [
          {
            provider: IntegrationProvider.INDEED,
            name: 'Indeed',
            description: 'Post jobs to Indeed',
            authType: 'api_key',
          },
          {
            provider: IntegrationProvider.LINKEDIN_JOBS,
            name: 'LinkedIn Jobs',
            description: 'Post jobs to LinkedIn',
            authType: 'oauth',
          },
          {
            provider: IntegrationProvider.GLASSDOOR,
            name: 'Glassdoor',
            description: 'Post jobs to Glassdoor',
            authType: 'api_key',
          },
          {
            provider: IntegrationProvider.MONSTER,
            name: 'Monster',
            description: 'Post jobs to Monster',
            authType: 'api_key',
          },
        ],
      },
    ];

    return {
      success: true,
      data: types,
      message: 'Integration types retrieved successfully',
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get integration details' })
  @ApiResponse({ status: 200, description: 'Integration retrieved successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN, Role.ORGANIZATION_MEMBER)
  async getIntegration(@Param('id') id: string) {
    const integration = await this.integrationService.getIntegrationById(id);

    // Remove sensitive credentials
    const sanitizedIntegration = {
      ...integration,
      credentials: {
        ...integration.credentials,
        accessToken: integration.credentials.accessToken ? '[REDACTED]' : undefined,
        refreshToken: integration.credentials.refreshToken ? '[REDACTED]' : undefined,
        apiKey: integration.credentials.apiKey ? '[REDACTED]' : undefined,
        apiSecret: integration.credentials.apiSecret ? '[REDACTED]' : undefined,
        password: integration.credentials.password ? '[REDACTED]' : undefined,
      },
      config: {
        ...integration.config,
        oauth: integration.config.oauth ? {
          ...integration.config.oauth,
          clientSecret: integration.config.oauth.clientSecret ? '[REDACTED]' : undefined,
        } : undefined,
        api: integration.config.api ? {
          ...integration.config.api,
          apiSecret: integration.config.api.apiSecret ? '[REDACTED]' : undefined,
        } : undefined,
      },
    };

    return {
      success: true,
      data: sanitizedIntegration,
      message: 'Integration retrieved successfully',
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update integration' })
  @ApiResponse({ status: 200, description: 'Integration updated successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN)
  async updateIntegration(
    @Param('id') id: string,
    @Body() updateDto: UpdateIntegrationDto
  ) {
    const integration = await this.integrationService.updateIntegration(id, updateDto);

    return {
      success: true,
      data: integration,
      message: 'Integration updated successfully',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete integration' })
  @ApiResponse({ status: 200, description: 'Integration deleted successfully' })
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN)
  async deleteIntegration(@Param('id') id: string) {
    await this.integrationService.deleteIntegration(id);

    return {
      success: true,
      message: 'Integration deleted successfully',
    };
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate integration' })
  @ApiResponse({ status: 200, description: 'Integration activated successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN)
  async activateIntegration(@Param('id') id: string) {
    const integration = await this.integrationService.activateIntegration(id);

    return {
      success: true,
      data: integration,
      message: 'Integration activated successfully',
    };
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate integration' })
  @ApiResponse({ status: 200, description: 'Integration deactivated successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN)
  async deactivateIntegration(@Param('id') id: string) {
    const integration = await this.integrationService.deactivateIntegration(id);

    return {
      success: true,
      data: integration,
      message: 'Integration deactivated successfully',
    };
  }

  @Post(':id/suspend')
  @ApiOperation({ summary: 'Suspend integration' })
  @ApiResponse({ status: 200, description: 'Integration suspended successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN)
  async suspendIntegration(
    @Param('id') id: string,
    @Body('reason') reason?: string
  ) {
    const integration = await this.integrationService.suspendIntegration(id, reason);

    return {
      success: true,
      data: integration,
      message: 'Integration suspended successfully',
    };
  }

  // OAuth Flow Endpoints
  @Get(':id/oauth/authorize')
  @ApiOperation({ summary: 'Initiate OAuth authorization' })
  @ApiResponse({ status: 302, description: 'Redirect to OAuth provider' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN)
  async initiateOAuth(
    @Param('id') id: string,
    @Query('state') state?: string
  ) {
    const authUrl = await this.integrationService.initiateOAuth(id, state);

    return {
      success: true,
      data: { authUrl },
      message: 'OAuth authorization URL generated',
    };
  }

  @Post(':id/oauth/callback')
  @ApiOperation({ summary: 'Handle OAuth callback' })
  @ApiResponse({ status: 200, description: 'OAuth authorization completed' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN)
  async handleOAuthCallback(
    @Param('id') id: string,
    @Body('code') code: string,
    @Body('state') state?: string
  ) {
    const integration = await this.integrationService.handleOAuthCallback(id, code, state);

    return {
      success: true,
      data: integration,
      message: 'OAuth authorization completed successfully',
    };
  }

  @Post(':id/oauth/refresh')
  @ApiOperation({ summary: 'Refresh OAuth token' })
  @ApiResponse({ status: 200, description: 'OAuth token refreshed successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN)
  async refreshOAuthToken(@Param('id') id: string) {
    const integration = await this.integrationService.refreshOAuthToken(id);

    return {
      success: true,
      data: integration,
      message: 'OAuth token refreshed successfully',
    };
  }

  // Calendar Integration Endpoints
  @Post(':id/calendar/sync')
  @ApiOperation({ summary: 'Sync calendar events' })
  @ApiResponse({ status: 200, description: 'Calendar sync completed' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN, Role.ORGANIZATION_MEMBER)
  async syncCalendarEvents(@Param('id') id: string) {
    const result = await this.integrationService.syncCalendarEvents(id);

    return {
      success: true,
      data: result,
      message: 'Calendar sync completed successfully',
    };
  }

  // Video Conferencing Endpoints
  @Post(':id/meetings')
  @ApiOperation({ summary: 'Create video meeting' })
  @ApiResponse({ status: 201, description: 'Meeting created successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN, Role.ORGANIZATION_MEMBER)
  async createMeeting(
    @Param('id') id: string,
    @Body() createMeetingDto: CreateMeetingDto
  ) {
    const meeting = await this.integrationService.createMeeting(id, createMeetingDto);

    return {
      success: true,
      data: meeting,
      message: 'Meeting created successfully',
    };
  }

  // Social Login Endpoints
  @Post(':id/social-login/validate')
  @ApiOperation({ summary: 'Validate social login token' })
  @ApiResponse({ status: 200, description: 'Social login token validated' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN, Role.ORGANIZATION_MEMBER)
  async validateSocialLoginToken(
    @Param('id') id: string,
    @Body('token') token: string
  ) {
    const userInfo = await this.integrationService.validateSocialLoginToken(id, token);

    return {
      success: true,
      data: userInfo,
      message: 'Social login token validated successfully',
    };
  }

  // Job Board Endpoints
  @Post(':id/job-board/sync')
  @ApiOperation({ summary: 'Sync job postings' })
  @ApiResponse({ status: 200, description: 'Job board sync completed' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN)
  async syncJobPostings(@Param('id') id: string) {
    const result = await this.integrationService.syncJobPostings(id);

    return {
      success: true,
      data: result,
      message: 'Job board sync completed successfully',
    };
  }

  // Health and Monitoring
  @Get(':id/health')
  @ApiOperation({ summary: 'Check integration health' })
  @ApiResponse({ status: 200, description: 'Integration health status retrieved' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN, Role.ORGANIZATION_MEMBER)
  async checkHealth(@Param('id') id: string) {
    const health = await this.integrationService.checkIntegrationHealth(id);

    return {
      success: true,
      data: health,
      message: 'Integration health status retrieved successfully',
    };
  }

  @Post(':id/sync')
  @ApiOperation({ summary: 'Sync integration data' })
  @ApiResponse({ status: 200, description: 'Integration sync completed' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN)
  async syncIntegration(
    @Param('id') id: string,
    @Body() syncDto: SyncIntegrationDto
  ) {
    const integration = await this.integrationService.getIntegrationById(id);
    
    let result;
    switch (integration.type) {
      case IntegrationType.CALENDAR:
        result = await this.integrationService.syncCalendarEvents(id);
        break;
      case IntegrationType.JOB_BOARD:
        result = await this.integrationService.syncJobPostings(id);
        break;
      default:
        throw new Error(`Sync not supported for integration type: ${integration.type}`);
    }

    return {
      success: true,
      data: result,
      message: 'Integration sync completed successfully',
    };
  }

  @Get(':id/logs')
  @ApiOperation({ summary: 'Get integration logs' })
  @ApiResponse({ status: 200, description: 'Integration logs retrieved successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN)
  async getIntegrationLogs(
    @Param('id') id: string,
    @Query('limit') limit = 100,
    @Query('offset') offset = 0
  ) {
    // Implementation would retrieve integration-specific logs
    // For now, return a placeholder response
    return {
      success: true,
      data: {
        logs: [],
        total: 0,
        limit: Number(limit),
        offset: Number(offset),
      },
      message: 'Integration logs retrieved successfully',
    };
  }
}
