import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  IsUUID,
  IsObject,
  IsBoolean,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { TeamRole } from '../../../database/entities/team-member.entity';

export class CreateTeamDto {
  @ApiProperty({ description: 'Organization ID' })
  @IsUUID()
  organizationId: string;

  @ApiProperty({ description: 'Team name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Team description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Team lead user ID' })
  @IsOptional()
  @IsUUID()
  leadId?: string;

  @ApiPropertyOptional({ description: 'Department' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ description: 'Team color for UI' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Team avatar/logo URL' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ description: 'Team settings and configuration' })
  @IsOptional()
  @IsObject()
  settings?: {
    isPublic?: boolean;
    allowSelfJoin?: boolean;
    requireApproval?: boolean;
    maxMembers?: number;
    workingHours?: {
      timezone: string;
      schedule: Record<string, { start: string; end: string; }>;
    };
    communication?: {
      slackChannel?: string;
      emailList?: string;
      meetingRoom?: string;
    };
  };
}

export class UpdateTeamDto extends PartialType(CreateTeamDto) {
  @ApiPropertyOptional({ description: 'Team status' })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'archived'])
  status?: 'active' | 'inactive' | 'archived';
}

export class SearchTeamsDto {
  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by organization ID' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Filter by department' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ description: 'Filter by team lead ID' })
  @IsOptional()
  @IsUUID()
  leadId?: string;

  @ApiPropertyOptional({ description: 'Filter by team status' })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'archived'])
  status?: 'active' | 'inactive' | 'archived';

  @ApiPropertyOptional({ description: 'Filter by public status' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort field' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], description: 'Sort order' })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}

export class AddTeamMemberDto {
  @ApiProperty({ description: 'User ID to add to team' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ enum: TeamRole, description: 'Team role' })
  @IsOptional()
  @IsEnum(TeamRole)
  role?: TeamRole;

  @ApiPropertyOptional({ description: 'Member responsibilities' })
  @IsOptional()
  @IsObject()
  responsibilities?: {
    primary?: string[];
    secondary?: string[];
    specializations?: string[];
  };
}

export class UpdateTeamMemberDto {
  @ApiPropertyOptional({ enum: TeamRole, description: 'Team role' })
  @IsOptional()
  @IsEnum(TeamRole)
  role?: TeamRole;

  @ApiPropertyOptional({ description: 'Member responsibilities' })
  @IsOptional()
  @IsObject()
  responsibilities?: {
    primary?: string[];
    secondary?: string[];
    specializations?: string[];
  };

  @ApiPropertyOptional({ description: 'Performance metrics' })
  @IsOptional()
  @IsObject()
  performanceMetrics?: {
    productivity?: {
      score: number;
      tasksCompleted: number;
      averageCompletionTime: number;
      qualityRating: number;
    };
    collaboration?: {
      score: number;
      meetingAttendance: number;
      responseTime: number;
      helpfulness: number;
    };
    leadership?: {
      score: number;
      mentoring: number;
      initiativesTaken: number;
      teamImpact: number;
    };
  };

  @ApiPropertyOptional({ description: 'Availability settings' })
  @IsOptional()
  @IsObject()
  availability?: {
    currentCapacity?: number;
    preferredWorkload?: 'light' | 'normal' | 'heavy';
  };

  @ApiPropertyOptional({ description: 'Member status' })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'on_leave', 'removed'])
  status?: 'active' | 'inactive' | 'on_leave' | 'removed';
}

export class TeamResponseDto {
  @ApiProperty({ description: 'Team ID' })
  id: string;

  @ApiProperty({ description: 'Organization ID' })
  organizationId: string;

  @ApiProperty({ description: 'Team name' })
  name: string;

  @ApiPropertyOptional({ description: 'Team description' })
  description?: string;

  @ApiPropertyOptional({ description: 'Team lead user ID' })
  leadId?: string;

  @ApiPropertyOptional({ description: 'Department' })
  department?: string;

  @ApiPropertyOptional({ description: 'Team color for UI' })
  color?: string;

  @ApiPropertyOptional({ description: 'Team avatar/logo URL' })
  avatarUrl?: string;

  @ApiProperty({ description: 'Team settings and configuration' })
  settings: Record<string, any>;

  @ApiProperty({ description: 'Team metrics and KPIs' })
  metrics: Record<string, any>;

  @ApiProperty({ description: 'Team status' })
  status: string;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Organization details' })
  organization?: {
    id: string;
    name: string;
  };

  @ApiPropertyOptional({ description: 'Team lead details' })
  lead?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };

  @ApiPropertyOptional({ description: 'Team members' })
  members?: Array<{
    id: string;
    userId: string;
    role: TeamRole;
    status: string;
    joinedAt: Date;
  }>;

  @ApiPropertyOptional({ description: 'Virtual properties' })
  virtualProperties?: {
    memberCount: number;
    isAtCapacity: boolean;
    averagePerformanceRating: number;
    goalsCompletionRate: number;
    activeGoals: number;
  };

  constructor(team: any) {
    this.id = team.id;
    this.organizationId = team.organizationId;
    this.name = team.name;
    this.description = team.description;
    this.leadId = team.leadId;
    this.department = team.department;
    this.color = team.color;
    this.avatarUrl = team.avatarUrl;
    this.settings = team.settings || {};
    this.metrics = team.metrics || {};
    this.status = team.status;
    this.createdAt = team.createdAt;
    this.updatedAt = team.updatedAt;

    if (team.organization) {
      this.organization = {
        id: team.organization.id,
        name: team.organization.name,
      };
    }

    if (team.lead) {
      this.lead = {
        id: team.lead.id,
        firstName: team.lead.firstName,
        lastName: team.lead.lastName,
        email: team.lead.email,
      };
    }

    if (team.members) {
      this.members = team.members.map((member: any) => ({
        id: member.id,
        userId: member.userId,
        role: member.role,
        status: member.status,
        joinedAt: member.joinedAt,
      }));
    }

    this.virtualProperties = {
      memberCount: team.memberCount || 0,
      isAtCapacity: team.isAtCapacity || false,
      averagePerformanceRating: team.averagePerformanceRating || 0,
      goalsCompletionRate: team.goalsCompletionRate || 0,
      activeGoals: team.activeGoals || 0,
    };
  }
}

