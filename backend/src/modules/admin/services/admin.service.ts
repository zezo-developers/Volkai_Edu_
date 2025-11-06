import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SystemConfig, ConfigCategory, ConfigType } from '../../../database/entities/system-config.entity';
import { Report, ReportType, ReportStatus } from '../../../database/entities/report.entity';
import { DataExport, ExportType, ExportStatus } from '../../../database/entities/data-export.entity';
import { User, UserRole, UserStatus } from '../../../database/entities/user.entity';
import { Organization } from '../../../database/entities/organization.entity';
import { AuditLog } from '../../../database/entities/audit-log.entity';
import { AnalyticsService } from './analytics.service';

export interface SystemOverview {
  system: {
    version: string;
    environment: string;
    uptime: number;
    lastRestart: Date;
    maintenanceMode: boolean;
  };
  
  statistics: {
    totalUsers: number;
    activeUsers: number;
    totalOrganizations: number;
    totalCourses: number;
    totalRevenue: number;
    systemLoad: number;
  };
  
  health: {
    database: 'healthy' | 'warning' | 'critical';
    redis: 'healthy' | 'warning' | 'critical';
    storage: 'healthy' | 'warning' | 'critical';
    email: 'healthy' | 'warning' | 'critical';
    overall: 'healthy' | 'warning' | 'critical';
  };
  
  alerts: Array<{
    id: string;
    type: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    timestamp: Date;
    resolved: boolean;
  }>;
}

export interface UserManagementFilters {
  search?: string;
  role?: UserRole;
  status?: string;
  organizationId?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  lastLoginAfter?: Date;
  lastLoginBefore?: Date;
}

export interface OrganizationManagementFilters {
  search?: string;
  status?: string;
  size?: string;
  industry?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private systemStartTime = new Date();

