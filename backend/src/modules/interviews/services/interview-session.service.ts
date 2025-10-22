import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { InterviewSession, InterviewStatus, InterviewType, InterviewMode } from '../../../database/entities/interview-session.entity';
import { InterviewResponse, ResponseStatus } from '../../../database/entities/interview-response.entity';
import { InterviewQuestion } from '../../../database/entities/interview-question.entity';
import { User, UserRole } from '../../../database/entities/user.entity';
import { Job } from '../../../database/entities/job.entity';
import { Organization } from '../../../database/entities/organization.entity';
import {
  CreateInterviewSessionDto,
  UpdateInterviewSessionDto,
  SearchInterviewSessionsDto,
  InterviewSessionResponseDto,
  InterviewSessionListResponseDto,
  RescheduleInterviewDto,
  StartInterviewDto,
  CompleteInterviewDto,
} from '../dto/interview-session.dto';

@Injectable()
export class InterviewSessionService {
  private readonly logger = new Logger(InterviewSessionService.name);

  constructor(
    @InjectRepository(InterviewSession)
    private interviewSessionRepository: Repository<InterviewSession>,
    @InjectRepository(InterviewResponse)
    private interviewResponseRepository: Repository<InterviewResponse>,
    @InjectRepository(InterviewQuestion)
    private interviewQuestionRepository: Repository<InterviewQuestion>,
    @InjectRepository(Job)
    private jobRepository: Repository<Job>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    private dataSource: DataSource,
    private eventEmitter: EventEmitter2,
    private configService: ConfigService,
  ) {}

  async createInterviewSession(
    createDto: CreateInterviewSessionDto,
    user: User,
  ): Promise<InterviewSession> {
    try {
      // Validate permissions
      await this.validateCreatePermissions(createDto, user);

      // Validate candidate and interviewer
      const candidate = await this.userRepository.findOne({
        where: { id: createDto.candidateId },
      });
      if (!candidate) {
        throw new NotFoundException('Candidate not found');
      }

      let interviewer: User | undefined;
      if (createDto.interviewerId) {
        interviewer = await this.userRepository.findOne({
          where: { id: createDto.interviewerId },
        });
        if (!interviewer) {
          throw new NotFoundException('Interviewer not found');
        }
      }

      // Validate job if provided
      let job: Job | undefined;
      if (createDto.jobId) {
        job = await this.jobRepository.findOne({
          where: { id: createDto.jobId },
        });
        if (!job) {
          throw new NotFoundException('Job not found');
        }
      }

      // Check for scheduling conflicts
      await this.checkSchedulingConflicts(createDto.scheduledAt, createDto.candidateId, createDto.interviewerId);

      // Generate meeting URL if needed
      const meetingData = await this.generateMeetingUrl(createDto.mode);

      // Create interview session
      const interviewSession = this.interviewSessionRepository.create({
        organizationId: user.organizationId,
        candidateId: createDto.candidateId,
        interviewerId: createDto.interviewerId,
        jobId: createDto.jobId,
        type: createDto.type,
        mode: createDto.mode,
        scheduledAt: new Date(createDto.scheduledAt),
        durationMinutes: createDto.durationMinutes || 60,
        difficulty: createDto.difficulty,
        tags: createDto.tags || [],
        metadata: createDto.metadata || {},
        isAiInterview: createDto.isAiInterview || false,
        aiConfig: createDto.aiConfig,
        preparationTime: createDto.preparationTime || 5,
        allowReschedule: createDto.allowReschedule ?? true,
        rescheduleDeadlineHours: createDto.rescheduleDeadlineHours || 24,
        meetingUrl: meetingData.meetingUrl,
        meetingId: meetingData.meetingId,
      });

      const savedSession = await this.interviewSessionRepository.save(interviewSession);

      // Send notifications
      await this.sendInterviewNotifications(savedSession, 'scheduled');

      // Emit event
      this.eventEmitter.emit('interview.scheduled', {
        session: savedSession,
        candidate,
        interviewer,
        job,
        user,
      });

      this.logger.log(`Interview session created: ${savedSession.id}`);

      return savedSession;
    } catch (error) {
      this.logger.error('Failed to create interview session', error);
      throw error;
    }
  }

