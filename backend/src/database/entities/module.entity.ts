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

  @Column({ type: 'uuid', name: 'courseId' })
  courseId: string;

  @Column({ type: 'varchar', length: 255, name: 'title' })
  title: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'slug' })
  slug?: string;

  @Column({ type: 'text', nullable: true, name: 'description' })
  description?: string;

  @Column({ type: 'text', nullable: true, name: 'learningObjectives' })
  learningObjectives?: string;

  @Column({ type: 'integer', default: 0, name: 'sortOrder' })
  @Index()
  sortOrder: number;

  @Column({
    type: 'enum',
    enum: ModuleStatus,
    default: ModuleStatus.DRAFT,
    name: 'status',
  })
  @Index()
  status: ModuleStatus;

  @Column({ type: 'boolean', default: false, name: 'isPublished' })
  @Index()
  isPublished: boolean;

  @Column({ type: 'boolean', default: false, name: 'isRequired' })
  isRequired: boolean;

  @Column({ type: 'boolean', default: false, name: 'allowSkip' })
  allowSkip: boolean;

  @Column({ type: 'integer', default: 0, name: 'estimatedDurationMinutes' })
  estimatedDurationMinutes: number;

  @Column({ type: 'integer', default: 0, name: 'totalLessons' })
  totalLessons: number;

  @Column({ type: 'integer', default: 0, name: 'totalAssessments' })
  totalAssessments: number;

  @Column({ type: 'integer', default: 0, name: 'completionCount' })
  completionCount: number;

  @Column({ type: 'integer', nullable: true, name: 'passingScore' })
  passingScore?: number;

  @Column({ type: 'jsonb', default: '{}', name: 'metadata' })
  metadata: Record<string, unknown>;

  @Column({ type: 'jsonb', default: '{}', name: 'settings' })
  settings: Record<string, unknown>;

  @Column({ type: 'integer', default: 1, name: 'version' })
  version: number;

  @Column({ type: 'boolean', default: false, name: 'isArchived' })
  isArchived: boolean;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
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
