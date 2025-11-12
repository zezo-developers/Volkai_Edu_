import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JobApplication, ApplicationStatus, ApplicationStage } from '../../../database/entities/job-application.entity';
import { Job } from '../../../database/entities/job.entity';
import { User, UserRole } from '../../../database/entities/user.entity';
import { UserResume } from '../../../database/entities/user-resume.entity';
import {
  CreateApplicationDto,
  UpdateApplicationDto,
  SearchApplicationsDto,
  ApplicationResponseDto,
  ApplicationListResponseDto,
  BulkUpdateApplicationsDto,
  ApplicationTimelineDto,
  ScreeningResultsDto,
} from '../dto/application-tracking.dto';

@Injectable()
export class ApplicationTrackingService {
  private readonly logger = new Logger(ApplicationTrackingService.name);

  constructor(
    @InjectRepository(JobApplication)
    private applicationRepository: Repository<JobApplication>,
    @InjectRepository(Job)
    private jobRepository: Repository<Job>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserResume)
    private resumeRepository: Repository<UserResume>,
    private dataSource: DataSource,
    private eventEmitter: EventEmitter2,
  ) {}

  async createApplication(
    createDto: CreateApplicationDto,
    user?: User,
  ): Promise<JobApplication> {
    try {
      // Validate job exists and is active
      const job = await this.jobRepository.findOne({
        where: { id: createDto.jobId },
      });

      console.log('create dto: ',createDto)

      if (!job ) {
        throw new NotFoundException('Job not found or not accepting applications');
      }

      // Check for duplicate applications
      const existingApplication = await this.applicationRepository.findOne({
        where: {
          jobId: createDto.jobId,
          ...(user ? { candidateId: user.id } : { externalEmail: createDto.externalEmail }),
        },
      });

      if (existingApplication) {
        throw new BadRequestException('Application already exists for this job');
      }

      // Validate resume if provided
      let resume: UserResume | undefined;
      if (createDto.resumeId) {
        resume = await this.resumeRepository.findOne({
          where: { id: createDto.resumeId },
        });

        if (!resume) {
          throw new NotFoundException('Resume not found');
        }
        console.log('resume.userId: ', resume.userId)
        console.log('user.id: ', user?.id)
        // Check resume ownership
        if (user && resume.userId !== user.id) {
          throw new ForbiddenException('Cannot use another user\'s resume');
        }
      }
      console.log({
        jobId: createDto.jobId,
        candidateId: user?.id,
        externalEmail: createDto.externalEmail,
        externalName: createDto.externalName,
        resumeId: createDto.resumeId,
        coverLetter: createDto.coverLetter,
        source: createDto.source || 'direct',
        formData: createDto.formData || {},
        status: ApplicationStatus.APPLIED,
        stage: ApplicationStage.SCREENING,
      })
      
      const application:any = this.applicationRepository.create({
        jobId: createDto.jobId,
        candidateId: user?.id,
        externalEmail: createDto.externalEmail,
        externalName: createDto.externalName,
        resumeId: createDto.resumeId,
        coverLetter: createDto.coverLetter,
        source: createDto.source || 'direct',
        formData: createDto.formData || {},
        status: ApplicationStatus.APPLIED,
        stage: ApplicationStage.SCREENING,
      } as any);

      // Add initial timeline entry
      application.addTimelineEntry({
        action: 'application_submitted',
        description: 'Application submitted',
        performedBy: user?.id || 'external_candidate',
      } as any);

      // Perform auto-screening if resume is available
      if (resume) {
        await this.performAutoScreening(application, resume, job);
      }

      const savedApplication = await this.applicationRepository.save(application);

      // Emit event
      this.eventEmitter.emit('application.created', {
        application: savedApplication,
        job,
        candidate: user,
      });

      this.logger.log(`Application created: ${savedApplication.id} for job ${job.id}`);

      return savedApplication;
    } catch (error) {
      this.logger.error('Failed to create application', error);
      throw error;
    }
  }

  async getApplicationById(id: string, user: User): Promise<JobApplication> {
    try {
      const application = await this.applicationRepository.findOne({
        where: { id },
        relations: ['job', 'candidate', 'resume', 'assignee'],
      });

      if (!application) {
        throw new NotFoundException('Application not found');
      }

      // Check access permissions
      await this.validateApplicationAccess(application, user);

      return application;
    } catch (error) {
      this.logger.error(`Failed to get application ${id}`, error);
      throw error;
    }
  }

  async searchApplications(
    searchDto: SearchApplicationsDto,
    user: User,
  ): Promise<ApplicationListResponseDto> {
    try {
      const queryBuilder = this.applicationRepository
        .createQueryBuilder('application')
        .leftJoinAndSelect('application.job', 'job')
        .leftJoinAndSelect('application.candidate', 'candidate')
        .leftJoinAndSelect('application.resume', 'resume')
        .leftJoinAndSelect('application.assignee', 'assignee');

      // Apply access control
      if (user.roles=== UserRole.STUDENT) {
        // Students can only see their own applications
        queryBuilder.where('application.candidateId = :userId', { userId: user.id });
      } else if (user.roles=== UserRole.ADMIN) {
        // Admins can see all applications
      } else {
        // HR/Managers can see applications for their organization's jobs
        queryBuilder
          .leftJoin('job.organization', 'organization')
          .where('organization.id = :orgId', { orgId: user.organizationId });
      }

      // Apply filters
      if (searchDto.jobId) {
        queryBuilder.andWhere('application.jobId = :jobId', { jobId: searchDto.jobId });
      }

      if (searchDto.candidateId) {
        queryBuilder.andWhere('application.candidateId = :candidateId', { candidateId: searchDto.candidateId });
      }

      if (searchDto.status) {
        queryBuilder.andWhere('application.status = :status', { status: searchDto.status });
      }

      if (searchDto.stage) {
        queryBuilder.andWhere('application.stage = :stage', { stage: searchDto.stage });
      }

      if (searchDto.assignedTo) {
        queryBuilder.andWhere('application.assignedTo = :assignedTo', { assignedTo: searchDto.assignedTo });
      }

      if (searchDto.source) {
        queryBuilder.andWhere('application.source = :source', { source: searchDto.source });
      }

      if (searchDto.minRating) {
        queryBuilder.andWhere('application.rating >= :minRating', { minRating: searchDto.minRating });
      }

      if (searchDto.appliedAfter) {
        queryBuilder.andWhere('application.appliedAt >= :appliedAfter', { appliedAfter: searchDto.appliedAfter });
      }

      if (searchDto.appliedBefore) {
        queryBuilder.andWhere('application.appliedAt <= :appliedBefore', { appliedBefore: searchDto.appliedBefore });
      }

      if (searchDto.search) {
        queryBuilder.andWhere(
          '(candidate.firstName ILIKE :search OR candidate.lastName ILIKE :search OR application.externalName ILIKE :search OR job.title ILIKE :search)',
          { search: `%${searchDto.search}%` }
        );
      }

      // Apply sorting
      const sortBy = searchDto.sortBy || 'appliedAt';
      const sortOrder = searchDto.sortOrder || 'DESC';

      switch (sortBy) {
        case 'candidateName':
          queryBuilder.orderBy('COALESCE(candidate.firstName, application.externalName)', sortOrder);
          break;
        case 'jobTitle':
          queryBuilder.orderBy('job.title', sortOrder);
          break;
        case 'lastActivity':
          queryBuilder.orderBy('application.lastActivityAt', sortOrder);
          break;
        default:
          queryBuilder.orderBy(`application.${sortBy}`, sortOrder);
      }

      // Apply pagination
      const page = searchDto.page || 1;
      const limit = searchDto.limit || 20;
      queryBuilder.skip((page - 1) * limit).take(limit);

      const [applications, total] = await queryBuilder.getManyAndCount();

      return new ApplicationListResponseDto({
        items: applications,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      this.logger.error('Failed to search applications', error);
      throw error;
    }
  }

  async updateApplication(
    id: string,
    updateDto: UpdateApplicationDto,
    user: User,
  ): Promise<JobApplication> {
    try {
      const application = await this.getApplicationById(id, user);

      // Check permissions
      await this.validateApplicationUpdateAccess(application, user);

      // Validate status/stage transitions
      if (updateDto.status && updateDto.status !== application.status) {
        if (!application.canTransitionTo(updateDto.status)) {
          throw new BadRequestException(`Cannot transition from ${application.status} to ${updateDto.status}`);
        }
        application.updateStatus(updateDto.status, user.id, updateDto.notes);
      }

      if (updateDto.stage && updateDto.stage !== application.stage) {
        if (!application.canAdvanceToStage(updateDto.stage)) {
          throw new BadRequestException(`Cannot advance from ${application.stage} to ${updateDto.stage}`);
        }
        application.updateStage(updateDto.stage, user.id, updateDto.notes);
      }

      // Update other fields
      if (updateDto.rating !== undefined) {
        application.rate(updateDto.rating, user.id, updateDto.notes);
      }

      if (updateDto.assignedTo !== undefined) {
        if (updateDto.assignedTo) {
          application.assignTo(updateDto.assignedTo, user.id);
        } else {
          application.assignedTo = null;
        }
      }

      if (updateDto.notes) {
        application.notes = updateDto.notes;
      }

      if (updateDto.screeningData) {
        application.updateScreeningData(updateDto.screeningData);
      }

      const updatedApplication = await this.applicationRepository.save(application);

      // Emit event
      this.eventEmitter.emit('application.updated', {
        application: updatedApplication,
        user,
        changes: updateDto,
      });

      this.logger.log(`Application updated: ${id} by user ${user.id}`);

      return updatedApplication;
    } catch (error) {
      this.logger.error(`Failed to update application ${id}`, error);
      throw error;
    }
  }

  async bulkUpdateApplications(
    bulkUpdateDto: BulkUpdateApplicationsDto,
    user: User,
  ): Promise<{ updated: number; errors: string[] }> {
    try {
      const applications = await this.applicationRepository.find({
        where: { id: In(bulkUpdateDto.applicationIds) },
        relations: ['job'],
      });

      const errors: string[] = [];
      let updated = 0;

      await this.dataSource.transaction(async manager => {
        for (const application of applications) {
          try {
            // Check permissions
            await this.validateApplicationUpdateAccess(application, user);

            // Apply bulk updates
            if (bulkUpdateDto.status) {
              if (application.canTransitionTo(bulkUpdateDto.status)) {
                application.updateStatus(bulkUpdateDto.status, user.id, bulkUpdateDto.notes);
              } else {
                errors.push(`Cannot update status for application ${application.id}`);
                continue;
              }
            }

            if (bulkUpdateDto.stage) {
              if (application.canAdvanceToStage(bulkUpdateDto.stage)) {
                application.updateStage(bulkUpdateDto.stage, user.id, bulkUpdateDto.notes);
              } else {
                errors.push(`Cannot update stage for application ${application.id}`);
                continue;
              }
            }

            if (bulkUpdateDto.assignedTo !== undefined) {
              if (bulkUpdateDto.assignedTo) {
                application.assignTo(bulkUpdateDto.assignedTo, user.id);
              } else {
                application.assignedTo = null;
              }
            }

            await manager.save(application);
            updated++;

          } catch (error) {
            errors.push(`Failed to update application ${application.id}: ${error.message}`);
          }
        }
      });

      // Emit event
      this.eventEmitter.emit('applications.bulk.updated', {
        applicationIds: bulkUpdateDto.applicationIds,
        updates: bulkUpdateDto,
        user,
        results: { updated, errors },
      });

      this.logger.log(`Bulk updated ${updated} applications by user ${user.id}`);

      return { updated, errors };
    } catch (error) {
      this.logger.error('Failed to bulk update applications', error);
      throw error;
    }
  }

  async rejectApplication(
    id: string,
    reason: string,
    feedback?: string,
    sendFeedback: boolean = false,
    user?: User,
  ): Promise<JobApplication> {
    try {
      const application = await this.getApplicationById(id, user!);

      // Check permissions
      await this.validateApplicationUpdateAccess(application, user!);

      application.reject(reason, feedback, user?.id, sendFeedback);

      const rejectedApplication = await this.applicationRepository.save(application);

      // Emit event
      this.eventEmitter.emit('application.rejected', {
        application: rejectedApplication,
        reason,
        feedback,
        sendFeedback,
        user,
      });

      this.logger.log(`Application rejected: ${id} by user ${user?.id}`);

      return rejectedApplication;
    } catch (error) {
      this.logger.error(`Failed to reject application ${id}`, error);
      throw error;
    }
  }

  async withdrawApplication(id: string, reason?: string, user?: User): Promise<JobApplication> {
    try {
      const application = await this.getApplicationById(id, user!);

      // Check permissions - only candidate can withdraw
      if (user && application.candidateId !== user.id) {
        throw new ForbiddenException('Only the candidate can withdraw their application');
      }

      application.withdraw(reason);

      const withdrawnApplication = await this.applicationRepository.save(application);

      // Emit event
      this.eventEmitter.emit('application.withdrawn', {
        application: withdrawnApplication,
        reason,
        user,
      });

      this.logger.log(`Application withdrawn: ${id} by user ${user?.id || 'candidate'}`);

      return withdrawnApplication;
    } catch (error) {
      this.logger.error(`Failed to withdraw application ${id}`, error);
      throw error;
    }
  }

  async scheduleInterview(
    applicationId: string,
    interviewData: {
      type: string;
      scheduledAt: Date;
      interviewers: string[];
    },
    user: User,
  ): Promise<JobApplication> {
    try {
      const application = await this.getApplicationById(applicationId, user);

      // Check permissions
      await this.validateApplicationUpdateAccess(application, user);

      // Generate interview ID
      const interviewId = `interview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('interviewData: ',interviewData)
      application.scheduleInterview({
        id: interviewId,
        ...interviewData,
      }, user.id);

      const updatedApplication = await this.applicationRepository.save(application);

      // Emit event for interview scheduling
      this.eventEmitter.emit('interview.scheduled', {
        application: updatedApplication,
        interviewData: { id: interviewId, ...interviewData },
        user,
      });

      this.logger.log(`Interview scheduled for application: ${applicationId} by user ${user.id}`);

      return updatedApplication;
    } catch (error) {
      this.logger.error(`Failed to schedule interview for application ${applicationId}`, error);
      throw error;
    }
  }

  async addInterviewFeedback(
    applicationId: string,
    feedback: {
      interviewId: string;
      interviewer: string;
      rating: number;
      feedback: string;
      recommendation: 'hire' | 'no_hire' | 'maybe';
    },
    user: User,
  ): Promise<JobApplication> {
    try {
      const application = await this.getApplicationById(applicationId, user);

      application.addInterviewFeedback(feedback, user.id);

      const updatedApplication = await this.applicationRepository.save(application);

      // Emit event
      this.eventEmitter.emit('interview.feedback.added', {
        application: updatedApplication,
        feedback,
        user,
      });

      this.logger.log(`Interview feedback added for application: ${applicationId} by user ${user.id}`);

      return updatedApplication;
    } catch (error) {
      this.logger.error(`Failed to add interview feedback for application ${applicationId}`, error);
      throw error;
    }
  }

  async addCommunication(
    applicationId: string,
    communication: {
      type: 'email' | 'phone' | 'message' | 'meeting';
      direction: 'inbound' | 'outbound';
      subject?: string;
      content: string;
      attachments?: Array<{ name: string; url: string; }>;
    },
    user: User,
  ): Promise<JobApplication> {
    try {
      const application = await this.getApplicationById(applicationId, user);

      application.addCommunication({
        ...communication,
        sentBy: user.id,
        sentByName: user.fullName,
      });

      const updatedApplication = await this.applicationRepository.save(application);

      // Emit event
      this.eventEmitter.emit('application.communication.added', {
        application: updatedApplication,
        communication,
        user,
      });

      this.logger.log(`Communication added for application: ${applicationId} by user ${user.id}`);

      return updatedApplication;
    } catch (error) {
      this.logger.error(`Failed to add communication for application ${applicationId}`, error);
      throw error;
    }
  }

  async getApplicationTimeline(id: string, user: User): Promise<ApplicationTimelineDto> {
    try {
      const application = await this.getApplicationById(id, user);

      const timeline = {
        applicationId: application.id,
        timeline: application.timeline.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ),
        communications: application.communications.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ),
      };

      return new ApplicationTimelineDto(timeline);
    } catch (error) {
      this.logger.error(`Failed to get application timeline for ${id}`, error);
      throw error;
    }
  }

  async getScreeningResults(id: string, user: User): Promise<ScreeningResultsDto> {
    try {
      const application = await this.getApplicationById(id, user);

      // Calculate auto-screening score if not already done
      if (!application.screeningData.autoScreeningScore) {
        application.screeningData.autoScreeningScore = application.calculateAutoScreeningScore();
        await this.applicationRepository.save(application);
      }

      const results = {
        applicationId: application.id,
        autoScreeningScore: application.screeningData.autoScreeningScore || 0,
        skillsMatch: application.screeningData.skillsMatch,
        experienceMatch: application.screeningData.experienceMatch,
        salaryExpectation: application.screeningData.salaryExpectation,
        availability: application.screeningData.availability,
        recommendations: this.generateScreeningRecommendations(application),
      };

      return new ScreeningResultsDto(results);
    } catch (error) {
      this.logger.error(`Failed to get screening results for ${id}`, error);
      throw error;
    }
  }

  // Private helper methods
  private async validateApplicationAccess(application: JobApplication, user: User): Promise<void> {
    const isCandidate = application.candidateId === user.id;
    const isAdmin = user.roles=== UserRole.ADMIN;
    const isHROrManager = (user.roles=== UserRole.HR || user.roles=== UserRole.MANAGER) &&
                         user.organizationId === application.job?.organizationId;

    if (!isCandidate && !isAdmin && !isHROrManager) {
      throw new ForbiddenException('Access denied to this application');
    }
  }

  private async validateApplicationUpdateAccess(application: JobApplication, user: User): Promise<void> {
    const isAdmin = user.roles=== UserRole.ADMIN;
    const isHROrManager = (user.roles=== UserRole.HR || user.roles=== UserRole.MANAGER) &&
                         user.organizationId === application.job?.organizationId;

    if (!isAdmin && !isHROrManager) {
      throw new ForbiddenException('Insufficient permissions to update application');
    }
  }

  private async performAutoScreening(
    application: JobApplication,
    resume: UserResume,
    job: Job,
  ): Promise<void> {
    try {
      // Skills matching
      const candidateSkills = resume.data.skills.map(skill => skill.name.toLowerCase());
      const requiredSkills = job.skillsRequired.map(skill => skill.toLowerCase());
      
      const matchedSkills = requiredSkills.filter(skill => 
        candidateSkills.some(candidateSkill => 
          candidateSkill.includes(skill) || skill.includes(candidateSkill)
        )
      );

      const missingSkills = requiredSkills.filter(skill => !matchedSkills.includes(skill));
      const skillsScore = requiredSkills.length > 0 
        ? (matchedSkills.length / requiredSkills.length) * 100 
        : 100;

      application.screeningData.skillsMatch = {
        required: requiredSkills,
        matched: matchedSkills,
        missing: missingSkills,
        score: skillsScore,
      };

      // Experience matching
      const totalExperience = resume.data.experience.reduce((total, exp) => {
        if (exp.current) return total + 1; // Assume 1 year for current positions
        
        const start = new Date(exp.startDate);
        const end = exp.endDate ? new Date(exp.endDate) : new Date();
        const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
        return total + years;
      }, 0);

      const experienceScore = this.calculateExperienceScore(totalExperience, job.experienceLevel);
      
      application.screeningData.experienceMatch = {
        required: job.experienceLevel || 'Not specified',
        candidate: `${Math.round(totalExperience)} years`,
        score: experienceScore,
      };

      // Calculate overall auto-screening score
      application.screeningData.autoScreeningScore = application.calculateAutoScreeningScore();

    } catch (error) {
      this.logger.error('Failed to perform auto-screening', error);
    }
  }

  private calculateExperienceScore(candidateYears: number, requiredLevel?: string): number {
    const experienceRequirements = {
      'entry': 0,
      'junior': 1,
      'mid': 3,
      'senior': 5,
      'lead': 7,
      'executive': 10,
    };

    if (!requiredLevel || !experienceRequirements[requiredLevel]) return 100;

    const requiredYears = experienceRequirements[requiredLevel];
    
    if (candidateYears >= requiredYears) return 100;
    if (candidateYears >= requiredYears * 0.8) return 80;
    if (candidateYears >= requiredYears * 0.6) return 60;
    if (candidateYears >= requiredYears * 0.4) return 40;
    return 20;
  }

  private generateScreeningRecommendations(application: JobApplication): string[] {
    const recommendations: string[] = [];
    const { skillsMatch, experienceMatch, autoScreeningScore } = application.screeningData;

    if (autoScreeningScore && autoScreeningScore >= 80) {
      recommendations.push('Strong candidate - recommend proceeding to interview');
    } else if (autoScreeningScore && autoScreeningScore >= 60) {
      recommendations.push('Good candidate - consider phone screening');
    } else {
      recommendations.push('Review candidate profile carefully before proceeding');
    }

    if (skillsMatch && skillsMatch.missing.length > 0) {
      recommendations.push(`Missing key skills: ${skillsMatch.missing.join(', ')}`);
    }

    if (experienceMatch && experienceMatch.score < 60) {
      recommendations.push('Experience level may not meet requirements');
    }

    if (application.rating && application.rating >= 4) {
      recommendations.push('Highly rated by reviewers');
    }

    return recommendations;
  }
}
