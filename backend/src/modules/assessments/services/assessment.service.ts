import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { 
  Assessment, 
  AssessmentType, 
  AssessmentStatus, 
  QuestionType 
} from '@database/entities/assessment.entity';
import { 
  AssessmentAttempt, 
  AssessmentAttemptStatus 
} from '@database/entities/assessment-attempt.entity';
import { Course } from '@database/entities/course.entity';
import { Enrollment } from '@database/entities/enrollment.entity';
import { AuthenticatedUser } from '@modules/auth/strategies/jwt.strategy';

/**
 * Assessment creation request interface
 */
export interface AssessmentCreateRequest {
  courseId: string;
  moduleId?: string;
  lessonId?: string;
  title: string;
  description?: string;
  instructions?: string;
  type?: AssessmentType;
  isRequired?: boolean;
  isGraded?: boolean;
  totalPoints?: number;
  passingScore?: number;
  timeLimit?: number;
  maxAttempts?: number;
  allowRetake?: boolean;
  showResults?: boolean;
  showCorrectAnswers?: boolean;
  randomizeQuestions?: boolean;
  randomizeOptions?: boolean;
  requireProctoring?: boolean;
  preventBacktracking?: boolean;
  oneQuestionAtTime?: boolean;
  availableFrom?: Date;
  availableUntil?: Date;
  questions?: Array<{
    type: QuestionType;
    question: string;
    options?: string[];
    correctAnswer?: string | string[];
    points: number;
    explanation?: string;
    metadata?: Record<string, unknown>;
  }>;
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Assessment attempt request interface
 */
export interface AssessmentAttemptRequest {
  assessmentId: string;
  responses: Record<string, string | string[]>;
  timeSpentSeconds?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Assessment search filters interface
 */
export interface AssessmentSearchFilters {
  courseId?: string;
  moduleId?: string;
  lessonId?: string;
  type?: AssessmentType;
  status?: AssessmentStatus;
  isPublished?: boolean;
  isRequired?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'title' | 'totalAttempts' | 'averageScore';
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Assessment Service
 * Handles assessment creation, management, and attempt processing
 * Implements anti-cheating measures and comprehensive grading
 */
@Injectable()
export class AssessmentService {
  private readonly logger = new Logger(AssessmentService.name);

