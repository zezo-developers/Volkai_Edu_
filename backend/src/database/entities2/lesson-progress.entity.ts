import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../entities/user.entity';
import { Lesson } from './lesson.entity';
import { Enrollment } from './enrollment.entity';

/**
 * Lesson progress status enumeration
 */
export enum LessonProgressStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
}

/**
 * Lesson Progress entity for Learning Management System
 * Tracks individual lesson progress for enrolled users
 */
@Entity('lesson_progress')
@Unique(['userId', 'lessonId'])
@Index(['userId'])
@Index(['lessonId'])
@Index(['enrollmentId'])
@Index(['status'])
@Index(['completedAt'])
@Index(['progressPercentage'])
export class LessonProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  lessonId: string;

  @Column({ type: 'uuid' })
  enrollmentId: string;

  @Column({
    type: 'enum',
    enum: LessonProgressStatus,
    default: LessonProgressStatus.NOT_STARTED,
  })
  @Index()
  status: LessonProgressStatus;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  @Index()
  progressPercentage: number;

  @Column({ type: 'integer', default: 0 })
  timeSpentSeconds: number;

  @Column({ type: 'integer', default: 0 })
  videoWatchedSeconds: number;

  @Column({ type: 'integer', default: 0 })
  audioListenedSeconds: number;

  @Column({ type: 'integer', default: 0 })
  totalDurationSeconds: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  score?: number;

  @Column({ type: 'integer', default: 0 })
  attemptCount: number;

  @Column({ type: 'integer', nullable: true })
  maxAttempts?: number;

  @Column({ type: 'timestamp', nullable: true })
  startedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  completedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastAccessedAt?: Date;

  @Column({ type: 'integer', default: 0 })
  bookmarkPosition: number; // For video/audio position

  @Column({ type: 'text', array: true, default: '{}' })
  completedSections: string[]; // For tracking completed sections within a lesson

  @Column({ type: 'jsonb', default: '{}' })
  interactionData: Record<string, unknown>; // For interactive content responses

  @Column({ type: 'jsonb', default: '{}' })
  quizResponses: Record<string, unknown>; // For quiz responses

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  rating?: number;

  @Column({ type: 'text', nullable: true })
  feedback?: string;

  @Column({ type: 'boolean', default: false })
  isBookmarked: boolean;

  @Column({ type: 'boolean', default: false })
  needsReview: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @ManyToOne(() => Lesson, lesson => lesson.progress, { eager: false })
  @JoinColumn({ name: 'lessonId' })
  lesson?: Lesson;

  @ManyToOne(() => Enrollment, enrollment => enrollment.lessonProgress, { eager: false })
  @JoinColumn({ name: 'enrollmentId' })
  enrollment?: Enrollment;

  // Virtual properties
  get isCompleted(): boolean {
    return this.status === LessonProgressStatus.COMPLETED;
  }

  get isInProgress(): boolean {
    return this.status === LessonProgressStatus.IN_PROGRESS;
  }

  get isNotStarted(): boolean {
    return this.status === LessonProgressStatus.NOT_STARTED;
  }

  get isSkipped(): boolean {
    return this.status === LessonProgressStatus.SKIPPED;
  }

  get timeSpentFormatted(): string {
    const hours = Math.floor(this.timeSpentSeconds / 3600);
    const minutes = Math.floor((this.timeSpentSeconds % 3600) / 60);
    const seconds = this.timeSpentSeconds % 60;
    
    if (hours === 0 && minutes === 0) return `${seconds}s`;
    if (hours === 0) return `${minutes}m ${seconds}s`;
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  get videoWatchPercentage(): number {
    return this.totalDurationSeconds > 0 
      ? Math.round((this.videoWatchedSeconds / this.totalDurationSeconds) * 100) 
      : 0;
  }

  get audioListenPercentage(): number {
    return this.totalDurationSeconds > 0 
      ? Math.round((this.audioListenedSeconds / this.totalDurationSeconds) * 100) 
      : 0;
  }

  get daysSinceLastAccess(): number {
    if (!this.lastAccessedAt) return 0;
    
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.lastAccessedAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  get completionTimeInDays(): number {
    if (!this.startedAt || !this.completedAt) return 0;
    
    const diffTime = Math.abs(this.completedAt.getTime() - this.startedAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Start lesson progress
   */
  start(): void {
    if (this.status === LessonProgressStatus.NOT_STARTED) {
      this.status = LessonProgressStatus.IN_PROGRESS;
      this.startedAt = new Date();
      this.updateLastAccessed();
    }
  }

  /**
   * Complete lesson progress
   */
  complete(score?: number): void {
    this.status = LessonProgressStatus.COMPLETED;
    this.completedAt = new Date();
    this.progressPercentage = 100;
    
    if (score !== undefined) {
      this.score = Math.round(score * 100) / 100;
    }
    
    this.updateLastAccessed();
  }

  /**
   * Skip lesson
   */
  skip(): void {
    this.status = LessonProgressStatus.SKIPPED;
    this.completedAt = new Date();
    this.updateLastAccessed();
  }

  /**
   * Reset progress
   */
  reset(): void {
    this.status = LessonProgressStatus.NOT_STARTED;
    this.progressPercentage = 0;
    this.timeSpentSeconds = 0;
    this.videoWatchedSeconds = 0;
    this.audioListenedSeconds = 0;
    this.score = null;
    this.attemptCount = 0;
    this.startedAt = null;
    this.completedAt = null;
    this.bookmarkPosition = 0;
    this.completedSections = [];
    this.interactionData = {};
    this.quizResponses = {};
  }

  /**
   * Update progress percentage
   */
  updateProgress(percentage: number): void {
    this.progressPercentage = Math.min(100, Math.max(0, percentage));
    
    if (this.progressPercentage > 0 && this.status === LessonProgressStatus.NOT_STARTED) {
      this.start();
    }
    
    if (this.progressPercentage >= 100 && this.status === LessonProgressStatus.IN_PROGRESS) {
      this.complete();
    }
    
    this.updateLastAccessed();
  }

  /**
   * Add time spent
   */
  addTimeSpent(seconds: number): void {
    this.timeSpentSeconds += seconds;
    this.updateLastAccessed();
  }

  /**
   * Update video watch progress
   */
  updateVideoProgress(watchedSeconds: number, totalSeconds?: number): void {
    this.videoWatchedSeconds = Math.max(this.videoWatchedSeconds, watchedSeconds);
    
    if (totalSeconds) {
      this.totalDurationSeconds = totalSeconds;
    }
    
    if (this.totalDurationSeconds > 0) {
      const percentage = (this.videoWatchedSeconds / this.totalDurationSeconds) * 100;
      this.updateProgress(percentage);
    }
  }

  /**
   * Update audio listen progress
   */
  updateAudioProgress(listenedSeconds: number, totalSeconds?: number): void {
    this.audioListenedSeconds = Math.max(this.audioListenedSeconds, listenedSeconds);
    
    if (totalSeconds) {
      this.totalDurationSeconds = totalSeconds;
    }
    
    if (this.totalDurationSeconds > 0) {
      const percentage = (this.audioListenedSeconds / this.totalDurationSeconds) * 100;
      this.updateProgress(percentage);
    }
  }

  /**
   * Set bookmark position
   */
  setBookmark(position: number): void {
    this.bookmarkPosition = Math.max(0, position);
    this.updateLastAccessed();
  }

  /**
   * Toggle bookmark
   */
  toggleBookmark(): void {
    this.isBookmarked = !this.isBookmarked;
  }

  /**
   * Mark section as completed
   */
  completeSection(sectionId: string): void {
    if (!this.completedSections.includes(sectionId)) {
      this.completedSections = [...this.completedSections, sectionId];
    }
  }

  /**
   * Check if section is completed
   */
  isSectionCompleted(sectionId: string): boolean {
    return this.completedSections.includes(sectionId);
  }

  /**
   * Set quiz responses
   */
  setQuizResponses(responses: Record<string, unknown>): void {
    this.quizResponses = responses;
  }

  /**
   * Set interaction data
   */
  setInteractionData(data: Record<string, unknown>): void {
    this.interactionData = data;
  }

  /**
   * Increment attempt count
   */
  incrementAttemptCount(): void {
    this.attemptCount += 1;
  }

  /**
   * Check if more attempts are allowed
   */
  canAttempt(): boolean {
    if (!this.maxAttempts) return true;
    return this.attemptCount < this.maxAttempts;
  }

  /**
   * Update last accessed timestamp
   */
  updateLastAccessed(): void {
    this.lastAccessedAt = new Date();
  }

  /**
   * Set rating
   */
  setRating(rating: number, feedback?: string): void {
    this.rating = Math.min(5, Math.max(1, rating));
    if (feedback) {
      this.feedback = feedback;
    }
  }

  /**
   * Add notes
   */
  addNotes(notes: string): void {
    this.notes = notes;
  }

  /**
   * Mark for review
   */
  markForReview(): void {
    this.needsReview = true;
  }

  /**
   * Unmark for review
   */
  unmarkForReview(): void {
    this.needsReview = false;
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
   * Get engagement score (0-100)
   */
  getEngagementScore(): number {
    let score = 0;
    
    // Progress contribution (40%)
    score += this.progressPercentage * 0.4;
    
    // Time spent contribution (30%)
    if (this.totalDurationSeconds > 0) {
      const timeRatio = Math.min(this.timeSpentSeconds / this.totalDurationSeconds, 2); // Cap at 2x
      score += timeRatio * 30;
    }
    
    // Interaction contribution (20%)
    const hasInteractions = Object.keys(this.interactionData).length > 0 || 
                           Object.keys(this.quizResponses).length > 0;
    if (hasInteractions) score += 20;
    
    // Completion contribution (10%)
    if (this.isCompleted) score += 10;
    
    return Math.min(100, Math.round(score));
  }

  /**
   * Check if progress is stale (no activity for a while)
   */
  isStale(): boolean {
    return this.daysSinceLastAccess > 7 && !this.isCompleted;
  }
}
