import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, Between } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { 
  Notification, 
  NotificationStatus, 
  NotificationPriority 
} from '../../../database/entities/notification.entity';
import { 
  NotificationTemplate, 
  NotificationChannel 
} from '../../../database/entities/notification-template.entity';
import { 
  UserNotificationPreferences 
} from '../../../database/entities/user-notification-preferences.entity';
import { User } from '../../../database/entities/user.entity';
import { Organization } from '../../../database/entities/organization.entity';
import { EmailService } from '../../email/email.service';

export interface SendNotificationOptions {
  userId?: string;
  organizationId?: string;
  templateKey?: string;
  channel: NotificationChannel;
  subject?: string;
  body: string;
  data?: Record<string, any>;
  priority?: NotificationPriority;
  scheduledAt?: Date;
  variables?: Record<string, any>;
}

export interface BulkNotificationOptions {
  userIds: string[];
  templateKey: string;
  channels: NotificationChannel[];
  variables: Record<string, any>;
  priority?: NotificationPriority;
  scheduledAt?: Date;
  batchSize?: number;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationTemplate)
    private templateRepository: Repository<NotificationTemplate>,
    @InjectRepository(UserNotificationPreferences)
    private preferencesRepository: Repository<UserNotificationPreferences>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectQueue('notifications')
    private notificationQueue: Queue,
    private dataSource: DataSource,
    private eventEmitter: EventEmitter2,
    private emailService: EmailService,
  ) {}

  async sendNotification(options: any): Promise<Notification> {
    try {
      let notification: Partial<Notification>;

      if (options.templateKey) {
        // Create from template
        const template = await this.getTemplate(options.templateKey);
        if (!template.supportsChannel(options.channel)) {
          throw new BadRequestException(`Template ${options.templateKey} does not support ${options.channel} channel`);
        }

        notification = Notification.createFromTemplate(
          template,
          options.channel,
          options.variables || {},
          options.userId,
          options.organizationId,
        );
      } else {
        // Create direct notification
        notification = {
          userId: options.userId,
          organizationId: options.organizationId,
          channel: options.channel,
          subject: options.subject,
          body: options.body,
          data: options.data || {},
          priority: options.priority || NotificationPriority.MEDIUM,
          status: NotificationStatus.PENDING,
          retryCount: 0,
        };
      }

      // Apply scheduling
      if (options.scheduledAt) {
        notification.scheduledAt = options.scheduledAt;
      }

      // Check user preferences
      if (options.userId) {
        const shouldSend = await this.checkUserPreferences(
          options.userId,
          options.templateKey,
          options.channel,
          notification.priority,
        );

        if (!shouldSend) {
          this.logger.log(`Notification blocked by user preferences: ${options.userId}`);
          notification.status = NotificationStatus.CANCELLED;
          notification.errorMessage = 'Blocked by user preferences';
        }
      }

      const savedNotification = await this.notificationRepository.save(notification);

      // Queue for delivery if not cancelled and not scheduled for future
      if (savedNotification.status === NotificationStatus.PENDING && !savedNotification.isScheduled) {
        await this.queueForDelivery(savedNotification);
      }

      // Emit event
      this.eventEmitter.emit('notification.created', {
        notification: savedNotification,
        options,
      });

      this.logger.log(`Notification created: ${savedNotification.id} for channel ${options.channel}`);

      return savedNotification;
    } catch (error) {
      this.logger.error('Failed to send notification', error);
      throw error;
    }
  }

  async sendBulkNotifications(options: BulkNotificationOptions): Promise<{ 
    queued: number; 
    failed: number; 
    batchId: string 
  }> {
    try {
      const template = await this.getTemplate(options.templateKey);
      const batchId = `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const batchSize = options.batchSize || 100;
      
      let queued = 0;
      let failed = 0;

      // Process users in batches
      for (let i = 0; i < options.userIds.length; i += batchSize) {
        const batch = options.userIds.slice(i, i + batchSize);
        
        try {
          await this.processBatch(batch, template, options, batchId, i);
          queued += batch.length * options.channels.length;
        } catch (error) {
          this.logger.error(`Failed to process batch ${i / batchSize + 1}`, error);
          failed += batch.length * options.channels.length;
        }
      }

      // Emit bulk notification event
      this.eventEmitter.emit('notification.bulk.created', {
        batchId,
        totalUsers: options.userIds.length,
        channels: options.channels,
        queued,
        failed,
      });

      this.logger.log(`Bulk notifications queued: ${queued}, failed: ${failed}, batchId: ${batchId}`);

      return { queued, failed, batchId };
    } catch (error) {
      this.logger.error('Failed to send bulk notifications', error);
      throw error;
    }
  }

  async getNotificationById(id: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
      relations: ['user', 'organization', 'template'],
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async getUserNotifications(
    userId: string,
    options: {
      channel?: NotificationChannel;
      status?: NotificationStatus;
      unreadOnly?: boolean;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<{ notifications: Notification[]; total: number; unreadCount: number }> {
    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.template', 'template')
      .where('notification.userId = :userId', { userId });

    if (options.channel) {
      queryBuilder.andWhere('notification.channel = :channel', { channel: options.channel });
    }

    if (options.status) {
      queryBuilder.andWhere('notification.status = :status', { status: options.status });
    }

    if (options.unreadOnly) {
      queryBuilder.andWhere('notification.readAt IS NULL');
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Get unread count
    const unreadCount = await this.notificationRepository.count({
      where: {
        userId,
        readAt: null,
        status: In([NotificationStatus.SENT, NotificationStatus.DELIVERED]),
      },
    });

    // Apply pagination and get results
    queryBuilder
      .orderBy('notification.createdAt', 'DESC')
      .limit(options.limit || 20)
      .offset(options.offset || 0);

    const notifications = await queryBuilder.getMany();

    return { notifications, total, unreadCount };
  }

  async markAsRead(notificationId: string, userId?: string): Promise<Notification> {
    const notification = await this.getNotificationById(notificationId);

    // Verify user ownership if userId provided
    if (userId && notification.userId !== userId) {
      throw new BadRequestException('Cannot mark notification as read for another user');
    }

    if (notification.isRead) {
      return notification; // Already read
    }

    notification.markAsRead();
    const updatedNotification = await this.notificationRepository.save(notification);

    // Emit event
    this.eventEmitter.emit('notification.read', {
      notification: updatedNotification,
    });

    return updatedNotification;
  }

  async markAllAsRead(userId: string, channel?: NotificationChannel): Promise<number> {
    const queryBuilder = this.notificationRepository
      .createQueryBuilder()
      .update(Notification)
      .set({
        status: NotificationStatus.READ,
        readAt: new Date(),
      })
      .where('userId = :userId', { userId })
      .andWhere('readAt IS NULL')
      .andWhere('status IN (:...statuses)', {
        statuses: [NotificationStatus.SENT, NotificationStatus.DELIVERED],
      });

    if (channel) {
      queryBuilder.andWhere('channel = :channel', { channel });
    }

    const result = await queryBuilder.execute();

    // Emit event
    this.eventEmitter.emit('notification.bulk.read', {
      userId,
      channel,
      count: result.affected,
    });

    return result.affected || 0;
  }

  async deleteNotification(notificationId: string, userId?: string): Promise<void> {
    const notification = await this.getNotificationById(notificationId);

    // Verify user ownership if userId provided
    if (userId && notification.userId !== userId) {
      throw new BadRequestException('Cannot delete notification for another user');
    }

    await this.notificationRepository.remove(notification);

    // Emit event
    this.eventEmitter.emit('notification.deleted', {
      notificationId,
      userId: notification.userId,
    });
  }

  async retryFailedNotification(notificationId: string): Promise<Notification> {
    const notification = await this.getNotificationById(notificationId);

    if (!notification.canRetry) {
      throw new BadRequestException('Notification cannot be retried');
    }

    // Reset status and queue for delivery
    notification.status = NotificationStatus.PENDING;
    notification.errorMessage = undefined;
    
    const updatedNotification = await this.notificationRepository.save(notification);
    await this.queueForDelivery(updatedNotification);

    return updatedNotification;
  }

  async getNotificationStats(
    userId?: string,
    organizationId?: string,
    dateRange?: { start: Date; end: Date },
  ): Promise<{
    total: number;
    byStatus: Record<NotificationStatus, number>;
    byChannel: Record<NotificationChannel, number>;
    byPriority: Record<NotificationPriority, number>;
    engagementRate: number;
    averageDeliveryTime: number;
  }> {
    const queryBuilder = this.notificationRepository.createQueryBuilder('notification');

    if (userId) {
      queryBuilder.where('notification.userId = :userId', { userId });
    } else if (organizationId) {
      queryBuilder.where('notification.organizationId = :organizationId', { organizationId });
    }

    if (dateRange) {
      queryBuilder.andWhere('notification.createdAt BETWEEN :start AND :end', {
        start: dateRange.start,
        end: dateRange.end,
      });
    }

    const notifications = await queryBuilder.getMany();

    const stats = {
      total: notifications.length,
      byStatus: {} as Record<NotificationStatus, number>,
      byChannel: {} as Record<NotificationChannel, number>,
      byPriority: {} as Record<NotificationPriority, number>,
      engagementRate: 0,
      averageDeliveryTime: 0,
    };

    let totalEngagementScore = 0;
    let totalDeliveryTime = 0;
    let deliveredCount = 0;

    for (const notification of notifications) {
      // Count by status
      stats.byStatus[notification.status] = (stats.byStatus[notification.status] || 0) + 1;
      
      // Count by channel
      stats.byChannel[notification.channel] = (stats.byChannel[notification.channel] || 0) + 1;
      
      // Count by priority
      stats.byPriority[notification.priority] = (stats.byPriority[notification.priority] || 0) + 1;
      
      // Calculate engagement
      totalEngagementScore += notification.engagementScore;
      
      // Calculate delivery time
      const deliveryTime = notification.deliveryDuration;
      if (deliveryTime) {
        totalDeliveryTime += deliveryTime;
        deliveredCount++;
      }
    }

    stats.engagementRate = notifications.length > 0 ? totalEngagementScore / notifications.length : 0;
    stats.averageDeliveryTime = deliveredCount > 0 ? totalDeliveryTime / deliveredCount : 0;

    return stats;
  }

  // Scheduled tasks
  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledNotifications(): Promise<void> {
    try {
      const scheduledNotifications = await this.notificationRepository.find({
        where: {
          status: NotificationStatus.PENDING,
          scheduledAt: Between(new Date(0), new Date()),
        },
        take: 100,
      });

      for (const notification of scheduledNotifications) {
        await this.queueForDelivery(notification);
      }

      if (scheduledNotifications.length > 0) {
        this.logger.log(`Queued ${scheduledNotifications.length} scheduled notifications`);
      }
    } catch (error) {
      this.logger.error('Failed to process scheduled notifications', error);
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async retryFailedNotifications(): Promise<void> {
    try {
      const failedNotifications = await this.notificationRepository.find({
        where: {
          status: NotificationStatus.FAILED,
          retryCount: In([1, 2]), // Only retry up to 2 times
        },
        take: 50,
      });

      let retried = 0;
      for (const notification of failedNotifications) {
        if (notification.shouldRetry()) {
          notification.status = NotificationStatus.PENDING;
          await this.notificationRepository.save(notification);
          await this.queueForDelivery(notification);
          retried++;
        }
      }

      if (retried > 0) {
        this.logger.log(`Retried ${retried} failed notifications`);
      }
    } catch (error) {
      this.logger.error('Failed to retry notifications', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOldNotifications(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await this.notificationRepository
        .createQueryBuilder()
        .delete()
        .where('createdAt < :date', { date: thirtyDaysAgo })
        .andWhere('status IN (:...statuses)', {
          statuses: [NotificationStatus.READ, NotificationStatus.DELIVERED, NotificationStatus.FAILED],
        })
        .execute();

      this.logger.log(`Cleaned up ${result.affected} old notifications`);
    } catch (error) {
      this.logger.error('Failed to cleanup old notifications', error);
    }
  }

  // Private helper methods
  private async getTemplate(templateKey: string): Promise<NotificationTemplate> {
    const template = await this.templateRepository.findOne({
      where: { key: templateKey, isActive: true },
    });

    if (!template) {
      throw new NotFoundException(`Notification template not found: ${templateKey}`);
    }

    return template;
  }

  private async checkUserPreferences(
    userId: string,
    templateKey?: string,
    channel?: NotificationChannel,
    priority?: NotificationPriority,
  ): Promise<boolean> {
    // Get user preferences (most specific first)
    const preferences = await this.preferencesRepository.find({
      where: [
        { userId, templateKey, channel }, // Most specific
        { userId, templateKey, channel: null }, // Template specific
        { userId, templateKey: null, channel }, // Channel specific
        { userId, templateKey: null, channel: null }, // Global
      ],
      order: { createdAt: 'DESC' },
    });

    // Use the most specific preference found
    const preference = preferences[0];
    
    if (!preference) {
      return true; // No preferences set, allow by default
    }

    return preference.shouldReceiveNotification(templateKey, channel, priority);
  }

  private async queueForDelivery(notification: Notification): Promise<void> {
    const jobData = {
      notificationId: notification.id,
      channel: notification.channel,
      priority: notification.priority,
    };

    const jobOptions = {
      priority: this.getJobPriority(notification.priority),
      delay: 0,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    };

    await this.notificationQueue.add('deliver', jobData, jobOptions);
  }

  private async processBatch(
    userIds: string[],
    template: NotificationTemplate,
    options: BulkNotificationOptions,
    batchId: string,
    batchIndex: number,
  ): Promise<void> {
    const notifications: Partial<Notification>[] = [];

    for (const userId of userIds) {
      for (const channel of options.channels) {
        if (!template.supportsChannel(channel)) continue;

        // Check user preferences
        const shouldSend = await this.checkUserPreferences(
          userId,
          options.templateKey,
          channel,
          options.priority,
        );

        if (!shouldSend) continue;

        const notification = Notification.createFromTemplate(
          template,
          channel,
          options.variables,
          userId,
        );

        notification.scheduledAt = options.scheduledAt;
        notification.metadata = {
          ...notification.metadata,
          batchId,
          batchIndex,
          batchSize: userIds.length,
        };

        notifications.push(notification);
      }
    }

    // Bulk insert notifications
    if (notifications.length > 0) {
      const savedNotifications = await this.notificationRepository.save(notifications);

      // Queue for delivery
      for (const notification of savedNotifications) {
        if (notification.status === NotificationStatus.PENDING && !notification.isScheduled) {
          await this.queueForDelivery(notification);
        }
      }
    }
  }

  private getJobPriority(priority: NotificationPriority): number {
    const priorityMap = {
      [NotificationPriority.URGENT]: 1,
      [NotificationPriority.HIGH]: 2,
      [NotificationPriority.MEDIUM]: 3,
      [NotificationPriority.LOW]: 4,
    };
    return priorityMap[priority] || 3;
  }
}
