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
import { User } from './user.entity';
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
  // User scopes
  USER_READ = 'user:read',
  USER_WRITE = 'user:write',
  USER_DELETE = 'user:delete',
  
  // Organization scopes
  ORG_READ = 'org:read',
  ORG_WRITE = 'org:write',
  ORG_ADMIN = 'org:admin',
  
  // Course scopes
  COURSE_READ = 'course:read',
  COURSE_WRITE = 'course:write',
  COURSE_PUBLISH = 'course:publish',
  
  // Assessment scopes
  ASSESSMENT_READ = 'assessment:read',
  ASSESSMENT_WRITE = 'assessment:write',
  ASSESSMENT_GRADE = 'assessment:grade',
  
  // Interview scopes
  INTERVIEW_READ = 'interview:read',
  INTERVIEW_WRITE = 'interview:write',
  INTERVIEW_SCHEDULE = 'interview:schedule',
  
  // Job scopes
  JOB_READ = 'job:read',
  JOB_WRITE = 'job:write',
  JOB_APPLY = 'job:apply',
  
  // Billing scopes
  BILLING_READ = 'billing:read',
  BILLING_WRITE = 'billing:write',
  
  // Analytics scopes
  ANALYTICS_READ = 'analytics:read',
  ANALYTICS_WRITE = 'analytics:write',
  
  // Webhook scopes
  WEBHOOK_READ = 'webhook:read',
  WEBHOOK_WRITE = 'webhook:write',
  WEBHOOK_MANAGE = 'webhook:manage',
  
  // Admin scopes
  ADMIN_READ = 'admin:read',
  ADMIN_WRITE = 'admin:write',
  ADMIN_SYSTEM = 'admin:system',
  
  // Special scopes
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
  @Column({ name: 'key_hash', unique: true })
  keyHash: string;

  @ApiProperty({ description: 'API key prefix (visible part)' })
  @Column({ name: 'key_prefix', length: 20 })
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
  @Column({ name: 'organization_id', nullable: true })
  organizationId?: string;

  @ApiProperty({ description: 'User who created the API key' })
  @Column({ name: 'created_by' })
  createdBy: string;

  @ApiProperty({ description: 'API key scopes and permissions', type: [String] })
  @Column({ type: 'jsonb', default: [] })
  scopes: ApiScope[];

  @ApiProperty({ description: 'API key configuration and limits' })
  @Column({ type: 'jsonb', default: {} })
  config: {
    // Rate limiting
    rateLimit?: {
      requests: number;
      window: number; // seconds
      burst?: number; // burst capacity
    };
    
    // IP restrictions
    allowedIps?: string[];
    blockedIps?: string[];
    
    // Referrer restrictions
    allowedReferrers?: string[];
    
    // Time restrictions
    allowedHours?: [number, number]; // [start, end] in 24h format
    timezone?: string;
    
    // Usage limits
    dailyLimit?: number;
    monthlyLimit?: number;
    totalLimit?: number;
    
    // Feature flags
    features?: Record<string, boolean>;
    
    // Webhook settings (for webhook keys)
    webhookUrl?: string;
    webhookSecret?: string;
    
    // Integration settings
    integrationId?: string;
    integrationVersion?: string;
    
    // Custom settings
    customSettings?: Record<string, any>;
  };

  @ApiProperty({ description: 'API key metadata and statistics' })
  @Column({ type: 'jsonb', default: {} })
  metadata: {
    // Usage statistics
    totalRequests?: number;
    successfulRequests?: number;
    failedRequests?: number;
    lastUsedAt?: Date;
    
    // Performance metrics
    averageResponseTime?: number;
    
    // Error tracking
    errorCount?: number;
    lastError?: string;
    lastErrorAt?: Date;
    
    // Rate limiting stats
    rateLimitHits?: number;
    lastRateLimitAt?: Date;
    
    // Security events
    suspiciousActivity?: number;
    lastSuspiciousAt?: Date;
    
    // Usage patterns
    dailyUsage?: Record<string, number>; // date -> request count
    monthlyUsage?: Record<string, number>; // month -> request count
    
    // Client information
    userAgents?: string[];
    ipAddresses?: string[];
    
    // Custom metadata
    tags?: string[];
    customFields?: Record<string, any>;
  };

  @ApiProperty({ description: 'API key expiration date' })
  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @ApiProperty({ description: 'Last time the key was used' })
  @Column({ name: 'last_used_at', type: 'timestamp', nullable: true })
  lastUsedAt?: Date;

  @ApiProperty({ description: 'Last IP address that used this key' })
  @Column({ name: 'last_used_ip', nullable: true })
  lastUsedIp?: string;

  @ApiProperty({ description: 'Last user agent that used this key' })
  @Column({ name: 'last_user_agent', type: 'text', nullable: true })
  lastUserAgent?: string;

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

  @OneToMany(() => ApiKeyUsage, usage => usage.apiKey)
  usageRecords: ApiKeyUsage[];

  // Virtual properties
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
    const thisMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
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

  // Methods
  recordUsage(
    success: boolean,
    responseTime?: number,
    ipAddress?: string,
    userAgent?: string,
    error?: string
  ): void {
    // Update basic stats
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

    // Update response time
    if (responseTime) {
      const avgResponseTime = this.metadata.averageResponseTime || 0;
      const totalRequests = this.metadata.totalRequests;
      this.metadata.averageResponseTime = 
        (avgResponseTime * (totalRequests - 1) + responseTime) / totalRequests;
    }

    // Update client info
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

    // Update daily usage
    const today = new Date().toISOString().split('T')[0];
    if (!this.metadata.dailyUsage) this.metadata.dailyUsage = {};
    this.metadata.dailyUsage[today] = (this.metadata.dailyUsage[today] || 0) + 1;

    // Update monthly usage
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
    // Check if key is active
    if (!this.isActive) {
      return { allowed: false, reason: 'API key is not active' };
    }

    // Check expiration
    if (this.isExpired) {
      return { allowed: false, reason: 'API key has expired' };
    }

    // Check daily limit
    if (this.config.dailyLimit && this.dailyUsage >= this.config.dailyLimit) {
      return { allowed: false, reason: 'Daily limit exceeded' };
    }

    // Check monthly limit
    if (this.config.monthlyLimit && this.monthlyUsage >= this.config.monthlyLimit) {
      return { allowed: false, reason: 'Monthly limit exceeded' };
    }

    // Check total limit
    if (this.config.totalLimit && (this.metadata.totalRequests || 0) >= this.config.totalLimit) {
      return { allowed: false, reason: 'Total usage limit exceeded' };
    }

    return { allowed: true };
  }

  isIpAllowed(ipAddress: string): boolean {
    // If no IP restrictions, allow all
    if (!this.config.allowedIps && !this.config.blockedIps) {
      return true;
    }

    // Check blocked IPs first
    if (this.config.blockedIps?.includes(ipAddress)) {
      return false;
    }

    // If allowed IPs are specified, check if IP is in the list
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
      // Support wildcard matching
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
      // Handles cases like 22:00 to 06:00 (overnight)
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

  // Static methods
  static generateKey(): { key: string; hash: string; prefix: string } {
    const crypto = require('crypto');
    
    // Generate a random key
    const key = 'vk_' + crypto.randomBytes(32).toString('hex');
    
    // Create hash for storage
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    
    // Create prefix for display
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
    type: ApiKeyType = ApiKeyType.SECRET
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
        rateLimit: {
          requests: 1000,
          window: 3600, // 1 hour
        },
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
    organizationId: string
  ): { apiKey: Partial<ApiKey>; plainKey: string } {
    const result = this.createApiKey(name, scopes, createdBy, organizationId, ApiKeyType.PARTNER);
    
    // Partner keys have higher limits
    result.apiKey.config = {
      ...result.apiKey.config,
      rateLimit: {
        requests: 5000,
        window: 3600,
      },
      dailyLimit: 50000,
      monthlyLimit: 1500000,
    };

    return result;
  }

  static createWebhookKey(
    name: string,
    webhookUrl: string,
    createdBy: string,
    organizationId?: string
  ): { apiKey: Partial<ApiKey>; plainKey: string } {
    const result = this.createApiKey(
      name,
      [ApiScope.WEBHOOK_READ, ApiScope.WEBHOOK_WRITE],
      createdBy,
      organizationId,
      ApiKeyType.WEBHOOK
    );

    result.apiKey.config = {
      ...result.apiKey.config,
      webhookUrl,
      webhookSecret: require('crypto').randomBytes(32).toString('hex'),
    };

    return result;
  }
}
