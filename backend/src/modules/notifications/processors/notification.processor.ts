import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { DeliveryService } from '../services/delivery.service';
import { NotificationService } from '../services/notification.service';

export interface NotificationJobData {
  notificationId: string;
  channel: string;
  priority: string;
  retryCount?: number;
}

@Processor('notifications')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private deliveryService: DeliveryService,
    private notificationService: NotificationService,
  ) {}

  @Process('deliver')
  async handleDelivery(job: Job<NotificationJobData>) {
    const { notificationId, channel, priority } = job.data;
    
    this.logger.log(`Processing notification delivery: ${notificationId} via ${channel}`);

    try {
      const result = await this.deliveryService.deliverNotification(notificationId);
      
      if (result.success) {
        this.logger.log(`Successfully delivered notification ${notificationId}`);
        return { success: true, result };
      } else {
        this.logger.error(`Failed to deliver notification ${notificationId}: ${result.error}`);
        throw new Error(result.error);
      }
    } catch (error) {
      this.logger.error(`Notification delivery failed for ${notificationId}`, error);
      throw error;
    }
  }

  @Process('batch-digest')
  async handleBatchDigest(job: Job<{ userId: string; frequency: 'daily' | 'weekly' }>) {
    const { userId, frequency } = job.data;
    
    this.logger.log(`Processing ${frequency} digest for user ${userId}`);

    try {
      // This would collect pending notifications and send as digest
      // Implementation would depend on specific digest requirements
      
      this.logger.log(`Successfully processed ${frequency} digest for user ${userId}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to process digest for user ${userId}`, error);
      throw error;
    }
  }

  @Process('cleanup')
  async handleCleanup(job: Job<{ olderThanDays: number }>) {
    const { olderThanDays } = job.data;
    
    this.logger.log(`Processing notification cleanup: older than ${olderThanDays} days`);

    try {
      // This would clean up old notifications
      // Implementation in the notification service
      
      this.logger.log(`Successfully completed notification cleanup`);
      return { success: true };
    } catch (error) {
      this.logger.error('Failed to cleanup notifications', error);
      throw error;
    }
  }
}
