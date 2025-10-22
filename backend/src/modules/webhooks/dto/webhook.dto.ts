import { ApiProperty } from '@nestjs/swagger';
import { 
  IsString, 
  IsUrl, 
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
  ArrayNotEmpty,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { WebhookEvent } from '../../../database/entities/webhook-endpoint.entity';

export class CreateWebhookEndpointDto {
  @ApiProperty({ description: 'Webhook endpoint name' })
  @IsString()
  @Length(1, 200)
  name: string;

  @ApiProperty({ description: 'Webhook endpoint URL' })
  @IsUrl()
  url: string;

  @ApiProperty({ 
    description: 'Events to subscribe to',
    enum: WebhookEvent,
    isArray: true,
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(WebhookEvent, { each: true })
  events: WebhookEvent[];

  @ApiProperty({ description: 'Organization ID (optional for system webhooks)', required: false })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({ description: 'Webhook configuration', required: false })
  @IsOptional()
  @IsObject()
  config?: {
    method?: string;
    timeout?: number;
    secret?: string;
    signatureHeader?: string;
    signatureAlgorithm?: string;
    headers?: Record<string, string>;
    retryAttempts?: number;
    retryDelay?: number;
    maxRetryDelay?: number;
    filters?: Record<string, any>;
    transformations?: Record<string, any>;
  };
}

export class UpdateWebhookEndpointDto {
  @ApiProperty({ description: 'Webhook endpoint name', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  name?: string;

  @ApiProperty({ description: 'Webhook endpoint URL', required: false })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiProperty({ 
    description: 'Events to subscribe to',
    enum: WebhookEvent,
    isArray: true,
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(WebhookEvent, { each: true })
  events?: WebhookEvent[];

  @ApiProperty({ description: 'Webhook configuration', required: false })
  @IsOptional()
  @IsObject()
  config?: {
    method?: string;
    timeout?: number;
    secret?: string;
    signatureHeader?: string;
    signatureAlgorithm?: string;
    headers?: Record<string, string>;
    retryAttempts?: number;
    retryDelay?: number;
    maxRetryDelay?: number;
    filters?: Record<string, any>;
    transformations?: Record<string, any>;
  };

  @ApiProperty({ description: 'Enable or disable webhook', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class TestWebhookDto {
  @ApiProperty({ 
    description: 'Event to test',
    enum: WebhookEvent,
  })
  @IsEnum(WebhookEvent)
  event: WebhookEvent;

  @ApiProperty({ description: 'Test data payload', required: false })
  @IsOptional()
  @IsObject()
  testData?: any;

  @ApiProperty({ description: 'User ID for context', required: false })
  @IsOptional()
  @IsString()
  userId?: string;
}

export class WebhookStatsQueryDto {
  @ApiProperty({ description: 'Endpoint ID to get stats for', required: false })
  @IsOptional()
  @IsString()
  endpointId?: string;

  @ApiProperty({ description: 'Number of days to include in stats', required: false, default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(365)
  days?: number = 30;
}

export class WebhookDeliveryQueryDto {
  @ApiProperty({ description: 'Endpoint ID to filter by', required: false })
  @IsOptional()
  @IsString()
  endpointId?: string;

  @ApiProperty({ description: 'Delivery status to filter by', required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ description: 'Event type to filter by', required: false })
  @IsOptional()
  @IsEnum(WebhookEvent)
  eventType?: WebhookEvent;

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

  @ApiProperty({ description: 'Start date for filtering', required: false })
  @IsOptional()
  @Transform(({ value }) => new Date(value))
  startDate?: Date;

  @ApiProperty({ description: 'End date for filtering', required: false })
  @IsOptional()
  @Transform(({ value }) => new Date(value))
  endDate?: Date;
}

export class RetryWebhookDeliveryDto {
  @ApiProperty({ description: 'Force retry even if max attempts reached', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  force?: boolean = false;
}

export class BulkWebhookActionDto {
  @ApiProperty({ description: 'Webhook endpoint IDs to perform action on' })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  endpointIds: string[];

  @ApiProperty({ 
    description: 'Action to perform',
    enum: ['activate', 'deactivate', 'delete', 'verify'],
  })
  @IsEnum(['activate', 'deactivate', 'delete', 'verify'])
  action: 'activate' | 'deactivate' | 'delete' | 'verify';

  @ApiProperty({ description: 'Reason for the action', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class WebhookEventFilterDto {
  @ApiProperty({ description: 'Event category to filter by', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: 'Search term for event name or description', required: false })
  @IsOptional()
  @IsString()
  search?: string;
}

export class WebhookSecurityConfigDto {
  @ApiProperty({ description: 'Webhook secret for signature verification' })
  @IsString()
  @Length(16, 128)
  secret: string;

  @ApiProperty({ 
    description: 'Signature algorithm',
    enum: ['sha256', 'sha512'],
    required: false,
    default: 'sha256',
  })
  @IsOptional()
  @IsEnum(['sha256', 'sha512'])
  algorithm?: 'sha256' | 'sha512' = 'sha256';

  @ApiProperty({ description: 'Custom signature header name', required: false })
  @IsOptional()
  @IsString()
  signatureHeader?: string;

  @ApiProperty({ description: 'Allowed IP addresses', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedIps?: string[];

  @ApiProperty({ description: 'Request timeout in milliseconds', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1000)
  @Max(30000)
  timeout?: number;
}

export class WebhookRetryConfigDto {
  @ApiProperty({ description: 'Maximum retry attempts', required: false, default: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10)
  retryAttempts?: number = 3;

  @ApiProperty({ description: 'Initial retry delay in milliseconds', required: false, default: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(100)
  @Max(60000)
  retryDelay?: number = 1000;

  @ApiProperty({ description: 'Maximum retry delay in milliseconds', required: false, default: 30000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1000)
  @Max(300000)
  maxRetryDelay?: number = 30000;

  @ApiProperty({ description: 'Use exponential backoff', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  exponentialBackoff?: boolean = true;
}

export class WebhookFilterConfigDto {
  @ApiProperty({ description: 'Field-based filters', required: false })
  @IsOptional()
  @IsObject()
  fieldFilters?: Record<string, any>;

  @ApiProperty({ description: 'JSONPath expressions for filtering', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  jsonPathFilters?: string[];

  @ApiProperty({ description: 'Custom filter function (JavaScript)', required: false })
  @IsOptional()
  @IsString()
  customFilter?: string;

  @ApiProperty({ description: 'Include only specified fields', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includeFields?: string[];

  @ApiProperty({ description: 'Exclude specified fields', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeFields?: string[];
}

export class WebhookTransformConfigDto {
  @ApiProperty({ description: 'Field mappings for transformation', required: false })
  @IsOptional()
  @IsObject()
  fieldMappings?: Record<string, string>;

  @ApiProperty({ description: 'Custom transformation function (JavaScript)', required: false })
  @IsOptional()
  @IsString()
  customTransform?: string;

  @ApiProperty({ description: 'Add custom fields to payload', required: false })
  @IsOptional()
  @IsObject()
  additionalFields?: Record<string, any>;

  @ApiProperty({ description: 'Template for payload structure', required: false })
  @IsOptional()
  @IsObject()
  payloadTemplate?: Record<string, any>;
}

export class CreateWebhookEndpointAdvancedDto extends CreateWebhookEndpointDto {
  @ApiProperty({ description: 'Security configuration', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => WebhookSecurityConfigDto)
  security?: WebhookSecurityConfigDto;

  @ApiProperty({ description: 'Retry configuration', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => WebhookRetryConfigDto)
  retry?: WebhookRetryConfigDto;

  @ApiProperty({ description: 'Filter configuration', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => WebhookFilterConfigDto)
  filters?: WebhookFilterConfigDto;

  @ApiProperty({ description: 'Transform configuration', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => WebhookTransformConfigDto)
  transforms?: WebhookTransformConfigDto;

  @ApiProperty({ description: 'Custom headers to include in requests', required: false })
  @IsOptional()
  @IsObject()
  customHeaders?: Record<string, string>;

  @ApiProperty({ description: 'Tags for organization and filtering', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Webhook description', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;
}

export class WebhookHealthCheckDto {
  @ApiProperty({ description: 'Perform deep health check', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  deep?: boolean = false;

  @ApiProperty({ description: 'Include performance metrics', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  includeMetrics?: boolean = true;
}

export class WebhookAnalyticsQueryDto {
  @ApiProperty({ description: 'Start date for analytics', required: false })
  @IsOptional()
  @Transform(({ value }) => new Date(value))
  startDate?: Date;

  @ApiProperty({ description: 'End date for analytics', required: false })
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

  @ApiProperty({ description: 'Filter by event types', required: false })
  @IsOptional()
  @IsArray()
  @IsEnum(WebhookEvent, { each: true })
  eventTypes?: WebhookEvent[];
}
