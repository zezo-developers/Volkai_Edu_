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
import { User } from './user.entity';
import { Organization } from './organization.entity';
import { Module } from './module.entity';
import { Enrollment } from './enrollment.entity';
import { File } from './file.entity';

/**
 * Course status enumeration
 */
export enum CourseStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
  SUSPENDED = 'suspended',
}

/**
 * Course difficulty level enumeration
 */
export enum CourseDifficulty {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

/**
 * Course access type enumeration
 */
export enum CourseAccessType {
  FREE = 'free',
  PAID = 'paid',
  PREMIUM = 'premium',
  ORGANIZATION_ONLY = 'organization_only',
}

/**
 * Course entity for Learning Management System
 * Represents a complete course with modules, lessons, and assessments
 */
@Entity('courses')
@Index(['organizationId'])
@Index(['instructorId'])
@Index(['status'])
@Index(['category'])
@Index(['difficulty'])
@Index(['accessType'])
@Index(['isPublished'])
@Index(['createdAt'])
@Index(['slug'])
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'uuid' })
  instructorId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  @Index()
  slug: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: true })
  shortDescription?: string;

  @Column({ type: 'text', nullable: true })
  learningObjectives?: string;

  @Column({ type: 'text', nullable: true })
  prerequisites?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category?: string;

  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  @Column({
    type: 'enum',
    enum: CourseStatus,
    default: CourseStatus.DRAFT,
  })
  @Index()
  status: CourseStatus;

  @Column({
    type: 'enum',
    enum: CourseDifficulty,
    default: CourseDifficulty.BEGINNER,
  })
  @Index()
  difficulty: CourseDifficulty;

  @Column({
    type: 'enum',
    enum: CourseAccessType,
    default: CourseAccessType.FREE,
  })
  @Index()
  accessType: CourseAccessType;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price?: number;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  @Column({ type: 'uuid', nullable: true })
  thumbnailFileId?: string;

  @Column({ type: 'uuid', nullable: true })
  previewVideoFileId?: string;

  @Column({ type: 'text', nullable: true })
  thumbnailUrl?: string;

  @Column({ type: 'text', nullable: true })
  previewVideoUrl?: string;

  @Column({ type: 'integer', default: 0 })
  estimatedDurationMinutes: number;

  @Column({ type: 'integer', default: 0 })
  totalLessons: number;

  @Column({ type: 'integer', default: 0 })
  totalModules: number;

  @Column({ type: 'integer', default: 0 })
  totalAssessments: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  averageRating: number;

  @Column({ type: 'integer', default: 0 })
  totalRatings: number;

  @Column({ type: 'integer', default: 0 })
  totalEnrollments: number;

  @Column({ type: 'integer', default: 0 })
  totalCompletions: number;

  @Column({ type: 'integer', default: 0 })
  viewCount: number;

  @Column({ type: 'boolean', default: false })
  @Index()
  isPublished: boolean;

  @Column({ type: 'boolean', default: true })
  allowEnrollment: boolean;

  @Column({ type: 'boolean', default: false })
  requiresApproval: boolean;

  @Column({ type: 'boolean', default: true })
  generateCertificate: boolean;

  @Column({ type: 'integer', nullable: true })
  passingScore?: number;

  @Column({ type: 'integer', nullable: true })
  maxAttempts?: number;

  @Column({ type: 'integer', nullable: true })
  timeLimit?: number; // in minutes

  @Column({ type: 'timestamp', nullable: true })
  publishedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  enrollmentStartDate?: Date;

  @Column({ type: 'timestamp', nullable: true })
  enrollmentEndDate?: Date;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @Column({ type: 'jsonb', default: '{}' })
  settings: Record<string, unknown>;

  @Column({ type: 'integer', default: 0 })
  version: number;

  @Column({ type: 'boolean', default: false })
  isArchived: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Organization, { eager: false })
  @JoinColumn({ name: 'organizationId' })
  organization?: Organization;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'instructorId' })
  instructor?: User;

  @OneToMany(() => Module, module => module.course, { cascade: true })
  modules?: Module[];

  @OneToMany(() => Enrollment, enrollment => enrollment.course)
  enrollments?: Enrollment[];

  @ManyToOne(() => File, { eager: false })
  @JoinColumn({ name: 'thumbnailFileId' })
  thumbnailFile?: File;

  @ManyToOne(() => File, { eager: false })
  @JoinColumn({ name: 'previewVideoFileId' })
  previewVideoFile?: File;

  // Virtual properties
  get completionRate(): number {
    return this.totalEnrollments > 0 
      ? Math.round((this.totalCompletions / this.totalEnrollments) * 100) 
      : 0;
  }

  get isActive(): boolean {
    return this.status === CourseStatus.PUBLISHED && this.isPublished;
  }

  get isFree(): boolean {
    return this.accessType === CourseAccessType.FREE;
  }

  get isPaid(): boolean {
    return this.accessType === CourseAccessType.PAID || this.accessType === CourseAccessType.PREMIUM;
  }

  get formattedPrice(): string {
    if (!this.price) return 'Free';
    return `${this.currency} ${this.price.toFixed(2)}`;
  }

  get estimatedDurationFormatted(): string {
    const hours = Math.floor(this.estimatedDurationMinutes / 60);
    const minutes = this.estimatedDurationMinutes % 60;
    
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  }

  get enrollmentStatus(): 'open' | 'closed' | 'upcoming' {
    const now = new Date();
    
    if (this.enrollmentStartDate && now < this.enrollmentStartDate) {
      return 'upcoming';
    }
    
    if (this.enrollmentEndDate && now > this.enrollmentEndDate) {
      return 'closed';
    }
    
    return this.allowEnrollment ? 'open' : 'closed';
  }

  /**
   * Check if user can enroll in this course
   */
  canEnroll(userId?: string, organizationId?: string): boolean {
    if (!this.isActive || !this.allowEnrollment) {
      return false;
    }

    if (this.enrollmentStatus !== 'open') {
      return false;
    }

    if (this.accessType === CourseAccessType.ORGANIZATION_ONLY) {
      return this.organizationId === organizationId;
    }

    return true;
  }

  /**
   * Check if user can access course content
   */
  canAccess(userId?: string, organizationId?: string, isEnrolled = false): boolean {
    if (!this.isActive) {
      return false;
    }

    // Instructor always has access
    if (userId === this.instructorId) {
      return true;
    }

    // Organization-only courses require organization membership
    if (this.accessType === CourseAccessType.ORGANIZATION_ONLY) {
      return this.organizationId === organizationId;
    }

    // Free courses are accessible to everyone
    if (this.isFree) {
      return true;
    }

    // Paid courses require enrollment
    return isEnrolled;
  }

  /**
   * Update course statistics
   */
  updateStatistics(stats: {
    totalModules?: number;
    totalLessons?: number;
    totalAssessments?: number;
    estimatedDurationMinutes?: number;
  }): void {
    if (stats.totalModules !== undefined) {
      this.totalModules = stats.totalModules;
    }
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
   * Update rating
   */
  updateRating(newRating: number): void {
    const totalScore = this.averageRating * this.totalRatings + newRating;
    this.totalRatings += 1;
    this.averageRating = Math.round((totalScore / this.totalRatings) * 100) / 100;
  }

  /**
   * Increment view count
   */
  incrementViewCount(): void {
    this.viewCount += 1;
  }

  /**
   * Increment enrollment count
   */
  incrementEnrollmentCount(): void {
    this.totalEnrollments += 1;
  }

  /**
   * Increment completion count
   */
  incrementCompletionCount(): void {
    this.totalCompletions += 1;
  }

  /**
   * Check if course has tag
   */
  hasTag(tag: string): boolean {
    return this.tags.includes(tag.toLowerCase());
  }

  /**
   * Add tag to course
   */
  addTag(tag: string): void {
    const normalizedTag = tag.toLowerCase();
    if (!this.hasTag(normalizedTag)) {
      this.tags = [...this.tags, normalizedTag];
    }
  }

  /**
   * Remove tag from course
   */
  removeTag(tag: string): void {
    this.tags = this.tags.filter(t => t !== tag.toLowerCase());
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
