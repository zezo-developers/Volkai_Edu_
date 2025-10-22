import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { ApiKey } from './api-key.entity';

export enum RequestMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS',
}

export enum UsageStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  RATE_LIMITED = 'rate_limited',
  UNAUTHORIZED = 'unauthorized',
  FORBIDDEN = 'forbidden',
  NOT_FOUND = 'not_found',
}

@Entity('api_key_usage')
@Index(['apiKeyId', 'createdAt'])
@Index(['status', 'createdAt'])
@Index(['endpoint', 'createdAt'])
@Index(['ipAddress', 'createdAt'])
@Index(['organizationId', 'createdAt'])
export class ApiKeyUsage {
  @ApiProperty({ description: 'Usage record ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'API Key ID' })
  @Column({ name: 'api_key_id' })
  apiKeyId: string;

  @ApiProperty({ description: 'Organization ID (nullable)' })
  @Column({ name: 'organization_id', nullable: true })
  organizationId?: string;

  @ApiProperty({ enum: RequestMethod, description: 'HTTP method used' })
  @Column({
    type: 'enum',
    enum: RequestMethod,
  })
  method: RequestMethod;

  @ApiProperty({ description: 'API endpoint accessed' })
  @Column({ length: 500 })
  endpoint: string;

  @ApiProperty({ enum: UsageStatus, description: 'Request status' })
  @Column({
    type: 'enum',
    enum: UsageStatus,
  })
  status: UsageStatus;

  @ApiProperty({ description: 'HTTP status code' })
  @Column({ name: 'status_code' })
  statusCode: number;

  @ApiProperty({ description: 'Response time in milliseconds' })
  @Column({ name: 'response_time' })
  responseTime: number;

  @ApiProperty({ description: 'Request size in bytes' })
  @Column({ name: 'request_size', nullable: true })
  requestSize?: number;

  @ApiProperty({ description: 'Response size in bytes' })
  @Column({ name: 'response_size', nullable: true })
  responseSize?: number;

  @ApiProperty({ description: 'Client IP address' })
  @Column({ name: 'ip_address', nullable: true })
  ipAddress?: string;

  @ApiProperty({ description: 'User agent string' })
  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string;

  @ApiProperty({ description: 'Referer header' })
  @Column({ type: 'text', nullable: true })
  referer?: string;

  @ApiProperty({ description: 'Request metadata and details' })
  @Column({ type: 'jsonb', default: {} })
  metadata: {
    // Request details
    requestId?: string;
    correlationId?: string;
    
    // Query parameters
    queryParams?: Record<string, any>;
    
    // Request headers (selected)
    headers?: Record<string, string>;
    
    // Authentication details
    authMethod?: string;
    userId?: string;
    
    // Rate limiting info
    rateLimitRemaining?: number;
    rateLimitReset?: Date;
    
    // Error details
    errorCode?: string;
    errorMessage?: string;
    
    // Performance metrics
    dbQueryTime?: number;
    cacheHitRate?: number;
    
    // Feature usage
    featuresUsed?: string[];
    
    // Geographic info
    country?: string;
    region?: string;
    city?: string;
    
    // Custom fields
    customFields?: Record<string, any>;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => ApiKey, apiKey => apiKey.usageRecords)
  @JoinColumn({ name: 'api_key_id' })
  apiKey: ApiKey;

  // Virtual properties
  get isSuccess(): boolean {
    return this.status === UsageStatus.SUCCESS;
  }

  get isError(): boolean {
    return [
      UsageStatus.ERROR,
      UsageStatus.UNAUTHORIZED,
      UsageStatus.FORBIDDEN,
      UsageStatus.NOT_FOUND,
    ].includes(this.status);
  }

  get isRateLimited(): boolean {
    return this.status === UsageStatus.RATE_LIMITED;
  }

  get isFastResponse(): boolean {
    return this.responseTime < 200; // Less than 200ms
  }

  get isSlowResponse(): boolean {
    return this.responseTime > 2000; // More than 2 seconds
  }

  // Methods
  setError(errorCode: string, errorMessage?: string): void {
    this.status = UsageStatus.ERROR;
    this.metadata.errorCode = errorCode;
    if (errorMessage) {
      this.metadata.errorMessage = errorMessage;
    }
  }

  setRateLimited(remaining: number, resetTime: Date): void {
    this.status = UsageStatus.RATE_LIMITED;
    this.metadata.rateLimitRemaining = remaining;
    this.metadata.rateLimitReset = resetTime;
  }

  setPerformanceMetrics(dbQueryTime?: number, cacheHitRate?: number): void {
    if (dbQueryTime !== undefined) {
      this.metadata.dbQueryTime = dbQueryTime;
    }
    if (cacheHitRate !== undefined) {
      this.metadata.cacheHitRate = cacheHitRate;
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

  setGeographicInfo(country?: string, region?: string, city?: string): void {
    this.metadata.country = country;
    this.metadata.region = region;
    this.metadata.city = city;
  }

  addCustomField(key: string, value: any): void {
    if (!this.metadata.customFields) {
      this.metadata.customFields = {};
    }
    this.metadata.customFields[key] = value;
  }

  // Static factory methods
  static createUsageRecord(
    apiKeyId: string,
    method: RequestMethod,
    endpoint: string,
    statusCode: number,
    responseTime: number,
    organizationId?: string
  ): Partial<ApiKeyUsage> {
    const status = ApiKeyUsage.getStatusFromCode(statusCode);
    
    return {
      apiKeyId,
      organizationId,
      method,
      endpoint,
      status,
      statusCode,
      responseTime,
      metadata: {},
    };
  }

  static createSuccessRecord(
    apiKeyId: string,
    method: RequestMethod,
    endpoint: string,
    responseTime: number,
    organizationId?: string
  ): Partial<ApiKeyUsage> {
    return this.createUsageRecord(
      apiKeyId,
      method,
      endpoint,
      200,
      responseTime,
      organizationId
    );
  }

  static createErrorRecord(
    apiKeyId: string,
    method: RequestMethod,
    endpoint: string,
    statusCode: number,
    responseTime: number,
    errorCode?: string,
    errorMessage?: string,
    organizationId?: string
  ): Partial<ApiKeyUsage> {
    const record = this.createUsageRecord(
      apiKeyId,
      method,
      endpoint,
      statusCode,
      responseTime,
      organizationId
    );

    if (errorCode || errorMessage) {
      record.metadata = {
        errorCode,
        errorMessage,
      };
    }

    return record;
  }

  static createRateLimitRecord(
    apiKeyId: string,
    method: RequestMethod,
    endpoint: string,
    remaining: number,
    resetTime: Date,
    organizationId?: string
  ): Partial<ApiKeyUsage> {
    const record = this.createUsageRecord(
      apiKeyId,
      method,
      endpoint,
      429,
      0,
      organizationId
    );

    record.status = UsageStatus.RATE_LIMITED;
    record.metadata = {
      rateLimitRemaining: remaining,
      rateLimitReset: resetTime,
    };

    return record;
  }

  private static getStatusFromCode(statusCode: number): UsageStatus {
    if (statusCode >= 200 && statusCode < 300) {
      return UsageStatus.SUCCESS;
    } else if (statusCode === 401) {
      return UsageStatus.UNAUTHORIZED;
    } else if (statusCode === 403) {
      return UsageStatus.FORBIDDEN;
    } else if (statusCode === 404) {
      return UsageStatus.NOT_FOUND;
    } else if (statusCode === 429) {
      return UsageStatus.RATE_LIMITED;
    } else {
      return UsageStatus.ERROR;
    }
  }

  // Analytics helper methods
  static getUsageStats(records: ApiKeyUsage[]): {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    errorRate: number;
    rateLimitRate: number;
    topEndpoints: Array<{ endpoint: string; count: number }>;
    statusCodeDistribution: Record<number, number>;
  } {
    const totalRequests = records.length;
    
    if (totalRequests === 0) {
      return {
        totalRequests: 0,
        successRate: 0,
        averageResponseTime: 0,
        errorRate: 0,
        rateLimitRate: 0,
        topEndpoints: [],
        statusCodeDistribution: {},
      };
    }

    const successCount = records.filter(r => r.isSuccess).length;
    const errorCount = records.filter(r => r.isError).length;
    const rateLimitCount = records.filter(r => r.isRateLimited).length;
    
    const totalResponseTime = records.reduce((sum, r) => sum + r.responseTime, 0);
    const averageResponseTime = totalResponseTime / totalRequests;

    // Top endpoints
    const endpointCounts = records.reduce((acc, record) => {
      acc[record.endpoint] = (acc[record.endpoint] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topEndpoints = Object.entries(endpointCounts)
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Status code distribution
    const statusCodeDistribution = records.reduce((acc, record) => {
      acc[record.statusCode] = (acc[record.statusCode] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return {
      totalRequests,
      successRate: (successCount / totalRequests) * 100,
      averageResponseTime,
      errorRate: (errorCount / totalRequests) * 100,
      rateLimitRate: (rateLimitCount / totalRequests) * 100,
      topEndpoints,
      statusCodeDistribution,
    };
  }

  static getUsageTrends(
    records: ApiKeyUsage[],
    groupBy: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Array<{
    period: string;
    requests: number;
    successRate: number;
    averageResponseTime: number;
  }> {
    const groups = records.reduce((acc, record) => {
      let period: string;
      const date = new Date(record.createdAt);

      switch (groupBy) {
        case 'hour':
          period = date.toISOString().substring(0, 13) + ':00:00Z';
          break;
        case 'day':
          period = date.toISOString().substring(0, 10);
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          period = weekStart.toISOString().substring(0, 10);
          break;
        case 'month':
          period = date.toISOString().substring(0, 7);
          break;
      }

      if (!acc[period]) {
        acc[period] = [];
      }
      acc[period].push(record);
      return acc;
    }, {} as Record<string, ApiKeyUsage[]>);

    return Object.entries(groups)
      .map(([period, periodRecords]) => {
        const stats = this.getUsageStats(periodRecords);
        return {
          period,
          requests: stats.totalRequests,
          successRate: stats.successRate,
          averageResponseTime: stats.averageResponseTime,
        };
      })
      .sort((a, b) => a.period.localeCompare(b.period));
  }
}