  constructor(
    @InjectRepository(Assessment)
    private readonly assessmentRepository: Repository<Assessment>,
    @InjectRepository(AssessmentAttempt)
    private readonly attemptRepository: Repository<AssessmentAttempt>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create a new assessment
   */
  async createAssessment(
    request: AssessmentCreateRequest,
    currentUser: AuthenticatedUser,
  ): Promise<Assessment> {
    this.logger.log(`Creating assessment: ${request.title} by user: ${currentUser.id}`);

    try {
      // Verify course access
      const course = await this.courseRepository.findOne({
        where: { id: request.courseId },
      });

      if (!course) {
        throw new NotFoundException(`Course not found: ${request.courseId}`);
      }

      if (!this.canUserManageAssessments(course, currentUser)) {
        throw new ForbiddenException('Insufficient permissions to create assessments for this course');
      }

      // Generate unique slug
      const slug = await this.generateUniqueSlug(request.title, request.courseId);

      // Create assessment entity
      const assessment = this.assessmentRepository.create({
        ...request,
        slug,
        status: AssessmentStatus.DRAFT,
        isPublished: false,
        questions: request.questions || [],
        version: 1,
      });

      // Calculate total points and questions
      assessment.updateStatistics();

      const savedAssessment = await this.assessmentRepository.save(assessment);

      // Emit assessment created event
      this.eventEmitter.emit('assessment.created', {
        assessmentId: savedAssessment.id,
        courseId: request.courseId,
        title: savedAssessment.title,
        type: savedAssessment.type,
        instructorId: currentUser.id,
      });

      this.logger.log(`Assessment created successfully: ${savedAssessment.id}`);
      return savedAssessment;
    } catch (error) {
      this.logger.error(`Failed to create assessment: ${request.title}`, error);
      throw error;
    }
  }

  async updateAssessment (id: string,
        updateAssessmentDto:any,
        req:any) {
    
  }

  /**
   * Get assessment by ID with access control
   */
  async getAssessmentById(
    assessmentId: string,
    currentUser: AuthenticatedUser,
    includeQuestions = false,
  ): Promise<Assessment> {
    const assessment = await this.assessmentRepository.findOne({
      where: { id: assessmentId },
      relations: ['course', 'module', 'lesson'],
    });

    if (!assessment) {
      throw new NotFoundException(`Assessment not found: ${assessmentId}`);
    }
    console.log('checking user access to assessments')
    // Check access permissions
    // if (!await this.canUserAccessAssessment(assessment, currentUser)) {
    //   throw new ForbiddenException('Access denied to this assessment');
    // }

    // Remove questions for students unless they're taking the assessment
    if (!includeQuestions && !this.canUserManageAssessments(assessment.course, currentUser)) {
      const assessmentCopy = { ...assessment };
      delete assessmentCopy.questions;
      return assessmentCopy as Assessment;
    }

    return assessment;
  }

  /**
   * Search assessments with filters
   */
  async searchAssessments(
    filters: AssessmentSearchFilters,
    currentUser: AuthenticatedUser,
  ): Promise<{
    assessments: Assessment[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      courseId,
      moduleId,
      lessonId,
      type,
      status,
      isPublished,
      isRequired,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = filters;

    const queryBuilder = this.assessmentRepository
      .createQueryBuilder('assessment')
      .leftJoinAndSelect('assessment.course', 'course')
      .leftJoinAndSelect('assessment.module', 'module')
      .leftJoinAndSelect('assessment.lesson', 'lesson');

    // Apply access control
    if (!currentUser.permissions?.includes('assessments:manage')) {
      queryBuilder.andWhere('assessment.isPublished = true');
    }

    // Apply filters
    if (courseId) {
      queryBuilder.andWhere('assessment.courseId = :courseId', { courseId });
    }

    if (moduleId) {
      queryBuilder.andWhere('assessment.moduleId = :moduleId', { moduleId });
    }

    if (lessonId) {
      queryBuilder.andWhere('assessment.lessonId = :lessonId', { lessonId });
    }

    if (type) {
      queryBuilder.andWhere('assessment.type = :type', { type });
    }

    if (status) {
      queryBuilder.andWhere('assessment.status = :status', { status });
    }

    if (isPublished !== undefined) {
      queryBuilder.andWhere('assessment.isPublished = :isPublished', { isPublished });
    }

    if (isRequired !== undefined) {
      queryBuilder.andWhere('assessment.isRequired = :isRequired', { isRequired });
    }

    if (search) {
      queryBuilder.andWhere(
        '(assessment.title ILIKE :search OR assessment.description ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    queryBuilder.andWhere('assessment.isArchived = false');

    // Apply sorting
    queryBuilder.orderBy(`assessment.${sortBy}`, sortOrder);

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const offset = (page - 1) * limit;
    const assessments = await queryBuilder.skip(offset).take(limit).getMany();

    return {
      assessments,
      total,
      page,
      limit,
    };
  }

  async deleteAssessment ( id: string, user:any) {

  }
  /**
   * Start assessment attempt
   */
  async startAssessmentAttempt(
    assessmentId: string,
    currentUser: AuthenticatedUser,
    metadata?: Record<string, unknown>,
  ): Promise<AssessmentAttempt> {
    const assessment = await this.getAssessmentById(assessmentId, currentUser);
    console.log('assessment: ', assessment)
    console.log('assessment is available: ', assessment.isAvailable)
    // Check if assessment is available
    // if (!assessment.isAvailable) {
    //   throw new BadRequestException('Assessment is not currently available');
    // }
    console.log('get datain service: ', {
      assessmentId,
      userId: currentUser,
      metadata,
    })
    // Check enrollment
    const enrollment = await this.enrollmentRepository.findOne({
      where: {
        userId: currentUser.id,
        courseId: assessment.courseId,
      },
    });

    if (!enrollment || !enrollment.canAccess) {
      throw new ForbiddenException('You must be enrolled in the course to take this assessment');
    }

    // Check previous attempts
    const previousAttempts = await this.attemptRepository.count({
      where: {
        userId: currentUser.id,
        assessmentId,
      },
    });

    // if (!assessment.canTake(previousAttempts)) {
    //   throw new BadRequestException('Maximum attempts exceeded or assessment not available');
    // }
    console.log({
      userId: currentUser,
      assessmentId,
      enrollmentId: enrollment.id,
      attemptNumber: previousAttempts + 1,
      status: AssessmentAttemptStatus.STARTED,
      metadata: metadata || {},
      ipAddress: metadata?.ipAddress as string,
      userAgent: metadata?.userAgent as string,
    })
    // Create new attempt
    const attempt = this.attemptRepository.create({
      userId: currentUser as any,
      assessmentId,
      enrollmentId: enrollment.id,
      attemptNumber: previousAttempts + 1,
      status: AssessmentAttemptStatus.STARTED,
      metadata: metadata || {},
      ipAddress: metadata?.ipAddress as string,
      userAgent: metadata?.userAgent as string,
    });
    console.log(attempt);

    // Set question order for randomization
    // if (assessment.randomizeQuestions) {
    //   const questionOrder = assessment.getRandomizedQuestions().reduce((acc, q, index) => {
    //     acc[q.id] = index;
    //     return acc;
    //   }, {} as Record<string, number>);
    //   attempt.setQuestionOrder(questionOrder);
    // }

    // Start the attempt
    attempt.start(assessment.timeLimit);

    const savedAttempt = await this.attemptRepository.save(attempt);

    // Emit attempt started event
    this.eventEmitter.emit('assessment.attemptStarted', {
      attemptId: savedAttempt.id,
      assessmentId,
      userId: currentUser.id,
      attemptNumber: savedAttempt.attemptNumber,
    });

    this.logger.log(`Assessment attempt started: ${savedAttempt.id} by user: ${currentUser.id}`);
    return savedAttempt;
  }

  /**
   * Submit assessment attempt
   */
  async submitAssessmentAttempt(
    attemptId: string,
    request: Omit<AssessmentAttemptRequest, 'assessmentId'>,
    currentUser: AuthenticatedUser,
  ): Promise<AssessmentAttempt> {
    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId },
      relations: ['assessment'],
    });

    if (!attempt) {
      throw new NotFoundException(`Assessment attempt not found: ${attemptId}`);
    }

    if (attempt.userId !== currentUser.id) {
      throw new ForbiddenException('Access denied to this assessment attempt');
    }

    if (!attempt.isActive) {
      throw new BadRequestException('Assessment attempt is not active');
    }

    // Check if attempt has expired
    if (attempt.isExpired) {
      attempt.expire();
      await this.attemptRepository.save(attempt);
      throw new BadRequestException('Assessment attempt has expired');
    }

    // Save responses
    for (const [questionId, response] of Object.entries(request.responses)) {
      attempt.saveResponse(questionId, response);
    }

    // Add time spent
    if (request.timeSpentSeconds) {
      attempt.addTimeSpent(request.timeSpentSeconds);
    }

    // Submit the attempt
    attempt.submit();

    // Grade the attempt
    const gradingResult = attempt.assessment.calculateScore(request.responses);
    attempt.grade(
      gradingResult.score,
      gradingResult.score * (gradingResult.totalPoints / 100),
      gradingResult.totalPoints,
      gradingResult.correctAnswers,
      gradingResult.totalQuestions,
      gradingResult.passed,
    );

    // Update assessment statistics
    attempt.assessment.recordAttempt(gradingResult.score, gradingResult.passed);
    await this.assessmentRepository.save(attempt.assessment);

    const savedAttempt = await this.attemptRepository.save(attempt);

    // Emit attempt submitted event
    this.eventEmitter.emit('assessment.attemptSubmitted', {
      attemptId: savedAttempt.id,
      assessmentId: attempt.assessmentId,
      userId: currentUser.id,
      score: gradingResult.score,
      passed: gradingResult.passed,
      attemptNumber: savedAttempt.attemptNumber,
    });

    this.logger.log(`Assessment attempt submitted: ${savedAttempt.id} by user: ${currentUser.id}`);
    return savedAttempt;
  }

  /**
   * Get assessment attempt
   */
  async getAssessmentAttempt(
    attemptId: string,
    currentUser: AuthenticatedUser,
  ): Promise<AssessmentAttempt> {
    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId },
      relations: ['assessment', 'user'],
    });

