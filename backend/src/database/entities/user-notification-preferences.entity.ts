import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../entities/user.entity';
import { NotificationChannel } from './notification-template.entity';

@Entity('user_notification_preferences')
@Unique(['userId', 'templateKey', 'channel'])
@Index(['userId'])
@Index(['templateKey'])
@Index(['channel', 'isEnabled'])
export class UserNotificationPreferences {
  @ApiProperty({ description: 'Preference ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'User ID' })
  @Column({ name: 'userId' })
  userId: string;

  @ApiProperty({ description: 'Template key (null for global preferences)' })
  @Column({ name: 'templateKey', length: 100, nullable: true })
  templateKey?: string;

  @ApiProperty({ enum: NotificationChannel, description: 'Notification channel' })
  @Column({
    type: 'enum',
    enum: NotificationChannel,
    nullable: true,
  })
  channel?: NotificationChannel;

  @ApiProperty({ description: 'Whether notifications are enabled' })
  @Column({ name: 'isEnabled', default: true })
  isEnabled: boolean;

  @ApiProperty({ description: 'Delivery frequency settings' })
  @Column({ name: 'frequencySettings', type: 'jsonb', default: {} })
  frequencySettings: {
    frequency?: 'immediate' | 'hourly' | 'daily' | 'weekly' | 'never';
    batchWindow?: number;
    maxPerDay?: number;
    maxPerWeek?: number;

    quietHours?: {
      enabled: boolean;
      startTime: string;
      endTime: string;
      timezone: string;
      weekendsOnly?: boolean;
    };

    digestEnabled?: boolean;
    digestFrequency?: 'daily' | 'weekly';
    digestTime?: string;
    digestDays?: string[];
  };

  @ApiProperty({ description: 'Channel-specific settings' })
  @Column({ name: 'channelSettings', type: 'jsonb', default: {} })
  channelSettings: {
    email?: {
      address?: string;
      format?: 'html' | 'text';
      includeAttachments?: boolean;
      unsubscribeUrl?: string;
    };

    sms?: {
      phoneNumber?: string;
      shortFormat?: boolean;
      includeLinks?: boolean;
    };

    push?: {
      deviceTokens?: string[];
      sound?: string;
      badge?: boolean;
      vibration?: boolean;
      priority?: 'min' | 'low' | 'default' | 'high' | 'max';
    };

    inApp?: {
      showBanner?: boolean;
      playSound?: boolean;
      persistent?: boolean;
      position?: 'top' | 'bottom' | 'center';
      theme?: 'light' | 'dark' | 'auto';
    };

    webhook?: {
      url?: string;
      method?: 'GET' | 'POST' | 'PUT';
      headers?: Record<string, string>;
      authentication?: {
        type: 'none' | 'basic' | 'bearer' | 'api_key';
        credentials?: Record<string, string>;
      };
    };
  };

  @ApiProperty({ description: 'Content filtering preferences' })
  @Column({ name: 'contentFilters', type: 'jsonb', default: {} })
  contentFilters: {
    minPriority?: 'low' | 'medium' | 'high' | 'urgent';
    allowedCategories?: string[];
    blockedCategories?: string[];
    blockedKeywords?: string[];
    requiredKeywords?: string[];
    allowMarketing?: boolean;
    allowTransactional?: boolean;
    allowSystemAlerts?: boolean;
    allowSocialUpdates?: boolean;
    preferredLanguage?: string;
    fallbackLanguage?: string;
  };

  @ApiProperty({ description: 'Privacy and consent settings' })
  @Column({ name: 'privacySettings', type: 'jsonb', default: {} })
  privacySettings: {
    consentGiven?: boolean;
    consentDate?: Date;
    consentVersion?: string;
    consentSource?: string;
    allowPersonalization?: boolean;
    allowAnalytics?: boolean;
    allowThirdPartySharing?: boolean;
    dataRetentionDays?: number;
    deleteAfterRead?: boolean;
    allowOpenTracking?: boolean;
    allowClickTracking?: boolean;
    allowLocationTracking?: boolean;
  };

  @ApiProperty({ description: 'Advanced scheduling rules' })
  @Column({ name: 'schedulingRules', type: 'jsonb', default: {} })
  schedulingRules: {
    allowedHours?: {
      start: string;
      end: string;
    };
    allowedDays?: string[];
    maxPerHour?: number;
    maxPerDay?: number;
    cooldownMinutes?: number;
    workingHoursOnly?: boolean;
    respectCalendarBusy?: boolean;
    respectDoNotDisturb?: boolean;
    conditionalRules?: Array<{
      condition: string;
      action: 'allow' | 'deny' | 'delay';
      delayMinutes?: number;
    }>;
  };

  @ApiProperty({ description: 'Preference metadata and history' })
  @Column({ name: 'metadata', type: 'jsonb', default: {} })
  metadata: {
    source?: 'user_set' | 'admin_set' | 'system_default' | 'imported';
    setBy?: string;
    reason?: string;
    changeHistory?: Array<{
      timestamp: Date;
      field: string;
      oldValue: any;
      newValue: any;
      changedBy: string;
    }>;
    lastNotificationSent?: Date;
    totalNotificationsSent?: number;
    totalNotificationsRead?: number;
    averageEngagementRate?: number;
    suggestedChanges?: Array<{
      field: string;
      suggestedValue: any;
      reason: string;
      confidence: number;
    }>;
  };

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  get isGlobalPreference(): boolean {
    return !this.templateKey && !this.channel;
  }

  get isTemplateSpecific(): boolean {
    return !!this.templateKey && !this.channel;
  }

  get isChannelSpecific(): boolean {
    return !this.templateKey && !!this.channel;
  }

  get isFullySpecific(): boolean {
    return !!this.templateKey && !!this.channel;
  }

  get effectiveFrequency(): string {
    return this.frequencySettings.frequency || 'immediate';
  }

  get hasQuietHours(): boolean {
    return this.frequencySettings.quietHours?.enabled || false;
  }

  get isInQuietHours(): boolean {
    if (!this.hasQuietHours) return false;

    const now = new Date();
    const quietHours = this.frequencySettings.quietHours!;
    const userTime = new Date(now.toLocaleString('en-US', { timeZone: quietHours.timezone }));
    const currentHour = userTime.getHours();
    const currentMinute = userTime.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    const [startHour, startMinute] = quietHours.startTime.split(':').map(Number);
    const [endHour, endMinute] = quietHours.endTime.split(':').map(Number);
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  shouldReceiveNotification(templateKey?: string, channel?: NotificationChannel, priority?: string): boolean {
    if (!this.isEnabled) return false;

    if (priority && this.contentFilters.minPriority) {
      const priorityLevels = { low: 1, medium: 2, high: 3, urgent: 4 };
      const minLevel = priorityLevels[this.contentFilters.minPriority as keyof typeof priorityLevels];
      const currentLevel = priorityLevels[priority as keyof typeof priorityLevels];
      if (currentLevel < minLevel) return false;
    }

    if (this.isInQuietHours) return false;

    if (!this.checkFrequencyLimits()) return false;

    return true;
  }

  updateChannelSetting(channel: NotificationChannel, setting: string, value: any): void {
    if (!this.channelSettings[channel]) {
      this.channelSettings[channel] = {};
    }

    const oldValue = (this.channelSettings[channel] as any)[setting];
    (this.channelSettings[channel] as any)[setting] = value;

    this.addToHistory('channelSettings', oldValue, value);
  }

  setQuietHours(startTime: string, endTime: string, timezone: string, enabled: boolean = true): void {
    const oldValue = this.frequencySettings.quietHours;
    this.frequencySettings.quietHours = {
      enabled,
      startTime,
      endTime,
      timezone,
    };
    this.addToHistory('quietHours', oldValue, this.frequencySettings.quietHours);
  }

  setFrequency(frequency: 'immediate' | 'hourly' | 'daily' | 'weekly' | 'never'): void {
    const oldValue = this.frequencySettings.frequency;
    this.frequencySettings.frequency = frequency;
    this.addToHistory('frequency', oldValue, frequency);
  }

  addContentFilter(type: 'category' | 'keyword', value: string, action: 'allow' | 'block'): void {
    if (type === 'category') {
      if (action === 'allow') {
        if (!this.contentFilters.allowedCategories) this.contentFilters.allowedCategories = [];
        if (!this.contentFilters.allowedCategories.includes(value)) {
          this.contentFilters.allowedCategories.push(value);
        }
      } else {
        if (!this.contentFilters.blockedCategories) this.contentFilters.blockedCategories = [];
        if (!this.contentFilters.blockedCategories.includes(value)) {
          this.contentFilters.blockedCategories.push(value);
        }
      }
    } else if (type === 'keyword') {
      if (action === 'allow') {
        if (!this.contentFilters.requiredKeywords) this.contentFilters.requiredKeywords = [];
        if (!this.contentFilters.requiredKeywords.includes(value)) {
          this.contentFilters.requiredKeywords.push(value);
        }
      } else {
        if (!this.contentFilters.blockedKeywords) this.contentFilters.blockedKeywords = [];
        if (!this.contentFilters.blockedKeywords.includes(value)) {
          this.contentFilters.blockedKeywords.push(value);
        }
      }
    }
  }

  giveConsent(version: string, source: string): void {
    this.privacySettings.consentGiven = true;
    this.privacySettings.consentDate = new Date();
    this.privacySettings.consentVersion = version;
    this.privacySettings.consentSource = source;
    this.addToHistory('consent', false, true);
  }

  revokeConsent(): void {
    this.privacySettings.consentGiven = false;
    this.isEnabled = false;
    this.addToHistory('consent', true, false);
  }

  updateEngagementStats(sent: boolean, read: boolean): void {
    if (!this.metadata.totalNotificationsSent) this.metadata.totalNotificationsSent = 0;
    if (!this.metadata.totalNotificationsRead) this.metadata.totalNotificationsRead = 0;

    if (sent) {
      this.metadata.totalNotificationsSent++;
      this.metadata.lastNotificationSent = new Date();
    }

    if (read) {
      this.metadata.totalNotificationsRead++;
    }

    if (this.metadata.totalNotificationsSent > 0) {
      this.metadata.averageEngagementRate =
        (this.metadata.totalNotificationsRead / this.metadata.totalNotificationsSent) * 100;
    }
  }

  generateSmartSuggestions(): void {
    const suggestions: Array<{ field: string; suggestedValue: any; reason: string; confidence: number }> = [];

    if (this.metadata.averageEngagementRate !== undefined) {
      if (this.metadata.averageEngagementRate < 10 && this.effectiveFrequency === 'immediate') {
        suggestions.push({
          field: 'frequency',
          suggestedValue: 'daily',
          reason: 'Low engagement rate suggests users prefer less frequent notifications',
          confidence: 0.8,
        });
      } else if (this.metadata.averageEngagementRate > 80 && this.effectiveFrequency === 'daily') {
        suggestions.push({
          field: 'frequency',
          suggestedValue: 'immediate',
          reason: 'High engagement rate suggests users are interested in real-time notifications',
          confidence: 0.7,
        });
      }
    }

    if (!this.hasQuietHours && this.metadata.totalNotificationsSent && this.metadata.totalNotificationsSent > 50) {
      suggestions.push({
        field: 'quietHours',
        suggestedValue: { enabled: true, startTime: '22:00', endTime: '08:00', timezone: 'UTC' },
        reason: 'Setting quiet hours can improve user experience',
        confidence: 0.6,
      });
    }

    this.metadata.suggestedChanges = suggestions;
  }

  private checkFrequencyLimits(): boolean {
    return true;
  }

  private addToHistory(field: string, oldValue: any, newValue: any): void {
    if (!this.metadata.changeHistory) {
      this.metadata.changeHistory = [];
    }

    this.metadata.changeHistory.push({
      timestamp: new Date(),
      field,
      oldValue,
      newValue,
      changedBy: this.userId,
    });

    if (this.metadata.changeHistory.length > 50) {
      this.metadata.changeHistory = this.metadata.changeHistory.slice(-50);
    }
  }

  static createDefault(userId: string): Partial<UserNotificationPreferences> {
    return {
      userId,
      isEnabled: true,
      frequencySettings: {
        frequency: 'immediate',
        batchWindow: 0,
        maxPerDay: 50,
        maxPerWeek: 200,
        quietHours: {
          enabled: false,
          startTime: '22:00',
          endTime: '08:00',
          timezone: 'UTC',
        },
      },
      channelSettings: {},
      contentFilters: {
        minPriority: 'low',
        allowMarketing: true,
        allowTransactional: true,
        allowSystemAlerts: true,
        allowSocialUpdates: true,
      },
      privacySettings: {
        allowPersonalization: true,
        allowAnalytics: true,
        allowThirdPartySharing: false,
        allowOpenTracking: true,
        allowClickTracking: true,
        allowLocationTracking: false,
      },
      schedulingRules: {
        maxPerHour: 10,
        maxPerDay: 50,
        cooldownMinutes: 1,
      },
      metadata: {
        source: 'system_default',
      },
    };
  }

  static createForTemplate(userId: string, templateKey: string, channel?: NotificationChannel): Partial<UserNotificationPreferences> {
    return {
      ...UserNotificationPreferences.createDefault(userId),
      templateKey,
      channel,
    };
  }
}
