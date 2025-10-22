import { SetMetadata } from '@nestjs/common';

/**
 * Permissions decorator to specify required permissions for routes
 * Used with PermissionsGuard to enforce permission-based access control
 * 
 * @param permissions - Array of required permissions
 * 
 * @example
 * @RequirePermissions('users:read', 'users:write')
 * @Get('users')
 * getUsers() { ... }
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata('permissions', permissions);
