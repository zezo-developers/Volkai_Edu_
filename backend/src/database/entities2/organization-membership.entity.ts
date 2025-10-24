import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../entities/user.entity';
import { Organization } from './organization.entity';

/**
 * Membership role enumeration
 */
export enum MembershipRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MANAGER = 'manager',
  HR = 'hr',
  INTERVIEWER = 'interviewer',
  LEARNER = 'learner',
}

/**
 * Membership status enumeration
 */
export enum MembershipStatus {
  INVITED = 'invited',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  REMOVED = 'removed',
}

/**
 * Organization membership entity representing user-organization relationships
 * Handles multi-tenancy and role-based access within organizations
 */
@Entity('organization_memberships')
@Unique(['userId', 'organizationId'])
@Index(['userId', 'organizationId'])
@Index(['organizationId', 'role'])
@Index(['status'])
export class OrganizationMembership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({
    type: 'enum',
    enum: MembershipRole,
  })
  role: MembershipRole;

  @Column({
    type: 'enum',
    enum: MembershipStatus,
    default: MembershipStatus.ACTIVE,
  })
  status: MembershipStatus;

  @Column({ type: 'uuid', nullable: true })
  invitedBy?: string;

  @Column({ type: 'timestamp', nullable: true })
  invitedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  joinedAt?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  invitationToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  invitationExpiresAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  // @ManyToOne(() => User, user => user.organizationMemberships, { eager: true })
  // @JoinColumn({ name: 'userId' })
  // user: User;

  @ManyToOne(() => Organization, organization => organization.memberships, { eager: true })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'invitedBy' })
  inviter?: User;

  // Virtual properties
  get isActive(): boolean {
    return this.status === MembershipStatus.ACTIVE;
  }

  get isPending(): boolean {
    return this.status === MembershipStatus.INVITED;
  }

  get isOwner(): boolean {
    return this.role === MembershipRole.OWNER;
  }

  get isAdmin(): boolean {
    return this.role === MembershipRole.ADMIN || this.isOwner;
  }

  get canManageUsers(): boolean {
    return [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.HR].includes(this.role);
  }

  get canManageContent(): boolean {
    return [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.MANAGER].includes(this.role);
  }

  get canConductInterviews(): boolean {
    return [
      MembershipRole.OWNER,
      MembershipRole.ADMIN,
      MembershipRole.MANAGER,
      MembershipRole.HR,
      MembershipRole.INTERVIEWER,
    ].includes(this.role);
  }

  /**
   * Check if membership has a valid invitation token
   */
  hasValidInvitationToken(token: string): boolean {
    return (
      this.invitationToken === token &&
      this.invitationExpiresAt &&
      this.invitationExpiresAt > new Date() &&
      this.status === MembershipStatus.INVITED
    );
  }

  /**
   * Accept invitation and activate membership
   */
  acceptInvitation(): void {
    this.status = MembershipStatus.ACTIVE;
    this.joinedAt = new Date();
    this.invitationToken = null;
    this.invitationExpiresAt = null;
  }

  /**
   * Check if user has permission for a specific action
   */
  hasPermission(permission: string): boolean {
    const rolePermissions = this.getRolePermissions();
    return rolePermissions.includes(permission);
  }

  /**
   * Get all permissions for the current role
   */
  private getRolePermissions(): string[] {
    const basePermissions = ['read:profile', 'update:profile'];
    
    switch (this.role) {
      case MembershipRole.OWNER:
        return [
          ...basePermissions,
          'manage:organization',
          'manage:users',
          'manage:billing',
          'manage:content',
          'manage:jobs',
          'conduct:interviews',
          'view:analytics',
        ];
      
      case MembershipRole.ADMIN:
        return [
          ...basePermissions,
          'manage:users',
          'manage:content',
          'manage:jobs',
          'conduct:interviews',
          'view:analytics',
        ];
      
      case MembershipRole.MANAGER:
        return [
          ...basePermissions,
          'manage:content',
          'manage:jobs',
          'conduct:interviews',
          'view:team_analytics',
        ];
      
      case MembershipRole.HR:
        return [
          ...basePermissions,
          'manage:users',
          'manage:jobs',
          'conduct:interviews',
          'view:hr_analytics',
        ];
      
      case MembershipRole.INTERVIEWER:
        return [
          ...basePermissions,
          'conduct:interviews',
          'view:interview_analytics',
        ];
      
      case MembershipRole.LEARNER:
        return [
          ...basePermissions,
          'enroll:courses',
          'take:assessments',
          'apply:jobs',
        ];
      
      default:
        return basePermissions;
    }
  }
}
