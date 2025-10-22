import { ApiProperty } from '@nestjs/swagger';
import { 
  IsString, 
  IsArray, 
  IsOptional, 
  IsEnum, 
  IsObject, 
  IsNumber, 
  IsBoolean,
  ValidateNested,
  Min,
  Max,
  Length,
  IsUrl,
  IsDateString,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { 
  IntegrationType, 
  IntegrationProvider, 
  IntegrationStatus 
} from '../../../database/entities/integration.entity';

export class CreateIntegrationDto {
  @ApiProperty({ description: 'Integration name' })
  @IsString()
  @Length(1, 200)
  name: string;

  @ApiProperty({ description: 'Integration description', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @ApiProperty({ 
    description: 'Integration type',
    enum: IntegrationType,
  })
  @IsEnum(IntegrationType)
  type: IntegrationType;

  @ApiProperty({ 
    description: 'Integration provider',
    enum: IntegrationProvider,
  })
  @IsEnum(IntegrationProvider)
  provider: IntegrationProvider;

  @ApiProperty({ description: 'Organization ID (optional for system integrations)', required: false })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({ description: 'Integration configuration', required: false })
  @IsOptional()
  @IsObject()
  config?: any;

  @ApiProperty({ description: 'Integration credentials', required: false })
  @IsOptional()
  @IsObject()
  credentials?: any;

  @ApiProperty({ description: 'Integration settings', required: false })
  @IsOptional()
  @IsObject()
  settings?: any;
}

export class UpdateIntegrationDto {
  @ApiProperty({ description: 'Integration name', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  name?: string;

  @ApiProperty({ description: 'Integration description', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @ApiProperty({ 
    description: 'Integration status',
    enum: IntegrationStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(IntegrationStatus)
  status?: IntegrationStatus;

  @ApiProperty({ description: 'Integration configuration', required: false })
  @IsOptional()
  @IsObject()
  config?: any;

  @ApiProperty({ description: 'Integration credentials', required: false })
  @IsOptional()
  @IsObject()
  credentials?: any;

  @ApiProperty({ description: 'Integration settings', required: false })
  @IsOptional()
  @IsObject()
  settings?: any;
}

export class OAuthConfigDto {
  @ApiProperty({ description: 'OAuth client ID' })
  @IsString()
  clientId: string;

  @ApiProperty({ description: 'OAuth client secret' })
  @IsString()
  clientSecret: string;

  @ApiProperty({ description: 'OAuth redirect URI' })
  @IsUrl()
  redirectUri: string;

  @ApiProperty({ description: 'OAuth scopes' })
  @IsArray()
  @IsString({ each: true })
  scopes: string[];

  @ApiProperty({ description: 'OAuth authorization URL' })
  @IsUrl()
  authUrl: string;

  @ApiProperty({ description: 'OAuth token URL' })
  @IsUrl()
  tokenUrl: string;
}

export class ApiConfigDto {
  @ApiProperty({ description: 'API key' })
  @IsString()
  apiKey: string;

  @ApiProperty({ description: 'API base URL' })
  @IsUrl()
  baseUrl: string;

  @ApiProperty({ description: 'API secret', required: false })
  @IsOptional()
  @IsString()
  apiSecret?: string;

  @ApiProperty({ description: 'API version', required: false })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiProperty({ description: 'Request timeout in milliseconds', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1000)
  @Max(60000)
  timeout?: number;

  @ApiProperty({ description: 'Number of retries', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  retries?: number;
}

export class CreateCalendarIntegrationDto {
  @ApiProperty({ description: 'Calendar integration name' })
  @IsString()
  @Length(1, 200)
  name: string;

  @ApiProperty({ 
    description: 'Calendar provider',
    enum: [
      IntegrationProvider.GOOGLE_CALENDAR,
      IntegrationProvider.OUTLOOK_CALENDAR,
      IntegrationProvider.APPLE_CALENDAR,
    ],
  })
  @IsEnum([
    IntegrationProvider.GOOGLE_CALENDAR,
    IntegrationProvider.OUTLOOK_CALENDAR,
    IntegrationProvider.APPLE_CALENDAR,
  ])
  provider: IntegrationProvider;

  @ApiProperty({ description: 'OAuth configuration' })
  @ValidateNested()
  @Type(() => OAuthConfigDto)
  oauthConfig: OAuthConfigDto;

  @ApiProperty({ description: 'Organization ID', required: false })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({ description: 'Calendar-specific settings', required: false })
  @IsOptional()
  @IsObject()
  calendarSettings?: {
    defaultCalendarId?: string;
    timeZone?: string;
    reminderMinutes?: number;
    allowConflicts?: boolean;
  };
}

export class CreateVideoIntegrationDto {
  @ApiProperty({ description: 'Video conferencing integration name' })
  @IsString()
  @Length(1, 200)
  name: string;

  @ApiProperty({ 
    description: 'Video conferencing provider',
    enum: [
      IntegrationProvider.ZOOM,
      IntegrationProvider.MICROSOFT_TEAMS,
      IntegrationProvider.GOOGLE_MEET,
      IntegrationProvider.WEBEX,
    ],
  })
  @IsEnum([
    IntegrationProvider.ZOOM,
    IntegrationProvider.MICROSOFT_TEAMS,
    IntegrationProvider.GOOGLE_MEET,
    IntegrationProvider.WEBEX,
  ])
  provider: IntegrationProvider;

  @ApiProperty({ description: 'OAuth configuration' })
  @ValidateNested()
  @Type(() => OAuthConfigDto)
  oauthConfig: OAuthConfigDto;

  @ApiProperty({ description: 'Organization ID', required: false })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({ description: 'Video conferencing settings', required: false })
  @IsOptional()
  @IsObject()
  videoSettings?: {
    defaultMeetingType?: string;
    autoRecord?: boolean;
    waitingRoom?: boolean;
    passwordProtected?: boolean;
  };
}

export class CreateSocialLoginIntegrationDto {
  @ApiProperty({ description: 'Social login integration name' })
  @IsString()
  @Length(1, 200)
  name: string;

  @ApiProperty({ 
    description: 'Social login provider',
    enum: [
      IntegrationProvider.GOOGLE_OAUTH,
      IntegrationProvider.MICROSOFT_OAUTH,
      IntegrationProvider.LINKEDIN_OAUTH,
      IntegrationProvider.GITHUB_OAUTH,
      IntegrationProvider.FACEBOOK_OAUTH,
    ],
  })
  @IsEnum([
    IntegrationProvider.GOOGLE_OAUTH,
    IntegrationProvider.MICROSOFT_OAUTH,
    IntegrationProvider.LINKEDIN_OAUTH,
    IntegrationProvider.GITHUB_OAUTH,
    IntegrationProvider.FACEBOOK_OAUTH,
  ])
  provider: IntegrationProvider;

  @ApiProperty({ description: 'OAuth configuration' })
  @ValidateNested()
  @Type(() => OAuthConfigDto)
  oauthConfig: OAuthConfigDto;

  @ApiProperty({ description: 'Organization ID', required: false })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({ description: 'Social login settings', required: false })
  @IsOptional()
  @IsObject()
  socialLoginSettings?: {
    allowedDomains?: string[];
    autoCreateUser?: boolean;
    defaultRole?: string;
    profileMapping?: Record<string, string>;
  };
}

export class CreateJobBoardIntegrationDto {
  @ApiProperty({ description: 'Job board integration name' })
  @IsString()
  @Length(1, 200)
  name: string;

  @ApiProperty({ 
    description: 'Job board provider',
    enum: [
      IntegrationProvider.INDEED,
      IntegrationProvider.LINKEDIN_JOBS,
      IntegrationProvider.GLASSDOOR,
      IntegrationProvider.MONSTER,
    ],
  })
  @IsEnum([
    IntegrationProvider.INDEED,
    IntegrationProvider.LINKEDIN_JOBS,
    IntegrationProvider.GLASSDOOR,
    IntegrationProvider.MONSTER,
  ])
  provider: IntegrationProvider;

  @ApiProperty({ description: 'API configuration' })
  @ValidateNested()
  @Type(() => ApiConfigDto)
  apiConfig: ApiConfigDto;

  @ApiProperty({ description: 'Organization ID', required: false })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({ description: 'Job board settings', required: false })
  @IsOptional()
  @IsObject()
  jobBoardSettings?: {
    autoSync?: boolean;
    syncInterval?: number;
    jobCategories?: string[];
    locationFilter?: string[];
  };
}

export class CreateMeetingDto {
  @ApiProperty({ description: 'Meeting topic' })
  @IsString()
  @Length(1, 200)
  topic: string;

  @ApiProperty({ description: 'Meeting start time' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ description: 'Meeting duration in minutes' })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1440) // Max 24 hours
  duration: number;

  @ApiProperty({ description: 'Meeting agenda', required: false })
  @IsOptional()
  @IsString()
  agenda?: string;

  @ApiProperty({ description: 'Meeting settings', required: false })
  @IsOptional()
  @IsObject()
  settings?: {
    password?: string;
    waitingRoom?: boolean;
    autoRecord?: boolean;
    muteParticipants?: boolean;
    allowScreenShare?: boolean;
  };

  @ApiProperty({ description: 'Meeting participants', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  participants?: string[];
}

export class SyncIntegrationDto {
  @ApiProperty({ description: 'Force full sync', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  fullSync?: boolean = false;

  @ApiProperty({ description: 'Sync specific data types', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dataTypes?: string[];

  @ApiProperty({ description: 'Sync filters', required: false })
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;
}

export class IntegrationQueryDto {
  @ApiProperty({ description: 'Filter by integration type', required: false })
  @IsOptional()
  @IsEnum(IntegrationType)
  type?: IntegrationType;

  @ApiProperty({ description: 'Filter by integration provider', required: false })
  @IsOptional()
  @IsEnum(IntegrationProvider)
  provider?: IntegrationProvider;

  @ApiProperty({ description: 'Filter by integration status', required: false })
  @IsOptional()
  @IsEnum(IntegrationStatus)
  status?: IntegrationStatus;

  @ApiProperty({ description: 'Filter by organization', required: false })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({ description: 'Search term for name or description', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ description: 'Number of results to return', required: false, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiProperty({ description: 'Number of results to skip', required: false, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0;
}

export class IntegrationHealthQueryDto {
  @ApiProperty({ description: 'Perform deep health check', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  deep?: boolean = false;

  @ApiProperty({ description: 'Include performance metrics', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  includeMetrics?: boolean = true;

  @ApiProperty({ description: 'Check connectivity', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  checkConnectivity?: boolean = true;
}

export class IntegrationStatsQueryDto {
  @ApiProperty({ description: 'Number of days to include in stats', required: false, default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(365)
  days?: number = 30;

  @ApiProperty({ description: 'Start date for stats', required: false })
  @IsOptional()
  @Transform(({ value }) => new Date(value))
  startDate?: Date;

  @ApiProperty({ description: 'End date for stats', required: false })
  @IsOptional()
  @Transform(({ value }) => new Date(value))
  endDate?: Date;

  @ApiProperty({ 
    description: 'Group by time period',
    enum: ['hour', 'day', 'week', 'month'],
    required: false,
    default: 'day',
  })
  @IsOptional()
  @IsEnum(['hour', 'day', 'week', 'month'])
  groupBy?: 'hour' | 'day' | 'week' | 'month' = 'day';

  @ApiProperty({ description: 'Include detailed metrics', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  detailed?: boolean = false;
}

export class BulkIntegrationActionDto {
  @ApiProperty({ description: 'Integration IDs to perform action on' })
  @IsArray()
  @IsString({ each: true })
  integrationIds: string[];

  @ApiProperty({ 
    description: 'Action to perform',
    enum: ['activate', 'deactivate', 'suspend', 'sync', 'delete'],
  })
  @IsEnum(['activate', 'deactivate', 'suspend', 'sync', 'delete'])
  action: 'activate' | 'deactivate' | 'suspend' | 'sync' | 'delete';

  @ApiProperty({ description: 'Reason for the action', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class IntegrationWebhookConfigDto {
  @ApiProperty({ description: 'Webhook URL' })
  @IsUrl()
  url: string;

  @ApiProperty({ description: 'Webhook secret', required: false })
  @IsOptional()
  @IsString()
  secret?: string;

  @ApiProperty({ description: 'Events to subscribe to' })
  @IsArray()
  @IsString({ each: true })
  events: string[];

  @ApiProperty({ description: 'Number of retry attempts', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10)
  retryAttempts?: number;
}

export class IntegrationNotificationConfigDto {
  @ApiProperty({ description: 'Enable notifications', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;

  @ApiProperty({ description: 'Events to notify about' })
  @IsArray()
  @IsString({ each: true })
  events: string[];

  @ApiProperty({ description: 'Notification channels' })
  @IsArray()
  @IsString({ each: true })
  channels: string[];

  @ApiProperty({ description: 'Notification recipients', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recipients?: string[];
}

export class IntegrationSyncConfigDto {
  @ApiProperty({ description: 'Enable automatic sync', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;

  @ApiProperty({ description: 'Sync frequency in minutes' })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(43200) // Max 30 days
  frequency: number;

  @ApiProperty({ description: 'Batch size for sync operations', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  batchSize?: number;

  @ApiProperty({ 
    description: 'Conflict resolution strategy',
    enum: ['local', 'remote', 'manual'],
    required: false,
    default: 'remote',
  })
  @IsOptional()
  @IsEnum(['local', 'remote', 'manual'])
  conflictResolution?: 'local' | 'remote' | 'manual' = 'remote';
}
