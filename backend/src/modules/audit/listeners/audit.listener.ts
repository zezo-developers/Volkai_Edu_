import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AuditService } from '../audit.service';

/**
 * Audit Event Listener
 * Listens to application events and creates audit log entries
 * Provides comprehensive audit trail for security and compliance
 */
@Injectable()
export class AuditListener {
  private readonly logger = new Logger(AuditListener.name);

  constructor(private readonly auditService: AuditService) {}

  // Authentication Events
  @OnEvent('user.registered')
  async handleUserRegistered(payload: {
    userId: string;
    email: string;
    organizationId?: string;
  }): Promise<void> {
    try {
      await this.auditService.logAuth('register', payload.userId, {
        email: payload.email,
        organizationId: payload.organizationId,
      });
    } catch (error) {
      this.logger.error('Failed to log user registration event:', error);
    }
  }

  @OnEvent('user.login')
  async handleUserLogin(payload: {
    userId: string;
    email: string;
    organizationId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      await this.auditService.logAuth(
        'login',
        payload.userId,
        {
          email: payload.email,
          organizationId: payload.organizationId,
        },
        payload.ipAddress,
        payload.userAgent,
      );
    } catch (error) {
      this.logger.error('Failed to log user login event:', error);
    }
  }

  @OnEvent('user.logout')
  async handleUserLogout(payload: {
    userId: string;
    email: string;
    organizationId?: string;
  }): Promise<void> {
    try {
      await this.auditService.logAuth('logout', payload.userId, {
        email: payload.email,
        organizationId: payload.organizationId,
      });
    } catch (error) {
      this.logger.error('Failed to log user logout event:', error);
    }
  }

  @OnEvent('user.passwordResetRequested')
  async handlePasswordResetRequested(payload: {
    userId: string;
    email: string;
    token: string;
  }): Promise<void> {
    try {
      await this.auditService.logAuth('password_reset', payload.userId, {
        email: payload.email,
        tokenGenerated: true,
      });
    } catch (error) {
      this.logger.error('Failed to log password reset request event:', error);
    }
  }

  @OnEvent('user.passwordReset')
  async handlePasswordReset(payload: {
    userId: string;
    email: string;
  }): Promise<void> {
    try {
      await this.auditService.logAuth('password_reset', payload.userId, {
        email: payload.email,
        passwordChanged: true,
      });
    } catch (error) {
      this.logger.error('Failed to log password reset event:', error);
    }
  }

  @OnEvent('user.emailVerified')
  async handleEmailVerified(payload: {
    userId: string;
    email: string;
  }): Promise<void> {
    try {
      await this.auditService.logAuth('email_verification', payload.userId, {
        email: payload.email,
        verified: true,
      });
    } catch (error) {
      this.logger.error('Failed to log email verification event:', error);
    }
  }

  // User Management Events
  @OnEvent('user.updated')
  async handleUserUpdated(payload: {
    userId: string;
    updatedBy: string;
    organizationId?: string;
    changes: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.auditService.logUserAction(
        'update',
        payload.updatedBy,
        payload.userId,
        payload.organizationId,
        undefined, // oldValues - would need to be passed from service
        payload.changes,
        { changeCount: Object.keys(payload.changes).length },
      );
    } catch (error) {
      this.logger.error('Failed to log user update event:', error);
    }
  }

  @OnEvent('user.avatarUpdated')
  async handleUserAvatarUpdated(payload: {
    userId: string;
    avatarUrl: string;
    updatedBy: string;
    organizationId?: string;
  }): Promise<void> {
    try {
      await this.auditService.logUserAction(
        'update',
        payload.updatedBy,
        payload.userId,
        payload.organizationId,
        undefined,
        { avatarUrl: payload.avatarUrl },
        { action: 'avatar_update' },
      );
    } catch (error) {
      this.logger.error('Failed to log user avatar update event:', error);
    }
  }

  @OnEvent('user.deactivated')
  async handleUserDeactivated(payload: {
    userId: string;
    deactivatedBy: string;
    organizationId?: string;
  }): Promise<void> {
    try {
      await this.auditService.logUserAction(
        'deactivate',
        payload.deactivatedBy,
        payload.userId,
        payload.organizationId,
        undefined,
        { status: 'inactive' },
      );
    } catch (error) {
      this.logger.error('Failed to log user deactivation event:', error);
    }
  }

