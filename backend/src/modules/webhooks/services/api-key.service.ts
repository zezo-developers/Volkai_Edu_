import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Between } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { 
  ApiKey, 
  ApiKeyStatus, 
  ApiKeyType, 
  ApiScope 
} from '../../../database/entities/api-key.entity';
import { 
  ApiKeyUsage, 
  RequestMethod, 
  UsageStatus 
} from '../../../database/entities/api-key-usage.entity';

export interface CreateApiKeyDto {
  name: string;
  description?: string;
  type?: ApiKeyType;
  scopes: ApiScope[];
  organizationId?: string;
  expiresInDays?: number;
  config?: {
    rateLimit?: {
      requests: number;
      window: number;
      burst?: number;
    };
    allowedIps?: string[];
    allowedReferrers?: string[];
    dailyLimit?: number;
    monthlyLimit?: number;
    features?: Record<string, boolean>;
  };
}

export interface UpdateApiKeyDto {
  name?: string;
  description?: string;
  status?: ApiKeyStatus;
  scopes?: ApiScope[];
  config?: any;
  expiresAt?: Date;
}

export interface ApiKeyValidationResult {
  isValid: boolean;
  apiKey?: ApiKey;
  error?: string;
  rateLimitInfo?: {
    remaining: number;
    resetTime: Date;
    limit: number;
  };
}

