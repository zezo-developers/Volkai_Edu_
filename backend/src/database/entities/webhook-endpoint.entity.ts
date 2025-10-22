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
import { WebhookDelivery } from './webhook-delivery.entity';

export enum WebhookStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DISABLED = 'disabled',
  SUSPENDED = 'suspended',
}

export enum WebhookEvent {
  // User events
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  
  // Organization events
  ORGANIZATION_CREATED = 'organization.created',
  ORGANIZATION_UPDATED = 'organization.updated',
  ORGANIZATION_DELETED = 'organization.deleted',
  
  // Course events
  COURSE_CREATED = 'course.created',
  COURSE_UPDATED = 'course.updated',
  COURSE_PUBLISHED = 'course.published',
  COURSE_DELETED = 'course.deleted',
  
  // Enrollment events
  ENROLLMENT_CREATED = 'enrollment.created',
  ENROLLMENT_COMPLETED = 'enrollment.completed',
  ENROLLMENT_CANCELLED = 'enrollment.cancelled',
  
  // Assessment events
  ASSESSMENT_STARTED = 'assessment.started',
  ASSESSMENT_COMPLETED = 'assessment.completed',
  ASSESSMENT_GRADED = 'assessment.graded',
  
  // Interview events
  INTERVIEW_SCHEDULED = 'interview.scheduled',
  INTERVIEW_STARTED = 'interview.started',
  INTERVIEW_COMPLETED = 'interview.completed',
  INTERVIEW_CANCELLED = 'interview.cancelled',
  
  // Job events
  JOB_CREATED = 'job.created',
  JOB_UPDATED = 'job.updated',
  JOB_CLOSED = 'job.closed',
  APPLICATION_SUBMITTED = 'application.submitted',
  APPLICATION_REVIEWED = 'application.reviewed',
  APPLICATION_ACCEPTED = 'application.accepted',
  APPLICATION_REJECTED = 'application.rejected',
  
  // Billing events
  SUBSCRIPTION_CREATED = 'subscription.created',
  SUBSCRIPTION_UPDATED = 'subscription.updated',
  SUBSCRIPTION_CANCELLED = 'subscription.cancelled',
  PAYMENT_SUCCEEDED = 'payment.succeeded',
  PAYMENT_FAILED = 'payment.failed',
  INVOICE_CREATED = 'invoice.created',
  INVOICE_PAID = 'invoice.paid',
  
  // Certificate events
  CERTIFICATE_ISSUED = 'certificate.issued',
  CERTIFICATE_REVOKED = 'certificate.revoked',
  
  // System events
  SYSTEM_MAINTENANCE = 'system.maintenance',
  SYSTEM_ALERT = 'system.alert',
  
  // Custom events
  CUSTOM_EVENT = 'custom.event',
}

@Entity('webhook_endpoints')
@Index(['organizationId', 'status'])
@Index(['createdBy', 'status'])
@Index(['url'])
@Index(['status', 'isActive'])
export class WebhookEndpoint {
  @ApiProperty({ description: 'Webhook endpoint ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Webhook endpoint name' })
  @Column({ length: 200 })
  name: string;

