import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../entities/user.entity';
import { Organization } from './organization.entity';

/**
 * Audit log entity for tracking all system activities
 * Provides comprehensive audit trail for compliance and security
 */
@Entity('audit_logs')
@Index(['actorId'])
@Index(['organizationId'])
@Index(['resourceType', 'resourceId'])
@Index(['action'])
@Index(['createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  actorId?: string;

  @Column({ type: 'uuid', nullable: true })
  organizationId?: string;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  action: string;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  resourceType: string;

  @Column({ type: 'uuid', nullable: true })
  resourceId?: string;

  @Column({ type: 'jsonb', nullable: true })
  oldValues?: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  newValues?: Record<string, unknown>;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @Column({ type: 'inet', nullable: true })
  ipAddress?: string;

  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'actorId' })
  actor?: User;

  @ManyToOne(() => Organization, { eager: false })
  @JoinColumn({ name: 'organizationId' })
  organization?: Organization;

  // Virtual properties
  get hasChanges(): boolean {
    return !!(this.oldValues || this.newValues);
  }

  get actorName(): string {
    return this.actor ? this.actor.fullName : 'System';
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
   * Get changed fields between old and new values
   */
  getChangedFields(): string[] {
    if (!this.oldValues || !this.newValues) {
      return [];
    }

    const changedFields: string[] = [];
    const allKeys = new Set([
      ...Object.keys(this.oldValues),
      ...Object.keys(this.newValues),
    ]);

    for (const key of allKeys) {
      const oldValue = this.oldValues[key];
      const newValue = this.newValues[key];
      
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changedFields.push(key);
      }
    }

    return changedFields;
  }

  /**
   * Get summary of changes for display
   */
  getChangesSummary(): string {
    const changedFields = this.getChangedFields();
    
    if (changedFields.length === 0) {
      return 'No changes detected';
    }

    if (changedFields.length === 1) {
      return `Changed ${changedFields[0]}`;
    }

    if (changedFields.length <= 3) {
      return `Changed ${changedFields.join(', ')}`;
    }

    return `Changed ${changedFields.length} fields`;
  }
}
