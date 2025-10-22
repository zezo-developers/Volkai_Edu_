import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { 
  Enrollment, 
  EnrollmentStatus 
} from '@database/entities/enrollment.entity';
import { 
  LessonProgress, 
  LessonProgressStatus 
} from '@database/entities/lesson-progress.entity';
import { Course } from '@database/entities/course.entity';
import { Module } from '@database/entities/module.entity';
import { Lesson } from '@database/entities/lesson.entity';
import { AuthenticatedUser } from '@modules/auth/strategies/jwt.strategy';

/**
 * Enrollment request interface
 */
export interface EnrollmentRequest {
  courseId: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Progress update interface
 */
export interface ProgressUpdateRequest {
  lessonId: string;
  progressPercentage?: number;
  timeSpentSeconds?: number;
  videoWatchedSeconds?: number;
  audioListenedSeconds?: number;
  totalDurationSeconds?: number;
  bookmarkPosition?: number;
  completedSections?: string[];
  interactionData?: Record<string, unknown>;
  quizResponses?: Record<string, unknown>;
  notes?: string;
  rating?: number;
  feedback?: string;
}

/**
 * Enrollment search filters interface
 */
export interface EnrollmentSearchFilters {
  userId?: string;
  courseId?: string;
  status?: EnrollmentStatus;
  progressMin?: number;
  progressMax?: number;
  enrolledFrom?: Date;
  enrolledTo?: Date;
  completedFrom?: Date;
  completedTo?: Date;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'enrolledAt' | 'progressPercentage' | 'completedAt' | 'totalTimeSpentMinutes';
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Progress analytics interface
 */
export interface ProgressAnalytics {
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  averageProgress: number;
  averageCompletionTime: number;
  engagementMetrics: {
    highEngagement: number;
    mediumEngagement: number;
    lowEngagement: number;
  };
  progressDistribution: Record<string, number>;
  completionRate: number;
  dropoffPoints: Array<{
    lessonId: string;
    lessonTitle: string;
    dropoffRate: number;
  }>;
}

/**
 * Enrollment Service
 * Handles course enrollments, progress tracking, and analytics
 */
@Injectable()
export class EnrollmentService {
  private readonly logger = new Logger(EnrollmentService.name);

  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(LessonProgress)
    private readonly lessonProgressRepository: Repository<LessonProgress>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Module)
    private readonly moduleRepository: Repository<Module>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Enroll user in course
   */
  async enrollUser(
    request: EnrollmentRequest,
    currentUser: AuthenticatedUser | any,
  ): Promise<Enrollment> {
    this.logger.log(`Enrolling user ${currentUser.id} in course: ${request.courseId}`);

    try {
      // Check if course exists and is available
      const course = await this.courseRepository.findOne({
        where: { id: request.courseId },
        relations: ['modules', 'modules.lessons'],
      });

      if (!course) {
        throw new NotFoundException(`Course not found: ${request.courseId}`);
      }

      if (!course.canEnroll(currentUser.id, currentUser.currentOrganizationId)) {
        throw new BadRequestException('Course is not available for enrollment');
      }

      // Check if user is already enrolled
      const existingEnrollment = await this.enrollmentRepository.findOne({
        where: {
          userId: currentUser.id,
          courseId: request.courseId,
        },
      });

      if (existingEnrollment) {
        if (existingEnrollment.isActive || existingEnrollment.isCompleted) {
          throw new ConflictException('User is already enrolled in this course');
        }
        
        // Reactivate cancelled/expired enrollment
        existingEnrollment.status = EnrollmentStatus.ACTIVE;
        existingEnrollment.enrolledAt = new Date();
        existingEnrollment.updateLastAccessed();
        
        const savedEnrollment = await this.enrollmentRepository.save(existingEnrollment);
        
        // Emit enrollment reactivated event
        this.eventEmitter.emit('enrollment.reactivated', {
          enrollmentId: savedEnrollment.id,
          userId: currentUser.id,
          courseId: request.courseId,
        });
        
        return savedEnrollment;
      }

      // Calculate total lessons for progress tracking
      const totalLessons = course.modules?.reduce((sum, module) => 
        sum + (module.lessons?.length || 0), 0) || 0;

      // Create new enrollment
      const enrollment = this.enrollmentRepository.create({
        userId: currentUser.id,
        courseId: request.courseId,
        status: course.requiresApproval ? EnrollmentStatus.PENDING : EnrollmentStatus.ACTIVE,
        totalLessons,
        notes: request.notes,
        metadata: request.metadata || {},
        receiveNotifications: true,
      });

      if (!course.requiresApproval) {
        enrollment.start();
      }

      const savedEnrollment = await this.enrollmentRepository.save(enrollment);

      // Update course enrollment count
      await this.courseRepository.update(request.courseId, {
        totalEnrollments: course.totalEnrollments + 1,
      });

      // Initialize lesson progress records
      if (course.modules && course.modules.length > 0) {
        await this.initializeLessonProgress(savedEnrollment, course.modules);
      }

      // Emit enrollment created event
      this.eventEmitter.emit('enrollment.created', {
        enrollmentId: savedEnrollment.id,
        userId: currentUser.id,
        courseId: request.courseId,
        status: savedEnrollment.status,
        requiresApproval: course.requiresApproval,
      });

      this.logger.log(`User enrolled successfully: ${savedEnrollment.id}`);
      return savedEnrollment;
    } catch (error) {
      this.logger.error(`Failed to enroll user ${currentUser.id} in course ${request.courseId}:`, error);
      throw error;
    }
  }

