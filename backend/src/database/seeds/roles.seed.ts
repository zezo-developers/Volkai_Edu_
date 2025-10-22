import { DataSource } from 'typeorm';
import { Role } from '@database/entities/role.entity';
import { Permission } from '@database/entities/permission.entity';

/**
 * Seed default system roles
 * Creates system-wide roles with appropriate permissions
 */
export async function seedRoles(dataSource: DataSource): Promise<void> {
  const roleRepository = dataSource.getRepository(Role);
  const permissionRepository = dataSource.getRepository(Permission);

  // Define system roles with their permissions
  const roleDefinitions = [
    {
      name: 'system_admin',
      description: 'System administrator with full access',
      isSystem: true,
      permissions: ['admin:manage'], // System admins get all permissions via wildcard
    },
    {
      name: 'organization_owner',
      description: 'Organization owner with full organizational access',
      isSystem: true,
      permissions: [
        'organization:manage',
        'users:manage',
        'billing:manage',
        'courses:read',
        'courses:write',
        'courses:delete',
        'courses:publish',
        'jobs:read',
        'jobs:write',
        'jobs:delete',
        'jobs:publish',
        'applications:manage',
        'interviews:manage',
        'analytics:read',
        'files:manage',
        'webhooks:manage',
      ],
    },
    {
      name: 'organization_admin',
      description: 'Organization administrator with management access',
      isSystem: true,
      permissions: [
        'organization:read',
        'users:manage',
        'courses:read',
        'courses:write',
        'courses:delete',
        'courses:publish',
        'jobs:read',
        'jobs:write',
        'jobs:delete',
        'jobs:publish',
        'applications:manage',
        'interviews:manage',
        'analytics:read',
        'files:manage',
      ],
    },
    {
      name: 'manager',
      description: 'Manager with content and team management access',
      isSystem: true,
      permissions: [
        'organization:read',
        'users:read',
        'courses:read',
        'courses:write',
        'courses:publish',
        'jobs:read',
        'jobs:write',
        'jobs:publish',
        'applications:read',
        'applications:write',
        'interviews:conduct',
        'analytics:team',
        'files:read',
        'files:write',
      ],
    },
    {
      name: 'hr_specialist',
      description: 'HR specialist with recruitment and user management access',
      isSystem: true,
      permissions: [
        'organization:read',
        'users:read',
        'users:write',
        'jobs:read',
        'jobs:write',
        'jobs:publish',
        'applications:manage',
        'interviews:manage',
        'resumes:read',
        'analytics:hr',
        'files:read',
        'files:write',
      ],
    },
    {
      name: 'interviewer',
      description: 'Interviewer with interview and assessment access',
      isSystem: true,
      permissions: [
        'organization:read',
        'users:read',
        'jobs:read',
        'applications:read',
        'interviews:conduct',
        'assessments:read',
        'assessments:grade',
        'resumes:read',
        'analytics:interview',
        'files:read',
      ],
    },
    {
      name: 'learner',
      description: 'Learner with course enrollment and job application access',
      isSystem: true,
      permissions: [
        'profile:read',
        'profile:update',
        'courses:read',
        'courses:enroll',
        'assessments:take',
        'jobs:read',
        'jobs:apply',
        'resumes:read',
        'resumes:write',
        'resumes:share',
        'files:read',
        'files:write',
        'notifications:read',
      ],
    },
    {
      name: 'instructor',
      description: 'Instructor with course creation and student management access',
      isSystem: true,
      permissions: [
        'organization:read',
        'users:read',
        'courses:read',
        'courses:write',
        'courses:publish',
        'assessments:read',
        'assessments:write',
        'assessments:grade',
        'analytics:read',
        'files:read',
        'files:write',
      ],
    },
    {
      name: 'content_creator',
      description: 'Content creator with course development access',
      isSystem: true,
      permissions: [
        'organization:read',
        'courses:read',
        'courses:write',
        'assessments:read',
        'assessments:write',
        'files:read',
        'files:write',
        'files:manage',
      ],
    },
    {
      name: 'viewer',
      description: 'Read-only access to organization content',
      isSystem: true,
      permissions: [
        'organization:read',
        'users:read',
        'courses:read',
        'jobs:read',
        'analytics:read',
        'files:read',
      ],
    },
  ];

  // Create roles
  for (const roleData of roleDefinitions) {
    const existingRole = await roleRepository.findOne({
      where: { name: roleData.name, isSystem: true },
    });

    if (!existingRole) {
      // Get permission entities
      const permissionEntities = await permissionRepository.find({
        where: roleData.permissions.map(name => ({ name })),
      });

      // Create role
      const role = roleRepository.create({
        name: roleData.name,
        description: roleData.description,
        isSystem: roleData.isSystem,
        permissions: roleData.permissions,
        permissionEntities,
      });

      await roleRepository.save(role);
      console.log(`✅ Created system role: ${roleData.name} with ${roleData.permissions.length} permissions`);
    } else {
      // Update existing role permissions
      const permissionEntities = await permissionRepository.find({
        where: roleData.permissions.map(name => ({ name })),
      });

      existingRole.permissions = roleData.permissions;
      existingRole.permissionEntities = permissionEntities;
      existingRole.description = roleData.description;

      await roleRepository.save(existingRole);
      console.log(`🔄 Updated system role: ${roleData.name} with ${roleData.permissions.length} permissions`);
    }
  }

  console.log('✅ System roles seeding completed');
}
