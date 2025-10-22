import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { 
  Module, 
  ModuleStatus 
} from '@database/entities/module.entity';
import { 
  Lesson, 
  LessonType, 
  LessonStatus 
} from '@database/entities/lesson.entity';
import { Course } from '@database/entities/course.entity';
import { AuthenticatedUser } from '@modules/auth/strategies/jwt.strategy';

/**
 * Module creation request interface
 */
export interface ModuleCreateRequest {
  courseId: string;
  title: string;
  description?: string;
  learningObjectives?: string;
  sortOrder?: number;
  isRequired?: boolean;
  allowSkip?: boolean;
  estimatedDurationMinutes?: number;
  passingScore?: number;
  metadata?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

/**
 * Lesson creation request interface
 */
export interface LessonCreateRequest {
  moduleId: string;
  title: string;
  description?: string;
  type: LessonType;
  content?: string;
  videoUrl?: string;
  audioUrl?: string;
  videoFileId?: string;
  audioFileId?: string;
  attachmentFileIds?: string[];
  sortOrder?: number;
  isRequired?: boolean;
  allowSkip?: boolean;
  isFree?: boolean;
  estimatedDurationMinutes?: number;
  videoDurationSeconds?: number;
  audioDurationSeconds?: number;
  passingScore?: number;
  maxAttempts?: number;
  timeLimit?: number;
  interactiveContent?: Record<string, unknown>;
  quizData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

/**
 * Module & Lesson Management Service
 * Handles module and lesson CRUD operations with content versioning
 */
@Injectable()
export class ModuleLessonManagementService {
  private readonly logger = new Logger(ModuleLessonManagementService.name);

