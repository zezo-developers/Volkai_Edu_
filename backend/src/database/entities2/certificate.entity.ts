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
import { Course } from './course.entity';
import { Enrollment } from './enrollment.entity';
import { Organization } from './organization.entity';

/**
 * Certificate status enumeration
 */
export enum CertificateStatus {
  PENDING = 'pending',
  ISSUED = 'issued',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
}

/**
 * Certificate type enumeration
 */
export enum CertificateType {
  COMPLETION = 'completion',
  ACHIEVEMENT = 'achievement',
  PARTICIPATION = 'participation',
  EXCELLENCE = 'excellence',
}

/**
 * Certificate entity for Learning Management System
 * Represents certificates issued to users upon course completion
 */
@Entity('certificates')
@Index(['userId'])
@Index(['courseId'])
@Index(['enrollmentId'])
@Index(['organizationId'])
@Index(['status'])
@Index(['type'])
@Index(['issuedAt'])
@Index(['certificateNumber'])
@Index(['verificationCode'])
export class Certificate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  courseId: string;

  @Column({ type: 'uuid' })
  enrollmentId: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  @Index()
  certificateNumber: string;

  @Column({ type: 'varchar', length: 32, unique: true })
  @Index()
  verificationCode: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: CertificateType,
    default: CertificateType.COMPLETION,
  })
  @Index()
  type: CertificateType;

  @Column({
    type: 'enum',
    enum: CertificateStatus,
    default: CertificateStatus.PENDING,
  })
  @Index()
  status: CertificateStatus;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  finalScore?: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  passingScore?: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  grade?: string;

  @Column({ type: 'timestamp' })
  @Index()
  issuedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  revokedAt?: Date;

  @Column({ type: 'text', nullable: true })
  revokedReason?: string;

  @Column({ type: 'uuid', nullable: true })
  revokedBy?: string;

  @Column({ type: 'text', nullable: true })
  certificateUrl?: string;

  @Column({ type: 'uuid', nullable: true })
  certificateFileId?: string;

  @Column({ type: 'text', nullable: true })
  publicUrl?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  templateId?: string;

  @Column({ type: 'jsonb', default: '{}' })
  templateData: Record<string, unknown>;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @Column({ type: 'jsonb', default: '{}' })
  verificationData: Record<string, unknown>;

  @Column({ type: 'integer', default: 0 })
  viewCount: number;

  @Column({ type: 'integer', default: 0 })
  downloadCount: number;

  @Column({ type: 'integer', default: 0 })
  verificationCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastViewedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastDownloadedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastVerifiedAt?: Date;

  @Column({ type: 'boolean', default: true })
  isPublic: boolean;

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

  @ManyToOne(() => Course, { eager: false })
  @JoinColumn({ name: 'courseId' })
  course?: Course;

  @ManyToOne(() => Enrollment, enrollment => enrollment.certificates, { eager: false })
  @JoinColumn({ name: 'enrollmentId' })
  enrollment?: Enrollment;

  @ManyToOne(() => Organization, { eager: false })
  @JoinColumn({ name: 'organizationId' })
  organization?: Organization;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'revokedBy' })
  revokedByUser?: User;

  // Virtual properties
  get isIssued(): boolean {
    return this.status === CertificateStatus.ISSUED;
  }

  get isRevoked(): boolean {
    return this.status === CertificateStatus.REVOKED;
  }

  get isExpired(): boolean {
    return this.status === CertificateStatus.EXPIRED ||
           (this.expiresAt && new Date() > this.expiresAt);
  }

  get isValid(): boolean {
    return this.isIssued && !this.isExpired;
  }

  get daysSinceIssued(): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.issuedAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  get daysUntilExpiry(): number {
    if (!this.expiresAt) return -1; // Never expires
    
    const now = new Date();
    const diffTime = this.expiresAt.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  get gradeDisplay(): string {
    if (this.grade) return this.grade;
    
    if (this.finalScore !== undefined) {
      if (this.finalScore >= 90) return 'A';
      if (this.finalScore >= 80) return 'B';
      if (this.finalScore >= 70) return 'C';
      if (this.finalScore >= 60) return 'D';
      return 'F';
    }
    
    return 'Pass';
  }

  get achievementLevel(): 'excellent' | 'good' | 'satisfactory' {
    if (this.finalScore !== undefined) {
      if (this.finalScore >= 90) return 'excellent';
      if (this.finalScore >= 75) return 'good';
      return 'satisfactory';
    }
    
    return 'satisfactory';
  }

  /**
   * Generate certificate number
   */
  static generateCertificateNumber(organizationId: string, courseId: string): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const orgPrefix = organizationId.substring(0, 4).toUpperCase();
    const coursePrefix = courseId.substring(0, 4).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    return `CERT-${orgPrefix}-${coursePrefix}-${timestamp}-${random}`;
  }

  /**
   * Generate verification code
   */
  static generateVerificationCode(): string {
    return Math.random().toString(36).substring(2, 34).toUpperCase();
  }

  /**
   * Issue the certificate
   */
  issue(): void {
    if (this.status === CertificateStatus.PENDING) {
      this.status = CertificateStatus.ISSUED;
      this.issuedAt = new Date();
    }
  }

  /**
   * Revoke the certificate
   */
  revoke(reason: string, revokedBy: string): void {
    if (this.status === CertificateStatus.ISSUED) {
      this.status = CertificateStatus.REVOKED;
      this.revokedAt = new Date();
      this.revokedReason = reason;
      this.revokedBy = revokedBy;
    }
  }

  /**
   * Mark as expired
   */
  expire(): void {
    if (this.status === CertificateStatus.ISSUED) {
      this.status = CertificateStatus.EXPIRED;
    }
  }

  /**
   * Increment view count
   */
  incrementViewCount(): void {
    this.viewCount += 1;
    this.lastViewedAt = new Date();
  }

  /**
   * Increment download count
   */
  incrementDownloadCount(): void {
    this.downloadCount += 1;
    this.lastDownloadedAt = new Date();
  }

  /**
   * Increment verification count
   */
  incrementVerificationCount(): void {
    this.verificationCount += 1;
    this.lastVerifiedAt = new Date();
  }

  /**
   * Set certificate file
   */
  setCertificateFile(fileId: string, publicUrl?: string): void {
    this.certificateFileId = fileId;
    if (publicUrl) {
      this.publicUrl = publicUrl;
    }
  }

  /**
   * Set template data
   */
  setTemplateData(data: Record<string, unknown>): void {
    this.templateData = {
      ...this.templateData,
      ...data,
    };
  }

  /**
   * Get template data for certificate generation
   */
  getTemplateData(): Record<string, unknown> {
    return {
      certificateNumber: this.certificateNumber,
      verificationCode: this.verificationCode,
      title: this.title,
      type: this.type,
      finalScore: this.finalScore,
      grade: this.gradeDisplay,
      issuedAt: this.issuedAt,
      expiresAt: this.expiresAt,
      achievementLevel: this.achievementLevel,
      ...this.templateData,
    };
  }

  /**
   * Set verification data
   */
  setVerificationData(data: Record<string, unknown>): void {
    this.verificationData = {
      ...this.verificationData,
      ...data,
    };
  }

  /**
   * Get verification URL
   */
  getVerificationUrl(baseUrl: string): string {
    return `${baseUrl}/certificates/verify/${this.verificationCode}`;
  }

  /**
   * Get public certificate URL
   */
  getPublicUrl(baseUrl: string): string {
    if (this.publicUrl) return this.publicUrl;
    return `${baseUrl}/certificates/public/${this.certificateNumber}`;
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
   * Check if certificate needs renewal
   */
  needsRenewal(): boolean {
    if (!this.expiresAt) return false;
    
    const daysUntilExpiry = this.daysUntilExpiry;
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30; // 30 days before expiry
  }

  /**
   * Get certificate summary for display
   */
  getSummary(): {
    certificateNumber: string;
    title: string;
    type: string;
    status: string;
    issuedAt: Date;
    expiresAt?: Date;
    grade: string;
    isValid: boolean;
  } {
    return {
      certificateNumber: this.certificateNumber,
      title: this.title,
      type: this.type,
      status: this.status,
      issuedAt: this.issuedAt,
      expiresAt: this.expiresAt,
      grade: this.gradeDisplay,
      isValid: this.isValid,
    };
  }

  /**
   * Validate certificate integrity
   */
  validateIntegrity(): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (!this.certificateNumber) {
      errors.push('Missing certificate number');
    }
    
    if (!this.verificationCode) {
      errors.push('Missing verification code');
    }
    
    if (!this.userId || !this.courseId || !this.enrollmentId) {
      errors.push('Missing required references');
    }
    
    if (this.isExpired) {
      errors.push('Certificate has expired');
    }
    
    if (this.isRevoked) {
      errors.push('Certificate has been revoked');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate certificate data for blockchain/digital signature
   */
  generateDigitalSignatureData(): Record<string, unknown> {
    return {
      certificateNumber: this.certificateNumber,
      userId: this.userId,
      courseId: this.courseId,
      organizationId: this.organizationId,
      issuedAt: this.issuedAt.toISOString(),
      finalScore: this.finalScore,
      type: this.type,
      title: this.title,
    };
  }
}
