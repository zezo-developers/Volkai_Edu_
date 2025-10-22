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
import { AiMockInterviewService } from '../services/ai-mock-interview.service';
import {
  CreateAiMockInterviewDto,
  UpdateAiMockInterviewDto,
  StartAiInterviewDto,
  SubmitAiResponseDto,
  AiMockInterviewResponseDto,
  AiMockInterviewListResponseDto,
  AiInterviewAnalyticsDto,
  AiInterviewQuestionDto,
  AiInterviewFeedbackDto,
  AiInterviewReportDto,
} from '../dto/ai-mock-interview.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@ApiTags('AI Mock Interviews')
@Controller('interviews/ai-mock')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiMockInterviewController {
  constructor(private readonly aiMockInterviewService: AiMockInterviewService) {}

  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Create a new AI mock interview' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'AI mock interview created successfully',
    type: AiMockInterviewResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiBody({ type: CreateAiMockInterviewDto })
  async createAiMockInterview(
    @Body() createDto: CreateAiMockInterviewDto,
    @Request() req: any,
  ): Promise<AiMockInterviewResponseDto> {
    try {
      const interview = await this.aiMockInterviewService.createAiMockInterview(createDto, req.user);
      return new AiMockInterviewResponseDto(interview);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create AI mock interview',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get AI mock interview by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'AI mock interview retrieved successfully',
    type: AiMockInterviewResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'AI mock interview not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  async getAiMockInterview(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<AiMockInterviewResponseDto> {
    try {
      const interview = await this.aiMockInterviewService.getAiMockInterviewById(id, req.user);
      return new AiMockInterviewResponseDto(interview);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to retrieve AI mock interview',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get AI mock interviews for user' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User AI mock interviews retrieved successfully',
    type: AiMockInterviewListResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  async getUserAiInterviews(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Request() req?: any,
  ): Promise<AiMockInterviewListResponseDto> {
    try {
      return await this.aiMockInterviewService.getUserAiInterviews(
        userId,
        req.user,
        page || 1,
        limit || 20,
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get user AI interviews',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Update AI mock interview' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'AI mock interview updated successfully',
    type: AiMockInterviewResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'AI mock interview not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  @ApiBody({ type: UpdateAiMockInterviewDto })
  async updateAiMockInterview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateAiMockInterviewDto,
    @Request() req: any,
  ): Promise<AiMockInterviewResponseDto> {
    try {
      const interview = await this.aiMockInterviewService.getAiMockInterviewById(id, req.user);
      // Update logic would go here - for now just return the interview
      return new AiMockInterviewResponseDto(interview);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update AI mock interview',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/start')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Start AI mock interview' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'AI mock interview started successfully',
    type: AiMockInterviewResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Interview cannot be started or already started',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  @ApiBody({ type: StartAiInterviewDto })
  async startAiInterview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() startDto: StartAiInterviewDto,
    @Request() req: any,
  ): Promise<AiMockInterviewResponseDto> {
    try {
      const interview = await this.aiMockInterviewService.startAiInterview(id, startDto, req.user);
      return new AiMockInterviewResponseDto(interview);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to start AI mock interview',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/response')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Submit response to AI mock interview' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Response submitted successfully',
    type: AiInterviewFeedbackDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Interview not in progress or invalid response',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  @ApiBody({ type: SubmitAiResponseDto })
  async submitAiResponse(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() responseDto: SubmitAiResponseDto,
    @Request() req: any,
  ): Promise<AiInterviewFeedbackDto> {
    try {
      const result = await this.aiMockInterviewService.submitAiResponse(id, responseDto, req.user);
      return new AiInterviewFeedbackDto(result);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to submit AI response',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete AI mock interview' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'AI mock interview completed successfully',
    type: AiMockInterviewResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Interview not in progress',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  async completeAiInterview(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<AiMockInterviewResponseDto> {
    try {
      const interview = await this.aiMockInterviewService.getAiMockInterviewById(id, req.user);
      const completedInterview = await this.aiMockInterviewService.completeAiInterview(interview);
      return new AiMockInterviewResponseDto(completedInterview);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to complete AI mock interview',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel AI mock interview' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'AI mock interview cancelled successfully',
    type: AiMockInterviewResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  async cancelAiInterview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @Request() req: any,
  ): Promise<AiMockInterviewResponseDto> {
    try {
      const interview = await this.aiMockInterviewService.cancelAiInterview(id, reason, req.user);
      return new AiMockInterviewResponseDto(interview);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to cancel AI mock interview',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/report')
  @ApiOperation({ summary: 'Get AI mock interview report' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'AI mock interview report retrieved successfully',
    type: AiInterviewReportDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'AI mock interview not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  async getAiInterviewReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<AiInterviewReportDto> {
    try {
      const interview = await this.aiMockInterviewService.getAiMockInterviewById(id, req.user);
      const report = interview.generateReport();
      return new AiInterviewReportDto(report);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get AI interview report',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/transcript')
  @ApiOperation({ summary: 'Get AI mock interview transcript' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'AI mock interview transcript retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        transcript: { type: 'string' },
        conversations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              speaker: { type: 'string' },
              message: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
              confidence: { type: 'number' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'AI mock interview not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  async getAiInterviewTranscript(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<{ transcript: string; conversations: any[] }> {
    try {
      const interview = await this.aiMockInterviewService.getAiMockInterviewById(id, req.user);
      
      return {
        transcript: interview.exportTranscript(),
        conversations: interview.transcript.conversations || [],
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get AI interview transcript',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('user/:userId/analytics')
  @ApiOperation({ summary: 'Get AI interview analytics for user' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'AI interview analytics retrieved successfully',
    type: AiInterviewAnalyticsDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  async getAiInterviewAnalytics(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Request() req?: any,
  ): Promise<AiInterviewAnalyticsDto> {
    try {
      return await this.aiMockInterviewService.getAiInterviewAnalytics(
        userId,
        req.user,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined,
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get AI interview analytics',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/insights')
  @ApiOperation({ summary: 'Get AI mock interview insights' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'AI mock interview insights retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        communicationScore: { type: 'number' },
        technicalScore: { type: 'number' },
        confidenceLevel: { type: 'number' },
        responseTime: { type: 'number' },
        engagementScore: { type: 'number' },
        improvementPriority: { type: 'array', items: { type: 'string' } },
        topStrengths: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'AI mock interview not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  async getAiInterviewInsights(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<Record<string, any>> {
    try {
      const interview = await this.aiMockInterviewService.getAiMockInterviewById(id, req.user);
      return interview.getInsights();
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get AI interview insights',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('recommendations/job-roles')
  @ApiOperation({ summary: 'Get recommended job roles for AI interviews' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recommended job roles retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          jobRole: { type: 'string' },
          category: { type: 'string' },
          difficulty: { type: 'string' },
          popularity: { type: 'number' },
          averageScore: { type: 'number' },
        },
      },
    },
  })
  async getRecommendedJobRoles(
    @Query('search') search?: string,
  ): Promise<any[]> {
    try {
      // Mock data - in real implementation, this would query popular job roles
      const jobRoles = [
        {
          jobRole: 'Software Engineer',
          category: 'Technology',
          difficulty: 'medium',
          popularity: 95,
          averageScore: 78,
        },
        {
          jobRole: 'Product Manager',
          category: 'Management',
          difficulty: 'hard',
          popularity: 87,
          averageScore: 82,
        },
        {
          jobRole: 'Data Scientist',
          category: 'Technology',
          difficulty: 'hard',
          popularity: 79,
          averageScore: 75,
        },
        {
          jobRole: 'UX Designer',
          category: 'Design',
          difficulty: 'medium',
          popularity: 73,
          averageScore: 80,
        },
        {
          jobRole: 'Marketing Manager',
          category: 'Marketing',
          difficulty: 'medium',
          popularity: 68,
          averageScore: 77,
        },
      ];

      if (search) {
        return jobRoles.filter(role => 
          role.jobRole.toLowerCase().includes(search.toLowerCase()) ||
          role.category.toLowerCase().includes(search.toLowerCase())
        );
      }

      return jobRoles;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get recommended job roles',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('statistics/global')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Get global AI interview statistics' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Global AI interview statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalInterviews: { type: 'number' },
        completedInterviews: { type: 'number' },
        averageScore: { type: 'number' },
        averageDuration: { type: 'number' },
        popularJobRoles: { type: 'array' },
        skillTrends: { type: 'object' },
        userEngagement: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async getGlobalAiInterviewStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<Record<string, any>> {
    try {
      // Mock global statistics - in real implementation, this would aggregate data
      return {
        totalInterviews: 12450,
        completedInterviews: 10890,
        averageScore: 76.5,
        averageDuration: 28.3,
        popularJobRoles: [
          { role: 'Software Engineer', count: 3240, avgScore: 78.2 },
          { role: 'Product Manager', count: 2150, avgScore: 82.1 },
          { role: 'Data Scientist', count: 1890, avgScore: 75.8 },
        ],
        skillTrends: {
          communication: { trend: 'up', change: 5.2 },
          technical: { trend: 'stable', change: 0.8 },
          problemSolving: { trend: 'up', change: 3.1 },
        },
        userEngagement: {
          dailyActiveUsers: 450,
          weeklyActiveUsers: 1250,
          monthlyActiveUsers: 3800,
          retentionRate: 68.5,
        },
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get global AI interview statistics',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
