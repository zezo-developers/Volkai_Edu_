import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '@database/entities/audit-log.entity';

/**
 * Audit log entry interface
 */
export interface AuditLogEntry {
  actorId?: string;
  organizationId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Audit Service
 * Handles comprehensive audit logging for security and compliance
 * Tracks all user actions and system changes
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Create audit log entry
   */
  async log(entry: AuditLogEntry): Promise<AuditLog> {
    try {
      const auditLog = this.auditLogRepository.create(entry);
      const savedLog = await this.auditLogRepository.save(auditLog);

      this.logger.debug(`Audit log created: ${entry.action} on ${entry.resourceType}`, {
        auditLogId: savedLog.id,
        actorId: entry.actorId,
        organizationId: entry.organizationId,
      });

      return savedLog;
    } catch (error) {
      this.logger.error('Failed to create audit log:', error);
      // Don't throw error to avoid breaking the main operation
      return null;
    }
  }

  /**
   * Log user authentication events
   */
  async logAuth(
    action: 'login' | 'logout' | 'register' | 'password_reset' | 'email_verification',
    userId?: string,
    metadata?: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.log({
      actorId: userId,
      action: `auth.${action}`,
      resourceType: 'user',
      resourceId: userId,
      metadata,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log user management events
   */
  async logUserAction(
    action: 'create' | 'update' | 'delete' | 'activate' | 'deactivate',
    actorId: string,
    targetUserId: string,
    organizationId?: string,
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.log({
      actorId,
      organizationId,
      action: `user.${action}`,
      resourceType: 'user',
      resourceId: targetUserId,
      oldValues,
      newValues,
      metadata,
    });
  }

  /**
   * Log organization management events
   */
  async logOrganizationAction(
    action: 'create' | 'update' | 'delete' | 'settings_update',
    actorId: string,
    organizationId: string,
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.log({
      actorId,
      organizationId,
      action: `organization.${action}`,
      resourceType: 'organization',
      resourceId: organizationId,
      oldValues,
      newValues,
      metadata,
    });
  }

  /**
   * Log membership management events
   */
  async logMembershipAction(
    action: 'invite' | 'join' | 'update' | 'remove',
    actorId: string,
    targetUserId: string,
    organizationId: string,
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.log({
      actorId,
      organizationId,
      action: `membership.${action}`,
      resourceType: 'membership',
      resourceId: `${organizationId}-${targetUserId}`,
      oldValues,
      newValues,
      metadata,
    });
  }

  /**
   * Log course management events
   */
  async logCourseAction(
    action: 'create' | 'update' | 'delete' | 'publish' | 'unpublish',
    actorId: string,
    courseId: string,
    organizationId?: string,
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.log({
      actorId,
      organizationId,
      action: `course.${action}`,
      resourceType: 'course',
      resourceId: courseId,
      oldValues,
      newValues,
      metadata,
    });
  }

  /**
   * Log enrollment events
   */
  async logEnrollmentAction(
    action: 'enroll' | 'unenroll' | 'complete' | 'progress_update',
    actorId: string,
    courseId: string,
    organizationId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.log({
      actorId,
      organizationId,
      action: `enrollment.${action}`,
      resourceType: 'enrollment',
      resourceId: `${actorId}-${courseId}`,
      metadata,
    });
  }

  /**
   * Log assessment events
   */
  async logAssessmentAction(
    action: 'start' | 'submit' | 'grade' | 'complete',
    actorId: string,
    assessmentId: string,
    organizationId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.log({
      actorId,
      organizationId,
      action: `assessment.${action}`,
      resourceType: 'assessment',
      resourceId: assessmentId,
      metadata,
    });
  }

  /**
   * Log job management events
   */
  async logJobAction(
    action: 'create' | 'update' | 'delete' | 'publish' | 'unpublish',
    actorId: string,
    jobId: string,
    organizationId?: string,
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.log({
      actorId,
      organizationId,
      action: `job.${action}`,
      resourceType: 'job',
      resourceId: jobId,
      oldValues,
      newValues,
      metadata,
    });
  }

  /**
   * Log application events
   */
  async logApplicationAction(
    action: 'apply' | 'update' | 'advance' | 'reject' | 'hire',
    actorId: string,
    applicationId: string,
    organizationId?: string,
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.log({
      actorId,
      organizationId,
      action: `application.${action}`,
      resourceType: 'application',
      resourceId: applicationId,
      oldValues,
      newValues,
      metadata,
    });
  }

  /**
   * Log interview events
   */
  async logInterviewAction(
    action: 'schedule' | 'start' | 'end' | 'cancel' | 'reschedule',
    actorId: string,
    interviewId: string,
    organizationId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.log({
      actorId,
      organizationId,
      action: `interview.${action}`,
      resourceType: 'interview',
      resourceId: interviewId,
      metadata,
    });
  }

  /**
   * Log file operations
   */
  async logFileAction(
    action: 'upload' | 'download' | 'delete' | 'share',
    actorId: string,
    fileId: string,
    organizationId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.log({
      actorId,
      organizationId,
      action: `file.${action}`,
      resourceType: 'file',
      resourceId: fileId,
      metadata,
    });
  }

  /**
   * Log billing events
   */
  async logBillingAction(
    action: 'subscribe' | 'upgrade' | 'downgrade' | 'cancel' | 'payment' | 'invoice',
    actorId: string,
    organizationId: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.log({
      actorId,
      organizationId,
      action: `billing.${action}`,
      resourceType: 'billing',
      resourceId: organizationId,
      metadata,
    });
  }

  /**
   * Get audit logs with filtering
   */
  async getAuditLogs(
    filters: {
      actorId?: string;
      organizationId?: string;
      action?: string;
      resourceType?: string;
      resourceId?: string;
      dateFrom?: Date;
      dateTo?: Date;
      page?: number;
      limit?: number;
    },
  ): Promise<{
    logs: AuditLog[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      actorId,
      organizationId,
      action,
      resourceType,
      resourceId,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50,
    } = filters;

    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.actor', 'actor')
      .leftJoinAndSelect('audit.organization', 'organization');

    // Apply filters
    if (actorId) {
      queryBuilder.andWhere('audit.actorId = :actorId', { actorId });
    }

    if (organizationId) {
      queryBuilder.andWhere('audit.organizationId = :organizationId', { organizationId });
    }

    if (action) {
      queryBuilder.andWhere('audit.action LIKE :action', { action: `%${action}%` });
    }

    if (resourceType) {
      queryBuilder.andWhere('audit.resourceType = :resourceType', { resourceType });
    }

    if (resourceId) {
      queryBuilder.andWhere('audit.resourceId = :resourceId', { resourceId });
    }

    if (dateFrom) {
      queryBuilder.andWhere('audit.createdAt >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      queryBuilder.andWhere('audit.createdAt <= :dateTo', { dateTo });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Get paginated results
    const offset = (page - 1) * limit;
    const logs = await queryBuilder
      .orderBy('audit.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany();

    return {
      logs,
      total,
      page,
      limit,
    };
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(
    organizationId?: string,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<{
    totalLogs: number;
    actionCounts: Record<string, number>;
    resourceCounts: Record<string, number>;
    topActors: Array<{ actorId: string; count: number; actorName?: string }>;
  }> {
    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('audit')
      .leftJoin('audit.actor', 'actor');

    if (organizationId) {
      queryBuilder.andWhere('audit.organizationId = :organizationId', { organizationId });
    }

    if (dateFrom) {
      queryBuilder.andWhere('audit.createdAt >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      queryBuilder.andWhere('audit.createdAt <= :dateTo', { dateTo });
    }

    // Get total count
    const totalLogs = await queryBuilder.getCount();

    // Get action counts
    const actionResults = await queryBuilder
      .select('audit.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit.action')
      .orderBy('count', 'DESC')
      .getRawMany();

    const actionCounts = actionResults.reduce((acc, row) => {
      acc[row.action] = parseInt(row.count, 10);
      return acc;
    }, {});

    // Get resource type counts
    const resourceResults = await queryBuilder
      .select('audit.resourceType', 'resourceType')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit.resourceType')
      .orderBy('count', 'DESC')
      .getRawMany();

    const resourceCounts = resourceResults.reduce((acc, row) => {
      acc[row.resourceType] = parseInt(row.count, 10);
      return acc;
    }, {});

    // Get top actors
    const actorResults = await queryBuilder
      .select('audit.actorId', 'actorId')
      .addSelect('COUNT(*)', 'count')
      .addSelect('actor.firstName', 'firstName')
      .addSelect('actor.lastName', 'lastName')
      .where('audit.actorId IS NOT NULL')
      .groupBy('audit.actorId, actor.firstName, actor.lastName')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    const topActors = actorResults.map(row => ({
      actorId: row.actorId,
      count: parseInt(row.count, 10),
      actorName: row.firstName && row.lastName ? `${row.firstName} ${row.lastName}` : undefined,
    }));

    return {
      totalLogs,
      actionCounts,
      resourceCounts,
      topActors,
    };
  }
}
