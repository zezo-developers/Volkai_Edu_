import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UserResume, ResumeVisibility } from '../../../database/entities/user-resume.entity';
import { ResumeSection, SectionType } from '../../../database/entities/resume-section.entity';
import { ResumeTemplate } from '../../../database/entities/resume-template.entity';
import { User, UserRole } from '../../../database/entities/user.entity';
import {
  CreateResumeDto,
  UpdateResumeDto,
  SearchResumesDto,
  ResumeResponseDto,
  ResumeListResponseDto,
  UpdateSectionDto,
  ReorderSectionsDto,
  ShareResumeDto,
  ResumeAnalyticsDto,
} from '../dto/resume-builder.dto';

@Injectable()
export class ResumeBuilderService {
  private readonly logger = new Logger(ResumeBuilderService.name);

  constructor(
    @InjectRepository(UserResume)
    private resumeRepository: Repository<UserResume>,
    @InjectRepository(ResumeSection)
    private sectionRepository: Repository<ResumeSection>,
    @InjectRepository(ResumeTemplate)
    private templateRepository: Repository<ResumeTemplate>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private dataSource: DataSource,
    private eventEmitter: EventEmitter2,
  ) {}

  async createResume(
    createDto: CreateResumeDto,
    user: User,
  ): Promise<UserResume> {
    try {
      // Validate template if provided
      let template: ResumeTemplate | undefined;
      if (createDto.templateId) {
        template = await this.templateRepository.findOne({
          where: { id: createDto.templateId, isActive: true },
        });
        if (!template) {
          throw new NotFoundException('Template not found');
        }
      }

      // If this is set as primary, unset other primary resumes
      if (createDto.isPrimary) {
        await this.resumeRepository.update(
          { userId: user.id, isPrimary: true },
          { isPrimary: false }
        );
      }

      // Create resume with default data structure
      const resume = this.resumeRepository.create({
        userId: user.id,
        templateId: createDto.templateId,
        title: createDto.title,
        isPrimary: createDto.isPrimary || false,
        visibility: createDto.visibility || ResumeVisibility.PRIVATE,
        data: createDto.data || this.getDefaultResumeData(user),
        customization: createDto.customization || {},
        metadata: {
          version: '1.0.0',
          autoSaveEnabled: true,
          completionPercentage: 0,
        },
      });

      // Calculate initial completion percentage
      resume.updateCompletionPercentage();
      resume.updateAtsScore();

      const savedResume = await this.resumeRepository.save(resume);

      // Create default sections if using a template
      if (template) {
        await this.createDefaultSections(savedResume, template);
      } else {
        await this.createBasicSections(savedResume);
      }

      // Increment template download count
      if (template) {
        template.incrementDownload();
        await this.templateRepository.save(template);
      }

      // Emit event
      this.eventEmitter.emit('resume.created', {
        resume: savedResume,
        template,
        user,
      });

      this.logger.log(`Resume created: ${savedResume.id} by user ${user.id}`);

      return savedResume;
    } catch (error) {
      this.logger.error('Failed to create resume', error);
      throw error;
    }
  }

  async getResumeById(id: string, user: User): Promise<UserResume> {
    try {
      const resume = await this.resumeRepository.findOne({
        where: { id },
        relations: ['user', 'template', 'sections'],
      });

      if (!resume) {
        throw new NotFoundException('Resume not found');
      }

      // Check access permissions
      await this.validateResumeAccess(resume, user);

      // Increment view count if not the owner
      if (resume.userId !== user.id) {
        resume.incrementView();
        await this.resumeRepository.save(resume);
      }

      return resume;
    } catch (error) {
      this.logger.error(`Failed to get resume ${id}`, error);
      throw error;
    }
  }

  async getResumeByShareToken(shareToken: string): Promise<UserResume> {
    try {
      const resume = await this.resumeRepository.findOne({
        where: { shareToken },
        relations: ['user', 'template', 'sections'],
      });

      if (!resume) {
        throw new NotFoundException('Resume not found');
      }

      if (!resume.isShareLinkValid) {
        throw new ForbiddenException('Share link has expired or is invalid');
      }

      // Increment view count
      resume.incrementView();
      await this.resumeRepository.save(resume);

      return resume;
    } catch (error) {
      this.logger.error(`Failed to get resume by share token ${shareToken}`, error);
      throw error;
    }
  }

