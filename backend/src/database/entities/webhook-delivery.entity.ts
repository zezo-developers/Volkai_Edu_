import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { WebhookEndpoint, WebhookEvent } from './webhook-endpoint.entity';

export enum DeliveryStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  RETRYING = 'retrying',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export enum DeliveryPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Entity('webhook_deliveries')
@Index(['endpointId', 'status'])
@Index(['status', 'scheduledAt'])
@Index(['eventType', 'createdAt'])
@Index(['organizationId', 'createdAt'])
@Index(['priority', 'scheduledAt'])
export class WebhookDelivery {
  @ApiProperty({ description: 'Delivery ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Webhook endpoint ID' })
  @Column({ name: 'endpoint_id' })
  endpointId: string;

  @ApiProperty({ enum: WebhookEvent, description: 'Event type that triggered this delivery' })
  @Column({
    type: 'enum',
    enum: WebhookEvent,
    enumName: 'webhook_event', // Name of Postgres enum
  })
  eventType: WebhookEvent;

  @ApiProperty({ enum: DeliveryStatus, description: 'Delivery status' })
  @Column({
    type: 'enum',
    enum: DeliveryStatus,
    default: DeliveryStatus.PENDING,
  })
  status: DeliveryStatus;

  @ApiProperty({ enum: DeliveryPriority, description: 'Delivery priority' })
  @Column({
    type: 'enum',
    enum: DeliveryPriority,
    default: DeliveryPriority.NORMAL,
  })
  priority: DeliveryPriority;

  @ApiProperty({ description: 'Organization ID (nullable for system events)' })
  @Column({ name: 'organization_id', nullable: true })
  organizationId?: string;

  @ApiProperty({ description: 'Event payload data' })
  @Column({ type: 'jsonb' })
  payload: {
    // Event metadata
    event: string;
    eventId: string;
    timestamp: Date;
    version: string;
    
    // Event data
    data: any;
    
    // Context information
    context?: {
      userId?: string;
      organizationId?: string;
      sessionId?: string;
      userAgent?: string;
      ipAddress?: string;
      source?: string;
    };
    
    // Previous state (for update events)
    previousData?: any;
    
    // Custom fields
    [key: string]: any;
  };