  async getInterviewSessionById(id: string, user: User): Promise<InterviewSession> {
    try {
      const session = await this.interviewSessionRepository.findOne({
        where: { id },
        relations: ['candidate', 'interviewer', 'job', 'organization', 'responses'],
      });

      if (!session) {
        throw new NotFoundException('Interview session not found');
      }

      // Check permissions
      await this.validateViewPermissions(session, user);

      return session;
    } catch (error) {
      this.logger.error(`Failed to get interview session ${id}`, error);
      throw error;
    }
  }

  async searchInterviewSessions(
    searchDto: SearchInterviewSessionsDto,
    user: User,
  ): Promise<InterviewSessionListResponseDto> {
    try {
      const queryBuilder = this.interviewSessionRepository
        .createQueryBuilder('session')
        .leftJoinAndSelect('session.candidate', 'candidate')
        .leftJoinAndSelect('session.interviewer', 'interviewer')
        .leftJoinAndSelect('session.job', 'job')
        .leftJoinAndSelect('session.organization', 'organization');

      // Apply access control
      if (user.roles=== UserRole.STUDENT) {
        queryBuilder.where('session.candidateId = :userId', { userId: user.id });
      } else if (user.roles=== UserRole.INSTRUCTOR) {
        queryBuilder.where(
          '(session.interviewerId = :userId OR session.organizationId = :orgId)',
          { userId: user.id, orgId: user.organizationId }
        );
      } else if (user.organizationId) {
        queryBuilder.where('session.organizationId = :orgId', { orgId: user.organizationId });
      }

      // Apply filters
      if (searchDto.candidateId) {
        queryBuilder.andWhere('session.candidateId = :candidateId', { candidateId: searchDto.candidateId });
      }

      if (searchDto.interviewerId) {
        queryBuilder.andWhere('session.interviewerId = :interviewerId', { interviewerId: searchDto.interviewerId });
      }

      if (searchDto.jobId) {
        queryBuilder.andWhere('session.jobId = :jobId', { jobId: searchDto.jobId });
      }

      if (searchDto.type) {
        queryBuilder.andWhere('session.type = :type', { type: searchDto.type });
      }

      if (searchDto.status) {
        queryBuilder.andWhere('session.status = :status', { status: searchDto.status });
      }

      if (searchDto.mode) {
        queryBuilder.andWhere('session.mode = :mode', { mode: searchDto.mode });
      }

      if (searchDto.startDate) {
        queryBuilder.andWhere('session.scheduledAt >= :startDate', { startDate: new Date(searchDto.startDate) });
      }

      if (searchDto.endDate) {
        queryBuilder.andWhere('session.scheduledAt <= :endDate', { endDate: new Date(searchDto.endDate) });
      }

      if (searchDto.search) {
        queryBuilder.andWhere(
          '(candidate.firstName ILIKE :search OR candidate.lastName ILIKE :search OR job.title ILIKE :search)',
          { search: `%${searchDto.search}%` }
        );
      }

      // Apply sorting
      const sortBy = searchDto.sortBy || 'scheduledAt';
      const sortOrder = searchDto.sortOrder || 'DESC';
      queryBuilder.orderBy(`session.${sortBy}`, sortOrder);

      // Apply pagination
      const page = searchDto.page || 1;
      const limit = searchDto.limit || 20;
      queryBuilder.skip((page - 1) * limit).take(limit);

      const [sessions, total] = await queryBuilder.getManyAndCount();

      return new InterviewSessionListResponseDto({
        items: sessions,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      this.logger.error('Failed to search interview sessions', error);
      throw error;
    }
  }

  async updateInterviewSession(
    id: string,
    updateDto: UpdateInterviewSessionDto,
    user: User,
  ): Promise<InterviewSession> {
    try {
      const session = await this.getInterviewSessionById(id, user);

      // Check permissions
      await this.validateUpdatePermissions(session, user);

      // Validate status transitions
      if (updateDto.status && updateDto.status !== session.status) {
        this.validateStatusTransition(session.status, updateDto.status);
      }

      // Update fields
      Object.assign(session, {
        ...updateDto,
        updatedAt: new Date(),
      });

      const updatedSession = await this.interviewSessionRepository.save(session);

      // Emit event
      this.eventEmitter.emit('interview.updated', {
        session: updatedSession,
        user,
      });

      this.logger.log(`Interview session updated: ${id}`);

      return updatedSession;
    } catch (error) {
      this.logger.error(`Failed to update interview session ${id}`, error);
      throw error;
    }
  }

  async rescheduleInterview(
    id: string,
    rescheduleDto: RescheduleInterviewDto,
    user: User,
  ): Promise<InterviewSession> {
    try {
      const session = await this.getInterviewSessionById(id, user);

      // Check if reschedule is allowed
      if (!session.canReschedule) {
        throw new ForbiddenException('Interview cannot be rescheduled');
      }

      // Check permissions (candidate or interviewer can reschedule)
      if (session.candidateId !== user.id && session.interviewerId !== user.id && user.roles!== UserRole.ADMIN) {
        throw new ForbiddenException('Insufficient permissions to reschedule interview');
      }

      // Check for conflicts
      await this.checkSchedulingConflicts(
        rescheduleDto.newScheduledAt,
        session.candidateId,
        session.interviewerId,
        session.id
      );

      // Reschedule
      session.reschedule(new Date(rescheduleDto.newScheduledAt));
      const updatedSession = await this.interviewSessionRepository.save(session);

      // Send notifications
      await this.sendInterviewNotifications(updatedSession, 'rescheduled');

      // Emit event
      this.eventEmitter.emit('interview.rescheduled', {
        session: updatedSession,
        user,
        reason: rescheduleDto.reason,
      });

      this.logger.log(`Interview session rescheduled: ${id}`);

      return updatedSession;
    } catch (error) {
      this.logger.error(`Failed to reschedule interview session ${id}`, error);
      throw error;
    }
  }

  async startInterview(
    id: string,
    startDto: StartInterviewDto,
    user: User,
  ): Promise<InterviewSession> {
    try {
      const session = await this.getInterviewSessionById(id, user);

      // Check if interview can be started
      if (!session.canStart) {
        throw new BadRequestException('Interview cannot be started yet');
      }

      // Check permissions (candidate or interviewer can start)
      if (session.candidateId !== user.id && session.interviewerId !== user.id) {
        throw new ForbiddenException('Insufficient permissions to start interview');
      }

      // Start interview
      session.start();

      // Update metadata
      session.metadata = {
        ...session.metadata,
        startedBy: user.id,
        startLocation: startDto.location,
        deviceInfo: startDto.deviceInfo,
      };

      const updatedSession = await this.interviewSessionRepository.save(session);

      // Initialize questions if AI interview
      if (session.isAiInterview) {
        await this.initializeAiInterviewQuestions(session);
      }

      // Send notifications
      await this.sendInterviewNotifications(updatedSession, 'started');

      // Emit event
      this.eventEmitter.emit('interview.started', {
        session: updatedSession,
        user,
      });

      this.logger.log(`Interview session started: ${id}`);

      return updatedSession;
    } catch (error) {
      this.logger.error(`Failed to start interview session ${id}`, error);
      throw error;
    }
  }

  async completeInterview(
    id: string,
    completeDto: CompleteInterviewDto,
    user: User,
  ): Promise<InterviewSession> {
    try {
      const session = await this.getInterviewSessionById(id, user);

      // Check permissions
      if (session.interviewerId !== user.id && user.roles!== UserRole.ADMIN) {
        throw new ForbiddenException('Only interviewer or admin can complete interview');
      }

      // Complete interview
      session.complete(completeDto.score, completeDto.feedback);

      // Update notes
      if (completeDto.notes) {
        session.notes = completeDto.notes;
      }

      const updatedSession = await this.interviewSessionRepository.save(session);

      // Send notifications
      await this.sendInterviewNotifications(updatedSession, 'completed');

      // Emit event
      this.eventEmitter.emit('interview.completed', {
        session: updatedSession,
        user,
      });

      this.logger.log(`Interview session completed: ${id}`);

      return updatedSession;
    } catch (error) {
      this.logger.error(`Failed to complete interview session ${id}`, error);
      throw error;
    }
  }

  async cancelInterview(
    id: string,
    reason: string,
    user: User,
  ): Promise<InterviewSession> {
    try {
      const session = await this.getInterviewSessionById(id, user);

      // Check permissions
      await this.validateUpdatePermissions(session, user);

      // Cancel interview
      session.cancel(reason);
      const updatedSession = await this.interviewSessionRepository.save(session);

      // Send notifications
      await this.sendInterviewNotifications(updatedSession, 'cancelled');

      // Emit event
      this.eventEmitter.emit('interview.cancelled', {
        session: updatedSession,
        user,
        reason,
      });

      this.logger.log(`Interview session cancelled: ${id}`);

      return updatedSession;
    } catch (error) {
      this.logger.error(`Failed to cancel interview session ${id}`, error);
      throw error;
    }
  }

  async getUpcomingInterviews(userId: string, user: User): Promise<InterviewSession[]> {
    try {
      const queryBuilder = this.interviewSessionRepository
        .createQueryBuilder('session')
        .leftJoinAndSelect('session.candidate', 'candidate')
        .leftJoinAndSelect('session.interviewer', 'interviewer')
        .leftJoinAndSelect('session.job', 'job')
        .where('session.status = :status', { status: InterviewStatus.SCHEDULED })
        .andWhere('session.scheduledAt > :now', { now: new Date() })
        .orderBy('session.scheduledAt', 'ASC');

      if (user.roles=== UserRole.STUDENT) {
        queryBuilder.andWhere('session.candidateId = :userId', { userId: user.id });
      } else {
        queryBuilder.andWhere(
          '(session.candidateId = :userId OR session.interviewerId = :userId)',
          { userId }
        );
      }

      return await queryBuilder.getMany();
    } catch (error) {
      this.logger.error(`Failed to get upcoming interviews for user ${userId}`, error);
      throw error;
    }
  }

  async getInterviewHistory(userId: string, user: User): Promise<InterviewSession[]> {
    try {
      const queryBuilder = this.interviewSessionRepository
        .createQueryBuilder('session')
        .leftJoinAndSelect('session.candidate', 'candidate')
        .leftJoinAndSelect('session.interviewer', 'interviewer')
        .leftJoinAndSelect('session.job', 'job')
        .where('session.status IN (:...statuses)', { 
          statuses: [InterviewStatus.COMPLETED, InterviewStatus.CANCELLED, InterviewStatus.NO_SHOW] 
        })
        .orderBy('session.scheduledAt', 'DESC');

      if (user.roles=== UserRole.STUDENT) {
        queryBuilder.andWhere('session.candidateId = :userId', { userId: user.id });
      } else {
        queryBuilder.andWhere(
          '(session.candidateId = :userId OR session.interviewerId = :userId)',
          { userId }
        );
      }

      return await queryBuilder.getMany();
    } catch (error) {
      this.logger.error(`Failed to get interview history for user ${userId}`, error);
      throw error;
    }
  }

  // Private helper methods
  private async validateCreatePermissions(createDto: CreateInterviewSessionDto, user: User): Promise<void> {
    if (user.roles=== UserRole.STUDENT) {
      throw new ForbiddenException('Students cannot create interview sessions');
    }

    if (createDto.organizationId && createDto.organizationId !== user.organizationId) {
      throw new ForbiddenException('Cannot create interview for different organization');
    }
  }

  private async validateViewPermissions(session: InterviewSession, user: User): Promise<void> {
    const isCandidate = session.candidateId === user.id;
    const isInterviewer = session.interviewerId === user.id;
    const isOrgMember = session.organizationId === user.organizationId;
    const isAdmin = user.roles=== UserRole.ADMIN;

    if (!isCandidate && !isInterviewer && !isOrgMember && !isAdmin) {
      throw new ForbiddenException('Insufficient permissions to view interview');
    }
  }

  private async validateUpdatePermissions(session: InterviewSession, user: User): Promise<void> {
    const isInterviewer = session.interviewerId === user.id;
    const isOrgAdmin = session.organizationId === user.organizationId && 
                      [UserRole.ADMIN, UserRole.INSTRUCTOR].includes(user.roles as any);

    if (!isInterviewer && !isOrgAdmin) {
      throw new ForbiddenException('Insufficient permissions to update interview');
    }
  }

  private validateStatusTransition(currentStatus: InterviewStatus, newStatus: InterviewStatus): void {
    const validTransitions: Record<InterviewStatus, InterviewStatus[]> = {
      [InterviewStatus.SCHEDULED]: [InterviewStatus.IN_PROGRESS, InterviewStatus.CANCELLED, InterviewStatus.NO_SHOW],
      [InterviewStatus.IN_PROGRESS]: [InterviewStatus.COMPLETED, InterviewStatus.CANCELLED],
      [InterviewStatus.COMPLETED]: [],
      [InterviewStatus.CANCELLED]: [],
      [InterviewStatus.NO_SHOW]: [],
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }
  }

  private async checkSchedulingConflicts(
    scheduledAt: string,
    candidateId: string,
    interviewerId?: string,
    excludeSessionId?: string,
  ): Promise<void> {
    const scheduledTime = new Date(scheduledAt);
    const bufferMinutes = 30; // 30-minute buffer between interviews

    const queryBuilder = this.interviewSessionRepository
      .createQueryBuilder('session')
      .where('session.status = :status', { status: InterviewStatus.SCHEDULED })
      .andWhere('session.scheduledAt BETWEEN :start AND :end', {
        start: new Date(scheduledTime.getTime() - bufferMinutes * 60 * 1000),
        end: new Date(scheduledTime.getTime() + bufferMinutes * 60 * 1000),
      });

    if (excludeSessionId) {
      queryBuilder.andWhere('session.id != :excludeId', { excludeId: excludeSessionId });
    }

    queryBuilder.andWhere(
      '(session.candidateId = :candidateId OR session.interviewerId = :interviewerId)',
      { candidateId, interviewerId }
    );

    const conflicts = await queryBuilder.getMany();

    if (conflicts.length > 0) {
      throw new BadRequestException('Scheduling conflict detected');
    }
  }

  private async generateMeetingUrl(mode: InterviewMode): Promise<{ meetingUrl?: string; meetingId?: string }> {
    if (mode === InterviewMode.VIDEO || mode === InterviewMode.AUDIO) {
      // Integration with video conferencing service (Zoom, Google Meet, etc.)
      // This is a placeholder - implement actual integration
      const meetingId = `meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const meetingUrl = `https://meet.example.com/${meetingId}`;
      
      return { meetingUrl, meetingId };
    }

    return {};
  }

  private async sendInterviewNotifications(
    session: InterviewSession,
    eventType: 'scheduled' | 'rescheduled' | 'started' | 'completed' | 'cancelled',
  ): Promise<void> {
    // Emit notification events
    this.eventEmitter.emit('notification.send', {
      type: `interview.${eventType}`,
      recipients: [session.candidateId, session.interviewerId].filter(Boolean),
      data: {
        interviewId: session.id,
        scheduledAt: session.scheduledAt,
        meetingUrl: session.meetingUrl,
      },
    });
  }

  private async initializeAiInterviewQuestions(session: InterviewSession): Promise<void> {
    // This would integrate with the AI service to generate questions
    // Placeholder implementation
    this.logger.log(`Initializing AI questions for interview ${session.id}`);
  }
}