  @ApiProperty({ description: 'Webhook endpoint description' })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ description: 'Webhook URL endpoint' })
  @Column({ length: 2048 })
  url: string;

  @ApiProperty({ enum: WebhookStatus, description: 'Webhook status' })
  @Column({
    type: 'enum',
    enum: WebhookStatus,
    default: WebhookStatus.ACTIVE,
  })
  status: WebhookStatus;

  @ApiProperty({ description: 'Whether webhook is currently active' })
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Organization ID (nullable for system webhooks)' })
  @Column({ name: 'organization_id', nullable: true })
  organizationId?: string;

  @ApiProperty({ description: 'User who created the webhook' })
  @Column({ name: 'created_by' })
  createdBy: string;

  @ApiProperty({ description: 'Events this webhook subscribes to', type: [String] })
  @Column({ type: 'jsonb', default: [] })
  events: WebhookEvent[];

  @ApiProperty({ description: 'Webhook configuration and settings' })
  @Column({ type: 'jsonb', default: {} })
  config: {
    // HTTP settings
    method?: 'POST' | 'PUT' | 'PATCH';
    headers?: Record<string, string>;
    timeout?: number; // milliseconds
    
    // Security settings
    secret?: string;
    signatureHeader?: string;
    signatureAlgorithm?: 'sha256' | 'sha1' | 'md5';
    
    // Retry settings
    maxRetries?: number;
    retryDelay?: number; // milliseconds
    exponentialBackoff?: boolean;
    
    // Filtering
    filters?: Array<{
      field: string;
      operator: 'equals' | 'not_equals' | 'contains' | 'starts_with' | 'ends_with';
      value: any;
    }>;
    
    // Transformation
    template?: string; // Handlebars template for payload transformation
    includeMetadata?: boolean;
    
    // Rate limiting
    rateLimit?: {
      requests: number;
      window: number; // seconds
    };
    
    // Custom settings
    customHeaders?: Record<string, string>;
    customPayload?: Record<string, any>;
  };

  @ApiProperty({ description: 'Webhook metadata and statistics' })
  @Column({ type: 'jsonb', default: {} })
  metadata: {
    // Statistics
    totalDeliveries?: number;
    successfulDeliveries?: number;
    failedDeliveries?: number;
    lastDeliveryAt?: Date;
    lastSuccessAt?: Date;
    lastFailureAt?: Date;
    
    // Performance metrics
    averageResponseTime?: number;
    successRate?: number;
    
    // Error tracking
    consecutiveFailures?: number;
    lastError?: string;
    errorCount?: number;
    
    // Health status
    healthScore?: number; // 0-100
    isHealthy?: boolean;
    
    // Usage tracking
    dailyDeliveries?: number;
    monthlyDeliveries?: number;
    
    // Version info
    version?: string;
    apiVersion?: string;
    
    // Custom metadata
    tags?: string[];
    customFields?: Record<string, any>;
  };

  @ApiProperty({ description: 'Webhook verification token' })
  @Column({ name: 'verification_token', nullable: true })
  verificationToken?: string;

  @ApiProperty({ description: 'Whether webhook is verified' })
  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @ApiProperty({ description: 'Last verification attempt' })
  @Column({ name: 'last_verified_at', type: 'timestamp', nullable: true })
  lastVerifiedAt?: Date;

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

  @OneToMany(() => WebhookDelivery, delivery => delivery.endpoint)
  deliveries: WebhookDelivery[];

  // Virtual properties
  get isHealthy(): boolean {
    return this.metadata.isHealthy !== false && this.status === WebhookStatus.ACTIVE;
  }

  get successRate(): number {
    const total = this.metadata.totalDeliveries || 0;
    const successful = this.metadata.successfulDeliveries || 0;
    return total > 0 ? (successful / total) * 100 : 0;
  }

  get consecutiveFailures(): number {
    return this.metadata.consecutiveFailures || 0;
  }

  get shouldRetry(): boolean {
    const maxRetries = this.config.maxRetries || 3;
    return this.consecutiveFailures < maxRetries && this.isActive;
  }

  get nextRetryDelay(): number {
    const baseDelay = this.config.retryDelay || 1000;
    const failures = this.consecutiveFailures;
    
    if (this.config.exponentialBackoff) {
      return baseDelay * Math.pow(2, failures);
    }
    
    return baseDelay;
  }

  // Methods
  recordDelivery(success: boolean, responseTime?: number, error?: string): void {
    this.metadata.totalDeliveries = (this.metadata.totalDeliveries || 0) + 1;
    this.metadata.lastDeliveryAt = new Date();

    if (success) {
      this.metadata.successfulDeliveries = (this.metadata.successfulDeliveries || 0) + 1;
      this.metadata.lastSuccessAt = new Date();
      this.metadata.consecutiveFailures = 0;
      
      if (responseTime) {
        const avgResponseTime = this.metadata.averageResponseTime || 0;
        const totalDeliveries = this.metadata.totalDeliveries;
        this.metadata.averageResponseTime = 
          (avgResponseTime * (totalDeliveries - 1) + responseTime) / totalDeliveries;
      }
    } else {
      this.metadata.failedDeliveries = (this.metadata.failedDeliveries || 0) + 1;
      this.metadata.lastFailureAt = new Date();
      this.metadata.consecutiveFailures = (this.metadata.consecutiveFailures || 0) + 1;
      this.metadata.lastError = error;
      this.metadata.errorCount = (this.metadata.errorCount || 0) + 1;
    }

    // Update success rate
    this.metadata.successRate = this.successRate;

    // Update health score
    this.updateHealthScore();

    // Auto-disable if too many consecutive failures
    if (this.consecutiveFailures >= (this.config.maxRetries || 3) * 2) {
      this.status = WebhookStatus.SUSPENDED;
      this.isActive = false;
    }
  }

  updateHealthScore(): void {
    let score = 100;

    // Reduce score based on failure rate
    const failureRate = 100 - this.successRate;
    score -= failureRate * 0.5;

    // Reduce score based on consecutive failures
    score -= this.consecutiveFailures * 10;

    // Reduce score based on response time
    const avgResponseTime = this.metadata.averageResponseTime || 0;
    if (avgResponseTime > 5000) score -= 20; // > 5 seconds
    else if (avgResponseTime > 2000) score -= 10; // > 2 seconds

    // Ensure score is between 0 and 100
    this.metadata.healthScore = Math.max(0, Math.min(100, score));
    this.metadata.isHealthy = this.metadata.healthScore >= 70;
  }

  subscribesToEvent(event: WebhookEvent): boolean {
    return this.events.includes(event) || this.events.includes(WebhookEvent.CUSTOM_EVENT);
  }

  matchesFilters(payload: any): boolean {
    if (!this.config.filters || this.config.filters.length === 0) {
      return true;
    }

    return this.config.filters.every(filter => {
      const fieldValue = this.getNestedValue(payload, filter.field);
      
      switch (filter.operator) {
        case 'equals':
          return fieldValue === filter.value;
        case 'not_equals':
          return fieldValue !== filter.value;
        case 'contains':
          return String(fieldValue).includes(String(filter.value));
        case 'starts_with':
          return String(fieldValue).startsWith(String(filter.value));
        case 'ends_with':
          return String(fieldValue).endsWith(String(filter.value));
        default:
          return true;
      }
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  generateSignature(payload: string): string {
    const crypto = require('crypto');
    const secret = this.config.secret || '';
    const algorithm = this.config.signatureAlgorithm || 'sha256';
    
    return crypto
      .createHmac(algorithm, secret)
      .update(payload)
      .digest('hex');
  }

  transformPayload(originalPayload: any): any {
    if (!this.config.template) {
      return originalPayload;
    }

    // This would use a templating engine like Handlebars
    // For now, return the original payload
    return originalPayload;
  }

  disable(reason?: string): void {
    this.status = WebhookStatus.DISABLED;
    this.isActive = false;
    
    if (reason) {
      this.metadata.customFields = {
        ...this.metadata.customFields,
        disabledReason: reason,
        disabledAt: new Date(),
      };
    }
  }

  enable(): void {
    this.status = WebhookStatus.ACTIVE;
    this.isActive = true;
    this.metadata.consecutiveFailures = 0;
  }

  verify(): void {
    this.isVerified = true;
    this.lastVerifiedAt = new Date();
  }

  // Static factory methods
  static createEndpoint(
    name: string,
    url: string,
    events: WebhookEvent[],
    createdBy: string,
    organizationId?: string
  ): Partial<WebhookEndpoint> {
    return {
      name,
      url,
      events,
      createdBy,
      organizationId,
      status: WebhookStatus.ACTIVE,
      isActive: true,
      isVerified: false,
      config: {
        method: 'POST',
        timeout: 30000,
        maxRetries: 3,
        retryDelay: 1000,
        exponentialBackoff: true,
        signatureAlgorithm: 'sha256',
        includeMetadata: true,
      },
      metadata: {
        totalDeliveries: 0,
        successfulDeliveries: 0,
        failedDeliveries: 0,
        consecutiveFailures: 0,
        healthScore: 100,
        isHealthy: true,
      },
    };
  }

  static createSystemWebhook(
    name: string,
    url: string,
    events: WebhookEvent[],
    createdBy: string
  ): Partial<WebhookEndpoint> {
    return this.createEndpoint(name, url, events, createdBy);
  }

  static createOrganizationWebhook(
    name: string,
    url: string,
    events: WebhookEvent[],
    createdBy: string,
    organizationId: string
  ): Partial<WebhookEndpoint> {
    return this.createEndpoint(name, url, events, createdBy, organizationId);
  }
}
