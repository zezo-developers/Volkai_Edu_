import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { 
  Integration, 
  IntegrationType, 
  IntegrationProvider, 
  IntegrationStatus 
} from '../../../database/entities/integration.entity';

export interface CreateIntegrationDto {
  name: string;
  description?: string;
  type: IntegrationType;
  provider: IntegrationProvider;
  organizationId?: string;
  config?: any;
  credentials?: any;
  settings?: any;
}

export interface UpdateIntegrationDto {
  name?: string;
  description?: string;
  status?: IntegrationStatus;
  config?: any;
  credentials?: any;
  settings?: any;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
}

export interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  errors: string[];
}

@Injectable()
export class IntegrationService {
  private readonly logger = new Logger(IntegrationService.name);

  constructor(
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
    private httpService: HttpService,
    @InjectRepository(Integration)
    private integrationRepository: Repository<Integration>,
  ) {}

  // Integration Management
  async createIntegration(
    createDto: CreateIntegrationDto,
    createdBy: string
  ): Promise<Integration> {
    // Check for existing integration of same type and provider
    const existingIntegration = await this.integrationRepository.findOne({
      where: {
        type: createDto.type,
        provider: createDto.provider,
        organizationId: createDto.organizationId || null,
        status: IntegrationStatus.ACTIVE,
      },
    });

    if (existingIntegration) {
      throw new ConflictException(
        `Integration of type ${createDto.type} with provider ${createDto.provider} already exists`
      );
    }

    const integrationData = Integration.createIntegration(
      createDto.name,
      createDto.type,
      createDto.provider,
      createdBy,
      createDto.organizationId
    );

    // Apply custom configuration
    if (createDto.config) {
      integrationData.config = { ...integrationData.config, ...createDto.config };
    }

    if (createDto.credentials) {
      integrationData.credentials = { ...integrationData.credentials, ...createDto.credentials };
    }

    if (createDto.settings) {
      integrationData.settings = { ...integrationData.settings, ...createDto.settings };
    }

    if (createDto.description) {
      integrationData.description = createDto.description;
    }

    const integration = this.integrationRepository.create(integrationData);
    const savedIntegration = await this.integrationRepository.save(integration);

    this.eventEmitter.emit('integration.created', {
      integrationId: savedIntegration.id,
      type: savedIntegration.type,
      provider: savedIntegration.provider,
      organizationId: savedIntegration.organizationId,
      createdBy,
    });

    this.logger.log(`Created integration: ${savedIntegration.id} (${createDto.type}/${createDto.provider})`);

    return savedIntegration;
  }

  async updateIntegration(id: string, updateDto: UpdateIntegrationDto): Promise<Integration> {
    const integration = await this.getIntegrationById(id);

    Object.assign(integration, updateDto);
    const updatedIntegration = await this.integrationRepository.save(integration);

    this.eventEmitter.emit('integration.updated', {
      integrationId: updatedIntegration.id,
      changes: updateDto,
    });

    this.logger.log(`Updated integration: ${id}`);

    return updatedIntegration;
  }

  async deleteIntegration(id: string): Promise<void> {
    const integration = await this.getIntegrationById(id);

    await this.integrationRepository.remove(integration);

    this.eventEmitter.emit('integration.deleted', {
      integrationId: id,
      type: integration.type,
      provider: integration.provider,
      organizationId: integration.organizationId,
    });

    this.logger.log(`Deleted integration: ${id}`);
  }

  async getIntegrationById(id: string): Promise<Integration> {
    const integration = await this.integrationRepository.findOne({
      where: { id },
      relations: ['creator', 'organization'],
    });

    if (!integration) {
      throw new NotFoundException(`Integration not found: ${id}`);
    }

    return integration;
  }

  async getIntegrationsByOrganization(
    organizationId: string,
    type?: IntegrationType
  ): Promise<Integration[]> {
    const where: FindOptionsWhere<Integration> = { organizationId };

    if (type) {
      where.type = type;
    }

    return this.integrationRepository.find({
      where,
      relations: ['creator'],
      order: { createdAt: 'DESC' },
    });
  }

  async getIntegrationsByType(
    type: IntegrationType,
    organizationId?: string
  ): Promise<Integration[]> {
    const where: FindOptionsWhere<Integration> = { type };

    if (organizationId) {
      where.organizationId = organizationId;
    }

    return this.integrationRepository.find({
      where,
      relations: ['creator', 'organization'],
      order: { createdAt: 'DESC' },
    });
  }

