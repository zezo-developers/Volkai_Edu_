import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../entities/user.entity';
import { Organization } from './organization.entity';
import { NotificationTemplate, NotificationChannel } from './notification-template.entity';

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('notifications')
@Index(['userId', 'status'])
@Index(['organizationId', 'channel'])
@Index(['templateKey', 'createdAt'])
@Index(['scheduledAt'])
@Index(['status', 'retryCount'])
export class Notification {
  @ApiProperty({ description: 'Notification ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'User ID' })
  @Column({ name: 'userId', nullable: true })
  userId?: string;

  @ApiProperty({ description: 'Organization ID' })
  @Column({ name: 'organizationId', nullable: true })
  organizationId?: string;

  @ApiProperty({ description: 'Template key reference' })
  @Column({ name: 'templateKey', length: 100, nullable: true })
  templateKey?: string;

  @ApiProperty({ enum: NotificationChannel, description: 'Notification channel' })
  @Column({
    type: 'enum',
    enum: NotificationChannel,
  })
  channel: NotificationChannel;

  @ApiProperty({ description: 'Notification subject' })
  @Column({ name: 'subject', length: 255, nullable: true })
  subject?: string;

  @ApiProperty({ description: 'Notification body content' })
  @Column({ name: 'body', type: 'text' })
  body: string;

  @ApiProperty({ description: 'Additional notification data' })
  @Column({ name: 'data', type: 'jsonb', default: {} })
  data: {
    actionUrl?: string;
    actionText?: string;
    imageUrl?: string;
    category?: string;
    htmlBody?: string;
    attachments?: Array<{
      filename: string;
      url: string;
      contentType: string;
    }>;
    shortUrl?: string;
    icon?: string;
    sound?: string;
    badge?: number;
    clickAction?: string;
    persistent?: boolean;
    dismissible?: boolean;
    expiresAt?: Date;
    webhookUrl?: string;
    webhookMethod?: 'GET' | 'POST' | 'PUT';
    webhookHeaders?: Record<string, string>;
    campaignId?: string;
    segmentId?: string;
    experimentId?: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
  };

  @ApiProperty({ enum: NotificationStatus, description: 'Notification status' })
  @Column({
    name: 'status',
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  @ApiProperty({ enum: NotificationPriority, description: 'Notification priority' })
  @Column({
    name: 'priority',
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.MEDIUM,
  })
  priority: NotificationPriority;

  @ApiProperty({ description: 'Scheduled delivery time' })
  @Column({ name: 'scheduledAt', type: 'timestamp', nullable: true })
  scheduledAt?: Date;

  @ApiProperty({ description: 'Actual sent time' })
  @Column({ name: 'sentAt', type: 'timestamp', nullable: true })
  sentAt?: Date;

  @ApiProperty({ description: 'Delivery confirmation time' })
  @Column({ name: 'deliveredAt', type: 'timestamp', nullable: true })
  deliveredAt?: Date;

  @ApiProperty({ description: 'Read/opened time' })
  @Column({ name: 'readAt', type: 'timestamp', nullable: true })
  readAt?: Date;

  @ApiProperty({ description: 'Error message if failed' })
  @Column({ name: 'errorMessage', type: 'text', nullable: true })
  errorMessage?: string;

  @ApiProperty({ description: 'Number of retry attempts' })
  @Column({ name: 'retryCount', default: 0 })
  retryCount: number;

  @ApiProperty({ description: 'Next retry time' })
  @Column({ name: 'nextRetryAt', type: 'timestamp', nullable: true })
  nextRetryAt?: Date;

  @ApiProperty({ description: 'Delivery tracking information' })
  @Column({ name: 'deliveryInfo', type: 'jsonb', default: {} })
  deliveryInfo: {
    providerId?: string;
    providerMessageId?: string;
    providerStatus?: string;
    deliveryAttempts?: number;
    deliveryDuration?: number;
    opens?: Array<{
      timestamp: Date;
      userAgent?: string;
      ipAddress?: string;
    }>;
    clicks?: Array<{
      timestamp: Date;
      url: string;
      userAgent?: string;
      ipAddress?: string;
    }>;
    bounces?: Array<{
      timestamp: Date;
      type: 'hard' | 'soft';
      reason: string;
    }>;
    segments?: number;
    cost?: number;
    deviceTokens?: string[];
    failedTokens?: string[];
    responseStatus?: number;
    responseBody?: string;
    responseHeaders?: Record<string, string>;
  };

  @ApiProperty({ description: 'User interaction data' })
  @Column({ name: 'interactionData', type: 'jsonb', default: {} })
  interactionData: {
    opened?: boolean;
    clicked?: boolean;
    dismissed?: boolean;
    replied?: boolean;
    forwarded?: boolean;
    timeToOpen?: number;
    timeToClick?: number;
    timeToRead?: number;
    deviceType?: 'mobile' | 'desktop' | 'tablet';
    platform?: string;
    appVersion?: string;
    country?: string;
    city?: string;
    timezone?: string;
  };

  @ApiProperty({ description: 'Notification metadata' })
  @Column({ name: 'metadata', type: 'jsonb', default: {} })
  metadata: {
    batchId?: string;
    batchSize?: number;
    batchIndex?: number;
    variant?: string;
    testGroup?: string;
    personalizationScore?: number;
    recommendationEngine?: string;
    consentId?: string;
    privacyLevel?: 'public' | 'internal' | 'confidential';
    dataRetentionDays?: number;
    sourceSystem?: string;
    sourceEvent?: string;
    sourceUserId?: string;
    customFields?: Record<string, any>;
  };

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'organizationId' })
  organization?: Organization;

  @ManyToOne(() => NotificationTemplate, { nullable: true })
  @JoinColumn({ name: 'templateKey', referencedColumnName: 'key' })
  template?: NotificationTemplate;

  // Virtual properties
  get isScheduled(): boolean {
    return this.scheduledAt ? this.scheduledAt > new Date() : false;
  }

  get isPending(): boolean {
    return this.status === NotificationStatus.PENDING;
  }

  get isSent(): boolean {
    return [
      NotificationStatus.SENT,
      NotificationStatus.DELIVERED,
      NotificationStatus.READ,
    ].includes(this.status);
  }

  get isFailed(): boolean {
    return this.status === NotificationStatus.FAILED;
  }

  get isRead(): boolean {
    return this.status === NotificationStatus.READ;
  }

  get canRetry(): boolean {
    return this.isFailed && this.retryCount < 3 && !this.isExpired;
  }

  get isExpired(): boolean {
    if (this.data.expiresAt) {
      return new Date() > new Date(this.data.expiresAt);
    }
    if (this.isFailed) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return this.createdAt < thirtyDaysAgo;
    }
    return false;
  }

  get deliveryDuration(): number | null {
    if (this.sentAt && this.deliveredAt) {
      return this.deliveredAt.getTime() - this.sentAt.getTime();
    }
    return null;
  }

  get engagementScore(): number {
    let score = 0;
    if (this.interactionData.opened) score += 25;
    if (this.interactionData.clicked) score += 50;
    if (this.interactionData.replied) score += 75;
    if (this.isRead) score += 100;
    if (this.interactionData.timeToOpen && this.interactionData.timeToOpen < 300) {
      score += 10;
    }
    return Math.min(score, 100);
  }

  // Methods
  markAsSent(providerMessageId?: string): void {
    this.status = NotificationStatus.SENT;
    this.sentAt = new Date();
    if (providerMessageId) this.deliveryInfo.providerMessageId = providerMessageId;
    this.deliveryInfo.deliveryAttempts = (this.deliveryInfo.deliveryAttempts || 0) + 1;
  }

  markAsDelivered(): void {
    this.status = NotificationStatus.DELIVERED;
    this.deliveredAt = new Date();
    if (this.sentAt) this.deliveryInfo.deliveryDuration = this.deliveredAt.getTime() - this.sentAt.getTime();
  }

  markAsRead(): void {
    this.status = NotificationStatus.READ;
    this.readAt = new Date();
    if (this.sentAt) this.interactionData.timeToRead = Math.floor((this.readAt.getTime() - this.sentAt.getTime()) / 1000);
  }

  markAsFailed(errorMessage: string): void {
    this.status = NotificationStatus.FAILED;
    this.errorMessage = errorMessage;
    this.retryCount++;
    if (this.canRetry) {
      const backoffMinutes = Math.pow(2, this.retryCount) * 5;
      this.nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);
    }
  }

