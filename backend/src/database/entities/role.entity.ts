import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
  Index,
} from 'typeorm';
import { Organization } from './organization.entity';
import { Permission } from './permission.entity';

/**
 * Role entity for role-based access control (RBAC)
 * Supports both system-wide and organization-specific roles
 */
@Entity('roles')
@Index(['name', 'organizationId'], { unique: true })
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'uuid', name: 'organizationId', nullable: true })
  organizationId?: string;

  @Column({ type: 'boolean', name: 'isSystem', default: false })
  isSystem: boolean;

  @Column({ type: 'text', array: true, name: 'permissions', default: '{}' })
  permissions: string[];

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Organization, { eager: false })
  @JoinColumn({ name: 'organizationId' })
  organization?: Organization;

  @ManyToMany(() => Permission, permission => permission.roles, { eager: true })
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'roleId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permissionId', referencedColumnName: 'id' },
  })
  permissionEntities: Permission[];

  // Virtual properties
  get isSystemRole(): boolean {
    return this.isSystem && !this.organizationId;
  }

  get isOrganizationRole(): boolean {
    return !this.isSystem && !!this.organizationId;
  }

  get displayName(): string {
    return this.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Check if role has a specific permission
   */
  hasPermission(permission: string): boolean {
    return this.permissions.includes(permission) ||
           this.permissionEntities.some(p => p.name === permission);
  }

  /**
   * Add permission to role
   */
  addPermission(permission: string): void {
    if (!this.hasPermission(permission)) {
      this.permissions = [...this.permissions, permission];
    }
  }

  /**
   * Remove permission from role
   */
  removePermission(permission: string): void {
    this.permissions = this.permissions.filter(p => p !== permission);
  }

  /**
   * Get all permissions (from both arrays and entities)
   */
  getAllPermissions(): string[] {
    const entityPermissions = this.permissionEntities.map(p => p.name);
    return [...new Set([...this.permissions, ...entityPermissions])];
  }

  /**
   * Check if role can be deleted
   */
  canBeDeleted(): boolean {
    // System roles cannot be deleted
    if (this.isSystem) {
      return false;
    }

    // Add additional business logic here
    return true;
  }
}
