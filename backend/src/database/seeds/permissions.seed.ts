import { DataSource } from 'typeorm';
import { Permission } from '@database/entities/permission.entity';

/**
 * Seed default permissions
 * Creates all system permissions required for RBAC
 */
export async function seedPermissions(dataSource: DataSource): Promise<void> {
  const permissionRepository = dataSource.getRepository(Permission);

  // Define all system permissions
  const permissions = [
    // User permissions
    { name: 'users:read', resource: 'users', action: 'read', description: 'View user profiles and information' },
    { name: 'users:write', resource: 'users', action: 'write', description: 'Create and update user profiles' },
    { name: 'users:delete', resource: 'users', action: 'delete', description: 'Deactivate or remove users' },
    { name: 'users:manage', resource: 'users', action: 'manage', description: 'Full user management access' },

    // Profile permissions
    { name: 'profile:read', resource: 'profile', action: 'read', description: 'View own profile' },
    { name: 'profile:update', resource: 'profile', action: 'update', description: 'Update own profile' },

    // Organization permissions
    { name: 'organization:read', resource: 'organization', action: 'read', description: 'View organization information' },
    { name: 'organization:manage', resource: 'organization', action: 'manage', description: 'Manage organization settings and members' },

    // Course permissions
    { name: 'courses:read', resource: 'courses', action: 'read', description: 'View courses and content' },
    { name: 'courses:write', resource: 'courses', action: 'write', description: 'Create and update courses' },
    { name: 'courses:delete', resource: 'courses', action: 'delete', description: 'Delete courses' },
    { name: 'courses:publish', resource: 'courses', action: 'publish', description: 'Publish and unpublish courses' },
    { name: 'courses:enroll', resource: 'courses', action: 'enroll', description: 'Enroll in courses' },

    // Assessment permissions
    { name: 'assessments:read', resource: 'assessments', action: 'read', description: 'View assessments' },
    { name: 'assessments:write', resource: 'assessments', action: 'write', description: 'Create and update assessments' },
    { name: 'assessments:delete', resource: 'assessments', action: 'delete', description: 'Delete assessments' },
    { name: 'assessments:take', resource: 'assessments', action: 'take', description: 'Take assessments and quizzes' },
    { name: 'assessments:grade', resource: 'assessments', action: 'grade', description: 'Grade assessments' },

    // Job permissions
    { name: 'jobs:read', resource: 'jobs', action: 'read', description: 'View job postings' },
    { name: 'jobs:write', resource: 'jobs', action: 'write', description: 'Create and update job postings' },
    { name: 'jobs:delete', resource: 'jobs', action: 'delete', description: 'Delete job postings' },
    { name: 'jobs:publish', resource: 'jobs', action: 'publish', description: 'Publish and unpublish jobs' },
    { name: 'jobs:apply', resource: 'jobs', action: 'apply', description: 'Apply to job postings' },

    // Application permissions
    { name: 'applications:read', resource: 'applications', action: 'read', description: 'View job applications' },
    { name: 'applications:write', resource: 'applications', action: 'write', description: 'Update application status' },
    { name: 'applications:manage', resource: 'applications', action: 'manage', description: 'Full application management' },

    // Interview permissions
    { name: 'interviews:read', resource: 'interviews', action: 'read', description: 'View interview information' },
    { name: 'interviews:write', resource: 'interviews', action: 'write', description: 'Schedule and update interviews' },
    { name: 'interviews:conduct', resource: 'interviews', action: 'conduct', description: 'Conduct interviews and provide feedback' },
    { name: 'interviews:manage', resource: 'interviews', action: 'manage', description: 'Full interview management' },

    // Resume permissions
    { name: 'resumes:read', resource: 'resumes', action: 'read', description: 'View resumes' },
    { name: 'resumes:write', resource: 'resumes', action: 'write', description: 'Create and update resumes' },
    { name: 'resumes:delete', resource: 'resumes', action: 'delete', description: 'Delete resumes' },
    { name: 'resumes:share', resource: 'resumes', action: 'share', description: 'Share resumes publicly' },

    // File permissions
    { name: 'files:read', resource: 'files', action: 'read', description: 'View and download files' },
    { name: 'files:write', resource: 'files', action: 'write', description: 'Upload and update files' },
    { name: 'files:delete', resource: 'files', action: 'delete', description: 'Delete files' },
    { name: 'files:manage', resource: 'files', action: 'manage', description: 'Full file management' },

    // Analytics permissions
    { name: 'analytics:read', resource: 'analytics', action: 'read', description: 'View analytics and reports' },
    { name: 'analytics:team', resource: 'analytics', action: 'team', description: 'View team analytics' },
    { name: 'analytics:hr', resource: 'analytics', action: 'hr', description: 'View HR analytics' },
    { name: 'analytics:interview', resource: 'analytics', action: 'interview', description: 'View interview analytics' },

    // Billing permissions
    { name: 'billing:read', resource: 'billing', action: 'read', description: 'View billing information' },
    { name: 'billing:manage', resource: 'billing', action: 'manage', description: 'Manage billing and subscriptions' },

    // Admin permissions
    { name: 'admin:read', resource: 'admin', action: 'read', description: 'View admin information' },
    { name: 'admin:manage', resource: 'admin', action: 'manage', description: 'Full administrative access' },

    // Notification permissions
    { name: 'notifications:read', resource: 'notifications', action: 'read', description: 'View notifications' },
    { name: 'notifications:manage', resource: 'notifications', action: 'manage', description: 'Manage notification settings' },

    // Webhook permissions
    { name: 'webhooks:read', resource: 'webhooks', action: 'read', description: 'View webhook configurations' },
    { name: 'webhooks:manage', resource: 'webhooks', action: 'manage', description: 'Manage webhook configurations' },
  ];

  // Insert permissions (skip if already exists)
  for (const permissionData of permissions) {
    try {
      const existingPermission = await permissionRepository.findOne({
        where: { name: permissionData.name },
      });

      if (!existingPermission) {
        const permission = permissionRepository.create(permissionData);
        await permissionRepository.save(permission);
        console.log(`✅ Created permission: ${permissionData.name}`);
      } else {
        console.log(`⏭️  Permission already exists: ${permissionData.name}`);
      }
    } catch (error) {
      console.error(`❌ Failed to create permission ${permissionData.name}:`, error.message);
      throw error;
    }
  }

  console.log('✅ Permissions seeding completed');
}
