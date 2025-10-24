import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Organization } from './organization.entity';
import { User } from '../entities/user.entity';
import { TeamMember } from './team-member.entity';

@Entity('teams')
@Index(['organizationId'])
@Index(['department'])
@Index(['leadId'])
export class Team {
  @ApiProperty({ description: 'Team ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Organization ID' })
  @Column({ name: 'org_id' })
  organizationId: string;

  @ApiProperty({ description: 'Team name' })
  @Column({ length: 255 })
  name: string;

  @ApiProperty({ description: 'Team description' })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ description: 'Team lead user ID' })
  @Column({ name: 'lead_id', nullable: true })
  leadId?: string;

  @ApiProperty({ description: 'Department' })
  @Column({ length: 100, nullable: true })
  department?: string;

  @ApiProperty({ description: 'Team color for UI' })
  @Column({ length: 7, nullable: true })
  color?: string;

  @ApiProperty({ description: 'Team avatar/logo URL' })
  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl?: string;

  @ApiProperty({ description: 'Team settings and configuration' })
  @Column({ type: 'jsonb', default: {} })
  settings: {
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
    goals?: Array<{
      id: string;
      title: string;
      description: string;
      targetDate?: Date;
      progress: number;
      status: 'active' | 'completed' | 'paused';
    }>;
  };

  @ApiProperty({ description: 'Team metrics and KPIs' })
  @Column({ type: 'jsonb', default: {} })
  metrics: {
    productivity?: {
      score: number;
      trend: 'up' | 'down' | 'stable';
      lastUpdated: Date;
    };
    collaboration?: {
      score: number;
      meetingsPerWeek: number;
      responseTime: number; // in hours
    };
    satisfaction?: {
      score: number;
      lastSurveyDate?: Date;
      participationRate?: number;
    };
    performance?: {
      goalsCompleted: number;
      totalGoals: number;
      averageRating: number;
    };
  };

  @ApiProperty({ description: 'Team status' })
  @Column({ default: 'active' })
  status: 'active' | 'inactive' | 'archived';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'org_id' })
  organization: Organization;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'lead_id' })
  lead?: User;

  @OneToMany(() => TeamMember, member => member.team)
  members: TeamMember[];

  // Virtual properties
  get memberCount(): number {
    return this.members?.length || 0;
  }

  get isAtCapacity(): boolean {
    if (!this.settings.maxMembers) return false;
    return this.memberCount >= this.settings.maxMembers;
  }

  get averagePerformanceRating(): number {
    if (!this.metrics.performance) return 0;
    return this.metrics.performance.averageRating || 0;
  }

  get goalsCompletionRate(): number {
    if (!this.metrics.performance || this.metrics.performance.totalGoals === 0) return 0;
    return (this.metrics.performance.goalsCompleted / this.metrics.performance.totalGoals) * 100;
  }

  get activeGoals(): number {
    if (!this.settings.goals) return 0;
    return this.settings.goals.filter(goal => goal.status === 'active').length;
  }

  // Methods
  addGoal(goal: {
    title: string;
    description: string;
    targetDate?: Date;
  }): void {
    if (!this.settings.goals) {
      this.settings.goals = [];
    }

    const newGoal = {
      id: `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...goal,
      progress: 0,
      status: 'active' as const,
    };

    this.settings.goals.push(newGoal);
  }

  updateGoalProgress(goalId: string, progress: number): void {
    if (!this.settings.goals) return;

    const goal = this.settings.goals.find(g => g.id === goalId);
    if (goal) {
      goal.progress = Math.max(0, Math.min(100, progress));
      
      // Auto-complete if 100% progress
      if (progress >= 100 && goal.status === 'active') {
        goal.status = 'completed';
      }
    }
  }

  completeGoal(goalId: string): void {
    if (!this.settings.goals) return;

    const goal = this.settings.goals.find(g => g.id === goalId);
    if (goal) {
      goal.status = 'completed';
      goal.progress = 100;
    }
  }

  updateSettings(newSettings: Partial<Team['settings']>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  updateMetrics(newMetrics: Partial<Team['metrics']>): void {
    this.metrics = { ...this.metrics, ...newMetrics };
  }

  canUserJoin(user: User): boolean {
    // Check if team is at capacity
    if (this.isAtCapacity) return false;

    // Check if team allows self-join
    if (!this.settings.allowSelfJoin) return false;

    // Check if user is already a member
    if (this.members?.some(member => member.userId === user.id)) return false;

    return true;
  }

  calculateProductivityScore(): number {
    if (!this.members || this.members.length === 0) return 0;

    // This would typically aggregate individual member productivity scores
    // For now, return a calculated score based on goals and performance
    const goalsScore = this.goalsCompletionRate;
    const performanceScore = this.averagePerformanceRating * 20; // Convert 1-5 scale to 0-100
    
    return Math.round((goalsScore + performanceScore) / 2);
  }

  calculateCollaborationScore(): number {
    if (!this.metrics.collaboration) return 0;
    
    const { meetingsPerWeek, responseTime } = this.metrics.collaboration;
    
    // Score based on meeting frequency (optimal: 2-4 meetings per week)
    let meetingScore = 0;
    if (meetingsPerWeek >= 2 && meetingsPerWeek <= 4) {
      meetingScore = 100;
    } else if (meetingsPerWeek >= 1 && meetingsPerWeek < 2) {
      meetingScore = 70;
    } else if (meetingsPerWeek > 4 && meetingsPerWeek <= 6) {
      meetingScore = 80;
    } else {
      meetingScore = 50;
    }

    // Score based on response time (optimal: < 4 hours)
    let responseScore = 0;
    if (responseTime <= 2) {
      responseScore = 100;
    } else if (responseTime <= 4) {
      responseScore = 90;
    } else if (responseTime <= 8) {
      responseScore = 70;
    } else if (responseTime <= 24) {
      responseScore = 50;
    } else {
      responseScore = 30;
    }

    return Math.round((meetingScore + responseScore) / 2);
  }

  generateTeamReport(): any {
    return {
      teamInfo: {
        id: this.id,
        name: this.name,
        department: this.department,
        memberCount: this.memberCount,
        leadName: this.lead?.fullName,
      },
      performance: {
        productivityScore: this.calculateProductivityScore(),
        collaborationScore: this.calculateCollaborationScore(),
        goalsCompletionRate: this.goalsCompletionRate,
        averageRating: this.averagePerformanceRating,
      },
      goals: {
        total: this.settings.goals?.length || 0,
        active: this.activeGoals,
        completed: this.settings.goals?.filter(g => g.status === 'completed').length || 0,
      },
      metrics: this.metrics,
      lastUpdated: this.updatedAt,
    };
  }

  archive(): void {
    this.status = 'archived';
  }

  activate(): void {
    this.status = 'active';
  }

  deactivate(): void {
    this.status = 'inactive';
  }

  // Static helper methods
  static getDefaultSettings(): Team['settings'] {
    return {
      isPublic: false,
      allowSelfJoin: false,
      requireApproval: true,
      maxMembers: 20,
      workingHours: {
        timezone: 'UTC',
        schedule: {
          monday: { start: '09:00', end: '17:00' },
          tuesday: { start: '09:00', end: '17:00' },
          wednesday: { start: '09:00', end: '17:00' },
          thursday: { start: '09:00', end: '17:00' },
          friday: { start: '09:00', end: '17:00' },
        },
      },
      communication: {},
      goals: [],
    };
  }

  static getDefaultMetrics(): Team['metrics'] {
    return {
      productivity: {
        score: 0,
        trend: 'stable',
        lastUpdated: new Date(),
      },
      collaboration: {
        score: 0,
        meetingsPerWeek: 0,
        responseTime: 24,
      },
      satisfaction: {
        score: 0,
      },
      performance: {
        goalsCompleted: 0,
        totalGoals: 0,
        averageRating: 0,
      },
    };
  }
}
