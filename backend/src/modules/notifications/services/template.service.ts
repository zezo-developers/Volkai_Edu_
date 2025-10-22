import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { 
  NotificationTemplate, 
  NotificationChannel 
} from '../../../database/entities/notification-template.entity';
import { User } from '../../../database/entities/user.entity';

export interface CreateTemplateDto {
  key: string;
  name: string;
  description?: string;
  channels: NotificationChannel[];
  subjectTemplate?: string;
  bodyTemplate: string;
  variables?: Record<string, any>;
  metadata?: Record<string, any>;
  styling?: Record<string, any>;
  deliverySettings?: Record<string, any>;
  localization?: Record<string, any>;
  validationRules?: Record<string, any>;
}

export interface UpdateTemplateDto extends Partial<CreateTemplateDto> {
  isActive?: boolean;
}

export interface SearchTemplatesDto {
  search?: string;
  category?: string;
  channel?: NotificationChannel;
  isActive?: boolean;
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  constructor(
    @InjectRepository(NotificationTemplate)
    private templateRepository: Repository<NotificationTemplate |any>,
    private dataSource: DataSource,
    private eventEmitter: EventEmitter2,
  ) {}

  async createTemplate(createDto: CreateTemplateDto, user: User): Promise<NotificationTemplate> {
    try {
      // Check if template key already exists
      const existingTemplate = await this.templateRepository.findOne({
        where: { key: createDto.key },
      });

      if (existingTemplate) {
        throw new ConflictException(`Template with key '${createDto.key}' already exists`);
      }

      // Validate template data
      this.validateTemplateData(createDto);

      const template = this.templateRepository.create({
        ...createDto,
        metadata: {
          ...createDto.metadata,
          author: user.id,
          version: '1.0',
          createdBy: user.fullName,
        },
        usageStats: {
          totalSent: 0,
          successRate: 0,
          errorRate: 0,
          popularChannels: {},
        },
        isActive: true,
      });

      const savedTemplate = await this.templateRepository.save(template);

      // Emit event
      this.eventEmitter.emit('template.created', {
        template: savedTemplate,
        user,
      });

      this.logger.log(`Template created: ${savedTemplate.key} by user ${user.id}`);

      return savedTemplate;
    } catch (error) {
      this.logger.error('Failed to create template', error);
      throw error;
    }
  }

  async getTemplateById(id: string): Promise<NotificationTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  async getTemplateByKey(key: string): Promise<NotificationTemplate> {
    const template = await this.templateRepository.findOne({
      where: { key, isActive: true },
    });

    if (!template) {
      throw new NotFoundException(`Template not found: ${key}`);
    }

    return template;
  }

