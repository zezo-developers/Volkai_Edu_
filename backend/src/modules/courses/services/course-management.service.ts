import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, In, Like, Between } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { 
  Course, 
  CourseStatus, 
  CourseDifficulty, 
  CourseAccessType 
} from '@database/entities/course.entity';
import { Module } from '@database/entities/module.entity';
import { Lesson } from '@database/entities/lesson.entity';
import { Enrollment } from '@database/entities/enrollment.entity';
import { AuthenticatedUser } from '@modules/auth/strategies/jwt.strategy';

/**
 * Course creation request interface
 */
export interface CourseCreateRequest {
  title: string;
  description?: string;
  shortDescription?: string;
  learningObjectives?: string;
  prerequisites?: string;
  category?: string;
  tags?: string[];
  difficulty?: CourseDifficulty;
  accessType?: CourseAccessType;
  price?: number;
  currency?: string;
  thumbnailFileId?: string;
  previewVideoFileId?: string;
  estimatedDurationMinutes?: number;
  allowEnrollment?: boolean;
  requiresApproval?: boolean;
  generateCertificate?: boolean;
  passingScore?: number;
  maxAttempts?: number;
  timeLimit?: number;
  enrollmentStartDate?: Date;
  enrollmentEndDate?: Date;
  metadata?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

/**
 * Course search filters interface
 */
export interface CourseSearchFilters {
  organizationId?: string;
  instructorId?: string;
  category?: string;
  tags?: string[];
  difficulty?: CourseDifficulty;
  accessType?: CourseAccessType;
  status?: CourseStatus;
  isPublished?: boolean;
  priceMin?: number;
  priceMax?: number;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'title' | 'averageRating' | 'totalEnrollments' | 'price';
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Course statistics interface
 */
export interface CourseStatistics {
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  totalEnrollments: number;
  totalCompletions: number;
  averageRating: number;
  coursesByCategory: Record<string, number>;
  coursesByDifficulty: Record<string, number>;
  coursesByAccessType: Record<string, number>;
  revenueStats: {
    totalRevenue: number;
    averagePrice: number;
    paidCourses: number;
    freeCourses: number;
  };
}

/**
 * Course Management Service
 * Handles all course-related operations including CRUD, publishing, and statistics
 */
@Injectable()
export class CourseManagementService {
  private readonly logger = new Logger(CourseManagementService.name);

  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Module)
    private readonly moduleRepository: Repository<Module>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create a new course
   */
  async createCourse(
    request: CourseCreateRequest,
    currentUser: AuthenticatedUser,
  ): Promise<Course> {
    this.logger.log(`Creating course: ${request.title} by user: ${currentUser.id}`);

    try {
      // Generate unique slug
      const slug = await this.generateUniqueSlug(request.title);

      // Validate price for paid courses
      if (request.accessType && [CourseAccessType.PAID, CourseAccessType.PREMIUM].includes(request.accessType)) {
        if (!request.price || request.price <= 0) {
          throw new BadRequestException('Price is required for paid courses');
        }
      }

      // Create course entity
      const course = this.courseRepository.create({
        organizationId: currentUser.currentOrganizationId,
        instructorId: currentUser.id,
        slug,
        ...request,
        tags: request.tags?.map(tag => tag.toLowerCase()) || [],
        status: CourseStatus.DRAFT,
        isPublished: false,
        version: 1,
      });

      const savedCourse = await this.courseRepository.save(course);

      // Emit course created event
      this.eventEmitter.emit('course.created', {
        courseId: savedCourse.id,
        title: savedCourse.title,
        instructorId: currentUser.id,
        organizationId: currentUser.currentOrganizationId,
      });

      this.logger.log(`Course created successfully: ${savedCourse.id}`);
      return savedCourse;
    } catch (error) {
      this.logger.error(`Failed to create course: ${request.title}`, error);
      throw error;
    }
  }