  /**
   * Get user's enrollment for a course
   */
  async getUserEnrollment(
    courseId: string,
    currentUser: AuthenticatedUser,
  ): Promise<Enrollment | null> {
    return await this.enrollmentRepository.findOne({
      where: {
        userId: currentUser.id,
        courseId,
      },
      relations: ['course', 'lessonProgress', 'lessonProgress.lesson'],
    });
  }

  /**
   * Get user's enrollments
   */
  async getUserEnrollments(
    currentUser: AuthenticatedUser,
    filters?: Partial<EnrollmentSearchFilters>,
  ): Promise<{
    enrollments: Enrollment[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      status,
      progressMin,
      progressMax,
      enrolledFrom,
      enrolledTo,
      page = 1,
      limit = 20,
      sortBy = 'enrolledAt',
      sortOrder = 'DESC',
    } = filters || {};

    const queryBuilder = this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.course', 'course')
      .where('enrollment.userId = :userId', { userId: currentUser.id });

    // Apply filters
    if (status) {
      queryBuilder.andWhere('enrollment.status = :status', { status });
    }

    if (progressMin !== undefined) {
      queryBuilder.andWhere('enrollment.progressPercentage >= :progressMin', { progressMin });
    }

    if (progressMax !== undefined) {
      queryBuilder.andWhere('enrollment.progressPercentage <= :progressMax', { progressMax });
    }

    if (enrolledFrom) {
      queryBuilder.andWhere('enrollment.enrolledAt >= :enrolledFrom', { enrolledFrom });
    }

    if (enrolledTo) {
      queryBuilder.andWhere('enrollment.enrolledAt <= :enrolledTo', { enrolledTo });
    }

    queryBuilder.andWhere('enrollment.isArchived = false');

    // Apply sorting
    queryBuilder.orderBy(`enrollment.${sortBy}`, sortOrder);

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const offset = (page - 1) * limit;
    const enrollments = await queryBuilder.skip(offset).take(limit).getMany();

    return {
      enrollments,
      total,
      page,
      limit,
    };
  }

