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
import { User } from '../entities/user.entity';
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

  @Column({ name: 'organizationId', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'instructorId', type: 'uuid' })
  instructorId: string;

  @Column({ name: 'title', type: 'varchar', length: 255 })
  title: string;

  @Column({ name: 'slug', type: 'varchar', length: 255, unique: true })
  @Index()
  slug: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'shortDescription', type: 'text', nullable: true })
  shortDescription?: string;

  @Column({ name: 'learningObjectives', type: 'text', nullable: true })
  learningObjectives?: string;

  @Column({ name: 'prerequisites', type: 'text', nullable: true })
  prerequisites?: string;

  @Column({ name: 'category', type: 'varchar', length: 100, nullable: true })
  category?: string;

  @Column({ name: 'tags', type: 'text', array: true, default: '{}' })
  tags: string[];

  @Column({
    name: 'status',
    type: 'enum',
    enum: CourseStatus,
    default: CourseStatus.DRAFT,
  })
  @Index()
  status: CourseStatus;

  @Column({
    name: 'difficulty',
    type: 'enum',
    enum: CourseDifficulty,
    default: CourseDifficulty.BEGINNER,
  })
  @Index()
  difficulty: CourseDifficulty;

  @Column({
    name: 'accessType',
    type: 'enum',
    enum: CourseAccessType,
    default: CourseAccessType.FREE,
  })
  @Index()
  accessType: CourseAccessType;

  @Column({ name: 'price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  price?: number;

  @Column({ name: 'currency', type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  @Column({ name: 'thumbnailFileId', type: 'uuid', nullable: true })
  thumbnailFileId?: string;

  @Column({ name: 'previewVideoFileId', type: 'uuid', nullable: true })
  previewVideoFileId?: string;

  @Column({ name: 'thumbnailUrl', type: 'text', nullable: true })
  thumbnailUrl?: string;

  @Column({ name: 'previewVideoUrl', type: 'text', nullable: true })
  previewVideoUrl?: string;

  @Column({ name: 'estimatedDurationMinutes', type: 'integer', default: 0 })
  estimatedDurationMinutes: number;

  @Column({ name: 'totalLessons', type: 'integer', default: 0 })
  totalLessons: number;

  @Column({ name: 'totalModules', type: 'integer', default: 0 })
  totalModules: number;

  @Column({ name: 'totalAssessments', type: 'integer', default: 0 })
  totalAssessments: number;

  @Column({ name: 'averageRating', type: 'decimal', precision: 3, scale: 2, default: 0 })
  averageRating: number;

  @Column({ name: 'totalRatings', type: 'integer', default: 0 })
  totalRatings: number;

  @Column({ name: 'totalEnrollments', type: 'integer', default: 0 })
  totalEnrollments: number;

  @Column({ name: 'totalCompletions', type: 'integer', default: 0 })
  totalCompletions: number;

  @Column({ name: 'viewCount', type: 'integer', default: 0 })
  viewCount: number;

  @Column({ name: 'isPublished', type: 'boolean', default: false })
  @Index()
  isPublished: boolean;

  @Column({ name: 'allowEnrollment', type: 'boolean', default: true })
  allowEnrollment: boolean;

  @Column({ name: 'requiresApproval', type: 'boolean', default: false })
  requiresApproval: boolean;

  @Column({ name: 'generateCertificate', type: 'boolean', default: true })
  generateCertificate: boolean;

  @Column({ name: 'passingScore', type: 'integer', nullable: true })
  passingScore?: number;

  @Column({ name: 'maxAttempts', type: 'integer', nullable: true })
  maxAttempts?: number;

  @Column({ name: 'timeLimit', type: 'integer', nullable: true }) // in minutes
  timeLimit?: number;

  @Column({ name: 'publishedAt', type: 'timestamp', nullable: true })
  publishedAt?: Date;

  @Column({ name: 'enrollmentStartDate', type: 'timestamp', nullable: true })
  enrollmentStartDate?: Date;

  @Column({ name: 'enrollmentEndDate', type: 'timestamp', nullable: true })
  enrollmentEndDate?: Date;

  @Column({ name: 'metadata', type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @Column({ name: 'settings', type: 'jsonb', default: '{}' })
  settings: Record<string, unknown>;

  @Column({ name: 'version', type: 'integer', default: 0 })
  version: number;

  @Column({ name: 'isArchived', type: 'boolean', default: false })
  isArchived: boolean;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
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

  canEnroll(userId?: string, organizationId?: string): boolean {
    if (!this.isActive || !this.allowEnrollment) return false;
    if (this.enrollmentStatus !== 'open') return false;
    if (this.accessType === CourseAccessType.ORGANIZATION_ONLY) {
      return this.organizationId === organizationId;
    }
    return true;
  }

  canAccess(userId?: string, organizationId?: string, isEnrolled = false): boolean {
    if (!this.isActive) return false;
    if (userId === this.instructorId) return true;
    if (this.accessType === CourseAccessType.ORGANIZATION_ONLY) return this.organizationId === organizationId;
    if (this.isFree) return true;
    return isEnrolled;
  }

  updateStatistics(stats: {
    totalModules?: number;
    totalLessons?: number;
    totalAssessments?: number;
    estimatedDurationMinutes?: number;
  }): void {
    if (stats.totalModules !== undefined) this.totalModules = stats.totalModules;
    if (stats.totalLessons !== undefined) this.totalLessons = stats.totalLessons;
    if (stats.totalAssessments !== undefined) this.totalAssessments = stats.totalAssessments;
    if (stats.estimatedDurationMinutes !== undefined) this.estimatedDurationMinutes = stats.estimatedDurationMinutes;
  }

  updateRating(newRating: number): void {
    const totalScore = this.averageRating * this.totalRatings + newRating;
    this.totalRatings += 1;
    this.averageRating = Math.round((totalScore / this.totalRatings) * 100) / 100;
  }

  incrementViewCount(): void {
    this.viewCount += 1;
  }

  incrementEnrollmentCount(): void {
    this.totalEnrollments += 1;
  }

  incrementCompletionCount(): void {
    this.totalCompletions += 1;
  }

  hasTag(tag: string): boolean {
    return this.tags.includes(tag.toLowerCase());
  }

  addTag(tag: string): void {
    const normalizedTag = tag.toLowerCase();
    if (!this.hasTag(normalizedTag)) this.tags = [...this.tags, normalizedTag];
  }

  removeTag(tag: string): void {
    this.tags = this.tags.filter(t => t !== tag.toLowerCase());
  }

  getMetadata<T = unknown>(key: string, defaultValue?: T): T {
    return (this.metadata[key] as T) ?? defaultValue;
  }

  setMetadata(key: string, value: unknown): void {
    this.metadata = { ...this.metadata, [key]: value };
  }

  getSetting<T = unknown>(key: string, defaultValue?: T): T {
    return (this.settings[key] as T) ?? defaultValue;
  }

  setSetting(key: string, value: unknown): void {
    this.settings = { ...this.settings, [key]: value };
  }
}
