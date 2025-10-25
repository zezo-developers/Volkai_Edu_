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
import { ApiKeyUsage } from './api-key-usage.entity';

export enum ApiKeyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
}

export enum ApiKeyType {
  PUBLIC = 'public',
  SECRET = 'secret',
  WEBHOOK = 'webhook',
  INTEGRATION = 'integration',
  PARTNER = 'partner',
  INTERNAL = 'internal',
}

export enum ApiScope {
  USER_READ = 'user:read',
  USER_WRITE = 'user:write',
  USER_DELETE = 'user:delete',
  ORG_READ = 'org:read',
  ORG_WRITE = 'org:write',
  ORG_ADMIN = 'org:admin',
  COURSE_READ = 'course:read',
  COURSE_WRITE = 'course:write',
  COURSE_PUBLISH = 'course:publish',
  ASSESSMENT_READ = 'assessment:read',
  ASSESSMENT_WRITE = 'assessment:write',
  ASSESSMENT_GRADE = 'assessment:grade',
  INTERVIEW_READ = 'interview:read',
  INTERVIEW_WRITE = 'interview:write',
  INTERVIEW_SCHEDULE = 'interview:schedule',
  JOB_READ = 'job:read',
  JOB_WRITE = 'job:write',
  JOB_APPLY = 'job:apply',
  BILLING_READ = 'billing:read',
  BILLING_WRITE = 'billing:write',
  ANALYTICS_READ = 'analytics:read',
  ANALYTICS_WRITE = 'analytics:write',
  WEBHOOK_READ = 'webhook:read',
  WEBHOOK_WRITE = 'webhook:write',
  WEBHOOK_MANAGE = 'webhook:manage',
  ADMIN_READ = 'admin:read',
  ADMIN_WRITE = 'admin:write',
  ADMIN_SYSTEM = 'admin:system',
  ALL = '*',
  READ_ONLY = 'read:*',
}

@Entity('api_keys')
@Index(['keyHash'], { unique: true })
@Index(['organizationId', 'status'])
@Index(['createdBy', 'status'])
@Index(['type', 'status'])
@Index(['expiresAt'])
export class ApiKey {
  @ApiProperty({ description: 'API Key ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'API Key name/description' })
  @Column({ length: 200 })
  name: string;

  @ApiProperty({ description: 'API Key description' })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ description: 'Hashed API key (for security)' })
  @Column({ name: 'keyHash', unique: true })
  keyHash: string;

  @ApiProperty({ description: 'API key prefix (visible part)' })
  @Column({ name: 'keyPrefix', length: 20 })
  keyPrefix: string;

  @ApiProperty({ enum: ApiKeyType, description: 'Type of API key' })
  @Column({
    type: 'enum',
    enum: ApiKeyType,
    default: ApiKeyType.SECRET,
  })
  type: ApiKeyType;

  @ApiProperty({ enum: ApiKeyStatus, description: 'API key status' })
  @Column({
    type: 'enum',
    enum: ApiKeyStatus,
    default: ApiKeyStatus.ACTIVE,
  })
  status: ApiKeyStatus;

  @ApiProperty({ description: 'Organization ID (nullable for system keys)' })
  @Column({ name: 'organizationId', nullable: true })
  organizationId?: string;

  @ApiProperty({ description: 'User who created the API key' })
  @Column({ name: 'createdBy' })
  createdBy: string;

  @ApiProperty({ description: 'API key scopes and permissions', type: [String] })
  @Column({ type: 'jsonb', default: [] })
  scopes: ApiScope[];

  @ApiProperty({ description: 'API key configuration and limits' })
  @Column({ type: 'jsonb', default: {} })
  config: {
    rateLimit?: {
      requests: number;
      window: number;
      burst?: number;
    };
    allowedIps?: string[];
    blockedIps?: string[];
    allowedReferrers?: string[];
    allowedHours?: [number, number];
    timezone?: string;
    dailyLimit?: number;
    monthlyLimit?: number;
    totalLimit?: number;
    features?: Record<string, boolean>;
    webhookUrl?: string;
    webhookSecret?: string;
    integrationId?: string;
    integrationVersion?: string;
    customSettings?: Record<string, any>;
  };

  @ApiProperty({ description: 'API key metadata and statistics' })
  @Column({ type: 'jsonb', default: {} })
  metadata: {
    totalRequests?: number;
    successfulRequests?: number;
    failedRequests?: number;
    lastUsedAt?: Date;
    averageResponseTime?: number;
    errorCount?: number;
    lastError?: string;
    lastErrorAt?: Date;
    rateLimitHits?: number;
    lastRateLimitAt?: Date;
    suspiciousActivity?: number;
    lastSuspiciousAt?: Date;
    dailyUsage?: Record<string, number>;
    monthlyUsage?: Record<string, number>;
    userAgents?: string[];
    ipAddresses?: string[];
    tags?: string[];
    customFields?: Record<string, any>;
  };

