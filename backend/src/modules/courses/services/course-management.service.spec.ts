import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { CourseManagementService } from './course-management.service';
import { Course, CourseStatus, CourseDifficulty, CourseAccessType } from '../../../database/entities/course.entity';
import { Module } from '../../../database/entities/module.entity';
import { Lesson } from '../../../database/entities/lesson.entity';
import { Enrollment } from '../../../database/entities/enrollment.entity';
import { User, UserRole } from '../../../database/entities/user.entity';

describe('CourseManagementService', () => {
  let service: CourseManagementService;
  let courseRepository: Repository<Course>;
  let moduleRepository: Repository<Module>;
  let lessonRepository: Repository<Lesson>;
  let enrollmentRepository: Repository<Enrollment>;
  let eventEmitter: EventEmitter2;

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.INSTRUCTOR,
  } as User;

  const mockCourse: Course = {
    id: 'course-1',
    title: 'Test Course',
    description: 'Test Description',
    slug: 'test-course',
    status: CourseStatus.DRAFT,
    difficulty: CourseDifficulty.BEGINNER,
    accessType: CourseAccessType.PUBLIC,
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Course;

  const mockCourseRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockModuleRepository = {
    count: jest.fn(),
  };

  const mockLessonRepository = {
    count: jest.fn(),
  };

  const mockEnrollmentRepository = {
    count: jest.fn(),
    find: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseManagementService,
        {
          provide: getRepositoryToken(Course),
          useValue: mockCourseRepository,
        },
        {
          provide: getRepositoryToken(Module),
          useValue: mockModuleRepository,
        },
        {
          provide: getRepositoryToken(Lesson),
          useValue: mockLessonRepository,
        },
        {
          provide: getRepositoryToken(Enrollment),
          useValue: mockEnrollmentRepository,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<CourseManagementService>(CourseManagementService);
    courseRepository = module.get<Repository<Course>>(getRepositoryToken(Course));
    moduleRepository = module.get<Repository<Module>>(getRepositoryToken(Module));
    lessonRepository = module.get<Repository<Lesson>>(getRepositoryToken(Lesson));
    enrollmentRepository = module.get<Repository<Enrollment>>(getRepositoryToken(Enrollment));
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createCourse', () => {
    const createCourseDto = {
      title: 'New Course',
      description: 'New Description',
      difficulty: CourseDifficulty.BEGINNER,
      accessType: CourseAccessType.PUBLIC,
    };

    it('should create a course successfully', async () => {
      const expectedCourse = {
        ...mockCourse,
        ...createCourseDto,
        slug: 'new-course',
      };

      mockCourseRepository.create.mockReturnValue(expectedCourse);
      mockCourseRepository.save.mockResolvedValue(expectedCourse);

      const result = await service.createCourse(createCourseDto, mockUser);

      expect(mockCourseRepository.create).toHaveBeenCalledWith({
        ...createCourseDto,
        slug: 'new-course',
        createdBy: mockUser.id,
        status: CourseStatus.DRAFT,
      });
      expect(mockCourseRepository.save).toHaveBeenCalledWith(expectedCourse);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('course.created', expectedCourse);
      expect(result).toEqual(expectedCourse);
    });

    it('should throw error if user lacks permissions', async () => {
      const studentUser = { ...mockUser, role: UserRole.STUDENT };

      await expect(service.createCourse(createCourseDto, studentUser))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('getCourseById', () => {
    it('should return course when found and user has access', async () => {
      mockCourseRepository.findOne.mockResolvedValue(mockCourse);

      const result = await service.getCourseById('course-1', mockUser);

      expect(mockCourseRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'course-1' },
        relations: ['instructor', 'modules', 'modules.lessons'],
      });
      expect(result).toEqual(mockCourse);
    });

    it('should throw NotFoundException when course not found', async () => {
      mockCourseRepository.findOne.mockResolvedValue(null);

      await expect(service.getCourseById('nonexistent', mockUser))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user lacks access to private course', async () => {
      const privateCourse = {
        ...mockCourse,
        accessType: CourseAccessType.PRIVATE,
        createdBy: 'other-user',
      };
      const studentUser = { ...mockUser, role: UserRole.STUDENT };

      mockCourseRepository.findOne.mockResolvedValue(privateCourse);

      await expect(service.getCourseById('course-1', studentUser))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('searchCourses', () => {
    const searchDto = {
      search: 'test',
      page: 1,
      limit: 10,
      sortBy: 'title',
      sortOrder: 'ASC' as const,
    };

    it('should return paginated search results', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockCourse], 1]),
      };

      mockCourseRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.searchCourses(searchDto, mockUser);

      expect(result.items).toEqual([mockCourse]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('should apply search filters correctly', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      mockCourseRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.searchCourses({
        ...searchDto,
        category: 'programming',
        difficulty: CourseDifficulty.INTERMEDIATE,
      }, mockUser);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'course.category ILIKE :category',
        { category: '%programming%' }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'course.difficulty = :difficulty',
        { difficulty: CourseDifficulty.INTERMEDIATE }
      );
    });
  });

  describe('updateCourse', () => {
    const updateDto = {
      title: 'Updated Course',
      description: 'Updated Description',
    };

    it('should update course successfully', async () => {
      const updatedCourse = { ...mockCourse, ...updateDto };
      
      mockCourseRepository.findOne.mockResolvedValue(mockCourse);
      mockCourseRepository.save.mockResolvedValue(updatedCourse);

      const result = await service.updateCourse('course-1', updateDto, mockUser);

      expect(mockCourseRepository.save).toHaveBeenCalledWith({
        ...mockCourse,
        ...updateDto,
        updatedAt: expect.any(Date),
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('course.updated', updatedCourse);
      expect(result).toEqual(updatedCourse);
    });

    it('should throw NotFoundException when course not found', async () => {
      mockCourseRepository.findOne.mockResolvedValue(null);

      await expect(service.updateCourse('nonexistent', updateDto, mockUser))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user lacks permissions', async () => {
      const otherUserCourse = { ...mockCourse, createdBy: 'other-user' };
      const studentUser = { ...mockUser, role: UserRole.STUDENT };

      mockCourseRepository.findOne.mockResolvedValue(otherUserCourse);

      await expect(service.updateCourse('course-1', updateDto, studentUser))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteCourse', () => {
    it('should soft delete course successfully', async () => {
      mockCourseRepository.findOne.mockResolvedValue(mockCourse);
      mockEnrollmentRepository.count.mockResolvedValue(0);
      mockCourseRepository.save.mockResolvedValue({
        ...mockCourse,
        status: CourseStatus.ARCHIVED,
      });

      await service.deleteCourse('course-1', mockUser);

      expect(mockCourseRepository.save).toHaveBeenCalledWith({
        ...mockCourse,
        status: CourseStatus.ARCHIVED,
        updatedAt: expect.any(Date),
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('course.deleted', expect.any(Object));
    });

    it('should throw error when course has active enrollments', async () => {
      mockCourseRepository.findOne.mockResolvedValue(mockCourse);
      mockEnrollmentRepository.count.mockResolvedValue(5);

      await expect(service.deleteCourse('course-1', mockUser))
        .rejects.toThrow('Cannot delete course with active enrollments');
    });
  });

  describe('publishCourse', () => {
    it('should publish course successfully', async () => {
      const draftCourse = { ...mockCourse, status: CourseStatus.DRAFT };
      const publishedCourse = { ...draftCourse, status: CourseStatus.PUBLISHED };

      mockCourseRepository.findOne.mockResolvedValue(draftCourse);
      mockModuleRepository.count.mockResolvedValue(2);
      mockLessonRepository.count.mockResolvedValue(5);
      mockCourseRepository.save.mockResolvedValue(publishedCourse);

      const result = await service.publishCourse('course-1', mockUser);

      expect(mockCourseRepository.save).toHaveBeenCalledWith({
        ...draftCourse,
        status: CourseStatus.PUBLISHED,
        updatedAt: expect.any(Date),
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('course.published', publishedCourse);
      expect(result).toEqual(publishedCourse);
    });

    it('should throw error when course has no content', async () => {
      mockCourseRepository.findOne.mockResolvedValue(mockCourse);
      mockModuleRepository.count.mockResolvedValue(0);

      await expect(service.publishCourse('course-1', mockUser))
        .rejects.toThrow('Cannot publish course without modules');
    });

    it('should throw error when course is already published', async () => {
      const publishedCourse = { ...mockCourse, status: CourseStatus.PUBLISHED };
      
      mockCourseRepository.findOne.mockResolvedValue(publishedCourse);

      await expect(service.publishCourse('course-1', mockUser))
        .rejects.toThrow('Course is already published');
    });
  });

  describe('getCourseStatistics', () => {
    it('should return course statistics', async () => {
      mockCourseRepository.findOne.mockResolvedValue(mockCourse);
      mockEnrollmentRepository.count.mockResolvedValue(100);
      mockEnrollmentRepository.find.mockResolvedValue([
        { completedAt: new Date(), currentScore: 85 },
        { completedAt: new Date(), currentScore: 92 },
      ]);

      const result = await service.getCourseStatistics('course-1', mockUser);

      expect(result).toEqual({
        courseId: 'course-1',
        totalEnrollments: 100,
        activeEnrollments: 98,
        completedEnrollments: 2,
        completionRate: 2,
        averageRating: 0,
        totalReviews: 0,
        totalRevenue: 0,
        averageCompletionTime: 0,
      });
    });
  });

  describe('cloneCourse', () => {
    const cloneDto = {
      title: 'Cloned Course',
      includeEnrollments: false,
      includeAssessments: true,
    };

    it('should clone course successfully', async () => {
      const clonedCourse = {
        ...mockCourse,
        id: 'course-2',
        title: 'Cloned Course',
        slug: 'cloned-course',
      };

      mockCourseRepository.findOne.mockResolvedValue(mockCourse);
      mockCourseRepository.create.mockReturnValue(clonedCourse);
      mockCourseRepository.save.mockResolvedValue(clonedCourse);

      const result = await service.cloneCourse('course-1', cloneDto, mockUser);

      expect(mockCourseRepository.create).toHaveBeenCalledWith({
        title: 'Cloned Course',
        description: mockCourse.description,
        difficulty: mockCourse.difficulty,
        accessType: mockCourse.accessType,
        slug: 'cloned-course',
        createdBy: mockUser.id,
        status: CourseStatus.DRAFT,
      });
      expect(result).toEqual(clonedCourse);
    });
  });
});
