import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
  UsePipes,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { UserRole } from '../../database/entities/user.entity';
import { EnrollmentService } from './services/enrollment.service';
import {
  EnrollUserDto,
  UpdateLessonProgressDto,
  EnrollmentResponseDto,
  EnrollmentListResponseDto,
  LessonProgressResponseDto,
  EnrollmentProgressResponseDto,
  CourseProgressAnalyticsDto,
} from './dto/enrollment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@ApiTags('Enrollments')
@Controller('enrollments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class EnrollmentsController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Enroll user in a course' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User enrolled successfully',
    type: EnrollmentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid enrollment data or user already enrolled',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied or course not available for enrollment',
  })
  @ApiBody({ type: EnrollUserDto })
  async enrollUser(
    @Body() enrollUserDto: EnrollUserDto,
    @Request() req: any,
    @CurrentUser() user: AuthenticatedUser
  ): Promise<EnrollmentResponseDto> {
    console.log("body: ",enrollUserDto)
    try {
      const enrollment = await this.enrollmentService.enrollUser(
        req.user.id,
        user,
        enrollUserDto.courseId
      );
      return new EnrollmentResponseDto(enrollment);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to enroll user',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get enrollment by ID' })
  @ApiParam({
    name: 'id',
    description: 'Enrollment ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Enrollment retrieved successfully',
    type: EnrollmentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Enrollment not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  async getEnrollment(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<EnrollmentResponseDto> {
    try {
      const enrollment = await this.enrollmentService.getUserEnrollment(
        id,
        req.user,
      );
      return new EnrollmentResponseDto(enrollment);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to retrieve enrollment',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get user enrollments' })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'courseId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'completed', 'dropped', 'expired'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Enrollments retrieved successfully',
    type: EnrollmentListResponseDto,
  })
  async getUserEnrollments(
    @Query('userId') userId?: string,
    @Query('courseId') courseId?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Request() req?: any,
  ): Promise<EnrollmentListResponseDto> {
    try {
      const targetUserId = userId || req.user.id;
      const result:any = await this.enrollmentService.getUserEnrollments(
        targetUserId,
        {
          courseId,
          page: page || 1,
          limit: limit || 20,
        },
      );
      return result;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to retrieve enrollments',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('course/:courseId/user/:userId')
  @ApiOperation({ summary: 'Get user enrollment for specific course' })
  @ApiParam({
    name: 'courseId',
    description: 'Course ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Enrollment retrieved successfully',
    type: EnrollmentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Enrollment not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  async getCourseEnrollment(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Request() req: any,
  ): Promise<EnrollmentResponseDto> {
    try {
      console.log({ courseId,
       req: req.user,})
      const enrollment = await this.enrollmentService.getUserEnrollment(
        courseId,
        req.user,
      );
      console.log("Enrollement: ", enrollment)
      if(!enrollment) throw new HttpException("Enrollment not found", HttpStatus.NOT_FOUND)
      return new EnrollmentResponseDto(enrollment);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to retrieve course enrollment',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id/progress/lesson/:lessonId')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Update lesson progress' })
  @ApiParam({
    name: 'id',
    description: 'Enrollment ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'lessonId',
    description: 'Lesson ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lesson progress updated successfully',
    type: LessonProgressResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Enrollment or lesson not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  @ApiBody({ type: UpdateLessonProgressDto })
  async updateLessonProgress(
    @Param('id', ParseUUIDPipe) enrollmentId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() updateProgressDto: UpdateLessonProgressDto,
    @Request() req: any,
  ): Promise<LessonProgressResponseDto> {
    try {
      const progress = await this.enrollmentService.updateLessonProgress(
        enrollmentId,
        lessonId,
        req.user.id,
        
      );
      return new LessonProgressResponseDto(progress);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update lesson progress',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/progress/lesson/:lessonId/complete')
  @ApiOperation({ summary: 'Mark lesson as completed' })
  @ApiParam({
    name: 'id',
    description: 'Enrollment ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'lessonId',
    description: 'Lesson ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lesson completed successfully',
    type: LessonProgressResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Enrollment or lesson not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  async completeLesson(
    @Param('id', ParseUUIDPipe) enrollmentId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Request() req: any,
  ): Promise<LessonProgressResponseDto> {
    try {
      const progress = await this.enrollmentService.completeLesson(
        enrollmentId,
        lessonId,
        req.user.id,
      );
      return new LessonProgressResponseDto(progress);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to complete lesson',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/progress')
  @ApiOperation({ summary: 'Get enrollment progress details' })
  @ApiParam({
    name: 'id',
    description: 'Enrollment ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Enrollment progress retrieved successfully',
    type: EnrollmentProgressResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Enrollment not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  async getEnrollmentProgress(
    @Param('id', ParseUUIDPipe) enrollmentId: string,
    @Request() req: any,
  ): Promise<EnrollmentProgressResponseDto> {
    try {
      const progress = await this.enrollmentService.getEnrollmentProgress(
        enrollmentId,
        req.user,
      );
      return new EnrollmentProgressResponseDto(progress);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to retrieve enrollment progress',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('course/:courseId/analytics')
  @UseGuards(RolesGuard )
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR, UserRole.CONTENT_CREATOR)
  @ApiOperation({ summary: 'Get course progress analytics' })
  @ApiParam({
    name: 'courseId',
    description: 'Course ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Course analytics retrieved successfully',
    type: CourseProgressAnalyticsDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Course not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async getCourseProgressAnalytics(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Request() req?: any,
  ): Promise<CourseProgressAnalyticsDto> {
    try {
      const analytics = await this.enrollmentService.getCourseProgressAnalytics(
        courseId,
        req.user,
        // {
        //   startDate: startDate ? new Date(startDate) : undefined,
        //   endDate: endDate ? new Date(endDate) : undefined,
        // },
      );
      return new CourseProgressAnalyticsDto(analytics);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to retrieve course analytics',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Unenroll user from course' })
  @ApiParam({
    name: 'id',
    description: 'Enrollment ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User unenrolled successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Enrollment not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  async unenrollUser(
    @Param('id', ParseUUIDPipe) enrollmentId: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    try {
      await this.enrollmentService.unenrollUser(enrollmentId, req.user);
      return { message: 'User unenrolled successfully' };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to unenroll user',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
