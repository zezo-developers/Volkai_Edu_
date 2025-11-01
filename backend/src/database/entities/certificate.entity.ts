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

  @Column({ name: 'userId', type: 'uuid' })
  userId: string;

  @Column({ name: 'courseId', type: 'uuid' })
  courseId: string;

  @Column({ name: 'enrollmentId', type: 'uuid' })
  enrollmentId: string;

  @Column({ name: 'organizationId', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'certificateNumber', type: 'varchar', length: 50, unique: true })
  @Index()
  certificateNumber: string;

  @Column({ name: 'verificationCode', type: 'varchar', length: 32, unique: true })
  @Index()
  verificationCode: string;

  @Column({ name: 'title', type: 'varchar', length: 255 })
  title: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string;

  @Column({
    name: 'type',
    type: 'enum',
    enum: CertificateType,
    default: CertificateType.COMPLETION,
  })
  @Index()
  type: CertificateType;

  @Column({
    name: 'status',
    type: 'enum',
    enum: CertificateStatus,
    default: CertificateStatus.PENDING,
  })
  @Index()
  status: CertificateStatus;

  @Column({ name: 'finalScore', type: 'decimal', precision: 5, scale: 2, nullable: true })
  finalScore?: number;

  @Column({ name: 'passingScore', type: 'decimal', precision: 5, scale: 2, nullable: true })
  passingScore?: number;

  @Column({ name: 'grade', type: 'varchar', length: 50, nullable: true })
  grade?: string;

  @Column({ name: 'issuedAt', type: 'timestamp' })
  @Index()
  issuedAt: Date;

  @Column({ name: 'expiresAt', type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @Column({ name: 'revokedAt', type: 'timestamp', nullable: true })
  revokedAt?: Date;

  @Column({ name: 'revokedReason', type: 'text', nullable: true })
  revokedReason?: string;

  @Column({ name: 'revokedBy', type: 'uuid', nullable: true })
  revokedBy?: string;

  @Column({ name: 'certificateUrl', type: 'text', nullable: true })
  certificateUrl?: string;

  @Column({ name: 'certificateFileId', type: 'uuid', nullable: true })
  certificateFileId?: string;

  @Column({ name: 'publicUrl', type: 'text', nullable: true })
  publicUrl?: string;

  @Column({ name: 'templateId', type: 'varchar', length: 255, nullable: true })
  templateId?: string;

  @Column({ name: 'templateData', type: 'jsonb', default: '{}' })
  templateData: Record<string, unknown>;

  @Column({ name: 'metadata', type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @Column({ name: 'verificationData', type: 'jsonb', default: '{}' })
  verificationData: Record<string, unknown>;

  @Column({ name: 'viewCount', type: 'integer', default: 0 })
  viewCount: number;

  @Column({ name: 'downloadCount', type: 'integer', default: 0 })
  downloadCount: number;

  @Column({ name: 'verificationCount', type: 'integer', default: 0 })
  verificationCount: number;

  @Column({ name: 'lastViewedAt', type: 'timestamp', nullable: true })
  lastViewedAt?: Date;

  @Column({ name: 'lastDownloadedAt', type: 'timestamp', nullable: true })
  lastDownloadedAt?: Date;

  @Column({ name: 'lastVerifiedAt', type: 'timestamp', nullable: true })
  lastVerifiedAt?: Date;

  @Column({ name: 'isPublic', type: 'boolean', default: true })
  isPublic: boolean;

  @Column({ name: 'isArchived', type: 'boolean', default: false })
  isArchived: boolean;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
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
    if (!this.expiresAt) return -1;
    
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

  static generateCertificateNumber(organizationId: string, courseId: string): string {
    console.log("INside generate certifcate")
    const timestamp = Date.now().toString(36).toUpperCase();
    const orgPrefix = organizationId.substring(0, 4).toUpperCase();
    const coursePrefix = courseId.substring(0, 4).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    return `CERT-${orgPrefix}-${coursePrefix}-${timestamp}-${random}`;
  }

  static generateVerificationCode(): string {
    return Math.random().toString(36).substring(2, 34).toUpperCase();
  }

  issue(): void {
    if (this.status === CertificateStatus.PENDING) {
      this.status = CertificateStatus.ISSUED;
      this.issuedAt = new Date();
    }
  }

  revoke(reason: string, revokedBy: string): void {
    if (this.status === CertificateStatus.ISSUED) {
      this.status = CertificateStatus.REVOKED;
      this.revokedAt = new Date();
      this.revokedReason = reason;
      this.revokedBy = revokedBy;
    }
  }

  expire(): void {
    if (this.status === CertificateStatus.ISSUED) {
      this.status = CertificateStatus.EXPIRED;
    }
  }

  incrementViewCount(): void {
    this.viewCount += 1;
    this.lastViewedAt = new Date();
  }

  incrementDownloadCount(): void {
    this.downloadCount += 1;
    this.lastDownloadedAt = new Date();
  }

  incrementVerificationCount(): void {
    this.verificationCount += 1;
    this.lastVerifiedAt = new Date();
  }

  setCertificateFile(fileId: string, publicUrl?: string): void {
    this.certificateFileId = fileId;
    if (publicUrl) {
      this.publicUrl = publicUrl;
    }
  }

  setTemplateData(data: Record<string, unknown>): void {
    this.templateData = {
      ...this.templateData,
      ...data,
    };
  }

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

  setVerificationData(data: Record<string, unknown>): void {
    this.verificationData = {
      ...this.verificationData,
      ...data,
    };
  }

  getVerificationUrl(baseUrl: string): string {
    return `${baseUrl}/certificates/verify/${this.verificationCode}`;
  }

  getPublicUrl(baseUrl: string): string {
    if (this.publicUrl) return this.publicUrl;
    return `${baseUrl}/certificates/public/${this.certificateNumber}`;
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

  needsRenewal(): boolean {
    if (!this.expiresAt) return false;
    
    const daysUntilExpiry = this.daysUntilExpiry;
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  }

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
