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
  @Column({ name: 'endpointId' })
  endpointId: string;

  @ApiProperty({ enum: WebhookEvent, description: 'Event type that triggered this delivery' })
  @Column({
    type: 'enum',
    enum: WebhookEvent,
    enumName: 'webhook_event',
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
  @Column({ name: 'organizationId', nullable: true })
  organizationId?: string;

  @ApiProperty({ description: 'Event payload data' })
  @Column({ type: 'jsonb' })
  payload: {
    event: string;
    eventId: string;
    timestamp: Date;
    version: string;
    data: any;
    context?: {
      userId?: string;
      organizationId?: string;
      sessionId?: string;
      userAgent?: string;
      ipAddress?: string;
      source?: string;
    };
    previousData?: any;
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
    history: Array<{
      attemptNumber: number;
      timestamp: Date;
      statusCode?: number;
      responseTime?: number;
      error?: string;
      success: boolean;
    }>;
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
    networkError?: {
      code?: string;
      errno?: number;
      syscall?: string;
      hostname?: string;
      port?: number;
    };
    httpError?: {
      statusCode?: number;
      statusText?: string;
      responseBody?: string;
    };
  };

  @ApiProperty({ description: 'Delivery metadata and tracking' })
  @Column({ type: 'jsonb', default: {} })
  metadata: {
    traceId?: string;
    correlationId?: string;
    queueTime?: number;
    processingTime?: number;
    totalTime?: number;
    triggeredBy?: string;
    sourceEvent?: string;
    deliveryAttempt?: number;
    isRetry?: boolean;
    originalDeliveryId?: string;
    rateLimitRemaining?: number;
    rateLimitReset?: Date;
    tags?: string[];
    customFields?: Record<string, any>;
  };

  @ApiProperty({ description: 'When delivery is scheduled to be sent' })
  @Column({ name: 'scheduledAt', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  scheduledAt: Date;

  @ApiProperty({ description: 'When delivery was actually sent' })
  @Column({ name: 'sentAt', type: 'timestamp', nullable: true })
  sentAt?: Date;

  @ApiProperty({ description: 'When delivery was completed (success or final failure)' })
  @Column({ name: 'completedAt', type: 'timestamp', nullable: true })
  completedAt?: Date;

  @ApiProperty({ description: 'When delivery expires and should not be retried' })
  @Column({ name: 'expiresAt', type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  @ManyToOne(() => WebhookEndpoint, endpoint => endpoint.deliveries)
  @JoinColumn({ name: 'endpointId' })
  endpoint: WebhookEndpoint;

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

  markAsProcessing(): void {
    this.status = DeliveryStatus.PROCESSING;
    this.sentAt = new Date();
  }

  markAsSuccess(response: any, responseTime: number): void {
    this.status = DeliveryStatus.SUCCESS;
    this.completedAt = new Date();
    this.response = { ...response, responseTime };
    this.recordAttempt(true, response.statusCode, responseTime);
  }

  markAsFailed(error: any, response?: any): void {
    this.status = DeliveryStatus.FAILED;
    this.error = this.parseError(error);
    if (response) this.response = response;
    this.recordAttempt(false, response?.statusCode, response?.responseTime, error.message);
    if (this.shouldRetry) this.scheduleRetry();
    else this.completedAt = new Date();
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
    error?: string,
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
    if (error.code) {
      errorInfo.networkError = {
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
        hostname: error.hostname,
        port: error.port,
      };
      const nonRetryableCodes = ['ENOTFOUND', 'ECONNREFUSED'];
      errorInfo.retryable = !nonRetryableCodes.includes(error.code);
    }
    if (error.response) {
      errorInfo.type = 'http';
      errorInfo.httpError = {
        statusCode: error.response.status,
        statusText: error.response.statusText,
        responseBody: error.response.data,
      };
      const nonRetryableStatuses = [400, 401, 403, 404, 405, 410, 422];
      errorInfo.retryable = !nonRetryableStatuses.includes(error.response.status);
    }
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      errorInfo.type = 'timeout';
      errorInfo.retryable = true;
    }
    return errorInfo;
  }

  setExpiration(hours = 24): void {
    this.expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  addMetadata(key: string, value: any): void {
    if (!this.metadata.customFields) this.metadata.customFields = {};
    this.metadata.customFields[key] = value;
  }

  setTraceId(traceId: string): void {
    this.metadata.traceId = traceId;
  }

  setCorrelationId(correlationId: string): void {
    this.metadata.correlationId = correlationId;
  }

  static createDelivery(
    endpointId: string,
    eventType: WebhookEvent,
    payload: any,
    priority: DeliveryPriority = DeliveryPriority.NORMAL,
    organizationId?: string,
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
    organizationId?: string,
  ): Partial<WebhookDelivery> {
    return this.createDelivery(endpointId, eventType, payload, DeliveryPriority.HIGH, organizationId);
  }

  static createCriticalDelivery(
    endpointId: string,
    eventType: WebhookEvent,
    payload: any,
    organizationId?: string,
  ): Partial<WebhookDelivery> {
    const delivery = this.createDelivery(endpointId, eventType, payload, DeliveryPriority.CRITICAL, organizationId);
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
    organizationId?: string,
  ): Partial<WebhookDelivery> {
    const delivery = this.createDelivery(endpointId, eventType, payload, priority, organizationId);
    delivery.scheduledAt = scheduledAt;
    return delivery;
  }

  static createRetryDelivery(
    originalDelivery: WebhookDelivery,
    scheduledAt: Date,
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
        count: 0,
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