  constructor(
    @InjectRepository(Module)
    private readonly moduleRepository: Repository<Module>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // MODULE MANAGEMENT

  /**
   * Create a new module
   */
  async createModule(
    request: ModuleCreateRequest,
    currentUser: AuthenticatedUser,
  ): Promise<Module> {
    this.logger.log(`Creating module: ${request.title} by user: ${currentUser.id}`);

    try {
      // Verify course access
      const course = await this.courseRepository.findOne({
        where: { id: request.courseId },
      });

      if (!course) {
        throw new NotFoundException(`Course not found: ${request.courseId}`);
      }

      if (!this.canUserManageCourse(course, currentUser)) {
        throw new ForbiddenException('Insufficient permissions to create modules for this course');
      }

      // Generate sort order if not provided
      let sortOrder = request.sortOrder;
      if (sortOrder === undefined) {
        const lastModule = await this.moduleRepository.findOne({
          where: { courseId: request.courseId },
          order: { sortOrder: 'DESC' },
        });
        sortOrder = (lastModule?.sortOrder || 0) + 1;
      }

      // Generate unique slug
      const slug = await this.generateModuleSlug(request.title, request.courseId);

      // Create module
      const module = this.moduleRepository.create({
        ...request,
        slug,
        sortOrder,
        status: ModuleStatus.DRAFT,
        isPublished: false,
        version: 1,
      });

      const savedModule = await this.moduleRepository.save(module);

      // Update course statistics
      await this.updateCourseStatistics(request.courseId);

      // Emit module created event
      this.eventEmitter.emit('module.created', {
        moduleId: savedModule.id,
        courseId: request.courseId,
        title: savedModule.title,
        instructorId: currentUser.id,
      });

      this.logger.log(`Module created successfully: ${savedModule.id}`);
      return savedModule;
    } catch (error) {
      this.logger.error(`Failed to create module: ${request.title}`, error);
      throw error;
    }
  }

  /**
   * Get module by ID
   */
  async getModuleById(
    moduleId: string,
    currentUser: AuthenticatedUser,
    includeLessons = false,
  ): Promise<Module> {
    const module = await this.moduleRepository.findOne({
      where: { id: moduleId },
      relations: [
        'course',
        ...(includeLessons ? ['lessons'] : []),
      ],
    });

    if (!module) {
      throw new NotFoundException(`Module not found: ${moduleId}`);
    }

    // Check access permissions
    if (!this.canUserAccessModule(module, currentUser)) {
      throw new ForbiddenException('Access denied to this module');
    }

    return module;
  }

  /**
   * Update module
   */
  async updateModule(
    moduleId: string,
    updates: Partial<ModuleCreateRequest>,
    currentUser: AuthenticatedUser,
  ): Promise<Module> {
    const module = await this.getModuleById(moduleId, currentUser);

    if (!this.canUserManageCourse(module.course, currentUser)) {
      throw new ForbiddenException('Insufficient permissions to modify this module');
    }

    const updateData: Partial<Module> = {};

    // Handle slug update if title changes
    if (updates.title && updates.title !== module.title) {
      updateData.title = updates.title;
      updateData.slug = await this.generateModuleSlug(updates.title, module.courseId);
    }

    // Copy other allowed updates
    const allowedFields = [
      'description', 'learningObjectives', 'sortOrder', 'isRequired',
      'allowSkip', 'estimatedDurationMinutes', 'passingScore', 'metadata', 'settings'
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    // Increment version
    updateData.version = module.version + 1;
    updateData.updatedAt = new Date();

    await this.moduleRepository.update(moduleId, updateData);

    // Update course statistics
    await this.updateCourseStatistics(module.courseId);

    // Emit module updated event
    this.eventEmitter.emit('module.updated', {
      moduleId,
      courseId: module.courseId,
      updates: Object.keys(updateData),
      instructorId: currentUser.id,
    });

    return await this.getModuleById(moduleId, currentUser);
  }

  /**
   * Delete module
   */
  async deleteModule(moduleId: string, currentUser: AuthenticatedUser): Promise<void> {
    const module = await this.getModuleById(moduleId, currentUser, true);

    if (!this.canUserManageCourse(module.course, currentUser)) {
      throw new ForbiddenException('Insufficient permissions to delete this module');
    }

    // Check if module has lessons
    if (module.lessons && module.lessons.length > 0) {
      throw new BadRequestException('Cannot delete module with existing lessons');
    }

    // Soft delete by archiving
    await this.moduleRepository.update(moduleId, {
      isArchived: true,
      status: ModuleStatus.ARCHIVED,
      isPublished: false,
    });

    // Update course statistics
    await this.updateCourseStatistics(module.courseId);

    // Emit module deleted event
    this.eventEmitter.emit('module.deleted', {
      moduleId,
      courseId: module.courseId,
      title: module.title,
      instructorId: currentUser.id,
    });

    this.logger.log(`Module deleted: ${moduleId} by user: ${currentUser.id}`);
  }

  /**
   * Publish module
   */
  async publishModule(moduleId: string, currentUser: AuthenticatedUser): Promise<Module> {
    const module = await this.getModuleById(moduleId, currentUser, true);

    if (!this.canUserManageCourse(module.course, currentUser)) {
      throw new ForbiddenException('Insufficient permissions to publish this module');
    }

    // Validate module is ready for publishing
    const validation = this.validateModuleForPublishing(module);
    if (!validation.isValid) {
      throw new BadRequestException(`Module not ready for publishing: ${validation.errors.join(', ')}`);
    }

    await this.moduleRepository.update(moduleId, {
      status: ModuleStatus.PUBLISHED,
      isPublished: true,
    });

    // Emit module published event
    this.eventEmitter.emit('module.published', {
      moduleId,
      courseId: module.courseId,
      title: module.title,
      instructorId: currentUser.id,
    });

    return await this.getModuleById(moduleId, currentUser);
  }

  /**
   * Reorder modules
   */
  async reorderModules(
    courseId: string,
    moduleOrders: Array<{ moduleId: string; sortOrder: number }>,
    currentUser: AuthenticatedUser,
  ): Promise<void> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException(`Course not found: ${courseId}`);
    }

    if (!this.canUserManageCourse(course, currentUser)) {
      throw new ForbiddenException('Insufficient permissions to reorder modules');
    }

    // Update sort orders
    for (const { moduleId, sortOrder } of moduleOrders) {
      await this.moduleRepository.update(moduleId, { sortOrder });
    }

    // Emit modules reordered event
    this.eventEmitter.emit('modules.reordered', {
      courseId,
      moduleOrders,
      instructorId: currentUser.id,
    });
  }