  async searchTemplates(searchDto: SearchTemplatesDto): Promise<{
    templates: NotificationTemplate[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryBuilder = this.templateRepository.createQueryBuilder('template');

    // Apply filters
    if (searchDto.search) {
      queryBuilder.andWhere(
        '(template.name ILIKE :search OR template.description ILIKE :search OR template.key ILIKE :search)',
        { search: `%${searchDto.search}%` }
      );
    }

    if (searchDto.category) {
      queryBuilder.andWhere("template.metadata->>'category' = :category", { 
        category: searchDto.category 
      });
    }

    if (searchDto.channel) {
      queryBuilder.andWhere(':channel = ANY(template.channels)', { 
        channel: searchDto.channel 
      });
    }

    if (searchDto.isActive !== undefined) {
      queryBuilder.andWhere('template.isActive = :isActive', { 
        isActive: searchDto.isActive 
      });
    }

    if (searchDto.tags && searchDto.tags.length > 0) {
      queryBuilder.andWhere("template.metadata->'tags' ?& :tags", { 
        tags: searchDto.tags 
      });
    }

    // Apply sorting
    const sortBy = searchDto.sortBy || 'createdAt';
    const sortOrder = searchDto.sortOrder || 'DESC';
    queryBuilder.orderBy(`template.${sortBy}`, sortOrder);

    // Apply pagination
    const page = searchDto.page || 1;
    const limit = searchDto.limit || 20;
    queryBuilder.skip((page - 1) * limit).take(limit);

    const [templates, total] = await queryBuilder.getManyAndCount();

    return {
      templates,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateTemplate(id: string, updateDto: UpdateTemplateDto, user: User): Promise<NotificationTemplate> {
    try {
      const template:any = await this.getTemplateById(id);

      // Validate update data
      if (updateDto.bodyTemplate || updateDto.subjectTemplate || updateDto.variables) {
        this.validateTemplateData(updateDto as CreateTemplateDto);
      }

      // Update template
      Object.assign(template, updateDto);

      // Update metadata
      if (!template.metadata?.changeHistory) {
        template.metadata.changeHistory = [];
      }

      template.metadata.changeHistory.push({
        timestamp: new Date(),
        updatedBy: user.id,
        updatedByName: user.fullName,
        changes: Object.keys(updateDto),
        version: template.metadata.version || '1.0',
      });

      // Increment version if significant changes
      if (updateDto.bodyTemplate || updateDto.subjectTemplate || updateDto.variables) {
        const currentVersion = template.metadata.version || '1.0';
        const [major, minor] = currentVersion.split('.').map(Number);
        template.metadata.version = `${major}.${minor + 1}`;
      }

      const updatedTemplate = await this.templateRepository.save(template);

      // Emit event
      this.eventEmitter.emit('template.updated', {
        template: updatedTemplate,
        user,
        changes: updateDto,
      });

      this.logger.log(`Template updated: ${template.key} by user ${user.id}`);

      return updatedTemplate;
    } catch (error) {
      this.logger.error(`Failed to update template ${id}`, error);
      throw error;
    }
  }

  async deleteTemplate(id: string, user: User): Promise<void> {
    try {
      const template:any = await this.getTemplateById(id);

      // Check if template is in use (would need to check notifications table)
      // For now, just mark as inactive instead of deleting
      template.isActive = false;
      template.metadata.deletedBy = user.id;
      template.metadata.deletedAt = new Date();

      await this.templateRepository.save(template);

      // Emit event
      this.eventEmitter.emit('template.deleted', {
        templateId: id,
        templateKey: template.key,
        user,
      });

      this.logger.log(`Template deleted: ${template.key} by user ${user.id}`);
    } catch (error) {
      this.logger.error(`Failed to delete template ${id}`, error);
      throw error;
    }
  }

  async cloneTemplate(id: string, newKey: string, newName: string, user: User): Promise<NotificationTemplate> {
    try {
      const originalTemplate = await this.getTemplateById(id);

      // Check if new key already exists
      const existingTemplate = await this.templateRepository.findOne({
        where: { key: newKey },
      });

      if (existingTemplate) {
        throw new ConflictException(`Template with key '${newKey}' already exists`);
      }

      const clonedData = originalTemplate.clone(newKey, newName);
      clonedData.metadata = {
        ...clonedData.metadata,
        author: user.id,
        createdBy: user.fullName,
        clonedFrom: originalTemplate.key,
        clonedAt: new Date(),
      };

      const clonedTemplate = await this.templateRepository.save(clonedData);

      // Emit event
      this.eventEmitter.emit('template.cloned', {
        originalTemplate,
        clonedTemplate,
        user,
      });

      this.logger.log(`Template cloned: ${originalTemplate.key} -> ${newKey} by user ${user.id}`);

      return clonedTemplate;
    } catch (error) {
      this.logger.error(`Failed to clone template ${id}`, error);
      throw error;
    }
  }

  async previewTemplate(
    id: string,
    variables: Record<string, any>,
    channel: NotificationChannel,
    language?: string,
  ): Promise<{
    subject: string;
    body: string;
    isValid: boolean;
    errors: string[];
  }> {
    try {
      const template = await this.getTemplateById(id);

      if (!template.supportsChannel(channel)) {
        throw new BadRequestException(`Template does not support ${channel} channel`);
      }

      // Validate variables
      const validation = template.validateVariables(variables);

      // Render template
      const subject = template.renderSubject(variables, language);
      const body = template.renderBody(variables, language);

      return {
        subject,
        body,
        isValid: validation.isValid,
        errors: validation.errors,
      };
    } catch (error) {
      this.logger.error(`Failed to preview template ${id}`, error);
      throw error;
    }
  }

  async getTemplateUsageStats(id: string): Promise<any> {
    try {
      const template = await this.getTemplateById(id);

      // This would typically query the notifications table for actual usage data
      // For now, return the stored usage stats
      const usageTrend = this.generateMockUsageTrend(); // Would be real data in production

      return {
        totalSent: template.usageStats.totalSent || 0,
        successRate: template.usageStats.successRate || 0,
        errorRate: template.usageStats.errorRate || 0,
        popularChannels: template.usageStats.popularChannels || {},
        averageDeliveryTime: template.usageStats.averageDeliveryTime || 0,
        lastUsed: template.usageStats.lastUsed,
        usageTrend,
      };
    } catch (error) {
      this.logger.error(`Failed to get template usage stats ${id}`, error);
      throw error;
    }
  }

  async getTemplatesByCategory(): Promise<Record<string, NotificationTemplate[]>> {
    const templates = await this.templateRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });

    const categorized: Record<string, NotificationTemplate[]> = {};

    for (const template of templates) {
      const category = template.category || 'general';
      if (!categorized[category]) {
        categorized[category] = [];
      }
      categorized[category].push(template);
    }

    return categorized;
  }

  async validateTemplate(id: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    try {
      const template = await this.getTemplateById(id);
      const errors: string[] = [];
      const warnings: string[] = [];

      // Basic validation
      if (!template.bodyTemplate?.trim()) {
        errors.push('Body template is required');
      }

      if (template.channels.length === 0) {
        errors.push('At least one channel must be supported');
      }

      // Validate template syntax
      try {
        template.renderBody({ test: 'value' });
        template.renderSubject({ test: 'value' });
      } catch (error) {
        errors.push(`Template syntax error: ${error.message}`);
      }

      // Check for required variables
      if (template.validationRules.requiredVariables) {
        for (const variable of template.validationRules.requiredVariables) {
          if (!template.variables[variable]) {
            warnings.push(`Required variable '${variable}' is not defined in variables schema`);
          }
        }
      }

      // Validate email template if email channel is supported
      if (template.isEmailSupported && template.styling.email?.htmlTemplate) {
        if (!template.styling.email.htmlTemplate.includes('{{body}}')) {
          warnings.push('Email HTML template should include {{body}} placeholder');
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      this.logger.error(`Failed to validate template ${id}`, error);
      throw error;
    }
  }

  async createDefaultTemplates(): Promise<void> {
    const defaultTemplates = [
      {
        key: 'welcome_user',
        name: 'Welcome New User',
        description: 'Welcome message for newly registered users',
        channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
        subjectTemplate: 'Welcome to {{platformName}}, {{userName}}!',
        bodyTemplate: `Hello {{userName}},

Welcome to {{platformName}}! We're excited to have you join our community.

Here's what you can do next:
- Complete your profile
- Explore available courses
- Connect with other learners

If you have any questions, feel free to reach out to our support team.

Best regards,
The {{platformName}} Team`,
        variables: {
          userName: { type: 'string', required: true, description: 'User\'s name' },
          platformName: { type: 'string', required: true, description: 'Platform name' },
        },
        metadata: { category: 'user_management', priority: 'medium' },
      },
      {
        key: 'application_status_update',
        name: 'Job Application Status Update',
        description: 'Notification when job application status changes',
        channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP, NotificationChannel.PUSH],
        subjectTemplate: 'Your application for {{jobTitle}} has been {{status}}',
        bodyTemplate: `Hello {{candidateName}},

Your application for the position of {{jobTitle}} at {{companyName}} has been {{status}}.

{{#if status === 'accepted'}}
Congratulations! We'll be in touch soon with next steps.
{{/if}}

{{#if status === 'rejected'}}
Thank you for your interest. We encourage you to apply for other positions that match your skills.
{{/if}}

{{#if nextSteps}}
Next Steps: {{nextSteps}}
{{/if}}

Best regards,
{{recruiterName}}`,
        variables: {
          candidateName: { type: 'string', required: true, description: 'Candidate\'s name' },
          jobTitle: { type: 'string', required: true, description: 'Job title' },
          companyName: { type: 'string', required: true, description: 'Company name' },
          status: { type: 'string', required: true, description: 'Application status' },
          recruiterName: { type: 'string', required: true, description: 'Recruiter\'s name' },
          nextSteps: { type: 'string', required: false, description: 'Next steps information' },
        },
        metadata: { category: 'hr', priority: 'high' },
      },
      {
        key: 'interview_scheduled',
        name: 'Interview Scheduled',
        description: 'Notification when an interview is scheduled',
        channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP, NotificationChannel.SMS],
        subjectTemplate: 'Interview scheduled for {{jobTitle}} position',
        bodyTemplate: `Hello {{candidateName}},

Your interview for the {{jobTitle}} position has been scheduled.

Interview Details:
- Date: {{interviewDate}}
- Time: {{interviewTime}}
- Duration: {{duration}}
- Location: {{location}}
- Interviewer: {{interviewerName}}

{{#if meetingLink}}
Meeting Link: {{meetingLink}}
{{/if}}

Please confirm your attendance by replying to this message.

Best regards,
{{recruiterName}}`,
        variables: {
          candidateName: { type: 'string', required: true, description: 'Candidate\'s name' },
          jobTitle: { type: 'string', required: true, description: 'Job title' },
          interviewDate: { type: 'date', required: true, description: 'Interview date' },
          interviewTime: { type: 'string', required: true, description: 'Interview time' },
          duration: { type: 'string', required: true, description: 'Interview duration' },
          location: { type: 'string', required: true, description: 'Interview location' },
          interviewerName: { type: 'string', required: true, description: 'Interviewer\'s name' },
          recruiterName: { type: 'string', required: true, description: 'Recruiter\'s name' },
          meetingLink: { type: 'string', required: false, description: 'Video meeting link' },
        },
        metadata: { category: 'hr', priority: 'high' },
      },
    ];

    for (const templateData of defaultTemplates) {
      const existingTemplate = await this.templateRepository.findOne({
        where: { key: templateData.key },
      });

      if (!existingTemplate) {
        const template = this.templateRepository.create({
          ...templateData,
          metadata: {
            ...templateData.metadata,
            author: 'system',
            version: '1.0',
          },
          usageStats: {
            totalSent: 0,
            successRate: 0,
            errorRate: 0,
            popularChannels: {},
          },
          isActive: true,
        });

        await this.templateRepository.save(template);
        this.logger.log(`Created default template: ${templateData.key}`);
      }
    }
  }

  // Private helper methods
  private validateTemplateData(data: CreateTemplateDto): void {
    const errors: string[] = [];

    if (!data.key?.trim()) {
      errors.push('Template key is required');
    }

    if (!data.name?.trim()) {
      errors.push('Template name is required');
    }

    if (!data.bodyTemplate?.trim()) {
      errors.push('Body template is required');
    }

    if (!data.channels || data.channels.length === 0) {
      errors.push('At least one channel must be specified');
    }

    // Validate key format (alphanumeric and underscores only)
    if (data.key && !/^[a-zA-Z0-9_]+$/.test(data.key)) {
      errors.push('Template key can only contain letters, numbers, and underscores');
    }

    if (errors.length > 0) {
      throw new BadRequestException(`Template validation failed: ${errors.join(', ')}`);
    }
  }

  private generateMockUsageTrend(): Array<{ date: string; count: number }> {
    const trend = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      trend.push({
        date: date.toISOString().split('T')[0],
        count: Math.floor(Math.random() * 50) + 10,
      });
    }
    
    return trend;
  }
}
