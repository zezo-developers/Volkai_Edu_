import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { 
  UserNotificationPreferences 
} from '../../../database/entities/user-notification-preferences.entity';
import { 
  NotificationChannel 
} from '../../../database/entities/notification-template.entity';
import { User } from '../../../database/entities/user.entity';

export interface UpdatePreferencesDto {
  templateKey?: string;
  channel?: NotificationChannel;
  isEnabled?: boolean;
  frequencySettings?: {
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
  channelSettings?: Record<string, any>;
  contentFilters?: {
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
  privacySettings?: {
    allowPersonalization?: boolean;
    allowAnalytics?: boolean;
    allowThirdPartySharing?: boolean;
    dataRetentionDays?: number;
    deleteAfterRead?: boolean;
    allowOpenTracking?: boolean;
    allowClickTracking?: boolean;
    allowLocationTracking?: boolean;
  };
  schedulingRules?: {
    allowedHours?: { start: string; end: string };
    allowedDays?: string[];
    maxPerHour?: number;
    maxPerDay?: number;
    cooldownMinutes?: number;
    workingHoursOnly?: boolean;
    respectCalendarBusy?: boolean;
    respectDoNotDisturb?: boolean;
  };
}

export interface BulkUpdatePreferencesDto {
  preferences: Array<{
    templateKey?: string;
    channel?: NotificationChannel;
    isEnabled: boolean;
  }>;
}

@Injectable()
export class PreferencesService {
  private readonly logger = new Logger(PreferencesService.name);

  constructor(
    @InjectRepository(UserNotificationPreferences)
    private preferencesRepository: Repository<UserNotificationPreferences>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private dataSource: DataSource,
    private eventEmitter: EventEmitter2,
  ) {}

  async getUserPreferences(userId: string): Promise<{
    global: UserNotificationPreferences | null;
    byTemplate: Record<string, UserNotificationPreferences>;
    byChannel: Record<NotificationChannel, UserNotificationPreferences>;
    specific: Record<string, UserNotificationPreferences>; // templateKey:channel
  }> {
    try {
      const preferences = await this.preferencesRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
      });

      const result = {
        global: null as UserNotificationPreferences | null,
        byTemplate: {} as Record<string, UserNotificationPreferences>,
        byChannel: {} as Record<NotificationChannel, UserNotificationPreferences>,
        specific: {} as Record<string, UserNotificationPreferences>,
      };

      for (const pref of preferences) {
        if (pref.isGlobalPreference) {
          result.global = pref;
        } else if (pref.isTemplateSpecific) {
          result.byTemplate[pref.templateKey!] = pref;
        } else if (pref.isChannelSpecific) {
          result.byChannel[pref.channel!] = pref;
        } else if (pref.isFullySpecific) {
          const key = `${pref.templateKey}:${pref.channel}`;
          result.specific[key] = pref;
        }
      }

      return result;
    } catch (error) {
      this.logger.error(`Failed to get user preferences for ${userId}`, error);
      throw error;
    }
  }