  @ApiProperty({ description: 'API key expiration date' })
  @Column({ name: 'expiresAt', type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @ApiProperty({ description: 'Last time the key was used' })
  @Column({ name: 'lastUsedAt', type: 'timestamp', nullable: true })
  lastUsedAt?: Date;

  @ApiProperty({ description: 'Last IP address that used this key' })
  @Column({ name: 'lastUsedIp', nullable: true })
  lastUsedIp?: string;

  @ApiProperty({ description: 'Last user agent that used this key' })
  @Column({ name: 'lastUserAgent', type: 'text', nullable: true })
  lastUserAgent?: string;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'organizationId' })
  organization?: Organization;

  @OneToMany(() => ApiKeyUsage, usage => usage.apiKey)
  usageRecords: ApiKeyUsage[];

  get isActive(): boolean {
    return this.status === ApiKeyStatus.ACTIVE && !this.isExpired;
  }

  get isExpired(): boolean {
    return this.expiresAt ? new Date() > this.expiresAt : false;
  }

  hasScope(scope: ApiScope): boolean {
    return this.scopes.includes(ApiScope.ALL) || this.scopes.includes(scope);
  }

  get hasReadOnlyAccess(): boolean {
    return this.scopes.includes(ApiScope.READ_ONLY);
  }

  get dailyUsage(): number {
    const today = new Date().toISOString().split('T')[0];
    return this.metadata.dailyUsage?.[today] || 0;
  }

  get monthlyUsage(): number {
    const thisMonth = new Date().toISOString().substring(0, 7);
    return this.metadata.monthlyUsage?.[thisMonth] || 0;
  }

  get remainingDailyLimit(): number {
    if (!this.config.dailyLimit) return Infinity;
    return Math.max(0, this.config.dailyLimit - this.dailyUsage);
  }

  get remainingMonthlyLimit(): number {
    if (!this.config.monthlyLimit) return Infinity;
    return Math.max(0, this.config.monthlyLimit - this.monthlyUsage);
  }

  get successRate(): number {
    const total = this.metadata.totalRequests || 0;
    const successful = this.metadata.successfulRequests || 0;
    return total > 0 ? (successful / total) * 100 : 0;
  }

  recordUsage(
    success: boolean,
    responseTime?: number,
    ipAddress?: string,
    userAgent?: string,
    error?: string,
  ): void {
    this.metadata.totalRequests = (this.metadata.totalRequests || 0) + 1;
    this.lastUsedAt = new Date();

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

    if (ipAddress) {
      this.lastUsedIp = ipAddress;
      if (!this.metadata.ipAddresses) this.metadata.ipAddresses = [];
      if (!this.metadata.ipAddresses.includes(ipAddress)) {
        this.metadata.ipAddresses.push(ipAddress);
      }
    }

    if (userAgent) {
      this.lastUserAgent = userAgent;
      if (!this.metadata.userAgents) this.metadata.userAgents = [];
      if (!this.metadata.userAgents.includes(userAgent)) {
        this.metadata.userAgents.push(userAgent);
      }
    }

    const today = new Date().toISOString().split('T')[0];
    if (!this.metadata.dailyUsage) this.metadata.dailyUsage = {};
    this.metadata.dailyUsage[today] = (this.metadata.dailyUsage[today] || 0) + 1;

    const thisMonth = new Date().toISOString().substring(0, 7);
    if (!this.metadata.monthlyUsage) this.metadata.monthlyUsage = {};
    this.metadata.monthlyUsage[thisMonth] = (this.metadata.monthlyUsage[thisMonth] || 0) + 1;
  }

  recordRateLimit(): void {
    this.metadata.rateLimitHits = (this.metadata.rateLimitHits || 0) + 1;
    this.metadata.lastRateLimitAt = new Date();
  }

  recordSuspiciousActivity(reason: string): void {
    this.metadata.suspiciousActivity = (this.metadata.suspiciousActivity || 0) + 1;
    this.metadata.lastSuspiciousAt = new Date();

    if (!this.metadata.customFields) this.metadata.customFields = {};
    if (!this.metadata.customFields.suspiciousReasons) {
      this.metadata.customFields.suspiciousReasons = [];
    }
    this.metadata.customFields.suspiciousReasons.push({
      reason,
      timestamp: new Date(),
    });
  }

