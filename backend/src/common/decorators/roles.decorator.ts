import { SetMetadata } from '@nestjs/common';

/**
 * Roles decorator
 * Specifies which roles are required to access an endpoint
 */
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

/**
 * Public decorator
 * Marks an endpoint as publicly accessible (no authentication required)
 */
export const Public = () => SetMetadata('isPublic', true);

/**
 * Admin Only decorator
 * Shorthand for requiring admin role
 */
export const AdminOnly = () => Roles('admin', 'owner', 'super_admin');

/**
 * Super Admin Only decorator
 * Requires super admin role specifically
 */
export const SuperAdminOnly = () => Roles('super_admin');

/**
 * Organization Admin decorator
 * Requires admin role within an organization
 */
export const OrgAdmin = () => Roles('admin', 'owner');

/**
 * HR Role decorator
 * Requires HR role or higher
 */
export const HRRole = () => Roles('hr', 'admin', 'owner', 'super_admin');

/**
 * Interviewer Role decorator
 * Requires interviewer role or higher
 */
export const InterviewerRole = () => Roles('interviewer', 'hr', 'admin', 'owner', 'super_admin');

/**
 * Manager Role decorator
 * Requires manager role or higher
 */
export const ManagerRole = () => Roles('manager', 'admin', 'owner', 'super_admin');

/**
 * Authenticated decorator
 * Requires any authenticated user (any role)
 */
export const Authenticated = () => SetMetadata('authenticated', true);