  async updatePreferences(
    userId: string,
    updateDto: UpdatePreferencesDto,
    updatedBy?: User,
  ): Promise<UserNotificationPreferences> {
    try {
      // Find existing preference or create new one
      let preference = await this.preferencesRepository.findOne({
        where: {
          userId,
          templateKey: updateDto.templateKey || null,
          channel: updateDto.channel || null,
        },
      });

      if (!preference) {
        preference = this.preferencesRepository.create({
          userId,
          templateKey: updateDto.templateKey,
          channel: updateDto.channel,
          isEnabled: true,
          ...UserNotificationPreferences.createDefault(userId),
        });
      }

      // Update fields
      if (updateDto.isEnabled !== undefined) {
        preference.isEnabled = updateDto.isEnabled;
      }

      if (updateDto.frequencySettings) {
        preference.frequencySettings = {
          ...preference.frequencySettings,
          ...updateDto.frequencySettings,
        };
      }

      if (updateDto.channelSettings) {
        preference.channelSettings = {
          ...preference.channelSettings,
          ...updateDto.channelSettings,
        };
      }

      if (updateDto.contentFilters) {
        preference.contentFilters = {
          ...preference.contentFilters,
          ...updateDto.contentFilters,
        };
      }

      if (updateDto.privacySettings) {
        preference.privacySettings = {
          ...preference.privacySettings,
          ...updateDto.privacySettings,
        };
      }

      if (updateDto.schedulingRules) {
        preference.schedulingRules = {
          ...preference.schedulingRules,
          ...updateDto.schedulingRules,
        };
      }

      // Update metadata
      preference.metadata.source = updatedBy ? 'user_set' : 'admin_set';
      if (updatedBy) {
        preference.metadata.setBy = updatedBy.id;
      }

      const savedPreference = await this.preferencesRepository.save(preference);

      // Emit event
      this.eventEmitter.emit('preferences.updated', {
        userId,
        preference: savedPreference,
        updatedBy,
        changes: updateDto,
      });

      this.logger.log(`Preferences updated for user ${userId}`);

      return savedPreference;
    } catch (error) {
      this.logger.error(`Failed to update preferences for user ${userId}`, error);
      throw error;
    }
  }

  async bulkUpdatePreferences(
    userId: string,
    bulkDto: BulkUpdatePreferencesDto,
    updatedBy?: User,
  ): Promise<{ updated: number; created: number; errors: string[] }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let updated = 0;
      let created = 0;
      const errors: string[] = [];

      for (const prefData of bulkDto.preferences) {
        try {
          let preference = await queryRunner.manager.findOne(UserNotificationPreferences, {
            where: {
              userId,
              templateKey: prefData.templateKey || null,
              channel: prefData.channel || null,
            },
          });

          if (preference) {
            preference.isEnabled = prefData.isEnabled;
            preference.metadata.source = updatedBy ? 'user_set' : 'admin_set';
            if (updatedBy) {
              preference.metadata.setBy = updatedBy.id;
            }
            await queryRunner.manager.save(preference);
            updated++;
          } else {
            preference = queryRunner.manager.create(UserNotificationPreferences, {
              userId,
              templateKey: prefData.templateKey,
              channel: prefData.channel,
              isEnabled: prefData.isEnabled,
              ...UserNotificationPreferences.createDefault(userId),
              metadata: {
                source: updatedBy ? 'user_set' : 'admin_set',
                setBy: updatedBy?.id,
              },
            });
            await queryRunner.manager.save(preference);
            created++;
          }
        } catch (error) {
          errors.push(`Failed to update preference for ${prefData.templateKey}:${prefData.channel}: ${error.message}`);
        }
      }

      await queryRunner.commitTransaction();

      // Emit event
      this.eventEmitter.emit('preferences.bulk.updated', {
        userId,
        updated,
        created,
        errors,
        updatedBy,
      });

      this.logger.log(`Bulk preferences update for user ${userId}: ${updated} updated, ${created} created, ${errors.length} errors`);