export interface UsageAnalytics {
  totalRequests: number;
  successRate: number;
  averageResponseTime: number;
  topEndpoints: Array<{ endpoint: string; count: number }>;
  dailyUsage: Array<{ date: string; requests: number }>;
  statusCodeDistribution: Record<number, number>;
  errorRate: number;
}

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);

  constructor(
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
    @InjectRepository(ApiKey)
    private apiKeyRepository: Repository<ApiKey>,
    @InjectRepository(ApiKeyUsage)
    private apiKeyUsageRepository: Repository<ApiKeyUsage>,
  ) {}

  // API Key Management
  async createApiKey(
    createDto: CreateApiKeyDto,
    createdBy: string
  ): Promise<{ apiKey: ApiKey; plainKey: string }> {
    // Check if name already exists for the organization
    const existingKey = await this.apiKeyRepository.findOne({
      where: {
        name: createDto.name,
        organizationId: createDto.organizationId || null,
        status: ApiKeyStatus.ACTIVE,
      },
    });

    if (existingKey) {
      throw new ConflictException('API key with this name already exists');
    }

    // Create API key
    const { apiKey: apiKeyData, plainKey } = ApiKey.createApiKey(
      createDto.name,
      createDto.scopes,
      createdBy,
      createDto.organizationId,
      createDto.type
    );

    // Apply custom configuration
    if (createDto.config) {
      apiKeyData.config = { ...apiKeyData.config, ...createDto.config };
    }

    // Set description
    if (createDto.description) {
      apiKeyData.description = createDto.description;
    }

    // Set expiration
    if (createDto.expiresInDays) {
      apiKeyData.expiresAt = new Date(Date.now() + createDto.expiresInDays * 24 * 60 * 60 * 1000);
    }

    const apiKey = this.apiKeyRepository.create(apiKeyData);
    const savedApiKey = await this.apiKeyRepository.save(apiKey);

    // Emit event
    this.eventEmitter.emit('api-key.created', {
      apiKeyId: savedApiKey.id,
      organizationId: savedApiKey.organizationId,
      createdBy,
      type: savedApiKey.type,
    });

    this.logger.log(`Created API key: ${savedApiKey.id} for ${savedApiKey.name}`);

    return { apiKey: savedApiKey, plainKey };
  }

  async createPartnerKey(
    name: string,
    scopes: ApiScope[],
    createdBy: string,
    organizationId: string,
    description?: string
  ): Promise<{ apiKey: ApiKey; plainKey: string }> {
    const { apiKey: apiKeyData, plainKey } = ApiKey.createPartnerKey(
      name,
      scopes,
      createdBy,
      organizationId
    );

    if (description) {
      apiKeyData.description = description;
    }

    const apiKey = this.apiKeyRepository.create(apiKeyData);
    const savedApiKey = await this.apiKeyRepository.save(apiKey);

    this.eventEmitter.emit('api-key.created', {
      apiKeyId: savedApiKey.id,
      organizationId: savedApiKey.organizationId,
      createdBy,
      type: ApiKeyType.PARTNER,
    });

    this.logger.log(`Created partner API key: ${savedApiKey.id} for ${name}`);

    return { apiKey: savedApiKey, plainKey };
  }

  async createWebhookKey(
    name: string,
    webhookUrl: string,
    createdBy: string,
    organizationId?: string,
    description?: string
  ): Promise<{ apiKey: ApiKey; plainKey: string }> {
    const { apiKey: apiKeyData, plainKey } = ApiKey.createWebhookKey(
      name,
      webhookUrl,
      createdBy,
      organizationId
    );

    if (description) {
      apiKeyData.description = description;
    }

    const apiKey = this.apiKeyRepository.create(apiKeyData);
    const savedApiKey = await this.apiKeyRepository.save(apiKey);

    this.eventEmitter.emit('api-key.created', {
      apiKeyId: savedApiKey.id,
      organizationId: savedApiKey.organizationId,
      createdBy,
      type: ApiKeyType.WEBHOOK,
    });

    this.logger.log(`Created webhook API key: ${savedApiKey.id} for ${name}`);

    return { apiKey: savedApiKey, plainKey };
  }

  async updateApiKey(id: string, updateDto: UpdateApiKeyDto): Promise<ApiKey> {
    const apiKey = await this.getApiKeyById(id);

    Object.assign(apiKey, updateDto);
    const updatedApiKey = await this.apiKeyRepository.save(apiKey);

    this.eventEmitter.emit('api-key.updated', {
      apiKeyId: updatedApiKey.id,
      organizationId: updatedApiKey.organizationId,
      changes: updateDto,
    });

    this.logger.log(`Updated API key: ${id}`);

    return updatedApiKey;
  }

  async regenerateApiKey(id: string): Promise<{ apiKey: ApiKey; plainKey: string }> {
    const apiKey = await this.getApiKeyById(id);

    if (apiKey.status === ApiKeyStatus.REVOKED) {
      throw new ConflictException('Cannot regenerate revoked API key');
    }

    const { key, hash, prefix } = ApiKey.generateKey();

    apiKey.keyHash = hash;
    apiKey.keyPrefix = prefix;
    apiKey.lastUsedAt = null;
    apiKey.lastUsedIp = null;
    apiKey.lastUserAgent = null;

    // Reset usage metadata
    apiKey.metadata = {
      ...apiKey.metadata,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      lastUsedAt: null,
    };

    const updatedApiKey = await this.apiKeyRepository.save(apiKey);

    this.eventEmitter.emit('api-key.regenerated', {
      apiKeyId: updatedApiKey.id,
      organizationId: updatedApiKey.organizationId,
    });

    this.logger.log(`Regenerated API key: ${id}`);

    return { apiKey: updatedApiKey, plainKey: key };
  }

  async revokeApiKey(id: string, reason?: string): Promise<ApiKey> {
    const apiKey = await this.getApiKeyById(id);

    apiKey.revoke(reason);
    const revokedApiKey = await this.apiKeyRepository.save(apiKey);

    this.eventEmitter.emit('api-key.revoked', {
      apiKeyId: revokedApiKey.id,
      organizationId: revokedApiKey.organizationId,
      reason,
    });

    this.logger.log(`Revoked API key: ${id} - ${reason || 'No reason provided'}`);

    return revokedApiKey;
  }

  async suspendApiKey(id: string, reason?: string): Promise<ApiKey> {
    const apiKey = await this.getApiKeyById(id);

    apiKey.suspend(reason);
    const suspendedApiKey = await this.apiKeyRepository.save(apiKey);

    this.eventEmitter.emit('api-key.suspended', {
      apiKeyId: suspendedApiKey.id,
      organizationId: suspendedApiKey.organizationId,
      reason,
    });

    this.logger.log(`Suspended API key: ${id} - ${reason || 'No reason provided'}`);

    return suspendedApiKey;
  }

  async activateApiKey(id: string): Promise<ApiKey> {
    const apiKey = await this.getApiKeyById(id);

    if (apiKey.status === ApiKeyStatus.REVOKED) {
      throw new ConflictException('Cannot activate revoked API key');
    }

    apiKey.activate();
    const activatedApiKey = await this.apiKeyRepository.save(apiKey);

    this.eventEmitter.emit('api-key.activated', {
      apiKeyId: activatedApiKey.id,
      organizationId: activatedApiKey.organizationId,
    });

    this.logger.log(`Activated API key: ${id}`);

    return activatedApiKey;
  }

  async deleteApiKey(id: string): Promise<void> {
    const apiKey = await this.getApiKeyById(id);

    await this.apiKeyRepository.remove(apiKey);

    this.eventEmitter.emit('api-key.deleted', {
      apiKeyId: id,
      organizationId: apiKey.organizationId,
    });

    this.logger.log(`Deleted API key: ${id}`);
  }

  // API Key Retrieval
  async getApiKeyById(id: string): Promise<ApiKey> {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { id },
      relations: ['creator', 'organization'],
    });

    if (!apiKey) {
      throw new NotFoundException(`API key not found: ${id}`);
    }

    return apiKey;
  }

  async getApiKeysByOrganization(
    organizationId: string,
    includeInactive = false
  ): Promise<ApiKey[]> {
    const where: FindOptionsWhere<ApiKey> = { organizationId };

    if (!includeInactive) {
      where.status = ApiKeyStatus.ACTIVE;
    }

    return this.apiKeyRepository.find({
      where,
      relations: ['creator'],
      order: { createdAt: 'DESC' },
    });
  }

  async getApiKeysByUser(userId: string, includeInactive = false): Promise<ApiKey[]> {
    const where: FindOptionsWhere<ApiKey> = { createdBy: userId };

    if (!includeInactive) {
      where.status = ApiKeyStatus.ACTIVE;
    }

    return this.apiKeyRepository.find({
      where,
      relations: ['organization'],
      order: { createdAt: 'DESC' },
    });
  }

  // API Key Validation
  async validateApiKey(
    keyString: string,
    ipAddress?: string,
    userAgent?: string,
    referer?: string
  ): Promise<ApiKeyValidationResult> {
    try {
      const keyHash = ApiKey.hashKey(keyString);
      
      const apiKey = await this.apiKeyRepository.findOne({
        where: { keyHash },
        relations: ['organization'],
      });

      if (!apiKey) {
        return { isValid: false, error: 'Invalid API key' };
      }

      // Check if key can make request
      const canMakeRequest = apiKey.canMakeRequest();
      if (!canMakeRequest.allowed) {
        return { isValid: false, error: canMakeRequest.reason };
      }

      // Check IP restrictions
      if (ipAddress && !apiKey.isIpAllowed(ipAddress)) {
        apiKey.recordSuspiciousActivity(`Blocked IP access: ${ipAddress}`);
        await this.apiKeyRepository.save(apiKey);
        return { isValid: false, error: 'IP address not allowed' };
      }

      // Check referrer restrictions
      if (referer && !apiKey.isReferrerAllowed(referer)) {
        apiKey.recordSuspiciousActivity(`Blocked referrer access: ${referer}`);
        await this.apiKeyRepository.save(apiKey);
        return { isValid: false, error: 'Referrer not allowed' };
      }

      // Check time restrictions
      if (!apiKey.isTimeAllowed()) {
        return { isValid: false, error: 'API key not allowed at this time' };
      }

      // Calculate rate limit info
      const rateLimitInfo = await this.calculateRateLimit(apiKey);

      return {
        isValid: true,
        apiKey,
        rateLimitInfo,
      };
    } catch (error) {
      this.logger.error(`Error validating API key: ${error.message}`);
      return { isValid: false, error: 'Internal validation error' };
    }
  }

  // Usage Tracking
  async recordUsage(
    apiKey: ApiKey,
    method: RequestMethod,
    endpoint: string,
    statusCode: number,
    responseTime: number,
    requestSize?: number,
    responseSize?: number,
    ipAddress?: string,
    userAgent?: string,
    referer?: string,
    metadata?: any
  ): Promise<void> {
    try {
      // Create usage record
      const usageData = ApiKeyUsage.createUsageRecord(
        apiKey.id,
        method,
        endpoint,
        statusCode,
        responseTime,
        apiKey.organizationId
      );

      // Add optional data
      if (requestSize) usageData.requestSize = requestSize;
      if (responseSize) usageData.responseSize = responseSize;
      if (ipAddress) usageData.ipAddress = ipAddress;
      if (userAgent) usageData.userAgent = userAgent;
      if (referer) usageData.referer = referer;
      if (metadata) usageData.metadata = { ...usageData.metadata, ...metadata };

      const usage = this.apiKeyUsageRepository.create(usageData);
      await this.apiKeyUsageRepository.save(usage);

      // Update API key statistics
      const success = statusCode >= 200 && statusCode < 300;
      const error = success ? undefined : `HTTP ${statusCode}`;

      apiKey.recordUsage(success, responseTime, ipAddress, userAgent, error);
      await this.apiKeyRepository.save(apiKey);

      // Emit usage event
      this.eventEmitter.emit('api-key.usage', {
        apiKeyId: apiKey.id,
        organizationId: apiKey.organizationId,
        endpoint,
        method,
        statusCode,
        responseTime,
        success,
      });
    } catch (error) {
      this.logger.error(`Error recording API key usage: ${error.message}`);
    }
  }

  async recordRateLimit(apiKey: ApiKey): Promise<void> {
    try {
      apiKey.recordRateLimit();
      await this.apiKeyRepository.save(apiKey);

      this.eventEmitter.emit('api-key.rate-limited', {
        apiKeyId: apiKey.id,
        organizationId: apiKey.organizationId,
      });
    } catch (error) {
      this.logger.error(`Error recording rate limit: ${error.message}`);
    }
  }

  // Rate Limiting
  private async calculateRateLimit(apiKey: ApiKey): Promise<{
    remaining: number;
    resetTime: Date;
    limit: number;
  }> {
    const config = apiKey.config.rateLimit;
    if (!config) {
      return {
        remaining: Infinity,
        resetTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        limit: Infinity,
      };
    }

    const windowMs = config.window * 1000; // Convert to milliseconds
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMs);

    // Count requests in current window
    const requestCount = await this.apiKeyUsageRepository.count({
      where: {
        apiKeyId: apiKey.id,
        createdAt: Between(windowStart, now),
      },
    });

    const remaining = Math.max(0, config.requests - requestCount);
    const resetTime = new Date(windowStart.getTime() + windowMs);

    return {
      remaining,
      resetTime,
      limit: config.requests,
    };
  }

  async checkRateLimit(apiKey: ApiKey): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: Date;
    limit: number;
  }> {
    const rateLimitInfo = await this.calculateRateLimit(apiKey);
    
    return {
      allowed: rateLimitInfo.remaining > 0,
      ...rateLimitInfo,
    };
  }

  // Analytics
  async getUsageAnalytics(
    apiKeyId: string,
    days: number = 30
  ): Promise<UsageAnalytics> {
    const apiKey = await this.getApiKeyById(apiKeyId);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const usageRecords = await this.apiKeyUsageRepository.find({
      where: {
        apiKeyId,
        createdAt: Between(since, new Date()),
      },
      order: { createdAt: 'DESC' },
    });

    const stats = ApiKeyUsage.getUsageStats(usageRecords);
    const trends = ApiKeyUsage.getUsageTrends(usageRecords, 'day');

    return {
      totalRequests: stats.totalRequests,
      successRate: stats.successRate,
      averageResponseTime: stats.averageResponseTime,
      topEndpoints: stats.topEndpoints,
      dailyUsage: trends.map(t => ({
        date: t.period,
        requests: t.requests,
      })),
      statusCodeDistribution: stats.statusCodeDistribution,
      errorRate: stats.errorRate,
    };
  }

  async getOrganizationUsageAnalytics(
    organizationId: string,
    days: number = 30
  ): Promise<{
    totalApiKeys: number;
    activeApiKeys: number;
    totalRequests: number;
    successRate: number;
    topApiKeys: Array<{ name: string; requests: number }>;
    dailyUsage: Array<{ date: string; requests: number }>;
  }> {
    const apiKeys = await this.getApiKeysByOrganization(organizationId, true);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const usageRecords = await this.apiKeyUsageRepository.find({
      where: {
        organizationId,
        createdAt: Between(since, new Date()),
      },
      relations: ['apiKey'],
      order: { createdAt: 'DESC' },
    });

    const stats = ApiKeyUsage.getUsageStats(usageRecords);
    const trends = ApiKeyUsage.getUsageTrends(usageRecords, 'day');

    // Calculate top API keys by usage
    const apiKeyUsage = usageRecords.reduce((acc, record) => {
      const keyName = record.apiKey?.name || 'Unknown';
      acc[keyName] = (acc[keyName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topApiKeys = Object.entries(apiKeyUsage)
      .map(([name, requests]) => ({ name, requests }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10);

    return {
      totalApiKeys: apiKeys.length,
      activeApiKeys: apiKeys.filter(k => k.status === ApiKeyStatus.ACTIVE).length,
      totalRequests: stats.totalRequests,
      successRate: stats.successRate,
      topApiKeys,
      dailyUsage: trends.map(t => ({
        date: t.period,
        requests: t.requests,
      })),
    };
  }

  // Utility Methods
  async cleanupExpiredKeys(): Promise<number> {
    const expiredKeys = await this.apiKeyRepository.find({
      where: {
        expiresAt: Between(new Date(0), new Date()),
        status: ApiKeyStatus.ACTIVE,
      },
    });

    for (const key of expiredKeys) {
      key.status = ApiKeyStatus.EXPIRED;
    }

    if (expiredKeys.length > 0) {
      await this.apiKeyRepository.save(expiredKeys);
      this.logger.log(`Marked ${expiredKeys.length} API keys as expired`);
    }

    return expiredKeys.length;
  }

  async getSystemStats(): Promise<{
    totalApiKeys: number;
    activeApiKeys: number;
    totalRequests: number;
    requestsLast24h: number;
    topOrganizations: Array<{ organizationId: string; requests: number }>;
  }> {
    const [
      totalApiKeys,
      activeApiKeys,
      totalRequests,
      requestsLast24h,
    ] = await Promise.all([
      this.apiKeyRepository.count(),
      this.apiKeyRepository.count({ where: { status: ApiKeyStatus.ACTIVE } }),
      this.apiKeyUsageRepository.count(),
      this.apiKeyUsageRepository.count({
        where: {
          createdAt: Between(new Date(Date.now() - 24 * 60 * 60 * 1000), new Date()),
        },
      }),
    ]);

    // Get top organizations by usage (last 30 days)
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const orgUsage = await this.apiKeyUsageRepository
      .createQueryBuilder('usage')
      .select('usage.organizationId', 'organizationId')
      .addSelect('COUNT(*)', 'requests')
      .where('usage.createdAt >= :since', { since })
      .andWhere('usage.organizationId IS NOT NULL')
      .groupBy('usage.organizationId')
      .orderBy('requests', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      totalApiKeys,
      activeApiKeys,
      totalRequests,
      requestsLast24h,
      topOrganizations: orgUsage.map(org => ({
        organizationId: org.organizationId,
        requests: parseInt(org.requests),
      })),
    };
  }
}
