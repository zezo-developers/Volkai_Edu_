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
import { User } from '../entities/user.entity';
import { Organization } from './organization.entity';
import { Job } from './job.entity';
import { InterviewResponse } from './interview-response.entity';

export enum InterviewType {
  TECHNICAL = 'technical',
  BEHAVIORAL = 'behavioral',
  HR = 'hr',
  CASE_STUDY = 'case_study',
  GROUP = 'group',
  PANEL = 'panel',
}

export enum InterviewMode {
  VIDEO = 'video',
  AUDIO = 'audio',
  CHAT = 'chat',
  IN_PERSON = 'in_person',
}

export enum InterviewStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

@Entity('interview_sessions')
@Index(['organizationId', 'status'])
@Index(['candidateId', 'scheduledAt'])
@Index(['interviewerId', 'status'])
export class InterviewSession {
  @ApiProperty({ description: 'Interview session ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Organization ID' })
  @Column({ name: 'org_id', nullable: true })
  organizationId?: string;

  @ApiProperty({ description: 'Candidate user ID' })
  @Column({ name: 'candidate_id' })
  candidateId: string;

  @ApiProperty({ description: 'Interviewer user ID' })
  @Column({ name: 'interviewer_id', nullable: true })
  interviewerId?: string;

  @ApiProperty({ description: 'Job ID this interview is for' })
  @Column({ name: 'job_id', nullable: true })
  jobId?: string;

  @ApiProperty({ enum: InterviewType, description: 'Interview type' })
  @Column({
    type: 'enum',
    enum: InterviewType,
    default: InterviewType.TECHNICAL,
  })
  type: InterviewType;

  @ApiProperty({ enum: InterviewMode, description: 'Interview mode' })
  @Column({
    type: 'enum',
    enum: InterviewMode,
    default: InterviewMode.VIDEO,
  })
  mode: InterviewMode;

  @ApiProperty({ enum: InterviewStatus, description: 'Interview status' })
  @Column({
    type: 'enum',
    enum: InterviewStatus,
    default: InterviewStatus.SCHEDULED,
  })
  status: InterviewStatus;

  @ApiProperty({ description: 'Scheduled interview time' })
  @Column({ name: 'scheduled_at', type: 'timestamp' })
  scheduledAt: Date;

  @ApiProperty({ description: 'Interview start time' })
  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt?: Date;

  @ApiProperty({ description: 'Interview end time' })
  @Column({ name: 'ended_at', type: 'timestamp', nullable: true })
  endedAt?: Date;

  @ApiProperty({ description: 'Interview duration in minutes' })
  @Column({ name: 'duration_minutes', nullable: true })
  durationMinutes?: number;

  @ApiProperty({ description: 'Meeting URL for video interviews' })
  @Column({ name: 'meeting_url', nullable: true })
  meetingUrl?: string;

  @ApiProperty({ description: 'Meeting ID from video service' })
  @Column({ name: 'meeting_id', nullable: true })
  meetingId?: string;

  @ApiProperty({ description: 'Recording URL if recorded' })
  @Column({ name: 'recording_url', nullable: true })
  recordingUrl?: string;

  @ApiProperty({ description: 'Interview notes' })
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @ApiProperty({ description: 'Interview feedback JSON' })
  @Column({ type: 'jsonb', nullable: true })
  feedback?: Record<string, any>;

  @ApiProperty({ description: 'Overall interview score (1-100)' })
  @Column({ nullable: true })
  score?: number;

  @ApiProperty({ description: 'Interview difficulty level' })
  @Column({ nullable: true })
  difficulty?: string;

  @ApiProperty({ description: 'Interview tags' })
  @Column({ type: 'simple-array', nullable: true })
  tags?: string[];

  @ApiProperty({ description: 'Interview metadata' })
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @ApiProperty({ description: 'Whether interview is AI-powered' })
  @Column({ name: 'is_ai_interview', default: false })
  isAiInterview: boolean;

  @ApiProperty({ description: 'AI interview configuration' })
  @Column({ name: 'ai_config', type: 'jsonb', nullable: true })
  aiConfig?: Record<string, any>;