  // Integration Status Management
  async activateIntegration(id: string): Promise<Integration> {
    const integration = await this.getIntegrationById(id);

    // Validate configuration before activation
    const isValid = await this.validateIntegrationConfig(integration);
    if (!isValid) {
      throw new ConflictException('Integration configuration is invalid');
    }

    integration.activate();
    const activatedIntegration = await this.integrationRepository.save(integration);

    this.eventEmitter.emit('integration.activated', {
      integrationId: activatedIntegration.id,
      type: activatedIntegration.type,
      provider: activatedIntegration.provider,
    });

    this.logger.log(`Activated integration: ${id}`);

    return activatedIntegration;
  }

  async deactivateIntegration(id: string): Promise<Integration> {
    const integration = await this.getIntegrationById(id);

    integration.deactivate();
    const deactivatedIntegration = await this.integrationRepository.save(integration);

    this.eventEmitter.emit('integration.deactivated', {
      integrationId: deactivatedIntegration.id,
    });

    this.logger.log(`Deactivated integration: ${id}`);

    return deactivatedIntegration;
  }

  async suspendIntegration(id: string, reason?: string): Promise<Integration> {
    const integration = await this.getIntegrationById(id);

    integration.suspend(reason);
    const suspendedIntegration = await this.integrationRepository.save(integration);

    this.eventEmitter.emit('integration.suspended', {
      integrationId: suspendedIntegration.id,
      reason,
    });

    this.logger.log(`Suspended integration: ${id} - ${reason || 'No reason provided'}`);

    return suspendedIntegration;
  }

  // OAuth Management
  async initiateOAuth(integrationId: string, state?: string, id?: string,): Promise<string> {
    const integration = await this.getIntegrationById(id);
    const oauthConfig = integration.config.oauth;

    if (!oauthConfig) {
      throw new ConflictException('OAuth not configured for this integration');
    }

    const params = new URLSearchParams({
      client_id: oauthConfig.clientId,
      redirect_uri: oauthConfig.redirectUri,
      scope: oauthConfig.scopes.join(' '),
      response_type: 'code',
      state: state || integration.id,
    });

    const authUrl = `${oauthConfig.authUrl}?${params.toString()}`;

    this.logger.log(`Initiated OAuth for integration: ${integrationId}`);

    return authUrl;
  }

  async handleOAuthCallback(
    integrationId: string,
    code: string,
    state?: string
  ): Promise<Integration> {
    const integration = await this.getIntegrationById(integrationId);
    const oauthConfig = integration.config.oauth;

    if (!oauthConfig) {
      throw new ConflictException('OAuth not configured for this integration');
    }

    try {
      // Exchange code for tokens
      const tokenResponse:any = await firstValueFrom(
        this.httpService.post(oauthConfig.tokenUrl, {
          grant_type: 'authorization_code',
          client_id: oauthConfig.clientId,
          client_secret: oauthConfig.clientSecret,
          code,
          redirect_uri: oauthConfig.redirectUri,
        })
      );

      const tokens = tokenResponse.data;

      // Update integration credentials
      integration.updateCredentials({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenType: tokens.token_type || 'Bearer',
        expiresAt: tokens.expires_in 
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : undefined,
      });

      // Activate integration if successful
      if (integration.status === IntegrationStatus.CONFIGURING) {
        integration.activate();
      }

      const updatedIntegration = await this.integrationRepository.save(integration);

      this.eventEmitter.emit('integration.oauth.completed', {
        integrationId: updatedIntegration.id,
        provider: updatedIntegration.provider,
      });

      this.logger.log(`OAuth completed for integration: ${integrationId}`);

      return updatedIntegration;
    } catch (error) {
      integration.markAsError(`OAuth failed: ${error.message}`);
      await this.integrationRepository.save(integration);

      this.logger.error(`OAuth failed for integration ${integrationId}: ${error.message}`);
      throw error;
    }
  }

  async refreshOAuthToken(integrationId: string): Promise<Integration> {
    const integration = await this.getIntegrationById(integrationId);
    const oauthConfig = integration.config.oauth;

    if (!oauthConfig || !integration.credentials.refreshToken) {
      throw new ConflictException('OAuth refresh not available for this integration');
    }

    try {
      const tokenResponse:any = await firstValueFrom(
        this.httpService.post(oauthConfig.tokenUrl, {
          grant_type: 'refresh_token',
          client_id: oauthConfig.clientId,
          client_secret: oauthConfig.clientSecret,
          refresh_token: integration.credentials.refreshToken,
        })
      );

      const tokens = tokenResponse.data;

      integration.refreshToken(
        tokens.access_token,
        new Date(Date.now() + tokens.expires_in * 1000),
        tokens.refresh_token
      );

      const updatedIntegration = await this.integrationRepository.save(integration);

      this.logger.log(`Refreshed OAuth token for integration: ${integrationId}`);

      return updatedIntegration;
    } catch (error) {
      integration.markAsError(`Token refresh failed: ${error.message}`);
      await this.integrationRepository.save(integration);

      this.logger.error(`Token refresh failed for integration ${integrationId}: ${error.message}`);
      throw error;
    }
  }

