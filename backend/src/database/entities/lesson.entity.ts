import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Module } from './module.entity';
import { File } from './file.entity';
import { LessonProgress } from './lesson-progress.entity';

/**
 * Lesson type enumeration
 */
export enum LessonType {
  VIDEO = 'video',
  TEXT = 'text',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  INTERACTIVE = 'interactive',
  QUIZ = 'quiz',
  ASSIGNMENT = 'assignment',
  LIVE_SESSION = 'live_session',
}

/**
 * Lesson status enumeration
 */
export enum LessonStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

/**
 * Lesson entity for Learning Management System
 * Represents individual lessons within a module
 */
@Entity('lessons')
@Index(['moduleId'])
@Index(['type'])
@Index(['status'])
@Index(['isPublished'])
@Index(['sortOrder'])
@Index(['createdAt'])
export class Lesson {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  moduleId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  slug?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: LessonType,
    default: LessonType.TEXT,
  })
  @Index()
  type: LessonType;

  @Column({ type: 'text', nullable: true })
  content?: string;

  @Column({ type: 'text', nullable: true })
  videoUrl?: string;

  @Column({ type: 'text', nullable: true })
  audioUrl?: string;

  @Column({ type: 'uuid', nullable: true })
  videoFileId?: string;

  @Column({ type: 'uuid', nullable: true })
  audioFileId?: string;

  @Column({ type: 'uuid', array: true, default: '{}' })
  attachmentFileIds: string[];

  @Column({ type: 'integer', default: 0 })
  @Index()
  sortOrder: number;

  @Column({
    type: 'enum',
    enum: LessonStatus,
    default: LessonStatus.DRAFT,
  })
  @Index()
  status: LessonStatus;

  @Column({ type: 'boolean', default: false })
  @Index()
  isPublished: boolean;

  @Column({ type: 'boolean', default: false })
  isRequired: boolean;

  @Column({ type: 'boolean', default: false })
  allowSkip: boolean;

  @Column({ type: 'boolean', default: false })
  isFree: boolean;

  @Column({ type: 'integer', default: 0 })
  estimatedDurationMinutes: number;

  @Column({ type: 'integer', default: 0 })
  videoDurationSeconds: number;

  @Column({ type: 'integer', default: 0 })
  audioDurationSeconds: number;

  @Column({ type: 'integer', default: 0 })
  viewCount: number;

  @Column({ type: 'integer', default: 0 })
  completionCount: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  averageRating: number;

  @Column({ type: 'integer', default: 0 })
  totalRatings: number;

  @Column({ type: 'integer', nullable: true })
  passingScore?: number;

  @Column({ type: 'integer', nullable: true })
  maxAttempts?: number;

  @Column({ type: 'integer', nullable: true })
  timeLimit?: number; // in minutes

  @Column({ type: 'jsonb', default: '{}' })
  interactiveContent?: Record<string, unknown>;

  @Column({ type: 'jsonb', default: '{}' })
  quizData?: Record<string, unknown>;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @Column({ type: 'jsonb', default: '{}' })
  settings: Record<string, unknown>;

  @Column({ type: 'integer', default: 1 })
  version: number;

  @Column({ type: 'boolean', default: false })
  isArchived: boolean;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Module, module => module.lessons, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'moduleId' })
  module?: Module;

  @ManyToOne(() => File, { eager: false })
  @JoinColumn({ name: 'videoFileId' })
  videoFile?: File;

  @ManyToOne(() => File, { eager: false })
  @JoinColumn({ name: 'audioFileId' })
  audioFile?: File;

  @OneToMany(() => LessonProgress, progress => progress.lesson)
  progress?: LessonProgress[];

  // Virtual properties
  get isActive(): boolean {
    return this.status === LessonStatus.PUBLISHED && this.isPublished;
  }

  get hasVideo(): boolean {
    return this.type === LessonType.VIDEO && (!!this.videoUrl || !!this.videoFileId);
  }

  get hasAudio(): boolean {
    return this.type === LessonType.AUDIO && (!!this.audioUrl || !!this.audioFileId);
  }

  get hasAttachments(): boolean {
    return this.attachmentFileIds.length > 0;
  }

  get isInteractive(): boolean {
    return this.type === LessonType.INTERACTIVE || this.type === LessonType.QUIZ;
  }

  get estimatedDurationFormatted(): string {
    const hours = Math.floor(this.estimatedDurationMinutes / 60);
    const minutes = this.estimatedDurationMinutes % 60;
    
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  }

  get videoDurationFormatted(): string {
    const hours = Math.floor(this.videoDurationSeconds / 3600);
    const minutes = Math.floor((this.videoDurationSeconds % 3600) / 60);
    const seconds = this.videoDurationSeconds % 60;
    
    if (hours === 0) return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  get completionRate(): number {
    return this.viewCount > 0 
      ? Math.round((this.completionCount / this.viewCount) * 100) 
      : 0;
  }

  /**
   * Check if user can access this lesson
   */
  canAccess(
    moduleAccess: boolean, 
    previousLessonCompleted = true, 
    isEnrolled = false
  ): boolean {
    if (!moduleAccess || !this.isActive) {
      return false;
    }

    // Free lessons are accessible to everyone
    if (this.isFree) {
      return true;
    }

    // Paid lessons require enrollment
    if (!isEnrolled) {
      return false;
    }

    // If lesson is required and previous lesson not completed
    if (this.isRequired && !previousLessonCompleted) {
      return false;
    }

    return true;
  }

  /**
   * Get content based on lesson type
   */
  getContentUrl(): string | null {
    switch (this.type) {
      case LessonType.VIDEO:
        return this.videoUrl || null;
      case LessonType.AUDIO:
        return this.audioUrl || null;
      default:
        return null;
    }
  }

  /**
   * Update lesson statistics
   */
  updateStatistics(stats: {
    viewCount?: number;
    completionCount?: number;
    videoDurationSeconds?: number;
    audioDurationSeconds?: number;
  }): void {
    if (stats.viewCount !== undefined) {
      this.viewCount = stats.viewCount;
    }
    if (stats.completionCount !== undefined) {
      this.completionCount = stats.completionCount;
    }
    if (stats.videoDurationSeconds !== undefined) {
      this.videoDurationSeconds = stats.videoDurationSeconds;
    }
    if (stats.audioDurationSeconds !== undefined) {
      this.audioDurationSeconds = stats.audioDurationSeconds;
    }
  }

  /**
   * Increment view count
   */
  incrementViewCount(): void {
    this.viewCount += 1;
  }

  /**
   * Increment completion count
   */
  incrementCompletionCount(): void {
    this.completionCount += 1;
  }

  /**
   * Update rating
   */
  updateRating(newRating: number): void {
    const totalScore = this.averageRating * this.totalRatings + newRating;
    this.totalRatings += 1;
    this.averageRating = Math.round((totalScore / this.totalRatings) * 100) / 100;
  }

  /**
   * Add attachment file
   */
  addAttachment(fileId: string): void {
    if (!this.attachmentFileIds.includes(fileId)) {
      this.attachmentFileIds = [...this.attachmentFileIds, fileId];
    }
  }

  /**
   * Remove attachment file
   */
  removeAttachment(fileId: string): void {
    this.attachmentFileIds = this.attachmentFileIds.filter(id => id !== fileId);
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
   * Get setting value by key
   */
  getSetting<T = unknown>(key: string, defaultValue?: T): T {
    return (this.settings[key] as T) ?? defaultValue;
  }

  /**
   * Set setting value
   */
  setSetting(key: string, value: unknown): void {
    this.settings = {
      ...this.settings,
      [key]: value,
    };
  }

  /**
   * Get quiz data
   */
  getQuizData(): Record<string, unknown> | null {
    return this.type === LessonType.QUIZ ? this.quizData || null : null;
  }

  /**
   * Set quiz data
   */
  setQuizData(data: Record<string, unknown>): void {
    if (this.type === LessonType.QUIZ) {
      this.quizData = data;
    }
  }

  /**
   * Get interactive content
   */
  getInteractiveContent(): Record<string, unknown> | null {
    return this.type === LessonType.INTERACTIVE ? this.interactiveContent || null : null;
  }

  /**
   * Set interactive content
   */
  setInteractiveContent(content: Record<string, unknown>): void {
    if (this.type === LessonType.INTERACTIVE) {
      this.interactiveContent = content;
    }
  }
}
