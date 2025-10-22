import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { OrganizationMembership } from './organization-membership.entity';
import { AuditLog } from './audit-log.entity';
import { UserResume } from './user-resume.entity';
import { UserSkill } from './user-skill.entity';
import { HRProfile } from './hr-profile.entity';
import { UserNotificationPreferences } from './user-notification-preferences.entity';

/**
 * Forward declarations with `user` property to fix TypeScript errors
 */

/**
 * User status enumeration
 */

export enum Role {
  ADMIN = 'admin',
  USER = 'user',
  HR = 'hr',
  SUPER_ADMIN = 'super_admin',
  DEVELOPER = 'developer',
  ORGANIZATION_ADMIN = 'organization_admin',
  ORGANIZATION_MEMBER = 'organization_member',
  // add other roles here
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  HR = 'hr',
  SUPER_ADMIN = 'super_admin',
  DEVELOPER = 'developer',
  ORGANIZATION_ADMIN = 'organization_admin',
  ORGANIZATION_MEMBER = 'organization_member',
  INSTRUCTOR = 'instructor',
  CONTENT_CREATOR = 'content_creator',
  STUDENT = 'student',
  MANAGER = 'manager',
  // add other roles here
}


export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

/**
 * User entity representing system users
 */
@Entity('users')
@Index(['email'], { unique: true })
@Index(['phone'], { unique: true, where: 'phone IS NOT NULL' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  @Index()
  email: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  @Index()
  roles: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Exclude({ toPlainOnly: true })
  passwordHash?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  organizationId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Exclude({ toPlainOnly: true })
  failedLoginAttempts?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Exclude({ toPlainOnly: true })
  lastLoginIp?: string;

  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  @Column({ type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 20, nullable: true, unique: true })
  phone?: string;

  @Column({ type: 'text', nullable: true })
  avatarUrl?: string;

  @Column({ type: 'varchar', length: 10, default: 'en' })
  locale: string;

  @Column({ type: 'varchar', length: 50, default: 'UTC' })
  timezone: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  @Index()
  status: UserStatus;

  @Column({ type: 'boolean', default: false })
  emailVerified: boolean;

  @Column({ type: 'boolean', default: false })
  phoneVerified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Exclude({ toPlainOnly: true })
  emailVerificationToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  emailVerificationExpiresAt?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Exclude({ toPlainOnly: true })
  passwordResetToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  passwordResetExpiresAt?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Exclude({ toPlainOnly: true })
  refreshTokenHash?: string;

  @Column({ name: 'created_at' })
  created_at: Date; // property in TS can be camelCase

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  // Relations
  @OneToMany(() => OrganizationMembership, membership => membership.user)
  organizationMemberships: OrganizationMembership[];

  @OneToMany(() => AuditLog, auditLog => auditLog.actor)
  auditLogs: AuditLog[];

  // Added missing relations
  @OneToMany(() => UserResume, resume => resume.user)
  resumes: UserResume[];

  @OneToMany(() => UserSkill, skill => skill.user)
  skills: UserSkill[];

  @OneToOne(() => HRProfile, hrProfile => hrProfile.user)
  @JoinColumn()
  hrProfile: HRProfile;

  @OneToOne(() => UserNotificationPreferences, np => np.user)
  @JoinColumn()
  notificationPreferences: UserNotificationPreferences;

  // Virtual properties
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  get isActive(): boolean {
    return this.status === UserStatus.ACTIVE && !this.deletedAt;
  }

  get isVerified(): boolean {
    return this.emailVerified;
  }

  hasValidEmailVerificationToken(token: string): boolean {
    return (
      this.emailVerificationToken === token &&
      this.emailVerificationExpiresAt &&
      this.emailVerificationExpiresAt > new Date()
    );
  }

  hasValidPasswordResetToken(token: string): boolean {
    return (
      this.passwordResetToken === token &&
      this.passwordResetExpiresAt &&
      this.passwordResetExpiresAt > new Date()
    );
  }

  clearTokens(): void {
    this.emailVerificationToken = null;
    this.emailVerificationExpiresAt = null;
    this.passwordResetToken = null;
    this.passwordResetExpiresAt = null;
    this.refreshTokenHash = null;
  }
}