  // LESSON MANAGEMENT

  /**
   * Create a new lesson
   */
  async createLesson(
    request: LessonCreateRequest,
    currentUser: AuthenticatedUser,
  ): Promise<Lesson> {
    this.logger.log(`Creating lesson: ${request.title} by user: ${currentUser.id}`);

    try {
      // Verify module access
      const module = await this.moduleRepository.findOne({
        where: { id: request.moduleId },
        relations: ['course'],
      });

      if (!module) {
        throw new NotFoundException(`Module not found: ${request.moduleId}`);
      }

      if (!this.canUserManageCourse(module.course, currentUser)) {
        throw new ForbiddenException('Insufficient permissions to create lessons for this module');
      }

      // Generate sort order if not provided
      let sortOrder = request.sortOrder;
      if (sortOrder === undefined) {
        const lastLesson = await this.lessonRepository.findOne({
          where: { moduleId: request.moduleId },
          order: { sortOrder: 'DESC' },
        });
        sortOrder = (lastLesson?.sortOrder || 0) + 1;
      }

      // Generate unique slug
      const slug = await this.generateLessonSlug(request.title, request.moduleId);

      // Create lesson
      const lesson = this.lessonRepository.create({
        ...request,
        slug,
        sortOrder,
        status: LessonStatus.DRAFT,
        isPublished: false,
        version: 1,
        attachmentFileIds: request.attachmentFileIds || [],
      });

      const savedLesson = await this.lessonRepository.save(lesson);

      // Update module and course statistics
      await this.updateModuleStatistics(request.moduleId);
      await this.updateCourseStatistics(module.courseId);

      // Emit lesson created event
      this.eventEmitter.emit('lesson.created', {
        lessonId: savedLesson.id,
        moduleId: request.moduleId,
        courseId: module.courseId,
        title: savedLesson.title,
        type: savedLesson.type,
        instructorId: currentUser.id,
      });

      this.logger.log(`Lesson created successfully: ${savedLesson.id}`);
      return savedLesson;
    } catch (error) {
      this.logger.error(`Failed to create lesson: ${request.title}`, error);
      throw error;
    }
  }

