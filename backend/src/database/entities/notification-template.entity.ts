import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
  WEBHOOK = 'webhook',
}

@Entity('notification_templates')
@Index(['key'], { unique: true })
@Index(['isActive'])
export class NotificationTemplate {
  @ApiProperty({ description: 'Notification template ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Unique template key' })
  @Column({ length: 100, unique: true, name: 'key' })
  key: string;

  @ApiProperty({ description: 'Template name' })
  @Column({ length: 255, name: 'name' })
  name: string;

  @ApiProperty({ description: 'Template description' })
  @Column({ type: 'text', nullable: true, name: 'description' })
  description?: string;

  @ApiProperty({ 
    enum: NotificationChannel, 
    isArray: true, 
    description: 'Supported notification channels' 
  })
  @Column({ type: 'text', array:true, default: [], name: 'channels' })
  channels: NotificationChannel[];

  @ApiProperty({ description: 'Subject template with variables' })
  @Column({ type: 'text', nullable: true, name: 'subjectTemplate' })
  subjectTemplate?: string;

  @ApiProperty({ description: 'Body template with variables' })
  @Column({ type: 'text', name: 'bodyTemplate' })
  bodyTemplate: string;

  @ApiProperty({ description: 'Template variables schema' })
  @Column({ type: 'jsonb', default: {}, name: 'variables' })
  variables: {
    [key: string]: {
      type: 'string' | 'number' | 'boolean' | 'date' | 'object';
      required: boolean;
      description: string;
      default?: any;
    };
  };

  @ApiProperty({ description: 'Template metadata and settings' })
  @Column({ type: 'jsonb', default: {}, name: 'metadata' })
  metadata: {
    category?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    tags?: string[];
    version?: string;
    author?: string;
    approvedBy?: string;
    approvedAt?: Date;
    createdBy?: string;
    clonedFrom?: string;
    clonedAt?: Date;
  };

  @ApiProperty({ description: 'Template styling and formatting' })
  @Column({ type: 'jsonb', default: {}, name: 'styling' })
  styling: {
    email?: {
      htmlTemplate?: string;
      cssStyles?: string;
      headerImage?: string;
      footerText?: string;
    };
    sms?: {
      maxLength?: number;
      allowEmojis?: boolean;
    };
    push?: {
      icon?: string;
      sound?: string;
      badge?: number;
      actions?: Array<{
        id: string;
        title: string;
        action: string;
      }>;
    };
    inApp?: {
      icon?: string;
      color?: string;
      actionUrl?: string;
      dismissible?: boolean;
    };
  };

  @ApiProperty({ description: 'Delivery settings' })
  @Column({ type: 'jsonb', default: {}, name: 'deliverySettings' })
  deliverySettings: {
    retryAttempts?: number;
    retryDelay?: number; // in minutes
    batchSize?: number;
    rateLimitPerMinute?: number;
    quietHours?: {
      enabled: boolean;
      startTime: string; // HH:mm format
      endTime: string;   // HH:mm format
      timezone: string;
    };
    scheduling?: {
      allowScheduling: boolean;
      maxFutureSchedule?: number; // in days
    };
  };

  @ApiProperty({ description: 'Localization support' })
  @Column({ type: 'jsonb', default: {}, name: 'localization' })
  localization: {
    defaultLanguage?: string;
    supportedLanguages?: string[];
    translations?: {
      [language: string]: {
        subjectTemplate?: string;
        bodyTemplate?: string;
        variables?: Record<string, any>;
      };
    };
  };

  @ApiProperty({ description: 'Template validation rules' })
  @Column({ type: 'jsonb', default: {}, name: 'validationRules' })
  validationRules: {
    requiredVariables?: string[];
    conditionalVariables?: {
      [condition: string]: string[];
    };
    customValidators?: Array<{
      field: string;
      rule: string;
      message: string;
    }>;
  };

  @ApiProperty({ description: 'Whether template is active' })
  @Column({ default: true, name: 'isActive' })
  isActive: boolean;

