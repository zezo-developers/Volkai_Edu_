import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Team } from '../../../database/entities/team.entity';
import { TeamMember, TeamRole } from '../../../database/entities/team-member.entity';
import { User, UserRole } from '../../../database/entities/user.entity';
import { Organization } from '../../../database/entities/organization.entity';
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

@Injectable()
export class TeamManagementService {
  private readonly logger = new Logger(TeamManagementService.name);

  constructor(
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    private dataSource: DataSource,
    private eventEmitter: EventEmitter2,
  ) {}

  async createTeam(createDto: CreateTeamDto, user: User): Promise<Team> {
    try {
      // Validate permissions
      if (user.roles=== UserRole.STUDENT) {
        throw new ForbiddenException('Students cannot create teams');
      }

      // Validate organization
      const organization = await this.organizationRepository.findOne({
        where: { id: createDto.organizationId },
      });

      if (!organization) {
        throw new NotFoundException('Organization not found');
      }

      // Validate team lead if provided
      if (createDto.leadId) {
        const lead = await this.userRepository.findOne({
          where: { id: createDto.leadId },
        });

        if (!lead) {
          throw new NotFoundException('Team lead not found');
        }
      }

      const team = this.teamRepository.create({
        organizationId: createDto.organizationId,
        name: createDto.name,
        description: createDto.description,
        leadId: createDto.leadId,
        department: createDto.department,
        color: createDto.color,
        avatarUrl: createDto.avatarUrl,
        settings: { ...Team.getDefaultSettings(), ...createDto.settings },
        metrics: Team.getDefaultMetrics(),
        status: 'active',
      });

      const savedTeam = await this.teamRepository.save(team);

      // Add team lead as a member if specified
      if (createDto.leadId) {
        await this.addTeamMember(savedTeam.id, {
          userId: createDto.leadId,
          role: TeamRole.LEAD,
        }, user);
      }

      // Emit event
      this.eventEmitter.emit('team.created', {
        team: savedTeam,
        user,
      });

      this.logger.log(`Team created: ${savedTeam.id} by user ${user.id}`);

      return savedTeam;
    } catch (error) {
      this.logger.error('Failed to create team', error);
      throw error;
    }
  }

  async getTeamById(id: string, user: User): Promise<Team> {
    try {
      const team = await this.teamRepository.findOne({
        where: { id },
        relations: ['organization', 'lead', 'members', 'members.user'],
      });

      if (!team) {
        throw new NotFoundException('Team not found');
      }

      // Check access permissions
      await this.validateTeamAccess(team, user);

      return team;
    } catch (error) {
      this.logger.error(`Failed to get team ${id}`, error);
      throw error;
    }
  }