  constructor(
    private dataSource: DataSource,
    private eventEmitter: EventEmitter2,
    private analyticsService: AnalyticsService,
    @InjectRepository(SystemConfig)
    private systemConfigRepository: Repository<SystemConfig>,
    @InjectRepository(Report)
    private reportRepository: Repository<Report>,
    @InjectRepository(DataExport)
    private dataExportRepository: Repository<DataExport>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  // System Overview
  async getSystemOverview(): Promise<SystemOverview> {
    const [
      totalUsers,
      activeUsers,
      totalOrganizations,
      totalCourses,
      totalRevenue,
      databaseHealth,
      recentAlerts,
    ] = await Promise.all([
      this.userRepository.count(),
      this.getActiveUsersCount(),
      this.organizationRepository.count(),
      this.getCoursesCount(),
      this.getTotalRevenue(),
      this.checkDatabaseHealth(),
      this.getRecentAlerts(),
    ]);

    const maintenanceMode = await this.getConfigValue('app.maintenance_mode', false);
    const version = await this.getConfigValue('app.version', '1.0.0');
    const environment = await this.getConfigValue('app.environment', 'development');

    return {
      system: {
        version,
        environment,
        uptime: Date.now() - this.systemStartTime.getTime(),
        lastRestart: this.systemStartTime,
        maintenanceMode,
      },
      statistics: {
        totalUsers,
        activeUsers,
        totalOrganizations,
        totalCourses,
        totalRevenue,
        systemLoad: await this.getSystemLoad(),
      },
      health: {
        database: databaseHealth,
        redis: await this.checkRedisHealth(),
        storage: await this.checkStorageHealth(),
        email: await this.checkEmailHealth(),
        overall: this.calculateOverallHealth([
          databaseHealth,
          await this.checkRedisHealth(),
          await this.checkStorageHealth(),
          await this.checkEmailHealth(),
        ]),
      },
      alerts: recentAlerts,
    };
  }

  // User Management
  async getUsers(
    filters: UserManagementFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{
    users: User[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.memberships', 'membership')
      .leftJoinAndSelect('membership.organization', 'organization');

    // Apply filters
    if (filters.search) {
      query.andWhere(
        '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    if (filters.role) {
      query.andWhere(':role = ANY(user.roles)', { role: filters.role });
    }

    if (filters.status) {
      query.andWhere('user.status = :status', { status: filters.status });
    }

    if (filters.organizationId) {
      query.andWhere('membership.orgId = :organizationId', { organizationId: filters.organizationId });
    }

    if (filters.createdAfter) {
      query.andWhere('user.createdAt >= :createdAfter', { createdAfter: filters.createdAfter });
    }

    if (filters.createdBefore) {
      query.andWhere('user.createdAt <= :createdBefore', { createdBefore: filters.createdBefore });
    }

    if (filters.lastLoginAfter) {
      query.andWhere('user.lastLoginAt >= :lastLoginAfter', { lastLoginAfter: filters.lastLoginAfter });
    }

    if (filters.lastLoginBefore) {
      query.andWhere('user.lastLoginAt <= :lastLoginBefore', { lastLoginBefore: filters.lastLoginBefore });
    }

    // Get total count
    const total = await query.getCount();

    // Apply pagination
    const users = await query
      .orderBy('user.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['organizationMemberships', 'organizationMemberships.organization'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUser(id: string, updates: Partial<User>, adminId: string): Promise<User> {
    const user = await this.getUserById(id);
    console.log('user: ', user)
    
    Object.assign(user, updates);

    console.log('after asigning : ', user)
    const updatedUser = await this.userRepository.save(user);

    // Log the action
    await this.createAuditLog({
      action: 'user_updated',
      resourceType: 'user',
      resourceId: id,
      userId: adminId,
      details: { updates },
    });

    this.eventEmitter.emit('admin.user.updated', { user: updatedUser, adminId });

    return updatedUser;
  }

  async deactivateUser(id: string, adminId: string, reason?: string): Promise<void> {
    const user = await this.getUserById(id);
    
    user.status = UserStatus.INACTIVE;
    await this.userRepository.save(user);

    await this.createAuditLog({
      action: 'user_deactivated',
      resourceType: 'user',
      resourceId: id,
      userId: adminId,
      details: { reason },
    });

    this.eventEmitter.emit('admin.user.deactivated', { user, adminId, reason });
  }

  async reactivateUser(id: string, adminId: string): Promise<void> {
    const user = await this.getUserById(id);
    
    user.status = UserStatus.ACTIVE;
    await this.userRepository.save(user);

    await this.createAuditLog({
      action: 'user_reactivated',
      resourceType: 'user',
      resourceId: id,
      userId: adminId,
    });

    this.eventEmitter.emit('admin.user.reactivated', { user, adminId });
  }

  // Organization Management
  async getOrganizations(
    filters: OrganizationManagementFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{
    organizations: Organization[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const query = this.organizationRepository
      .createQueryBuilder('org')
      .leftJoinAndSelect('org.memberships', 'membership')
      .leftJoinAndSelect('org.creator', 'creator');

    // Apply filters
    if (filters.search) {
      query.andWhere('(org.name ILIKE :search OR org.domain ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    if (filters.status) {
      query.andWhere('org.status = :status', { status: filters.status });
    }

    if (filters.size) {
      query.andWhere('org.size = :size', { size: filters.size });
    }

    if (filters.industry) {
      query.andWhere('org.industry = :industry', { industry: filters.industry });
    }

    if (filters.createdAfter) {
      query.andWhere('org.createdAt >= :createdAfter', { createdAfter: filters.createdAfter });
    }

    if (filters.createdBefore) {
      query.andWhere('org.createdAt <= :createdBefore', { createdBefore: filters.createdBefore });
    }

    const total = await query.getCount();

    const organizations = await query
      .orderBy('org.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      organizations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // System Configuration
  async getSystemConfigs(category?: ConfigCategory): Promise<SystemConfig[]> {
    const query = this.systemConfigRepository.createQueryBuilder('config');

    if (category) {
      query.where('config.category = :category', { category });
    }

    return query
      .orderBy('config.category', 'ASC')
      .addOrderBy('config.key', 'ASC')
      .getMany();
  }

  async getSystemConfig(key: string): Promise<SystemConfig> {
    const config = await this.systemConfigRepository.findOne({ where: { key } });
    
    if (!config) {
      throw new NotFoundException(`Configuration '${key}' not found`);
    }

    return config;
  }

  async updateSystemConfig(
    key: string,
    value: any,
    adminId: string
  ): Promise<SystemConfig> {
    const config = await this.getSystemConfig(key);
    
    if (config.isReadonly) {
      throw new ForbiddenException('Configuration is read-only');
    }

    const oldValue = config.getParsedValue();
    config.setValue(value, adminId);

    // Validate the new value
    const validation = config.validate();
    if (!validation.valid) {
      throw new Error(`Invalid configuration value: ${validation.errors.join(', ')}`);
    }

    const updatedConfig = await this.systemConfigRepository.save(config);

    await this.createAuditLog({
      action: 'config_updated',
      resourceType: 'system_config',
      resourceId: config.id,
      userId: adminId,
      details: {
        key,
        oldValue,
        newValue: value,
      },
    });

    this.eventEmitter.emit('admin.config.updated', {
      config: updatedConfig,
      adminId,
      requiresRestart: config.requiresRestart,
    });

    return updatedConfig;
  }

  async createSystemConfig(
    configData: Partial<SystemConfig>,
    adminId: string
  ): Promise<SystemConfig> {
    const config = this.systemConfigRepository.create(configData);
    config.updatedBy = adminId;

    const savedConfig = await this.systemConfigRepository.save(config);

    await this.createAuditLog({
      action: 'config_created',
      resourceType: 'system_config',
      resourceId: savedConfig.id,
      userId: adminId,
      details: { key: configData.key, value: configData.value },
    });

    return savedConfig;
  }

  // Report Management
  async getReports(
    type?: ReportType,
    status?: ReportStatus,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    reports: Report[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const query = this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.creator', 'creator')
      .leftJoinAndSelect('report.organization', 'organization');

    if (type) {
      query.andWhere('report.reportType = :type', { type });
    }

    if (status) {
      query.andWhere('report.status = :status', { status });
    }

    const total = await query.getCount();

    const reports = await query
      .orderBy('report.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      reports,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async generateReport(
    reportType: ReportType,
    parameters: Record<string, any>,
    adminId: string
  ): Promise<Report> {
    const report = this.reportRepository.create({
      name: `${reportType} Report - ${new Date().toISOString()}`,
      reportType,
      createdBy: adminId,
      parameters,
      status: ReportStatus.PENDING,
    });

    const savedReport = await this.reportRepository.save(report);

    // Queue report generation
    this.eventEmitter.emit('admin.report.generate', { report: savedReport });

    return savedReport;
  }

  // Data Export Management
  async getDataExports(
    type?: ExportType,
    status?: ExportStatus,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    exports: DataExport[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const query = this.dataExportRepository
      .createQueryBuilder('export')
      .leftJoinAndSelect('export.requester', 'requester')
      .leftJoinAndSelect('export.organization', 'organization');

    if (type) {
      query.andWhere('export.exportType = :type', { type });
    }

    if (status) {
      query.andWhere('export.status = :status', { status });
    }

    const total = await query.getCount();

    const exports = await query
      .orderBy('export.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      exports,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createDataExport(
    exportType: ExportType,
    filters: Record<string, any>,
    adminId: string,
    organizationId?: string
  ): Promise<DataExport> {
    const dataExport = this.dataExportRepository.create({
      name: `${exportType} Export - ${new Date().toISOString()}`,
      exportType,
      requestedBy: adminId,
      organizationId,
      filters,
      status: ExportStatus.PENDING,
    });

    const savedExport = await this.dataExportRepository.save(dataExport);

    // Queue export processing
    this.eventEmitter.emit('admin.export.process', { export: savedExport });

    return savedExport;
  }

  // Content Moderation
  async getFlaggedContent(
    contentType?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    content: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    // This would query for flagged content across different content types
    // Implementation depends on how content flagging is implemented
    return {
      content: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
    };
  }

  async moderateContent(
    contentId: string,
    contentType: string,
    action: 'approve' | 'reject' | 'flag',
    adminId: string,
    reason?: string
  ): Promise<void> {
    await this.createAuditLog({
      action: `content_${action}`,
      resourceType: contentType,
      resourceId: contentId,
      userId: adminId,
      details: { reason },
    });

    this.eventEmitter.emit('admin.content.moderated', {
      contentId,
      contentType,
      action,
      adminId,
      reason,
    });
  }

  // Audit Logs
  async getAuditLogs(
    userId?: string,
    action?: string,
    resourceType?: string,
    dateFrom?: Date,
    dateTo?: Date,
    page: number = 1,
    limit: number = 50
  ): Promise<{
    logs: AuditLog[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const query = this.auditLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.actor', 'actor');

    if (userId) {
      query.andWhere('log.actorId = :userId', { userId });
    }

    if (action) {
      query.andWhere('log.action = :action', { action });
    }

    if (resourceType) {
      query.andWhere('log.resourceType = :resourceType', { resourceType });
    }

    if (dateFrom) {
      query.andWhere('log.createdAt >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      query.andWhere('log.createdAt <= :dateTo', { dateTo });
    }

    const total = await query.getCount();

    const logs = await query
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Maintenance and Cleanup
  async enableMaintenanceMode(adminId: string, message?: string): Promise<void> {
    await this.updateSystemConfig('app.maintenance_mode', true, adminId);
    
    if (message) {
      await this.updateSystemConfig('app.maintenance_message', message, adminId);
    }

    this.eventEmitter.emit('admin.maintenance.enabled', { adminId, message });
  }

  async disableMaintenanceMode(adminId: string): Promise<void> {
    await this.updateSystemConfig('app.maintenance_mode', false, adminId);
    
    this.eventEmitter.emit('admin.maintenance.disabled', { adminId });
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async performDailyMaintenance(): Promise<void> {
    this.logger.log('Starting daily maintenance tasks...');

    try {
      // Clean up expired reports
      await this.cleanupExpiredReports();
      
      // Clean up expired data exports
      await this.cleanupExpiredDataExports();
      
      // Archive old audit logs
      await this.archiveOldAuditLogs();
      
      // Update system statistics
      await this.updateSystemStatistics();
      
      this.logger.log('Daily maintenance completed successfully');
    } catch (error) {
      this.logger.error('Daily maintenance failed', error);
    }
  }

  // Private helper methods
  private async getConfigValue(key: string, defaultValue: any): Promise<any> {
    try {
      const config = await this.getSystemConfig(key);
      return config.getParsedValue();
    } catch {
      return defaultValue;
    }
  }

  private async getActiveUsersCount(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return this.userRepository
      .createQueryBuilder('user')
      .where('user.lastLoginAt >= :date', { date: thirtyDaysAgo })
      .getCount();
  }

  private async getCoursesCount(): Promise<number> {
    // This would count courses from the courses table
    return 0; // Placeholder
  }

  private async getTotalRevenue(): Promise<number> {
    // This would sum up all successful payments
    return 0; // Placeholder
  }

  private async checkDatabaseHealth(): Promise<'healthy' | 'warning' | 'critical'> {
    try {
      await this.dataSource.query('SELECT 1');
      return 'healthy';
    } catch {
      return 'critical';
    }
  }

  private async checkRedisHealth(): Promise<'healthy' | 'warning' | 'critical'> {
    // Implementation would check Redis connectivity
    return 'healthy';
  }

  private async checkStorageHealth(): Promise<'healthy' | 'warning' | 'critical'> {
    // Implementation would check S3/storage connectivity
    return 'healthy';
  }

  private async checkEmailHealth(): Promise<'healthy' | 'warning' | 'critical'> {
    // Implementation would check email service connectivity
    return 'healthy';
  }

  private calculateOverallHealth(
    healths: Array<'healthy' | 'warning' | 'critical'>
  ): 'healthy' | 'warning' | 'critical' {
    if (healths.includes('critical')) return 'critical';
    if (healths.includes('warning')) return 'warning';
    return 'healthy';
  }

  private async getSystemLoad(): Promise<number> {
    // Implementation would get actual system load
    return Math.random() * 100; // Placeholder
  }

  private async getRecentAlerts(): Promise<Array<{
    id: string;
    type: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    timestamp: Date;
    resolved: boolean;
  }>> {
    // Implementation would fetch recent system alerts
    return []; // Placeholder
  }

  private async createAuditLog(logData: {
    action: string;
    resourceType: string;
    resourceId: string;
    userId: string;
    details?: any;
  }): Promise<void> {
    const auditLog = this.auditLogRepository.create({
      ...logData,
      ipAddress: '127.0.0.1', // This would come from request context
      userAgent: 'Admin Panel', // This would come from request context
    });

    await this.auditLogRepository.save(auditLog);
  }

  private async cleanupExpiredReports(): Promise<void> {
    const expiredReports = await this.reportRepository
      .createQueryBuilder('report')
      .where('report.expiresAt < :now', { now: new Date() })
      .andWhere('report.status = :status', { status: ReportStatus.COMPLETED })
      .getMany();

    for (const report of expiredReports) {
      if (report.shouldAutoDelete()) {
        await this.reportRepository.remove(report);
      } else {
        report.status = ReportStatus.EXPIRED;
        await this.reportRepository.save(report);
      }
    }

    this.logger.log(`Cleaned up ${expiredReports.length} expired reports`);
  }

  private async cleanupExpiredDataExports(): Promise<void> {
    const expiredExports = await this.dataExportRepository
      .createQueryBuilder('export')
      .where('export.expiresAt < :now', { now: new Date() })
      .andWhere('export.status = :status', { status: ExportStatus.COMPLETED })
      .getMany();

    for (const dataExport of expiredExports) {
      if (dataExport.shouldAutoDelete()) {
        await this.dataExportRepository.remove(dataExport);
      } else {
        dataExport.status = ExportStatus.EXPIRED;
        await this.dataExportRepository.save(dataExport);
      }
    }

    this.logger.log(`Cleaned up ${expiredExports.length} expired data exports`);
  }

  private async archiveOldAuditLogs(): Promise<void> {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const result = await this.auditLogRepository
      .createQueryBuilder()
      .delete()
      .where('createdAt < :date', { date: oneYearAgo })
      .execute();

    this.logger.log(`Archived ${result.affected} old audit logs`);
  }

  private async updateSystemStatistics(): Promise<void> {
    // Implementation would update cached system statistics
    this.logger.log('Updated system statistics');
  }
}
