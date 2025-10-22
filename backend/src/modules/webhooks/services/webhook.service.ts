import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';
import * as crypto from 'crypto';
import { 
  WebhookEndpoint, 
  WebhookEvent, 
  WebhookStatus 
} from '../../../database/entities/webhook-endpoint.entity';
import { 
  WebhookDelivery, 
  DeliveryStatus, 
  DeliveryPriority 
} from '../../../database/entities/webhook-delivery.entity';

export interface WebhookEventPayload {
  event: WebhookEvent;
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
  metadata?: Record<string, any>;
}

export interface DeliveryResult {
  success: boolean;
  statusCode?: number;
  responseTime: number;
  error?: string;
  response?: any;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
    @InjectRepository(WebhookEndpoint)
    private webhookEndpointRepository: Repository<WebhookEndpoint>,
    @InjectRepository(WebhookDelivery)
    private webhookDeliveryRepository: Repository<WebhookDelivery>,
    @InjectQueue('webhook-delivery')
    private webhookQueue: Queue,
  ) {}

  // Webhook Endpoint Management
  async createEndpoint(
    name: string,
    url: string,
    events: WebhookEvent[],
    createdBy: string,
    organizationId?: string,
    config?: any
  ): Promise<WebhookEndpoint> {
    const endpointData = WebhookEndpoint.createEndpoint(
      name,
      url,
      events,
      createdBy,
      organizationId
    );

    if (config) {
      endpointData.config = { ...endpointData.config, ...config };
    }

    // Generate verification token
    endpointData.verificationToken = this.generateVerificationToken();

    const endpoint = this.webhookEndpointRepository.create(endpointData);
    const savedEndpoint = await this.webhookEndpointRepository.save(endpoint);

    // Queue verification request
    await this.queueVerification(savedEndpoint);

    this.logger.log(`Created webhook endpoint: ${savedEndpoint.id} for ${url}`);
    return savedEndpoint;
  }

  async updateEndpoint(
    id: string,
    updates: Partial<WebhookEndpoint>
  ): Promise<WebhookEndpoint> {
    const endpoint = await this.getEndpointById(id);
    
    Object.assign(endpoint, updates);
    const updatedEndpoint = await this.webhookEndpointRepository.save(endpoint);

    this.logger.log(`Updated webhook endpoint: ${id}`);
    return updatedEndpoint;
  }

  async deleteEndpoint(id: string): Promise<void> {
    const endpoint = await this.getEndpointById(id);
    
    // Cancel any pending deliveries
    await this.cancelPendingDeliveries(id);
    
    await this.webhookEndpointRepository.remove(endpoint);
    this.logger.log(`Deleted webhook endpoint: ${id}`);
  }

  async getEndpointById(id: string): Promise<WebhookEndpoint> {
    const endpoint = await this.webhookEndpointRepository.findOne({
      where: { id },
      relations: ['creator', 'organization'],
    });

    if (!endpoint) {
      throw new Error(`Webhook endpoint not found: ${id}`);
    }

    return endpoint;
  }

  async getEndpointsByOrganization(organizationId: string): Promise<WebhookEndpoint[]> {
    return this.webhookEndpointRepository.find({
      where: { organizationId, isActive: true },
      relations: ['creator'],
      order: { createdAt: 'DESC' },
    });
  }

  async getEndpointsByEvent(event: WebhookEvent, organizationId?: string): Promise<WebhookEndpoint[]> {
    const query = this.webhookEndpointRepository
      .createQueryBuilder('endpoint')
      .where('endpoint.isActive = :isActive', { isActive: true })
      .andWhere('endpoint.status = :status', { status: WebhookStatus.ACTIVE })
      .andWhere(':event = ANY(endpoint.events)', { event });

    if (organizationId) {
      query.andWhere('(endpoint.organizationId = :organizationId OR endpoint.organizationId IS NULL)', {
        organizationId,
      });
    } else {
      query.andWhere('endpoint.organizationId IS NULL');
    }

    return query.getMany();
  }

  // Event Processing
  async triggerEvent(
    event: WebhookEvent,
    payload: WebhookEventPayload,
    priority: DeliveryPriority = DeliveryPriority.NORMAL
  ): Promise<void> {
    const endpoints = await this.getEndpointsByEvent(event, payload.context?.organizationId);
    
    if (endpoints.length === 0) {
      this.logger.debug(`No webhook endpoints found for event: ${event}`);
      return;
    }

    this.logger.log(`Triggering ${endpoints.length} webhooks for event: ${event}`);

    const deliveries = await Promise.all(
      endpoints.map(endpoint => this.createDelivery(endpoint, event, payload, priority))
    );

    // Queue deliveries for processing
    await Promise.all(
      deliveries.map(delivery => this.queueDelivery(delivery))
    );
  }

  @OnEvent('**')
  async handleSystemEvent(eventName: string, payload: any): Promise<void> {
    // Map system events to webhook events
    const webhookEvent = this.mapSystemEventToWebhookEvent(eventName);
    
    if (!webhookEvent) {
      return; // Event not mapped to webhook
    }

    const webhookPayload: WebhookEventPayload = {
      event: webhookEvent,
      data: payload.data || payload,
      context: payload.context,
      previousData: payload.previousData,
      metadata: {
        sourceEvent: eventName,
        timestamp: new Date(),
        ...payload.metadata,
      },
    };

    await this.triggerEvent(webhookEvent, webhookPayload);
  }

  // Delivery Management
  private async createDelivery(
    endpoint: WebhookEndpoint,
    event: WebhookEvent,
    payload: WebhookEventPayload,
    priority: DeliveryPriority
  ): Promise<WebhookDelivery> {
    // Check if endpoint subscribes to this event
    if (!endpoint.subscribesToEvent(event)) {
      throw new Error(`Endpoint ${endpoint.id} does not subscribe to event ${event}`);
    }

    // Apply filters
    if (!endpoint.matchesFilters(payload.data)) {
      this.logger.debug(`Event filtered out for endpoint ${endpoint.id}`);
      return null;
    }

    // Transform payload if needed
    const transformedPayload = endpoint.transformPayload(payload);

    const deliveryData = WebhookDelivery.createDelivery(
      endpoint.id,
      event,
      transformedPayload,
      priority,
      payload.context?.organizationId
    );

    // Set expiration (24 hours by default)
    deliveryData.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const delivery = this.webhookDeliveryRepository.create(deliveryData);
    return this.webhookDeliveryRepository.save(delivery);
  }

  async processDelivery(deliveryId: string): Promise<DeliveryResult> {
    const delivery = await this.webhookDeliveryRepository.findOne({
      where: { id: deliveryId },
      relations: ['endpoint'],
    });

    if (!delivery) {
      throw new Error(`Webhook delivery not found: ${deliveryId}`);
    }

    if (delivery.isCompleted) {
      this.logger.warn(`Delivery ${deliveryId} is already completed`);
      return { success: true, responseTime: 0 };
    }

    if (delivery.isExpired) {
      delivery.markAsExpired();
      await this.webhookDeliveryRepository.save(delivery);
      return { success: false, error: 'Delivery expired', responseTime: 0 };
    }

    delivery.markAsProcessing();
    await this.webhookDeliveryRepository.save(delivery);

    const startTime = Date.now();
    
    try {
      const result = await this.sendWebhook(delivery);
      const responseTime = Date.now() - startTime;

      if (result.success) {
        delivery.markAsSuccess(result.response, responseTime);
        delivery.endpoint.recordDelivery(true, responseTime);
      } else {
        delivery.markAsFailed(result.error, result.response);
        delivery.endpoint.recordDelivery(false, responseTime, result.error);
      }

      await Promise.all([
        this.webhookDeliveryRepository.save(delivery),
        this.webhookEndpointRepository.save(delivery.endpoint),
      ]);

      // Schedule retry if needed
      if (!result.success && delivery.shouldRetry) {
        await this.scheduleRetry(delivery);
      }

      return { ...result, responseTime };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      delivery.markAsFailed(error);
      delivery.endpoint.recordDelivery(false, responseTime, error.message);

      await Promise.all([
        this.webhookDeliveryRepository.save(delivery),
        this.webhookEndpointRepository.save(delivery.endpoint),
      ]);

      if (delivery.shouldRetry) {
        await this.scheduleRetry(delivery);
      }

      return { success: false, error: error.message, responseTime };
    }
  }

  private async sendWebhook(delivery: WebhookDelivery): Promise<DeliveryResult> {
    const endpoint = delivery.endpoint;
    const config = endpoint.config;
    
    // Prepare request
    const url = endpoint.url;
    const method = config.method || 'POST';
    const timeout = config.timeout || 30000;
    const payload = JSON.stringify(delivery.payload);

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Volkai-Webhooks/1.0',
      'X-Webhook-ID': delivery.id,
      'X-Webhook-Event': delivery.eventType,
      'X-Webhook-Timestamp': delivery.createdAt.toISOString(),
      ...config.headers,
    };

    // Add signature if secret is configured
    if (config.secret) {
      const signature = endpoint.generateSignature(payload);
      const signatureHeader = config.signatureHeader || 'X-Webhook-Signature';
      headers[signatureHeader] = `${config.signatureAlgorithm || 'sha256'}=${signature}`;
    }

    // Store request details
    delivery.request = {
      url,
      method,
      headers,
      body: payload,
      timeout,
      userAgent: headers['User-Agent'],
    };

    try {
      const response: AxiosResponse = await axios({
        method: method.toLowerCase() as any,
        url,
        data: payload,
        headers,
        timeout,
        validateStatus: () => true, // Don't throw on HTTP error status
      });

      const success = response.status >= 200 && response.status < 300;
      
      return {
        success,
        statusCode: response.status,
        responseTime: 0, // Will be calculated by caller
        response: {
          statusCode: response.status,
          statusText: response.statusText,
          headers: response.headers,
          body: typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
          contentType: response.headers['content-type'],
          contentLength: response.headers['content-length'],
        },
        error: success ? undefined : `HTTP ${response.status}: ${response.statusText}`,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: error.response?.status,
        responseTime: 0,
        error: error.message,
        response: error.response ? {
          statusCode: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers,
          body: error.response.data,
        } : undefined,
      };
    }
  }

  // Queue Management
  private async queueDelivery(delivery: WebhookDelivery): Promise<void> {
    if (!delivery) return;

    const delay = delivery.scheduledAt.getTime() - Date.now();
    const jobDelay = Math.max(0, delay);

    await this.webhookQueue.add(
      'process-delivery',
      { deliveryId: delivery.id },
      {
        delay: jobDelay,
        priority: this.getPriorityValue(delivery.priority),
        attempts: 1, // Retries are handled separately
        removeOnComplete: 100,
        removeOnFail: 50,
      }
    );
  }

  private async scheduleRetry(delivery: WebhookDelivery): Promise<void> {
    if (!delivery.nextRetryAt) return;

    const delay = delivery.nextRetryAt.getTime() - Date.now();
    
    await this.webhookQueue.add(
      'process-delivery',
      { deliveryId: delivery.id },
      {
        delay: Math.max(0, delay),
        priority: this.getPriorityValue(delivery.priority),
        attempts: 1,
      }
    );

    this.logger.log(`Scheduled retry for delivery ${delivery.id} in ${delay}ms`);
  }

  private async queueVerification(endpoint: WebhookEndpoint): Promise<void> {
    await this.webhookQueue.add(
      'verify-endpoint',
      { endpointId: endpoint.id },
      {
        priority: 10, // High priority for verification
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );
  }

  // Verification
  async verifyEndpoint(endpointId: string): Promise<boolean> {
    const endpoint = await this.getEndpointById(endpointId);
    
    if (!endpoint.verificationToken) {
      endpoint.verificationToken = this.generateVerificationToken();
      await this.webhookEndpointRepository.save(endpoint);
    }

    try {
      const response = await axios.get(endpoint.url, {
        params: {
          'webhook-verify': endpoint.verificationToken,
        },
        timeout: 10000,
        validateStatus: status => status === 200,
      });

      const isValid = response.data === endpoint.verificationToken ||
                     response.data?.challenge === endpoint.verificationToken;

      if (isValid) {
        endpoint.verify();
        await this.webhookEndpointRepository.save(endpoint);
        this.logger.log(`Verified webhook endpoint: ${endpointId}`);
        return true;
      }
    } catch (error) {
      this.logger.warn(`Failed to verify webhook endpoint ${endpointId}: ${error.message}`);
    }

    return false;
  }

  // Utility Methods
  private generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private getPriorityValue(priority: DeliveryPriority): number {
    switch (priority) {
      case DeliveryPriority.CRITICAL: return 1;
      case DeliveryPriority.HIGH: return 5;
      case DeliveryPriority.NORMAL: return 10;
      case DeliveryPriority.LOW: return 15;
      default: return 10;
    }
  }

  private mapSystemEventToWebhookEvent(systemEvent: string): WebhookEvent | null {
    const eventMap: Record<string, WebhookEvent> = {
      'user.created': WebhookEvent.USER_CREATED,
      'user.updated': WebhookEvent.USER_UPDATED,
      'user.deleted': WebhookEvent.USER_DELETED,
      'organization.created': WebhookEvent.ORGANIZATION_CREATED,
      'course.created': WebhookEvent.COURSE_CREATED,
      'course.published': WebhookEvent.COURSE_PUBLISHED,
      'enrollment.created': WebhookEvent.ENROLLMENT_CREATED,
      'enrollment.completed': WebhookEvent.ENROLLMENT_COMPLETED,
      'assessment.completed': WebhookEvent.ASSESSMENT_COMPLETED,
      'interview.scheduled': WebhookEvent.INTERVIEW_SCHEDULED,
      'interview.completed': WebhookEvent.INTERVIEW_COMPLETED,
      'job.created': WebhookEvent.JOB_CREATED,
      'application.submitted': WebhookEvent.APPLICATION_SUBMITTED,
      'subscription.created': WebhookEvent.SUBSCRIPTION_CREATED,
      'payment.succeeded': WebhookEvent.PAYMENT_SUCCEEDED,
      'payment.failed': WebhookEvent.PAYMENT_FAILED,
      'certificate.issued': WebhookEvent.CERTIFICATE_ISSUED,
    };

    return eventMap[systemEvent] || null;
  }

  private async cancelPendingDeliveries(endpointId: string): Promise<void> {
    const pendingDeliveries = await this.webhookDeliveryRepository.find({
      where: {
        endpointId,
        status: In([DeliveryStatus.PENDING, DeliveryStatus.RETRYING]),
      },
    });

    for (const delivery of pendingDeliveries) {
      delivery.markAsCancelled('Endpoint deleted');
    }

    if (pendingDeliveries.length > 0) {
      await this.webhookDeliveryRepository.save(pendingDeliveries);
      this.logger.log(`Cancelled ${pendingDeliveries.length} pending deliveries for endpoint ${endpointId}`);
    }
  }

  // Analytics and Monitoring
  async getEndpointStats(endpointId: string, days: number = 30): Promise<any> {
    const endpoint = await this.getEndpointById(endpointId);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const deliveries = await this.webhookDeliveryRepository.find({
      where: {
        endpointId,
        createdAt: { $gte: since } as any,
      },
      order: { createdAt: 'DESC' },
    });

    const totalDeliveries = deliveries.length;
    const successfulDeliveries = deliveries.filter(d => d.status === DeliveryStatus.SUCCESS).length;
    const failedDeliveries = deliveries.filter(d => d.status === DeliveryStatus.FAILED).length;
    const avgResponseTime = deliveries
      .filter(d => d.response?.responseTime)
      .reduce((sum, d) => sum + d.response.responseTime, 0) / totalDeliveries || 0;

    return {
      endpoint: {
        id: endpoint.id,
        name: endpoint.name,
        url: endpoint.url,
        status: endpoint.status,
        isHealthy: endpoint.isHealthy,
        successRate: endpoint.successRate,
      },
      stats: {
        totalDeliveries,
        successfulDeliveries,
        failedDeliveries,
        successRate: totalDeliveries > 0 ? (successfulDeliveries / totalDeliveries) * 100 : 0,
        avgResponseTime,
      },
      recentDeliveries: deliveries.slice(0, 10).map(d => ({
        id: d.id,
        eventType: d.eventType,
        status: d.status,
        createdAt: d.createdAt,
        responseTime: d.response?.responseTime,
        statusCode: d.response?.statusCode,
      })),
    };
  }

  async getSystemStats(): Promise<any> {
    const [
      totalEndpoints,
      activeEndpoints,
      totalDeliveries,
      recentDeliveries,
    ] = await Promise.all([
      this.webhookEndpointRepository.count(),
      this.webhookEndpointRepository.count({ where: { status: WebhookStatus.ACTIVE } }),
      this.webhookDeliveryRepository.count(),
      this.webhookDeliveryRepository.count({
        where: {
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } as any,
        },
      }),
    ]);

    return {
      endpoints: {
        total: totalEndpoints,
        active: activeEndpoints,
        inactive: totalEndpoints - activeEndpoints,
      },
      deliveries: {
        total: totalDeliveries,
        last24h: recentDeliveries,
      },
    };
  }
}