  /**
   * Update lesson progress
   */
  async updateLessonProgress(
    enrollmentId: string,
    request: ProgressUpdateRequest | any,
    currentUser: AuthenticatedUser,
  ): Promise<LessonProgress> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: enrollmentId },
      relations: ['course'],
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment not found: ${enrollmentId}`);
    }

    if (enrollment.userId !== currentUser.id) {
      throw new ForbiddenException('Access denied to this enrollment');
    }

    if (!enrollment.canAccess) {
      throw new BadRequestException('Enrollment is not active');
    }

    // Get or create lesson progress
    let lessonProgress = await this.lessonProgressRepository.findOne({
      where: {
        userId: currentUser.id,
        lessonId: request.lessonId,
        enrollmentId,
      },
      relations: ['lesson'],
    });

    if (!lessonProgress) {
      // Verify lesson belongs to the course
      const lesson = await this.lessonRepository.findOne({
        where: { id: request.lessonId },
        relations: ['module'],
      });

      if (!lesson || lesson.module?.courseId !== enrollment.courseId) {
        throw new BadRequestException('Lesson does not belong to this course');
      }

      lessonProgress = this.lessonProgressRepository.create({
        userId: currentUser.id,
        lessonId: request.lessonId,
        enrollmentId,
        totalDurationSeconds: request.totalDurationSeconds || 0,
      });
    }

    // Update progress data
    if (request.progressPercentage !== undefined) {
      lessonProgress.updateProgress(request.progressPercentage);
    }

    if (request.timeSpentSeconds !== undefined) {
      lessonProgress.addTimeSpent(request.timeSpentSeconds);
    }

    if (request.videoWatchedSeconds !== undefined) {
      lessonProgress.updateVideoProgress(
        request.videoWatchedSeconds,
        request.totalDurationSeconds,
      );
    }

    if (request.audioListenedSeconds !== undefined) {
      lessonProgress.updateAudioProgress(
        request.audioListenedSeconds,
        request.totalDurationSeconds,
      );
    }

    if (request.bookmarkPosition !== undefined) {
      lessonProgress.setBookmark(request.bookmarkPosition);
    }

    if (request.completedSections) {
      for (const sectionId of request.completedSections) {
        lessonProgress.completeSection(sectionId);
      }
    }

    if (request.interactionData) {
      lessonProgress.setInteractionData(request.interactionData);
    }

    if (request.quizResponses) {
      lessonProgress.setQuizResponses(request.quizResponses);
    }

    if (request.notes) {
      lessonProgress.addNotes(request.notes);
    }

    if (request.rating && request.feedback) {
      lessonProgress.setRating(request.rating, request.feedback);
    }

    const savedProgress = await this.lessonProgressRepository.save(lessonProgress);

    // Update enrollment progress
    await this.updateEnrollmentProgress(enrollment);

    // Emit progress updated event
    this.eventEmitter.emit('lesson.progressUpdated', {
      enrollmentId,
      lessonId: request.lessonId,
      userId: currentUser.id,
      progressPercentage: savedProgress.progressPercentage,
      isCompleted: savedProgress.isCompleted,
    });

    return savedProgress;
  }

  /**
   * Complete lesson
   */
  async completeLesson(
    enrollmentId: string,
    lessonId: string,
    score?: number,
    currentUser?: AuthenticatedUser,
  ): Promise<LessonProgress> {
    const lessonProgress = await this.updateLessonProgress(
      enrollmentId,
      { lessonId, progressPercentage: 100 },
      currentUser,
    );

    lessonProgress.complete(score);
    const savedProgress = await this.lessonProgressRepository.save(lessonProgress);

    // Update enrollment progress
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: enrollmentId },
    });

    if (enrollment) {
      await this.updateEnrollmentProgress(enrollment);
    }

    // Emit lesson completed event
    this.eventEmitter.emit('lesson.completed', {
      enrollmentId,
      lessonId,
      userId: currentUser.id,
      score,
      timeSpent: savedProgress.timeSpentSeconds,
    });

    return savedProgress;
  }

  /**
   * Get enrollment progress analytics
   */
  async getEnrollmentProgress(
    enrollmentId: string,
    currentUser: AuthenticatedUser,
  ): Promise<{
    enrollment: Enrollment;
    moduleProgress: Array<{
      moduleId: string;
      moduleTitle: string;
      completedLessons: number;
      totalLessons: number;
      progressPercentage: number;
      timeSpent: number;
    }>;
    recentActivity: LessonProgress[];
    nextLesson?: {
      lessonId: string;
      lessonTitle: string;
      moduleTitle: string;
    };
  }> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: enrollmentId },
      relations: ['course', 'lessonProgress', 'lessonProgress.lesson', 'lessonProgress.lesson.module'],
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment not found: ${enrollmentId}`);
    }

    if (enrollment.userId !== currentUser.id && 
        !currentUser.permissions?.includes('enrollments:manage')) {
      throw new ForbiddenException('Access denied to this enrollment');
    }

    // Calculate module progress
    const modules = await this.moduleRepository.find({
      where: { courseId: enrollment.courseId },
      relations: ['lessons'],
      order: { sortOrder: 'ASC' },
    });

    const moduleProgress = modules.map(module => {
      const moduleLessons = module.lessons || [];
      const completedLessons = moduleLessons.filter(lesson => {
        const progress = enrollment.lessonProgress?.find(p => p.lessonId === lesson.id);
        return progress?.isCompleted;
      }).length;

      const timeSpent = moduleLessons.reduce((sum, lesson) => {
        const progress = enrollment.lessonProgress?.find(p => p.lessonId === lesson.id);
        return sum + (progress?.timeSpentSeconds || 0);
      }, 0);

      return {
        moduleId: module.id,
        moduleTitle: module.title,
        completedLessons,
        totalLessons: moduleLessons.length,
        progressPercentage: moduleLessons.length > 0 
          ? Math.round((completedLessons / moduleLessons.length) * 100)
          : 0,
        timeSpent,
      };
    });

    // Get recent activity
    const recentActivity = await this.lessonProgressRepository.find({
      where: { enrollmentId },
      relations: ['lesson'],
      order: { updatedAt: 'DESC' },
      take: 10,
    });

    // Find next lesson
    let nextLesson: { lessonId: string; lessonTitle: string; moduleTitle: string } | undefined;
    
    for (const module of modules) {
      const lessons = module.lessons?.sort((a, b) => a.sortOrder - b.sortOrder) || [];
      
      for (const lesson of lessons) {
        const progress = enrollment.lessonProgress?.find(p => p.lessonId === lesson.id);
        
        if (!progress || !progress.isCompleted) {
          nextLesson = {
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            moduleTitle: module.title,
          };
          break;
        }
      }
      
      if (nextLesson) break;
    }

    return {
      enrollment,
      moduleProgress,
      recentActivity,
      nextLesson,
    };
  }

  /**
   * Get course progress analytics
   */
  async getCourseProgressAnalytics(
    courseId: string,
    currentUser: AuthenticatedUser,
  ): Promise<ProgressAnalytics> {
    // Verify access to course
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException(`Course not found: ${courseId}`);
    }

    if (course.instructorId !== currentUser.id && 
        !currentUser.permissions?.includes('analytics:read')) {
      throw new ForbiddenException('Access denied to course analytics');
    }

    const enrollments = await this.enrollmentRepository.find({
      where: { courseId },
      relations: ['lessonProgress'],
    });

    const totalEnrollments = enrollments.length;
    const activeEnrollments = enrollments.filter(e => e.isActive).length;
    const completedEnrollments = enrollments.filter(e => e.isCompleted).length;

    const averageProgress = totalEnrollments > 0
      ? enrollments.reduce((sum, e) => sum + e.progressPercentage, 0) / totalEnrollments
      : 0;

    const completedWithTime = enrollments.filter(e => e.isCompleted && e.enrollmentDuration > 0);
    const averageCompletionTime = completedWithTime.length > 0
      ? completedWithTime.reduce((sum, e) => sum + e.enrollmentDuration, 0) / completedWithTime.length
      : 0;

    // Engagement metrics
    const engagementMetrics = {
      highEngagement: enrollments.filter(e => e.getEngagementLevel() === 'high').length,
      mediumEngagement: enrollments.filter(e => e.getEngagementLevel() === 'medium').length,
      lowEngagement: enrollments.filter(e => e.getEngagementLevel() === 'low').length,
    };

    // Progress distribution
    const progressRanges = ['0-25', '26-50', '51-75', '76-100'];
    const progressDistribution = progressRanges.reduce((acc, range) => {
      const [min, max] = range.split('-').map(Number);
      acc[range] = enrollments.filter(e => 
        e.progressPercentage >= min && e.progressPercentage <= max
      ).length;
      return acc;
    }, {} as Record<string, number>);

    const completionRate = totalEnrollments > 0 
      ? Math.round((completedEnrollments / totalEnrollments) * 100)
      : 0;

    // Calculate dropoff points (simplified)
    const dropoffPoints: Array<{
      lessonId: string;
      lessonTitle: string;
      dropoffRate: number;
    }> = [];

    return {
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      averageProgress: Math.round(averageProgress * 100) / 100,
      averageCompletionTime: Math.round(averageCompletionTime),
      engagementMetrics,
      progressDistribution,
      completionRate,
      dropoffPoints,
    };
  }

  /**
   * Unenroll user from course
   */
  async unenrollUser(
    enrollmentId: string,
    reason?: string,
    currentUser?: AuthenticatedUser,
  ): Promise<void> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: enrollmentId },
      relations: ['course'],
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment not found: ${enrollmentId}`);
    }

    if (enrollment.userId !== currentUser.id && 
        !currentUser.permissions?.includes('enrollments:manage')) {
      throw new ForbiddenException('Insufficient permissions to unenroll');
    }

    enrollment.cancel(reason);
    await this.enrollmentRepository.save(enrollment);

    // Update course enrollment count
    await this.courseRepository.update(enrollment.courseId, {
      totalEnrollments: Math.max(0, enrollment.course.totalEnrollments - 1),
    });

    // Emit enrollment cancelled event
    this.eventEmitter.emit('enrollment.cancelled', {
      enrollmentId,
      userId: enrollment.userId,
      courseId: enrollment.courseId,
      reason,
    });

    this.logger.log(`User unenrolled: ${enrollmentId}`);
  }

  // Private helper methods

  /**
   * Initialize lesson progress records for enrollment
   */
  private async initializeLessonProgress(
    enrollment: Enrollment,
    modules: Module[],
  ): Promise<void> {
    const progressRecords: Partial<LessonProgress>[] = [];

    for (const module of modules) {
      if (module.lessons) {
        for (const lesson of module.lessons) {
          progressRecords.push({
            userId: enrollment.userId,
            lessonId: lesson.id,
            enrollmentId: enrollment.id,
            status: LessonProgressStatus.NOT_STARTED,
            progressPercentage: 0,
          });
        }
      }
    }

    if (progressRecords.length > 0) {
      await this.lessonProgressRepository.save(progressRecords);
    }
  }

  /**
   * Update enrollment progress based on lesson progress
   */
  private async updateEnrollmentProgress(enrollment: Enrollment): Promise<void> {
    const lessonProgressRecords = await this.lessonProgressRepository.find({
      where: { enrollmentId: enrollment.id },
    });

    const completedLessons = lessonProgressRecords.filter(p => p.isCompleted).length;
    const totalLessons = lessonProgressRecords.length;

    enrollment.updateProgress(completedLessons, totalLessons);

    // Calculate total time spent
    const totalTimeSpent = lessonProgressRecords.reduce(
      (sum, p) => sum + Math.floor(p.timeSpentSeconds / 60),
      0,
    );
    enrollment.totalTimeSpentMinutes = totalTimeSpent;

    await this.enrollmentRepository.save(enrollment);

    // Check if enrollment should be completed
    if (enrollment.progressPercentage >= 100 && enrollment.status === EnrollmentStatus.ACTIVE) {
      // Emit enrollment completed event
      this.eventEmitter.emit('enrollment.completed', {
        enrollmentId: enrollment.id,
        userId: enrollment.userId,
        courseId: enrollment.courseId,
        completionTime: enrollment.enrollmentDuration,
        finalScore: enrollment.averageScore,
      });
    }
  }
}