  cancel(reason?: string): void {
    this.status = NotificationStatus.CANCELLED;
    if (reason) this.errorMessage = `Cancelled: ${reason}`;
  }

  trackOpen(userAgent?: string, ipAddress?: string): void {
    this.interactionData.opened = true;
    if (!this.deliveryInfo.opens) this.deliveryInfo.opens = [];
    this.deliveryInfo.opens.push({ timestamp: new Date(), userAgent, ipAddress });
    if (this.sentAt && !this.interactionData.timeToOpen) this.interactionData.timeToOpen = Math.floor((Date.now() - this.sentAt.getTime()) / 1000);
  }

  trackClick(url: string, userAgent?: string, ipAddress?: string): void {
    this.interactionData.clicked = true;
    if (!this.deliveryInfo.clicks) this.deliveryInfo.clicks = [];
    this.deliveryInfo.clicks.push({ timestamp: new Date(), url, userAgent, ipAddress });
    if (this.sentAt && !this.interactionData.timeToClick) this.interactionData.timeToClick = Math.floor((Date.now() - this.sentAt.getTime()) / 1000);
  }

  addCustomData(key: string, value: any): void {
    if (!this.metadata.customFields) this.metadata.customFields = {};
    this.metadata.customFields[key] = value;
  }

  getCustomData(key: string): any {
    return this.metadata.customFields?.[key];
  }