  // Calendar Integration Methods
  async createCalendarIntegration(
    name: string,
    provider: IntegrationProvider,
    oauthConfig: OAuthConfig,
    createdBy: string,
    organizationId?: string
  ): Promise<Integration> {
    const integrationData = Integration.createCalendarIntegration(
      name,
      provider,
      createdBy,
      organizationId
    );

    integrationData.config = {
      ...integrationData.config,
      oauth: oauthConfig,
    };

    const integration = this.integrationRepository.create(integrationData);
    return this.integrationRepository.save(integration);
  }

  async syncCalendarEvents(integrationId: string): Promise<SyncResult> {
    const integration = await this.getIntegrationById(integrationId);

    if (integration.type !== IntegrationType.CALENDAR) {
      throw new ConflictException('Integration is not a calendar integration');
    }

    if (!integration.hasValidCredentials) {
      throw new ConflictException('Integration credentials are invalid or expired');
    }

    try {
      // Implementation would depend on the specific calendar provider
      const result = await this.performCalendarSync(integration);

      integration.recordSync(result.recordsProcessed, result.success);
      await this.integrationRepository.save(integration);

      this.eventEmitter.emit('integration.sync.completed', {
        integrationId: integration.id,
        type: integration.type,
        result,
      });

      return result;
    } catch (error) {
      integration.recordSync(0, false, error.message);
      await this.integrationRepository.save(integration);

      this.logger.error(`Calendar sync failed for integration ${integrationId}: ${error.message}`);
      throw error;
    }
  }

  // Video Conferencing Integration Methods
  async createVideoConferencingIntegration(
    name: string,
    provider: IntegrationProvider,
    oauthConfig: OAuthConfig,
    createdBy: string,
    organizationId?: string
  ): Promise<Integration> {
    const integrationData = Integration.createVideoConferencingIntegration(
      name,
      provider,
      createdBy,
      organizationId
    );

    integrationData.config = {
      ...integrationData.config,
      oauth: oauthConfig,
    };

    const integration = this.integrationRepository.create(integrationData);
    return this.integrationRepository.save(integration);
  }

  async createMeeting(
    integrationId: string,
    meetingData: {
      topic: string;
      startTime: Date | any;
      duration: number;
      agenda?: string;
      settings?: any;
    }
  ): Promise<any> {
    const integration = await this.getIntegrationById(integrationId);

    if (integration.type !== IntegrationType.VIDEO_CONFERENCING) {
      throw new ConflictException('Integration is not a video conferencing integration');
    }

    if (!integration.hasValidCredentials) {
      throw new ConflictException('Integration credentials are invalid or expired');
    }

    try {
      const meeting = await this.createVideoMeeting(integration, meetingData);

      integration.recordUsage(true);
      integration.addFeatureUsage('create_meeting');
      await this.integrationRepository.save(integration);

      this.eventEmitter.emit('integration.meeting.created', {
        integrationId: integration.id,
        meetingId: meeting.id,
        topic: meetingData.topic,
      });

      return meeting;
    } catch (error) {
      integration.recordUsage(false, undefined, error.message);
      await this.integrationRepository.save(integration);

      this.logger.error(`Meeting creation failed for integration ${integrationId}: ${error.message}`);
      throw error;
    }
  }

  // Social Login Integration Methods
  async createSocialLoginIntegration(
    name: string,
    provider: IntegrationProvider,
    oauthConfig: OAuthConfig,
    createdBy: string,
    organizationId?: string
  ): Promise<Integration> {
    const integrationData = Integration.createSocialLoginIntegration(
      name,
      provider,
      createdBy,
      organizationId
    );

    integrationData.config = {
      ...integrationData.config,
      oauth: oauthConfig,
    };

    const integration = this.integrationRepository.create(integrationData);
    return this.integrationRepository.save(integration);
  }