  canMakeRequest(): { allowed: boolean; reason?: string } {
    if (!this.isActive) {
      return { allowed: false, reason: 'API key is not active' };
    }

    if (this.isExpired) {
      return { allowed: false, reason: 'API key has expired' };
    }

    if (this.config.dailyLimit && this.dailyUsage >= this.config.dailyLimit) {
      return { allowed: false, reason: 'Daily limit exceeded' };
    }

    if (this.config.monthlyLimit && this.monthlyUsage >= this.config.monthlyLimit) {
      return { allowed: false, reason: 'Monthly limit exceeded' };
    }

    if (this.config.totalLimit && (this.metadata.totalRequests || 0) >= this.config.totalLimit) {
      return { allowed: false, reason: 'Total usage limit exceeded' };
    }

    return { allowed: true };
  }

  isIpAllowed(ipAddress: string): boolean {
    if (!this.config.allowedIps && !this.config.blockedIps) {
      return true;
    }

    if (this.config.blockedIps?.includes(ipAddress)) {
      return false;
    }

    if (this.config.allowedIps && this.config.allowedIps.length > 0) {
      return this.config.allowedIps.includes(ipAddress);
    }

    return true;
  }

  isReferrerAllowed(referrer: string): boolean {
    if (!this.config.allowedReferrers || this.config.allowedReferrers.length === 0) {
      return true;
    }

    return this.config.allowedReferrers.some(allowed => {
      if (allowed.includes('*')) {
        const pattern = allowed.replace(/\*/g, '.*');
        return new RegExp(pattern).test(referrer);
      }
      return referrer === allowed;
    });
  }

  isTimeAllowed(): boolean {
    if (!this.config.allowedHours) {
      return true;
    }

    const now = new Date();
    const currentHour = now.getHours();
    const [startHour, endHour] = this.config.allowedHours;

    if (startHour <= endHour) {
      return currentHour >= startHour && currentHour <= endHour;
    } else {
      return currentHour >= startHour || currentHour <= endHour;
    }
  }

  suspend(reason?: string): void {
    this.status = ApiKeyStatus.SUSPENDED;

    if (reason) {
      if (!this.metadata.customFields) this.metadata.customFields = {};
      this.metadata.customFields.suspensionReason = reason;
      this.metadata.customFields.suspendedAt = new Date();
    }
  }

  revoke(reason?: string): void {
    this.status = ApiKeyStatus.REVOKED;

    if (reason) {
      if (!this.metadata.customFields) this.metadata.customFields = {};
      this.metadata.customFields.revocationReason = reason;
      this.metadata.customFields.revokedAt = new Date();
    }
  }

  activate(): void {
    this.status = ApiKeyStatus.ACTIVE;
  }

  setExpiration(days: number): void {
    this.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  addScope(scope: ApiScope): void {
    if (!this.scopes.includes(scope)) {
      this.scopes.push(scope);
    }
  }

  removeScope(scope: ApiScope): void {
    this.scopes = this.scopes.filter(s => s !== scope);
  }

  static generateKey(): { key: string; hash: string; prefix: string } {
    const crypto = require('crypto');
    const key = 'vk_' + crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    const prefix = key.substring(0, 12) + '...';
    return { key, hash, prefix };
  }

  static hashKey(key: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  static createApiKey(
    name: string,
    scopes: ApiScope[],
    createdBy: string,
    organizationId?: string,
    type: ApiKeyType = ApiKeyType.SECRET,
  ): { apiKey: Partial<ApiKey>; plainKey: string } {
    const { key, hash, prefix } = this.generateKey();

    const apiKey: Partial<ApiKey> = {
      name,
      keyHash: hash,
      keyPrefix: prefix,
      type,
      status: ApiKeyStatus.ACTIVE,
      scopes,
      createdBy,
      organizationId,
      config: {
        rateLimit: { requests: 1000, window: 3600 },
        dailyLimit: 10000,
        monthlyLimit: 300000,
      },
      metadata: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
      },
    };

    return { apiKey, plainKey: key };
  }

  static createPartnerKey(
    name: string,
    scopes: ApiScope[],
    createdBy: string,
    organizationId: string,
  ): { apiKey: Partial<ApiKey>; plainKey: string } {
    const result = this.createApiKey(name, scopes, createdBy, organizationId, ApiKeyType.PARTNER);
    result.apiKey.config = {
      ...result.apiKey.config,
      rateLimit: { requests: 5000, window: 3600 },
      dailyLimit: 50000,
      monthlyLimit: 1500000,
    };
    return result;
  }

  static createWebhookKey(
    name: string,
    webhookUrl: string,
    createdBy: string,
    organizationId?: string,
  ): { apiKey: Partial<ApiKey>; plainKey: string } {
    const result = this.createApiKey(
      name,
      [ApiScope.WEBHOOK_READ, ApiScope.WEBHOOK_WRITE],
      createdBy,
      organizationId,
      ApiKeyType.WEBHOOK,
    );

    result.apiKey.config = {
      ...result.apiKey.config,
      webhookUrl,
      webhookSecret: require('crypto').randomBytes(32).toString('hex'),
    };

    return result;
  }
}
