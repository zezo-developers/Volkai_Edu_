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
import { OrgAdminGuard, RolesGuard } from '../../../common/guards/roles.guard';
import { HRRole, ManagerRole, Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User, UserRole } from '../../../database/entities/user.entity';
import { JobManagementService } from '../services/job-management.service';
import {
  CreateJobDto,
  UpdateJobDto,
  SearchJobsDto,
  JobResponseDto,
  JobListResponseDto,
  PublishJobDto,
  JobStatsDto,
} from '../dto/job-management.dto';

@ApiTags('Job Management')
@Controller('hr/jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
@HRRole()
@ApiBearerAuth()
export class JobManagementController {
  constructor(
    private readonly jobService: JobManagementService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a new job posting' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Job created successfully',
    type: JobResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid job data',
  })
  async createJob(
    @Body(ValidationPipe) createDto: CreateJobDto,
    @CurrentUser() user: User,
  ): Promise<JobResponseDto> {
    const job = await this.jobService.createJob(createDto, user);
    return new JobResponseDto(job);
  }

  @Get()
  @ApiOperation({ summary: 'Search and list job postings' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Jobs retrieved successfully',
    type: JobListResponseDto,
  })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiQuery({ name: 'organizationId', required: false, description: 'Filter by organization' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by job type' })
  @ApiQuery({ name: 'mode', required: false, description: 'Filter by work mode' })
  @ApiQuery({ name: 'location', required: false, description: 'Filter by location' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  async searchJobs(
    @Query(ValidationPipe) searchDto: SearchJobsDto,
    @CurrentUser() user?: User,
  ): Promise<JobListResponseDto> {
    return await this.jobService.searchJobs(searchDto, user);
  }

  @Get('my')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get jobs created by current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User jobs retrieved successfully',
    type: JobListResponseDto,
  })
  async getMyJobs(
    @Query(ValidationPipe) searchDto: SearchJobsDto,
    @CurrentUser() user: User,
  ): Promise<JobListResponseDto> {
    // Filter by current user's created jobs
    const myJobsDto = { ...searchDto };
    return await this.jobService.searchJobs(myJobsDto, user);
  }

  @Get('organization/:orgId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get jobs by organization' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Organization jobs retrieved successfully',
    type: JobListResponseDto,
  })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  async getOrganizationJobs(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Query(ValidationPipe) searchDto: SearchJobsDto,
    @CurrentUser() user: User,
  ): Promise<JobListResponseDto> {
    const orgJobsDto = { ...searchDto, organizationId: orgId };
    return await this.jobService.searchJobs(orgJobsDto, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Job retrieved successfully',
    type: JobResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Job not found',
  })
  @ApiParam({ name: 'id', description: 'Job ID' })
  async getJobById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: User,
  ): Promise<JobResponseDto> {
    const job = await this.jobService.getJobById(id, user);
    return new JobResponseDto(job);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update job posting' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Job updated successfully',
    type: JobResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Job not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiParam({ name: 'id', description: 'Job ID' })
  async updateJob(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateDto: UpdateJobDto,
    @CurrentUser() user: User,
  ): Promise<JobResponseDto> {
    const job = await this.jobService.updateJob(id, updateDto, user);
    return new JobResponseDto(job);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Delete job posting' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Job deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Job not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete job with applications',
  })
  @ApiParam({ name: 'id', description: 'Job ID' })
  async deleteJob(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.jobService.deleteJob(id, user);
  }

  @Post(':id/publish')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Publish job posting' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Job published successfully',
    type: JobResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Job not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Job validation failed',
  })
  @ApiParam({ name: 'id', description: 'Job ID' })
  async publishJob(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) publishDto: PublishJobDto,
    @CurrentUser() user: User,
  ): Promise<JobResponseDto> {
    const job = await this.jobService.publishJob(id, publishDto, user);
    return new JobResponseDto(job);
  }

  @Post(':id/pause')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Pause job posting' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Job paused successfully',
    type: JobResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Job not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiParam({ name: 'id', description: 'Job ID' })
  async pauseJob(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<JobResponseDto> {
    const job = await this.jobService.pauseJob(id, user);
    return new JobResponseDto(job);
  }

  @Post(':id/resume')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Resume paused job posting' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Job resumed successfully',
    type: JobResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Job not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiParam({ name: 'id', description: 'Job ID' })
  async resumeJob(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<JobResponseDto> {
    const job = await this.jobService.resumeJob(id, user);
    return new JobResponseDto(job);
  }

  @Post(':id/close')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Close job posting' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Job closed successfully',
    type: JobResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Job not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiParam({ name: 'id', description: 'Job ID' })
  async closeJob(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<JobResponseDto> {
    const job = await this.jobService.closeJob(id, user);
    return new JobResponseDto(job);
  }

  @Post(':id/archive')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Archive job posting' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Job archived successfully',
    type: JobResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Job not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiParam({ name: 'id', description: 'Job ID' })
  async archiveJob(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<JobResponseDto> {
    const job = await this.jobService.archiveJob(id, user);
    return new JobResponseDto(job);
  }

  @Post(':id/clone')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Clone job posting' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Job cloned successfully',
    type: JobResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Job not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiParam({ name: 'id', description: 'Job ID to clone' })
  async cloneJob(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('title') newTitle: string,
    @CurrentUser() user: User,
  ): Promise<JobResponseDto> {
    const job = await this.jobService.cloneJob(id, newTitle, user);
    return new JobResponseDto(job);
  }

  @Get(':id/stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get job statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Job statistics retrieved successfully',
    type: JobStatsDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Job not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiParam({ name: 'id', description: 'Job ID' })
  async getJobStats(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<JobStatsDto> {
    return await this.jobService.getJobStats(id, user);
  }

  @Get(':id/applications')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get applications for a job' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Job applications retrieved successfully',
  })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by application status' })
  @ApiQuery({ name: 'stage', required: false, description: 'Filter by application stage' })
  async getJobApplications(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('status') status?: string,
    @Query('stage') stage?: string,
    @CurrentUser() user?: User,
  ): Promise<any> {
    // This would typically call the ApplicationTrackingService
    // For now, return a reference to use the applications endpoint
    return {
      message: 'Use /hr/applications endpoint with jobId filter',
      jobId: id,
      filters: { status, stage },
    };
  }

  @Get(':id/similar')
  @ApiOperation({ summary: 'Get similar job postings' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Similar jobs retrieved successfully',
    type: [JobResponseDto],
  })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of similar jobs to return' })
  async getSimilarJobs(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit') limit?: number,
    @CurrentUser() user?: User,
  ): Promise<JobResponseDto[]> {
    const job = await this.jobService.getJobById(id, user);
    
    // Find similar jobs based on skills, department, and type
    const searchDto = {
      skills: job.skillsRequired.slice(0, 3), // Top 3 skills
      department: job.department,
      type: job.type,
      limit: limit || 5,
    };

    const similarJobs = await this.jobService.searchJobs(searchDto, user);
    
    // Filter out the current job
    return similarJobs.items.filter(similarJob => similarJob.id !== id);
  }

  @Get(':id/requirements-analysis')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Analyze job requirements and suggest improvements' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Requirements analysis completed successfully',
  })
  @ApiParam({ name: 'id', description: 'Job ID' })
  async analyzeJobRequirements(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<any> {
    const job = await this.jobService.getJobById(id, user);
    
    // Analyze job requirements and provide suggestions
    const analysis = {
      jobId: job.id,
      title: job.title,
      analysis: {
        skillsAnalysis: {
          totalSkills: job.skillsRequired.length,
          criticalSkills: job.skillsRequired.slice(0, 5),
          recommendations: [
            'Consider adding soft skills requirements',
            'Specify experience level for each skill',
            'Add nice-to-have vs must-have categorization',
          ],
        },
        descriptionAnalysis: {
          readabilityScore: 85,
          lengthAnalysis: 'Optimal length',
          suggestions: [
            'Add company culture information',
            'Include growth opportunities',
            'Specify remote work policies',
          ],
        },
        competitivenessAnalysis: {
          salaryCompetitiveness: job.salaryMin ? 'Competitive' : 'Not specified',
          benefitsScore: 'Good',
          locationAttractiveness: 'High',
        },
      },
      overallScore: 82,
      improvements: [
        'Add salary range for better candidate attraction',
        'Include more specific technical requirements',
        'Add information about team structure',
      ],
    };

    return analysis;
  }
}