  /**
   * Get course by ID with access control
   */
  async getCourseById(
    courseId: string,
    currentUser: AuthenticatedUser,
    includeContent = false,
  ): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: [
        'instructor',
        'organization',
        ...(includeContent ? ['modules', 'modules.lessons'] : []),
      ],
    });

    if (!course) {
      throw new NotFoundException(`Course not found: ${courseId}`);
    }

    // Check access permissions
    if (!this.canUserAccessCourse(course, currentUser)) {
      throw new ForbiddenException('Access denied to this course');
    }

    // Increment view count for published courses
    if (course.isPublished && course.instructorId !== currentUser.id) {
      await this.courseRepository.update(courseId, {
        viewCount: course.viewCount + 1,
      });
    }

    return course;
  }

  /**
   * Search courses with filters and pagination
   */
  async searchCourses(
    filters: CourseSearchFilters,
    currentUser: AuthenticatedUser,
  ): Promise<{
    courses: Course[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      organizationId = currentUser.currentOrganizationId,
      instructorId,
      category,
      tags,
      difficulty,
      accessType,
      status,
      isPublished,
      priceMin,
      priceMax,
      search,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = filters;

    const queryBuilder = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.instructor', 'instructor')
      .leftJoinAndSelect('course.organization', 'organization');

    // Apply access control filters
    if (currentUser.permissions?.includes('courses:manage')) {
      // Admins can see all courses in their organization
      if (organizationId) {
        queryBuilder.andWhere('course.organizationId = :organizationId', { organizationId });
      }
    } else {
      // Regular users can only see published courses or their own courses
      queryBuilder.andWhere(
        '(course.isPublished = true OR course.instructorId = :userId)',
        { userId: currentUser.id }
      );
      
      if (organizationId) {
        queryBuilder.andWhere('course.organizationId = :organizationId', { organizationId });
      }
    }

    // Apply filters
    if (instructorId) {
      queryBuilder.andWhere('course.instructorId = :instructorId', { instructorId });
    }

    if (category) {
      queryBuilder.andWhere('course.category = :category', { category });
    }

    if (tags && tags.length > 0) {
      queryBuilder.andWhere('course.tags && :tags', { tags });
    }

    if (difficulty) {
      queryBuilder.andWhere('course.difficulty = :difficulty', { difficulty });
    }

    if (accessType) {
      queryBuilder.andWhere('course.accessType = :accessType', { accessType });
    }

    if (status) {
      queryBuilder.andWhere('course.status = :status', { status });
    }

    if (isPublished !== undefined) {
      queryBuilder.andWhere('course.isPublished = :isPublished', { isPublished });
    }

    if (priceMin !== undefined) {
      queryBuilder.andWhere('course.price >= :priceMin', { priceMin });
    }

    if (priceMax !== undefined) {
      queryBuilder.andWhere('course.price <= :priceMax', { priceMax });
    }

    if (search) {
      queryBuilder.andWhere(
        '(course.title ILIKE :search OR course.description ILIKE :search OR course.shortDescription ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (dateFrom) {
      queryBuilder.andWhere('course.createdAt >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      queryBuilder.andWhere('course.createdAt <= :dateTo', { dateTo });
    }

    queryBuilder.andWhere('course.isArchived = false');

    // Apply sorting
    queryBuilder.orderBy(`course.${sortBy}`, sortOrder);

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const offset = (page - 1) * limit;
    const courses = await queryBuilder.skip(offset).take(limit).getMany();

    return {
      courses,
      total,
      page,
      limit,
    };
  }

  /**
   * Update course
   */
  async updateCourse(
    courseId: string,
    updates: Partial<CourseCreateRequest>,
    currentUser: AuthenticatedUser,
  ): Promise<Course> {
    const course = await this.getCourseById(courseId, currentUser);

    // Check if user can modify this course
    if (!this.canUserModifyCourse(course, currentUser)) {
      throw new ForbiddenException('Insufficient permissions to modify this course');
    }

    // Prevent updates to published courses without proper permissions
    if (course.isPublished && !currentUser.permissions?.includes('courses:manage')) {
      throw new ForbiddenException('Cannot modify published course without admin permissions');
    }

    const updateData: Partial<Course> = {};

    // Handle slug update if title changes
    if (updates.title && updates.title !== course.title) {
      updateData.title = updates.title;
      updateData.slug = await this.generateUniqueSlug(updates.title);
    }

    // Copy other allowed updates
    const allowedFields = [
      'description', 'shortDescription', 'learningObjectives', 'prerequisites',
      'category', 'difficulty', 'accessType', 'price', 'currency',
      'thumbnailFileId', 'previewVideoFileId', 'estimatedDurationMinutes',
      'allowEnrollment', 'requiresApproval', 'generateCertificate',
      'passingScore', 'maxAttempts', 'timeLimit', 'enrollmentStartDate',
      'enrollmentEndDate', 'metadata', 'settings'
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    if (updates.tags) {
      updateData.tags = updates.tags.map(tag => tag.toLowerCase());
    }

    // Increment version
    updateData.version = course.version + 1;
    updateData.updatedAt = new Date();

    await this.courseRepository.update(courseId, updateData);

    // Emit course updated event
    this.eventEmitter.emit('course.updated', {
      courseId,
      updates: Object.keys(updateData),
      instructorId: currentUser.id,
      organizationId: currentUser.currentOrganizationId,
    });

    return await this.getCourseById(courseId, currentUser);
  }

  /**
   * Delete course
   */
  async deleteCourse(courseId: string, currentUser: AuthenticatedUser): Promise<void> {
    const course = await this.getCourseById(courseId, currentUser);

    // Check if user can delete this course
    if (!this.canUserModifyCourse(course, currentUser)) {
      throw new ForbiddenException('Insufficient permissions to delete this course');
    }

    // Check if course has enrollments
    const enrollmentCount = await this.enrollmentRepository.count({
      where: { courseId },
    });

    if (enrollmentCount > 0) {
      throw new BadRequestException('Cannot delete course with active enrollments');
    }

    try {
      // Soft delete by archiving
      await this.courseRepository.update(courseId, {
        isArchived: true,
        status: CourseStatus.ARCHIVED,
        isPublished: false,
      });

      // Emit course deleted event
      this.eventEmitter.emit('course.deleted', {
        courseId,
        title: course.title,
        instructorId: currentUser.id,
        organizationId: currentUser.currentOrganizationId,
      });

      this.logger.log(`Course deleted: ${courseId} by user: ${currentUser.id}`);
    } catch (error) {
      this.logger.error(`Failed to delete course ${courseId}:`, error);
      throw error;
    }
  }

  /**
   * Publish course
   */
  async publishCourse(courseId: string, currentUser: AuthenticatedUser): Promise<Course> {
    const course = await this.getCourseById(courseId, currentUser, true);

    // Check if user can publish this course
    if (!this.canUserModifyCourse(course, currentUser)) {
      throw new ForbiddenException('Insufficient permissions to publish this course');
    }

    // Validate course is ready for publishing
    const validation = await this.validateCourseForPublishing(course);
    if (!validation.isValid) {
      throw new BadRequestException(`Course not ready for publishing: ${validation.errors.join(', ')}`);
    }

    // Update course status
    await this.courseRepository.update(courseId, {
      status: CourseStatus.PUBLISHED,
      isPublished: true,
      publishedAt: new Date(),
    });

    // Emit course published event
    this.eventEmitter.emit('course.published', {
      courseId,
      title: course.title,
      instructorId: currentUser.id,
      organizationId: currentUser.currentOrganizationId,
    });

    this.logger.log(`Course published: ${courseId} by user: ${currentUser.id}`);
    return await this.getCourseById(courseId, currentUser);
  }

  /**
   * Unpublish course
   */
  async unpublishCourse(courseId: string, currentUser: AuthenticatedUser): Promise<Course> {
    const course = await this.getCourseById(courseId, currentUser);

    // Check if user can unpublish this course
    if (!this.canUserModifyCourse(course, currentUser)) {
      throw new ForbiddenException('Insufficient permissions to unpublish this course');
    }

    // Update course status
    await this.courseRepository.update(courseId, {
      status: CourseStatus.DRAFT,
      isPublished: false,
    });

    // Emit course unpublished event
    this.eventEmitter.emit('course.unpublished', {
      courseId,
      title: course.title,
      instructorId: currentUser.id,
      organizationId: currentUser.currentOrganizationId,
    });

    this.logger.log(`Course unpublished: ${courseId} by user: ${currentUser.id}`);
    return await this.getCourseById(courseId, currentUser);
  }

  /**
   * Get course statistics
   */
  async getCourseStatistics(organizationId: string): Promise<CourseStatistics> {
    const courses = await this.courseRepository.find({
      where: { organizationId, isArchived: false },
    });

    const totalCourses = courses.length;
    const publishedCourses = courses.filter(c => c.isPublished).length;
    const draftCourses = courses.filter(c => c.status === CourseStatus.DRAFT).length;

    const totalEnrollments = courses.reduce((sum, c) => sum + c.totalEnrollments, 0);
    const totalCompletions = courses.reduce((sum, c) => sum + c.totalCompletions, 0);
    
    const ratingsSum = courses.reduce((sum, c) => sum + (c.averageRating * c.totalRatings), 0);
    const totalRatings = courses.reduce((sum, c) => sum + c.totalRatings, 0);
    const averageRating = totalRatings > 0 ? ratingsSum / totalRatings : 0;

    const coursesByCategory = courses.reduce((acc, course) => {
      const category = course.category || 'Uncategorized';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const coursesByDifficulty = courses.reduce((acc, course) => {
      acc[course.difficulty] = (acc[course.difficulty] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const coursesByAccessType = courses.reduce((acc, course) => {
      acc[course.accessType] = (acc[course.accessType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const paidCourses = courses.filter(c => c.isPaid);
    const freeCourses = courses.filter(c => c.isFree);
    const totalRevenue = paidCourses.reduce((sum, c) => sum + ((c.price || 0) * c.totalEnrollments), 0);
    const averagePrice = paidCourses.length > 0 
      ? paidCourses.reduce((sum, c) => sum + (c.price || 0), 0) / paidCourses.length 
      : 0;

    return {
      totalCourses,
      publishedCourses,
      draftCourses,
      totalEnrollments,
      totalCompletions,
      averageRating: Math.round(averageRating * 100) / 100,
      coursesByCategory,
      coursesByDifficulty,
      coursesByAccessType,
      revenueStats: {
        totalRevenue,
        averagePrice: Math.round(averagePrice * 100) / 100,
        paidCourses: paidCourses.length,
        freeCourses: freeCourses.length,
      },
    };
  }

  /**
   * Clone course
   */
  async cloneCourse(
    courseId: string,
    newTitle: string,
    currentUser: AuthenticatedUser,
  ): Promise<Course> {
    const originalCourse = await this.getCourseById(courseId, currentUser, true);

    // Check if user can clone this course
    if (!this.canUserAccessCourse(originalCourse, currentUser)) {
      throw new ForbiddenException('Access denied to clone this course');
    }

    const cloneData: CourseCreateRequest = {
      title: newTitle,
      description: originalCourse.description,
      shortDescription: originalCourse.shortDescription,
      learningObjectives: originalCourse.learningObjectives,
      prerequisites: originalCourse.prerequisites,
      category: originalCourse.category,
      tags: [...(originalCourse.tags || [])],
      difficulty: originalCourse.difficulty,
      accessType: originalCourse.accessType,
      price: originalCourse.price,
      currency: originalCourse.currency,
      estimatedDurationMinutes: originalCourse.estimatedDurationMinutes,
      allowEnrollment: originalCourse.allowEnrollment,
      requiresApproval: originalCourse.requiresApproval,
      generateCertificate: originalCourse.generateCertificate,
      passingScore: originalCourse.passingScore,
      maxAttempts: originalCourse.maxAttempts,
      timeLimit: originalCourse.timeLimit,
      metadata: JSON.parse(JSON.stringify(originalCourse.metadata || {})),
      settings: JSON.parse(JSON.stringify(originalCourse.settings || {})),
    };

    const clonedCourse = await this.createCourse(cloneData, currentUser);

    // Emit course cloned event
    this.eventEmitter.emit('course.cloned', {
      originalCourseId: courseId,
      clonedCourseId: clonedCourse.id,
      instructorId: currentUser.id,
      organizationId: currentUser.currentOrganizationId,
    });

    return clonedCourse;
  }

  // Private helper methods

  /**
   * Generate unique slug for course
   */
  private async generateUniqueSlug(title: string): Promise<string> {
    let baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 100);

    let slug = baseSlug;
    let counter = 1;

    while (await this.courseRepository.findOne({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  /**
   * Check if user can access course
   */
  private canUserAccessCourse(course: Course, user: AuthenticatedUser): boolean {
    // Instructor always has access
    if (course.instructorId === user.id) {
      return true;
    }

    // Organization admins have access
    if (user.permissions?.includes('courses:manage') && 
        course.organizationId === user.currentOrganizationId) {
      return true;
    }

    // Published courses are accessible based on access type
    if (course.isPublished) {
      return course.canAccess(user.id, user.currentOrganizationId);
    }

    return false;
  }

  /**
   * Check if user can modify course
   */
  private canUserModifyCourse(course: Course, user: AuthenticatedUser): boolean {
    // Instructor can modify their own courses
    if (course.instructorId === user.id) {
      return true;
    }

    // Organization admins can modify courses in their organization
    if (user.permissions?.includes('courses:manage') && 
        course.organizationId === user.currentOrganizationId) {
      return true;
    }

    return false;
  }

  /**
   * Validate course for publishing
   */
  private async validateCourseForPublishing(course: Course): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Check required fields
    if (!course.title?.trim()) {
      errors.push('Title is required');
    }

    if (!course.description?.trim()) {
      errors.push('Description is required');
    }

    // Check if course has modules and lessons
    const moduleCount = await this.moduleRepository.count({
      where: { courseId: course.id, isArchived: false },
    });

    if (moduleCount === 0) {
      errors.push('Course must have at least one module');
    }

    const lessonCount = await this.lessonRepository.count({
      where: { 
        module: { courseId: course.id },
        isArchived: false,
      },
    });

    if (lessonCount === 0) {
      errors.push('Course must have at least one lesson');
    }

    // Check pricing for paid courses
    if (course.isPaid && (!course.price || course.price <= 0)) {
      errors.push('Price is required for paid courses');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
