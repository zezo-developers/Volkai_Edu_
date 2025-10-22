import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SkillCategory } from '../../../database/entities/skill-category.entity';
import { Skill } from '../../../database/entities/skill.entity';
import { UserSkill, SkillProficiency } from '../../../database/entities/user-skill.entity';
import { User, UserRole } from '../../../database/entities/user.entity';
import { UserResume } from '../../../database/entities/user-resume.entity';
import {
  CreateSkillDto,
  UpdateSkillDto,
  CreateUserSkillDto,
  UpdateUserSkillDto,
  SearchSkillsDto,
  SkillResponseDto,
  SkillListResponseDto,
  UserSkillResponseDto,
  UserSkillListResponseDto,
  SkillRecommendationDto,
  SkillVerificationDto,
  EndorseSkillDto,
} from '../dto/skills-integration.dto';

@Injectable()
export class SkillsIntegrationService {
  private readonly logger = new Logger(SkillsIntegrationService.name);

  constructor(
    @InjectRepository(SkillCategory)
    private skillCategoryRepository: Repository<SkillCategory>,
    @InjectRepository(Skill)
    private skillRepository: Repository<Skill>,
    @InjectRepository(UserSkill)
    private userSkillRepository: Repository<UserSkill>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserResume)
    private resumeRepository: Repository<UserResume>,
    private dataSource: DataSource,
    private eventEmitter: EventEmitter2,
  ) {}

  // Skill Category Management
  async getSkillCategories(): Promise<SkillCategory[]> {
    try {
      return await this.skillCategoryRepository.find({
        where: { isActive: true },
        order: { displayOrder: 'ASC', name: 'ASC' },
        relations: ['skills'],
      });
    } catch (error) {
      this.logger.error('Failed to get skill categories', error);
      throw error;
    }
  }

  async createSkillCategory(
    name: string,
    description?: string,
    user?: User,
  ): Promise<SkillCategory> {
    try {
      // Check permissions
      if (user && user.roles === UserRole.STUDENT) {
        throw new ForbiddenException('Students cannot create skill categories');
      }

      const category = this.skillCategoryRepository.create({
        name,
        description,
        displayOrder: await this.getNextCategoryOrder(),
      });

      const savedCategory = await this.skillCategoryRepository.save(category);

      this.logger.log(`Skill category created: ${savedCategory.id}`);
      return savedCategory;
    } catch (error) {
      this.logger.error('Failed to create skill category', error);
      throw error;
    }
  }

  // Skill Management
  async createSkill(createDto: CreateSkillDto, user?: User): Promise<Skill> {
    try {
      // Check if skill already exists
      const existingSkill = await this.skillRepository.findOne({
        where: { name: createDto.name },
      });

      if (existingSkill) {
        throw new BadRequestException('Skill already exists');
      }

      // Validate category if provided
      if (createDto.categoryId) {
        const category = await this.skillCategoryRepository.findOne({
          where: { id: createDto.categoryId },
        });
        if (!category) {
          throw new NotFoundException('Skill category not found');
        }
      }

      const skill = this.skillRepository.create({
        name: createDto.name,
        categoryId: createDto.categoryId,
        description: createDto.description,
        aliases: createDto.aliases || [],
        tags: createDto.tags || [],
        metadata: createDto.metadata || {},
      });

      const savedSkill = await this.skillRepository.save(skill);

      // Emit event
      this.eventEmitter.emit('skill.created', {
        skill: savedSkill,
        user,
      });

      this.logger.log(`Skill created: ${savedSkill.id}`);
      return savedSkill;
    } catch (error) {
      this.logger.error('Failed to create skill', error);
      throw error;
    }
  }

  async searchSkills(searchDto: SearchSkillsDto): Promise<SkillListResponseDto> {
    try {
      const queryBuilder = this.skillRepository
        .createQueryBuilder('skill')
        .leftJoinAndSelect('skill.category', 'category')
        .where('skill.isActive = :isActive', { isActive: true });

      // Apply search filter
      if (searchDto.search) {
        queryBuilder.andWhere(
          '(skill.name ILIKE :search OR skill.aliases && :searchArray OR skill.tags && :searchArray OR skill.description ILIKE :search)',
          { 
            search: `%${searchDto.search}%`,
            searchArray: [searchDto.search.toLowerCase()],
          }
        );
      }

      // Apply category filter
      if (searchDto.categoryId) {
        queryBuilder.andWhere('skill.categoryId = :categoryId', { categoryId: searchDto.categoryId });
      }

      // Apply verified filter
      if (searchDto.isVerified !== undefined) {
        queryBuilder.andWhere('skill.isVerified = :isVerified', { isVerified: searchDto.isVerified });
      }

      // Apply sorting
      const sortBy = searchDto.sortBy || 'popularityScore';
      const sortOrder = searchDto.sortOrder || 'DESC';

      switch (sortBy) {
        case 'relevance':
          if (searchDto.search) {
            // Sort by relevance score when searching
            queryBuilder.addSelect(
              `(
                CASE 
                  WHEN skill.name ILIKE :exactSearch THEN 100
                  WHEN skill.name ILIKE :startSearch THEN 80
                  WHEN skill.name ILIKE :search THEN 60
                  WHEN skill.aliases && :searchArray THEN 40
                  WHEN skill.tags && :searchArray THEN 30
                  ELSE 20
                END + skill.popularityScore * 0.1
              )`,
              'relevanceScore'
            );
            queryBuilder.setParameters({
              exactSearch: searchDto.search,
              startSearch: `${searchDto.search}%`,
            });
            queryBuilder.orderBy('relevanceScore', 'DESC');
          } else {
            queryBuilder.orderBy('skill.popularityScore', 'DESC');
          }
          break;
        case 'popularity':
          queryBuilder.orderBy('skill.popularityScore', sortOrder);
          break;
        case 'trending':
          queryBuilder.orderBy('skill.trendingScore', sortOrder);
          break;
        case 'alphabetical':
          queryBuilder.orderBy('skill.name', sortOrder);
          break;
        default:
          queryBuilder.orderBy(`skill.${sortBy}`, sortOrder);
      }

      // Apply pagination
      const page = searchDto.page || 1;
      const limit = searchDto.limit || 50;
      queryBuilder.skip((page - 1) * limit).take(limit);

      const [skills, total] = await queryBuilder.getManyAndCount();

      return new SkillListResponseDto({
        items: skills,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      this.logger.error('Failed to search skills', error);
      throw error;
    }
  }

  async getSkillAnalytics(organizationId?: string, user?: User): Promise<any> {
    try {
      return ''
    } catch (error) {
      this.logger.error('Failed to get skill analytics', error);
      throw error;
    }
  }

  async getSkillById(id: string): Promise<Skill> {
    try {
      const skill = await this.skillRepository.findOne({
        where: { id },
        relations: ['category', 'userSkills'],
      });

      if (!skill) {
        throw new NotFoundException('Skill not found');
      }

      return skill;
    } catch (error) {
      this.logger.error(`Failed to get skill ${id}`, error);
      throw error;
    }
  }

  async updateSkill(
    id: string,
    updateDto: UpdateSkillDto,
    user: User,
  ): Promise<Skill> {
    try {
      // Check permissions
      if (user.roles === UserRole.STUDENT) {
        throw new ForbiddenException('Students cannot update skills');
      }

      const skill = await this.getSkillById(id);

      // Update fields
      Object.assign(skill, updateDto);

      const updatedSkill = await this.skillRepository.save(skill);

      // Emit event
      this.eventEmitter.emit('skill.updated', {
        skill: updatedSkill,
        user,
      });

      this.logger.log(`Skill updated: ${id} by user ${user.id}`);
      return updatedSkill;
    } catch (error) {
      this.logger.error(`Failed to update skill ${id}`, error);
      throw error;
    }
  }

  // User Skill Management
  async addUserSkill(
    createDto: CreateUserSkillDto,
    user: User,
  ): Promise<UserSkill> {
    try {
      // Check if user already has this skill
      const existingUserSkill = await this.userSkillRepository.findOne({
        where: { 
          userId: createDto.userId || user.id,
          skillId: createDto.skillId,
        },
      });

      if (existingUserSkill) {
        throw new BadRequestException('User already has this skill');
      }

      // Validate skill exists
      const skill = await this.getSkillById(createDto.skillId);

      // Check permissions
      if (createDto.userId && createDto.userId !== user.id && user.roles !== UserRole.ADMIN) {
        throw new ForbiddenException('Cannot add skill for another user');
      }

      const userSkill = this.userSkillRepository.create({
        userId: createDto.userId || user.id,
        skillId: createDto.skillId,
        proficiencyLevel: createDto.proficiencyLevel || SkillProficiency.BEGINNER,
        yearsExperience: createDto.yearsExperience,
        confidenceLevel: createDto.confidenceLevel,
        acquisitionMethod: createDto.acquisitionMethod,
        tags: createDto.tags || [],
        notes: createDto.notes,
        isFeatured: createDto.isFeatured || false,
      });

      const savedUserSkill = await this.userSkillRepository.save(userSkill);

      // Update skill user count
      skill.incrementUserCount();
      await this.skillRepository.save(skill);

      // Sync with user resumes
      await this.syncSkillWithResumes(savedUserSkill);

      // Emit event
      this.eventEmitter.emit('user.skill.added', {
        userSkill: savedUserSkill,
        skill,
        user,
      });

      this.logger.log(`User skill added: ${savedUserSkill.id} for user ${user.id}`);
      return savedUserSkill;
    } catch (error) {
      this.logger.error('Failed to add user skill', error);
      throw error;
    }
  }

  async getUserSkills(
    userId: string,
    user: User,
    featured?: boolean,
  ): Promise<UserSkillListResponseDto> {
    try {
      // Check permissions
      if (userId !== user.id && user.roles !== UserRole.ADMIN) {
        throw new ForbiddenException('Cannot access other user skills');
      }

      const queryBuilder = this.userSkillRepository
        .createQueryBuilder('userSkill')
        .leftJoinAndSelect('userSkill.skill', 'skill')
        .leftJoinAndSelect('skill.category', 'category')
        .where('userSkill.userId = :userId', { userId });

      if (featured !== undefined) {
        queryBuilder.andWhere('userSkill.isFeatured = :featured', { featured });
      }

      queryBuilder.orderBy('userSkill.isFeatured', 'DESC')
                  .addOrderBy('userSkill.proficiencyLevel', 'DESC')
                  .addOrderBy('skill.name', 'ASC');

      const userSkills = await queryBuilder.getMany();

      return new UserSkillListResponseDto({
        items: userSkills,
        total: userSkills.length,
        page: 1,
        limit: userSkills.length,
        totalPages: 1,
      });
    } catch (error) {
      this.logger.error(`Failed to get user skills for ${userId}`, error);
      throw error;
    }
  }

  async updateUserSkill(
    id: string,
    updateDto: any,
    user: User,
  ): Promise<UserSkill> {
    try {
      const userSkill = await this.userSkillRepository.findOne({
        where: { id },
        relations: ['skill', 'user'],
      });

      if (!userSkill) {
        throw new NotFoundException('User skill not found');
      }

      // Check permissions
      if (userSkill.userId !== user.id && user.roles !== UserRole.ADMIN) {
        throw new ForbiddenException('Cannot update other user skills');
      }

      // Update fields
      Object.assign(userSkill, updateDto);

      const updatedUserSkill = await this.userSkillRepository.save(userSkill);

      // Sync with user resumes
      await this.syncSkillWithResumes(updatedUserSkill);

      // Emit event
      this.eventEmitter.emit('user.skill.updated', {
        userSkill: updatedUserSkill,
        user,
      });

      this.logger.log(`User skill updated: ${id} by user ${user.id}`);
      return updatedUserSkill;
    } catch (error) {
      this.logger.error(`Failed to update user skill ${id}`, error);
      throw error;
    }
  }

  async removeUserSkill(id: string, user: User): Promise<void> {
    try {
      const userSkill = await this.userSkillRepository.findOne({
        where: { id },
        relations: ['skill'],
      });

      if (!userSkill) {
        throw new NotFoundException('User skill not found');
      }

      // Check permissions
      if (userSkill.userId !== user.id && user.roles !== UserRole.ADMIN) {
        throw new ForbiddenException('Cannot remove other user skills');
      }

      await this.userSkillRepository.remove(userSkill);

      // Update skill user count
      userSkill.skill.decrementUserCount();
      await this.skillRepository.save(userSkill.skill);

      // Remove from user resumes
      await this.removeSkillFromResumes(userSkill);

      // Emit event
      this.eventEmitter.emit('user.skill.removed', {
        userSkillId: id,
        skill: userSkill.skill,
        user,
      });

      this.logger.log(`User skill removed: ${id} by user ${user.id}`);
    } catch (error) {
      this.logger.error(`Failed to remove user skill ${id}`, error);
      throw error;
    }
  }

  // Skill Verification
  async verifyUserSkill(
    id: string,
    verificationDto: SkillVerificationDto,
    user: User,
  ): Promise<UserSkill> {
    try {
      const userSkill = await this.userSkillRepository.findOne({
        where: { id },
        relations: ['skill', 'user'],
      });

      if (!userSkill) {
        throw new NotFoundException('User skill not found');
      }

      // Check permissions (instructors can verify skills)
      if (user.roles !== UserRole.INSTRUCTOR && user.roles !== UserRole.ADMIN) {
        throw new ForbiddenException('Insufficient permissions to verify skills');
      }

      // Verify the skill
      userSkill.verify(user.id, verificationDto.verificationData);

      const verifiedUserSkill = await this.userSkillRepository.save(userSkill);

      // Emit event
      this.eventEmitter.emit('user.skill.verified', {
        userSkill: verifiedUserSkill,
        verifier: user,
      });

      this.logger.log(`User skill verified: ${id} by user ${user.id}`);
      return verifiedUserSkill;
    } catch (error) {
      this.logger.error(`Failed to verify user skill ${id}`, error);
      throw error;
    }
  }

  // Skill Endorsements
  async endorseUserSkill(
    id: string,
    endorseDto: EndorseSkillDto,
    user: User,
  ): Promise<UserSkill> {
    try {
      const userSkill = await this.userSkillRepository.findOne({
        where: { id },
        relations: ['skill', 'user'],
      });

      if (!userSkill) {
        throw new NotFoundException('User skill not found');
      }

      // Cannot endorse own skills
      if (userSkill.userId === user.id) {
        throw new BadRequestException('Cannot endorse your own skills');
      }

      // Add endorsement
      const endorsement = {
        endorserId: user.id,
        endorserName: user.fullName,
        relationship: endorseDto.relationship,
        comment: endorseDto.comment,
        rating: endorseDto.rating,
        date: new Date(),
      };

      userSkill.addEndorsement(endorsement);

      const endorsedUserSkill = await this.userSkillRepository.save(userSkill);

      // Emit event
      this.eventEmitter.emit('user.skill.endorsed', {
        userSkill: endorsedUserSkill,
        endorser: user,
        endorsement,
      });

      this.logger.log(`User skill endorsed: ${id} by user ${user.id}`);
      return endorsedUserSkill;
    } catch (error) {
      this.logger.error(`Failed to endorse user skill ${id}`, error);
      throw error;
    }
  }

  // Skill Recommendations
  async getSkillRecommendations(
    userId: string,
    user: User,
  ): Promise<SkillRecommendationDto[]> {
    try {
      // Check permissions
      if (userId !== user.id && user.roles !== UserRole.ADMIN) {
        throw new ForbiddenException('Cannot access other user recommendations');
      }

      // Get user's current skills
      const userSkills = await this.userSkillRepository.find({
        where: { userId },
        relations: ['skill'],
      });

      const currentSkillIds = userSkills.map(us => us.skillId);

      // Get user's completed courses (this would integrate with LMS)
      const completedCourses = await this.getCompletedCourses(userId);

      // Generate recommendations based on:
      // 1. Related skills to current skills
      // 2. Skills from completed courses
      // 3. Popular skills in user's field
      // 4. Trending skills

      const recommendations = await this.generateSkillRecommendations(
        currentSkillIds,
        completedCourses,
        userSkills
      );

      return recommendations.map(rec => new SkillRecommendationDto(rec));
    } catch (error) {
      this.logger.error(`Failed to get skill recommendations for user ${userId}`, error);
      throw error;
    }
  }

  async getPopularSkills(limit: number = 20): Promise<Skill[]> {
    try {
      return await this.skillRepository.find({
        where: { isActive: true },
        order: { 
          popularityScore: 'DESC',
          userCount: 'DESC',
        },
        take: limit,
        relations: ['category'],
      });
    } catch (error) {
      this.logger.error('Failed to get popular skills', error);
      throw error;
    }
  }

  async getTrendingSkills(limit: number = 20): Promise<Skill[]> {
    try {
      return await this.skillRepository.find({
        where: { isActive: true },
        order: { 
          trendingScore: 'DESC',
          popularityScore: 'DESC',
        },
        take: limit,
        relations: ['category'],
      });
    } catch (error) {
      this.logger.error('Failed to get trending skills', error);
      throw error;
    }
  }

  // Integration with LMS and Course Completion
  async syncSkillsFromCourseCompletion(
    userId: string,
    courseId: string,
    skillIds: string[],
  ): Promise<void> {
    try {
      for (const skillId of skillIds) {
        // Check if user already has this skill
        const existingUserSkill = await this.userSkillRepository.findOne({
          where: { userId, skillId },
        });

        if (!existingUserSkill) {
          // Add skill with course completion verification
          const userSkill = this.userSkillRepository.create({
            userId,
            skillId,
            proficiencyLevel: SkillProficiency.BEGINNER,
            acquisitionMethod: 'online_course',
            verificationData: {
              method: 'course_completion',
              source: courseId,
              assessmentDate: new Date(),
            },
            verifiedBy: 'system',
            verifiedAt: new Date(),
          });

          await this.userSkillRepository.save(userSkill);

          // Sync with resumes
          await this.syncSkillWithResumes(userSkill);
        } else {
          // Update verification if not already verified
          if (!existingUserSkill.isVerified) {
            existingUserSkill.verify('system', {
              method: 'course_completion',
              source: courseId,
              assessmentDate: new Date(),
            });
            await this.userSkillRepository.save(existingUserSkill);
          }
        }
      }

      this.logger.log(`Skills synced from course completion: ${courseId} for user ${userId}`);
    } catch (error) {
      this.logger.error('Failed to sync skills from course completion', error);
      throw error;
    }
  }

  // Private helper methods
  private async getNextCategoryOrder(): Promise<number> {
    const lastCategory = await this.skillCategoryRepository.findOne({
      order: { displayOrder: 'DESC' },
    });
    return (lastCategory?.displayOrder || 0) + 1;
  }

  private async syncSkillWithResumes(userSkill: UserSkill): Promise<void> {
    try {
      // Get user's resumes
      const resumes = await this.resumeRepository.find({
        where: { userId: userSkill.userId },
      });

      // Add skill to each resume
      for (const resume of resumes) {
        const skillData = {
          id: userSkill.id,
          name: userSkill.skill?.name || '',
          category: userSkill.skill?.category?.name || 'Other',
          level: userSkill.proficiencyLevel,
          yearsExperience: userSkill.yearsExperience,
          verified: userSkill.isVerified,
        };

        resume.addSkill(skillData);
        await this.resumeRepository.save(resume);
      }
    } catch (error) {
      this.logger.error('Failed to sync skill with resumes', error);
    }
  }

  private async removeSkillFromResumes(userSkill: UserSkill): Promise<void> {
    try {
      // Get user's resumes
      const resumes = await this.resumeRepository.find({
        where: { userId: userSkill.userId },
      });

      // Remove skill from each resume
      for (const resume of resumes) {
        resume.removeSkill(userSkill.id);
        await this.resumeRepository.save(resume);
      }
    } catch (error) {
      this.logger.error('Failed to remove skill from resumes', error);
    }
  }

  private async getCompletedCourses(userId: string): Promise<string[]> {
    // This would integrate with the LMS module to get completed courses
    // For now, return empty array
    return [];
  }

  private async generateSkillRecommendations(
    currentSkillIds: string[],
    completedCourses: string[],
    userSkills: UserSkill[],
  ): Promise<any[]> {
    const recommendations: any[] = [];

    // Get related skills
    if (currentSkillIds.length > 0) {
      const relatedSkills = await this.skillRepository
        .createQueryBuilder('skill')
        .where('skill.isActive = :isActive', { isActive: true })
        .andWhere('skill.id NOT IN (:...currentSkills)', { currentSkills: currentSkillIds })
        .orderBy('skill.popularityScore', 'DESC')
        .take(10)
        .getMany();

      relatedSkills.forEach(skill => {
        recommendations.push({
          skill,
          reason: 'Related to your current skills',
          priority: 'medium',
          estimatedLearningTime: skill.metadata.timeToLearn?.beginner || 40,
        });
      });
    }

    // Get trending skills
    const trendingSkills = await this.getTrendingSkills(5);
    trendingSkills.forEach(skill => {
      if (!currentSkillIds.includes(skill.id)) {
        recommendations.push({
          skill,
          reason: 'Currently trending in the industry',
          priority: 'high',
          estimatedLearningTime: skill.metadata.timeToLearn?.beginner || 40,
        });
      }
    });

    return recommendations.slice(0, 15); // Return top 15 recommendations
  }
}
