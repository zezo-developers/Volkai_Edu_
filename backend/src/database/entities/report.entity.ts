import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../entities/user.entity';
import { Organization } from './organization.entity';

export enum ReportType {
  USER_ANALYTICS = 'user_analytics',
  LEARNING_ANALYTICS = 'learning_analytics',
  ASSESSMENT_ANALYTICS = 'assessment_analytics',
  INTERVIEW_ANALYTICS = 'interview_analytics',
  RESUME_ANALYTICS = 'resume_analytics',
  JOB_ANALYTICS = 'job_analytics',
  BILLING_ANALYTICS = 'billing_analytics',
  SYSTEM_PERFORMANCE = 'system_performance',
  SECURITY_AUDIT = 'security_audit',
  COMPLIANCE_REPORT = 'compliance_report',
  CUSTOM_REPORT = 'custom_report',
}

export enum ReportStatus {
  PENDING = 'pending',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

export enum ReportFormat {
  PDF = 'pdf',
  CSV = 'csv',
  XLSX = 'xlsx',
  JSON = 'json',
  HTML = 'html',
}

@Entity('reports')
@Index(['organizationId', 'reportType'])
@Index(['createdBy', 'status'])
@Index(['status', 'createdAt'])
@Index(['reportType', 'createdAt'])
export class Report {
  @ApiProperty({ description: 'Report ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Report name' })
  @Column({ length: 200 })
  name: string;

