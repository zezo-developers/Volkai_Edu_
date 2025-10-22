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
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User, UserRole } from '../../../database/entities/user.entity';
import { ApplicationTrackingService } from '../services/application-tracking.service';
import {
  CreateApplicationDto,
  UpdateApplicationDto,
  SearchApplicationsDto,
  ApplicationResponseDto,
  ApplicationListResponseDto,
  BulkUpdateApplicationsDto,
  ApplicationTimelineDto,
  ScreeningResultsDto,
} from '../dto/application-tracking.dto';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@ApiTags('Application Tracking')
@Controller('hr/applications')
export class ApplicationTrackingController {
  constructor(
    private readonly applicationService: ApplicationTrackingService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Submit a job application' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Application submitted successfully',
    type: ApplicationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid application data or duplicate application',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Job not found or not accepting applications',
  })
  async createApplication(
    @Body(ValidationPipe) createDto: CreateApplicationDto,
    @CurrentUser() user?: User,
  ): Promise<ApplicationResponseDto> {
    const application = await this.applicationService.createApplication(createDto, user);
    return new ApplicationResponseDto(application);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Search and list applications' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Applications retrieved successfully',
    type: ApplicationListResponseDto,
  })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiQuery({ name: 'jobId', required: false, description: 'Filter by job ID' })
  @ApiQuery({ name: 'candidateId', required: false, description: 'Filter by candidate ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'stage', required: false, description: 'Filter by stage' })
  @ApiQuery({ name: 'assignedTo', required: false, description: 'Filter by assigned recruiter' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  async searchApplications(
    @Query(ValidationPipe) searchDto: SearchApplicationsDto,
    @CurrentUser() user: User,
  ): Promise<ApplicationListResponseDto> {
    return await this.applicationService.searchApplications(searchDto, user);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user applications' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User applications retrieved successfully',
    type: ApplicationListResponseDto,
  })
  async getMyApplications(
    @Query(ValidationPipe) searchDto: SearchApplicationsDto,
    @CurrentUser() user: User,
  ): Promise<ApplicationListResponseDto> {
    const myApplicationsDto = { ...searchDto, candidateId: user.id };
    return await this.applicationService.searchApplications(myApplicationsDto, user);
  }

  @Get('assigned-to-me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get applications assigned to current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Assigned applications retrieved successfully',
    type: ApplicationListResponseDto,
  })
  async getAssignedApplications(
    @Query(ValidationPipe) searchDto: SearchApplicationsDto,
    @CurrentUser() user: User,
  ): Promise<ApplicationListResponseDto> {
    const assignedDto = { ...searchDto, assignedTo: user.id };
    return await this.applicationService.searchApplications(assignedDto, user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get application by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Application retrieved successfully',
    type: ApplicationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Application not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  @ApiParam({ name: 'id', description: 'Application ID' })
  async getApplicationById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<ApplicationResponseDto> {
    const application = await this.applicationService.getApplicationById(id, user);
    return new ApplicationResponseDto(application);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update application' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Application updated successfully',
    type: ApplicationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Application not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid status/stage transition',
  })
  @ApiParam({ name: 'id', description: 'Application ID' })
  async updateApplication(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateDto: UpdateApplicationDto,
    @CurrentUser() user: User,
  ): Promise<ApplicationResponseDto> {
    const application = await this.applicationService.updateApplication(id, updateDto, user);
    return new ApplicationResponseDto(application);
  }

  @Post('bulk-update')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Bulk update applications' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bulk update completed',
    schema: {
      type: 'object',
      properties: {
        updated: { type: 'number' },
        errors: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async bulkUpdateApplications(
    @Body(ValidationPipe) bulkUpdateDto: BulkUpdateApplicationsDto,
    @CurrentUser() user: User,
  ): Promise<{ updated: number; errors: string[] }> {
    return await this.applicationService.bulkUpdateApplications(bulkUpdateDto, user);
  }

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Reject application' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Application rejected successfully',
    type: ApplicationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Application not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiParam({ name: 'id', description: 'Application ID' })
  async rejectApplication(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @Body('feedback') feedback?: string,
    @Body('sendFeedback') sendFeedback: boolean = false,
    @CurrentUser() user?: User,
  ): Promise<ApplicationResponseDto> {
    const application = await this.applicationService.rejectApplication(
      id,
      reason,
      feedback,
      sendFeedback,
      user,
    );
    return new ApplicationResponseDto(application);
  }

  @Post(':id/withdraw')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Withdraw application (candidate only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Application withdrawn successfully',
    type: ApplicationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Application not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only candidate can withdraw application',
  })
  @ApiParam({ name: 'id', description: 'Application ID' })
  async withdrawApplication(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason?: string,
    @CurrentUser() user?: User,
  ): Promise<ApplicationResponseDto> {
    const application = await this.applicationService.withdrawApplication(id, reason, user);
    return new ApplicationResponseDto(application);
  }

  @Post(':id/schedule-interview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Schedule interview for application' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Interview scheduled successfully',
    type: ApplicationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Application not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiParam({ name: 'id', description: 'Application ID' })
  async scheduleInterview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() interviewData: {
      type: string;
      scheduledAt: Date;
      interviewers: string[];
    },
    @CurrentUser() user: User,
  ): Promise<ApplicationResponseDto> {
    const application = await this.applicationService.scheduleInterview(id, interviewData, user);
    return new ApplicationResponseDto(application);
  }

  @Post(':id/interview-feedback')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Add interview feedback' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Interview feedback added successfully',
    type: ApplicationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Application not found',
  })
  @ApiParam({ name: 'id', description: 'Application ID' })
  async addInterviewFeedback(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() feedback: {
      interviewId: string;
      interviewer: string;
      rating: number;
      feedback: string;
      recommendation: 'hire' | 'no_hire' | 'maybe';
    },
    @CurrentUser() user: User,
  ): Promise<ApplicationResponseDto> {
    const application = await this.applicationService.addInterviewFeedback(id, feedback, user);
    return new ApplicationResponseDto(application);
  }

  @Post(':id/communication')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Add communication record' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Communication added successfully',
    type: ApplicationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Application not found',
  })
  @ApiParam({ name: 'id', description: 'Application ID' })
  async addCommunication(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() communication: {
      type: 'email' | 'phone' | 'message' | 'meeting';
      direction: 'inbound' | 'outbound';
      subject?: string;
      content: string;
      attachments?: Array<{ name: string; url: string; }>;
    },
    @CurrentUser() user: User,
  ): Promise<ApplicationResponseDto> {
    const application = await this.applicationService.addCommunication(id, communication, user);
    return new ApplicationResponseDto(application);
  }

  @Get(':id/timeline')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get application timeline' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Application timeline retrieved successfully',
    type: ApplicationTimelineDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Application not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  @ApiParam({ name: 'id', description: 'Application ID' })
  async getApplicationTimeline(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<ApplicationTimelineDto> {
    return await this.applicationService.getApplicationTimeline(id, user);
  }

  @Get(':id/screening')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get screening results' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Screening results retrieved successfully',
    type: ScreeningResultsDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Application not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiParam({ name: 'id', description: 'Application ID' })
  async getScreeningResults(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<ScreeningResultsDto> {
    return await this.applicationService.getScreeningResults(id, user);
  }

  @Get('pipeline/:jobId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get application pipeline for a job' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Application pipeline retrieved successfully',
  })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  async getApplicationPipeline(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser() user: User,
  ): Promise<any> {
    const searchDto = { jobId, limit: 100 };
    const applications = await this.applicationService.searchApplications(searchDto, user);

    // Group applications by stage
    const pipeline = applications.items.reduce((acc, app) => {
      if (!acc[app.stage]) {
        acc[app.stage] = [];
      }
      acc[app.stage].push(app);
      return acc;
    }, {} as Record<string, ApplicationResponseDto[]>);

    // Calculate pipeline metrics
    const metrics = {
      total: applications.total,
      byStage: Object.keys(pipeline).reduce((acc, stage) => {
        acc[stage] = pipeline[stage].length;
        return acc;
      }, {} as Record<string, number>),
      byStatus: applications.items.reduce((acc, app) => {
        acc[app.status] = (acc[app.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    return {
      jobId,
      pipeline,
      metrics,
      stageOrder: ['screening', 'phone_screen', 'technical', 'onsite', 'final', 'offer', 'hired'],
    };
  }

  @Get('analytics/overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get application analytics overview' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Application analytics retrieved successfully',
  })
  @ApiQuery({ name: 'organizationId', required: false, description: 'Filter by organization' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Start date for analytics' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'End date for analytics' })
  async getApplicationAnalytics(
    @Query('organizationId') organizationId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @CurrentUser() user?: User,
  ): Promise<any> {
    // This would typically call a dedicated analytics service
    // For now, return mock analytics data
    return {
      period: {
        from: dateFrom,
        to: dateTo,
      },
      metrics: {
        totalApplications: 1250,
        newApplications: 85,
        applicationsInReview: 234,
        interviewsScheduled: 45,
        offersExtended: 12,
        hires: 8,
      },
      conversionRates: {
        applicationToScreening: 78.5,
        screeningToInterview: 45.2,
        interviewToOffer: 28.7,
        offerToHire: 85.3,
      },
      averageTimeToHire: 18.5, // days
      topSources: [
        { source: 'direct', count: 450, percentage: 36 },
        { source: 'linkedin', count: 375, percentage: 30 },
        { source: 'referral', count: 250, percentage: 20 },
        { source: 'job_board', count: 175, percentage: 14 },
      ],
      trends: {
        applicationsOverTime: [
          { date: '2024-10-01', count: 25 },
          { date: '2024-10-02', count: 32 },
          { date: '2024-10-03', count: 28 },
          // ... more data points
        ],
      },
    };
  }

  @Post(':id/assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Assign application to recruiter' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Application assigned successfully',
    type: ApplicationResponseDto,
  })
  @ApiParam({ name: 'id', description: 'Application ID' })
  async assignApplication(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('assignedTo') assignedTo: string,
    @CurrentUser() user: User,
  ): Promise<ApplicationResponseDto> {
    const updateDto = { assignedTo };
    const application = await this.applicationService.updateApplication(id, updateDto, user);
    return new ApplicationResponseDto(application);
  }

  @Post(':id/unassign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Unassign application from recruiter' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Application unassigned successfully',
    type: ApplicationResponseDto,
  })
  @ApiParam({ name: 'id', description: 'Application ID' })
  async unassignApplication(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<ApplicationResponseDto> {
    const updateDto = { assignedTo: null };
    const application = await this.applicationService.updateApplication(id, updateDto, user);
    return new ApplicationResponseDto(application);
  }
}
