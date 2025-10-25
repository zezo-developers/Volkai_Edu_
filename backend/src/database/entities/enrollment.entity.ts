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
  Unique,
} from 'typeorm';
import { User } from '../entities/user.entity';
import { Course } from './course.entity';
import { LessonProgress } from './lesson-progress.entity';
import { Assessment } from './assessment.entity';
import { Certificate } from './certificate.entity';

/**
 * Enrollment status enumeration
 */
export enum EnrollmentStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

/**
 * Enrollment entity for Learning Management System
 * Tracks user enrollment and progress in courses
 */
@Entity('enrollments')
@Unique(['userId', 'courseId'])
@Index(['userId'])
@Index(['courseId'])
@Index(['status'])
@Index(['enrolledAt'])
@Index(['completedAt'])
@Index(['progressPercentage'])
export class Enrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'userId' })
  userId: string;

  @Column({ type: 'uuid', name: 'courseId' })
  courseId: string;

  @Column({
    type: 'enum',
    enum: EnrollmentStatus,
    default: EnrollmentStatus.PENDING,
    name: 'status',
  })
  @Index()
  status: EnrollmentStatus;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, name: 'progressPercentage' })
  @Index()
  progressPercentage: number;

  @Column({ type: 'integer', default: 0, name: 'completedLessons' })
  completedLessons: number;

  @Column({ type: 'integer', default: 0, name: 'totalLessons' })
  totalLessons: number;

  @Column({ type: 'integer', default: 0, name: 'completedAssessments' })
  completedAssessments: number;

  @Column({ type: 'integer', default: 0, name: 'totalAssessments' })
  totalAssessments: number;

  @Column({ type: 'integer', default: 0, name: 'totalTimeSpentMinutes' })
  totalTimeSpentMinutes: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true, name: 'finalScore' })
  finalScore?: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true, name: 'averageScore' })
  averageScore?: number;

  @Column({ type: 'integer', default: 0, name: 'attemptCount' })
  attemptCount: number;

  @Column({ type: 'integer', nullable: true, name: 'maxAttempts' })
  maxAttempts?: number;

  @Column({ type: 'timestamp', nullable: true, name: 'lastAccessedAt' })
  lastAccessedAt?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'startedAt' })
  startedAt?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'completedAt' })
  completedAt?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'certificateIssuedAt' })
  certificateIssuedAt?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'expiresAt' })
  expiresAt?: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'paidAmount' })
  paidAmount?: number;

  @Column({ type: 'varchar', length: 3, nullable: true, name: 'currency' })
  currency?: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'paymentTransactionId' })
  paymentTransactionId?: string;

  @Column({ type: 'timestamp', nullable: true, name: 'paymentDate' })
  paymentDate?: Date;

  @Column({ type: 'text', nullable: true, name: 'notes' })
  notes?: string;

  @Column({ type: 'jsonb', default: '{}', name: 'metadata' })
  metadata: Record<string, unknown>;

  @Column({ type: 'jsonb', default: '{}', name: 'preferences' })
  preferences: Record<string, unknown>;

  @Column({ type: 'boolean', default: true, name: 'receiveNotifications' })
  receiveNotifications: boolean;

  @Column({ type: 'boolean', default: false, name: 'isArchived' })
  isArchived: boolean;

  @CreateDateColumn({ name: 'enrolledAt' })
  @Index()
  enrolledAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @ManyToOne(() => Course, course => course.enrollments, { eager: false })
  @JoinColumn({ name: 'courseId' })
  course?: Course;

  @OneToMany(() => LessonProgress, progress => progress.enrollment)
  lessonProgress?: LessonProgress[];

  @OneToMany(() => Certificate, certificate => certificate.enrollment)
  certificates?: Certificate[];

  // Virtual properties
  get isActive(): boolean {
    return this.status === EnrollmentStatus.ACTIVE;
  }

  get isCompleted(): boolean {
    return this.status === EnrollmentStatus.COMPLETED;
  }

  get isPending(): boolean {
    return this.status === EnrollmentStatus.PENDING;
  }

  get isSuspended(): boolean {
    return this.status === EnrollmentStatus.SUSPENDED;
  }

  get isCancelled(): boolean {
    return this.status === EnrollmentStatus.CANCELLED;
  }

  get isExpired(): boolean {
    return this.status === EnrollmentStatus.EXPIRED || 
           (this.expiresAt && new Date() > this.expiresAt);
  }

  get canAccess(): boolean {
    return this.isActive && !this.isExpired;
  }

  get completionRate(): number {
    return this.totalLessons > 0 
      ? Math.round((this.completedLessons / this.totalLessons) * 100) 
      : 0;
  }

  get assessmentCompletionRate(): number {
    return this.totalAssessments > 0 
      ? Math.round((this.completedAssessments / this.totalAssessments) * 100) 
      : 0;
  }

  get totalTimeSpentFormatted(): string {
    const hours = Math.floor(this.totalTimeSpentMinutes / 60);
    const minutes = this.totalTimeSpentMinutes % 60;
    
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  }

  get daysSinceEnrollment(): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.enrolledAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  get daysSinceLastAccess(): number {
    if (!this.lastAccessedAt) return this.daysSinceEnrollment;
    
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.lastAccessedAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  get isRecentlyActive(): boolean {
    return this.daysSinceLastAccess <= 7;
  }

  get enrollmentDuration(): number {
    if (!this.completedAt) return this.daysSinceEnrollment;
    
    const diffTime = Math.abs(this.completedAt.getTime() - this.enrolledAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  isEligibleForCertificate(passingScore?: number): boolean {
    if (!this.isCompleted) return false;
    
    if (passingScore && this.finalScore) {
      return this.finalScore >= passingScore;
    }
    
    return this.progressPercentage >= 100;
  }

  updateProgress(completedLessons: number, totalLessons: number): void {
    this.completedLessons = completedLessons;
    this.totalLessons = totalLessons;
    this.progressPercentage = totalLessons > 0 
      ? Math.round((completedLessons / totalLessons) * 100) 
      : 0;
    
    if (this.progressPercentage >= 100 && this.status === EnrollmentStatus.ACTIVE) {
      this.complete();
    }
  }

  updateAssessmentProgress(completedAssessments: number, totalAssessments: number): void {
    this.completedAssessments = completedAssessments;
    this.totalAssessments = totalAssessments;
  }

  addTimeSpent(minutes: number): void {
    this.totalTimeSpentMinutes += minutes;
  }

  updateLastAccessed(): void {
    this.lastAccessedAt = new Date();
  }

  start(): void {
    if (this.status === EnrollmentStatus.PENDING) {
      this.status = EnrollmentStatus.ACTIVE;
      this.startedAt = new Date();
      this.updateLastAccessed();
    }
  }

  complete(): void {
    if (this.status === EnrollmentStatus.ACTIVE) {
      this.status = EnrollmentStatus.COMPLETED;
      this.completedAt = new Date();
      this.progressPercentage = 100;
    }
  }

  suspend(reason?: string): void {
    if (this.status === EnrollmentStatus.ACTIVE) {
      this.status = EnrollmentStatus.SUSPENDED;
      if (reason) {
        this.setMetadata('suspensionReason', reason);
      }
    }
  }

  reactivate(): void {
    if (this.status === EnrollmentStatus.SUSPENDED) {
      this.status = EnrollmentStatus.ACTIVE;
      this.setMetadata('reactivatedAt', new Date().toISOString());
    }
  }

  cancel(reason?: string): void {
    if ([EnrollmentStatus.PENDING, EnrollmentStatus.ACTIVE, EnrollmentStatus.SUSPENDED].includes(this.status)) {
      this.status = EnrollmentStatus.CANCELLED;
      if (reason) {
        this.setMetadata('cancellationReason', reason);
      }
    }
  }

  expire(): void {
    if (this.status === EnrollmentStatus.ACTIVE) {
      this.status = EnrollmentStatus.EXPIRED;
    }
  }

  updateFinalScore(score: number): void {
    this.finalScore = Math.round(score * 100) / 100;
  }

  updateAverageScore(score: number): void {
    this.averageScore = Math.round(score * 100) / 100;
  }

  incrementAttemptCount(): void {
    this.attemptCount += 1;
  }

  canAttempt(): boolean {
    if (!this.maxAttempts) return true;
    return this.attemptCount < this.maxAttempts;
  }

  recordPayment(amount: number, currency: string, transactionId: string): void {
    this.paidAmount = amount;
    this.currency = currency;
    this.paymentTransactionId = transactionId;
    this.paymentDate = new Date();
  }

  recordCertificateIssuance(): void {
    this.certificateIssuedAt = new Date();
  }

  getMetadata<T = unknown>(key: string, defaultValue?: T): T {
    return (this.metadata[key] as T) ?? defaultValue;
  }

  setMetadata(key: string, value: unknown): void {
    this.metadata = {
      ...this.metadata,
      [key]: value,
    };
  }

  getPreference<T = unknown>(key: string, defaultValue?: T): T {
    return (this.preferences[key] as T) ?? defaultValue;
  }

  setPreference(key: string, value: unknown): void {
    this.preferences = {
      ...this.preferences,
      [key]: value,
    };
  }

  needsAttention(): boolean {
    if (!this.isActive) return false;
    
    const daysSinceLastAccess = this.daysSinceLastAccess;
    const daysSinceEnrollment = this.daysSinceEnrollment;
    
    if (daysSinceLastAccess > 30) return true;
    if (daysSinceEnrollment > 14 && this.progressPercentage < 10) return true;
    if (daysSinceLastAccess > 14) return true;
    
    return false;
  }

  getEngagementLevel(): 'high' | 'medium' | 'low' {
    const daysSinceLastAccess = this.daysSinceLastAccess;
    const progressRate = this.progressPercentage / Math.max(this.daysSinceEnrollment, 1);
    
    if (daysSinceLastAccess <= 3 && progressRate > 5) return 'high';
    if (daysSinceLastAccess <= 7 && progressRate > 2) return 'medium';
    return 'low';
  }
}
