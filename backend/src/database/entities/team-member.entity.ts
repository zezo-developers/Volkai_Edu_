import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Team } from './team.entity';
import { User } from '../entities/user.entity';

export enum TeamRole {
  LEAD = 'lead',
  SENIOR = 'senior',
  MEMBER = 'member',
  INTERN = 'intern',
}

@Entity('team_members')
@Unique(['teamId', 'userId'])
@Index(['teamId'])
@Index(['userId'])
@Index(['role'])
export class TeamMember {
  @ApiProperty({ description: 'Team member ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Team ID' })
  @Column({ name: 'teamId' })
  teamId: string;

  @ApiProperty({ description: 'User ID' })
  @Column({ name: 'userId' })
  userId: string;

  @ApiProperty({ enum: TeamRole, description: 'Team role' })
  @Column({
    type: 'enum',
    enum: TeamRole,
    default: TeamRole.MEMBER,
  })
  role: TeamRole;

  @ApiProperty({ description: 'Date joined the team' })
  @Column({ name: 'joinedAt', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  joinedAt: Date;

  @ApiProperty({ description: 'Member status' })
  @Column({ default: 'active' })
  status: 'active' | 'inactive' | 'on_leave' | 'removed';

  @ApiProperty({ description: 'Member responsibilities and focus areas' })
  @Column({ type: 'jsonb', default: {} })
  responsibilities: {
    primary?: string[];
    secondary?: string[];
    specializations?: string[];
    currentProjects?: Array<{
      name: string;
      role: string;
      startDate: Date;
      endDate?: Date;
      status: 'active' | 'completed' | 'on_hold';
    }>;
  };

  @ApiProperty({ description: 'Performance metrics for this team member' })
  @Column({ name: 'performanceMetrics', type: 'jsonb', default: {} })
  performanceMetrics: {
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
    lastUpdated?: Date;
  };

  @ApiProperty({ description: 'Availability and working preferences' })
  @Column({ type: 'jsonb', default: {} })
  availability: {
    workingHours?: {
      timezone: string;
      schedule: Record<string, { start: string; end: string; available: boolean }>;
    };
    vacationDays?: Array<{
      startDate: Date;
      endDate: Date;
      type: 'vacation' | 'sick' | 'personal' | 'other';
      status: 'approved' | 'pending' | 'rejected';
    }>;
    currentCapacity?: number;
    preferredWorkload?: 'light' | 'normal' | 'heavy';
  };

  @ApiProperty({ description: 'Team member notes and feedback' })
  @Column({ type: 'jsonb', default: [] })
  feedback: Array<{
    id: string;
    from: string;
    fromName: string;
    type: 'peer' | 'lead' | 'self' | 'manager';
    rating?: number;
    comments: string;
    date: Date;
    private: boolean;
  }>;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @ManyToOne(() => Team, team => team.members)
  @JoinColumn({ name: 'teamId' })
  team: Team;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  get daysSinceJoined(): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.joinedAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  get isLead(): boolean {
    return this.role === TeamRole.LEAD;
  }

  get isSenior(): boolean {
    return this.role === TeamRole.SENIOR || this.role === TeamRole.LEAD;
  }

  get currentProjects(): number {
    return this.responsibilities.currentProjects?.filter(p => p.status === 'active').length || 0;
  }

  get overallPerformanceScore(): number {
    if (!this.performanceMetrics) return 0;

    const scores = [
      this.performanceMetrics.productivity?.score || 0,
      this.performanceMetrics.collaboration?.score || 0,
      this.performanceMetrics.leadership?.score || 0,
    ].filter(score => score > 0);

    return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
  }

  get averageFeedbackRating(): number {
    if (!this.feedback || this.feedback.length === 0) return 0;

    const ratingsWithValues = this.feedback.filter(f => f.rating && f.rating > 0);
    if (ratingsWithValues.length === 0) return 0;

    const sum = ratingsWithValues.reduce((acc, f) => acc + (f.rating || 0), 0);
    return sum / ratingsWithValues.length;
  }

  get isOnLeave(): boolean {
    if (!this.availability.vacationDays) return false;

    const now = new Date();
    return this.availability.vacationDays.some(
      vacation =>
        vacation.status === 'approved' &&
        new Date(vacation.startDate) <= now &&
        new Date(vacation.endDate) >= now
    );
  }

  updateRole(newRole: TeamRole, performedBy: string): void {
    const oldRole = this.role;
    this.role = newRole;

    this.addFeedback({
      from: performedBy,
      fromName: 'System',
      type: 'manager',
      comments: `Role changed from ${oldRole} to ${newRole}`,
      private: false,
    });
  }

  addResponsibility(responsibility: string, type: 'primary' | 'secondary' = 'primary'): void {
    if (!this.responsibilities[type]) {
      this.responsibilities[type] = [];
    }

    if (!this.responsibilities[type]!.includes(responsibility)) {
      this.responsibilities[type]!.push(responsibility);
    }
  }

  removeResponsibility(responsibility: string): void {
    if (this.responsibilities.primary) {
      this.responsibilities.primary = this.responsibilities.primary.filter(r => r !== responsibility);
    }
    if (this.responsibilities.secondary) {
      this.responsibilities.secondary = this.responsibilities.secondary.filter(r => r !== responsibility);
    }
  }

  addProject(project: { name: string; role: string; startDate: Date; endDate?: Date }): void {
    if (!this.responsibilities.currentProjects) {
      this.responsibilities.currentProjects = [];
    }

    this.responsibilities.currentProjects.push({
      ...project,
      status: 'active',
    });
  }

  completeProject(projectName: string): void {
    if (!this.responsibilities.currentProjects) return;

    const project = this.responsibilities.currentProjects.find(p => p.name === projectName);
    if (project) {
      project.status = 'completed';
      project.endDate = new Date();
    }
  }

  updatePerformanceMetrics(metrics: Partial<TeamMember['performanceMetrics']>): void {
    this.performanceMetrics = {
      ...this.performanceMetrics,
      ...metrics,
      lastUpdated: new Date(),
    };
  }

  addFeedback(feedback: Omit<TeamMember['feedback'][0], 'id' | 'date'>): void {
    const feedbackEntry = {
      id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      date: new Date(),
      ...feedback,
    };

    this.feedback.push(feedbackEntry);
  }

  setAvailability(availability: Partial<TeamMember['availability']>): void {
    this.availability = { ...this.availability, ...availability };
  }

  requestTimeOff(timeOff: {
    startDate: Date;
    endDate: Date;
    type: 'vacation' | 'sick' | 'personal' | 'other';
  }): void {
    if (!this.availability.vacationDays) {
      this.availability.vacationDays = [];
    }

    this.availability.vacationDays.push({
      ...timeOff,
      status: 'pending',
    });
  }

  approveTimeOff(startDate: Date, endDate: Date): void {
    if (!this.availability.vacationDays) return;

    const timeOff = this.availability.vacationDays.find(
      v => v.startDate.getTime() === startDate.getTime() && v.endDate.getTime() === endDate.getTime()
    );

    if (timeOff) {
      timeOff.status = 'approved';
    }
  }

  rejectTimeOff(startDate: Date, endDate: Date): void {
    if (!this.availability.vacationDays) return;

    const timeOff = this.availability.vacationDays.find(
      v => v.startDate.getTime() === startDate.getTime() && v.endDate.getTime() === endDate.getTime()
    );

    if (timeOff) {
      timeOff.status = 'rejected';
    }
  }

  updateCapacity(capacity: number): void {
    if (capacity < 0 || capacity > 100) {
      throw new Error('Capacity must be between 0 and 100');
    }

    this.availability.currentCapacity = capacity;
  }

  deactivate(reason?: string): void {
    this.status = 'inactive';

    if (reason) {
      this.addFeedback({
        from: 'system',
        fromName: 'System',
        type: 'manager',
        comments: `Member deactivated: ${reason}`,
        private: true,
      });
    }
  }

  reactivate(): void {
    this.status = 'active';

    this.addFeedback({
      from: 'system',
      fromName: 'System',
      type: 'manager',
      comments: 'Member reactivated',
      private: true,
    });
  }

  remove(reason?: string): void {
    this.status = 'removed';

    if (reason) {
      this.addFeedback({
        from: 'system',
        fromName: 'System',
        type: 'manager',
        comments: `Member removed from team: ${reason}`,
        private: true,
      });
    }
  }

  calculateProductivityScore(): number {
    if (!this.performanceMetrics.productivity) return 0;

    const { tasksCompleted, averageCompletionTime, qualityRating } = this.performanceMetrics.productivity;

    const taskScore = Math.min(tasksCompleted * 2, 100);
    const timeScore = Math.max(0, 100 - (averageCompletionTime - 8) * 5);
    const qualityScore = qualityRating * 20;

    return Math.round(taskScore * 0.4 + timeScore * 0.3 + qualityScore * 0.3);
  }

  generateMemberReport(): any {
    return {
      memberInfo: {
        id: this.id,
        userId: this.userId,
        userName: this.user?.fullName,
        role: this.role,
        status: this.status,
        daysSinceJoined: this.daysSinceJoined,
      },
      performance: {
        overallScore: this.overallPerformanceScore,
        productivity: this.performanceMetrics.productivity?.score || 0,
        collaboration: this.performanceMetrics.collaboration?.score || 0,
        leadership: this.performanceMetrics.leadership?.score || 0,
        averageFeedbackRating: this.averageFeedbackRating,
      },
      workload: {
        currentProjects: this.currentProjects,
        capacity: this.availability.currentCapacity || 100,
        isOnLeave: this.isOnLeave,
      },
      responsibilities: this.responsibilities,
      lastUpdated: this.performanceMetrics.lastUpdated,
    };
  }

  static getDefaultAvailability(): TeamMember['availability'] {
    return {
      workingHours: {
        timezone: 'UTC',
        schedule: {
          monday: { start: '09:00', end: '17:00', available: true },
          tuesday: { start: '09:00', end: '17:00', available: true },
          wednesday: { start: '09:00', end: '17:00', available: true },
          thursday: { start: '09:00', end: '17:00', available: true },
          friday: { start: '09:00', end: '17:00', available: true },
          saturday: { start: '09:00', end: '17:00', available: false },
          sunday: { start: '09:00', end: '17:00', available: false },
        },
      },
      vacationDays: [],
      currentCapacity: 100,
      preferredWorkload: 'normal',
    };
  }

  static getDefaultPerformanceMetrics(): TeamMember['performanceMetrics'] {
    return {
      productivity: {
        score: 0,
        tasksCompleted: 0,
        averageCompletionTime: 8,
        qualityRating: 3,
      },
      collaboration: {
        score: 0,
        meetingAttendance: 100,
        responseTime: 4,
        helpfulness: 3,
      },
      leadership: {
        score: 0,
        mentoring: 0,
        initiativesTaken: 0,
        teamImpact: 3,
      },
      lastUpdated: new Date(),
    };
  }
}