    if (!attempt) {
      throw new NotFoundException(`Assessment attempt not found: ${attemptId}`);
    }

    // Check access permissions
    const canAccess = attempt.userId === currentUser.id ||
                     this.canUserManageAssessments(attempt.assessment.course, currentUser);

    if (!canAccess) {
      throw new ForbiddenException('Access denied to this assessment attempt');
    }

    return attempt;
  }

  /**
   * Get user's attempts for an assessment
   */
  async getUserAssessmentAttempts(
    assessmentId: string,
    currentUser: AuthenticatedUser,
  ): Promise<AssessmentAttempt[]> {
    const assessment = await this.getAssessmentById(assessmentId, currentUser);

    return await this.attemptRepository.find({
      where: {
        assessmentId,
        userId: currentUser.id,
      },
      order: { attemptNumber: 'DESC' },
    });
  }

  /**
   * Publish assessment
   */
  async publishAssessment(
    assessmentId: string,
    currentUser: AuthenticatedUser,
  ): Promise<Assessment> {
    const assessment = await this.getAssessmentById(assessmentId, currentUser, true);

    if (!this.canUserManageAssessments(assessment.course, currentUser)) {
      throw new ForbiddenException('Insufficient permissions to publish this assessment');
    }

    // Validate assessment is ready for publishing
    const validation = this.validateAssessmentForPublishing(assessment);
    if (!validation.isValid) {
      throw new BadRequestException(`Assessment not ready for publishing: ${validation.errors.join(', ')}`);
    }

    await this.assessmentRepository.update(assessmentId, {
      status: AssessmentStatus.PUBLISHED,
      isPublished: true,
      publishedAt: new Date(),
    });

    // Emit assessment published event
    this.eventEmitter.emit('assessment.published', {
      assessmentId,
      courseId: assessment.courseId,
      title: assessment.title,
    });

    return await this.getAssessmentById(assessmentId, currentUser);
  }