  async searchTeams(searchDto: SearchTeamsDto, user: User): Promise<TeamListResponseDto> {
    try {
      const queryBuilder = this.teamRepository
        .createQueryBuilder('team')
        .leftJoinAndSelect('team.organization', 'organization')
        .leftJoinAndSelect('team.lead', 'lead')
        .leftJoinAndSelect('team.members', 'members')
        .leftJoinAndSelect('members.user', 'memberUser');

      // Apply access control
      if (user.roles=== UserRole.STUDENT) {
        // Students can only see teams they're members of
        queryBuilder
          .innerJoin('team.members', 'userMembership')
          .where('userMembership.userId = :userId', { userId: user.id });
      } else if (user.roles!== UserRole.ADMIN) {
        // Non-admins can see teams in their organization
        queryBuilder.where('team.organizationId = :orgId', { orgId: user.organizationId });
      }

      // Apply filters
      if (searchDto.search) {
        queryBuilder.andWhere(
          '(team.name ILIKE :search OR team.description ILIKE :search OR team.department ILIKE :search)',
          { search: `%${searchDto.search}%` }
        );
      }

      if (searchDto.organizationId) {
        queryBuilder.andWhere('team.organizationId = :orgId', { orgId: searchDto.organizationId });
      }

      if (searchDto.department) {
        queryBuilder.andWhere('team.department = :department', { department: searchDto.department });
      }

      if (searchDto.leadId) {
        queryBuilder.andWhere('team.leadId = :leadId', { leadId: searchDto.leadId });
      }

      if (searchDto.status) {
        queryBuilder.andWhere('team.status = :status', { status: searchDto.status });
      }

      if (searchDto.isPublic !== undefined) {
        queryBuilder.andWhere('team.settings ->> \'isPublic\' = :isPublic', { 
          isPublic: searchDto.isPublic.toString() 
        });
      }

      // Apply sorting
      const sortBy = searchDto.sortBy || 'createdAt';
      const sortOrder = searchDto.sortOrder || 'DESC';

      switch (sortBy) {
        case 'memberCount':
          queryBuilder
            .addSelect('COUNT(members.id)', 'memberCount')
            .groupBy('team.id')
            .addGroupBy('organization.id')
            .addGroupBy('lead.id')
            .orderBy('memberCount', sortOrder);
          break;
        case 'name':
          queryBuilder.orderBy('team.name', sortOrder);
          break;
        default:
          queryBuilder.orderBy(`team.${sortBy}`, sortOrder);
      }

      // Apply pagination
      const page = searchDto.page || 1;
      const limit = searchDto.limit || 20;
      queryBuilder.skip((page - 1) * limit).take(limit);

      const [teams, total] = await queryBuilder.getManyAndCount();

      return new TeamListResponseDto({
        items: teams,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      this.logger.error('Failed to search teams', error);
      throw error;
    }
  }

  async updateTeam(id: string, updateDto: UpdateTeamDto, user: User): Promise<Team> {
    try {
      const team = await this.getTeamById(id, user);

      // Check permissions
      await this.validateTeamUpdateAccess(team, user);

      // Validate new lead if being updated
      if (updateDto.leadId) {
        const newLead = await this.userRepository.findOne({
          where: { id: updateDto.leadId },
        });

        if (!newLead) {
          throw new NotFoundException('New team lead not found');
        }

        // Ensure new lead is a team member
        const leadMembership = await this.teamMemberRepository.findOne({
          where: { teamId: id, userId: updateDto.leadId },
        });

        if (!leadMembership) {
          throw new BadRequestException('New lead must be a team member');
        }
      }

      // Update fields
      Object.assign(team, updateDto);

      // Update settings if provided
      if (updateDto.settings) {
        team.updateSettings(updateDto.settings);
      }

      const updatedTeam = await this.teamRepository.save(team);

      // Update lead role if changed
      if (updateDto.leadId && updateDto.leadId !== team.leadId) {
        await this.updateTeamMemberRole(id, updateDto.leadId, TeamRole.LEAD, user);
      }

      // Emit event
      this.eventEmitter.emit('team.updated', {
        team: updatedTeam,
        user,
        changes: updateDto,
      });

      this.logger.log(`Team updated: ${id} by user ${user.id}`);

      return updatedTeam;
    } catch (error) {
      this.logger.error(`Failed to update team ${id}`, error);
      throw error;
    }
  }

  async deleteTeam(id: string, user: User): Promise<void> {
    try {
      const team = await this.getTeamById(id, user);

      // Check permissions - only admin or team lead can delete
      if (user.roles!== UserRole.ADMIN && team.leadId !== user.id) {
        throw new ForbiddenException('Insufficient permissions to delete team');
      }

      // Check if team has members
      const memberCount = await this.teamMemberRepository.count({
        where: { teamId: id },
      });
      console.log('member count', memberCount)

      if (memberCount > 0) {
        throw new BadRequestException('Cannot delete team with existing members. Remove all members first.');
      }

      await this.teamRepository.remove(team);

      // Emit event
      this.eventEmitter.emit('team.deleted', {
        teamId: id,
        user,
      });

      this.logger.log(`Team deleted: ${id} by user ${user.id}`);
    } catch (error) {
      this.logger.error(`Failed to delete team ${id}`, error);
      throw error;
    }
  }

  async addTeamMember(
    teamId: string,
    addMemberDto: AddTeamMemberDto,
    user: User,
  ): Promise<TeamMember> {
    try {
      const team = await this.getTeamById(teamId, user);

      // Check permissions
      await this.validateTeamUpdateAccess(team, user);

      // Validate user exists
      const memberUser = await this.userRepository.findOne({
        where: { id: addMemberDto.userId },
      });

      if (!memberUser) {
        throw new NotFoundException('User not found');
      }

      // Check if user is already a member
      const existingMember = await this.teamMemberRepository.findOne({
        where: { teamId, userId: addMemberDto.userId },
      });

      if (existingMember) {
        throw new BadRequestException('User is already a team member');
      }

      // Check team capacity
      if (team.isAtCapacity) {
        throw new BadRequestException('Team is at maximum capacity');
      }

      const teamMember = this.teamMemberRepository.create({
        teamId,
        userId: addMemberDto.userId,
        role: addMemberDto.role || TeamRole.MEMBER,
        responsibilities: addMemberDto.responsibilities || {},
        performanceMetrics: TeamMember.getDefaultPerformanceMetrics(),
        availability: TeamMember.getDefaultAvailability(),
        feedback: [],
        status: 'active',
      });

      const savedMember = await this.teamMemberRepository.save(teamMember);

      // Emit event
      this.eventEmitter.emit('team.member.added', {
        team,
        member: savedMember,
        user,
      });

      this.logger.log(`Team member added: ${addMemberDto.userId} to team ${teamId} by user ${user.id}`);

      return savedMember;
    } catch (error) {
      this.logger.error(`Failed to add team member to ${teamId}`, error);
      throw error;
    }
  }

  async updateTeamMember(
    teamId: string,
    memberId: string,
    updateDto: UpdateTeamMemberDto,
    user: User,
  ): Promise<TeamMember> {
    try {
      const team = await this.getTeamById(teamId, user);
      
      const member = await this.teamMemberRepository.findOne({
        where: { id: memberId, teamId },
        relations: ['user'],
      });

      if (!member) {
        throw new NotFoundException('Team member not found');
      }

      // Check permissions
      await this.validateTeamMemberUpdateAccess(team, member, user);

      // Update role if provided
      if (updateDto.role && updateDto.role !== member.role) {
        member.updateRole(updateDto.role, user.id);
      }

      // Update other fields
      if (updateDto.responsibilities) {
        member.responsibilities = { ...member.responsibilities, ...updateDto.responsibilities };
      }

      if (updateDto.performanceMetrics) {
        member.updatePerformanceMetrics(updateDto.performanceMetrics);
      }

      if (updateDto.availability) {
        member.setAvailability(updateDto.availability);
      }

      if (updateDto.status) {
        member.status = updateDto.status;
      }

      const updatedMember = await this.teamMemberRepository.save(member);

      // Emit event
      this.eventEmitter.emit('team.member.updated', {
        team,
        member: updatedMember,
        user,
        changes: updateDto,
      });

      this.logger.log(`Team member updated: ${memberId} by user ${user.id}`);

      return updatedMember;
    } catch (error) {
      this.logger.error(`Failed to update team member ${memberId}`, error);
      throw error;
    }
  }

  async removeTeamMember(
    teamId: string,
    memberId: string,
    reason?: string,
    user?: User,
  ): Promise<void> {
    try {
      const team = await this.getTeamById(teamId, user!);
      
      const member = await this.teamMemberRepository.findOne({
        where: { id: memberId, teamId },
        relations: ['user'],
      });

      if (!member) {
        throw new NotFoundException('Team member not found');
      }

      // Check permissions
      await this.validateTeamUpdateAccess(team, user!);

      // Cannot remove team lead without assigning new lead
      if (member.role === TeamRole.LEAD && team.leadId === member.userId) {
        throw new BadRequestException('Cannot remove team lead. Assign a new lead first.');
      }

      await this.teamMemberRepository.remove(member);

      // Emit event
      this.eventEmitter.emit('team.member.removed', {
        team,
        memberId,
        memberUserId: member.userId,
        reason,
        user,
      });

      this.logger.log(`Team member removed: ${memberId} from team ${teamId} by user ${user?.id}`);
    } catch (error) {
      this.logger.error(`Failed to remove team member ${memberId}`, error);
      throw error;
    }
  }

  async updateTeamMemberRole(
    teamId: string,
    userId: string,
    newRole: TeamRole,
    user: User,
  ): Promise<TeamMember> {
    try {
      const member = await this.teamMemberRepository.findOne({
        where: { teamId, userId },
        relations: ['user', 'team'],
      });

      if (!member) {
        throw new NotFoundException('Team member not found');
      }

      // Check permissions
      await this.validateTeamUpdateAccess(member.team, user);

      // If promoting to lead, demote current lead
      if (newRole === TeamRole.LEAD) {
        const currentLead = await this.teamMemberRepository.findOne({
          where: { teamId, role: TeamRole.LEAD },
        });

        if (currentLead && currentLead.id !== member.id) {
          currentLead.updateRole(TeamRole.SENIOR, user.id);
          await this.teamMemberRepository.save(currentLead);
        }

        // Update team lead
        await this.teamRepository.update(teamId, { leadId: userId });
      }

      member.updateRole(newRole, user.id);
      const updatedMember = await this.teamMemberRepository.save(member);

      // Emit event
      this.eventEmitter.emit('team.member.role.updated', {
        team: member.team,
        member: updatedMember,
        newRole,
        user,
      });

      this.logger.log(`Team member role updated: ${userId} to ${newRole} by user ${user.id}`);

      return updatedMember;
    } catch (error) {
      this.logger.error(`Failed to update team member role for ${userId}`, error);
      throw error;
    }
  }

  async addTeamGoal(
    teamId: string,
    goal: { title: string; description: string; targetDate?: Date },
    user: User,
  ): Promise<Team> {
    try {
      const team = await this.getTeamById(teamId, user);

      // Check permissions
      await this.validateTeamUpdateAccess(team, user);

      team.addGoal(goal);
      const updatedTeam = await this.teamRepository.save(team);

      // Emit event
      this.eventEmitter.emit('team.goal.added', {
        team: updatedTeam,
        goal,
        user,
      });

      this.logger.log(`Goal added to team: ${teamId} by user ${user.id}`);

      return updatedTeam;
    } catch (error) {
      this.logger.error(`Failed to add goal to team ${teamId}`, error);
      throw error;
    }
  }

  async updateTeamGoalProgress(
    teamId: string,
    goalId: string,
    progress: number,
    user: User,
  ): Promise<Team> {
    try {
      const team = await this.getTeamById(teamId, user);

      // Check permissions - team members can update goal progress
      const isMember = await this.teamMemberRepository.findOne({
        where: { teamId, userId: user.id },
      });

      if (!isMember && user.roles!== UserRole.ADMIN) {
        throw new ForbiddenException('Only team members can update goal progress');
      }

      team.updateGoalProgress(goalId, progress);
      const updatedTeam = await this.teamRepository.save(team);

      // Emit event
      this.eventEmitter.emit('team.goal.progress.updated', {
        team: updatedTeam,
        goalId,
        progress,
        user,
      });

      this.logger.log(`Goal progress updated for team: ${teamId} by user ${user.id}`);

      return updatedTeam;
    } catch (error) {
      this.logger.error(`Failed to update goal progress for team ${teamId}`, error);
      throw error;
    }
  }

  async getTeamStats(teamId: string, user: User): Promise<TeamStatsDto> {
    try {
      const team = await this.getTeamById(teamId, user);

      const members = await this.teamMemberRepository.find({
        where: { teamId },
        relations: ['user'],
      });

      const stats = {
        teamId: team.id,
        memberCount: members.length,
        membersByRole: this.groupMembersByRole(members),
        membersByStatus: this.groupMembersByStatus(members),
        averagePerformanceScore: this.calculateAveragePerformanceScore(members),
        productivityScore: team.calculateProductivityScore(),
        collaborationScore: team.calculateCollaborationScore(),
        goalsProgress: {
          total: team.settings.goals?.length || 0,
          active: team.activeGoals,
          completed: team.settings.goals?.filter(g => g.status === 'completed').length || 0,
          completionRate: team.goalsCompletionRate,
        },
        recentActivity: this.getRecentTeamActivity(team, members),
        upcomingEvents: this.getUpcomingTeamEvents(team),
      };

      return new TeamStatsDto(stats);
    } catch (error) {
      this.logger.error(`Failed to get team stats for ${teamId}`, error);
      throw error;
    }
  }

  async getMyTeams(user: User): Promise<Team[]> {
    try {
      const memberships = await this.teamMemberRepository.find({
        where: { userId: user.id, status: 'active' },
        relations: ['team', 'team.lead'],
      });

      return memberships.map(membership => membership.team);
    } catch (error) {
      this.logger.error(`Failed to get teams for user ${user.id}`, error);
      throw error;
    }
  }

  // Private helper methods
  private async validateTeamAccess(team: Team, user: User): Promise<void> {
    const isAdmin = user.roles=== UserRole.ADMIN;
    const isOrgMember = user.organizationId === team.organizationId;
    const isTeamMember = await this.teamMemberRepository.findOne({
      where: { teamId: team.id, userId: user.id },
    });
    const isPublicTeam = team.settings.isPublic;

    if (!isAdmin && !isOrgMember && !isTeamMember && !isPublicTeam) {
      throw new ForbiddenException('Access denied to this team');
    }
  }

  private async validateTeamUpdateAccess(team: Team, user: User): Promise<void> {
    const isAdmin = user.roles=== UserRole.ADMIN;
    const isTeamLead = team.leadId === user.id;
    const isHR = user.roles=== UserRole.HR && user.organizationId === team.organizationId;

    if (!isAdmin && !isTeamLead && !isHR) {
      throw new ForbiddenException('Insufficient permissions to update team');
    }
  }

  private async validateTeamMemberUpdateAccess(
    team: Team,
    member: TeamMember,
    user: User,
  ): Promise<void> {
    const isAdmin = user.roles=== UserRole.ADMIN;
    const isTeamLead = team.leadId === user.id;
    const isHR = user.roles=== UserRole.HR && user.organizationId === team.organizationId;
    const isSelf = member.userId === user.id;

    if (!isAdmin && !isTeamLead && !isHR && !isSelf) {
      throw new ForbiddenException('Insufficient permissions to update team member');
    }
  }

  private groupMembersByRole(members: TeamMember[]): Record<string, number> {
    return members.reduce((acc, member) => {
      acc[member.role] = (acc[member.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupMembersByStatus(members: TeamMember[]): Record<string, number> {
    return members.reduce((acc, member) => {
      acc[member.status] = (acc[member.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculateAveragePerformanceScore(members: TeamMember[]): number {
    if (members.length === 0) return 0;
    
    const totalScore = members.reduce((sum, member) => sum + member.overallPerformanceScore, 0);
    return totalScore / members.length;
  }

  private getRecentTeamActivity(team: Team, members: TeamMember[]): any[] {
    // This would typically query actual activity logs
    // For now, return mock recent activity
    return [
      {
        type: 'member_joined',
        description: 'New member joined the team',
        timestamp: new Date(),
        actor: 'System',
      },
      {
        type: 'goal_completed',
        description: 'Team goal completed',
        timestamp: new Date(),
        actor: team.lead?.fullName || 'Team Lead',
      },
    ];
  }

  private getUpcomingTeamEvents(team: Team): any[] {
    // This would typically integrate with calendar systems
    // For now, return mock upcoming events
    return [
      {
        type: 'meeting',
        title: 'Weekly Team Standup',
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        attendees: team.memberCount,
      },
      {
        type: 'review',
        title: 'Quarterly Performance Review',
        scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
        attendees: team.memberCount,
      },
    ];
  }
}