  @ApiProperty({ description: 'Report description' })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ enum: ReportType, description: 'Type of report' })
  @Column({
    type: 'enum',
    enum: ReportType,
  })
  reportType: ReportType;

  @ApiProperty({ enum: ReportStatus, description: 'Report generation status' })
  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.PENDING,
  })
  status: ReportStatus;

  @ApiProperty({ enum: ReportFormat, description: 'Report output format' })
  @Column({
    type: 'enum',
    enum: ReportFormat,
    default: ReportFormat.PDF,
  })
  format: ReportFormat;

  @ApiProperty({ description: 'Organization ID (nullable for system reports)' })
  @Column({ name: 'organizationId', nullable: true })
  organizationId?: string;

  @ApiProperty({ description: 'User who created the report' })
  @Column({ name: 'createdBy' })
  createdBy: string;

  @ApiProperty({ description: 'Report parameters and filters' })
  @Column({ type: 'jsonb', default: {} })
  parameters: {
    dateFrom?: Date;
    dateTo?: Date;
    userIds?: string[];
    organizationIds?: string[];
    courseIds?: string[];
    jobIds?: string[];
    groupBy?: string[];
    metrics?: string[];
    compareWith?: {
      dateFrom: Date;
      dateTo: Date;
    };
    aggregation?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    customFilters?: Record<string, any>;
    includeCharts?: boolean;
    includeRawData?: boolean;
    includeSummary?: boolean;
    chartTypes?: string[];
    colorScheme?: string;
    anonymizeData?: boolean;
    excludePersonalInfo?: boolean;
  };

  @ApiProperty({ description: 'Report configuration and settings' })
  @Column({ type: 'jsonb', default: {} })
  config: {
    isScheduled?: boolean;
    schedule?: {
      frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
      dayOfWeek?: number;
      dayOfMonth?: number;
      time?: string;
      timezone?: string;
    };
    recipients?: string[];
    emailSubject?: string;
    emailBody?: string;
    retentionDays?: number;
    autoDelete?: boolean;
    isPublic?: boolean;
    allowedRoles?: string[];
    allowedUsers?: string[];
    template?: string;
    branding?: {
      logo?: string;
      colors?: Record<string, string>;
      fonts?: Record<string, string>;
    };
    cacheResults?: boolean;
    cacheDuration?: number;
    alertThresholds?: Record<string, number>;
    alertRecipients?: string[];
  };

  @ApiProperty({ description: 'Report generation metadata' })
  @Column({ type: 'jsonb', default: {} })
  metadata: {
    generationStarted?: Date;
    generationCompleted?: Date;
    generationDuration?: number;
    recordCount?: number;
    dataSize?: number;
    fileName?: string;
    fileSize?: number;
    filePath?: string;
    downloadUrl?: string;
    errorMessage?: string;
    errorCode?: string;
    stackTrace?: string;
    queryTime?: number;
    renderTime?: number;
    reportVersion?: string;
    templateVersion?: string;
    downloadCount?: number;
    lastDownloaded?: Date;
    viewCount?: number;
    lastViewed?: Date;
    shareCount?: number;
    sharedWith?: string[];
    tags?: string[];
    customFields?: Record<string, any>;
  };

  @ApiProperty({ description: 'Report data and results' })
  @Column({ type: 'jsonb', nullable: true })
  data?: {
    summary?: Record<string, any>;
    datasets?: Array<{
      name: string;
      data: any[];
      metadata?: Record<string, any>;
    }>;
    charts?: Array<{
      type: string;
      title: string;
      data: any;
      config?: Record<string, any>;
    }>;
    insights?: Array<{
      type: 'positive' | 'negative' | 'neutral' | 'warning';
      title: string;
      description: string;
      value?: number;
      change?: number;
      changeType?: 'increase' | 'decrease';
    }>;
    recommendations?: Array<{
      priority: 'high' | 'medium' | 'low';
      title: string;
      description: string;
      actionItems?: string[];
    }>;
    comparisons?: Record<string, {
      current: any;
      previous: any;
      change: number;
      changePercent: number;
    }>;
    rawData?: any[];
  };

  @ApiProperty({ description: 'Report expiration date' })
  @Column({ name: 'expiresAt', type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'organizationId' })
  organization?: Organization;

  get isCompleted(): boolean {
    return this.status === ReportStatus.COMPLETED;
  }

  get isFailed(): boolean {
    return this.status === ReportStatus.FAILED;
  }

  get isExpired(): boolean {
    return this.expiresAt ? new Date() > this.expiresAt : false;
  }

  get isScheduled(): boolean {
    return !!this.config.isScheduled;
  }

  get downloadCount(): number {
    return this.metadata.downloadCount || 0;
  }

  get fileSize(): number {
    return this.metadata.fileSize || 0;
  }

  get generationDuration(): number {
    return this.metadata.generationDuration || 0;
  }

  get displayFileSize(): string {
    const size = this.fileSize;
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  startGeneration(): void {
    this.status = ReportStatus.GENERATING;
    this.metadata.generationStarted = new Date();
  }

  completeGeneration(filePath: string, fileSize: number): void {
    this.status = ReportStatus.COMPLETED;
    this.metadata.generationCompleted = new Date();
    this.metadata.filePath = filePath;
    this.metadata.fileSize = fileSize;
    if (this.metadata.generationStarted) {
      this.metadata.generationDuration =
        this.metadata.generationCompleted.getTime() - this.metadata.generationStarted.getTime();
    }
  }

  failGeneration(error: string, errorCode?: string): void {
    this.status = ReportStatus.FAILED;
    this.metadata.errorMessage = error;
    this.metadata.errorCode = errorCode;
  }

  markAsDownloaded(): void {
    this.metadata.downloadCount = (this.metadata.downloadCount || 0) + 1;
    this.metadata.lastDownloaded = new Date();
  }

  markAsViewed(): void {
    this.metadata.viewCount = (this.metadata.viewCount || 0) + 1;
    this.metadata.lastViewed = new Date();
  }

  setExpiration(days: number): void {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + days);
    this.expiresAt = expirationDate;
  }

  addInsight(
    type: 'positive' | 'negative' | 'neutral' | 'warning',
    title: string,
    description: string,
    value?: number,
    change?: number
  ): void {
    if (!this.data) this.data = {};
    if (!this.data.insights) this.data.insights = [];

    this.data.insights.push({
      type,
      title,
      description,
      value,
      change,
      changeType: change && change > 0 ? 'increase' : 'decrease',
    });
  }

  addRecommendation(
    priority: 'high' | 'medium' | 'low',
    title: string,
    description: string,
    actionItems?: string[]
  ): void {
    if (!this.data) this.data = {};
    if (!this.data.recommendations) this.data.recommendations = [];

    this.data.recommendations.push({
      priority,
      title,
      description,
      actionItems,
    });
  }

  addDataset(name: string, data: any[], metadata?: Record<string, any>): void {
    if (!this.data) this.data = {};
    if (!this.data.datasets) this.data.datasets = [];

    this.data.datasets.push({ name, data, metadata });
  }

  addChart(type: string, title: string, data: any, config?: Record<string, any>): void {
    if (!this.data) this.data = {};
    if (!this.data.charts) this.data.charts = [];

    this.data.charts.push({ type, title, data, config });
  }

  canBeAccessedBy(userId: string, userRoles: string[]): boolean {
    if (this.createdBy === userId) return true;
    if (this.config.isPublic) return true;
    if (this.config.allowedUsers?.includes(userId)) return true;
    if (this.config.allowedRoles?.some(role => userRoles.includes(role))) return true;
    return false;
  }

  shouldAutoDelete(): boolean {
    return this.config.autoDelete && this.isExpired;
  }

  getNextScheduledRun(): Date | null {
    if (!this.isScheduled || !this.config.schedule) return null;

    const now = new Date();
    const schedule = this.config.schedule;
    let nextRun = new Date();

    switch (schedule.frequency) {
      case 'daily':
        nextRun.setDate(now.getDate() + 1);
        break;
      case 'weekly':
        const daysUntilNext = (schedule.dayOfWeek || 0) - now.getDay();
        nextRun.setDate(now.getDate() + (daysUntilNext <= 0 ? daysUntilNext + 7 : daysUntilNext));
        break;
      case 'monthly':
        nextRun.setMonth(now.getMonth() + 1);
        nextRun.setDate(schedule.dayOfMonth || 1);
        break;
      case 'quarterly':
        nextRun.setMonth(now.getMonth() + 3);
        nextRun.setDate(schedule.dayOfMonth || 1);
        break;
    }

    if (schedule.time) {
      const [hours, minutes] = schedule.time.split(':').map(Number);
      nextRun.setHours(hours, minutes, 0, 0);
    }

    return nextRun;
  }

  static createUserAnalyticsReport(
    name: string,
    createdBy: string,
    organizationId?: string,
    parameters?: Record<string, any>
  ): Partial<Report> {
    return {
      name,
      reportType: ReportType.USER_ANALYTICS,
      createdBy,
      organizationId,
      format: ReportFormat.PDF,
      status: ReportStatus.PENDING,
      parameters: parameters || {},
      config: {},
      metadata: {},
    };
  }

  static createSystemPerformanceReport(
    name: string,
    createdBy: string,
    parameters?: Record<string, any>
  ): Partial<Report> {
    return {
      name,
      reportType: ReportType.SYSTEM_PERFORMANCE,
      createdBy,
      format: ReportFormat.PDF,
      status: ReportStatus.PENDING,
      parameters: parameters || {},
      config: {},
      metadata: {},
    };
  }

  static createScheduledReport(
    name: string,
    reportType: ReportType,
    createdBy: string,
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly',
    recipients: string[]
  ): Partial<Report> {
    return {
      name,
      reportType,
      createdBy,
      format: ReportFormat.PDF,
      status: ReportStatus.PENDING,
      parameters: {},
      config: {
        isScheduled: true,
        schedule: { frequency, time: '09:00' },
        recipients,
        retentionDays: 30,
        autoDelete: true,
      },
      metadata: {},
    };
  }
}