  @OnEvent('user.reactivated')
  async handleUserReactivated(payload: {
    userId: string;
    reactivatedBy: string;
    organizationId?: string;
  }): Promise<void> {
    try {
      await this.auditService.logUserAction(
        'activate',
        payload.reactivatedBy,
        payload.userId,
        payload.organizationId,
        undefined,
        { status: 'active' },
      );
    } catch (error) {
      this.logger.error('Failed to log user reactivation event:', error);
    }
  }

  // Organization Events
  @OnEvent('organization.created')
  async handleOrganizationCreated(payload: {
    organizationId: string;
    createdBy: string;
    name: string;
  }): Promise<void> {
    try {
      await this.auditService.logOrganizationAction(
        'create',
        payload.createdBy,
        payload.organizationId,
        undefined,
        { name: payload.name },
        { action: 'organization_creation' },
      );
    } catch (error) {
      this.logger.error('Failed to log organization creation event:', error);
    }
  }

  @OnEvent('organization.updated')
  async handleOrganizationUpdated(payload: {
    organizationId: string;
    updatedBy: string;
    changes: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.auditService.logOrganizationAction(
        'update',
        payload.updatedBy,
        payload.organizationId,
        undefined,
        payload.changes,
        { changeCount: Object.keys(payload.changes).length },
      );
    } catch (error) {
      this.logger.error('Failed to log organization update event:', error);
    }
  }

  @OnEvent('organization.deleted')
  async handleOrganizationDeleted(payload: {
    organizationId: string;
    deletedBy: string;
  }): Promise<void> {
    try {
      await this.auditService.logOrganizationAction(
        'delete',
        payload.deletedBy,
        payload.organizationId,
        undefined,
        { status: 'cancelled' },
        { action: 'soft_delete' },
      );
    } catch (error) {
      this.logger.error('Failed to log organization deletion event:', error);
    }
  }

  @OnEvent('organization.settingsUpdated')
  async handleOrganizationSettingsUpdated(payload: {
    organizationId: string;
    updatedBy: string;
    settings: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.auditService.logOrganizationAction(
        'settings_update',
        payload.updatedBy,
        payload.organizationId,
        undefined,
        payload.settings,
        { settingsCount: Object.keys(payload.settings).length },
      );
    } catch (error) {
      this.logger.error('Failed to log organization settings update event:', error);
    }
  }

  // Membership Events
  @OnEvent('member.invited')
  async handleMemberInvited(payload: {
    organizationId: string;
    email: string;
    role: string;
    invitedBy: string;
    invitationToken: string;
    existingUser: boolean;
  }): Promise<void> {
    try {
      await this.auditService.logMembershipAction(
        'invite',
        payload.invitedBy,
        payload.email, // Using email as target since user might not exist yet
        payload.organizationId,
        undefined,
        {
          email: payload.email,
          role: payload.role,
          existingUser: payload.existingUser,
        },
        { invitationToken: payload.invitationToken },
      );
    } catch (error) {
      this.logger.error('Failed to log member invitation event:', error);
    }
  }

  @OnEvent('member.updated')
  async handleMemberUpdated(payload: {
    organizationId: string;
    userId: string;
    updatedBy: string;
    changes: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.auditService.logMembershipAction(
        'update',
        payload.updatedBy,
        payload.userId,
        payload.organizationId,
        undefined,
        payload.changes,
        { changeCount: Object.keys(payload.changes).length },
      );
    } catch (error) {
      this.logger.error('Failed to log member update event:', error);
    }
  }

  @OnEvent('member.removed')
  async handleMemberRemoved(payload: {
    organizationId: string;
    userId: string;
    removedBy: string;
  }): Promise<void> {
    try {
      await this.auditService.logMembershipAction(
        'remove',
        payload.removedBy,
        payload.userId,
        payload.organizationId,
        undefined,
        { status: 'removed' },
      );
    } catch (error) {
      this.logger.error('Failed to log member removal event:', error);
    }
  }
}