  @ApiProperty({ description: 'Interview preparation time in minutes' })
  @Column({ name: 'preparation_time', default: 5 })
  preparationTime: number;

  @ApiProperty({ description: 'Whether candidate can reschedule' })
  @Column({ name: 'allow_reschedule', default: true })
  allowReschedule: boolean;

  @ApiProperty({ description: 'Reschedule deadline (hours before interview)' })
  @Column({ name: 'reschedule_deadline_hours', default: 24 })
  rescheduleDeadlineHours: number;

  @ApiProperty({ description: 'Interview reminder sent' })
  @Column({ name: 'reminder_sent', default: false })
  reminderSent: boolean;

  @ApiProperty({ description: 'Follow-up email sent' })
  @Column({ name: 'followup_sent', default: false })
  followupSent: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'org_id' })
  organization?: Organization;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'candidate_id' })
  candidate: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'interviewer_id' })
  interviewer?: User;

  @ManyToOne(() => Job, { nullable: true })
  @JoinColumn({ name: 'job_id' })
  job?: Job;

  @OneToMany(() => InterviewResponse, response => response.interviewSession)
  responses: InterviewResponse[];

  // Virtual properties
  get actualDuration(): number {
    if (this.startedAt && this.endedAt) {
      return Math.round((this.endedAt.getTime() - this.startedAt.getTime()) / (1000 * 60));
    }
    return 0;
  }

  get isUpcoming(): boolean {
    return this.status === InterviewStatus.SCHEDULED && this.scheduledAt > new Date();
  }

  get isPast(): boolean {
    return this.scheduledAt < new Date() && this.status !== InterviewStatus.IN_PROGRESS;
  }

  get canStart(): boolean {
    const now = new Date();
    const startWindow = new Date(this.scheduledAt.getTime() - (this.preparationTime * 60 * 1000));
    return this.status === InterviewStatus.SCHEDULED && now >= startWindow;
  }

  get canReschedule(): boolean {
    if (!this.allowReschedule || this.status !== InterviewStatus.SCHEDULED) {
      return false;
    }
    const deadline = new Date(this.scheduledAt.getTime() - (this.rescheduleDeadlineHours * 60 * 60 * 1000));
    return new Date() < deadline;
  }

  // Methods
  start(): void {
    if (this.status !== InterviewStatus.SCHEDULED) {
      throw new Error('Interview must be scheduled to start');
    }
    this.status = InterviewStatus.IN_PROGRESS;
    this.startedAt = new Date();
  }

  complete(score?: number, feedback?: Record<string, any>): void {
    if (this.status !== InterviewStatus.IN_PROGRESS) {
      throw new Error('Interview must be in progress to complete');
    }
    this.status = InterviewStatus.COMPLETED;
    this.endedAt = new Date();
    this.durationMinutes = this.actualDuration;
    if (score !== undefined) {
      this.score = score;
    }
    if (feedback) {
      this.feedback = feedback;
    }
  }

  cancel(reason?: string): void {
    if (this.status === InterviewStatus.COMPLETED) {
      throw new Error('Cannot cancel completed interview');
    }
    this.status = InterviewStatus.CANCELLED;
    if (reason) {
      this.metadata = { ...this.metadata, cancellationReason: reason };
    }
  }

  reschedule(newTime: Date): void {
    if (!this.canReschedule) {
      throw new Error('Interview cannot be rescheduled');
    }
    this.scheduledAt = newTime;
    this.reminderSent = false;
    this.metadata = { 
      ...this.metadata, 
      rescheduledAt: new Date(),
      previousScheduledAt: this.scheduledAt 
    };
  }

  addFeedback(category: string, rating: number, comments?: string): void {
    if (!this.feedback) {
      this.feedback = {};
    }
    this.feedback[category] = {
      rating,
      comments,
      timestamp: new Date(),
    };
  }

  calculateOverallScore(): number {
    if (!this.feedback) return 0;
    
    const ratings = Object.values(this.feedback)
      .filter((item: any) => typeof item.rating === 'number')
      .map((item: any) => item.rating);
    
    if (ratings.length === 0) return 0;
    
    const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
    return Math.round(average);
  }

  updateScore(): void {
    this.score = this.calculateOverallScore();
  }
}