  shouldRetry(): boolean {
    if (!this.canRetry) return false;
    if (!this.nextRetryAt) return true;
    return new Date() >= this.nextRetryAt;
  }

  clone(newUserId?: string): Partial<Notification> {
    return {
      userId: newUserId || this.userId,
      organizationId: this.organizationId,
      templateKey: this.templateKey,
      channel: this.channel,
      subject: this.subject,
      body: this.body,
      data: { ...this.data },
      priority: this.priority,
      scheduledAt: this.scheduledAt,
      metadata: { ...this.metadata },
      status: NotificationStatus.PENDING,
      retryCount: 0,
    };
  }

  static createFromTemplate(
    template: NotificationTemplate,
    channel: NotificationChannel,
    variables: Record<string, any>,
    userId?: string,
    organizationId?: string,
  ): Partial<Notification> {
    const validation = template.validateVariables(variables);
    if (!validation.isValid) throw new Error(`Template validation failed: ${validation.errors.join(', ')}`);
    return {
      userId,
      organizationId,
      templateKey: template.key,
      channel,
      subject: template.renderSubject(variables),
      body: template.renderBody(variables),
      priority: (template.metadata.priority as NotificationPriority) || NotificationPriority.MEDIUM,
      status: NotificationStatus.PENDING,
      retryCount: 0,
      data: {},
      deliveryInfo: {},
      interactionData: {},
      metadata: {
        sourceSystem: 'template',
        personalizationScore: Object.keys(variables).length * 10,
      },
    };
  }

  static getStatusDisplayName(status: NotificationStatus): string {
    const names = {
      [NotificationStatus.PENDING]: 'Pending',
      [NotificationStatus.SENT]: 'Sent',
      [NotificationStatus.DELIVERED]: 'Delivered',
      [NotificationStatus.READ]: 'Read',
      [NotificationStatus.FAILED]: 'Failed',
      [NotificationStatus.CANCELLED]: 'Cancelled',
    };
    return names[status] || status;
  }

  static getPriorityDisplayName(priority: NotificationPriority): string {
    const names = {
      [NotificationPriority.LOW]: 'Low',
      [NotificationPriority.MEDIUM]: 'Medium',
      [NotificationPriority.HIGH]: 'High',
      [NotificationPriority.URGENT]: 'Urgent',
    };
    return names[priority] || priority;
  }

  static getDefaultRetrySchedule(): number[] {
    return [5, 15, 60];
  }
}
