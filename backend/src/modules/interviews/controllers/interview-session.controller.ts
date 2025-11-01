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

import { UserRole } from '../../../database/entities/user.entity';
import { InterviewSessionService } from '../services/interview-session.service';
import {
  CreateInterviewSessionDto,
  UpdateInterviewSessionDto,
  SearchInterviewSessionsDto,
  RescheduleInterviewDto,
  StartInterviewDto,
  CompleteInterviewDto,
  InterviewSessionResponseDto,
  InterviewSessionListResponseDto,
  InterviewCalendarEventDto,
  InterviewStatsDto,
} from '../dto/interview-session.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@ApiTags('Interview Sessions')
@Controller('interviews/sessions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class InterviewSessionController {
  constructor(private readonly interviewSessionService: InterviewSessionService) {}

  @Post()
  // @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR, UserRole.CONTENT_CREATOR)
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Create a new interview session' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Interview session created successfully',
    type: InterviewSessionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or scheduling conflict',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiBody({ type: CreateInterviewSessionDto })
  async createInterviewSession(
    @Body() createDto: CreateInterviewSessionDto,
    @Request() req: any,
  ): Promise<InterviewSessionResponseDto> {
    try {
      console.log("Inside creat job controller")
      const session = await this.interviewSessionService.createInterviewSession(createDto, req.user);
      return new InterviewSessionResponseDto(session);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create interview session',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Search interview sessions' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'candidateId', required: false, type: String })
  @ApiQuery({ name: 'interviewerId', required: false, type: String })
  @ApiQuery({ name: 'jobId', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, enum: ['technical', 'behavioral', 'hr', 'case_study', 'group', 'panel'] })
  @ApiQuery({ name: 'status', required: false, enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'] })
  @ApiQuery({ name: 'mode', required: false, enum: ['video', 'audio', 'chat', 'in_person'] })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Interview sessions retrieved successfully',
    type: InterviewSessionListResponseDto,
  })
  async searchInterviewSessions(
    @Query() searchDto: SearchInterviewSessionsDto,
    @Request() req: any,
  ): Promise<InterviewSessionListResponseDto> {
    try {
      return await this.interviewSessionService.searchInterviewSessions(searchDto, req.user);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to search interview sessions',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get interview session by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Interview session retrieved successfully',
    type: InterviewSessionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Interview session not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  async getInterviewSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<InterviewSessionResponseDto> {
    try {
      const session = await this.interviewSessionService.getInterviewSessionById(id, req.user);
      return new InterviewSessionResponseDto(session);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to retrieve interview session',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR, UserRole.CONTENT_CREATOR)
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Update interview session' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Interview session updated successfully',
    type: InterviewSessionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Interview session not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiBody({ type: UpdateInterviewSessionDto })
  async updateInterviewSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateInterviewSessionDto,
    @Request() req: any,
  ): Promise<InterviewSessionResponseDto> {
    try {
      const session = await this.interviewSessionService.updateInterviewSession(id, updateDto, req.user);
      return new InterviewSessionResponseDto(session);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update interview session',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/reschedule')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Reschedule interview session' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Interview session rescheduled successfully',
    type: InterviewSessionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot reschedule interview or scheduling conflict',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions to reschedule',
  })
  @ApiBody({ type: RescheduleInterviewDto })
  async rescheduleInterview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() rescheduleDto: RescheduleInterviewDto,
    @Request() req: any,
  ): Promise<InterviewSessionResponseDto> {
    try {
      const session = await this.interviewSessionService.rescheduleInterview(id, rescheduleDto, req.user);
      return new InterviewSessionResponseDto(session);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to reschedule interview',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/start')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Start interview session' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Interview session started successfully',
    type: InterviewSessionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Interview cannot be started yet',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions to start interview',
  })
  @ApiBody({ type: StartInterviewDto })
  async startInterview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() startDto: StartInterviewDto,
    @Request() req: any,
  ): Promise<InterviewSessionResponseDto> {
    try {
      const session = await this.interviewSessionService.startInterview(id, startDto, req.user);
      return new InterviewSessionResponseDto(session);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to start interview',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/complete')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR, UserRole.CONTENT_CREATOR)
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Complete interview session' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Interview session completed successfully',
    type: InterviewSessionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only interviewer or admin can complete interview',
  })
  @ApiBody({ type: CompleteInterviewDto })
  async completeInterview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() completeDto: CompleteInterviewDto,
    @Request() req: any,
  ): Promise<InterviewSessionResponseDto> {
    try {
      const session = await this.interviewSessionService.completeInterview(id, completeDto, req.user);
      return new InterviewSessionResponseDto(session);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to complete interview',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR, UserRole.CONTENT_CREATOR)
  @ApiOperation({ summary: 'Cancel interview session' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Interview session cancelled successfully',
    type: InterviewSessionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions to cancel interview',
  })
  async cancelInterview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @Request() req: any,
  ): Promise<InterviewSessionResponseDto> {
    try {
      const session = await this.interviewSessionService.cancelInterview(id, reason, req.user);
      return new InterviewSessionResponseDto(session);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to cancel interview',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('user/:userId/upcoming')
  @ApiOperation({ summary: 'Get upcoming interviews for user' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Upcoming interviews retrieved successfully',
    type: [InterviewSessionResponseDto],
  })
  async getUpcomingInterviews(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Request() req: any,
  ): Promise<InterviewSessionResponseDto[]> {
    try {
      const sessions = await this.interviewSessionService.getUpcomingInterviews(userId, req.user);
      return sessions.map(session => new InterviewSessionResponseDto(session));
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get upcoming interviews',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('user/:userId/history')
  @ApiOperation({ summary: 'Get interview history for user' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Interview history retrieved successfully',
    type: [InterviewSessionResponseDto],
  })
  async getInterviewHistory(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Request() req: any,
  ): Promise<InterviewSessionResponseDto[]> {
    try {
      const sessions = await this.interviewSessionService.getInterviewHistory(userId, req.user);
      return sessions.map(session => new InterviewSessionResponseDto(session));
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get interview history',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('calendar/events')
  @ApiOperation({ summary: 'Get interview calendar events' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Calendar events retrieved successfully',
    type: [InterviewCalendarEventDto],
  })
  async getCalendarEvents(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Request() req?: any,
  ): Promise<InterviewCalendarEventDto[]> {
    try {
      const searchDto = {
        startDate,
        endDate,
        status: 'scheduled' as any,
      };

      const result = await this.interviewSessionService.searchInterviewSessions(searchDto, req.user);
      return result.items.map(session => new InterviewCalendarEventDto(session));
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get calendar events',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('statistics/overview')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Get interview statistics overview' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Interview statistics retrieved successfully',
    type: InterviewStatsDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async getInterviewStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Request() req?: any,
  ): Promise<InterviewStatsDto> {
    try {
      const searchDto = {
        startDate,
        endDate,
      };

      const result = await this.interviewSessionService.searchInterviewSessions(searchDto, req.user);
      
      // Calculate statistics from results
      const sessions = result.items;
      const totalScheduled = sessions.length;
      const completed = sessions.filter(s => s.status === 'completed').length;
      const cancelled = sessions.filter(s => s.status === 'cancelled').length;
      const noShows = sessions.filter(s => s.status === 'no_show').length;

      const sessionsWithScores = sessions.filter(s => s.score !== null && s.score !== undefined);
      const averageScore = sessionsWithScores.length > 0
        ? sessionsWithScores.reduce((sum, s) => sum + s.score, 0) / sessionsWithScores.length
        : 0;

      const completedSessions = sessions.filter(s => s.virtualProperties?.actualDuration > 0);
      const averageDuration = completedSessions.length > 0
        ? completedSessions.reduce((sum, s) => sum + s.virtualProperties.actualDuration, 0) / completedSessions.length
        : 0;

      const byType = sessions.reduce((acc, session) => {
        acc[session.type] = (acc[session.type] || 0) + 1;
        return acc;
      }, {} as any);

      const byStatus = sessions.reduce((acc, session) => {
        acc[session.status] = (acc[session.status] || 0) + 1;
        return acc;
      }, {} as any);

      // Mock monthly trends - in real implementation, this would query historical data
      const monthlyTrends = [
        { month: '2024-01', scheduled: 45, completed: 38, averageScore: 78 },
        { month: '2024-02', scheduled: 52, completed: 44, averageScore: 81 },
        { month: '2024-03', scheduled: 48, completed: 41, averageScore: 79 },
      ];

      const stats = {
        totalScheduled,
        completed,
        cancelled,
        noShows,
        averageScore,
        averageDuration,
        byType,
        byStatus,
        monthlyTrends,
      };

      return new InterviewStatsDto(stats);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get interview statistics',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
