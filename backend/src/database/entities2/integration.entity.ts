import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../entities/user.entity';
import { Organization } from './organization.entity';
import { ApiKey } from './api-key.entity';

export enum IntegrationType {
  CALENDAR = 'calendar',
  VIDEO_CONFERENCING = 'video_conferencing',
  SOCIAL_LOGIN = 'social_login',
  JOB_BOARD = 'job_board',
  EMAIL_MARKETING = 'email_marketing',
  CRM = 'crm',
  PAYMENT = 'payment',
  STORAGE = 'storage',
  ANALYTICS = 'analytics',
  COMMUNICATION = 'communication',
  CUSTOM = 'custom',
}

export enum IntegrationProvider {
  // Calendar providers
  GOOGLE_CALENDAR = 'google_calendar',
  OUTLOOK_CALENDAR = 'outlook_calendar',
  APPLE_CALENDAR = 'apple_calendar',
  
  // Video conferencing providers
  ZOOM = 'zoom',
  MICROSOFT_TEAMS = 'microsoft_teams',
  GOOGLE_MEET = 'google_meet',
  WEBEX = 'webex',
  
  // Social login providers
  GOOGLE_OAUTH = 'google_oauth',
  MICROSOFT_OAUTH = 'microsoft_oauth',
  LINKEDIN_OAUTH = 'linkedin_oauth',
  GITHUB_OAUTH = 'github_oauth',
  FACEBOOK_OAUTH = 'facebook_oauth',
  
  // Job board providers
  INDEED = 'indeed',
  LINKEDIN_JOBS = 'linkedin_jobs',
  GLASSDOOR = 'glassdoor',
  MONSTER = 'monster',
  
  // Email marketing
  MAILCHIMP = 'mailchimp',
  SENDGRID = 'sendgrid',
  MAILGUN = 'mailgun',
  
  // CRM providers
  SALESFORCE = 'salesforce',
  HUBSPOT = 'hubspot',
  PIPEDRIVE = 'pipedrive',
  
  // Custom integration
  CUSTOM = 'custom',
}

export enum IntegrationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  CONFIGURING = 'configuring',
  ERROR = 'error',
  SUSPENDED = 'suspended',
  DEPRECATED = 'deprecated',
}

@Entity('integrations')
@Index(['organizationId', 'type'])
@Index(['provider', 'status'])
@Index(['createdBy', 'status'])
@Index(['type', 'status'])
export class Integration {
  @ApiProperty({ description: 'Integration ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Integration name' })
  @Column({ length: 200 })
  name: string;

