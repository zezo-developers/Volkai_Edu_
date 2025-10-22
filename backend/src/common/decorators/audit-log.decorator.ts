import { SetMetadata } from '@nestjs/common';

export interface AuditLogOptions {
  action: string;
  resource: string;
  sensitiveFields?: string[];
  includeRequest?: boolean;
  includeResponse?: boolean;
  level?: 'info' | 'warn' | 'error';
}

export const AUDIT_LOG_KEY = 'auditLog';

/**
 * Decorator for automatic audit logging
 */
export const AuditLog = (options: AuditLogOptions) => SetMetadata(AUDIT_LOG_KEY, options);

/**
 * Predefined audit log configurations
 */
export const AuditActions = {
  // User actions
  USER_LOGIN: { action: 'user.login', resource: 'authentication' },
  USER_LOGOUT: { action: 'user.logout', resource: 'authentication' },
  USER_REGISTER: { action: 'user.register', resource: 'user', sensitiveFields: ['password'] },
  USER_UPDATE: { action: 'user.update', resource: 'user', sensitiveFields: ['password', 'ssn'] },
  USER_DELETE: { action: 'user.delete', resource: 'user' },
  PASSWORD_RESET: { action: 'user.password_reset', resource: 'authentication' },

  // Course actions
  COURSE_CREATE: { action: 'course.create', resource: 'course' },
  COURSE_UPDATE: { action: 'course.update', resource: 'course' },
  COURSE_DELETE: { action: 'course.delete', resource: 'course' },
  COURSE_ENROLL: { action: 'course.enroll', resource: 'enrollment' },
  COURSE_COMPLETE: { action: 'course.complete', resource: 'enrollment' },

  // Organization actions
  ORG_CREATE: { action: 'organization.create', resource: 'organization' },
  ORG_UPDATE: { action: 'organization.update', resource: 'organization' },
  ORG_DELETE: { action: 'organization.delete', resource: 'organization' },
  ORG_INVITE: { action: 'organization.invite', resource: 'invitation' },

  // Admin actions
  ADMIN_ACCESS: { action: 'admin.access', resource: 'administration', level: 'warn' as const },
  ADMIN_CONFIG: { action: 'admin.config_change', resource: 'configuration', level: 'warn' as const },
  ADMIN_USER_IMPERSONATE: { action: 'admin.impersonate', resource: 'user', level: 'warn' as const },

  // Security actions
  SECURITY_BREACH: { action: 'security.breach_attempt', resource: 'security', level: 'error' as const },
  SECURITY_LOGIN_FAIL: { action: 'security.login_failed', resource: 'authentication', level: 'warn' as const },
  SECURITY_SUSPICIOUS: { action: 'security.suspicious_activity', resource: 'security', level: 'warn' as const },

  // Data actions
  DATA_EXPORT: { action: 'data.export', resource: 'data', level: 'warn' as const },
  DATA_IMPORT: { action: 'data.import', resource: 'data', level: 'warn' as const },
  DATA_DELETE: { action: 'data.bulk_delete', resource: 'data', level: 'warn' as const },
};
