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
import { TeamRole } from '../../../database/entities/team-member.entity';
import { TeamManagementService } from '../services/team-management.service';
import {
  CreateTeamDto,
  UpdateTeamDto,
  SearchTeamsDto,
  TeamResponseDto,
  TeamListResponseDto,
  AddTeamMemberDto,
  UpdateTeamMemberDto,
  TeamMemberResponseDto,
  TeamStatsDto,
} from '../dto/team-management.dto';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@ApiTags('Team Management')
@Controller('hr/teams')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TeamManagementController {
  constructor(
    private readonly teamService: TeamManagementService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a new team' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Team created successfully',
    type: TeamResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid team data',
  })
  async createTeam(
    @Body(ValidationPipe) createDto: CreateTeamDto,
    @CurrentUser() user: User,
  ): Promise<TeamResponseDto> {
    const team = await this.teamService.createTeam(createDto, user);
    return new TeamResponseDto(team);
  }

  @Get()
  @ApiOperation({ summary: 'Search and list teams' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Teams retrieved successfully',
    type: TeamListResponseDto,
  })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiQuery({ name: 'organizationId', required: false, description: 'Filter by organization' })
  @ApiQuery({ name: 'department', required: false, description: 'Filter by department' })
  @ApiQuery({ name: 'leadId', required: false, description: 'Filter by team lead' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  async searchTeams(
    @Query(ValidationPipe) searchDto: SearchTeamsDto,
    @CurrentUser() user: User,
  ): Promise<TeamListResponseDto> {
    return await this.teamService.searchTeams(searchDto, user);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get teams where current user is a member' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User teams retrieved successfully',
    type: [TeamResponseDto],
  })
  async getMyTeams(
    @CurrentUser() user: User,
  ): Promise<TeamResponseDto[]> {
    const teams = await this.teamService.getMyTeams(user);
    return teams.map(team => new TeamResponseDto(team));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get team by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Team retrieved successfully',
    type: TeamResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Team not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  @ApiParam({ name: 'id', description: 'Team ID' })
  async getTeamById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<TeamResponseDto> {
    const team = await this.teamService.getTeamById(id, user);
    return new TeamResponseDto(team);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update team' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Team updated successfully',
    type: TeamResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Team not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiParam({ name: 'id', description: 'Team ID' })
  async updateTeam(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateDto: UpdateTeamDto,
    @CurrentUser() user: User,
  ): Promise<TeamResponseDto> {
    const team = await this.teamService.updateTeam(id, updateDto, user);
    return new TeamResponseDto(team);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Delete team' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Team deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Team not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete team with existing members',
  })
  @ApiParam({ name: 'id', description: 'Team ID' })
  async deleteTeam(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.teamService.deleteTeam(id, user);
  }

  @Post(':id/members')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Add member to team' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Team member added successfully',
    type: TeamMemberResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Team or user not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'User already a member or team at capacity',
  })
  @ApiParam({ name: 'id', description: 'Team ID' })
  async addTeamMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) addMemberDto: AddTeamMemberDto,
    @CurrentUser() user: User,
  ): Promise<TeamMemberResponseDto> {
    const member = await this.teamService.addTeamMember(id, addMemberDto, user);
    return new TeamMemberResponseDto(member);
  }

  @Put(':teamId/members/:memberId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update team member' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Team member updated successfully',
    type: TeamMemberResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Team or member not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiParam({ name: 'teamId', description: 'Team ID' })
  @ApiParam({ name: 'memberId', description: 'Member ID' })
  async updateTeamMember(
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body(ValidationPipe) updateDto: UpdateTeamMemberDto,
    @CurrentUser() user: User,
  ): Promise<TeamMemberResponseDto> {
    const member = await this.teamService.updateTeamMember(teamId, memberId, updateDto, user);
    return new TeamMemberResponseDto(member);
  }

  @Delete(':teamId/members/:memberId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Remove member from team' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Team member removed successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Team or member not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot remove team lead without assigning new lead',
  })
  @ApiParam({ name: 'teamId', description: 'Team ID' })
  @ApiParam({ name: 'memberId', description: 'Member ID' })
  async removeTeamMember(
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body('reason') reason?: string,
    @CurrentUser() user?: User,
  ): Promise<void> {
    await this.teamService.removeTeamMember(teamId, memberId, reason, user);
  }

  @Put(':teamId/members/:userId/role')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update team member role' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Team member role updated successfully',
    type: TeamMemberResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Team or member not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiParam({ name: 'teamId', description: 'Team ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async updateTeamMemberRole(
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body('role') newRole: TeamRole,
    @CurrentUser() user: User,
  ): Promise<TeamMemberResponseDto> {
    const member = await this.teamService.updateTeamMemberRole(teamId, userId, newRole, user);
    return new TeamMemberResponseDto(member);
  }

  @Post(':id/goals')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Add goal to team' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Team goal added successfully',
    type: TeamResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Team not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiParam({ name: 'id', description: 'Team ID' })
  async addTeamGoal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() goal: { title: string; description: string; targetDate?: Date },
    @CurrentUser() user: User,
  ): Promise<TeamResponseDto> {
    const team = await this.teamService.addTeamGoal(id, goal, user);
    return new TeamResponseDto(team);
  }

  @Put(':teamId/goals/:goalId/progress')
  @ApiOperation({ summary: 'Update team goal progress' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Team goal progress updated successfully',
    type: TeamResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Team not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only team members can update goal progress',
  })
  @ApiParam({ name: 'teamId', description: 'Team ID' })
  @ApiParam({ name: 'goalId', description: 'Goal ID' })
  async updateTeamGoalProgress(
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Param('goalId') goalId: string,
    @Body('progress') progress: number,
    @CurrentUser() user: User,
  ): Promise<TeamResponseDto> {
    const team = await this.teamService.updateTeamGoalProgress(teamId, goalId, progress, user);
    return new TeamResponseDto(team);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get team statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Team statistics retrieved successfully',
    type: TeamStatsDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Team not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  @ApiParam({ name: 'id', description: 'Team ID' })
  async getTeamStats(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<TeamStatsDto> {
    return await this.teamService.getTeamStats(id, user);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get team members' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Team members retrieved successfully',
    type: [TeamMemberResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Team not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  @ApiParam({ name: 'id', description: 'Team ID' })
  async getTeamMembers(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<TeamMemberResponseDto[]> {
    const team = await this.teamService.getTeamById(id, user);
    return (team.members || []).map(member => new TeamMemberResponseDto(member));
  }

  @Get(':id/performance')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get team performance metrics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Team performance metrics retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Team not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiParam({ name: 'id', description: 'Team ID' })
  async getTeamPerformance(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<any> {
    const team = await this.teamService.getTeamById(id, user);
    
    const performance = {
      teamId: team.id,
      teamName: team.name,
      performance: {
        productivityScore: team.calculateProductivityScore(),
        collaborationScore: team.calculateCollaborationScore(),
        goalsCompletionRate: team.goalsCompletionRate,
        memberCount: team.memberCount,
      },
      memberPerformance: (team.members || []).map(member => ({
        userId: member.userId,
        userName: member.user?.firstName + ' ' + member.user?.lastName,
        role: member.role,
        performanceScore: member.overallPerformanceScore,
        productivity: member.performanceMetrics?.productivity?.score || 0,
        collaboration: member.performanceMetrics?.collaboration?.score || 0,
        leadership: member.performanceMetrics?.leadership?.score || 0,
      })),
      trends: {
        productivityTrend: 'stable',
        collaborationTrend: 'improving',
        goalsTrend: 'improving',
      },
      recommendations: [
        'Continue current performance management practices',
        'Consider team building activities to improve collaboration',
        'Set more challenging goals for high-performing members',
      ],
    };

    return performance;
  }

  @Get('analytics/overview')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Get teams analytics overview' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Teams analytics retrieved successfully',
  })
  @ApiQuery({ name: 'organizationId', required: false, description: 'Filter by organization' })
  async getTeamsAnalytics(
    @Query('organizationId') organizationId?: string,
    @CurrentUser() user?: User,
  ): Promise<any> {
    // This would typically call a dedicated analytics service
    return {
      organizationId,
      metrics: {
        totalTeams: 25,
        activeTeams: 22,
        totalMembers: 185,
        averageTeamSize: 7.4,
        teamsWithGoals: 20,
        averageGoalCompletion: 78.5,
      },
      departmentBreakdown: {
        engineering: 8,
        sales: 5,
        marketing: 3,
        hr: 2,
        finance: 2,
        operations: 3,
        other: 2,
      },
      performanceMetrics: {
        averageProductivityScore: 82.5,
        averageCollaborationScore: 78.3,
        teamsAboveTarget: 18,
        teamsBelowTarget: 4,
      },
      trends: {
        teamGrowth: [
          { month: '2024-07', teams: 20 },
          { month: '2024-08', teams: 22 },
          { month: '2024-09', teams: 24 },
          { month: '2024-10', teams: 25 },
        ],
        performanceTrend: [
          { quarter: 'Q1 2024', score: 80.2 },
          { quarter: 'Q2 2024', score: 81.5 },
          { quarter: 'Q3 2024', score: 82.5 },
        ],
      },
    };
  }

  @Post(':id/join-request')
  @ApiOperation({ summary: 'Request to join team' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Join request submitted successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot join team or already a member',
  })
  @ApiParam({ name: 'id', description: 'Team ID' })
  async requestToJoinTeam(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('message') message?: string,
    @CurrentUser() user?: User,
  ): Promise<{ success: boolean; message: string }> {
    const team = await this.teamService.getTeamById(id, user!);
    
    // Check if user can join
    if (!team.canUserJoin(user!)) {
      return {
        success: false,
        message: 'Cannot join this team. Team may be at capacity, private, or you may already be a member.',
      };
    }

    // If team allows self-join, add directly
    if (team.settings.allowSelfJoin && !team.settings.requireApproval) {
      await this.teamService.addTeamMember(id, { userId: user!.id }, user!);
      return {
        success: true,
        message: 'Successfully joined the team!',
      };
    }

    // Otherwise, create join request (would typically be stored in database)
    return {
      success: true,
      message: 'Join request submitted. Team lead will review your request.',
    };
  }

  @Get(':id/join-requests')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get team join requests' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Join requests retrieved successfully',
  })
  @ApiParam({ name: 'id', description: 'Team ID' })
  async getTeamJoinRequests(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<any[]> {
    // This would typically fetch from a join_requests table
    // For now, return empty array
    return [];
  }
}