  async searchResumes(
    searchDto: SearchResumesDto,
    user: User,
  ): Promise<ResumeListResponseDto> {
    try {
      const queryBuilder = this.resumeRepository
        .createQueryBuilder('resume')
        .leftJoinAndSelect('resume.user', 'user')
        .leftJoinAndSelect('resume.template', 'template');

      // Apply access control
      if (user.roles === UserRole.ADMIN) {
        // Admins can see all resumes
      } else {
        queryBuilder.where(
          '(resume.userId = :userId OR resume.visibility = :publicVisibility)',
          { 
            userId: user.id,
            publicVisibility: ResumeVisibility.PUBLIC,
          }
        );

        // Add organization visibility if user has organization
        if (user.organizationId) {
          queryBuilder.orWhere(
            '(resume.visibility = :orgVisibility AND user.organizationId = :orgId)',
            {
              orgVisibility: ResumeVisibility.ORG_ONLY,
              orgId: user.organizationId,
            }
          );
        }
      }

      // Apply filters
      if (searchDto.search) {
        queryBuilder.andWhere(
          '(resume.title ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search)',
          { search: `%${searchDto.search}%` }
        );
      }

      if (searchDto.userId) {
        queryBuilder.andWhere('resume.userId = :userId', { userId: searchDto.userId });
      }

      if (searchDto.templateId) {
        queryBuilder.andWhere('resume.templateId = :templateId', { templateId: searchDto.templateId });
      }

      if (searchDto.visibility) {
        queryBuilder.andWhere('resume.visibility = :visibility', { visibility: searchDto.visibility });
      }

      if (searchDto.isPrimary !== undefined) {
        queryBuilder.andWhere('resume.isPrimary = :isPrimary', { isPrimary: searchDto.isPrimary });
      }

      // Apply sorting
      const sortBy = searchDto.sortBy || 'updatedAt';
      const sortOrder = searchDto.sortOrder || 'DESC';
      queryBuilder.orderBy(`resume.${sortBy}`, sortOrder);

      // Apply pagination
      const page = searchDto.page || 1;
      const limit = searchDto.limit || 20;
      queryBuilder.skip((page - 1) * limit).take(limit);

      const [resumes, total] = await queryBuilder.getManyAndCount();

      return new ResumeListResponseDto({
        items: resumes,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      this.logger.error('Failed to search resumes', error);
      throw error;
    }
  }

  async updateResume(
    id: string,
    updateDto: UpdateResumeDto,
    user: User,
  ): Promise<UserResume> {
    try {
      const resume = await this.getResumeById(id, user);

      // Check permissions
      if (resume.userId !== user.id && user.roles !== UserRole.ADMIN) {
        throw new ForbiddenException('Insufficient permissions to update resume');
      }

      // If setting as primary, unset other primary resumes
      if (updateDto.isPrimary && !resume.isPrimary) {
        await this.resumeRepository.update(
          { userId: resume.userId, isPrimary: true },
          { isPrimary: false }
        );
      }

      // Update fields
      Object.assign(resume, {
        ...updateDto,
        updatedAt: new Date(),
      });

      // Update metadata
      if (updateDto.metadata) {
        resume.updateMetadata(updateDto.metadata);
      }

      // Update customization
      if (updateDto.customization) {
        resume.updateCustomization(updateDto.customization);
      }

      // Recalculate completion and ATS scores if data changed
      if (updateDto.data) {
        resume.updateCompletionPercentage();
        resume.updateAtsScore();
      }

      const updatedResume = await this.resumeRepository.save(resume);

      // Emit event for auto-save
      this.eventEmitter.emit('resume.updated', {
        resume: updatedResume,
        user,
        isAutoSave: updateDto.isAutoSave || false,
      });

      this.logger.log(`Resume updated: ${id} by user ${user.id}`);

      return updatedResume;
    } catch (error) {
      this.logger.error(`Failed to update resume ${id}`, error);
      throw error;
    }
  }

  async deleteResume(id: string, user: User): Promise<void> {
    try {
      const resume = await this.getResumeById(id, user);

      // Check permissions
      if (resume.userId !== user.id && user.roles !== UserRole.ADMIN) {
        throw new ForbiddenException('Insufficient permissions to delete resume');
      }

      // Don't allow deletion of primary resume if user has other resumes
      if (resume.isPrimary) {
        const otherResumes = await this.resumeRepository.count({
          where: { userId: resume.userId, id: { $ne: id } as any },
        });
        
        if (otherResumes > 0) {
          throw new BadRequestException('Cannot delete primary resume. Set another resume as primary first.');
        }
      }

      await this.resumeRepository.remove(resume);

      // Emit event
      this.eventEmitter.emit('resume.deleted', {
        resumeId: id,
        user,
      });

      this.logger.log(`Resume deleted: ${id} by user ${user.id}`);
    } catch (error) {
      this.logger.error(`Failed to delete resume ${id}`, error);
      throw error;
    }
  }

  async cloneResume(
    id: string,
    newTitle: string,
    user: User,
  ): Promise<UserResume> {
    try {
      const originalResume = await this.getResumeById(id, user);

      // Create cloned resume
      const clonedData = originalResume.clone(newTitle);
      const clonedResume = this.resumeRepository.create(clonedData);

      const savedResume = await this.resumeRepository.save(clonedResume);

      // Clone sections
      if (originalResume.sections && originalResume.sections.length > 0) {
        const clonedSections = originalResume.sections.map(section => {
          const sectionData = section.clone();
          return this.sectionRepository.create({
            ...sectionData,
            resumeId: savedResume.id,
          });
        });

        await this.sectionRepository.save(clonedSections);
      }

      // Emit event
      this.eventEmitter.emit('resume.cloned', {
        originalResume,
        clonedResume: savedResume,
        user,
      });

      this.logger.log(`Resume cloned: ${id} -> ${savedResume.id} by user ${user.id}`);

      return savedResume;
    } catch (error) {
      this.logger.error(`Failed to clone resume ${id}`, error);
      throw error;
    }
  }

  async shareResume(
    id: string,
    shareDto: ShareResumeDto,
    user: User,
  ): Promise<{ shareToken: string; shareUrl: string }> {
    try {
      const resume = await this.getResumeById(id, user);

      // Check permissions
      if (resume.userId !== user.id) {
        throw new ForbiddenException('Only resume owner can share resume');
      }

      // Generate share token
      const shareToken = resume.generateShareToken(shareDto.expiryDays);
      
      // Update visibility if needed
      if (shareDto.visibility) {
        resume.visibility = shareDto.visibility;
      }

      await this.resumeRepository.save(resume);

      const shareUrl = `${process.env.FRONTEND_URL}/resume/shared/${shareToken}`;

      // Emit event
      this.eventEmitter.emit('resume.shared', {
        resume,
        shareToken,
        shareUrl,
        user,
      });

      this.logger.log(`Resume shared: ${id} by user ${user.id}`);

      return { shareToken, shareUrl };
    } catch (error) {
      this.logger.error(`Failed to share resume ${id}`, error);
      throw error;
    }
  }

  async revokeShare(id: string, user: User): Promise<void> {
    try {
      const resume = await this.getResumeById(id, user);

      // Check permissions
      if (resume.userId !== user.id) {
        throw new ForbiddenException('Only resume owner can revoke share');
      }

      resume.revokeShareToken();
      await this.resumeRepository.save(resume);

      // Emit event
      this.eventEmitter.emit('resume.share.revoked', {
        resume,
        user,
      });

      this.logger.log(`Resume share revoked: ${id} by user ${user.id}`);
    } catch (error) {
      this.logger.error(`Failed to revoke share for resume ${id}`, error);
      throw error;
    }
  }

  async updateSection(
    resumeId: string,
    sectionId: string,
    updateDto: UpdateSectionDto,
    user: User,
  ): Promise<ResumeSection> {
    try {
      const resume = await this.getResumeById(resumeId, user);

      // Check permissions
      if (resume.userId !== user.id) {
        throw new ForbiddenException('Insufficient permissions to update section');
      }

      const section = await this.sectionRepository.findOne({
        where: { id: sectionId, resumeId },
      });

      if (!section) {
        throw new NotFoundException('Section not found');
      }

      // Update section
      Object.assign(section, updateDto);

      const updatedSection = await this.sectionRepository.save(section);

      // Update resume completion percentage
      resume.updateCompletionPercentage();
      await this.resumeRepository.save(resume);

      // Emit event
      this.eventEmitter.emit('resume.section.updated', {
        resume,
        section: updatedSection,
        user,
      });

      return updatedSection;
    } catch (error) {
      this.logger.error(`Failed to update section ${sectionId}`, error);
      throw error;
    }
  }

  async reorderSections(
    resumeId: string,
    reorderDto: ReorderSectionsDto,
    user: User,
  ): Promise<ResumeSection[]> {
    try {
      const resume = await this.getResumeById(resumeId, user);

      // Check permissions
      if (resume.userId !== user.id) {
        throw new ForbiddenException('Insufficient permissions to reorder sections');
      }

      // Update section orders
      await this.dataSource.transaction(async manager => {
        for (let i = 0; i < reorderDto.sectionIds.length; i++) {
          await manager.update(ResumeSection, 
            { id: reorderDto.sectionIds[i], resumeId },
            { orderIndex: i }
          );
        }
      });

      // Get updated sections
      const updatedSections = await this.sectionRepository.find({
        where: { resumeId },
        order: { orderIndex: 'ASC' },
      });

      // Emit event
      this.eventEmitter.emit('resume.sections.reordered', {
        resume,
        sections: updatedSections,
        user,
      });

      return updatedSections;
    } catch (error) {
      this.logger.error(`Failed to reorder sections for resume ${resumeId}`, error);
      throw error;
    }
  }

  async getResumeAnalytics(
    id: string,
    user: User,
  ): Promise<ResumeAnalyticsDto> {
    try {
      const resume = await this.getResumeById(id, user);

      // Check permissions
      if (resume.userId !== user.id && user.roles !== UserRole.ADMIN) {
        throw new ForbiddenException('Insufficient permissions to view analytics');
      }

      const analytics = {
        viewCount: resume.viewCount,
        downloadCount: resume.downloadCount,
        shareCount: resume.shareCount,
        completionPercentage: resume.completionPercentage,
        atsScore: resume.estimatedAtsScore,
        analytics: resume.analytics,
        lastUpdated: resume.updatedAt,
        recommendations: this.generateRecommendations(resume),
      };

      return new ResumeAnalyticsDto(analytics);
    } catch (error) {
      this.logger.error(`Failed to get analytics for resume ${id}`, error);
      throw error;
    }
  }

  // Auto-save functionality
  @Cron(CronExpression.EVERY_30_SECONDS)
  async autoSaveResumes(): Promise<void> {
    try {
      // This would typically handle pending auto-save operations
      // For now, just log that auto-save is running
      this.logger.debug('Auto-save check completed');
    } catch (error) {
      this.logger.error('Auto-save failed', error);
    }
  }

  // Private helper methods
  private async validateResumeAccess(resume: any, user: User): Promise<void> {
    const isOwner = resume.userId === user.id;
    const isAdmin = user.roles === UserRole.ADMIN;
    const isPublic = resume.visibility === ResumeVisibility.PUBLIC;
    const isOrgVisible = resume.visibility === ResumeVisibility.ORG_ONLY && 
                        resume.user?.organizationId === user.organizationId;

    if (!isOwner && !isAdmin && !isPublic && !isOrgVisible) {
      throw new ForbiddenException('Access denied to this resume');
    }
  }

  private getDefaultResumeData(user: User): UserResume['data'] {
    return {
      personalInfo: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone || '',
      },
      experience: [],
      education: [],
      skills: [],
      projects: [],
      certifications: [],
      languages: [],
      references: [],
    };
  }

  private async createDefaultSections(resume: UserResume, template: ResumeTemplate): Promise<void> {
    const defaultSections = template.templateData.layout.sections.map((section, index) => ({
      resumeId: resume.id,
      type: section.type as SectionType,
      title: section.id,
      content: ResumeSection.getDefaultContent(section.type as SectionType),
      orderIndex: index,
      isVisible: true,
      styling: ResumeSection.getDefaultStyling(),
      config: ResumeSection.getDefaultConfig(section.type as SectionType),
    }));

    const sections = this.sectionRepository.create(defaultSections);
    await this.sectionRepository.save(sections);
  }

  private async createBasicSections(resume: UserResume): Promise<void> {
    const basicSectionTypes = [
      SectionType.PERSONAL_INFO,
      SectionType.SUMMARY,
      SectionType.EXPERIENCE,
      SectionType.EDUCATION,
      SectionType.SKILLS,
    ];

    const sections = basicSectionTypes.map((type, index) => ({
      resumeId: resume.id,
      type,
      content: ResumeSection.getDefaultContent(type),
      orderIndex: index,
      isVisible: true,
      styling: ResumeSection.getDefaultStyling(),
      config: ResumeSection.getDefaultConfig(type),
    }));

    const createdSections = this.sectionRepository.create(sections);
    await this.sectionRepository.save(createdSections);
  }

  private generateRecommendations(resume: UserResume): string[] {
    const recommendations: string[] = [];

    if (resume.completionPercentage < 80) {
      recommendations.push('Complete missing sections to improve your resume');
    }

    if (resume.estimatedAtsScore < 70) {
      recommendations.push('Improve ATS compatibility by adding more keywords');
    }

    if (!resume.data.summary || resume.data.summary.length < 50) {
      recommendations.push('Add a professional summary to make a strong first impression');
    }

    if (resume.data.skills.length < 5) {
      recommendations.push('Add more relevant skills to showcase your expertise');
    }

    if (resume.data.experience.length === 0) {
      recommendations.push('Add work experience to demonstrate your professional background');
    }

    return recommendations;
  }
}
