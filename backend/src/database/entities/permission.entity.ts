import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToMany,
  Index,
} from 'typeorm';
import { Role } from './role.entity';

/**
 * Permission entity for granular access control
 * Defines specific actions that can be performed on resources
 */
@Entity('permissions')
@Index(['name'], { unique: true })
@Index(['resource', 'action'])
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  resource: string;

  @Column({ type: 'varchar', length: 50 })
  action: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  // Relations
  @ManyToMany(() => Role, role => role.permissionEntities)
  roles: Role[];

  // Virtual properties
  get displayName(): string {
    return this.name.replace(/[_:]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  get resourceAction(): string {
    return `${this.resource}:${this.action}`;
  }

  /**
   * Check if permission matches a pattern
   */
  matches(pattern: string): boolean {
    // Exact match
    if (this.name === pattern) {
      return true;
    }

    // Wildcard match (e.g., "users:*" matches "users:read", "users:write")
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      return this.name.startsWith(prefix);
    }

    return false;
  }

  /**
   * Create permission name from resource and action
   */
  static createName(resource: string, action: string): string {
    return `${resource}:${action}`;
  }

  /**
   * Parse permission name into resource and action
   */
  static parseName(name: string): { resource: string; action: string } {
    const [resource, action] = name.split(':');
    return { resource: resource || '', action: action || '' };
  }

  /**
   * Validate permission name format
   */
  static isValidName(name: string): boolean {
    const pattern = /^[a-z_]+:[a-z_*]+$/;
    return pattern.test(name);
  }
}
