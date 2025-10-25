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
  @Column({ name: 'user_id' })
  userId: string;

  @ApiProperty({ description: 'Template key (null for global preferences)' })
  @Column({ name: 'template_key', length: 100, nullable: true })
  templateKey?: string;

  @ApiProperty({ enum: NotificationChannel, description: 'Notification channel' })
  @Column({
    type: 'enum',
    enum: NotificationChannel,
    nullable: true,
  })
  channel?: NotificationChannel;

  @ApiProperty({ description: 'Whether notifications are enabled' })
  @Column({ name: 'is_enabled', default: true })
  isEnabled: boolean;

  @ApiProperty({ description: 'Delivery frequency settings' })
  @Column({ name: 'frequency_settings', type: 'jsonb', default: {} })
  frequencySettings: {
    // Frequency control
    frequency?: 'immediate' | 'hourly' | 'daily' | 'weekly' | 'never';
    batchWindow?: number; // minutes to batch notifications
    maxPerDay?: number;
    maxPerWeek?: number;
    
    // Quiet hours
    quietHours?: {
      enabled: boolean;
      startTime: string; // HH:mm format
      endTime: string;   // HH:mm format
      timezone: string;
      weekendsOnly?: boolean;
    };
    
    // Digest settings
    digestEnabled?: boolean;
    digestFrequency?: 'daily' | 'weekly';
    digestTime?: string; // HH:mm format
    digestDays?: string[]; // ['monday', 'tuesday', ...]
  };

  @ApiProperty({ description: 'Channel-specific settings' })
  @Column({ name: 'channel_settings', type: 'jsonb', default: {} })
  channelSettings: {
    email?: {
      address?: string; // Override default email
      format?: 'html' | 'text';
      includeAttachments?: boolean;
      unsubscribeUrl?: string;
    };
    
    sms?: {
      phoneNumber?: string; // Override default phone
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
  @Column({ name: 'content_filters', type: 'jsonb', default: {} })
  contentFilters: {
    // Priority filtering
    minPriority?: 'low' | 'medium' | 'high' | 'urgent';
    
    // Category filtering
    allowedCategories?: string[];
    blockedCategories?: string[];
    
    // Keyword filtering
    blockedKeywords?: string[];
    requiredKeywords?: string[];
    
    // Content type filtering
    allowMarketing?: boolean;
    allowTransactional?: boolean;
    allowSystemAlerts?: boolean;
    allowSocialUpdates?: boolean;
    
    // Language preferences
    preferredLanguage?: string;
    fallbackLanguage?: string;
  };

  @ApiProperty({ description: 'Privacy and consent settings' })
  @Column({ name: 'privacy_settings', type: 'jsonb', default: {} })
  privacySettings: {
    // Consent tracking
    consentGiven?: boolean;
    consentDate?: Date;
    consentVersion?: string;
    consentSource?: string;
    
    // Data usage preferences
    allowPersonalization?: boolean;
    allowAnalytics?: boolean;
    allowThirdPartySharing?: boolean;
    
    // Retention preferences
    dataRetentionDays?: number;
    deleteAfterRead?: boolean;
    
    // Tracking preferences
    allowOpenTracking?: boolean;
    allowClickTracking?: boolean;
    allowLocationTracking?: boolean;
  };

  @ApiProperty({ description: 'Advanced scheduling rules' })
  @Column({ name: 'scheduling_rules', type: 'jsonb', default: {} })
  schedulingRules: {
    // Time-based rules
    allowedHours?: {
      start: string; // HH:mm
      end: string;   // HH:mm
    };
    allowedDays?: string[]; // ['monday', 'tuesday', ...]
    
    // Frequency limits
    maxPerHour?: number;
    maxPerDay?: number;
    cooldownMinutes?: number; // Minimum time between notifications
    
    // Context-based rules
    workingHoursOnly?: boolean;
    respectCalendarBusy?: boolean;
    respectDoNotDisturb?: boolean;
    
    // Conditional rules
    conditionalRules?: Array<{
      condition: string; // e.g., "user.status === 'busy'"
      action: 'allow' | 'deny' | 'delay';
      delayMinutes?: number;
    }>;
  };

  @ApiProperty({ description: 'Preference metadata and history' })
  @Column({ type: 'jsonb', default: {} })
  metadata: {
    // Source tracking
    source?: 'user_set' | 'admin_set' | 'system_default' | 'imported';
    setBy?: string; // User ID who set this preference
    reason?: string;
    
    // History
    changeHistory?: Array<{
      timestamp: Date;
      field: string;
      oldValue: any;
      newValue: any;
      changedBy: string;
    }>;
    
    // Usage statistics
    lastNotificationSent?: Date;
    totalNotificationsSent?: number;
    totalNotificationsRead?: number;
    averageEngagementRate?: number;
    
    // Smart suggestions
    suggestedChanges?: Array<{
      field: string;
      suggestedValue: any;
      reason: string;
      confidence: number;
    }>;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  // @ManyToOne(() => User, user => user.notificationPreferences)
  // @JoinColumn({ name: 'user_id' })
  // user: User;

  // Virtual properties
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
    
    // Convert current time to user's timezone
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
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  // Methods
  shouldReceiveNotification(templateKey?: string, channel?: NotificationChannel, priority?: string): boolean {
    // Check if notifications are globally disabled
    if (!this.isEnabled) return false;
    
    // Check priority filter
    if (priority && this.contentFilters.minPriority) {
      const priorityLevels = { low: 1, medium: 2, high: 3, urgent: 4 };
      const minLevel = priorityLevels[this.contentFilters.minPriority as keyof typeof priorityLevels];
      const currentLevel = priorityLevels[priority as keyof typeof priorityLevels];
      
      if (currentLevel < minLevel) return false;
    }
    
    // Check quiet hours
    if (this.isInQuietHours) return false;
    
    // Check frequency limits
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
    
    // Calculate engagement rate
    if (this.metadata.totalNotificationsSent > 0) {
      this.metadata.averageEngagementRate = 
        (this.metadata.totalNotificationsRead / this.metadata.totalNotificationsSent) * 100;
    }
  }

  generateSmartSuggestions(): void {
    const suggestions: Array<{ field: string; suggestedValue: any; reason: string; confidence: number }> = [];
    
    // Suggest frequency changes based on engagement
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
    
    // Suggest quiet hours based on activity patterns
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

  // Private helper methods
  private checkFrequencyLimits(): boolean {
    const now = new Date();
    
    // Check hourly limit
    if (this.schedulingRules.maxPerHour) {
      // This would require checking recent notification history
      // Implementation would query recent notifications
    }
    
    // Check daily limit
    if (this.schedulingRules.maxPerDay) {
      // This would require checking today's notification count
      // Implementation would query today's notifications
    }
    
    // For now, return true (would be implemented with actual notification counting)
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
      changedBy: this.userId, // Would be set by the service layer
    });
    
    // Keep only last 50 changes
    if (this.metadata.changeHistory.length > 50) {
      this.metadata.changeHistory = this.metadata.changeHistory.slice(-50);
    }
  }

  // Static helper methods
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
