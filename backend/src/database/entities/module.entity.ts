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
import { Course } from './course.entity';
import { Lesson } from './lesson.entity';

/**
 * Module status enumeration
 */
export enum ModuleStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

/**
 * Module entity for Learning Management System
 * Represents a module within a course containing multiple lessons
 */
@Entity('modules')
@Index(['courseId'])
@Index(['status'])
@Index(['isPublished'])
@Index(['sortOrder'])
@Index(['createdAt'])
export class Module {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  courseId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  slug?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: true })
  learningObjectives?: string;

  @Column({ type: 'integer', default: 0 })
  @Index()
  sortOrder: number;

  @Column({
    type: 'enum',
    enum: ModuleStatus,
    default: ModuleStatus.DRAFT,
  })
  @Index()
  status: ModuleStatus;

  @Column({ type: 'boolean', default: false })
  @Index()
  isPublished: boolean;

  @Column({ type: 'boolean', default: false })
  isRequired: boolean;

  @Column({ type: 'boolean', default: false })
  allowSkip: boolean;

  @Column({ type: 'integer', default: 0 })
  estimatedDurationMinutes: number;

  @Column({ type: 'integer', default: 0 })
  totalLessons: number;

  @Column({ type: 'integer', default: 0 })
  totalAssessments: number;

  @Column({ type: 'integer', default: 0 })
  completionCount: number;

  @Column({ type: 'integer', nullable: true })
  passingScore?: number;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @Column({ type: 'jsonb', default: '{}' })
  settings: Record<string, unknown>;

  @Column({ type: 'integer', default: 1 })
  version: number;

  @Column({ type: 'boolean', default: false })
  isArchived: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Course, course => course.modules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course?: Course;

  @OneToMany(() => Lesson, lesson => lesson.module, { cascade: true })
  lessons?: Lesson[];

  // Virtual properties
  get isActive(): boolean {
    return this.status === ModuleStatus.PUBLISHED && this.isPublished;
  }

  get estimatedDurationFormatted(): string {
    const hours = Math.floor(this.estimatedDurationMinutes / 60);
    const minutes = this.estimatedDurationMinutes % 60;
    
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  }

  get completionRate(): number {
    return this.totalLessons > 0 
      ? Math.round((this.completionCount / this.totalLessons) * 100) 
      : 0;
  }

  /**
   * Check if user can access this module
   */
  canAccess(courseAccess: boolean, previousModuleCompleted = true): boolean {
    if (!courseAccess || !this.isActive) {
      return false;
    }

    // If module is required and previous module not completed
    if (this.isRequired && !previousModuleCompleted) {
      return false;
    }

    return true;
  }

  /**
   * Update module statistics
   */
  updateStatistics(stats: {
    totalLessons?: number;
    totalAssessments?: number;
    estimatedDurationMinutes?: number;
  }): void {
    if (stats.totalLessons !== undefined) {
      this.totalLessons = stats.totalLessons;
    }
    if (stats.totalAssessments !== undefined) {
      this.totalAssessments = stats.totalAssessments;
    }
    if (stats.estimatedDurationMinutes !== undefined) {
      this.estimatedDurationMinutes = stats.estimatedDurationMinutes;
    }
  }

  /**
   * Increment completion count
   */
  incrementCompletionCount(): void {
    this.completionCount += 1;
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
}