  @ApiProperty({ description: 'Usage statistics' })
  @Column({ type: 'jsonb', default: {}, name: 'usageStats' })
  usageStats: {
    totalSent?: number;
    successRate?: number;
    lastUsed?: Date;
    popularChannels?: Record<NotificationChannel, number>;
    errorRate?: number;
    averageDeliveryTime?: number; // in seconds
  };

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  // Virtual properties
  get isEmailSupported(): boolean {
    return this.channels.includes(NotificationChannel.EMAIL);
  }

  get isSmsSupported(): boolean {
    return this.channels.includes(NotificationChannel.SMS);
  }

  get isPushSupported(): boolean {
    return this.channels.includes(NotificationChannel.PUSH);
  }

  get isInAppSupported(): boolean {
    return this.channels.includes(NotificationChannel.IN_APP);
  }

  get isWebhookSupported(): boolean {
    return this.channels.includes(NotificationChannel.WEBHOOK);
  }

  get priority(): string {
    return this.metadata.priority || 'medium';
  }

  get category(): string {
    return this.metadata.category || 'general';
  }

  // Methods
  renderSubject(variables: Record<string, any>, language?: string): string {
    const template = this.getLocalizedTemplate(language)?.subjectTemplate || this.subjectTemplate;
    return this.renderTemplate(template || '', variables);
  }

  renderBody(variables: Record<string, any>, language?: string): string {
    const template = this.getLocalizedTemplate(language)?.bodyTemplate || this.bodyTemplate;
    return this.renderTemplate(template, variables);
  }

  validateVariables(variables: Record<string, any>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.validationRules.requiredVariables) {
      for (const required of this.validationRules.requiredVariables) {
        if (!(required in variables) || variables[required] === null || variables[required] === undefined) {
          errors.push(`Missing required variable: ${required}`);
        }
      }
    }

    for (const [key, value] of Object.entries(variables)) {
      if (this.variables[key]) {
        const expectedType = this.variables[key].type;
        const actualType = this.getVariableType(value);
        if (expectedType !== actualType) {
          errors.push(`Variable '${key}' should be of type '${expectedType}', got '${actualType}'`);
        }
      }
    }

