import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job, JobStatus } from '../../../database/entities/job.entity';
import { JobApplication } from '../../../database/entities/job-application.entity';
import { User, UserRole } from '../../../database/entities/user.entity';
import { Organization } from '../../../database/entities/organization.entity';
import {
  CreateJobDto,
  UpdateJobDto,
  SearchJobsDto,
  JobResponseDto,
  JobListResponseDto,
  JobStatsDto,
  PublishJobDto,
} from '../dto/job-management.dto';

@Injectable()
export class JobManagementService {
  private readonly logger = new Logger(JobManagementService.name);

  constructor(
    @InjectRepository(Job)
    private jobRepository: Repository<Job>,
    @InjectRepository(JobApplication)
    private applicationRepository: Repository<JobApplication>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    private dataSource: DataSource,
    private eventEmitter: EventEmitter2,
  ) {}

  async createJob(createDto: CreateJobDto, user: User) {
    try {
      console.log('inside create job', user);
      console.log('createDto: ', createDto);
      // Validate permissions
      if (user.roles=== UserRole.STUDENT) {
        throw new ForbiddenException('Students cannot create jobs');
      }

      // Validate organization
      const organization = await this.organizationRepository.findOne({
        where: { id: createDto.organizationId },
      });

      if (!organization) {
        throw new NotFoundException('Organization not found');
      }

      // Generate unique slug
      const slug = await this.generateUniqueSlug(createDto.title, createDto.organizationId);
      console.log({
        organizationId: createDto.organizationId,
        title: createDto.title,
        slug,
        description: createDto.description,
        requirements: createDto.requirements,
        responsibilities: createDto.responsibilities,
        location: createDto.location,
        type: createDto.type,
        mode: createDto.mode,
        experienceLevel: createDto.experienceLevel,
        salaryMin: createDto.salaryMin,
        salaryMax: createDto.salaryMax,
        currency: createDto.currency || 'USD',
        department: createDto.department,
        tags: createDto.tags || [],
        skillsRequired: createDto.skillsRequired || [],
        expiresAt: createDto.expiresAt,
        createdBy: user.id,
        status: JobStatus.DRAFT,
      })

      const job = this.jobRepository.create({
        organizationId: createDto.organizationId,
        title: createDto.title,
        slug,
        description: createDto.description,
        requirements: createDto.requirements,
        responsibilities: createDto.responsibilities,
        location: createDto.location,
        type: createDto.type,
        mode: createDto.mode,
        experienceLevel: createDto.experienceLevel,
        salaryMin: createDto.salaryMin,
        salaryMax: createDto.salaryMax,
        currency: createDto.currency || 'USD',
        department: createDto.department,
        tags: createDto.tags || [],
        skillsRequired: createDto.skillsRequired || [],
        expiresAt: createDto.expiresAt,
        createdBy: user.id,
        status: JobStatus.DRAFT,
        applications: [], 
      });

      const savedJob = await this.jobRepository.save(job);

      // Emit event
      this.eventEmitter.emit('job.created', {
        job: savedJob,
        user,
      });

      this.logger.log(`Job created: ${savedJob.id} by user ${user.id}`);

      return savedJob;
    } catch (error) {
      this.logger.error('Failed to create job', error);
      throw error;
    }
  }

  async getJobById(id: string, user?: User): Promise<Job> {
    try {
      const job = await this.jobRepository.findOne({
        where: { id },
        relations: ['organization', 'creator', 'applications'],
      });

      if (!job) {
        throw new NotFoundException('Job not found');
      }

      // Check access permissions for non-published jobs
      if (job.status !== JobStatus.PUBLISHED && user) {
        const canAccess = job.createdBy === user.id || 
                         user.roles=== UserRole.ADMIN ||
                         (user.organizationId === job.organizationId && 
                          (user.roles=== UserRole.HR || user.roles=== UserRole.MANAGER));
        
        if (!canAccess) {
          throw new ForbiddenException('Access denied to this job');
        }
      }

      return job;
    } catch (error) {
      this.logger.error(`Failed to get job ${id}`, error);
      throw error;
    }
  }