  @ApiProperty({ description: 'Integration description' })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ enum: IntegrationType, description: 'Type of integration' })
  @Column({
    type: 'enum',
    enum: IntegrationType,
  })
  type: IntegrationType;

  @ApiProperty({ enum: IntegrationProvider, description: 'Integration provider' })
  @Column({
    type: 'enum',
    enum: IntegrationProvider,
  })
  provider: IntegrationProvider;

  @ApiProperty({ enum: IntegrationStatus, description: 'Integration status' })
  @Column({
    type: 'enum',
    enum: IntegrationStatus,
    default: IntegrationStatus.CONFIGURING,
  })
  status: IntegrationStatus;

  @ApiProperty({ description: 'Organization ID (nullable for system integrations)' })
  @Column({ name: 'organization_id', nullable: true })
  organizationId?: string;

  @ApiProperty({ description: 'User who created the integration' })
  @Column({ name: 'created_by' })
  createdBy: string;

  @ApiProperty({ description: 'Integration configuration and credentials' })
  @Column({ type: 'jsonb', default: {} })
  config: {
    // OAuth configuration
    oauth?: {
      clientId?: string;
      clientSecret?: string; // Encrypted
      redirectUri?: string;
      scopes?: string[];
      authUrl?: string;
      tokenUrl?: string;
    };
    
    // API configuration
    api?: {
      baseUrl?: string;
      apiKey?: string; // Encrypted
      apiSecret?: string; // Encrypted
      version?: string;
      timeout?: number;
      retries?: number;
    };
    
    // Webhook configuration
    webhook?: {
      url?: string;
      secret?: string; // Encrypted
      events?: string[];
      retryAttempts?: number;
    };
    
    // Provider-specific settings
    calendar?: {
      defaultCalendarId?: string;
      timeZone?: string;
      reminderMinutes?: number;
      allowConflicts?: boolean;
    };
    
    videoConferencing?: {
      defaultMeetingType?: string;
      autoRecord?: boolean;
      waitingRoom?: boolean;
      passwordProtected?: boolean;
    };
    
    socialLogin?: {
      allowedDomains?: string[];
      autoCreateUser?: boolean;
      defaultRole?: string;
      profileMapping?: Record<string, string>;
    };
    
    jobBoard?: {
      autoSync?: boolean;
      syncInterval?: number; // hours
      jobCategories?: string[];
      locationFilter?: string[];
    };
    
    // Custom settings
    customSettings?: Record<string, any>;
  };

  @ApiProperty({ description: 'Integration credentials and tokens' })
  @Column({ type: 'jsonb', default: {} })
  credentials: {
    // OAuth tokens
    accessToken?: string; // Encrypted
    refreshToken?: string; // Encrypted
    tokenType?: string;
    expiresAt?: Date;
    
    // API keys
    apiKey?: string; // Encrypted
    apiSecret?: string; // Encrypted
    
    // Additional credentials
    username?: string;
    password?: string; // Encrypted
    
    // Provider-specific credentials
    providerUserId?: string;
    providerAccountId?: string;
    
    // Encryption info
    encryptionMethod?: string;
    keyVersion?: number;
  };

  @ApiProperty({ description: 'Integration metadata and statistics' })
  @Column({ type: 'jsonb', default: {} })
  metadata: {
    // Usage statistics
    totalRequests?: number;
    successfulRequests?: number;
    failedRequests?: number;
    lastUsedAt?: Date;
    
    // Sync statistics (for data sync integrations)
    lastSyncAt?: Date;
    syncCount?: number;
    recordsSynced?: number;
    syncErrors?: number;
    
    // Performance metrics
    averageResponseTime?: number;
    
    // Error tracking
    errorCount?: number;
    lastError?: string;
    lastErrorAt?: Date;
    
    // Health metrics
    healthScore?: number; // 0-100
    isHealthy?: boolean;
    
    // Feature usage
    featuresUsed?: string[];
    
    // Version info
    version?: string;
    sdkVersion?: string;
    
    // Custom metadata
    tags?: string[];
    customFields?: Record<string, any>;
  };

  @ApiProperty({ description: 'Integration settings and preferences' })
  @Column({ type: 'jsonb', default: {} })
  settings: {
    // Notification settings
    notifications?: {
      enabled?: boolean;
      events?: string[];
      channels?: string[];
    };
    
    // Sync settings
    sync?: {
      enabled?: boolean;
      frequency?: number; // minutes
      batchSize?: number;
      conflictResolution?: 'local' | 'remote' | 'manual';
    };
    
    // Security settings
    security?: {
      ipWhitelist?: string[];
      requireHttps?: boolean;
      encryptData?: boolean;
    };
    
    // UI settings
    ui?: {
      showInDashboard?: boolean;
      customIcon?: string;
      customColor?: string;
    };
    
    // Custom settings
    customSettings?: Record<string, any>;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'organization_id' })
  organization?: Organization;

  @OneToMany(() => ApiKey, apiKey => apiKey.organization)
  apiKeys: ApiKey[];

  // Virtual properties
  get isActive(): boolean {
    return this.status === IntegrationStatus.ACTIVE;
  }

  get isConfigured(): boolean {
    return this.status !== IntegrationStatus.CONFIGURING;
  }

  get hasValidCredentials(): boolean {
    if (this.credentials.expiresAt) {
      return new Date() < this.credentials.expiresAt;
    }
    return !!this.credentials.accessToken || !!this.credentials.apiKey;
  }

  get needsTokenRefresh(): boolean {
    if (!this.credentials.expiresAt || !this.credentials.refreshToken) {
      return false;
    }
    
    // Check if token expires within the next 5 minutes
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    return this.credentials.expiresAt < fiveMinutesFromNow;
  }

  get isHealthy(): boolean {
    return this.metadata.isHealthy !== false && this.isActive;
  }

  get successRate(): number {
    const total = this.metadata.totalRequests || 0;
    const successful = this.metadata.successfulRequests || 0;
    return total > 0 ? (successful / total) * 100 : 0;
  }

  // Methods
  recordUsage(success: boolean, responseTime?: number, error?: string): void {
    this.metadata.totalRequests = (this.metadata.totalRequests || 0) + 1;
    this.metadata.lastUsedAt = new Date();

    if (success) {
      this.metadata.successfulRequests = (this.metadata.successfulRequests || 0) + 1;
    } else {
      this.metadata.failedRequests = (this.metadata.failedRequests || 0) + 1;
      if (error) {
        this.metadata.lastError = error;
        this.metadata.lastErrorAt = new Date();
        this.metadata.errorCount = (this.metadata.errorCount || 0) + 1;
      }
    }

    if (responseTime) {
      const avgResponseTime = this.metadata.averageResponseTime || 0;
      const totalRequests = this.metadata.totalRequests;
      this.metadata.averageResponseTime = 
        (avgResponseTime * (totalRequests - 1) + responseTime) / totalRequests;
    }

    this.updateHealthScore();
  }

  recordSync(recordCount: number, success: boolean, error?: string): void {
    this.metadata.syncCount = (this.metadata.syncCount || 0) + 1;
    this.metadata.lastSyncAt = new Date();

    if (success) {
      this.metadata.recordsSynced = (this.metadata.recordsSynced || 0) + recordCount;
    } else {
      this.metadata.syncErrors = (this.metadata.syncErrors || 0) + 1;
      if (error) {
        this.metadata.lastError = error;
        this.metadata.lastErrorAt = new Date();
      }
    }

    this.updateHealthScore();
  }

  updateHealthScore(): void {
    let score = 100;

    // Reduce score based on error rate
    const errorRate = 100 - this.successRate;
    score -= errorRate * 0.5;

    // Reduce score based on recent errors
    if (this.metadata.lastErrorAt) {
      const hoursSinceError = (Date.now() - this.metadata.lastErrorAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceError < 1) score -= 30;
      else if (hoursSinceError < 24) score -= 15;
    }

    // Reduce score if credentials are invalid
    if (!this.hasValidCredentials) {
      score -= 50;
    }

    // Reduce score based on response time
    const avgResponseTime = this.metadata.averageResponseTime || 0;
    if (avgResponseTime > 5000) score -= 20;
    else if (avgResponseTime > 2000) score -= 10;

    this.metadata.healthScore = Math.max(0, Math.min(100, score));
    this.metadata.isHealthy = this.metadata.healthScore >= 70;
  }

  activate(): void {
    this.status = IntegrationStatus.ACTIVE;
  }

  deactivate(): void {
    this.status = IntegrationStatus.INACTIVE;
  }

  suspend(reason?: string): void {
    this.status = IntegrationStatus.SUSPENDED;
    
    if (reason) {
      if (!this.metadata.customFields) this.metadata.customFields = {};
      this.metadata.customFields.suspensionReason = reason;
      this.metadata.customFields.suspendedAt = new Date();
    }
  }

  markAsError(error: string): void {
    this.status = IntegrationStatus.ERROR;
    this.metadata.lastError = error;
    this.metadata.lastErrorAt = new Date();
  }

  updateCredentials(credentials: Partial<typeof this.credentials>): void {
    this.credentials = { ...this.credentials, ...credentials };
    
    if (this.status === IntegrationStatus.ERROR) {
      this.status = IntegrationStatus.ACTIVE;
    }
  }

  refreshToken(newAccessToken: string, expiresAt: Date, newRefreshToken?: string): void {
    this.credentials.accessToken = newAccessToken;
    this.credentials.expiresAt = expiresAt;
    
    if (newRefreshToken) {
      this.credentials.refreshToken = newRefreshToken;
    }
  }

  addFeatureUsage(feature: string): void {
    if (!this.metadata.featuresUsed) {
      this.metadata.featuresUsed = [];
    }
    if (!this.metadata.featuresUsed.includes(feature)) {
      this.metadata.featuresUsed.push(feature);
    }
  }

  // Provider-specific helper methods
  getCalendarConfig(): any {
    return this.config.calendar || {};
  }

  getVideoConferencingConfig(): any {
    return this.config.videoConferencing || {};
  }

  getSocialLoginConfig(): any {
    return this.config.socialLogin || {};
  }

  getJobBoardConfig(): any {
    return this.config.jobBoard || {};
  }

  // Static factory methods
  static createIntegration(
    name: string,
    type: IntegrationType,
    provider: IntegrationProvider,
    createdBy: string,
    organizationId?: string
  ): Partial<Integration> {
    return {
      name,
      type,
      provider,
      createdBy,
      organizationId,
      status: IntegrationStatus.CONFIGURING,
      config: {},
      credentials: {},
      metadata: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        healthScore: 100,
        isHealthy: true,
      },
      settings: {
        notifications: { enabled: true },
        sync: { enabled: true, frequency: 60 },
        security: { requireHttps: true },
        ui: { showInDashboard: true },
      },
    };
  }

  static createCalendarIntegration(
    name: string,
    provider: IntegrationProvider,
    createdBy: string,
    organizationId?: string
  ): Partial<Integration> {
    const integration = this.createIntegration(
      name,
      IntegrationType.CALENDAR,
      provider,
      createdBy,
      organizationId
    );

    integration.config = {
      calendar: {
        timeZone: 'UTC',
        reminderMinutes: 15,
        allowConflicts: false,
      },
    };

    return integration;
  }

  static createVideoConferencingIntegration(
    name: string,
    provider: IntegrationProvider,
    createdBy: string,
    organizationId?: string
  ): Partial<Integration> {
    const integration = this.createIntegration(
      name,
      IntegrationType.VIDEO_CONFERENCING,
      provider,
      createdBy,
      organizationId
    );

    integration.config = {
      videoConferencing: {
        autoRecord: false,
        waitingRoom: true,
        passwordProtected: true,
      },
    };

    return integration;
  }

  static createSocialLoginIntegration(
    name: string,
    provider: IntegrationProvider,
    createdBy: string,
    organizationId?: string
  ): Partial<Integration> {
    const integration = this.createIntegration(
      name,
      IntegrationType.SOCIAL_LOGIN,
      provider,
      createdBy,
      organizationId
    );

    integration.config = {
      socialLogin: {
        autoCreateUser: true,
        defaultRole: 'user',
        profileMapping: {
          email: 'email',
          firstName: 'given_name',
          lastName: 'family_name',
        },
      },
    };

    return integration;
  }

  static createJobBoardIntegration(
    name: string,
    provider: IntegrationProvider,
    createdBy: string,
    organizationId?: string
  ): Partial<Integration> {
    const integration = this.createIntegration(
      name,
      IntegrationType.JOB_BOARD,
      provider,
      createdBy,
      organizationId
    );

    integration.config = {
      jobBoard: {
        autoSync: true,
        syncInterval: 24, // hours
      },
    };

    integration.settings = {
      ...integration.settings,
      sync: {
        enabled: true,
        frequency: 1440, // 24 hours in minutes
        batchSize: 100,
        conflictResolution: 'remote',
      },
    };

    return integration;
  }
}
