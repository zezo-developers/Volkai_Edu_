import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

/**
 * Roles Guard
 * Enforces role-based access control (RBAC)
 * Works in conjunction with JwtAuthGuard
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // Get required roles from decorator
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If no user is authenticated, deny access
    if (!user) {
      throw new ForbiddenException('Authentication required for this resource');
    }

    // Check if user has any of the required roles
    const hasRequiredRole = this.checkUserRoles(user, requiredRoles);
    
    if (!hasRequiredRole) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(', ')}. User role: ${user.role || 'none'}`
      );
    }

    return true;
  }

  private checkUserRoles(user: any, requiredRoles: string[]): boolean {
    if (!user || !user.role) {
      return false;
    }

    // Check direct role match
    if (requiredRoles.includes(user.role)) {
      return true;
    }

    // Check organization membership roles
    if (user.organizationRole && requiredRoles.includes(user.organizationRole)) {
      return true;
    }

    // Check if user has admin or owner role (highest privileges)
    const adminRoles = ['admin', 'owner', 'super_admin'];
    if (adminRoles.includes(user.role) && !requiredRoles.includes('super_admin_only')) {
      return true;
    }

    return false;
  }
}

/**
 * Admin Guard
 * Shorthand guard for admin-only access
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const adminRoles = ['admin', 'owner', 'super_admin'];
    if (!adminRoles.includes(user.role)) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}

/**
 * Organization Admin Guard
 * Checks if user is admin of the specific organization
 */
@Injectable()
export class OrgAdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Get organization ID from request params or body
    const orgId = request.params?.orgId || request.params?.organizationId || request.body?.organizationId;
    
    // Super admin can access any organization
    if (user.role === 'super_admin') {
      return true;
    }

    // Check if user belongs to the organization and has admin role
    if (user.organizationId !== orgId) {
      throw new ForbiddenException('Access denied: User does not belong to this organization');
    }

    const orgAdminRoles = ['admin', 'owner'];
    if (!orgAdminRoles.includes(user.organizationRole || user.role)) {
      throw new ForbiddenException('Organization admin access required');
    }

    return true;
  }
}

/**
 * Resource Owner Guard
 * Checks if user owns the specific resource or is admin
 */
@Injectable()
export class ResourceOwnerGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Super admin and admin can access any resource
    const adminRoles = ['admin', 'owner', 'super_admin'];
    if (adminRoles.includes(user.role)) {
      return true;
    }

    // Check if user ID matches the resource user ID
    const userId = request.params?.userId || request.params?.id;
    
    if (userId && userId !== user.id) {
      throw new ForbiddenException('Access denied: You can only access your own resources');
    }

    return true;
  }
}

/**
 * Self Or Admin Guard
 * Allows access if user is accessing their own data or is admin
 */
@Injectable()
export class SelfOrAdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Admin roles can access any user's data
    const adminRoles = ['admin', 'owner', 'super_admin'];
    if (adminRoles.includes(user.role)) {
      return true;
    }

    // Users can access their own data
    const targetUserId = request.params?.userId || request.params?.id;
    if (targetUserId === user.id) {
      return true;
    }

    throw new ForbiddenException('Access denied: You can only access your own data or need admin privileges');
  }
}
