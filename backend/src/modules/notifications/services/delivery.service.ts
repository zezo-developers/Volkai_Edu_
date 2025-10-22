import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { 
  Notification, 
  NotificationStatus 
} from '../../../database/entities/notification.entity';
import { 
  NotificationChannel 
} from '../../../database/entities/notification-template.entity';
import { User } from '../../../database/entities/user.entity';
import { EmailService } from '../../email/email.service';

export interface DeliveryResult {
  success: boolean;
  providerId?: string;
  providerMessageId?: string;
  error?: string;
  deliveryTime?: number;
}

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
    private httpService: HttpService,
    private eventEmitter: EventEmitter2,
    private emailService: EmailService,
  ) {}

  async deliverNotification(notificationId: string): Promise<DeliveryResult> {
    const startTime = Date.now();
    
    try {
      const notification = await this.notificationRepository.findOne({
        where: { id: notificationId },
        relations: ['user'],
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      let result: DeliveryResult;

      switch (notification.channel) {
        case NotificationChannel.EMAIL:
          result = await this.deliverEmail(notification);
          break;
        case NotificationChannel.SMS:
          result = await this.deliverSMS(notification);
          break;
        case NotificationChannel.PUSH:
          result = await this.deliverPush(notification);
          break;
        case NotificationChannel.IN_APP:
          result = await this.deliverInApp(notification);
          break;
        case NotificationChannel.WEBHOOK:
          result = await this.deliverWebhook(notification);
          break;
        default:
          throw new Error(`Unsupported channel: ${notification.channel}`);
      }

      result.deliveryTime = Date.now() - startTime;

      // Update notification status
      if (result.success) {
        notification.markAsSent(result.providerMessageId);
        if (result.providerId) {
          notification.deliveryInfo.providerId = result.providerId;
        }
      } else {
        notification.markAsFailed(result.error || 'Delivery failed');
      }

      await this.notificationRepository.save(notification);

      // Emit delivery event
      this.eventEmitter.emit('notification.delivered', {
        notification,
        result,
      });

      this.logger.log(`Notification ${notificationId} delivery ${result.success ? 'succeeded' : 'failed'} via ${notification.channel}`);

      return result;
    } catch (error) {
      const result: DeliveryResult = {
        success: false,
        error: error.message,
        deliveryTime: Date.now() - startTime,
      };

      this.logger.error(`Failed to deliver notification ${notificationId}`, error);
      return result;
    }
  }

  private async deliverEmail(notification: any): Promise<DeliveryResult> {
    try {
      if (!notification.user?.email && !notification.data.email) {
        throw new Error('No email address available');
      }

      const emailAddress = notification.data.email || notification.user.email;
      const htmlBody = notification.data.htmlBody || this.convertToHtml(notification.body);

      const emailData = {
        to: emailAddress,
        subject: notification.subject || 'Notification',
        text: notification.body,
        html: htmlBody,
        attachments: notification.data.attachments || [],
      };

      // Add tracking pixels if enabled
      if (notification.user && this.shouldTrackEmail(notification)) {
        emailData.html = this.addTrackingPixel(emailData.html, notification.id);
        emailData.html = this.addClickTracking(emailData.html, notification.id);
      }

      const result:any = await this.emailService.sendEmail(emailData);

      return {
        success: true,
        providerId: 'email_service',
        providerMessageId: result.messageId,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async deliverSMS(notification: any): Promise<DeliveryResult> {
    try {
      const twilioAccountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
      const twilioAuthToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
      const twilioFromNumber = this.configService.get<string>('TWILIO_FROM_NUMBER');

      if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
        throw new Error('Twilio configuration missing');
      }

      if (!notification.user?.phone && !notification.data.phoneNumber) {
        throw new Error('No phone number available');
      }

      const phoneNumber = notification.data.phoneNumber || notification.user.phone;
      let messageBody = notification.body;

      // Add short URL if provided
      if (notification.data.shortUrl) {
        messageBody += `\n\n${notification.data.shortUrl}`;
      }

      // Ensure message is within SMS limits
      if (messageBody.length > 1600) {
        messageBody = messageBody.substring(0, 1597) + '...';
      }

      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
      const auth = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64');

      const response = await this.httpService.axiosRef.post(
        twilioUrl,
        new URLSearchParams({
          From: twilioFromNumber,
          To: phoneNumber,
          Body: messageBody,
        }),
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return {
        success: true,
        providerId: 'twilio',
        providerMessageId: response.data.sid,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  private async deliverPush(notification: any): Promise<DeliveryResult> {
    try {
      const fcmServerKey = this.configService.get<string>('FCM_SERVER_KEY');
      
      if (!fcmServerKey) {
        throw new Error('FCM configuration missing');
      }

      const deviceTokens = notification.data.deviceTokens || [];
      if (deviceTokens.length === 0) {
        throw new Error('No device tokens available');
      }

      const payload = {
        registration_ids: deviceTokens,
        notification: {
          title: notification.subject || 'Notification',
          body: notification.body,
          icon: notification.data.icon || '/icon-192x192.png',
          sound: notification.data.sound || 'default',
          badge: notification.data.badge || 1,
          click_action: notification.data.clickAction || notification.data.actionUrl,
        },
        data: {
          notificationId: notification.id,
          category: notification.data.category || 'general',
          actionUrl: notification.data.actionUrl,
          ...notification.data.customData,
        },
      };

      const response = await this.httpService.axiosRef.post(
        'https://fcm.googleapis.com/fcm/send',
        payload,
        {
          headers: {
            'Authorization': `key=${fcmServerKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Track failed tokens
      const failedTokens: string[] = [];
      if (response.data.results) {
        response.data.results.forEach((result: any, index: number) => {
          if (result.error) {
            failedTokens.push(deviceTokens[index]);
          }
        });
      }

      if (failedTokens.length > 0) {
        notification.deliveryInfo.failedTokens = failedTokens;
      }

      return {
        success: response.data.success > 0,
        providerId: 'fcm',
        providerMessageId: response.data.multicast_id?.toString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  private async deliverInApp(notification: Notification): Promise<DeliveryResult> {
    try {
      // For in-app notifications, we just mark as sent and emit a real-time event
      // The WebSocket gateway will handle the actual delivery to connected clients
      
      this.eventEmitter.emit('notification.in_app', {
        userId: notification.userId,
        notification: {
          id: notification.id,
          subject: notification.subject,
          body: notification.body,
          data: notification.data,
          priority: notification.priority,
          createdAt: notification.createdAt,
        },
      });

      return {
        success: true,
        providerId: 'in_app',
        providerMessageId: notification.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async deliverWebhook(notification: any): Promise<DeliveryResult> {
    try {
      const webhookUrl = notification.data.webhookUrl;
      const method = notification.data.webhookMethod || 'POST';
      const headers = notification.data.webhookHeaders || {};

      if (!webhookUrl) {
        throw new Error('Webhook URL not provided');
      }

      const payload = {
        notificationId: notification.id,
        userId: notification.userId,
        organizationId: notification.organizationId,
        channel: notification.channel,
        subject: notification.subject,
        body: notification.body,
        data: notification.data,
        priority: notification.priority,
        createdAt: notification.createdAt,
        timestamp: new Date().toISOString(),
      };

      const config: any = {
        method: method.toLowerCase(),
        url: webhookUrl,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Volkai-Notifications/1.0',
          ...headers,
        },
        timeout: 30000, // 30 seconds
      };

      if (method.toUpperCase() !== 'GET') {
        config.data = payload;
      }

      const response = await this.httpService.axiosRef.request(config);

      // Store response info
      notification.deliveryInfo.responseStatus = response.status;
      notification.deliveryInfo.responseHeaders = response.headers;
      notification.deliveryInfo.responseBody = JSON.stringify(response.data).substring(0, 1000); // Limit size

      return {
        success: response.status >= 200 && response.status < 300,
        providerId: 'webhook',
        providerMessageId: response.headers['x-message-id'] || notification.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  private shouldTrackEmail(notification: Notification): boolean {
    // Check user preferences for tracking
    return notification.user?.id ? true : false; // Simplified logic
  }

  private addTrackingPixel(html: string, notificationId: string): string {
    const trackingUrl = `${this.configService.get('APP_URL')}/api/notifications/${notificationId}/track/open`;
    const trackingPixel = `<img src="${trackingUrl}" width="1" height="1" style="display:none;" alt="" />`;
    
    // Add before closing body tag, or at the end if no body tag
    if (html.includes('</body>')) {
      return html.replace('</body>', `${trackingPixel}</body>`);
    } else {
      return html + trackingPixel;
    }
  }

  private addClickTracking(html: string, notificationId: string): string {
    const baseUrl = this.configService.get('APP_URL');
    
    // Replace all links with tracking links
    return html.replace(
      /<a\s+([^>]*?)href=["']([^"']+)["']([^>]*?)>/gi,
      (match, before, url, after) => {
        if (url.startsWith('mailto:') || url.startsWith('tel:')) {
          return match; // Don't track mailto or tel links
        }
        
        const trackingUrl = `${baseUrl}/api/notifications/${notificationId}/track/click?url=${encodeURIComponent(url)}`;
        return `<a ${before}href="${trackingUrl}"${after}>`;
      }
    );
  }

  private convertToHtml(text: string): string {
    // Simple text to HTML conversion
    return text
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^(.*)$/, '<p>$1</p>')
      .replace(/<p><\/p>/g, '')
      // Convert URLs to links
      .replace(
        /(https?:\/\/[^\s]+)/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
      )
      // Convert email addresses to mailto links
      .replace(
        /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
        '<a href="mailto:$1">$1</a>'
      );
  }

  // Delivery status tracking methods
  async handleEmailWebhook(data: any): Promise<void> {
    try {
      // Handle email provider webhooks (SendGrid, SES, etc.)
      const messageId = data.messageId || data['sg_message_id'];
      const event = data.event || data.eventType;
      
      if (!messageId) return;

      const notification = await this.notificationRepository.findOne({
        where: { 
          deliveryInfo: { providerMessageId: messageId } as any 
        },
      });

      if (!notification) return;

      switch (event) {
        case 'delivered':
          notification.markAsDelivered();
          break;
        case 'open':
          notification.trackOpen(data.userAgent, data.ip);
          break;
        case 'click':
          notification.trackClick(data.url, data.userAgent, data.ip);
          break;
        case 'bounce':
        case 'dropped':
          notification.markAsFailed(`Email ${event}: ${data.reason}`);
          break;
      }

      await this.notificationRepository.save(notification);

      this.eventEmitter.emit('notification.webhook.processed', {
        notification,
        event,
        data,
      });
    } catch (error) {
      this.logger.error('Failed to process email webhook', error);
    }
  }

  async handleSMSWebhook(data: any): Promise<void> {
    try {
      // Handle SMS provider webhooks (Twilio, etc.)
      const messageId = data.MessageSid || data.messageId;
      const status = data.MessageStatus || data.status;
      
      if (!messageId) return;

      const notification = await this.notificationRepository.findOne({
        where: { 
          deliveryInfo: { providerMessageId: messageId } as any 
        },
      });

      if (!notification) return;

      switch (status) {
        case 'delivered':
          notification.markAsDelivered();
          break;
        case 'failed':
        case 'undelivered':
          notification.markAsFailed(`SMS ${status}: ${data.ErrorMessage || data.reason}`);
          break;
      }

      await this.notificationRepository.save(notification);

      this.eventEmitter.emit('notification.webhook.processed', {
        notification,
        event: status,
        data,
      });
    } catch (error) {
      this.logger.error('Failed to process SMS webhook', error);
    }
  }

  async trackNotificationOpen(notificationId: string, userAgent?: string, ipAddress?: string): Promise<void> {
    try {
      const notification = await this.notificationRepository.findOne({
        where: { id: notificationId },
      });

      if (notification) {
        notification.trackOpen(userAgent, ipAddress);
        await this.notificationRepository.save(notification);
      }
    } catch (error) {
      this.logger.error(`Failed to track notification open: ${notificationId}`, error);
    }
  }

  async trackNotificationClick(notificationId: string, url: string, userAgent?: string, ipAddress?: string): Promise<string> {
    try {
      const notification = await this.notificationRepository.findOne({
        where: { id: notificationId },
      });

      if (notification) {
        notification.trackClick(url, userAgent, ipAddress);
        await this.notificationRepository.save(notification);
      }

      return url; // Return original URL for redirect
    } catch (error) {
      this.logger.error(`Failed to track notification click: ${notificationId}`, error);
      return url;
    }
  }
}
