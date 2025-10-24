import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../entities/user.entity';
import { Assessment } from './assessment.entity';
import { Enrollment } from './enrollment.entity';

/**
 * Assessment attempt status enumeration
 */
export enum AssessmentAttemptStatus {
  STARTED = 'started',
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
  GRADED = 'graded',
  ABANDONED = 'abandoned',
  EXPIRED = 'expired',
}

/**
 * Assessment Attempt entity for Learning Management System
 * Tracks individual assessment attempts by users
 */
@Entity('assessment_attempts')
@Index(['userId'])
@Index(['assessmentId'])
@Index(['enrollmentId'])
@Index(['status'])
@Index(['score'])
@Index(['startedAt'])
@Index(['submittedAt'])
export class AssessmentAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  assessmentId: string;

  @Column({ type: 'uuid' })
  enrollmentId: string;

  @Column({ type: 'integer' })
  attemptNumber: number;

  @Column({
    type: 'enum',
    enum: AssessmentAttemptStatus,
    default: AssessmentAttemptStatus.STARTED,
  })
  @Index()
  status: AssessmentAttemptStatus;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  @Index()
  score?: number;

  @Column({ type: 'integer', nullable: true })
  earnedPoints?: number;

  @Column({ type: 'integer', nullable: true })
  totalPoints?: number;

  @Column({ type: 'integer', nullable: true })
  correctAnswers?: number;

  @Column({ type: 'integer', nullable: true })
  totalQuestions?: number;

  @Column({ type: 'boolean', nullable: true })
  passed?: boolean;

  @Column({ type: 'integer', default: 0 })
  timeSpentSeconds: number;

  @Column({ type: 'integer', nullable: true })
  timeLimitSeconds?: number;

  @Column({ type: 'timestamp' })
  @Index()
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  submittedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  gradedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'jsonb', default: '{}' })
  responses: Record<string, string | string[]>;

  @Column({ type: 'jsonb', default: '{}' })
  questionOrder: Record<string, number>;

  @Column({ type: 'jsonb', default: '{}' })
  gradingDetails: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  feedback?: string;

  @Column({ type: 'text', nullable: true })
  instructorNotes?: string;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @Column({ type: 'jsonb', default: '{}' })
  proctoring: Record<string, unknown>;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  @Column({ type: 'boolean', default: false })
  flaggedForReview: boolean;

  @Column({ type: 'text', array: true, default: '{}' })
  flags: string[];

  @Column({ type: 'boolean', default: false })
  isArchived: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @ManyToOne(() => Assessment, assessment => assessment.attempts, { eager: false })
  @JoinColumn({ name: 'assessmentId' })
  assessment?: Assessment;

  @ManyToOne(() => Enrollment, { eager: false })
  @JoinColumn({ name: 'enrollmentId' })
  enrollment?: Enrollment;

  // Virtual properties
  get isStarted(): boolean {
    return this.status === AssessmentAttemptStatus.STARTED;
  }

  get isInProgress(): boolean {
    return this.status === AssessmentAttemptStatus.IN_PROGRESS;
  }

  get isSubmitted(): boolean {
    return [
      AssessmentAttemptStatus.SUBMITTED,
      AssessmentAttemptStatus.GRADED,
    ].includes(this.status);
  }

  get isGraded(): boolean {
    return this.status === AssessmentAttemptStatus.GRADED;
  }

  get isAbandoned(): boolean {
    return this.status === AssessmentAttemptStatus.ABANDONED;
  }

  get isExpired(): boolean {
    return this.status === AssessmentAttemptStatus.EXPIRED ||
           (this.expiresAt && new Date() > this.expiresAt);
  }

  get isActive(): boolean {
    return [
      AssessmentAttemptStatus.STARTED,
      AssessmentAttemptStatus.IN_PROGRESS,
    ].includes(this.status) && !this.isExpired;
  }

  get timeSpentFormatted(): string {
    const hours = Math.floor(this.timeSpentSeconds / 3600);
    const minutes = Math.floor((this.timeSpentSeconds % 3600) / 60);
    const seconds = this.timeSpentSeconds % 60;
    
    if (hours === 0 && minutes === 0) return `${seconds}s`;
    if (hours === 0) return `${minutes}m ${seconds}s`;
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  get timeRemainingSeconds(): number {
    if (!this.timeLimitSeconds || !this.startedAt) return 0;
    
    const elapsed = Math.floor((Date.now() - this.startedAt.getTime()) / 1000);
    return Math.max(0, this.timeLimitSeconds - elapsed);
  }

  get timeRemainingFormatted(): string {
    const remaining = this.timeRemainingSeconds;
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = remaining % 60;
    
    if (hours === 0 && minutes === 0) return `${seconds}s`;
    if (hours === 0) return `${minutes}m ${seconds}s`;
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  get completionRate(): number {
    if (!this.totalQuestions) return 0;
    const answeredQuestions = Object.keys(this.responses).length;
    return Math.round((answeredQuestions / this.totalQuestions) * 100);
  }

  get accuracyRate(): number {
    if (!this.totalQuestions || this.correctAnswers === undefined) return 0;
    return Math.round((this.correctAnswers / this.totalQuestions) * 100);
  }

  /**
   * Start the attempt
   */
  start(timeLimitMinutes?: number): void {
    this.status = AssessmentAttemptStatus.IN_PROGRESS;
    this.startedAt = new Date();
    
    if (timeLimitMinutes) {
      this.timeLimitSeconds = timeLimitMinutes * 60;
      this.expiresAt = new Date(Date.now() + timeLimitMinutes * 60 * 1000);
    }
  }

  /**
   * Submit the attempt
   */
  submit(): void {
    if (this.isActive) {
      this.status = AssessmentAttemptStatus.SUBMITTED;
      this.submittedAt = new Date();
      this.calculateTimeSpent();
    }
  }

  /**
   * Grade the attempt
   */
  grade(
    score: number,
    earnedPoints: number,
    totalPoints: number,
    correctAnswers: number,
    totalQuestions: number,
    passed: boolean,
    feedback?: string
  ): void {
    this.status = AssessmentAttemptStatus.GRADED;
    this.score = Math.round(score * 100) / 100;
    this.earnedPoints = earnedPoints;
    this.totalPoints = totalPoints;
    this.correctAnswers = correctAnswers;
    this.totalQuestions = totalQuestions;
    this.passed = passed;
    this.gradedAt = new Date();
    
    if (feedback) {
      this.feedback = feedback;
    }
  }

  /**
   * Abandon the attempt
   */
  abandon(): void {
    if (this.isActive) {
      this.status = AssessmentAttemptStatus.ABANDONED;
      this.calculateTimeSpent();
    }
  }

  /**
   * Mark as expired
   */
  expire(): void {
    if (this.isActive) {
      this.status = AssessmentAttemptStatus.EXPIRED;
      this.calculateTimeSpent();
    }
  }

  /**
   * Save response for a question
   */
  saveResponse(questionId: string, response: string | string[]): void {
    this.responses = {
      ...this.responses,
      [questionId]: response,
    };
  }

  /**
   * Get response for a question
   */
  getResponse(questionId: string): string | string[] | undefined {
    return this.responses[questionId];
  }

  /**
   * Set question order
   */
  setQuestionOrder(order: Record<string, number>): void {
    this.questionOrder = order;
  }

  /**
   * Add time spent
   */
  addTimeSpent(seconds: number): void {
    this.timeSpentSeconds += seconds;
  }

  /**
   * Calculate time spent based on start and end times
   */
  private calculateTimeSpent(): void {
    if (this.startedAt) {
      const endTime = this.submittedAt || new Date();
      this.timeSpentSeconds = Math.floor((endTime.getTime() - this.startedAt.getTime()) / 1000);
    }
  }

  /**
   * Flag for review
   */
  flagForReview(reason: string): void {
    this.flaggedForReview = true;
    this.addFlag(reason);
  }

  /**
   * Add flag
   */
  addFlag(flag: string): void {
    if (!this.flags.includes(flag)) {
      this.flags = [...this.flags, flag];
    }
  }

  /**
   * Remove flag
   */
  removeFlag(flag: string): void {
    this.flags = this.flags.filter(f => f !== flag);
    
    if (this.flags.length === 0) {
      this.flaggedForReview = false;
    }
  }

  /**
   * Set instructor notes
   */
  setInstructorNotes(notes: string): void {
    this.instructorNotes = notes;
  }

  /**
   * Set grading details
   */
  setGradingDetails(details: Record<string, unknown>): void {
    this.gradingDetails = details;
  }

  /**
   * Set proctoring data
   */
  setProctoringData(data: Record<string, unknown>): void {
    this.proctoring = data;
  }

  /**
   * Get metadata value by key
   */
  getMetadata<T = unknown>(key: string, defaultValue?: T): T {
    return (this.metadata[key] as T) ?? defaultValue;
  }

  /**
   * Set metadata value
   */
  setMetadata(key: string, value: unknown): void {
    this.metadata = {
      ...this.metadata,
      [key]: value,
    };
  }

  /**
   * Check if attempt needs attention
   */
  needsAttention(): boolean {
    return this.flaggedForReview || 
           this.flags.length > 0 || 
           (this.isActive && this.timeRemainingSeconds < 300); // Less than 5 minutes remaining
  }

  /**
   * Get attempt summary
   */
  getSummary(): {
    status: string;
    score?: number;
    passed?: boolean;
    timeSpent: string;
    completionRate: number;
    flagged: boolean;
  } {
    return {
      status: this.status,
      score: this.score,
      passed: this.passed,
      timeSpent: this.timeSpentFormatted,
      completionRate: this.completionRate,
      flagged: this.flaggedForReview,
    };
  }

  /**
   * Check if attempt is suspicious
   */
  isSuspicious(): boolean {
    const suspiciousFlags = [
      'multiple_tabs',
      'copy_paste',
      'unusual_timing',
      'ip_change',
      'browser_switch',
    ];
    
    return this.flags.some(flag => suspiciousFlags.includes(flag));
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): {
    timeEfficiency: number; // Score per minute
    accuracyRate: number;
    completionRate: number;
    engagementScore: number;
  } {
    const timeInMinutes = this.timeSpentSeconds / 60;
    const timeEfficiency = timeInMinutes > 0 && this.score ? this.score / timeInMinutes : 0;
    
    // Engagement score based on time spent vs expected time
    let engagementScore = 50; // Base score
    
    if (this.timeLimitSeconds) {
      const expectedTime = this.timeLimitSeconds * 0.7; // 70% of time limit is optimal
      const actualTime = this.timeSpentSeconds;
      
      if (actualTime >= expectedTime * 0.5 && actualTime <= expectedTime * 1.5) {
        engagementScore += 30; // Good time management
      }
    }
    
    if (this.completionRate >= 90) engagementScore += 20; // High completion
    
    return {
      timeEfficiency: Math.round(timeEfficiency * 100) / 100,
      accuracyRate: this.accuracyRate,
      completionRate: this.completionRate,
      engagementScore: Math.min(100, engagementScore),
    };
  }
}
