import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ResumeTemplate, TemplateCategory } from '../../../database/entities/resume-template.entity';
import { User, UserRole } from '../../../database/entities/user.entity';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  SearchTemplatesDto,
  TemplateResponseDto,
  TemplateListResponseDto,
  CloneTemplateDto,
  TemplateStatsDto,
} from '../dto/template-management.dto';

@Injectable()
export class TemplateManagementService {
  private readonly logger = new Logger(TemplateManagementService.name);

  constructor(
    @InjectRepository(ResumeTemplate)
    private templateRepository: Repository<ResumeTemplate>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private dataSource: DataSource,
    private eventEmitter: EventEmitter2,
  ) {}

  async createTemplate(
    createDto: CreateTemplateDto,
    user: User,
  ): Promise<ResumeTemplate> {
    try {
      // Validate permissions
      if (user.roles === UserRole.STUDENT) {
        throw new ForbiddenException('Students cannot create templates');
      }

      // Validate template data
      const validationResult = this.validateTemplateData(createDto.templateData);
      if (!validationResult.isValid) {
        throw new BadRequestException(`Template validation failed: ${validationResult.errors.join(', ')}`);
      }

      const template = this.templateRepository.create({
        name: createDto.name,
        description: createDto.description,
        category: createDto.category,
        previewImageUrl: createDto.previewImageUrl,
        templateData: createDto.templateData,
        isPremium: createDto.isPremium || false,
        tags: createDto.tags || [],
        features: createDto.features || [],
        difficultyLevel: createDto.difficultyLevel || 'beginner',
        completionTime: createDto.completionTime,
        customizationOptions: {
          colors: createDto.customizationOptions?.colors ?? true,
          fonts: createDto.customizationOptions?.fonts ?? true,
          layout: createDto.customizationOptions?.layout ?? false,
          sections: createDto.customizationOptions?.sections ?? true,
          spacing: createDto.customizationOptions?.spacing ?? true,
        },
        createdBy: user.id,
      });

      // Calculate ATS score
      template.updateAtsScore();

      const savedTemplate = await this.templateRepository.save(template);

      // Emit event
      this.eventEmitter.emit('template.created', {
        template: savedTemplate,
        user,
      });

      this.logger.log(`Template created: ${savedTemplate.id} by user ${user.id}`);

      return savedTemplate;
    } catch (error) {
      this.logger.error('Failed to create template', error);
      throw error;
    }
  }

  async getTemplateById(id: string, user?: User): Promise<ResumeTemplate> {
    try {
      const template = await this.templateRepository.findOne({
        where: { id },
        relations: ['creator'],
      });

      if (!template) {
        throw new NotFoundException('Template not found');
      }

      // Check access permissions
      if (!template.isActive && template.createdBy !== user?.id && user?.roles !== UserRole.ADMIN) {
        throw new ForbiddenException('Template is not accessible');
      }

      // Increment view count for public access
      if (user && template.isActive) {
        template.incrementDownload(); // This will be used for analytics
        await this.templateRepository.save(template);
      }

      return template;
    } catch (error) {
      this.logger.error(`Failed to get template ${id}`, error);
      throw error;
    }
  }