      return { updated, created, errors };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to bulk update preferences for user ${userId}`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async setQuietHours(
    userId: string,
    startTime: string,
    endTime: string,
    timezone: string,
    enabled: boolean = true,
    weekendsOnly: boolean = false,
  ): Promise<UserNotificationPreferences> {
    try {
      // Get or create global preference
      let preference = await this.preferencesRepository.findOne({
        where: { userId, templateKey: null, channel: null },
      });

      if (!preference) {
        preference = this.preferencesRepository.create({
          ...UserNotificationPreferences.createDefault(userId),
        });
      }

      preference.setQuietHours(startTime, endTime, timezone, enabled);
      
      if (weekendsOnly !== undefined) {
        preference.frequencySettings.quietHours!.weekendsOnly = weekendsOnly;
      }

      const savedPreference = await this.preferencesRepository.save(preference);

      // Emit event
      this.eventEmitter.emit('preferences.quiet_hours.updated', {
        userId,
        quietHours: preference.frequencySettings.quietHours,
      });

      return savedPreference;
    } catch (error) {
      this.logger.error(`Failed to set quiet hours for user ${userId}`, error);
      throw error;
    }
  }

  async setDigestPreferences(
    userId: string,
    enabled: boolean,
    frequency: 'daily' | 'weekly',
    time: string,
    days?: string[],
  ): Promise<UserNotificationPreferences> {
    try {
      // Get or create global preference
      let preference = await this.preferencesRepository.findOne({
        where: { userId, templateKey: null, channel: null },
      });

      if (!preference) {
        preference = this.preferencesRepository.create({
          ...UserNotificationPreferences.createDefault(userId),
        });
      }

      preference.frequencySettings.digestEnabled = enabled;
      preference.frequencySettings.digestFrequency = frequency;
      preference.frequencySettings.digestTime = time;
      
      if (days) {
        preference.frequencySettings.digestDays = days;
      }

      const savedPreference = await this.preferencesRepository.save(preference);

      // Emit event
      this.eventEmitter.emit('preferences.digest.updated', {
        userId,
        digestSettings: {
          enabled,
          frequency,
          time,
          days,
        },
      });

      return savedPreference;
    } catch (error) {
      this.logger.error(`Failed to set digest preferences for user ${userId}`, error);
      throw error;
    }
  }

  async giveConsent(userId: string, version: string, source: string): Promise<UserNotificationPreferences> {
    try {
      // Get or create global preference
      let preference = await this.preferencesRepository.findOne({
        where: { userId, templateKey: null, channel: null },
      });

      if (!preference) {
        preference = this.preferencesRepository.create({
          ...UserNotificationPreferences.createDefault(userId),
        });
      }

      preference.giveConsent(version, source);
      const savedPreference = await this.preferencesRepository.save(preference);

      // Emit event
      this.eventEmitter.emit('preferences.consent.given', {
        userId,
        version,
        source,
      });

      return savedPreference;
    } catch (error) {
      this.logger.error(`Failed to give consent for user ${userId}`, error);
      throw error;
    }
  }

  async revokeConsent(userId: string): Promise<UserNotificationPreferences> {
    try {
      // Get or create global preference
      let preference = await this.preferencesRepository.findOne({
        where: { userId, templateKey: null, channel: null },
      });

      if (!preference) {
        preference = this.preferencesRepository.create({
          ...UserNotificationPreferences.createDefault(userId),
        });
      }

      preference.revokeConsent();
      const savedPreference = await this.preferencesRepository.save(preference);

      // Emit event
      this.eventEmitter.emit('preferences.consent.revoked', {
        userId,
      });

      return savedPreference;
    } catch (error) {
      this.logger.error(`Failed to revoke consent for user ${userId}`, error);
      throw error;
    }
  }

  async getPreferenceByKey(
    userId: string,
    templateKey?: string,
    channel?: NotificationChannel,
  ): Promise<UserNotificationPreferences | null> {
    return await this.preferencesRepository.findOne({
      where: {
        userId,
        templateKey: templateKey || null,
        channel: channel || null,
      },
    });
  }

  async shouldReceiveNotification(
    userId: string,
    templateKey?: string,
    channel?: NotificationChannel,
    priority?: string,
  ): Promise<boolean> {
    try {
      // Get preferences in order of specificity
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
    } catch (error) {
      this.logger.error(`Failed to check notification permission for user ${userId}`, error);
      return true; // Default to allowing notifications on error
    }
  }

  async generateSmartSuggestions(userId: string): Promise<Array<{
    type: 'frequency' | 'quietHours' | 'digest' | 'channel';
    field: string;
    currentValue: any;
    suggestedValue: any;
    reason: string;
    confidence: number;
  }>> {
    try {
      const preferences = await this.preferencesRepository.find({
        where: { userId },
      });

      const suggestions: Array<{
        type: 'frequency' | 'quietHours' | 'digest' | 'channel';
        field: string;
        currentValue: any;
        suggestedValue: any;
        reason: string;
        confidence: number;
      }> = [];

      for (const preference of preferences) {
        preference.generateSmartSuggestions();
        
        if (preference.metadata.suggestedChanges) {
          for (const suggestion of preference.metadata.suggestedChanges) {
            suggestions.push({
              type: this.getSuggestionType(suggestion.field),
              field: suggestion.field,
              currentValue: this.getCurrentValue(preference, suggestion.field),
              suggestedValue: suggestion.suggestedValue,
              reason: suggestion.reason,
              confidence: suggestion.confidence,
            });
          }
        }
      }

      // Save updated preferences with suggestions
      await this.preferencesRepository.save(preferences);

      return suggestions;
    } catch (error) {
      this.logger.error(`Failed to generate smart suggestions for user ${userId}`, error);
      return [];
    }
  }

  async exportPreferences(userId: string): Promise<{
    userId: string;
    exportedAt: Date;
    preferences: UserNotificationPreferences[];
  }> {
    try {
      const preferences = await this.preferencesRepository.find({
        where: { userId },
        order: { createdAt: 'ASC' },
      });

      return {
        userId,
        exportedAt: new Date(),
        preferences,
      };
    } catch (error) {
      this.logger.error(`Failed to export preferences for user ${userId}`, error);
      throw error;
    }
  }

  async importPreferences(
    userId: string,
    preferencesData: Partial<UserNotificationPreferences>[],
    importedBy?: User,
  ): Promise<{ imported: number; skipped: number; errors: string[] }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const prefData of preferencesData) {
        try {
          // Check if preference already exists
          const existing = await queryRunner.manager.findOne(UserNotificationPreferences, {
            where: {
              userId,
              templateKey: prefData.templateKey || null,
              channel: prefData.channel || null,
            },
          });

          if (existing) {
            skipped++;
            continue;
          }

          // Create new preference
          const preference = queryRunner.manager.create(UserNotificationPreferences, {
            ...prefData,
            userId,
            metadata: {
              ...prefData.metadata,
              source: 'imported',
              setBy: importedBy?.id,
            },
          });

          await queryRunner.manager.save(preference);
          imported++;
        } catch (error) {
          errors.push(`Failed to import preference: ${error.message}`);
        }
      }

      await queryRunner.commitTransaction();

      // Emit event
      this.eventEmitter.emit('preferences.imported', {
        userId,
        imported,
        skipped,
        errors,
        importedBy,
      });

      return { imported, skipped, errors };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to import preferences for user ${userId}`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteAllPreferences(userId: string, deletedBy?: User): Promise<number> {
    try {
      const result = await this.preferencesRepository.delete({ userId });

      // Emit event
      this.eventEmitter.emit('preferences.deleted.all', {
        userId,
        count: result.affected,
        deletedBy,
      });

      this.logger.log(`Deleted all preferences for user ${userId}: ${result.affected} records`);

      return result.affected || 0;
    } catch (error) {
      this.logger.error(`Failed to delete all preferences for user ${userId}`, error);
      throw error;
    }
  }

  // Private helper methods
  private getSuggestionType(field: string): 'frequency' | 'quietHours' | 'digest' | 'channel' {
    if (field.includes('frequency')) return 'frequency';
    if (field.includes('quietHours')) return 'quietHours';
    if (field.includes('digest')) return 'digest';
    return 'channel';
  }

  private getCurrentValue(preference: UserNotificationPreferences, field: string): any {
    const fieldPath = field.split('.');
    let value: any = preference;
    
    for (const path of fieldPath) {
      value = value?.[path];
    }
    
    return value;
  }
}