    if (this.validationRules.conditionalVariables) {
      for (const [condition, requiredVars] of Object.entries(this.validationRules.conditionalVariables)) {
        if (this.evaluateCondition(condition, variables)) {
          for (const required of requiredVars) {
            if (!(required in variables)) {
              errors.push(`Missing conditional variable '${required}' for condition '${condition}'`);
            }
          }
        }
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  supportsChannel(channel: NotificationChannel): boolean {
    return this.channels.includes(channel);
  }

  updateUsageStats(channel: NotificationChannel, success: boolean, deliveryTime?: number): void {
    if (!this.usageStats.totalSent) this.usageStats.totalSent = 0;
    if (!this.usageStats.popularChannels) this.usageStats.popularChannels = {} as any;

    this.usageStats.totalSent++;
    this.usageStats.lastUsed = new Date();

    if (!this.usageStats.popularChannels[channel]) this.usageStats.popularChannels[channel] = 0;
    this.usageStats.popularChannels[channel]++;

    const currentSuccessCount = Math.floor((this.usageStats.successRate || 0) * (this.usageStats.totalSent - 1) / 100);
    const newSuccessCount = success ? currentSuccessCount + 1 : currentSuccessCount;
    this.usageStats.successRate = (newSuccessCount / this.usageStats.totalSent) * 100;

    if (deliveryTime && success) {
      const currentAvg = this.usageStats.averageDeliveryTime || 0;
      const currentCount = this.usageStats.totalSent - 1;
      this.usageStats.averageDeliveryTime = ((currentAvg * currentCount) + deliveryTime) / this.usageStats.totalSent;
    }
  }

  clone(newKey: string, newName: string): Partial<NotificationTemplate> {
    return {
      key: newKey,
      name: newName,
      description: `Copy of ${this.description || this.name}`,
      channels: [...this.channels],
      subjectTemplate: this.subjectTemplate,
      bodyTemplate: this.bodyTemplate,
      variables: { ...this.variables },
      metadata: { ...this.metadata, version: '1.0' },
      styling: { ...this.styling },
      deliverySettings: { ...this.deliverySettings },
      localization: { ...this.localization },
      validationRules: { ...this.validationRules },
      isActive: false,
    };
  }

  private renderTemplate(template: string, variables: Record<string, any>): string {
    let rendered = template;
    rendered = rendered.replace(/\{\{(\w+)\}\}/g, (match, varName) => variables[varName]?.toString() || match);
    rendered = rendered.replace(/\{\{#if\s+(\w+)\}\}(.*?)\{\{\/if\}\}/gs, (match, condition, content) => variables[condition] ? content : '');
    rendered = rendered.replace(/\{\{#each\s+(\w+)\}\}(.*?)\{\{\/each\}\}/gs, (match, arrayName, content) => {
      const array = variables[arrayName];
      if (Array.isArray(array)) {
        return array.map(item => {
          let itemContent = content;
          if (typeof item === 'object') {
            for (const [key, value] of Object.entries(item)) {
              itemContent = itemContent.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value?.toString() || '');
            }
          } else {
            itemContent = itemContent.replace(/\{\{this\}\}/g, item?.toString() || '');
          }
          return itemContent;
        }).join('');
      }
      return '';
    });
    return rendered;
  }

  private getLocalizedTemplate(language?: string): { subjectTemplate?: string; bodyTemplate?: string } | null {
    if (!language || !this.localization.translations) return null;
    return this.localization.translations[language] || null;
  }

  private getVariableType(value: any): string {
    if (value === null || value === undefined) return 'undefined';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (value instanceof Date) return 'date';
    if (typeof value === 'object') return 'object';
    return 'unknown';
  }

  private evaluateCondition(condition: string, variables: Record<string, any>): boolean {
    try {
      let evaluableCondition = condition;
      for (const [key, value] of Object.entries(variables)) {
        evaluableCondition = evaluableCondition.replace(new RegExp(`\\b${key}\\b`, 'g'), JSON.stringify(value));
      }
      if (!/^[a-zA-Z0-9\s"'._\-+*/()===!<>&&||]+$/.test(evaluableCondition)) return false;
      return Function(`"use strict"; return (${evaluableCondition})`)();
    } catch {
      return false;
    }
  }

  static getDefaultChannels(): NotificationChannel[] {
    return [NotificationChannel.EMAIL, NotificationChannel.IN_APP];
  }

  static getChannelDisplayName(channel: NotificationChannel): string {
    const names = {
      [NotificationChannel.EMAIL]: 'Email',
      [NotificationChannel.SMS]: 'SMS',
      [NotificationChannel.PUSH]: 'Push Notification',
      [NotificationChannel.IN_APP]: 'In-App Notification',
      [NotificationChannel.WEBHOOK]: 'Webhook',
    };
    return names[channel] || channel;
  }

  static createDefaultTemplate(key: string, name: string): Partial<NotificationTemplate> {
    return {
      key,
      name,
      channels: NotificationTemplate.getDefaultChannels(),
      subjectTemplate: `{{subject}}`,
      bodyTemplate: `Hello {{userName}},\n\n{{message}}\n\nBest regards,\nVolkai HR Edu Team`,
      variables: {
        userName: { type: 'string', required: true, description: 'Name of the user receiving the notification' },
        subject: { type: 'string', required: true, description: 'Subject of the notification' },
        message: { type: 'string', required: true, description: 'Main message content' },
      },
      metadata: { category: 'general', priority: 'medium', version: '1.0' },
      deliverySettings: { retryAttempts: 3, retryDelay: 5, batchSize: 100, rateLimitPerMinute: 60 },
      isActive: true,
    };
  }
}