  async validateSocialLoginToken(
    integrationId: string,
    token: string
  ): Promise<any> {
    const integration = await this.getIntegrationById(integrationId);

    if (integration.type !== IntegrationType.SOCIAL_LOGIN) {
      throw new ConflictException('Integration is not a social login integration');
    }

    try {
      const userInfo = await this.validateSocialToken(integration, token);

      integration.recordUsage(true);
      integration.addFeatureUsage('validate_token');
      await this.integrationRepository.save(integration);

      return userInfo;
    } catch (error) {
      integration.recordUsage(false, undefined, error.message);
      await this.integrationRepository.save(integration);

      this.logger.error(`Social login validation failed for integration ${integrationId}: ${error.message}`);
      throw error;
    }
  }

  // Job Board Integration Methods
  async createJobBoardIntegration(
    name: string,
    provider: IntegrationProvider,
    apiConfig: { apiKey: string; baseUrl: string },
    createdBy: string,
    organizationId?: string
  ): Promise<Integration> {
    const integrationData = Integration.createJobBoardIntegration(
      name,
      provider,
      createdBy,
      organizationId
    );

    integrationData.config = {
      ...integrationData.config,
      api: apiConfig,
    };

    integrationData.credentials = {
      apiKey: apiConfig.apiKey,
    };

    const integration = this.integrationRepository.create(integrationData);
    return this.integrationRepository.save(integration);
  }

  async syncJobPostings(integrationId: string): Promise<SyncResult> {
    const integration = await this.getIntegrationById(integrationId);

    if (integration.type !== IntegrationType.JOB_BOARD) {
      throw new ConflictException('Integration is not a job board integration');
    }

    try {
      const result = await this.performJobBoardSync(integration);

      integration.recordSync(result.recordsProcessed, result.success);
      await this.integrationRepository.save(integration);

      this.eventEmitter.emit('integration.sync.completed', {
        integrationId: integration.id,
        type: integration.type,
        result,
      });

      return result;
    } catch (error) {
      integration.recordSync(0, false, error.message);
      await this.integrationRepository.save(integration);

      this.logger.error(`Job board sync failed for integration ${integrationId}: ${error.message}`);
      throw error;
    }
  }

  // Health and Monitoring
  async checkIntegrationHealth(integrationId: string): Promise<{
    isHealthy: boolean;
    healthScore: number;
    issues: string[];
    lastChecked: Date;
  }> {
    const integration = await this.getIntegrationById(integrationId);

    const issues: string[] = [];

    // Check credentials
    if (!integration.hasValidCredentials) {
      issues.push('Invalid or expired credentials');
    }

    // Check recent errors
    if (integration.metadata.lastErrorAt) {
      const hoursSinceError = (Date.now() - integration.metadata.lastErrorAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceError < 1) {
        issues.push('Recent errors detected');
      }
    }

    // Check success rate
    if (integration.successRate < 90) {
      issues.push('Low success rate');
    }

    // Update health score
    integration.updateHealthScore();
    await this.integrationRepository.save(integration);

    return {
      isHealthy: integration.isHealthy,
      healthScore: integration.metadata.healthScore || 0,
      issues,
      lastChecked: new Date(),
    };
  }

  // Private Helper Methods
  private async validateIntegrationConfig(integration: Integration): Promise<boolean> {
    try {
      switch (integration.type) {
        case IntegrationType.CALENDAR:
        case IntegrationType.VIDEO_CONFERENCING:
        case IntegrationType.SOCIAL_LOGIN:
          return !!(integration.config.oauth?.clientId && integration.config.oauth?.clientSecret);
        
        case IntegrationType.JOB_BOARD:
          return !!(integration.config.api?.apiKey && integration.config.api?.baseUrl);
        
        default:
          return true;
      }
    } catch (error) {
      return false;
    }
  }

  private async performCalendarSync(integration: Integration): Promise<SyncResult> {
    // This would implement actual calendar API calls based on the provider
    // For now, return a mock result
    return {
      success: true,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: [],
    };
  }

  private async createVideoMeeting(integration: Integration, meetingData: any): Promise<any> {
    // This would implement actual video conferencing API calls based on the provider
    // For now, return a mock meeting
    return {
      id: 'mock-meeting-id',
      joinUrl: 'https://example.com/join/mock-meeting',
      startUrl: 'https://example.com/start/mock-meeting',
      ...meetingData,
    };
  }

  private async validateSocialToken(integration: Integration, token: string): Promise<any> {
    // This would implement actual social login validation based on the provider
    // For now, return mock user info
    return {
      id: 'mock-user-id',
      email: 'user@example.com',
      name: 'Mock User',
    };
  }

  private async performJobBoardSync(integration: Integration): Promise<SyncResult> {
    // This would implement actual job board API calls based on the provider
    // For now, return a mock result
    return {
      success: true,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: [],
    };
  }
}