  async searchTemplates(
    searchDto: SearchTemplatesDto,
    user?: User,
  ): Promise<TemplateListResponseDto> {
    try {
      const queryBuilder = this.templateRepository
        .createQueryBuilder('template')
        .leftJoinAndSelect('template.creator', 'creator')
        .where('template.isActive = :isActive', { isActive: true });

      // Apply filters
      if (searchDto.search) {
        queryBuilder.andWhere(
          '(template.name ILIKE :search OR template.description ILIKE :search OR template.tags && :searchArray)',
          { 
            search: `%${searchDto.search}%`,
            searchArray: [searchDto.search.toLowerCase()],
          }
        );
      }

      if (searchDto.category) {
        queryBuilder.andWhere('template.category = :category', { category: searchDto.category });
      }

      if (searchDto.isPremium !== undefined) {
        queryBuilder.andWhere('template.isPremium = :isPremium', { isPremium: searchDto.isPremium });
      }

      if (searchDto.difficultyLevel) {
        queryBuilder.andWhere('template.difficultyLevel = :difficulty', { difficulty: searchDto.difficultyLevel });
      }

      if (searchDto.tags && searchDto.tags.length > 0) {
        queryBuilder.andWhere('template.tags && :tags', { tags: searchDto.tags });
      }

      if (searchDto.features && searchDto.features.length > 0) {
        queryBuilder.andWhere('template.features && :features', { features: searchDto.features });
      }

      if (searchDto.minRating) {
        queryBuilder.andWhere('template.rating >= :minRating', { minRating: searchDto.minRating });
      }

      if (searchDto.maxCompletionTime) {
        queryBuilder.andWhere('template.completionTime <= :maxTime', { maxTime: searchDto.maxCompletionTime });
      }

      // Access control for non-public templates
      if (user?.roles === UserRole.ADMIN) {
        // Admins can see all templates
        queryBuilder.orWhere('template.createdBy = :userId', { userId: user.id });
      } else if (user) {
        // Users can see their own templates
        queryBuilder.orWhere('template.createdBy = :userId', { userId: user.id });
      }

      // Apply sorting
      const sortBy = searchDto.sortBy || 'createdAt';
      const sortOrder = searchDto.sortOrder || 'DESC';

      switch (sortBy) {
        case 'popularity':
          queryBuilder.orderBy('template.downloadCount', sortOrder);
          break;
        case 'rating':
          queryBuilder.orderBy('template.rating', sortOrder);
          break;
        case 'name':
          queryBuilder.orderBy('template.name', sortOrder);
          break;
        case 'newest':
          queryBuilder.orderBy('template.createdAt', 'DESC');
          break;
        case 'trending':
          queryBuilder.orderBy('template.updatedAt', 'DESC');
          break;
        default:
          queryBuilder.orderBy(`template.${sortBy}`, sortOrder);
      }

      // Apply pagination
      const page = searchDto.page || 1;
      const limit = searchDto.limit || 20;
      queryBuilder.skip((page - 1) * limit).take(limit);

      const [templates, total] = await queryBuilder.getManyAndCount();

      return new TemplateListResponseDto({
        items: templates,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      this.logger.error('Failed to search templates', error);
      throw error;
    }
  }

  async updateTemplate(
    id: string,
    updateDto: UpdateTemplateDto,
    user: User,
  ): Promise<ResumeTemplate> {
    try {
      const template = await this.getTemplateById(id, user);

      // Check permissions
      if (template.createdBy !== user.id && user.roles !== UserRole.ADMIN) {
        throw new ForbiddenException('Insufficient permissions to update template');
      }

      // Validate template data if provided
      if (updateDto.templateData) {
        const validationResult = this.validateTemplateData(updateDto.templateData);
        if (!validationResult.isValid) {
          throw new BadRequestException(`Template validation failed: ${validationResult.errors.join(', ')}`);
        }
      }

      // Update fields
      Object.assign(template, {
        ...updateDto,
        updatedAt: new Date(),
      });

      // Update customization options if provided
      if (updateDto.customizationOptions) {
        template.updateCustomizationOptions(updateDto.customizationOptions);
      }

      // Recalculate ATS score if template data changed
      if (updateDto.templateData) {
        template.updateAtsScore();
      }

      const updatedTemplate = await this.templateRepository.save(template);

      // Emit event
      this.eventEmitter.emit('template.updated', {
        template: updatedTemplate,
        user,
      });

      this.logger.log(`Template updated: ${id} by user ${user.id}`);

      return updatedTemplate;
    } catch (error) {
      this.logger.error(`Failed to update template ${id}`, error);
      throw error;
    }
  }

  async deleteTemplate(id: string, user: User): Promise<void> {
    try {
      const template = await this.getTemplateById(id, user);

      // Check permissions
      if (template.createdBy !== user.id && user.roles !== UserRole.ADMIN) {
        throw new ForbiddenException('Insufficient permissions to delete template');
      }

      // Soft delete by setting isActive to false
      template.isActive = false;
      await this.templateRepository.save(template);

      // Emit event
      this.eventEmitter.emit('template.deleted', {
        templateId: id,
        user,
      });

      this.logger.log(`Template deleted: ${id} by user ${user.id}`);
    } catch (error) {
      this.logger.error(`Failed to delete template ${id}`, error);
      throw error;
    }
  }

  async cloneTemplate(
    id: string,
    cloneDto: CloneTemplateDto,
    user: User,
  ): Promise<ResumeTemplate> {
    try {
      const originalTemplate = await this.getTemplateById(id, user);

      // Create cloned template
      const clonedData = originalTemplate.clone(cloneDto.name, user.id);
      const clonedTemplate = this.templateRepository.create(clonedData);

      // Apply any customizations from clone DTO
      if (cloneDto.description) {
        clonedTemplate.description = cloneDto.description;
      }
      if (cloneDto.category) {
        clonedTemplate.category = cloneDto.category;
      }
      if (cloneDto.tags) {
        clonedTemplate.tags = cloneDto.tags;
      }

      const savedTemplate = await this.templateRepository.save(clonedTemplate);

      // Emit event
      this.eventEmitter.emit('template.cloned', {
        originalTemplate,
        clonedTemplate: savedTemplate,
        user,
      });

      this.logger.log(`Template cloned: ${id} -> ${savedTemplate.id} by user ${user.id}`);

      return savedTemplate;
    } catch (error) {
      this.logger.error(`Failed to clone template ${id}`, error);
      throw error;
    }
  }

  async rateTemplate(
    id: string,
    rating: number,
    user: User,
  ): Promise<ResumeTemplate> {
    try {
      if (rating < 1 || rating > 5) {
        throw new BadRequestException('Rating must be between 1 and 5');
      }

      const template = await this.getTemplateById(id, user);

      // Add rating
      template.addRating(rating);
      const updatedTemplate = await this.templateRepository.save(template);

      // Emit event
      this.eventEmitter.emit('template.rated', {
        template: updatedTemplate,
        rating,
        user,
      });

      this.logger.log(`Template rated: ${id} with ${rating} stars by user ${user.id}`);

      return updatedTemplate;
    } catch (error) {
      this.logger.error(`Failed to rate template ${id}`, error);
      throw error;
    }
  }

  async getFeaturedTemplates(limit: number = 10): Promise<ResumeTemplate[]> {
    try {
      return await this.templateRepository.find({
        where: { isActive: true },
        order: { 
          downloadCount: 'DESC',
          rating: 'DESC',
        },
        take: limit,
        relations: ['creator'],
      });
    } catch (error) {
      this.logger.error('Failed to get featured templates', error);
      throw error;
    }
  }

  async getPopularTemplates(limit: number = 10): Promise<ResumeTemplate[]> {
    try {
      return await this.templateRepository
        .createQueryBuilder('template')
        .leftJoinAndSelect('template.creator', 'creator')
        .where('template.isActive = :isActive', { isActive: true })
        .andWhere('template.downloadCount > :minDownloads', { minDownloads: 50 })
        .orderBy('template.downloadCount', 'DESC')
        .addOrderBy('template.rating', 'DESC')
        .take(limit)
        .getMany();
    } catch (error) {
      this.logger.error('Failed to get popular templates', error);
      throw error;
    }
  }

  async getTrendingTemplates(limit: number = 10): Promise<ResumeTemplate[]> {
    try {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      return await this.templateRepository
        .createQueryBuilder('template')
        .leftJoinAndSelect('template.creator', 'creator')
        .where('template.isActive = :isActive', { isActive: true })
        .andWhere('template.updatedAt > :lastMonth', { lastMonth })
        .orderBy('template.updatedAt', 'DESC')
        .addOrderBy('template.downloadCount', 'DESC')
        .take(limit)
        .getMany();
    } catch (error) {
      this.logger.error('Failed to get trending templates', error);
      throw error;
    }
  }

  async getTemplatesByCategory(category: TemplateCategory, limit: number = 20): Promise<ResumeTemplate[]> {
    try {
      return await this.templateRepository.find({
        where: { 
          category,
          isActive: true,
        },
        order: { 
          rating: 'DESC',
          downloadCount: 'DESC',
        },
        take: limit,
        relations: ['creator'],
      });
    } catch (error) {
      this.logger.error(`Failed to get templates by category ${category}`, error);
      throw error;
    }
  }

  async getTemplateStats(id: string, user: User): Promise<TemplateStatsDto> {
    try {
      const template = await this.getTemplateById(id, user);

      // Check permissions for detailed stats
      if (template.createdBy !== user.id && user.roles !== UserRole.ADMIN) {
        throw new ForbiddenException('Insufficient permissions to view template stats');
      }

      // Calculate usage stats (this would typically come from actual usage data)
      const stats = {
        totalDownloads: template.downloadCount,
        totalRatings: template.ratingCount,
        averageRating: template.rating,
        atsScore: template.atsScore,
        popularityRank: await this.calculatePopularityRank(template),
        categoryRank: await this.calculateCategoryRank(template),
        recentDownloads: await this.getRecentDownloads(template.id),
        userFeedback: await this.getUserFeedback(template.id),
        conversionRate: await this.calculateConversionRate(template.id),
      };

      return new TemplateStatsDto(stats);
    } catch (error) {
      this.logger.error(`Failed to get template stats for ${id}`, error);
      throw error;
    }
  }

  // Private helper methods
  private validateTemplateData(templateData: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate layout
    if (!templateData.layout) {
      errors.push('Template layout is required');
    } else {
      if (!templateData.layout.type) {
        errors.push('Layout type is required');
      }
      if (!templateData.layout.sections || templateData.layout.sections.length === 0) {
        errors.push('At least one section is required');
      }
    }

    // Validate styles
    if (!templateData.styles) {
      errors.push('Template styles are required');
    } else {
      if (!templateData.styles.fonts?.primary) {
        errors.push('Primary font is required');
      }
      if (!templateData.styles.colors?.primary) {
        errors.push('Primary color is required');
      }
    }

    // Validate components
    if (!templateData.components) {
      errors.push('Template components are required');
    }

    // Validate metadata
    if (!templateData.metadata?.version) {
      errors.push('Template version is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private async calculatePopularityRank(template: ResumeTemplate): Promise<number> {
    const count = await this.templateRepository
      .createQueryBuilder('template')
      .where('template.isActive = :isActive', { isActive: true })
      .andWhere('template.downloadCount > :downloads', { downloads: template.downloadCount })
      .getCount();
    
    return count + 1;
  }

  private async calculateCategoryRank(template: ResumeTemplate): Promise<number> {
    if (!template.category) return 0;

    const count = await this.templateRepository
      .createQueryBuilder('template')
      .where('template.isActive = :isActive', { isActive: true })
      .andWhere('template.category = :category', { category: template.category })
      .andWhere('template.downloadCount > :downloads', { downloads: template.downloadCount })
      .getCount();
    
    return count + 1;
  }

  private async getRecentDownloads(templateId: string): Promise<number> {
    // This would typically query a separate downloads/usage table
    // For now, return a mock value
    return Math.floor(Math.random() * 50);
  }

  private async getUserFeedback(templateId: string): Promise<any[]> {
    // This would typically query a feedback/reviews table
    // For now, return mock data
    return [
      {
        rating: 5,
        comment: 'Great template, very professional!',
        date: new Date(),
      },
      {
        rating: 4,
        comment: 'Easy to customize and looks good.',
        date: new Date(),
      },
    ];
  }

  private async calculateConversionRate(templateId: string): Promise<number> {
    // This would calculate the rate of template views to actual usage
    // For now, return a mock value
    return Math.random() * 100;
  }
}
