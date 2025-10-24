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
import { OrganizationMembership } from './organization-membership.entity';
import { Subscription } from './subscription.entity';
import { Invoice } from './invoice.entity';
import { Payment } from './payment.entity';

/**
 * Organization size enumeration
 */
export enum OrganizationSize {
  STARTUP = 'startup',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  ENTERPRISE = 'enterprise',
}

/**
 * Organization status enumeration
 */
export enum OrganizationStatus {
  ACTIVE = 'active',
  TRIAL = 'trial',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
}

/**
 * Organization entity representing companies/institutions
 * Core entity for multi-tenancy and organizational structure
 */
@Entity('organizations')
@Index(['slug'], { unique: true })
@Index(['domain'], { unique: true, where: 'domain IS NOT NULL' })
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  @Index()
  slug: string;

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  domain?: string;

  @Column({ type: 'text', nullable: true })
  logoUrl?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  industry?: string;

  @Column({
    type: 'enum',
    enum: OrganizationSize,
    nullable: true,
  })
  size?: OrganizationSize;

  @Column({ type: 'varchar', length: 50, default: 'UTC' })
  timezone: string;

  @Column({
    type: 'enum',
    enum: OrganizationStatus,
    default: OrganizationStatus.TRIAL,
  })
  @Index()
  status: OrganizationStatus;

  @Column({ type: 'jsonb', default: '{}' })
  settings: Record<string, unknown>;

  @Column({ type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @OneToMany(() => OrganizationMembership, membership => membership.organization)
  memberships: OrganizationMembership[];

  // Billing relations
  @OneToMany(() => Subscription, subscription => subscription.organization)
  subscriptions: Subscription[];

  @OneToMany(() => Invoice, invoice => invoice.organization)
  invoices: Invoice[];

  @OneToMany(() => Payment, payment => payment.organization)
  payments: Payment[];

  // Virtual properties
  get isActive(): boolean {
    return this.status === OrganizationStatus.ACTIVE;
  }

  get isTrial(): boolean {
    return this.status === OrganizationStatus.TRIAL;
  }

  get displayName(): string {
    return this.name;
  }

  /**
   * Get organization setting by key
   */
  getSetting<T = unknown>(key: string, defaultValue?: T): T {
    return (this.settings[key] as T) ?? defaultValue;
  }

  /**
   * Set organization setting
   */
  setSetting(key: string, value: unknown): void {
    this.settings = {
      ...this.settings,
      [key]: value,
    };
  }

  /**
   * Remove organization setting
   */
  removeSetting(key: string): void {
    const { [key]: removed, ...rest } = this.settings;
    this.settings = rest;
  }

  /**
   * Check if organization has a specific setting
   */
  hasSetting(key: string): boolean {
    return key in this.settings;
  }
}
