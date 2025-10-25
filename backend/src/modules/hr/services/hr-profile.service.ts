import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HRProfile, EmploymentType } from '../../../database/entities/hr-profile.entity';
import { User, UserRole } from '../../../database/entities/user.entity';
import { Team } from '../../../database/entities/team.entity';
import { TeamMember } from '../../../database/entities/team-member.entity';
import {
  CreateHRProfileDto,
  UpdateHRProfileDto,
  SearchHRProfilesDto,
  HRProfileResponseDto,
  HRProfileListResponseDto,
  PerformanceReviewDto,
  GoalDto,
  DocumentDto,
  TrainingDto,
} from '../dto/hr-profile.dto';

@Injectable()
export class HRProfileService {
  private readonly logger = new Logger(HRProfileService.name);

  constructor(
    @InjectRepository(HRProfile)
    private hrProfileRepository: Repository<HRProfile>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private teamMemberRepository: Repository<TeamMember>,
    private dataSource: DataSource,
    private eventEmitter: EventEmitter2,
  ) {}

  async createHRProfile(
    createDto: CreateHRProfileDto,
    user: User,
  ): Promise<HRProfile> {
    try {
      // Validate permissions
      if (user.roles!== UserRole.ADMIN && user.roles!== UserRole.HR) {
        throw new ForbiddenException('Insufficient permissions to create HR profile');
      }

      // Validate user exists
      const targetUser = await this.userRepository.findOne({
        where: { id: createDto.userId },
      });

      if (!targetUser) {
        throw new NotFoundException('User not found');
      }

      // Check if HR profile already exists
      const existingProfile = await this.hrProfileRepository.findOne({
        where: { userId: createDto.userId },
      });

      if (existingProfile) {
        throw new BadRequestException('HR profile already exists for this user');
      }

      // Validate manager if provided
      if (createDto.managerId) {
        const manager = await this.userRepository.findOne({
          where: { id: createDto.managerId },
        });

        if (!manager) {
          throw new NotFoundException('Manager not found');
        }
      }

      const hrProfile = this.hrProfileRepository.create({
        userId: createDto.userId,
        employeeId: createDto.employeeId,
        department: createDto.department,
        position: createDto.position,
        managerId: createDto.managerId,
        hireDate: createDto.hireDate,
        employmentType: createDto.employmentType,
        salary: createDto.salary,
        currency: createDto.currency || 'USD',
        benefits: createDto.benefits || HRProfile.getDefaultBenefits(),
        emergencyContact: createDto.emergencyContact,
        workSchedule: createDto.workSchedule || HRProfile.getDefaultWorkSchedule(),
        documents: {},
        performanceData: {},
        trainingData: {},
      });

      const savedProfile = await this.hrProfileRepository.save(hrProfile);

      // Emit event
      this.eventEmitter.emit('hr.profile.created', {
        profile: savedProfile,
        user,
      });

      this.logger.log(`HR profile created: ${savedProfile.id} for user ${createDto.userId}`);

      return savedProfile;
    } catch (error) {
      this.logger.error('Failed to create HR profile', error);
      throw error;
    }
  }

  async getHRProfileById(id: string, user: User): Promise<HRProfile> {
    try {
      const profile = await this.hrProfileRepository.findOne({
        where: { id },
        relations: ['user', 'manager', 'directReports'],
      });

      if (!profile) {
        throw new NotFoundException('HR profile not found');
      }

      // Check access permissions
      await this.validateProfileAccess(profile, user);

      return profile;
    } catch (error) {
      this.logger.error(`Failed to get HR profile ${id}`, error);
      throw error;
    }
  }

  async getHRProfileByUserId(userId: string, user: User): Promise<HRProfile> {
    try {
      const profile = await this.hrProfileRepository.findOne({
        where: { userId },
        relations: ['user', 'manager', 'directReports'],
      });

      if (!profile) {
        throw new NotFoundException('HR profile not found');
      }

      // Check access permissions
      await this.validateProfileAccess(profile, user);

      return profile;
    } catch (error) {
      this.logger.error(`Failed to get HR profile for user ${userId}`, error);
      throw error;
    }
  }