  /**
   * Get lesson by ID
   */
  async getLessonById(
    lessonId: string,
    currentUser: AuthenticatedUser,
  ): Promise<Lesson> {
    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId },
      relations: ['module', 'module.course', 'videoFile', 'audioFile'],
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson not found: ${lessonId}`);
    }

    // Check access permissions
    if (!this.canUserAccessLesson(lesson, currentUser)) {
      throw new ForbiddenException('Access denied to this lesson');
    }

    return lesson;
  }

  /**
   * Update lesson
   */
  async updateLesson(
    lessonId: string,
    updates: Partial<LessonCreateRequest>,
    currentUser: AuthenticatedUser,
  ): Promise<Lesson> {
    const lesson = await this.getLessonById(lessonId, currentUser);

    if (!this.canUserManageCourse(lesson.module.course, currentUser)) {
      throw new ForbiddenException('Insufficient permissions to modify this lesson');
    }

    const updateData: Partial<Lesson> = {};

    // Handle slug update if title changes
    if (updates.title && updates.title !== lesson.title) {
      updateData.title = updates.title;
      updateData.slug = await this.generateLessonSlug(updates.title, lesson.moduleId);
    }

    // Copy other allowed updates
    const allowedFields = [
      'description', 'type', 'content', 'videoUrl', 'audioUrl', 'videoFileId',
      'audioFileId', 'sortOrder', 'isRequired', 'allowSkip', 'isFree',
      'estimatedDurationMinutes', 'videoDurationSeconds', 'audioDurationSeconds',
      'passingScore', 'maxAttempts', 'timeLimit', 'interactiveContent',
      'quizData', 'metadata', 'settings'
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    if (updates.attachmentFileIds) {
      updateData.attachmentFileIds = updates.attachmentFileIds;
    }

    // Increment version
    updateData.version = lesson.version + 1;
    updateData.updatedAt = new Date();

    await this.lessonRepository.update(lessonId, updateData);

    // Update module and course statistics
    await this.updateModuleStatistics(lesson.moduleId);
    await this.updateCourseStatistics(lesson.module.courseId);

    // Emit lesson updated event
    this.eventEmitter.emit('lesson.updated', {
      lessonId,
      moduleId: lesson.moduleId,
      courseId: lesson.module.courseId,
      updates: Object.keys(updateData),
      instructorId: currentUser.id,
    });

    return await this.getLessonById(lessonId, currentUser);
  }

  /**
   * Delete lesson
   */
  async deleteLesson(lessonId: string, currentUser: AuthenticatedUser): Promise<void> {
    const lesson = await this.getLessonById(lessonId, currentUser);

    if (!this.canUserManageCourse(lesson.module.course, currentUser)) {
      throw new ForbiddenException('Insufficient permissions to delete this lesson');
    }

    // Soft delete by archiving
    await this.lessonRepository.update(lessonId, {
      isArchived: true,
      status: LessonStatus.ARCHIVED,
      isPublished: false,
    });

    // Update module and course statistics
    await this.updateModuleStatistics(lesson.moduleId);
    await this.updateCourseStatistics(lesson.module.courseId);

    // Emit lesson deleted event
    this.eventEmitter.emit('lesson.deleted', {
      lessonId,
      moduleId: lesson.moduleId,
      courseId: lesson.module.courseId,
      title: lesson.title,
      instructorId: currentUser.id,
    });

    this.logger.log(`Lesson deleted: ${lessonId} by user: ${currentUser.id}`);
  }

  /**
   * Publish lesson
   */
  async publishLesson(lessonId: string, currentUser: AuthenticatedUser): Promise<Lesson> {
    const lesson = await this.getLessonById(lessonId, currentUser);

    if (!this.canUserManageCourse(lesson.module.course, currentUser)) {
      throw new ForbiddenException('Insufficient permissions to publish this lesson');
    }

    // Validate lesson is ready for publishing
    const validation = this.validateLessonForPublishing(lesson);
    if (!validation.isValid) {
      throw new BadRequestException(`Lesson not ready for publishing: ${validation.errors.join(', ')}`);
    }

    await this.lessonRepository.update(lessonId, {
      status: LessonStatus.PUBLISHED,
      isPublished: true,
      publishedAt: new Date(),
    });

    // Emit lesson published event
    this.eventEmitter.emit('lesson.published', {
      lessonId,
      moduleId: lesson.moduleId,
      courseId: lesson.module.courseId,
      title: lesson.title,
      instructorId: currentUser.id,
    });

    return await this.getLessonById(lessonId, currentUser);
  }

  /**
   * Reorder lessons within a module
   */
  async reorderLessons(
    moduleId: string,
    lessonOrders: Array<{ lessonId: string; sortOrder: number }>,
    currentUser: AuthenticatedUser,
  ): Promise<void> {
    const module = await this.moduleRepository.findOne({
      where: { id: moduleId },
      relations: ['course'],
    });

    if (!module) {
      throw new NotFoundException(`Module not found: ${moduleId}`);
    }

    if (!this.canUserManageCourse(module.course, currentUser)) {
      throw new ForbiddenException('Insufficient permissions to reorder lessons');
    }

    // Update sort orders
    for (const { lessonId, sortOrder } of lessonOrders) {
      await this.lessonRepository.update(lessonId, { sortOrder });
    }

    // Emit lessons reordered event
    this.eventEmitter.emit('lessons.reordered', {
      moduleId,
      courseId: module.courseId,
      lessonOrders,
      instructorId: currentUser.id,
    });
  }

  // Private helper methods

  /**
   * Generate unique slug for module
   */
  private async generateModuleSlug(title: string, courseId: string): Promise<string> {
    let baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 100);

    let slug = baseSlug;
    let counter = 1;

    while (await this.moduleRepository.findOne({ where: { slug, courseId } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  /**
   * Generate unique slug for lesson
   */
  private async generateLessonSlug(title: string, moduleId: string): Promise<string> {
    let baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 100);

    let slug = baseSlug;
    let counter = 1;

    while (await this.lessonRepository.findOne({ where: { slug, moduleId } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  /**
   * Check if user can manage course
   */
  private canUserManageCourse(course: Course, user: AuthenticatedUser): boolean {
    return course.instructorId === user.id ||
           (user.permissions?.includes('courses:manage') && 
            course.organizationId === user.currentOrganizationId);
  }

  /**
   * Check if user can access module
   */
  private canUserAccessModule(module: Module, user: AuthenticatedUser): boolean {
    return this.canUserManageCourse(module.course, user) ||
           (module.isPublished && module.course.canAccess(user.id, user.currentOrganizationId));
  }

  /**
   * Check if user can access lesson
   */
  private canUserAccessLesson(lesson: Lesson, user: AuthenticatedUser): boolean {
    return this.canUserManageCourse(lesson.module.course, user) ||
           (lesson.isPublished && lesson.module.course.canAccess(user.id, user.currentOrganizationId));
  }

  /**
   * Validate module for publishing
   */
  private validateModuleForPublishing(module: Module): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!module.title?.trim()) {
      errors.push('Title is required');
    }

    if (!module.lessons || module.lessons.length === 0) {
      errors.push('Module must have at least one lesson');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate lesson for publishing
   */
  private validateLessonForPublishing(lesson: Lesson): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!lesson.title?.trim()) {
      errors.push('Title is required');
    }

    // Validate content based on lesson type
    switch (lesson.type) {
      case LessonType.VIDEO:
        if (!lesson.videoUrl && !lesson.videoFileId) {
          errors.push('Video lessons must have video content');
        }
        break;
      case LessonType.AUDIO:
        if (!lesson.audioUrl && !lesson.audioFileId) {
          errors.push('Audio lessons must have audio content');
        }
        break;
      case LessonType.TEXT:
        if (!lesson.content?.trim()) {
          errors.push('Text lessons must have content');
        }
        break;
      case LessonType.QUIZ:
        if (!lesson.quizData || Object.keys(lesson.quizData).length === 0) {
          errors.push('Quiz lessons must have quiz data');
        }
        break;
      case LessonType.INTERACTIVE:
        if (!lesson.interactiveContent || Object.keys(lesson.interactiveContent).length === 0) {
          errors.push('Interactive lessons must have interactive content');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Update module statistics
   */
  private async updateModuleStatistics(moduleId: string): Promise<void> {
    const lessons = await this.lessonRepository.find({
      where: { moduleId, isArchived: false },
    });

    const totalLessons = lessons.length;
    const totalAssessments = lessons.filter(l => 
      l.type === LessonType.QUIZ || l.type === LessonType.ASSIGNMENT
    ).length;
    const estimatedDurationMinutes = lessons.reduce(
      (sum, lesson) => sum + lesson.estimatedDurationMinutes,
      0,
    );

    await this.moduleRepository.update(moduleId, {
      totalLessons,
      totalAssessments,
      estimatedDurationMinutes,
    });
  }

  /**
   * Update course statistics
   */
  private async updateCourseStatistics(courseId: string): Promise<void> {
    const modules = await this.moduleRepository.find({
      where: { courseId, isArchived: false },
      relations: ['lessons'],
    });

    const totalModules = modules.length;
    const totalLessons = modules.reduce(
      (sum, module) => sum + (module.lessons?.filter(l => !l.isArchived).length || 0),
      0,
    );
    const estimatedDurationMinutes = modules.reduce(
      (sum, module) => sum + module.estimatedDurationMinutes,
      0,
    );

    await this.courseRepository.update(courseId, {
      totalModules,
      totalLessons,
      estimatedDurationMinutes,
    });
  }
}