export class TeamListResponseDto {
  @ApiProperty({ type: [TeamResponseDto], description: 'List of teams' })
  items: TeamResponseDto[];

  @ApiProperty({ description: 'Total number of items' })
  total: number;

  @ApiProperty({ description: 'Current page' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  constructor(data: any) {
    this.items = data.items.map((item: any) => new TeamResponseDto(item));
    this.total = data.total;
    this.page = data.page;
    this.limit = data.limit;
    this.totalPages = data.totalPages;
  }
}

export class TeamMemberResponseDto {
  @ApiProperty({ description: 'Team member ID' })
  id: string;

  @ApiProperty({ description: 'Team ID' })
  teamId: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ enum: TeamRole, description: 'Team role' })
  role: TeamRole;

  @ApiProperty({ description: 'Date joined the team' })
  joinedAt: Date;

  @ApiProperty({ description: 'Member status' })
  status: string;

  @ApiProperty({ description: 'Member responsibilities and focus areas' })
  responsibilities: Record<string, any>;

  @ApiProperty({ description: 'Performance metrics for this team member' })
  performanceMetrics: Record<string, any>;

  @ApiProperty({ description: 'Availability and working preferences' })
  availability: Record<string, any>;

  @ApiProperty({ description: 'Team member notes and feedback' })
  feedback: Array<{
    id: string;
    from: string;
    fromName: string;
    type: string;
    rating?: number;
    comments: string;
    date: Date;
    private: boolean;
  }>;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiPropertyOptional({ description: 'User details' })
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };

  @ApiPropertyOptional({ description: 'Virtual properties' })
  virtualProperties?: {
    daysSinceJoined: number;
    isLead: boolean;
    isSenior: boolean;
    currentProjects: number;
    overallPerformanceScore: number;
    averageFeedbackRating: number;
    isOnLeave: boolean;
  };

  constructor(member: any) {
    this.id = member.id;
    this.teamId = member.teamId;
    this.userId = member.userId;
    this.role = member.role;
    this.joinedAt = member.joinedAt;
    this.status = member.status;
    this.responsibilities = member.responsibilities || {};
    this.performanceMetrics = member.performanceMetrics || {};
    this.availability = member.availability || {};
    this.feedback = member.feedback || [];
    this.createdAt = member.createdAt;

    if (member.user) {
      this.user = {
        id: member.user.id,
        firstName: member.user.firstName,
        lastName: member.user.lastName,
        email: member.user.email,
      };
    }

    this.virtualProperties = {
      daysSinceJoined: member.daysSinceJoined || 0,
      isLead: member.isLead || false,
      isSenior: member.isSenior || false,
      currentProjects: member.currentProjects || 0,
      overallPerformanceScore: member.overallPerformanceScore || 0,
      averageFeedbackRating: member.averageFeedbackRating || 0,
      isOnLeave: member.isOnLeave || false,
    };
  }
}

export class TeamStatsDto {
  @ApiProperty({ description: 'Team ID' })
  teamId: string;

  @ApiProperty({ description: 'Total member count' })
  memberCount: number;

  @ApiProperty({ description: 'Members grouped by role' })
  membersByRole: Record<string, number>;

  @ApiProperty({ description: 'Members grouped by status' })
  membersByStatus: Record<string, number>;

  @ApiProperty({ description: 'Average performance score' })
  averagePerformanceScore: number;

  @ApiProperty({ description: 'Team productivity score' })
  productivityScore: number;

  @ApiProperty({ description: 'Team collaboration score' })
  collaborationScore: number;

  @ApiProperty({ description: 'Goals progress summary' })
  goalsProgress: {
    total: number;
    active: number;
    completed: number;
    completionRate: number;
  };

  @ApiProperty({ description: 'Recent team activity' })
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: Date;
    actor: string;
  }>;

  @ApiProperty({ description: 'Upcoming team events' })
  upcomingEvents: Array<{
    type: string;
    title: string;
    scheduledAt: Date;
    attendees: number;
  }>;

  constructor(data: any) {
    this.teamId = data.teamId;
    this.memberCount = data.memberCount;
    this.membersByRole = data.membersByRole;
    this.membersByStatus = data.membersByStatus;
    this.averagePerformanceScore = data.averagePerformanceScore;
    this.productivityScore = data.productivityScore;
    this.collaborationScore = data.collaborationScore;
    this.goalsProgress = data.goalsProgress;
    this.recentActivity = data.recentActivity;
    this.upcomingEvents = data.upcomingEvents;
  }
}