  async searchHRProfiles(
    searchDto: SearchHRProfilesDto,
    user: User,
  ): Promise<HRProfileListResponseDto> {
    try {
      // Validate permissions
      if (user.roles=== UserRole.STUDENT) {
        throw new ForbiddenException('Students cannot access HR profiles');
      }

      const queryBuilder = this.hrProfileRepository
        .createQueryBuilder('profile')
        .leftJoinAndSelect('profile.user', 'user')
        .leftJoinAndSelect('profile.manager', 'manager');

      // Apply access control
      if (user.roles!== UserRole.ADMIN) {
        // Non-admins can only see profiles in their organization
        queryBuilder.where('user.organizationId = :orgId', { orgId: user.organizationId });
      }

      // Apply filters
      if (searchDto.search) {
        queryBuilder.andWhere(
          '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR profile.employeeId ILIKE :search OR profile.position ILIKE :search)',
          { search: `%${searchDto.search}%` }
        );
      }

      if (searchDto.department) {
        queryBuilder.andWhere('profile.department = :department', { department: searchDto.department });
      }

      if (searchDto.position) {
        queryBuilder.andWhere('profile.position ILIKE :position', { position: `%${searchDto.position}%` });
      }

      if (searchDto.managerId) {
        queryBuilder.andWhere('profile.managerId = :managerId', { managerId: searchDto.managerId });
      }

      if (searchDto.employmentType) {
        queryBuilder.andWhere('profile.employmentType = :employmentType', { employmentType: searchDto.employmentType });
      }

      if (searchDto.hiredAfter) {
        queryBuilder.andWhere('profile.hireDate >= :hiredAfter', { hiredAfter: searchDto.hiredAfter });
      }

      if (searchDto.hiredBefore) {
        queryBuilder.andWhere('profile.hireDate <= :hiredBefore', { hiredBefore: searchDto.hiredBefore });
      }

      // Apply sorting
      const sortBy = searchDto.sortBy || 'hireDate';
      const sortOrder = searchDto.sortOrder || 'DESC';

      switch (sortBy) {
        case 'name':
          queryBuilder.orderBy('user.firstName', sortOrder).addOrderBy('user.lastName', sortOrder);
          break;
        case 'department':
          queryBuilder.orderBy('profile.department', sortOrder);
          break;
        case 'position':
          queryBuilder.orderBy('profile.position', sortOrder);
          break;
        default:
          queryBuilder.orderBy(`profile.${sortBy}`, sortOrder);
      }

      // Apply pagination
      const page = searchDto.page || 1;
      const limit = searchDto.limit || 20;
      queryBuilder.skip((page - 1) * limit).take(limit);

      const [profiles, total] = await queryBuilder.getManyAndCount();

      return new HRProfileListResponseDto({
        items: profiles,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      this.logger.error('Failed to search HR profiles', error);
      throw error;
    }
  }

  async updateHRProfile(
    id: string,
    updateDto: UpdateHRProfileDto,
    user: User,
  ): Promise<HRProfile> {
    try {
      const profile = await this.getHRProfileById(id, user);

      // Check permissions
      await this.validateProfileUpdateAccess(profile, user);

      // Validate manager if being updated
      if (updateDto.managerId) {
        const manager = await this.userRepository.findOne({
          where: { id: updateDto.managerId },
        });

        if (!manager) {
          throw new NotFoundException('Manager not found');
        }
      }

      // Update fields
      Object.assign(profile, updateDto);

      const updatedProfile = await this.hrProfileRepository.save(profile);

      // Emit event
      this.eventEmitter.emit('hr.profile.updated', {
        profile: updatedProfile,
        user,
        changes: updateDto,
      });

      this.logger.log(`HR profile updated: ${id} by user ${user.id}`);

      return updatedProfile;
    } catch (error) {
      this.logger.error(`Failed to update HR profile ${id}`, error);
      throw error;
    }
  }

  async deleteHRProfile(id: string, user: User): Promise<void> {
    try {
      const profile = await this.getHRProfileById(id, user);

      // Check permissions - only admin can delete
      if (user.roles!== UserRole.ADMIN) {
        throw new ForbiddenException('Only administrators can delete HR profiles');
      }

      await this.hrProfileRepository.remove(profile);

      // Emit event
      this.eventEmitter.emit('hr.profile.deleted', {
        profileId: id,
        userId: profile.userId,
        user,
      });

      this.logger.log(`HR profile deleted: ${id} by user ${user.id}`);
    } catch (error) {
      this.logger.error(`Failed to delete HR profile ${id}`, error);
      throw error;
    }
  }

  async promoteEmployee(
    id: string,
    newPosition: string,
    newDepartment?: string,
    newSalary?: number,
    effectiveDate?: Date,
    user?: User,
  ): Promise<HRProfile> {
    try {
      const profile = await this.getHRProfileById(id, user!);

      // Check permissions
      await this.validateProfileUpdateAccess(profile, user!);

      // Record promotion
      profile.promote(newPosition, newDepartment, effectiveDate);
      
      if (newSalary) {
        profile.updateSalary(newSalary, effectiveDate || new Date(), 'Promotion');
      }

      const updatedProfile = await this.hrProfileRepository.save(profile);

      // Emit event
      this.eventEmitter.emit('hr.employee.promoted', {
        profile: updatedProfile,
        newPosition,
        newDepartment,
        newSalary,
        user,
      });

      this.logger.log(`Employee promoted: ${id} to ${newPosition} by user ${user?.id}`);

      return updatedProfile;
    } catch (error) {
      this.logger.error(`Failed to promote employee ${id}`, error);
      throw error;
    }
  }

  async addPerformanceReview(
    id: string,
    reviewDto: PerformanceReviewDto,
    user: User,
  ): Promise<HRProfile> {
    try {
      const profile:any = await this.getHRProfileById(id, user);

      // Check permissions
      await this.validateProfileUpdateAccess(profile, user);

      profile.addPerformanceReview({
        period: reviewDto.period,
        type: reviewDto.type,
        overallRating: reviewDto.overallRating,
        competencies: reviewDto.competencies,
        achievements: reviewDto.achievements,
        areasForImprovement: reviewDto.areasForImprovement,
        goals: reviewDto.goals,
        reviewDate: reviewDto.reviewDate || new Date(),
        nextReviewDate: reviewDto.nextReviewDate,
      });

      const updatedProfile = await this.hrProfileRepository.save(profile);

      // Emit event
      this.eventEmitter.emit('hr.performance.review.added', {
        profile: updatedProfile,
        review: reviewDto,
        user,
      });

      this.logger.log(`Performance review added for profile: ${id} by user ${user.id}`);

      return updatedProfile;
    } catch (error) {
      this.logger.error(`Failed to add performance review for ${id}`, error);
      throw error;
    }
  }

  async addGoal(
    id: string,
    goalDto: GoalDto,
    user: User,
  ): Promise<HRProfile> {
    try {
      const profile:any = await this.getHRProfileById(id, user);

      // Check permissions
      await this.validateProfileUpdateAccess(profile, user);

      profile.addGoal({
        title: goalDto.title,
        description: goalDto.description,
        category: goalDto.category,
        priority: goalDto.priority,
        dueDate: goalDto.dueDate,
        progress: 0,
        status: 'not_started',
      });

      const updatedProfile = await this.hrProfileRepository.save(profile);

      // Emit event
      this.eventEmitter.emit('hr.goal.added', {
        profile: updatedProfile,
        goal: goalDto,
        user,
      });

      this.logger.log(`Goal added for profile: ${id} by user ${user.id}`);

      return updatedProfile;
    } catch (error) {
      this.logger.error(`Failed to add goal for ${id}`, error);
      throw error;
    }
  }

  async updateGoalProgress(
    id: string,
    goalId: string,
    progress: number,
    user: User,
  ): Promise<HRProfile> {
    try {
      const profile = await this.getHRProfileById(id, user);

      // Check permissions - employee can update their own goals
      if (profile.userId !== user.id && user.roles!== UserRole.ADMIN && user.roles!== UserRole.HR) {
        throw new ForbiddenException('Insufficient permissions to update goal progress');
      }

      profile.updateGoalProgress(goalId, progress);

      const updatedProfile = await this.hrProfileRepository.save(profile);

      // Emit event
      this.eventEmitter.emit('hr.goal.progress.updated', {
        profile: updatedProfile,
        goalId,
        progress,
        user,
      });

      this.logger.log(`Goal progress updated for profile: ${id} by user ${user.id}`);

      return updatedProfile;
    } catch (error) {
      this.logger.error(`Failed to update goal progress for ${id}`, error);
      throw error;
    }
  }

  async addDocument(
    id: string,
    documentDto: DocumentDto,
    user: User,
  ): Promise<HRProfile> {
    try {
      const profile = await this.getHRProfileById(id, user);

      // Check permissions
      await this.validateProfileUpdateAccess(profile, user);

      profile.addDocument({
        name: documentDto.name,
        type: documentDto.type,
        url: documentDto.url,
        category: documentDto.category,
      });

      const updatedProfile = await this.hrProfileRepository.save(profile);

      // Emit event
      this.eventEmitter.emit('hr.document.added', {
        profile: updatedProfile,
        document: documentDto,
        user,
      });

      this.logger.log(`Document added for profile: ${id} by user ${user.id}`);

      return updatedProfile;
    } catch (error) {
      this.logger.error(`Failed to add document for ${id}`, error);
      throw error;
    }
  }

  async addTraining(
    id: string,
    trainingDto: TrainingDto,
    user: User,
  ): Promise<HRProfile> {
    try {
      const profile = await this.getHRProfileById(id, user);

      // Check permissions
      await this.validateProfileUpdateAccess(profile, user);

      profile.addTraining({
        name: trainingDto.name,
        provider: trainingDto.provider,
        category: trainingDto.category,
        type: trainingDto.type,
        completionDate: trainingDto.completionDate,
        scheduledDate: trainingDto.scheduledDate,
        certificateUrl: trainingDto.certificateUrl,
      });

      const updatedProfile = await this.hrProfileRepository.save(profile);

      // Emit event
      this.eventEmitter.emit('hr.training.added', {
        profile: updatedProfile,
        training: trainingDto,
        user,
      });

      this.logger.log(`Training added for profile: ${id} by user ${user.id}`);

      return updatedProfile;
    } catch (error) {
      this.logger.error(`Failed to add training for ${id}`, error);
      throw error;
    }
  }

  async getTeamMembers(managerId: string, user: User): Promise<HRProfile[]> {
    try {
      // Validate permissions
      if (user.id !== managerId && user.roles!== UserRole.ADMIN && user.roles!== UserRole.HR) {
        throw new ForbiddenException('Insufficient permissions to view team members');
      }

      const teamMembers = await this.hrProfileRepository.find({
        where: { managerId },
        relations: ['user'],
        order: { hireDate: 'ASC' },
      });

      return teamMembers;
    } catch (error) {
      this.logger.error(`Failed to get team members for manager ${managerId}`, error);
      throw error;
    }
  }

  async getDepartmentEmployees(department: string, user: User): Promise<HRProfile[]> {
    try {
      // Validate permissions
      if (user.roles!== UserRole.ADMIN && user.roles!== UserRole.HR) {
        throw new ForbiddenException('Insufficient permissions to view department employees');
      }

      const employees = await this.hrProfileRepository.find({
        where: { department },
        relations: ['user', 'manager'],
        order: { position: 'ASC', hireDate: 'ASC' },
      });

      return employees;
    } catch (error) {
      this.logger.error(`Failed to get department employees for ${department}`, error);
      throw error;
    }
  }

  async getPerformanceMetrics(id: string, user: User): Promise<any> {
    try {
      const profile = await this.getHRProfileById(id, user);

      const metrics = {
        profileId: profile.id,
        employeeId: profile.employeeId,
        currentRating: profile.currentPerformanceRating,
        performanceScore: profile.calculatePerformanceScore(),
        yearsOfService: profile.yearsOfService,
        activeGoals: profile.activeGoalsCount,
        nextReviewDate: profile.nextReviewDate,
        recentReviews: profile.performanceData.reviews?.slice(-3) || [],
        goalProgress: profile.performanceData.currentGoals?.map(goal => ({
          id: goal.id,
          title: goal.title,
          progress: goal.progress,
          status: goal.status,
          dueDate: goal.dueDate,
        })) || [],
        recentFeedback: profile.performanceData.feedback?.slice(-5) || [],
      };

      return metrics;
    } catch (error) {
      this.logger.error(`Failed to get performance metrics for ${id}`, error);
      throw error;
    }
  }

  // Private helper methods
  private async validateProfileAccess(profile: any, user: User): Promise<void> {
    const isOwner = profile.userId === user.id;
    const isAdmin = user.roles=== UserRole.ADMIN;
    const isHR = user.roles=== UserRole.HR && user.organizationId === profile.user?.organizationId;
    const isManager = profile.managerId === user.id;

    if (!isOwner && !isAdmin && !isHR && !isManager) {
      throw new ForbiddenException('Access denied to this HR profile');
    }
  }

  private async validateProfileUpdateAccess(profile: any, user: User): Promise<void> {
    const isAdmin = user.roles=== UserRole.ADMIN;
    const isHR = user.roles=== UserRole.HR && user.organizationId === profile.user?.organizationId;
    const isManager = profile.managerId === user.id;

    if (!isAdmin && !isHR && !isManager) {
      throw new ForbiddenException('Insufficient permissions to update HR profile');
    }
  }
}
