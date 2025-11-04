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
import { HRProfileService } from '../services/hr-profile.service';
import {
  CreateHRProfileDto,
  UpdateHRProfileDto,
  SearchHRProfilesDto,
  HRProfileResponseDto,
  HRProfileListResponseDto,
  PerformanceReviewDto,
  GoalDto,
  DocumentDto,
  TrainingDto,
} from '../dto/hr-profile.dto';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@ApiTags('HR Profiles')
@Controller('hr/profiles')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class HRProfileController {
  constructor(
    private readonly hrProfileService: HRProfileService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Create HR profile for employee' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'HR profile created successfully',
    type: HRProfileResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'HR profile already exists or invalid data',
  })
  async createHRProfile(
    @Body(ValidationPipe) createDto: CreateHRProfileDto,
    @CurrentUser() user: any,
  ): Promise<HRProfileResponseDto> {
    const profile = await this.hrProfileService.createHRProfile(createDto, user);
    return new HRProfileResponseDto(profile);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Search and list HR profiles' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'HR profiles retrieved successfully',
    type: HRProfileListResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiQuery({ name: 'department', required: false, description: 'Filter by department' })
  @ApiQuery({ name: 'position', required: false, description: 'Filter by position' })
  @ApiQuery({ name: 'managerId', required: false, description: 'Filter by manager' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  async searchHRProfiles(
    @Query(ValidationPipe) searchDto: SearchHRProfilesDto,
    @CurrentUser() user: any,
  ): Promise<HRProfileListResponseDto> {
    return await this.hrProfileService.searchHRProfiles(searchDto, user);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get current user HR profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'HR profile retrieved successfully',
    type: HRProfileResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'HR profile not found',
  })
  async getMyHRProfile(
    @CurrentUser() user: any,
  ): Promise<HRProfileResponseDto> {
    const profile = await this.hrProfileService.getHRProfileByUserId(user.id, user);
    return new HRProfileResponseDto(profile);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get HR profile by user ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'HR profile retrieved successfully',
    type: HRProfileResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'HR profile not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async getHRProfileByUserId(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: any,
  ): Promise<HRProfileResponseDto> {
    const profile = await this.hrProfileService.getHRProfileByUserId(userId, user);
    return new HRProfileResponseDto(profile);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get HR profile by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'HR profile retrieved successfully',
    type: HRProfileResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'HR profile not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  @ApiParam({ name: 'id', description: 'HR Profile ID' })
  async getHRProfileById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ): Promise<HRProfileResponseDto> {
    const profile = await this.hrProfileService.getHRProfileById(id, user);
    return new HRProfileResponseDto(profile);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update HR profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'HR profile updated successfully',
    type: HRProfileResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'HR profile not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiParam({ name: 'id', description: 'HR Profile ID' })
  async updateHRProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateDto: UpdateHRProfileDto,
    @CurrentUser() user: any,
  ): Promise<HRProfileResponseDto> {
    const profile = await this.hrProfileService.updateHRProfile(id, updateDto, user);
    return new HRProfileResponseDto(profile);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete HR profile' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'HR profile deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'HR profile not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only administrators can delete HR profiles',
  })
  @ApiParam({ name: 'id', description: 'HR Profile ID' })
  async deleteHRProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ): Promise<void> {
    await this.hrProfileService.deleteHRProfile(id, user);
  }

  @Post(':id/promote')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Promote employee' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Employee promoted successfully',
    type: HRProfileResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'HR profile not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiParam({ name: 'id', description: 'HR Profile ID' })
  async promoteEmployee(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('newPosition') newPosition: string,
    @Body('newDepartment') newDepartment?: string,
    @Body('newSalary') newSalary?: number,
    @Body('effectiveDate') effectiveDate?: Date,
    @CurrentUser() user?: any,
  ): Promise<HRProfileResponseDto> {
    const profile = await this.hrProfileService.promoteEmployee(
      id,
      newPosition,
      newDepartment,
      newSalary,
      effectiveDate,
      user,
    );
    return new HRProfileResponseDto(profile);
  }

  @Post(':id/performance-review')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Add performance review' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Performance review added successfully',
    type: HRProfileResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'HR profile not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiParam({ name: 'id', description: 'HR Profile ID' })
  async addPerformanceReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) reviewDto: PerformanceReviewDto,
    @CurrentUser() user: any,
  ): Promise<HRProfileResponseDto> {
    const profile = await this.hrProfileService.addPerformanceReview(id, reviewDto, user);
    return new HRProfileResponseDto(profile);
  }

  @Post(':id/goals')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Add goal to employee' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Goal added successfully',
    type: HRProfileResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'HR profile not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiParam({ name: 'id', description: 'HR Profile ID' })
  async addGoal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) goalDto: GoalDto,
    @CurrentUser() user: any,
  ): Promise<HRProfileResponseDto> {
    const profile = await this.hrProfileService.addGoal(id, goalDto, user);
    return new HRProfileResponseDto(profile);
  }

  @Put(':id/goals/:goalId/progress')
  @ApiOperation({ summary: 'Update goal progress' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Goal progress updated successfully',
    type: HRProfileResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'HR profile not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiParam({ name: 'id', description: 'HR Profile ID' })
  @ApiParam({ name: 'goalId', description: 'Goal ID' })
  async updateGoalProgress(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('goalId') goalId: string,
    @Body('progress') progress: number,
    @CurrentUser() user: any,
  ): Promise<HRProfileResponseDto> {
    const profile = await this.hrProfileService.updateGoalProgress(id, goalId, progress, user);
    return new HRProfileResponseDto(profile);
  }

  @Post(':id/documents')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Add document to employee profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Document added successfully',
    type: HRProfileResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'HR profile not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiParam({ name: 'id', description: 'HR Profile ID' })
  async addDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) documentDto: DocumentDto,
    @CurrentUser() user: any,
  ): Promise<HRProfileResponseDto> {
    const profile = await this.hrProfileService.addDocument(id, documentDto, user);
    return new HRProfileResponseDto(profile);
  }

  @Post(':id/training')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Add training record to employee' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Training added successfully',
    type: HRProfileResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'HR profile not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiParam({ name: 'id', description: 'HR Profile ID' })
  async addTraining(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) trainingDto: TrainingDto,
    @CurrentUser() user: any,
  ): Promise<HRProfileResponseDto> {
    const profile = await this.hrProfileService.addTraining(id, trainingDto, user);
    return new HRProfileResponseDto(profile);
  }

  @Get('manager/:managerId/team')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get team members for a manager' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Team members retrieved successfully',
    type: [HRProfileResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiParam({ name: 'managerId', description: 'Manager user ID' })
  async getTeamMembers(
    @Param('managerId', ParseUUIDPipe) managerId: string,
    @CurrentUser() user: any,
  ): Promise<HRProfileResponseDto[]> {
    const teamMembers = await this.hrProfileService.getTeamMembers(managerId, user);
    return teamMembers.map(profile => new HRProfileResponseDto(profile));
  }

  @Get('department/:department/employees')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Get employees by department' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Department employees retrieved successfully',
    type: [HRProfileResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiParam({ name: 'department', description: 'Department name' })
  async getDepartmentEmployees(
    @Param('department') department: string,
    @CurrentUser() user: any,
  ): Promise<HRProfileResponseDto[]> {
    const employees = await this.hrProfileService.getDepartmentEmployees(department, user);
    return employees.map(profile => new HRProfileResponseDto(profile));
  }

  @Get(':id/performance-metrics')
  @ApiOperation({ summary: 'Get employee performance metrics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Performance metrics retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'HR profile not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  @ApiParam({ name: 'id', description: 'HR Profile ID' })
  async getPerformanceMetrics(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ): Promise<any> {
    return await this.hrProfileService.getPerformanceMetrics(id, user);
  }

  @Get('analytics/overview')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Get HR analytics overview' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'HR analytics retrieved successfully',
  })
  @ApiQuery({ name: 'organizationId', required: false, description: 'Filter by organization' })
  async getHRAnalytics(
    @Query('organizationId') organizationId?: string,
    @CurrentUser() user?: any,
  ): Promise<any> {
    // This would typically call a dedicated analytics service
    // For now, return mock HR analytics data
    return {
      organizationId,
      metrics: {
        totalEmployees: 245,
        newHires: 12,
        departures: 3,
        averageTenure: 2.8, // years
        turnoverRate: 8.5, // percentage
      },
      departmentBreakdown: {
        engineering: 85,
        sales: 45,
        marketing: 25,
        hr: 15,
        finance: 20,
        operations: 30,
        other: 25,
      },
      performanceMetrics: {
        averageRating: 4.2,
        goalsCompletionRate: 78.5,
        reviewsCompleted: 92.3,
        trainingHours: 1250,
      },
      trends: {
        hiringTrend: [
          { month: '2024-07', hires: 8 },
          { month: '2024-08', hires: 12 },
          { month: '2024-09', hires: 15 },
          { month: '2024-10', hires: 12 },
        ],
        performanceTrend: [
          { quarter: 'Q1 2024', rating: 4.1 },
          { quarter: 'Q2 2024', rating: 4.2 },
          { quarter: 'Q3 2024', rating: 4.3 },
        ],
      },
    };
  }

  @Get('reports/performance')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Generate performance report' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Performance report generated successfully',
  })
  @ApiQuery({ name: 'department', required: false, description: 'Filter by department' })
  @ApiQuery({ name: 'managerId', required: false, description: 'Filter by manager' })
  @ApiQuery({ name: 'period', required: false, description: 'Report period' })
  async generatePerformanceReport(
    @Query('department') department?: string,
    @Query('managerId') managerId?: string,
    @Query('period') period?: string,
    @CurrentUser() user?: any,
  ): Promise<any> {
    const searchDto = { department, managerId, limit: 100 };
    const profiles = await this.hrProfileService.searchHRProfiles(searchDto, user!);

    // Generate performance report
    const report = {
      reportType: 'performance',
      period: period || 'current',
      generatedAt: new Date(),
      filters: { department, managerId },
      summary: {
        totalEmployees: profiles.total,
        averageRating: 4.2,
        goalsCompletionRate: 78.5,
        reviewsCompleted: 92.3,
      },
      employees: profiles.items.map(profile => ({
        employeeId: profile.employeeId,
        name: profile.user?.firstName + ' ' + profile.user?.lastName,
        department: profile.department,
        position: profile.position,
        performanceRating: profile.virtualProperties?.currentPerformanceRating,
        goalsProgress: profile.virtualProperties?.activeGoalsCount,
        yearsOfService: profile.virtualProperties?.yearsOfService,
      })),
      recommendations: [
        'Schedule performance reviews for employees without recent reviews',
        'Focus on goal completion in underperforming departments',
        'Provide additional training for employees with low ratings',
      ],
    };

    return report;
  }

  @Get('my/team')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Get current user team members' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Team members retrieved successfully',
    type: [HRProfileResponseDto],
  })
  async getMyTeamMembers(
    @CurrentUser() user: any,
  ): Promise<HRProfileResponseDto[]> {
    const teamMembers = await this.hrProfileService.getTeamMembers(user.id, user);
    return teamMembers.map(profile => new HRProfileResponseDto(profile));
  }
}
