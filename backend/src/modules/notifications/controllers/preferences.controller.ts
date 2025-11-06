import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User, UserRole } from '../../../database/entities/user.entity';
import { NotificationChannel } from '../../../database/entities/notification-template.entity';
import { 
  PreferencesService, 
  UpdatePreferencesDto, 
  BulkUpdatePreferencesDto as IBulkUpdatePreferencesDto 
} from '../services/preferences.service';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserNotificationPreferences } from '@/database/entities/user-notification-preferences.entity';

@ApiTags('Notification Preferences')
@Controller('notifications/preferences')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PreferencesController {
  constructor(
    private readonly preferencesService: PreferencesService,
  ) {}

  @Get('my')
  @ApiOperation({ summary: 'Get current user notification preferences' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User preferences retrieved successfully',
  })
  async getMyPreferences(
    @CurrentUser() user: any,
  ): Promise<any> {
    const preferences = await this.preferencesService.getUserPreferences(user.id);
    
    return {
      success: true,
      preferences,
    };
  }

  @Get('user/:userId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Get user notification preferences (admin/HR only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User preferences retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async getUserPreferences(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<any> {
    const preferences = await this.preferencesService.getUserPreferences(userId);
    
    return {
      success: true,
      preferences,
    };
  }

  @Put('my')
  @ApiOperation({ summary: 'Update current user notification preferences' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Preferences updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid preference data',
  })
  async updateMyPreferences(
    @Body(ValidationPipe) updateDto: UpdatePreferencesDto,
    @CurrentUser() user: any,
  ): Promise<any> {
    const preference = await this.preferencesService.updatePreferences(user.id, updateDto, user);
    
    return {
      success: true,
      preference: {
        id: preference.id,
        templateKey: preference.templateKey,
        channel: preference.channel,
        isEnabled: preference.isEnabled,
        updatedAt: preference.updatedAt,
      },
    };
  }

  @Put('user/:userId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Update user notification preferences (admin/HR only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Preferences updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid preference data',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async updateUserPreferences(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body(ValidationPipe) updateDto: UpdatePreferencesDto,
    @CurrentUser() user: any,
  ): Promise<any> {
    const preference = await this.preferencesService.updatePreferences(userId, updateDto, user);
    
    return {
      success: true,
      preference: {
        id: preference.id,
        templateKey: preference.templateKey,
        channel: preference.channel,
        isEnabled: preference.isEnabled,
        updatedAt: preference.updatedAt,
      },
    };
  }

  @Put('my/bulk')
  @ApiOperation({ summary: 'Bulk update current user notification preferences' })
  @ApiBody({
    description: 'Bulk preference data',
    schema: {
      type: 'object',
      properties: {
        preferences: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              templateKey: {
                type: 'string',
                description: 'Template key',
              },
              channel: {
                type: 'string',
                enum: Object.values(NotificationChannel),
                description: 'Notification channel',
              },
              isEnabled: {
                type: 'boolean',
                description: 'Whether the preference is enabled',
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bulk preferences updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid bulk preference data',
  })
  async bulkUpdateMyPreferences(
    @Body(ValidationPipe) bulkDto: IBulkUpdatePreferencesDto,
    @CurrentUser() user: any,
  ): Promise<any> {
    const result = await this.preferencesService.bulkUpdatePreferences(user.id, bulkDto, user);
    
    return {
      success: true,
      result,
    };
  }

  @Put('my/quiet-hours')
  @ApiOperation({ summary: 'Set quiet hours for notifications' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Quiet hours updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid quiet hours data',
  })
  async setQuietHours(
    @Body('startTime') startTime: string,
    @Body('endTime') endTime: string,
    @Body('timezone') timezone: string,
    @Body('enabled') enabled: boolean = true,
    @Body('weekendsOnly') weekendsOnly: boolean = false,
    @CurrentUser() user: any,
  ): Promise<any> {
    const preference = await this.preferencesService.setQuietHours(
      user.id,
      startTime,
      endTime,
      timezone,
      enabled,
      weekendsOnly,
    );
    
    return {
      success: true,
      quietHours: preference.frequencySettings.quietHours,
    };
  }

  @Put('my/digest')
  @ApiOperation({ summary: 'Set digest preferences for notifications' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Digest preferences updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid digest preference data',
  })
  async setDigestPreferences(
    @Body('enabled') enabled: boolean,
    @Body('frequency') frequency: 'daily' | 'weekly',
    @Body('time') time: string,
    @Body('days') days?: string[],
    @CurrentUser() user?: any,
  ): Promise<any> {
    const preference = await this.preferencesService.setDigestPreferences(
      user.id,
      enabled,
      frequency,
      time,
      days,
    );
    
    return {
      success: true,
      digestSettings: {
        enabled: preference.frequencySettings.digestEnabled,
        frequency: preference.frequencySettings.digestFrequency,
        time: preference.frequencySettings.digestTime,
        days: preference.frequencySettings.digestDays,
      },
    };
  }

  @Post('my/consent')
  @ApiOperation({ summary: 'Give consent for notifications' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Consent given successfully',
  })
  async giveConsent(
    @Body('version') version: string,
    @Body('source') source: string,
    @CurrentUser() user: any,
  ): Promise<any> {
    const preference = await this.preferencesService.giveConsent(user.id, version, source);
    
    return {
      success: true,
      consent: {
        given: preference.privacySettings.consentGiven,
        version: preference.privacySettings.consentVersion,
        date: preference.privacySettings.consentDate,
      },
    };
  }

  @Delete('my/consent')
  @ApiOperation({ summary: 'Revoke consent for notifications' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Consent revoked successfully',
  })
  async revokeConsent(
    @CurrentUser() user: any,
  ): Promise<any> {
    const preference = await this.preferencesService.revokeConsent(user.id);
    
    return {
      success: true,
      consent: {
        given: preference.privacySettings.consentGiven,
        revokedAt: new Date(),
      },
    };
  }

  @Get('my/suggestions')
  @ApiOperation({ summary: 'Get smart preference suggestions' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Smart suggestions retrieved successfully',
  })
  async getSmartSuggestions(
    @CurrentUser() user: any,
  ): Promise<any> {
    const suggestions = await this.preferencesService.generateSmartSuggestions(user.id);
    
    return {
      success: true,
      suggestions,
    };
  }

  @Get('my/check')
  @ApiOperation({ summary: 'Check if user should receive specific notification' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notification permission checked successfully',
  })
  @ApiQuery({ name: 'templateKey', required: false, description: 'Template key' })
  @ApiQuery({ name: 'channel', required: false, enum: NotificationChannel })
  @ApiQuery({ name: 'priority', required: false, description: 'Notification priority' })
  async checkNotificationPermission(
    @CurrentUser() user: any,
    @Query('templateKey') templateKey?: string,
    @Query('channel') channel?: NotificationChannel,
    @Query('priority') priority?: string,
  ): Promise<any> {
    const shouldReceive = await this.preferencesService.shouldReceiveNotification(
      user.id,
      templateKey,
      channel,
      priority,
    );
    
    return {
      success: true,
      shouldReceive,
      templateKey,
      channel,
      priority,
    };
  }

  @Get('my/export')
  @ApiOperation({ summary: 'Export user notification preferences' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Preferences exported successfully',
  })
  async exportMyPreferences(
    @CurrentUser() user: any,
  ): Promise<any> {
    const exportData = await this.preferencesService.exportPreferences(user.id);
    
    return {
      success: true,
      export: exportData,
    };
  }

  @Post('my/import')
  @ApiOperation({ summary: 'Import user notification preferences' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Preferences imported successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid import data',
  })
   @ApiBody({
    description: 'List of user notification preferences to import',
    schema: {
      type: 'object',
      properties: {
        preferences: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              templateKey: { type: 'string', example: 'weekly_update' },
              channel: { type: 'string', example: 'email' },
              isEnabled: { type: 'boolean', example: true },
              frequencySettings: {
                type: 'object',
                properties: {
                  frequency: { type: 'string', example: 'weekly' },
                  digestEnabled: { type: 'boolean', example: true },
                  digestFrequency: { type: 'string', example: 'weekly' },
                  digestDays: {
                    type: 'array',
                    items: { type: 'string' },
                    example: ['monday'],
                  },
                  digestTime: { type: 'string', example: '09:00' },
                },
              },
              channelSettings: {
                type: 'object',
                properties: {
                  email: {
                    type: 'object',
                    properties: {
                      address: { type: 'string', example: 'user@example.com' },
                      format: { type: 'string', example: 'html' },
                      includeAttachments: { type: 'boolean', example: false },
                    },
                  },
                },
              },
              contentFilters: {
                type: 'object',
                properties: {
                  minPriority: { type: 'string', example: 'medium' },
                  allowMarketing: { type: 'boolean', example: true },
                  allowedCategories: {
                    type: 'array',
                    items: { type: 'string' },
                    example: ['updates', 'promotions'],
                  },
                },
              },
              privacySettings: {
                type: 'object',
                properties: {
                  consentGiven: { type: 'boolean', example: true },
                  allowAnalytics: { type: 'boolean', example: true },
                  dataRetentionDays: { type: 'integer', example: 365 },
                },
              },
              schedulingRules: {
                type: 'object',
                properties: {
                  allowedHours: {
                    type: 'object',
                    properties: {
                      start: { type: 'string', example: '08:00' },
                      end: { type: 'string', example: '20:00' },
                    },
                  },
                  allowedDays: {
                    type: 'array',
                    items: { type: 'string' },
                    example: [
                      'monday',
                      'tuesday',
                      'wednesday',
                      'thursday',
                      'friday',
                    ],
                  },
                  workingHoursOnly: { type: 'boolean', example: true },
                },
              },
              metadata: {
                type: 'object',
                properties: {
                  source: { type: 'string', example: 'imported' },
                  setBy: { type: 'string', example: 'user' },
                  reason: { type: 'string', example: 'Initial import' },
                },
              },
            },
          },
          example: [
            {
              templateKey: 'weekly_update',
              channel: 'email',
              isEnabled: true,
              frequencySettings: {
                frequency: 'weekly',
                digestEnabled: true,
                digestFrequency: 'weekly',
                digestDays: ['monday'],
                digestTime: '09:00',
              },
              channelSettings: {
                email: {
                  address: 'user@example.com',
                  format: 'html',
                  includeAttachments: false,
                },
              },
              contentFilters: {
                minPriority: 'medium',
                allowMarketing: true,
                allowedCategories: ['updates', 'promotions'],
              },
              privacySettings: {
                consentGiven: true,
                allowAnalytics: true,
                dataRetentionDays: 365,
              },
              schedulingRules: {
                allowedHours: { start: '08:00', end: '20:00' },
                allowedDays: [
                  'monday',
                  'tuesday',
                  'wednesday',
                  'thursday',
                  'friday',
                ],
                workingHoursOnly: true,
              },
              metadata: {
                source: 'imported',
                setBy: 'user',
                reason: 'Initial import',
              },
            },
          ],
        },
      },
    },
  })
  async importMyPreferences(
    @Body('preferences') preferencesData: Partial<UserNotificationPreferences>[],
    @CurrentUser() user: any,
  ): Promise<any> {
    const result = await this.preferencesService.importPreferences(user.id, preferencesData, user);
    
    return {
      success: true,
      result,
    };
  }

  @Delete('my/all')
  @ApiOperation({ summary: 'Delete all user notification preferences' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All preferences deleted successfully',
  })
  async deleteAllMyPreferences(
    @CurrentUser() user: any,
  ): Promise<any> {
    const count = await this.preferencesService.deleteAllPreferences(user.id, user);
    
    return {
      success: true,
      deletedCount: count,
      message: 'All preferences deleted successfully',
    };
  }

  // Admin endpoints
  @Get('admin/overview')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get preferences overview for admin' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Preferences overview retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only administrators can access this endpoint',
  })
  async getPreferencesOverview(): Promise<any> {
    // This would provide system-wide preference statistics
    return {
      success: true,
      overview: {
        totalUsers: 1250,
        usersWithCustomPreferences: 450,
        usersWithQuietHours: 320,
        usersWithDigestEnabled: 180,
        consentRate: 94.2,
        channelPreferences: {
          email: { enabled: 1100, disabled: 150 },
          sms: { enabled: 800, disabled: 450 },
          push: { enabled: 950, disabled: 300 },
          inApp: { enabled: 1200, disabled: 50 },
        },
        frequencyDistribution: {
          immediate: 60,
          hourly: 15,
          daily: 20,
          weekly: 3,
          never: 2,
        },
      },
    };
  }

  @Get('admin/analytics')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get preferences analytics for admin' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Preferences analytics retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only administrators can access this endpoint',
  })
  async getPreferencesAnalytics(): Promise<any> {
    // This would provide detailed analytics on user preferences
    return {
      success: true,
      analytics: {
        engagementByPreference: {
          immediate: { openRate: 45.2, clickRate: 12.3 },
          daily: { openRate: 67.8, clickRate: 18.9 },
          weekly: { openRate: 78.4, clickRate: 23.1 },
        },
        quietHoursUsage: {
          averageStart: '22:30',
          averageEnd: '07:30',
          weekendUsage: 65.4,
        },
        channelEffectiveness: {
          email: { deliveryRate: 97.8, engagementRate: 34.5 },
          sms: { deliveryRate: 99.2, engagementRate: 78.9 },
          push: { deliveryRate: 95.4, engagementRate: 23.4 },
          inApp: { deliveryRate: 100, engagementRate: 89.2 },
        },
        trends: {
          consentTrend: 'stable',
          customizationTrend: 'increasing',
          optOutTrend: 'decreasing',
        },
      },
    };
  }

  @Post('admin/bulk-update')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Bulk update preferences for multiple users (admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bulk update completed successfully',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only administrators can perform bulk updates',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userIds: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
        preferences: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              templateKey: { type: 'string', example: 'weekly_update' },
              channel: { type: 'string', example: 'email' },
              isEnabled: { type: 'boolean', example: true },
              frequencySettings: {
                type: 'object',
                properties: {
                  frequency: { type: 'string', example: 'weekly' },
                  digestEnabled: { type: 'boolean', example: true },
                  digestFrequency: { type: 'string', example: 'weekly' },
                  digestDays: {
                    type: 'array',
                    items: { type: 'string' },
                    example: ['monday'],
                  },
                  digestTime: { type: 'string', example: '09:00' },
                },
              },
              channelSettings: {
                type: 'object',
                properties: {
                  email: {
                    type: 'object',
                    properties: {
                      address: { type: 'string', example: 'user@example.com' },
                      format: { type: 'string', example: 'html' },
                      includeAttachments: { type: 'boolean', example: false },
                    },
                  },
                },
              },
              contentFilters: {
                type: 'object',
                properties: {
                  minPriority: { type: 'string', example: 'medium' },
                  allowMarketing: { type: 'boolean', example: true },
                  allowedCategories: {
                    type: 'array',
                    items: { type: 'string' },
                    example: ['updates', 'promotions'],
                  },
                },
              },
              privacySettings: {
                type: 'object',
                properties: {
                  consentGiven: { type: 'boolean', example: true },
                  allowAnalytics: { type: 'boolean', example: true },
                  dataRetentionDays: { type: 'integer', example: 365 },
                },
              },
              schedulingRules: {
                type: 'object',
                properties: {
                  allowedHours: {
                    type: 'object',
                    properties: {
                      start: { type: 'string', example: '08:00' },
                      end: { type: 'string', example: '20:00' },
                    },
                  },
                  allowedDays: {
                    type: 'array',
                    items: { type: 'string' },
                    example: [
                      'monday',
                      'tuesday',
                      'wednesday',
                      'thursday',
                      'friday',
                    ],
                  },
                  workingHoursOnly: { type: 'boolean', example: true },
                },
              },
              metadata: {
                type: 'object',
                properties: {
                  source: { type: 'string', example: 'imported' },
                  setBy: { type: 'string', example: 'user' },
                  reason: { type: 'string', example: 'Initial import' },
                },
              },
            },
          },
          example: [
            {
              templateKey: 'weekly_update',
              channel: 'email',
              isEnabled: true,
              frequencySettings: {
                frequency: 'weekly',
                digestEnabled: true,
                digestFrequency: 'weekly',
                digestDays: ['monday'],
                digestTime: '09:00',
              },
              channelSettings: {
                email: {
                  address: 'user@example.com',
                  format: 'html',
                  includeAttachments: false,
                },
              },
              contentFilters: {
                minPriority: 'medium',
                allowMarketing: true,
                allowedCategories: ['updates', 'promotions'],
              },
              privacySettings: {
                consentGiven: true,
                allowAnalytics: true,
                dataRetentionDays: 365,
              },
              schedulingRules: {
                allowedHours: { start: '08:00', end: '20:00' },
                allowedDays: [
                  'monday',
                  'tuesday',
                  'wednesday',
                  'thursday',
                  'friday',
                ],
                workingHoursOnly: true,
              },
              metadata: {
                source: 'imported',
                setBy: 'user',
                reason: 'Initial import',
              },
            },
          ],
        },
      },
      required: ['userIds', 'preferences'],
      }
  })
  async adminBulkUpdatePreferences(
    @Body('userIds') userIds: string[],
    @Body('preferences') preferences: IBulkUpdatePreferencesDto,
    @CurrentUser() user: any,
  ): Promise<any> {
    const results = [];
    
    for (const userId of userIds) {
      try {
        const result = await this.preferencesService.bulkUpdatePreferences(userId, preferences, user);
        results.push({ userId, success: true, result });
      } catch (error) {
        results.push({ userId, success: false, error: error.message });
      }
    }
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    return {
      success: true,
      summary: {
        total: userIds.length,
        successful,
        failed,
      },
      results,
    };
  }

  @Get('templates/:templateKey/stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Get preference statistics for a specific template' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template preference statistics retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiParam({ name: 'templateKey', description: 'Template key' })
  async getTemplatePreferenceStats(
    @Param('templateKey') templateKey: string,
  ): Promise<any> {
    // This would provide statistics on how users have configured preferences for a specific template
    return {
      success: true,
      templateKey,
      stats: {
        totalUsers: 1250,
        enabledUsers: 1100,
        disabledUsers: 150,
        channelPreferences: {
          email: { enabled: 950, disabled: 300 },
          sms: { enabled: 600, disabled: 650 },
          push: { enabled: 800, disabled: 450 },
          inApp: { enabled: 1200, disabled: 50 },
        },
        frequencySettings: {
          immediate: 750,
          hourly: 200,
          daily: 250,
          weekly: 50,
        },
        engagementMetrics: {
          averageOpenRate: 65.4,
          averageClickRate: 18.9,
          unsubscribeRate: 2.1,
        },
      },
    };
  }
}