  /**
   * Add question to assessment
   */
  async addQuestion(
    assessmentId: string,
    question: {
      type: QuestionType;
      question: string;
      options?: string[];
      correctAnswer?: string | string[];
      points: number;
      explanation?: string;
      metadata?: Record<string, unknown>;
    },
    currentUser: AuthenticatedUser,
  ): Promise<Assessment> {
    const assessment = await this.getAssessmentById(assessmentId, currentUser, true);

    if (!this.canUserManageAssessments(assessment.course, currentUser)) {
      throw new ForbiddenException('Insufficient permissions to modify this assessment');
    }

    assessment.addQuestion(question);
    await this.assessmentRepository.save(assessment);

    return assessment;
  }

  /**
   * Update question in assessment
   */
  async updateQuestion(
    assessmentId: string,
    questionId: string,
    updates: Partial<{
      type: QuestionType;
      question: string;
      options?: string[];
      correctAnswer?: string | string[];
      points: number;
      explanation?: string;
      metadata?: Record<string, unknown>;
    }>,
    currentUser: AuthenticatedUser,
  ): Promise<Assessment> {
    const assessment = await this.getAssessmentById(assessmentId, currentUser, true);

    if (!this.canUserManageAssessments(assessment.course, currentUser)) {
      throw new ForbiddenException('Insufficient permissions to modify this assessment');
    }

    assessment.updateQuestion(questionId, updates);
    await this.assessmentRepository.save(assessment);

    return assessment;
  }

  /**
   * Remove question from assessment
   */
  async removeQuestion(
    assessmentId: string,
    questionId: string,
    currentUser: AuthenticatedUser,
  ): Promise<Assessment> {
    const assessment = await this.getAssessmentById(assessmentId, currentUser, true);

    if (!this.canUserManageAssessments(assessment.course, currentUser)) {
      throw new ForbiddenException('Insufficient permissions to modify this assessment');
    }

    assessment.removeQuestion(questionId);
    await this.assessmentRepository.save(assessment);

    return assessment;
  }

  /**
   * Flag attempt for review
   */
  async flagAttemptForReview(
    attemptId: string,
    reason: string,
    currentUser: AuthenticatedUser,
  ): Promise<AssessmentAttempt> {
    const attempt = await this.getAssessmentAttempt(attemptId, currentUser);

    if (!this.canUserManageAssessments(attempt.assessment.course, currentUser)) {
      throw new ForbiddenException('Insufficient permissions to flag this attempt');
    }

    attempt.flagForReview(reason);
    await this.attemptRepository.save(attempt);

    // Emit attempt flagged event
    this.eventEmitter.emit('assessment.attemptFlagged', {
      attemptId,
      reason,
      flaggedBy: currentUser.id,
    });

    return attempt;
  }

  // Private helper methods

  /**
   * Generate unique slug for assessment
   */
  private async generateUniqueSlug(title: string, courseId: string): Promise<string> {
    let baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 100);

    let slug = baseSlug;
    let counter = 1;

    while (await this.assessmentRepository.findOne({ where: { slug, courseId } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  /**
   * Check if user can manage assessments for a course
   */
  private canUserManageAssessments(course: Course, user: AuthenticatedUser): boolean {
    return course.instructorId === user.id ||
           (user.permissions?.includes('assessments:manage') && 
            course.organizationId === user.currentOrganizationId);
  }

  /**
   * Check if user can access assessment
   */
  private async canUserAccessAssessment(assessment: Assessment, user: AuthenticatedUser): Promise<boolean> {
    // Instructors and admins can always access
    if (this.canUserManageAssessments(assessment.course, user)) {
      return true;
    }

    // Students need to be enrolled
    const enrollment = await this.enrollmentRepository.findOne({
      where: {
        userId: user.id,
        courseId: assessment.courseId,
      },
    });

    return enrollment?.canAccess || false;
  }

  /**
   * Validate assessment for publishing
   */
  private validateAssessmentForPublishing(assessment: Assessment): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!assessment.title?.trim()) {
      errors.push('Title is required');
    }

    if (assessment.questions.length === 0) {
      errors.push('Assessment must have at least one question');
    }

    if (assessment.isGraded && assessment.totalPoints <= 0) {
      errors.push('Graded assessment must have points assigned to questions');
    }

    // Validate questions
    for (const question of assessment.questions) {
      if (!question.question?.trim()) {
        errors.push('All questions must have content');
      }

      if (question.type === QuestionType.MULTIPLE_CHOICE && (!question.options || question.options.length < 2)) {
        errors.push('Multiple choice questions must have at least 2 options');
      }

      if (!question.correctAnswer && assessment.isGraded) {
        errors.push('Graded questions must have correct answers defined');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
