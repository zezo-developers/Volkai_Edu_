import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { AssessmentService } from './assessment.service';
import { Assessment, AssessmentType, AssessmentStatus, QuestionType } from '../../../database/entities/assessment.entity';
import { AssessmentAttempt, AssessmentAttemptStatus } from '../../../database/entities/assessment-attempt.entity';
import { Course } from '../../../database/entities/course.entity';
import { Enrollment } from '../../../database/entities/enrollment.entity';
import { User, UserRole } from '../../../database/entities/user.entity';

describe('AssessmentService', () => {
  let service: AssessmentService;
  let assessmentRepository: Repository<Assessment>;
  let attemptRepository: Repository<AssessmentAttempt>;
  let courseRepository: Repository<Course>;
  let enrollmentRepository: Repository<Enrollment>;
  let eventEmitter: EventEmitter2;

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.INSTRUCTOR,
  } as User;

  const mockAssessment: Assessment = {
    id: 'assessment-1',
    title: 'Test Assessment',
    description: 'Test Description',
    type: AssessmentType.QUIZ,
    status: AssessmentStatus.DRAFT,
    courseId: 'course-1',
    questions: [
      {
        text: 'What is 2+2?',
        type: QuestionType.MULTIPLE_CHOICE,
        points: 10,
        options: [
          { text: '3', isCorrect: false },
          { text: '4', isCorrect: true },
          { text: '5', isCorrect: false },
        ],
      },
    ],
    questionCount: 1,
    totalPoints: 10,
    timeLimit: 30,
    maxAttempts: 3,
    passingScore: 70,
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Assessment;

  const mockAttempt: AssessmentAttempt = {
    id: 'attempt-1',
    assessmentId: 'assessment-1',
    userId: 'user-2',
    status: AssessmentAttemptStatus.IN_PROGRESS,
    startedAt: new Date(),
    answers: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as AssessmentAttempt;

  const mockRepositories = {
    assessment: {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    attempt: {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
    },
    course: {
      findOne: jest.fn(),
    },
    enrollment: {
      findOne: jest.fn(),
    },
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentService,
        {
          provide: getRepositoryToken(Assessment),
          useValue: mockRepositories.assessment,
        },
        {
          provide: getRepositoryToken(AssessmentAttempt),
          useValue: mockRepositories.attempt,
        },
        {
          provide: getRepositoryToken(Course),
          useValue: mockRepositories.course,
        },
        {
          provide: getRepositoryToken(Enrollment),
          useValue: mockRepositories.enrollment,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<AssessmentService>(AssessmentService);
    assessmentRepository = module.get<Repository<Assessment>>(getRepositoryToken(Assessment));
    attemptRepository = module.get<Repository<AssessmentAttempt>>(getRepositoryToken(AssessmentAttempt));
    courseRepository = module.get<Repository<Course>>(getRepositoryToken(Course));
    enrollmentRepository = module.get<Repository<Enrollment>>(getRepositoryToken(Enrollment));
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createAssessment', () => {
    const createAssessmentDto = {
      title: 'New Assessment',
      description: 'New Description',
      type: AssessmentType.QUIZ,
      courseId: 'course-1',
      questions: [
        {
          text: 'Sample question?',
          type: QuestionType.MULTIPLE_CHOICE,
          points: 5,
          options: [
            { text: 'Option A', isCorrect: true },
            { text: 'Option B', isCorrect: false },
          ],
        },
      ],
      timeLimit: 60,
      maxAttempts: 2,
      passingScore: 80,
    };

    it('should create assessment successfully', async () => {
      const expectedAssessment = {
        ...mockAssessment,
        ...createAssessmentDto,
        slug: 'new-assessment',
        questionCount: 1,
        totalPoints: 5,
      };

      mockRepositories.course.findOne.mockResolvedValue({ id: 'course-1', createdBy: 'user-1' });
      mockRepositories.assessment.create.mockReturnValue(expectedAssessment);
      mockRepositories.assessment.save.mockResolvedValue(expectedAssessment);

      const result = await service.createAssessment(createAssessmentDto, mockUser);

      expect(mockRepositories.assessment.create).toHaveBeenCalledWith({
        ...createAssessmentDto,
        slug: 'new-assessment',
        createdBy: mockUser.id,
        status: AssessmentStatus.DRAFT,
        questionCount: 1,
        totalPoints: 5,
      });
      expect(mockRepositories.assessment.save).toHaveBeenCalledWith(expectedAssessment);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('assessment.created', expectedAssessment);
      expect(result).toEqual(expectedAssessment);
    });

    it('should throw error if course not found', async () => {
      mockRepositories.course.findOne.mockResolvedValue(null);

      await expect(service.createAssessment(createAssessmentDto, mockUser))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw error if user lacks permissions', async () => {
      const studentUser = { ...mockUser, role: UserRole.STUDENT };
      mockRepositories.course.findOne.mockResolvedValue({ id: 'course-1', createdBy: 'other-user' });

      await expect(service.createAssessment(createAssessmentDto, studentUser))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('getAssessmentById', () => {
    it('should return assessment when found and user has access', async () => {
      mockRepositories.assessment.findOne.mockResolvedValue(mockAssessment);

      const result = await service.getAssessmentById('assessment-1', mockUser);

      expect(mockRepositories.assessment.findOne).toHaveBeenCalledWith({
        where: { id: 'assessment-1' },
        relations: ['course'],
      });
      expect(result).toEqual(mockAssessment);
    });

    it('should throw NotFoundException when assessment not found', async () => {
      mockRepositories.assessment.findOne.mockResolvedValue(null);

      await expect(service.getAssessmentById('nonexistent', mockUser))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('startAssessmentAttempt', () => {
    const startAttemptDto = {
      enrollmentId: 'enrollment-1',
    };

    it('should start assessment attempt successfully', async () => {
      const publishedAssessment = { ...mockAssessment, status: AssessmentStatus.PUBLISHED };
      const enrollment = { id: 'enrollment-1', userId: 'user-2', courseId: 'course-1' };
      const newAttempt = { ...mockAttempt, id: 'new-attempt' };

      mockRepositories.assessment.findOne.mockResolvedValue(publishedAssessment);
      mockRepositories.enrollment.findOne.mockResolvedValue(enrollment);
      mockRepositories.attempt.count.mockResolvedValue(0);
      mockRepositories.attempt.create.mockReturnValue(newAttempt);
      mockRepositories.attempt.save.mockResolvedValue(newAttempt);

      const result = await service.startAssessmentAttempt('assessment-1', 'user-2', startAttemptDto);

      expect(mockRepositories.attempt.create).toHaveBeenCalledWith({
        assessmentId: 'assessment-1',
        userId: 'user-2',
        enrollmentId: 'enrollment-1',
        status: AssessmentAttemptStatus.IN_PROGRESS,
        startedAt: expect.any(Date),
        answers: [],
        metadata: {},
      });
      expect(mockRepositories.attempt.save).toHaveBeenCalledWith(newAttempt);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('assessment.attempt.started', expect.any(Object));
      expect(result).toEqual(newAttempt);
    });

    it('should throw error if assessment is not published', async () => {
      mockRepositories.assessment.findOne.mockResolvedValue(mockAssessment);

      await expect(service.startAssessmentAttempt('assessment-1', 'user-2', startAttemptDto))
        .rejects.toThrow('Assessment is not published');
    });

    it('should throw error if max attempts exceeded', async () => {
      const publishedAssessment = { ...mockAssessment, status: AssessmentStatus.PUBLISHED, maxAttempts: 1 };
      const enrollment = { id: 'enrollment-1', userId: 'user-2', courseId: 'course-1' };

      mockRepositories.assessment.findOne.mockResolvedValue(publishedAssessment);
      mockRepositories.enrollment.findOne.mockResolvedValue(enrollment);
      mockRepositories.attempt.count.mockResolvedValue(1);

      await expect(service.startAssessmentAttempt('assessment-1', 'user-2', startAttemptDto))
        .rejects.toThrow('Maximum attempts exceeded');
    });
  });

  describe('submitAssessmentAttempt', () => {
    const submitDto = {
      answers: [
        {
          questionIndex: 0,
          answer: 1, // Index of correct answer
          timeSpent: 15000,
        },
      ],
      totalTimeSpent: 15000,
    };

    it('should submit assessment attempt successfully', async () => {
      const inProgressAttempt = { ...mockAttempt, status: AssessmentAttemptStatus.IN_PROGRESS };
      const submittedAttempt = {
        ...inProgressAttempt,
        status: AssessmentAttemptStatus.SUBMITTED,
        submittedAt: expect.any(Date),
        answers: submitDto.answers,
        timeSpent: submitDto.totalTimeSpent,
        score: 10,
        scorePercentage: 100,
        passed: true,
      };

      mockRepositories.attempt.findOne.mockResolvedValue(inProgressAttempt);
      mockRepositories.assessment.findOne.mockResolvedValue(mockAssessment);
      mockRepositories.attempt.save.mockResolvedValue(submittedAttempt);

      const result = await service.submitAssessmentAttempt('attempt-1', 'user-2', submitDto);

      expect(mockRepositories.attempt.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AssessmentAttemptStatus.SUBMITTED,
          submittedAt: expect.any(Date),
          answers: submitDto.answers,
          timeSpent: submitDto.totalTimeSpent,
          score: 10,
          scorePercentage: 100,
          passed: true,
        })
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('assessment.attempt.submitted', expect.any(Object));
      expect(result).toEqual(submittedAttempt);
    });

    it('should throw error if attempt not found', async () => {
      mockRepositories.attempt.findOne.mockResolvedValue(null);

      await expect(service.submitAssessmentAttempt('nonexistent', 'user-2', submitDto))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw error if attempt already submitted', async () => {
      const submittedAttempt = { ...mockAttempt, status: AssessmentAttemptStatus.SUBMITTED };
      mockRepositories.attempt.findOne.mockResolvedValue(submittedAttempt);

      await expect(service.submitAssessmentAttempt('attempt-1', 'user-2', submitDto))
        .rejects.toThrow('Assessment attempt already submitted');
    });

    it('should throw error if user does not own attempt', async () => {
      mockRepositories.attempt.findOne.mockResolvedValue(mockAttempt);

      await expect(service.submitAssessmentAttempt('attempt-1', 'wrong-user', submitDto))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('addQuestion', () => {
    const addQuestionDto = {
      text: 'New question?',
      type: QuestionType.TRUE_FALSE,
      points: 5,
      correctAnswer: 'true',
    };

    it('should add question successfully', async () => {
      const updatedAssessment = {
        ...mockAssessment,
        questions: [...mockAssessment.questions, addQuestionDto],
        questionCount: 2,
        totalPoints: 15,
      };

      mockRepositories.assessment.findOne.mockResolvedValue(mockAssessment);
      mockRepositories.assessment.save.mockResolvedValue(updatedAssessment);

      const result = await service.addQuestion('assessment-1', addQuestionDto, mockUser);

      expect(mockRepositories.assessment.save).toHaveBeenCalledWith({
        ...mockAssessment,
        questions: [...mockAssessment.questions, addQuestionDto],
        questionCount: 2,
        totalPoints: 15,
        updatedAt: expect.any(Date),
      });
      expect(result).toEqual(updatedAssessment);
    });

    it('should throw error if assessment is published', async () => {
      const publishedAssessment = { ...mockAssessment, status: AssessmentStatus.PUBLISHED };
      mockRepositories.assessment.findOne.mockResolvedValue(publishedAssessment);

      await expect(service.addQuestion('assessment-1', addQuestionDto, mockUser))
        .rejects.toThrow('Cannot modify published assessment');
    });
  });

  describe('publishAssessment', () => {
    it('should publish assessment successfully', async () => {
      const publishedAssessment = { ...mockAssessment, status: AssessmentStatus.PUBLISHED };

      mockRepositories.assessment.findOne.mockResolvedValue(mockAssessment);
      mockRepositories.assessment.save.mockResolvedValue(publishedAssessment);

      const result = await service.publishAssessment('assessment-1', mockUser);

      expect(mockRepositories.assessment.save).toHaveBeenCalledWith({
        ...mockAssessment,
        status: AssessmentStatus.PUBLISHED,
        updatedAt: expect.any(Date),
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('assessment.published', publishedAssessment);
      expect(result).toEqual(publishedAssessment);
    });

    it('should throw error if assessment has no questions', async () => {
      const emptyAssessment = { ...mockAssessment, questions: [] };
      mockRepositories.assessment.findOne.mockResolvedValue(emptyAssessment);

      await expect(service.publishAssessment('assessment-1', mockUser))
        .rejects.toThrow('Cannot publish assessment without questions');
    });

    it('should throw error if assessment is already published', async () => {
      const publishedAssessment = { ...mockAssessment, status: AssessmentStatus.PUBLISHED };
      mockRepositories.assessment.findOne.mockResolvedValue(publishedAssessment);

      await expect(service.publishAssessment('assessment-1', mockUser))
        .rejects.toThrow('Assessment is already published');
    });
  });

  describe('flagAttemptForReview', () => {
    it('should flag attempt for review successfully', async () => {
      const flaggedAttempt = {
        ...mockAttempt,
        flaggedForReview: true,
        flagReason: 'Suspicious activity detected',
      };

      mockRepositories.attempt.findOne.mockResolvedValue(mockAttempt);
      mockRepositories.attempt.save.mockResolvedValue(flaggedAttempt);

      const result = await service.flagAttemptForReview('attempt-1', 'Suspicious activity detected', mockUser);

      expect(mockRepositories.attempt.save).toHaveBeenCalledWith({
        ...mockAttempt,
        flaggedForReview: true,
        flagReason: 'Suspicious activity detected',
        updatedAt: expect.any(Date),
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('assessment.attempt.flagged', expect.any(Object));
      expect(result).toEqual(flaggedAttempt);
    });
  });

  describe('grading', () => {
    it('should calculate score correctly for multiple choice questions', () => {
      const questions = [
        {
          type: QuestionType.MULTIPLE_CHOICE,
          points: 10,
          options: [
            { text: 'A', isCorrect: false },
            { text: 'B', isCorrect: true },
            { text: 'C', isCorrect: false },
          ],
        },
      ];

      const answers = [{ questionIndex: 0, answer: 1 }]; // Correct answer

      const score = service['calculateScore'](questions, answers);
      expect(score).toBe(10);
    });

    it('should calculate score correctly for true/false questions', () => {
      const questions = [
        {
          type: QuestionType.TRUE_FALSE,
          points: 5,
          correctAnswer: 'true',
        },
      ];

      const answers = [{ questionIndex: 0, answer: 'true' }]; // Correct answer

      const score = service['calculateScore'](questions, answers);
      expect(score).toBe(5);
    });

    it('should return 0 for incorrect answers', () => {
      const questions = [
        {
          type: QuestionType.MULTIPLE_CHOICE,
          points: 10,
          options: [
            { text: 'A', isCorrect: false },
            { text: 'B', isCorrect: true },
            { text: 'C', isCorrect: false },
          ],
        },
      ];

      const answers = [{ questionIndex: 0, answer: 0 }]; // Incorrect answer

      const score = service['calculateScore'](questions, answers);
      expect(score).toBe(0);
    });
  });
});