  @ApiProperty({ description: 'HTTP request details' })
  @Column({ type: 'jsonb', default: {} })
  request: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signature?: string;
    timeout?: number;
    userAgent?: string;
  };

  @ApiProperty({ description: 'HTTP response details' })
  @Column({ type: 'jsonb', nullable: true })
  response?: {
    statusCode?: number;
    statusText?: string;
    headers?: Record<string, string>;
    body?: string;
    responseTime?: number;
    contentType?: string;
    contentLength?: number;
  };

  @ApiProperty({ description: 'Delivery attempt information' })
  @Column({ type: 'jsonb', default: {} })
  attempts: {
    count: number;
    maxAttempts: number;
    nextAttemptAt?: Date;
    lastAttemptAt?: Date;
    
    // Attempt history
    history: Array<{
      attemptNumber: number;
      timestamp: Date;
      statusCode?: number;
      responseTime?: number;
      error?: string;
      success: boolean;
    }>;
    
    // Retry configuration
    retryDelay: number;
    exponentialBackoff: boolean;
    backoffMultiplier: number;
  };

  @ApiProperty({ description: 'Error information if delivery failed' })
  @Column({ type: 'jsonb', nullable: true })
  error?: {
    code?: string;
    message?: string;
    type?: 'network' | 'timeout' | 'http' | 'validation' | 'authentication' | 'rate_limit' | 'server_error';
    details?: any;
    stack?: string;
    retryable?: boolean;
    
    // Network error details
    networkError?: {
      code?: string;
      errno?: number;
      syscall?: string;
      hostname?: string;
      port?: number;
    };
    
    // HTTP error details
    httpError?: {
      statusCode?: number;
      statusText?: string;
      responseBody?: string;
    };
  };

  @ApiProperty({ description: 'Delivery metadata and tracking' })
  @Column({ type: 'jsonb', default: {} })
  metadata: {
    // Tracking
    traceId?: string;
    correlationId?: string;
    
    // Performance
    queueTime?: number; // Time spent in queue
    processingTime?: number; // Time spent processing
    totalTime?: number; // Total time from creation to completion
    
    // Source information
    triggeredBy?: string; // User or system that triggered the event
    sourceEvent?: string; // Original event that caused this delivery
    
    // Delivery context
    deliveryAttempt?: number;
    isRetry?: boolean;
    originalDeliveryId?: string; // For retry deliveries
    
    // Rate limiting
    rateLimitRemaining?: number;
    rateLimitReset?: Date;
    
    // Custom metadata
    tags?: string[];
    customFields?: Record<string, any>;
  };

  @ApiProperty({ description: 'When delivery is scheduled to be sent' })
  @Column({ name: 'scheduled_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  scheduledAt: Date;

  @ApiProperty({ description: 'When delivery was actually sent' })
  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt?: Date;

  @ApiProperty({ description: 'When delivery was completed (success or final failure)' })
  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt?: Date;

  @ApiProperty({ description: 'When delivery expires and should not be retried' })
  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => WebhookEndpoint, endpoint => endpoint.deliveries)
  @JoinColumn({ name: 'endpoint_id' })
  endpoint: WebhookEndpoint;

  // Virtual properties
  get isCompleted(): boolean {
    return [
      DeliveryStatus.SUCCESS,
      DeliveryStatus.FAILED,
      DeliveryStatus.CANCELLED,
      DeliveryStatus.EXPIRED,
    ].includes(this.status);
  }

  get isRetryable(): boolean {
    return (
      this.status === DeliveryStatus.FAILED &&
      this.attempts.count < this.attempts.maxAttempts &&
      (!this.expiresAt || new Date() < this.expiresAt) &&
      this.error?.retryable !== false
    );
  }

  get nextRetryAt(): Date | null {
    if (!this.isRetryable) return null;
    return this.attempts.nextAttemptAt || null;
  }

  get totalResponseTime(): number {
    return this.response?.responseTime || 0;
  }

  get isExpired(): boolean {
    return this.expiresAt ? new Date() > this.expiresAt : false;
  }

  get shouldRetry(): boolean {
    return this.isRetryable && !this.isExpired;
  }

  // Methods
  markAsProcessing(): void {
    this.status = DeliveryStatus.PROCESSING;
    this.sentAt = new Date();
  }

  markAsSuccess(response: any, responseTime: number): void {
    this.status = DeliveryStatus.SUCCESS;
    this.completedAt = new Date();
    this.response = {
      ...response,
      responseTime,
    };

    // Record successful attempt
    this.recordAttempt(true, response.statusCode, responseTime);
  }

  markAsFailed(error: any, response?: any): void {
    this.status = DeliveryStatus.FAILED;
    this.error = this.parseError(error);
    
    if (response) {
      this.response = response;
    }

    // Record failed attempt
    this.recordAttempt(false, response?.statusCode, response?.responseTime, error.message);

    // Schedule retry if applicable
    if (this.shouldRetry) {
      this.scheduleRetry();
    } else {
      this.completedAt = new Date();
    }
  }

  markAsCancelled(reason?: string): void {
    this.status = DeliveryStatus.CANCELLED;
    this.completedAt = new Date();
    
    if (reason) {
      this.metadata.customFields = {
        ...this.metadata.customFields,
        cancellationReason: reason,
      };
    }
  }

  markAsExpired(): void {
    this.status = DeliveryStatus.EXPIRED;
    this.completedAt = new Date();
  }

  scheduleRetry(): void {
    if (!this.shouldRetry) return;

    this.status = DeliveryStatus.RETRYING;
    
    const delay = this.calculateRetryDelay();
    this.attempts.nextAttemptAt = new Date(Date.now() + delay);
    
    this.metadata.isRetry = true;
    this.metadata.deliveryAttempt = this.attempts.count + 1;
  }

  private calculateRetryDelay(): number {
    const baseDelay = this.attempts.retryDelay;
    const attemptNumber = this.attempts.count;
    
    if (this.attempts.exponentialBackoff) {
      return baseDelay * Math.pow(this.attempts.backoffMultiplier || 2, attemptNumber);
    }
    
    return baseDelay;
  }

  private recordAttempt(
    success: boolean,
    statusCode?: number,
    responseTime?: number,
    error?: string
  ): void {
    this.attempts.count += 1;
    this.attempts.lastAttemptAt = new Date();

    this.attempts.history.push({
      attemptNumber: this.attempts.count,
      timestamp: new Date(),
      statusCode,
      responseTime,
      error,
      success,
    });
  }

  private parseError(error: any): any {
    const errorInfo: any = {
      message: error.message || 'Unknown error',
      type: 'network',
      retryable: true,
    };

    // Network errors
    if (error.code) {
      errorInfo.networkError = {
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
        hostname: error.hostname,
        port: error.port,
      };
      
      // Determine if retryable based on error code
      const nonRetryableCodes = ['ENOTFOUND', 'ECONNREFUSED'];
      errorInfo.retryable = !nonRetryableCodes.includes(error.code);
    }

    // HTTP errors
    if (error.response) {
      errorInfo.type = 'http';
      errorInfo.httpError = {
        statusCode: error.response.status,
        statusText: error.response.statusText,
        responseBody: error.response.data,
      };
      
      // HTTP status codes that shouldn't be retried
      const nonRetryableStatuses = [400, 401, 403, 404, 405, 410, 422];
      errorInfo.retryable = !nonRetryableStatuses.includes(error.response.status);
    }

    // Timeout errors
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      errorInfo.type = 'timeout';
      errorInfo.retryable = true;
    }

    return errorInfo;
  }

  setExpiration(hours: number = 24): void {
    this.expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  addMetadata(key: string, value: any): void {
    if (!this.metadata.customFields) {
      this.metadata.customFields = {};
    }
    this.metadata.customFields[key] = value;
  }

  setTraceId(traceId: string): void {
    this.metadata.traceId = traceId;
  }

  setCorrelationId(correlationId: string): void {
    this.metadata.correlationId = correlationId;
  }

  // Static factory methods
  static createDelivery(
    endpointId: string,
    eventType: WebhookEvent,
    payload: any,
    priority: DeliveryPriority = DeliveryPriority.NORMAL,
    organizationId?: string
  ): Partial<WebhookDelivery> {
    return {
      endpointId,
      eventType,
      payload: {
        event: eventType,
        eventId: require('crypto').randomUUID(),
        timestamp: new Date(),
        version: '1.0',
        data: payload,
      },
      priority,
      organizationId,
      status: DeliveryStatus.PENDING,
      attempts: {
        count: 0,
        maxAttempts: 3,
        history: [],
        retryDelay: 1000,
        exponentialBackoff: true,
        backoffMultiplier: 2,
      },
      request: {},
      metadata: {},
      scheduledAt: new Date(),
    };
  }

  static createHighPriorityDelivery(
    endpointId: string,
    eventType: WebhookEvent,
    payload: any,
    organizationId?: string
  ): Partial<WebhookDelivery> {
    return this.createDelivery(endpointId, eventType, payload, DeliveryPriority.HIGH, organizationId);
  }

  static createCriticalDelivery(
    endpointId: string,
    eventType: WebhookEvent,
    payload: any,
    organizationId?: string
  ): Partial<WebhookDelivery> {
    const delivery = this.createDelivery(endpointId, eventType, payload, DeliveryPriority.CRITICAL, organizationId);
    
    // Critical deliveries have more aggressive retry settings
    if (delivery.attempts) {
      delivery.attempts.maxAttempts = 5;
      delivery.attempts.retryDelay = 500;
    }
    
    return delivery;
  }

  static createScheduledDelivery(
    endpointId: string,
    eventType: WebhookEvent,
    payload: any,
    scheduledAt: Date,
    priority: DeliveryPriority = DeliveryPriority.NORMAL,
    organizationId?: string
  ): Partial<WebhookDelivery> {
    const delivery = this.createDelivery(endpointId, eventType, payload, priority, organizationId);
    delivery.scheduledAt = scheduledAt;
    return delivery;
  }

  static createRetryDelivery(
    originalDelivery: WebhookDelivery,
    scheduledAt: Date
  ): Partial<WebhookDelivery> {
    return {
      endpointId: originalDelivery.endpointId,
      eventType: originalDelivery.eventType,
      payload: originalDelivery.payload,
      priority: originalDelivery.priority,
      organizationId: originalDelivery.organizationId,
      status: DeliveryStatus.PENDING,
      attempts: {
        ...originalDelivery.attempts,
        count: 0, // Reset for new delivery
        history: [],
      },
      request: {},
      metadata: {
        ...originalDelivery.metadata,
        isRetry: true,
        originalDeliveryId: originalDelivery.id,
      },
      scheduledAt,
    };
  }
}
