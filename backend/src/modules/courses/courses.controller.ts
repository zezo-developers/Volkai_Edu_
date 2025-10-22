import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CourseManagementService } from './services/course-management.service';
import { ModuleLessonManagementService } from './services/module-management.service';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@modules/auth/guards/permissions.guard';
import { RequirePermissions } from '@modules/auth/decorators/permissions.decorator';
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '@modules/auth/strategies/jwt.strategy';
import { Course } from '@database/entities/course.entity';
import { Module } from '@database/entities/module.entity';
import { Lesson } from '@database/entities/lesson.entity';

/**
 * Courses Controller
 * Handles course management operations including CRUD, publishing, and content management
 */
@ApiTags('Courses')
@Controller('courses')
@UseGuards(JwtAuthGuard, PermissionsGuard, ThrottlerGuard)
@ApiBearerAuth('JWT-auth')
export class CoursesController {
  constructor(
    private readonly courseService: CourseManagementService,
    private readonly moduleService: ModuleLessonManagementService,
  ) {}

  /**
   * Create a new course
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('courses:write')
  @ApiOperation({
    summary: 'Create new course',
    description: 'Create a new course with basic information and settings',
  })
  @ApiResponse({
    status: 201,
    description: 'Course created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        statusCode: { type: 'number', example: 201 },
        message: { type: 'string', example: 'Course created successfully' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid' },
            title: { type: 'string', example: 'Introduction to Web Development' },
            slug: { type: 'string', example: 'introduction-to-web-development' },
            status: { type: 'string', example: 'draft' },
            isPublished: { type: 'boolean', example: false },
            createdAt: { type: 'string', example: '2023-10-21T10:00:00.000Z' },
          },
        },
      },
    },
  })
  async createCourse(
    @Body() createCourseDto: any,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<Course> {
    return this.courseService.createCourse(createCourseDto, currentUser);
  }

  /**
   * Get all courses with filtering and pagination
   */
  @Get()
  @RequirePermissions('courses:read')
  @ApiOperation({
    summary: 'Get courses',
    description: 'Get courses with filtering, searching, and pagination',
  })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'difficulty', required: false, description: 'Filter by difficulty level' })
  @ApiQuery({ name: 'search', required: false, description: 'Search in title and description' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 20)' })
  @ApiResponse({
    status: 200,
    description: 'Courses retrieved successfully',
  })
  async getCourses(
    @Query() searchFilters: any,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<{
    courses: Course[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.courseService.searchCourses(searchFilters, currentUser);
  }

  /**
   * Get course by ID
   */
  @Get(':courseId')
  @RequirePermissions('courses:read')
  @ApiOperation({
    summary: 'Get course details',
    description: 'Get detailed course information including modules and lessons',
  })
  @ApiQuery({ name: 'includeContent', required: false, description: 'Include modules and lessons' })
  @ApiResponse({
    status: 200,
    description: 'Course details retrieved successfully',
  })
  async getCourseById(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Query('includeContent') includeContent?: string,
    @CurrentUser() currentUser?: AuthenticatedUser,
  ): Promise<Course> {
    const includeContentBool = includeContent === 'true';
    return this.courseService.getCourseById(courseId, currentUser, includeContentBool);
  }

  /**
   * Update course
   */
  @Patch(':courseId')
  @RequirePermissions('courses:write')
  @ApiOperation({
    summary: 'Update course',
    description: 'Update course information and settings',
  })
  @ApiResponse({
    status: 200,
    description: 'Course updated successfully',
  })
  async updateCourse(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() updateCourseDto: any,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<Course> {
    return this.courseService.updateCourse(courseId, updateCourseDto, currentUser);
  }

  /**
   * Delete course
   */
  @Delete(':courseId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('courses:delete')
  @ApiOperation({
    summary: 'Delete course',
    description: 'Soft delete course (archive)',
  })
  @ApiResponse({
    status: 200,
    description: 'Course deleted successfully',
  })
  async deleteCourse(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<{ message: string }> {
    await this.courseService.deleteCourse(courseId, currentUser);
    return { message: 'Course deleted successfully' };
  }

  /**
   * Publish course
   */
  @Post(':courseId/publish')
  @RequirePermissions('courses:write')
  @ApiOperation({
    summary: 'Publish course',
    description: 'Make course available to students',
  })
  @ApiResponse({
    status: 200,
    description: 'Course published successfully',
  })
  async publishCourse(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<Course> {
    return this.courseService.publishCourse(courseId, currentUser);
  }

  /**
   * Unpublish course
   */
  @Post(':courseId/unpublish')
  @RequirePermissions('courses:write')
  @ApiOperation({
    summary: 'Unpublish course',
    description: 'Make course unavailable to students',
  })
  @ApiResponse({
    status: 200,
    description: 'Course unpublished successfully',
  })
  async unpublishCourse(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<Course> {
    return this.courseService.unpublishCourse(courseId, currentUser);
  }

  /**
   * Clone course
   */
  @Post(':courseId/clone')
  @RequirePermissions('courses:write')
  @ApiOperation({
    summary: 'Clone course',
    description: 'Create a copy of an existing course',
  })
  @ApiResponse({
    status: 201,
    description: 'Course cloned successfully',
  })
  async cloneCourse(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body('title') newTitle: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<Course> {
    return this.courseService.cloneCourse(courseId, newTitle, currentUser);
  }

  /**
   * Get course statistics
   */
  @Get('statistics/organization')
  @RequirePermissions('analytics:read')
  @ApiOperation({
    summary: 'Get course statistics',
    description: 'Get comprehensive course statistics for organization',
  })
  @ApiResponse({
    status: 200,
    description: 'Course statistics retrieved successfully',
  })
  async getCourseStatistics(
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<any> {
    if (!currentUser.currentOrganizationId) {
      throw new Error('Organization context required');
    }
    return this.courseService.getCourseStatistics(currentUser.currentOrganizationId);
  }

  // MODULE ENDPOINTS

  /**
   * Create module for course
   */
  @Post(':courseId/modules')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('courses:write')
  @ApiOperation({
    summary: 'Create module',
    description: 'Create a new module within a course',
  })
  @ApiResponse({
    status: 201,
    description: 'Module created successfully',
  })
  async createModule(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() createModuleDto: any,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<Module> {
    const moduleData = { ...createModuleDto, courseId };
    return this.moduleService.createModule(moduleData, currentUser);
  }

  /**
   * Get module by ID
   */
  @Get('modules/:moduleId')
  @RequirePermissions('courses:read')
  @ApiOperation({
    summary: 'Get module details',
    description: 'Get detailed module information including lessons',
  })
  @ApiQuery({ name: 'includeLessons', required: false, description: 'Include lessons in response' })
  @ApiResponse({
    status: 200,
    description: 'Module details retrieved successfully',
  })
  async getModuleById(
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Query('includeLessons') includeLessons?: string,
    @CurrentUser() currentUser?: AuthenticatedUser,
  ): Promise<Module> {
    const includeLessonsBool = includeLessons === 'true';
    return this.moduleService.getModuleById(moduleId, currentUser, includeLessonsBool);
  }

  /**
   * Update module
   */
  @Patch('modules/:moduleId')
  @RequirePermissions('courses:write')
  @ApiOperation({
    summary: 'Update module',
    description: 'Update module information and settings',
  })
  @ApiResponse({
    status: 200,
    description: 'Module updated successfully',
  })
  async updateModule(
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() updateModuleDto: any,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<Module> {
    return this.moduleService.updateModule(moduleId, updateModuleDto, currentUser);
  }

  /**
   * Delete module
   */
  @Delete('modules/:moduleId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('courses:delete')
  @ApiOperation({
    summary: 'Delete module',
    description: 'Soft delete module (archive)',
  })
  @ApiResponse({
    status: 200,
    description: 'Module deleted successfully',
  })
  async deleteModule(
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<{ message: string }> {
    await this.moduleService.deleteModule(moduleId, currentUser);
    return { message: 'Module deleted successfully' };
  }

  /**
   * Publish module
   */
  @Post('modules/:moduleId/publish')
  @RequirePermissions('courses:write')
  @ApiOperation({
    summary: 'Publish module',
    description: 'Make module available to students',
  })
  @ApiResponse({
    status: 200,
    description: 'Module published successfully',
  })
  async publishModule(
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<Module> {
    return this.moduleService.publishModule(moduleId, currentUser);
  }

  /**
   * Reorder modules
   */
  @Patch(':courseId/modules/reorder')
  @RequirePermissions('courses:write')
  @ApiOperation({
    summary: 'Reorder modules',
    description: 'Update the order of modules within a course',
  })
  @ApiResponse({
    status: 200,
    description: 'Modules reordered successfully',
  })
  async reorderModules(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body('moduleOrders') moduleOrders: Array<{ moduleId: string; sortOrder: number }>,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<{ message: string }> {
    await this.moduleService.reorderModules(courseId, moduleOrders, currentUser);
    return { message: 'Modules reordered successfully' };
  }

  // LESSON ENDPOINTS

  /**
   * Create lesson for module
   */
  @Post('modules/:moduleId/lessons')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('courses:write')
  @ApiOperation({
    summary: 'Create lesson',
    description: 'Create a new lesson within a module',
  })
  @ApiResponse({
    status: 201,
    description: 'Lesson created successfully',
  })
  async createLesson(
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() createLessonDto: any,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<Lesson> {
    const lessonData = { ...createLessonDto, moduleId };
    return this.moduleService.createLesson(lessonData, currentUser);
  }

  /**
   * Get lesson by ID
   */
  @Get('lessons/:lessonId')
  @RequirePermissions('courses:read')
  @ApiOperation({
    summary: 'Get lesson details',
    description: 'Get detailed lesson information including content and attachments',
  })
  @ApiResponse({
    status: 200,
    description: 'Lesson details retrieved successfully',
  })
  async getLessonById(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<Lesson> {
    return this.moduleService.getLessonById(lessonId, currentUser);
  }

  /**
   * Update lesson
   */
  @Patch('lessons/:lessonId')
  @RequirePermissions('courses:write')
  @ApiOperation({
    summary: 'Update lesson',
    description: 'Update lesson content and settings',
  })
  @ApiResponse({
    status: 200,
    description: 'Lesson updated successfully',
  })
  async updateLesson(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() updateLessonDto: any,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<Lesson> {
    return this.moduleService.updateLesson(lessonId, updateLessonDto, currentUser);
  }

  /**
   * Delete lesson
   */
  @Delete('lessons/:lessonId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('courses:delete')
  @ApiOperation({
    summary: 'Delete lesson',
    description: 'Soft delete lesson (archive)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lesson deleted successfully',
  })
  async deleteLesson(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<{ message: string }> {
    await this.moduleService.deleteLesson(lessonId, currentUser);
    return { message: 'Lesson deleted successfully' };
  }

  /**
   * Publish lesson
   */
  @Post('lessons/:lessonId/publish')
  @RequirePermissions('courses:write')
  @ApiOperation({
    summary: 'Publish lesson',
    description: 'Make lesson available to students',
  })
  @ApiResponse({
    status: 200,
    description: 'Lesson published successfully',
  })
  async publishLesson(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<Lesson> {
    return this.moduleService.publishLesson(lessonId, currentUser);
  }

  /**
   * Reorder lessons within module
   */
  @Patch('modules/:moduleId/lessons/reorder')
  @RequirePermissions('courses:write')
  @ApiOperation({
    summary: 'Reorder lessons',
    description: 'Update the order of lessons within a module',
  })
  @ApiResponse({
    status: 200,
    description: 'Lessons reordered successfully',
  })
  async reorderLessons(
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body('lessonOrders') lessonOrders: Array<{ lessonId: string; sortOrder: number }>,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<{ message: string }> {
    await this.moduleService.reorderLessons(moduleId, lessonOrders, currentUser);
    return { message: 'Lessons reordered successfully' };
  }
}
