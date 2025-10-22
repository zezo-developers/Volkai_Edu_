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
  ArrayNotEmpty,
  IsUrl,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiKeyType, ApiScope } from '../../../database/entities/api-key.entity';

export class CreateApiKeyDto {
  @ApiProperty({ description: 'API key name' })
  @IsString()
  @Length(1, 200)
  name: string;

  @ApiProperty({ description: 'API key description', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @ApiProperty({ 
    description: 'API key type',
    enum: ApiKeyType,
    required: false,
    default: ApiKeyType.SECRET,
  })
  @IsOptional()
  @IsEnum(ApiKeyType)
  type?: ApiKeyType = ApiKeyType.SECRET;

  @ApiProperty({ 
    description: 'API key scopes',
    enum: ApiScope,
    isArray: true,
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(ApiScope, { each: true })
  scopes: ApiScope[];

  @ApiProperty({ description: 'Organization ID (optional for system keys)', required: false })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({ description: 'Expiration in days', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(3650) // Max 10 years
  expiresInDays?: number;

  @ApiProperty({ description: 'API key configuration', required: false })
  @IsOptional()
  @IsObject()
  config?: {
    rateLimit?: {
      requests: number;
      window: number;
      burst?: number;
    };
    allowedIps?: string[];
    allowedReferrers?: string[];
    allowedHours?: [number, number];
    timezone?: string;
    dailyLimit?: number;
    monthlyLimit?: number;
    totalLimit?: number;
    features?: Record<string, boolean>;
    customSettings?: Record<string, any>;
  };
}

export class UpdateApiKeyDto {
  @ApiProperty({ description: 'API key name', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  name?: string;

  @ApiProperty({ description: 'API key description', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @ApiProperty({ 
    description: 'API key scopes',
    enum: ApiScope,
    isArray: true,
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(ApiScope, { each: true })
  scopes?: ApiScope[];

  @ApiProperty({ description: 'API key configuration', required: false })
  @IsOptional()
  @IsObject()
  config?: {
    rateLimit?: {
      requests: number;
      window: number;
      burst?: number;
    };
    allowedIps?: string[];
    allowedReferrers?: string[];
    allowedHours?: [number, number];
    timezone?: string;
    dailyLimit?: number;
    monthlyLimit?: number;
    totalLimit?: number;
    features?: Record<string, boolean>;
    customSettings?: Record<string, any>;
  };

  @ApiProperty({ description: 'API key expiration date', required: false })
  @IsOptional()
  @Transform(({ value }) => new Date(value))
  expiresAt?: Date;
}

export class CreatePartnerKeyDto {
  @ApiProperty({ description: 'Partner API key name' })
  @IsString()
  @Length(1, 200)
  name: string;

  @ApiProperty({ description: 'Partner API key description', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @ApiProperty({ 
    description: 'API key scopes for partner',
    enum: ApiScope,
    isArray: true,
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(ApiScope, { each: true })
  scopes: ApiScope[];

  @ApiProperty({ description: 'Organization ID for partner' })
  @IsString()
  organizationId: string;
}

export class CreateWebhookKeyDto {
  @ApiProperty({ description: 'Webhook API key name' })
  @IsString()
  @Length(1, 200)
  name: string;

  @ApiProperty({ description: 'Webhook API key description', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @ApiProperty({ description: 'Webhook URL' })
  @IsUrl()
  webhookUrl: string;

  @ApiProperty({ description: 'Organization ID (optional for system webhooks)', required: false })
  @IsOptional()
  @IsString()
  organizationId?: string;
}

export class ApiKeyUsageQueryDto {
  @ApiProperty({ description: 'Number of days to include in analytics', required: false, default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(365)
  days?: number = 30;

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
}

export class ApiKeyRateLimitConfigDto {
  @ApiProperty({ description: 'Number of requests allowed' })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000000)
  requests: number;

  @ApiProperty({ description: 'Time window in seconds' })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(86400) // Max 24 hours
  window: number;

  @ApiProperty({ description: 'Burst capacity', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  burst?: number;
}

export class ApiKeySecurityConfigDto {
  @ApiProperty({ description: 'Allowed IP addresses', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedIps?: string[];

  @ApiProperty({ description: 'Blocked IP addresses', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  blockedIps?: string[];

  @ApiProperty({ description: 'Allowed referrer domains', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedReferrers?: string[];

  @ApiProperty({ description: 'Allowed hours [start, end] in 24h format', required: false })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  @Max(23, { each: true })
  allowedHours?: [number, number];

  @ApiProperty({ description: 'Timezone for time restrictions', required: false })
  @IsOptional()
  @IsString()
  timezone?: string;
}

export class ApiKeyLimitsConfigDto {
  @ApiProperty({ description: 'Daily request limit', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  dailyLimit?: number;

  @ApiProperty({ description: 'Monthly request limit', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  monthlyLimit?: number;

  @ApiProperty({ description: 'Total request limit', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  totalLimit?: number;
}

export class CreateApiKeyAdvancedDto extends CreateApiKeyDto {
  @ApiProperty({ description: 'Rate limiting configuration', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => ApiKeyRateLimitConfigDto)
  rateLimit?: ApiKeyRateLimitConfigDto;

  @ApiProperty({ description: 'Security configuration', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => ApiKeySecurityConfigDto)
  security?: ApiKeySecurityConfigDto;

  @ApiProperty({ description: 'Usage limits configuration', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => ApiKeyLimitsConfigDto)
  limits?: ApiKeyLimitsConfigDto;

  @ApiProperty({ description: 'Feature flags', required: false })
  @IsOptional()
  @IsObject()
  features?: Record<string, boolean>;

  @ApiProperty({ description: 'Tags for organization and filtering', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class BulkApiKeyActionDto {
  @ApiProperty({ description: 'API key IDs to perform action on' })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  apiKeyIds: string[];

  @ApiProperty({ 
    description: 'Action to perform',
    enum: ['activate', 'suspend', 'revoke', 'delete'],
  })
  @IsEnum(['activate', 'suspend', 'revoke', 'delete'])
  action: 'activate' | 'suspend' | 'revoke' | 'delete';

  @ApiProperty({ description: 'Reason for the action', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ApiKeyValidationDto {
  @ApiProperty({ description: 'API key to validate' })
  @IsString()
  apiKey: string;

  @ApiProperty({ description: 'Client IP address', required: false })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiProperty({ description: 'User agent string', required: false })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiProperty({ description: 'Referer header', required: false })
  @IsOptional()
  @IsString()
  referer?: string;
}

export class RecordApiKeyUsageDto {
  @ApiProperty({ description: 'HTTP method used' })
  @IsString()
  method: string;

  @ApiProperty({ description: 'API endpoint accessed' })
  @IsString()
  endpoint: string;

  @ApiProperty({ description: 'HTTP status code' })
  @Type(() => Number)
  @IsNumber()
  @Min(100)
  @Max(599)
  statusCode: number;

  @ApiProperty({ description: 'Response time in milliseconds' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  responseTime: number;

  @ApiProperty({ description: 'Request size in bytes', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  requestSize?: number;

  @ApiProperty({ description: 'Response size in bytes', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  responseSize?: number;

  @ApiProperty({ description: 'Client IP address', required: false })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiProperty({ description: 'User agent string', required: false })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiProperty({ description: 'Referer header', required: false })
  @IsOptional()
  @IsString()
  referer?: string;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class ApiKeyStatsQueryDto {
  @ApiProperty({ description: 'Organization ID to filter by', required: false })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({ description: 'API key type to filter by', required: false })
  @IsOptional()
  @IsEnum(ApiKeyType)
  type?: ApiKeyType;

  @ApiProperty({ description: 'Number of days to include in stats', required: false, default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(365)
  days?: number = 30;

  @ApiProperty({ description: 'Include inactive keys', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  includeInactive?: boolean = false;
}

export class ApiKeySearchDto {
  @ApiProperty({ description: 'Search term for name or description', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ description: 'Filter by API key type', required: false })
  @IsOptional()
  @IsEnum(ApiKeyType)
  type?: ApiKeyType;

  @ApiProperty({ description: 'Filter by scopes', required: false })
  @IsOptional()
  @IsArray()
  @IsEnum(ApiScope, { each: true })
  scopes?: ApiScope[];

  @ApiProperty({ description: 'Filter by organization', required: false })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({ description: 'Filter by tags', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Include inactive keys', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  includeInactive?: boolean = false;

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

  @ApiProperty({ 
    description: 'Sort by field',
    enum: ['name', 'createdAt', 'lastUsedAt', 'totalRequests'],
    required: false,
    default: 'createdAt',
  })
  @IsOptional()
  @IsEnum(['name', 'createdAt', 'lastUsedAt', 'totalRequests'])
  sortBy?: 'name' | 'createdAt' | 'lastUsedAt' | 'totalRequests' = 'createdAt';

  @ApiProperty({ 
    description: 'Sort order',
    enum: ['asc', 'desc'],
    required: false,
    default: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