  async searchJobs(searchDto: SearchJobsDto, user?: User): Promise<JobListResponseDto> {
    try {
      const queryBuilder = this.jobRepository
        .createQueryBuilder('job')
        .leftJoinAndSelect('job.organization', 'organization')
        .leftJoinAndSelect('job.creator', 'creator');

      // Apply access control
      if (!user || user.roles=== UserRole.STUDENT) {
        // Public access - only published and non-expired jobs
        queryBuilder.where('job.status = :status', { status: JobStatus.PUBLISHED })
                   .andWhere('(job.expiresAt IS NULL OR job.expiresAt > :now)', { now: new Date() });
      } else if (user.roles=== UserRole.ADMIN) {
        // Admin can see all jobs
      } else {
        // HR/Manager can see organization jobs + published jobs
        queryBuilder.where(
          '(job.organizationId = :orgId OR job.status = :publishedStatus)',
          { 
            orgId: user.organizationId,
            publishedStatus: JobStatus.PUBLISHED,
          }
        );
      }

      // Apply filters
      if (searchDto.search) {
        queryBuilder.andWhere(
          '(job.title ILIKE :search OR job.description ILIKE :search OR job.tags && :searchArray)',
          { 
            search: `%${searchDto.search}%`,
            searchArray: [searchDto.search.toLowerCase()],
          }
        );
      }

      if (searchDto.organizationId) {
        queryBuilder.andWhere('job.organizationId = :orgId', { orgId: searchDto.organizationId });
      }

      if (searchDto.type) {
        queryBuilder.andWhere('job.type = :type', { type: searchDto.type });
      }

      if (searchDto.mode) {
        queryBuilder.andWhere('job.mode = :mode', { mode: searchDto.mode });
      }

      if (searchDto.experienceLevel) {
        queryBuilder.andWhere('job.experienceLevel = :level', { level: searchDto.experienceLevel });
      }

      if (searchDto.location) {
        queryBuilder.andWhere('job.location ILIKE :location', { location: `%${searchDto.location}%` });
      }

      if (searchDto.department) {
        queryBuilder.andWhere('job.department = :department', { department: searchDto.department });
      }

      if (searchDto.salaryMin) {
        queryBuilder.andWhere('(job.salaryMin >= :salaryMin OR job.salaryMax >= :salaryMin)', 
                              { salaryMin: searchDto.salaryMin });
      }

      if (searchDto.salaryMax) {
        queryBuilder.andWhere('(job.salaryMax <= :salaryMax OR job.salaryMin <= :salaryMax)', 
                              { salaryMax: searchDto.salaryMax });
      }

      if (Array.isArray(searchDto.skills) && searchDto.skills.length > 0) {
        queryBuilder.andWhere('job.skillsRequired && ARRAY[:...skills]::text[]', {
          skills: searchDto.skills,
        });
      }

      if (Array.isArray(searchDto.tags) && searchDto.tags.length > 0) {
        queryBuilder.andWhere('job.tags && ARRAY[:...tags]::text[]', {
          tags: searchDto.tags,
        });
      }

      if (searchDto.status) {
        queryBuilder.andWhere('job.status = :status', { status: searchDto.status });
      }

      // Apply sorting
      const sortBy = searchDto.sortBy || 'createdAt';
      const sortOrder = searchDto.sortOrder || 'DESC';

      switch (sortBy) {
        case 'relevance':
          // This would implement relevance scoring based on search terms
          queryBuilder.orderBy('job.publishedAt', 'DESC');
          break;
        case 'salary':
          queryBuilder.orderBy('job.salaryMax', sortOrder);
          break;
        case 'applications':
          queryBuilder
            .leftJoin('job.applications', 'applications')
            .addSelect('COUNT(applications.id)', 'applicationCount')
            .groupBy('job.id')
            .orderBy('applicationCount', sortOrder);
          break;
        default:
          queryBuilder.orderBy(`job.${sortBy}`, sortOrder);
      }

      // Apply pagination
      const page = searchDto.page || 1;
      const limit = searchDto.limit || 20;
      queryBuilder.skip((page - 1) * limit).take(limit);

      const [jobs, total] = await queryBuilder.getManyAndCount();

      return new JobListResponseDto({
        items: jobs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      this.logger.error('Failed to search jobs', error);
      throw error;
    }
  }

  async updateJob(id: string, updateDto: UpdateJobDto, user: User): Promise<Job> {
    try {
      const job = await this.getJobById(id, user);

      console.log('got job: ', job)

      // Check permissions
      const canUpdate = job.createdBy === user.id || 
                       user.roles=== UserRole.ADMIN ||
                       (user.organizationId === job.organizationId && 
                        (user.roles=== UserRole.HR || user.roles=== UserRole.MANAGER));

      if (!canUpdate) {
        throw new ForbiddenException('Insufficient permissions to update job');
      }

      // Validate status transitions
      if (updateDto.status && updateDto.status !== job.status) {
        this.validateStatusTransition(job.status, updateDto.status);
      }

      // Update slug if title changed
      if (updateDto.title && updateDto.title !== job.title) {
        console.log('update slug: ', updateDto.title, job.organizationId)
        updateDto.slug = await this.generateUniqueSlug(updateDto.title, job.organizationId);
      }

      // Update fields
      Object.assign(job, updateDto);

      const updatedJob = await this.jobRepository.save(job);

      // Emit event
      this.eventEmitter.emit('job.updated', {
        job: updatedJob,
        user,
      });

      this.logger.log(`Job updated: ${id} by user ${user.id}`);

      return updatedJob;
    } catch (error) {
      this.logger.error(`Failed to update job ${id}`, error);
      throw error;
    }
  }

  async deleteJob(id: string, user: User): Promise<void> {
    try {
      const job = await this.getJobById(id, user);

      // Check permissions
      const canDelete = job.createdBy === user.id || 
                       user.roles=== UserRole.ADMIN ||
                       (user.organizationId === job.organizationId && user.roles=== UserRole.HR);

      if (!canDelete) {
        throw new ForbiddenException('Insufficient permissions to delete job');
      }

      // Check if job has applications
      const applicationCount = await this.applicationRepository.count({
        where: { jobId: id },
      });

      if (applicationCount > 0) {
        throw new BadRequestException('Cannot delete job with existing applications. Archive it instead.');
      }

      await this.jobRepository.remove(job);

      // Emit event
      this.eventEmitter.emit('job.deleted', {
        jobId: id,
        user,
      });

      this.logger.log(`Job deleted: ${id} by user ${user.id}`);
    } catch (error) {
      this.logger.error(`Failed to delete job ${id}`, error);
      throw error;
    }
  }

  async publishJob(id: string, publishDto: PublishJobDto, user: User): Promise<Job> {
    try {
      const job = await this.getJobById(id, user);

      // Check permissions
      const canPublish = job.createdBy === user.id || 
                        user.roles=== UserRole.ADMIN ||
                        (user.organizationId === job.organizationId && 
                         (user.roles=== UserRole.HR || user.roles=== UserRole.MANAGER));

      if (!canPublish) {
        throw new ForbiddenException('Insufficient permissions to publish job');
      }

      // Validate job is ready for publishing
      this.validateJobForPublishing(job);

      // Update job
      job.publish();
      if (publishDto.expiresAt) {
        job.expiresAt = publishDto.expiresAt;
      }

      const publishedJob = await this.jobRepository.save(job);

      // Emit event
      this.eventEmitter.emit('job.published', {
        job: publishedJob,
        user,
      });

      this.logger.log(`Job published: ${id} by user ${user.id}`);

      return publishedJob;
    } catch (error) {
      this.logger.error(`Failed to publish job ${id}`, error);
      throw error;
    }
  }

  async pauseJob(id: string, user: User): Promise<Job> {
    try {
      const job = await this.getJobById(id, user);

      // Check permissions and validate
      this.validateJobAction(job, user, 'pause');

      job.pause();
      const pausedJob = await this.jobRepository.save(job);

      // Emit event
      this.eventEmitter.emit('job.paused', {
        job: pausedJob,
        user,
      });

      this.logger.log(`Job paused: ${id} by user ${user.id}`);

      return pausedJob;
    } catch (error) {
      this.logger.error(`Failed to pause job ${id}`, error);
      throw error;
    }
  }

  async resumeJob(id: string, user: User): Promise<Job> {
    try {
      const job = await this.getJobById(id, user);

      // Check permissions and validate
      this.validateJobAction(job, user, 'resume');

      job.resume();
      const resumedJob = await this.jobRepository.save(job);

      // Emit event
      this.eventEmitter.emit('job.resumed', {
        job: resumedJob,
        user,
      });

      this.logger.log(`Job resumed: ${id} by user ${user.id}`);

      return resumedJob;
    } catch (error) {
      this.logger.error(`Failed to resume job ${id}`, error);
      throw error;
    }
  }

  async closeJob(id: string, user: User): Promise<Job> {
    try {
      const job = await this.getJobById(id, user);

      // Check permissions and validate
      this.validateJobAction(job, user, 'close');

      job.close();
      const closedJob = await this.jobRepository.save(job);

      // Emit event
      this.eventEmitter.emit('job.closed', {
        job: closedJob,
        user,
      });

      this.logger.log(`Job closed: ${id} by user ${user.id}`);

      return closedJob;
    } catch (error) {
      this.logger.error(`Failed to close job ${id}`, error);
      throw error;
    }
  }

  async archiveJob(id: string, user: User): Promise<Job> {
    try {
      const job = await this.getJobById(id, user);

      // Check permissions
      const canArchive = job.createdBy === user.id || 
                        user.roles=== UserRole.ADMIN ||
                        (user.organizationId === job.organizationId && user.roles=== UserRole.HR);

      if (!canArchive) {
        throw new ForbiddenException('Insufficient permissions to archive job');
      }

      job.archive();
      const archivedJob = await this.jobRepository.save(job);

      // Emit event
      this.eventEmitter.emit('job.archived', {
        job: archivedJob,
        user,
      });

      this.logger.log(`Job archived: ${id} by user ${user.id}`);

      return archivedJob;
    } catch (error) {
      this.logger.error(`Failed to archive job ${id}`, error);
      throw error;
    }
  }

  async cloneJob(id: string, newTitle: string, user: User): Promise<Job> {
    try {
      const originalJob = await this.getJobById(id, user);

      // Check permissions
      const canClone = originalJob.createdBy === user.id || 
                      user.roles=== UserRole.ADMIN ||
                      (user.organizationId === originalJob.organizationId && 
                       (user.roles=== UserRole.HR || user.roles=== UserRole.MANAGER));

      if (!canClone) {
        throw new ForbiddenException('Insufficient permissions to clone job');
      }

      const slug = await this.generateUniqueSlug(newTitle, originalJob.organizationId);

      const clonedJob = this.jobRepository.create({
        organizationId: originalJob.organizationId,
        title: newTitle,
        slug,
        description: originalJob.description,
        requirements: originalJob.requirements,
        responsibilities: originalJob.responsibilities,
        location: originalJob.location,
        type: originalJob.type,
        mode: originalJob.mode,
        experienceLevel: originalJob.experienceLevel,
        salaryMin: originalJob.salaryMin,
        salaryMax: originalJob.salaryMax,
        currency: originalJob.currency,
        department: originalJob.department,
        tags: [...originalJob.tags],
        skillsRequired: [...originalJob.skillsRequired],
        createdBy: user.id,
        status: JobStatus.DRAFT,
      });

      const savedJob = await this.jobRepository.save(clonedJob);

      // Emit event
      this.eventEmitter.emit('job.cloned', {
        originalJob,
        clonedJob: savedJob,
        user,
      });

      this.logger.log(`Job cloned: ${id} -> ${savedJob.id} by user ${user.id}`);

      return savedJob;
    } catch (error) {
      this.logger.error(`Failed to clone job ${id}`, error);
      throw error;
    }
  }

  async getJobStats(id: string, user: User): Promise<JobStatsDto> {
    try {
      const job = await this.getJobById(id, user);

      // Check permissions
      const canViewStats = job.createdBy === user.id || 
                          user.roles=== UserRole.ADMIN ||
                          (user.organizationId === job.organizationId && 
                           (user.roles=== UserRole.HR || user.roles=== UserRole.MANAGER));

      if (!canViewStats) {
        throw new ForbiddenException('Insufficient permissions to view job stats');
      }

      // Get application statistics
      const applications = await this.applicationRepository.find({
        where: { jobId: id },
      });

      const stats = {
        totalApplications: applications.length,
        applicationsByStatus: this.groupApplicationsByStatus(applications),
        applicationsBySource: this.groupApplicationsBySource(applications),
        averageRating: this.calculateAverageRating(applications),
        applicationTrend: await this.getApplicationTrend(id),
        topSkills: this.analyzeTopSkills(applications),
        timeToHire: this.calculateTimeToHire(applications),
        conversionRates: this.calculateConversionRates(applications),
      };

      return new JobStatsDto(stats);
    } catch (error) {
      this.logger.error(`Failed to get job stats for ${id}`, error);
      throw error;
    }
  }

  // Private helper methods
  private async generateUniqueSlug(title: string, organizationId: string): Promise<string> {
    console.log({title, organizationId});
    const baseSlug = title.toLowerCase()
                         .replace(/[^a-z0-9\s-]/g, '')
                         .replace(/\s+/g, '-')
                         .replace(/-+/g, '-')
                         .trim();

    let slug = baseSlug;
    let counter = 1;

    while (await this.jobRepository.findOne({ where: { slug, organizationId } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  private validateStatusTransition(currentStatus: JobStatus, newStatus: JobStatus): void {
    const validTransitions: Record<JobStatus, JobStatus[]> = {
      [JobStatus.DRAFT]: [JobStatus.PUBLISHED],
      [JobStatus.PUBLISHED]: [JobStatus.PAUSED, JobStatus.CLOSED],
      [JobStatus.PAUSED]: [JobStatus.PUBLISHED, JobStatus.CLOSED],
      [JobStatus.CLOSED]: [JobStatus.ARCHIVED],
      [JobStatus.ARCHIVED]: [],
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(`Cannot transition from ${currentStatus} to ${newStatus}`);
    }
  }

  private validateJobForPublishing(job: Job): void {
    const errors: string[] = [];

    if (!job.title?.trim()) errors.push('Job title is required');
    if (!job.description?.trim()) errors.push('Job description is required');
    if (!job.type) errors.push('Job type is required');
    if (!job.mode) errors.push('Work mode is required');

    if (errors.length > 0) {
      throw new BadRequestException(`Job validation failed: ${errors.join(', ')}`);
    }
  }

  private validateJobAction(job: Job, user: User, action: string): void {
    const canPerformAction = job.createdBy === user.id || 
                            user.roles=== UserRole.ADMIN ||
                            (user.organizationId === job.organizationId && 
                             (user.roles=== UserRole.HR || user.roles=== UserRole.MANAGER));

    if (!canPerformAction) {
      throw new ForbiddenException(`Insufficient permissions to ${action} job`);
    }
  }

  private groupApplicationsByStatus(applications: JobApplication[]): Record<string, number> {
    return applications.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupApplicationsBySource(applications: JobApplication[]): Record<string, number> {
    return applications.reduce((acc, app) => {
      acc[app.source] = (acc[app.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculateAverageRating(applications: JobApplication[]): number {
    const ratedApplications = applications.filter(app => app.rating);
    if (ratedApplications.length === 0) return 0;
    
    const sum = ratedApplications.reduce((acc, app) => acc + (app.rating || 0), 0);
    return sum / ratedApplications.length;
  }

  private async getApplicationTrend(jobId: string): Promise<Array<{ date: string; count: number }>> {
    // This would typically query application data by date
    // For now, return mock trend data
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return {
        date: date.toISOString().split('T')[0],
        count: Math.floor(Math.random() * 10),
      };
    }).reverse();

    return last7Days;
  }

  private analyzeTopSkills(applications: JobApplication[]): Array<{ skill: string; count: number }> {
    // This would analyze skills from resumes and applications
    // For now, return mock data
    return [
      { skill: 'JavaScript', count: 15 },
      { skill: 'React', count: 12 },
      { skill: 'Node.js', count: 10 },
      { skill: 'Python', count: 8 },
      { skill: 'SQL', count: 7 },
    ];
  }

  private calculateTimeToHire(applications: JobApplication[]): number {
    const hiredApplications = applications.filter(app => app.status === 'hired');
    if (hiredApplications.length === 0) return 0;

    const totalDays = hiredApplications.reduce((acc, app) => {
      const daysDiff = Math.ceil((new Date().getTime() - app.appliedAt.getTime()) / (1000 * 60 * 60 * 24));
      return acc + daysDiff;
    }, 0);

    return totalDays / hiredApplications.length;
  }

  private calculateConversionRates(applications: JobApplication[]): Record<string, number> {
    const total = applications.length;
    if (total === 0) return {};

    return {
      screeningToInterview: (applications.filter(app => app.status === 'interviewing').length / total) * 100,
      interviewToOffer: (applications.filter(app => app.status === 'offered').length / total) * 100,
      offerToHire: (applications.filter(app => app.status === 'hired').length / total) * 100,
    };
  }
}
