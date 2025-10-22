import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InterviewSessionService } from './interview-session.service';
import { InterviewSession, InterviewStatus, InterviewType, InterviewMode } from '../../../database/entities/interview-session.entity';
import { InterviewResponse } from '../../../database/entities/interview-response.entity';
import { InterviewQuestion } from '../../../database/entities/interview-question.entity';
import { Job } from '../../../database/entities/job.entity';
import { User, UserRole } from '../../../database/entities/user.entity';
import { Organization } from '../../../database/entities/organization.entity';

describe('InterviewSessionService', () => {
  let service: InterviewSessionService;
  let interviewSessionRepository: Repository<InterviewSession>;
  let interviewResponseRepository: Repository<InterviewResponse>;
  let interviewQuestionRepository: Repository<InterviewQuestion>;
  let jobRepository: Repository<Job>;
  let userRepository: Repository<User>;
  let organizationRepository: Repository<Organization>;
  let eventEmitter: EventEmitter2;
  let configService: ConfigService;

  const mockUser: User = {
    id: 'user-1',
    email: 'interviewer@example.com',
    firstName: 'John',
    lastName: 'Interviewer',
    role: UserRole.INSTRUCTOR,
    organizationId: 'org-1',
  } as User;

  const mockCandidate: User = {
    id: 'candidate-1',
    email: 'candidate@example.com',
    firstName: 'Jane',
    lastName: 'Candidate',
    role: UserRole.STUDENT,
  } as User;

  const mockInterviewSession: InterviewSession = {
    id: 'session-1',
    organizationId: 'org-1',
    candidateId: 'candidate-1',
    interviewerId: 'user-1',
    jobId: 'job-1',
    type: InterviewType.TECHNICAL,
    mode: InterviewMode.VIDEO,
    status: InterviewStatus.SCHEDULED,
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    durationMinutes: 60,
    preparationTime: 5,
    allowReschedule: true,
    rescheduleDeadlineHours: 24,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as InterviewSession;

  const mockRepositories = {
    interviewSession: {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    },
    interviewResponse: {
      findAndCount: jest.fn(),
    },
    interviewQuestion: {
      find: jest.fn(),
    },
    job: {
      findOne: jest.fn(),
    },
    user: {
      findOne: jest.fn(),
    },
    organization: {
      findOne: jest.fn(),
    },
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue({
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterviewSessionService,
        {
          provide: getRepositoryToken(InterviewSession),
          useValue: mockRepositories.interviewSession,
        },
        {
          provide: getRepositoryToken(InterviewResponse),
          useValue: mockRepositories.interviewResponse,
        },
        {
          provide: getRepositoryToken(InterviewQuestion),
          useValue: mockRepositories.interviewQuestion,
        },
        {
          provide: getRepositoryToken(Job),
          useValue: mockRepositories.job,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockRepositories.user,
        },
        {
          provide: getRepositoryToken(Organization),
          useValue: mockRepositories.organization,
        },
        {
          provide: 'DataSource',
          useValue: mockDataSource,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<InterviewSessionService>(InterviewSessionService);
    interviewSessionRepository = module.get<Repository<InterviewSession>>(getRepositoryToken(InterviewSession));
    interviewResponseRepository = module.get<Repository<InterviewResponse>>(getRepositoryToken(InterviewResponse));
    interviewQuestionRepository = module.get<Repository<InterviewQuestion>>(getRepositoryToken(InterviewQuestion));
    jobRepository = module.get<Repository<Job>>(getRepositoryToken(Job));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    organizationRepository = module.get<Repository<Organization>>(getRepositoryToken(Organization));
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createInterviewSession', () => {
    const createSessionDto = {
      candidateId: 'candidate-1',
      interviewerId: 'user-1',
      jobId: 'job-1',
      type: InterviewType.TECHNICAL,
      mode: InterviewMode.VIDEO,
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      durationMinutes: 60,
    };

    it('should create interview session successfully', async () => {
      mockRepositories.user.findOne
        .mockResolvedValueOnce(mockCandidate) // candidate lookup
        .mockResolvedValueOnce(mockUser); // interviewer lookup
      mockRepositories.job.findOne.mockResolvedValue({ id: 'job-1' });
      mockRepositories.interviewSession.create.mockReturnValue(mockInterviewSession);
      mockRepositories.interviewSession.save.mockResolvedValue(mockInterviewSession);
      mockRepositories.interviewSession.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]), // No conflicts
      });

      const result = await service.createInterviewSession(createSessionDto, mockUser);

      expect(mockRepositories.interviewSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          candidateId: createSessionDto.candidateId,
          interviewerId: createSessionDto.interviewerId,
          type: createSessionDto.type,
          mode: createSessionDto.mode,
        })
      );
      expect(mockRepositories.interviewSession.save).toHaveBeenCalledWith(mockInterviewSession);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('interview.scheduled', expect.any(Object));
      expect(result).toEqual(mockInterviewSession);
    });

    it('should throw error if candidate not found', async () => {
      mockRepositories.user.findOne.mockResolvedValue(null);

      await expect(service.createInterviewSession(createSessionDto, mockUser))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw error if user lacks permissions', async () => {
      const studentUser = { ...mockUser, role: UserRole.STUDENT };

      await expect(service.createInterviewSession(createSessionDto, studentUser))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw error on scheduling conflict', async () => {
      mockRepositories.user.findOne
        .mockResolvedValueOnce(mockCandidate)
        .mockResolvedValueOnce(mockUser);
      mockRepositories.job.findOne.mockResolvedValue({ id: 'job-1' });
      
      // Mock conflict detection
      mockRepositories.interviewSession.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockInterviewSession]), // Conflict found
      });

      await expect(service.createInterviewSession(createSessionDto, mockUser))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('getInterviewSessionById', () => {
    it('should return interview session when found and user has access', async () => {
      mockRepositories.interviewSession.findOne.mockResolvedValue(mockInterviewSession);

      const result = await service.getInterviewSessionById('session-1', mockUser);

      expect(mockRepositories.interviewSession.findOne).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        relations: ['candidate', 'interviewer', 'job', 'organization', 'responses'],
      });
      expect(result).toEqual(mockInterviewSession);
    });

    it('should throw NotFoundException when session not found', async () => {
      mockRepositories.interviewSession.findOne.mockResolvedValue(null);

      await expect(service.getInterviewSessionById('nonexistent', mockUser))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user lacks access', async () => {
      const unauthorizedSession = {
        ...mockInterviewSession,
        candidateId: 'other-candidate',
        interviewerId: 'other-interviewer',
        organizationId: 'other-org',
      };
      const studentUser = { ...mockCandidate, organizationId: 'other-org' };

      mockRepositories.interviewSession.findOne.mockResolvedValue(unauthorizedSession);

      await expect(service.getInterviewSessionById('session-1', studentUser))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('searchInterviewSessions', () => {
    const searchDto = {
      search: 'technical',
      type: InterviewType.TECHNICAL,
      status: InterviewStatus.SCHEDULED,
      page: 1,
      limit: 10,
    };

    it('should return paginated search results', async () => {
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockInterviewSession], 1]),
      };

      mockRepositories.interviewSession.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.searchInterviewSessions(searchDto, mockUser);

      expect(result.items).toEqual([mockInterviewSession]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('should apply access control for students', async () => {
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      mockRepositories.interviewSession.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.searchInterviewSessions(searchDto, mockCandidate);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'session.candidateId = :userId',
        { userId: mockCandidate.id }
      );
    });
  });

  describe('startInterview', () => {
    const startDto = {
      location: 'Remote',
      deviceInfo: { browser: 'Chrome', os: 'Windows' },
    };

    it('should start interview successfully', async () => {
      const scheduledSession = {
        ...mockInterviewSession,
        status: InterviewStatus.SCHEDULED,
        canStart: true,
      };

      mockRepositories.interviewSession.findOne.mockResolvedValue(scheduledSession);
      mockRepositories.interviewSession.save.mockResolvedValue({
        ...scheduledSession,
        status: InterviewStatus.IN_PROGRESS,
        startedAt: new Date(),
      });

      const result = await service.startInterview('session-1', startDto, mockUser);

      expect(result.status).toBe(InterviewStatus.IN_PROGRESS);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('interview.started', expect.any(Object));
    });

    it('should throw error if interview cannot be started', async () => {
      const futureSession = {
        ...mockInterviewSession,
        scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        canStart: false,
      };

      mockRepositories.interviewSession.findOne.mockResolvedValue(futureSession);

      await expect(service.startInterview('session-1', startDto, mockUser))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw error if user lacks permissions', async () => {
      const otherUserSession = {
        ...mockInterviewSession,
        candidateId: 'other-candidate',
        interviewerId: 'other-interviewer',
      };

      mockRepositories.interviewSession.findOne.mockResolvedValue(otherUserSession);

      await expect(service.startInterview('session-1', startDto, mockUser))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('completeInterview', () => {
    const completeDto = {
      score: 85,
      feedback: { technical: 'Good', communication: 'Excellent' },
      notes: 'Strong candidate',
    };

    it('should complete interview successfully', async () => {
      const inProgressSession = {
        ...mockInterviewSession,
        status: InterviewStatus.IN_PROGRESS,
        interviewerId: mockUser.id,
      };

      mockRepositories.interviewSession.findOne.mockResolvedValue(inProgressSession);
      mockRepositories.interviewSession.save.mockResolvedValue({
        ...inProgressSession,
        status: InterviewStatus.COMPLETED,
        score: completeDto.score,
        feedback: completeDto.feedback,
        notes: completeDto.notes,
        endedAt: new Date(),
      });

      const result = await service.completeInterview('session-1', completeDto, mockUser);

      expect(result.status).toBe(InterviewStatus.COMPLETED);
      expect(result.score).toBe(completeDto.score);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('interview.completed', expect.any(Object));
    });

    it('should throw error if user is not the interviewer', async () => {
      const otherInterviewerSession = {
        ...mockInterviewSession,
        interviewerId: 'other-interviewer',
      };

      mockRepositories.interviewSession.findOne.mockResolvedValue(otherInterviewerSession);

      await expect(service.completeInterview('session-1', completeDto, mockUser))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('rescheduleInterview', () => {
    const rescheduleDto = {
      newScheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 2 days from now
      reason: 'Scheduling conflict',
    };

    it('should reschedule interview successfully', async () => {
      const reschedulableSession = {
        ...mockInterviewSession,
        canReschedule: true,
        candidateId: mockUser.id, // User is the candidate
      };

      mockRepositories.interviewSession.findOne.mockResolvedValue(reschedulableSession);
      mockRepositories.interviewSession.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]), // No conflicts
      });
      mockRepositories.interviewSession.save.mockResolvedValue({
        ...reschedulableSession,
        scheduledAt: new Date(rescheduleDto.newScheduledAt),
      });

      const result = await service.rescheduleInterview('session-1', rescheduleDto, mockUser);

      expect(result.scheduledAt).toEqual(new Date(rescheduleDto.newScheduledAt));
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('interview.rescheduled', expect.any(Object));
    });

    it('should throw error if interview cannot be rescheduled', async () => {
      const nonReschedulableSession = {
        ...mockInterviewSession,
        canReschedule: false,
      };

      mockRepositories.interviewSession.findOne.mockResolvedValue(nonReschedulableSession);

      await expect(service.rescheduleInterview('session-1', rescheduleDto, mockUser))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('cancelInterview', () => {
    const reason = 'Emergency cancellation';

    it('should cancel interview successfully', async () => {
      const cancellableSession = {
        ...mockInterviewSession,
        interviewerId: mockUser.id,
      };

      mockRepositories.interviewSession.findOne.mockResolvedValue(cancellableSession);
      mockRepositories.interviewSession.save.mockResolvedValue({
        ...cancellableSession,
        status: InterviewStatus.CANCELLED,
      });

      const result = await service.cancelInterview('session-1', reason, mockUser);

      expect(result.status).toBe(InterviewStatus.CANCELLED);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('interview.cancelled', expect.any(Object));
    });
  });

  describe('getUpcomingInterviews', () => {
    it('should return upcoming interviews for user', async () => {
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockInterviewSession]),
      };

      mockRepositories.interviewSession.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getUpcomingInterviews(mockUser.id, mockUser);

      expect(result).toEqual([mockInterviewSession]);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'session.status = :status',
        { status: InterviewStatus.SCHEDULED }
      );
    });

    it('should apply student access control', async () => {
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockRepositories.interviewSession.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.getUpcomingInterviews(mockCandidate.id, mockCandidate);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'session.candidateId = :userId',
        { userId: mockCandidate.id }
      );
    });
  });

  describe('getInterviewHistory', () => {
    it('should return interview history for user', async () => {
      const completedSession = {
        ...mockInterviewSession,
        status: InterviewStatus.COMPLETED,
      };

      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([completedSession]),
      };

      mockRepositories.interviewSession.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getInterviewHistory(mockUser.id, mockUser);

      expect(result).toEqual([completedSession]);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'session.status IN (:...statuses)',
        { 
          statuses: [InterviewStatus.COMPLETED, InterviewStatus.CANCELLED, InterviewStatus.NO_SHOW] 
        }
      );
    });
  });

  describe('private helper methods', () => {
    it('should validate create permissions correctly', async () => {
      const studentUser = { ...mockUser, role: UserRole.STUDENT };
      const createDto = { candidateId: 'candidate-1' };

      await expect(service['validateCreatePermissions'](createDto, studentUser))
        .rejects.toThrow(ForbiddenException);
    });

    it('should validate view permissions correctly', async () => {
      const unauthorizedSession = {
        ...mockInterviewSession,
        candidateId: 'other-candidate',
        interviewerId: 'other-interviewer',
        organizationId: 'other-org',
      };
      const unauthorizedUser = { 
        ...mockUser, 
        id: 'unauthorized-user',
        organizationId: 'other-org',
        role: UserRole.STUDENT 
      };

      await expect(service['validateViewPermissions'](unauthorizedSession, unauthorizedUser))
        .rejects.toThrow(ForbiddenException);
    });

    it('should validate status transitions correctly', () => {
      // Valid transition
      expect(() => service['validateStatusTransition'](
        InterviewStatus.SCHEDULED, 
        InterviewStatus.IN_PROGRESS
      )).not.toThrow();

      // Invalid transition
      expect(() => service['validateStatusTransition'](
        InterviewStatus.COMPLETED, 
        InterviewStatus.SCHEDULED
      )).toThrow(BadRequestException);
    });

    it('should check scheduling conflicts correctly', async () => {
      const conflictingSession = {
        ...mockInterviewSession,
        scheduledAt: new Date(),
      };

      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([conflictingSession]),
      };

      mockRepositories.interviewSession.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await expect(service['checkSchedulingConflicts'](
        new Date().toISOString(),
        'candidate-1',
        'interviewer-1'
      )).rejects.toThrow(BadRequestException);
    });
  });
});
