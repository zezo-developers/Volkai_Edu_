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
import { User } from './user.entity';
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
  @Column({ name: 'organization_id', nullable: true })
  organizationId?: string;

  @ApiProperty({ description: 'User who created the report' })
  @Column({ name: 'created_by' })
  createdBy: string;

  @ApiProperty({ description: 'Report parameters and filters' })
  @Column({ type: 'jsonb', default: {} })
  parameters: {
    // Date range
    dateFrom?: Date;
    dateTo?: Date;
    
    // Filters
    userIds?: string[];
    organizationIds?: string[];
    courseIds?: string[];
    jobIds?: string[];
    
    // Grouping
    groupBy?: string[];
    
    // Metrics to include
    metrics?: string[];
    
    // Comparison settings
    compareWith?: {
      dateFrom: Date;
      dateTo: Date;
    };
    
    // Aggregation settings
    aggregation?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    
    // Custom filters
    customFilters?: Record<string, any>;
    
    // Export settings
    includeCharts?: boolean;
    includeRawData?: boolean;
    includeSummary?: boolean;
    
    // Visualization settings
    chartTypes?: string[];
    colorScheme?: string;
    
    // Privacy settings
    anonymizeData?: boolean;
    excludePersonalInfo?: boolean;
  };

  @ApiProperty({ description: 'Report configuration and settings' })
  @Column({ type: 'jsonb', default: {} })
  config: {
    // Scheduling
    isScheduled?: boolean;
    schedule?: {
      frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
      dayOfWeek?: number;
      dayOfMonth?: number;
      time?: string; // HH:mm format
      timezone?: string;
    };
    
    // Distribution
    recipients?: string[];
    emailSubject?: string;
    emailBody?: string;
    
    // Retention
    retentionDays?: number;
    autoDelete?: boolean;
    
    // Access control
    isPublic?: boolean;
    allowedRoles?: string[];
    allowedUsers?: string[];
    
    // Customization
    template?: string;
    branding?: {
      logo?: string;
      colors?: Record<string, string>;
      fonts?: Record<string, string>;
    };
    
    // Performance
    cacheResults?: boolean;
    cacheDuration?: number; // minutes
    
    // Alerts
    alertThresholds?: Record<string, number>;
    alertRecipients?: string[];
  };

  @ApiProperty({ description: 'Report generation metadata' })
  @Column({ type: 'jsonb', default: {} })
  metadata: {
    // Generation info
    generationStarted?: Date;
    generationCompleted?: Date;
    generationDuration?: number; // milliseconds
    
    // Data info
    recordCount?: number;
    dataSize?: number; // bytes
    
    // File info
    fileName?: string;
    fileSize?: number; // bytes
    filePath?: string;
    downloadUrl?: string;
    
    // Error info
    errorMessage?: string;
    errorCode?: string;
    stackTrace?: string;
    
    // Performance metrics
    queryTime?: number;
    renderTime?: number;
    
    // Version info
    reportVersion?: string;
    templateVersion?: string;
    
    // Usage tracking
    downloadCount?: number;
    lastDownloaded?: Date;
    viewCount?: number;
    lastViewed?: Date;
    
    // Sharing info
    shareCount?: number;
    sharedWith?: string[];
    
    // Custom metadata
    tags?: string[];
    customFields?: Record<string, any>;
  };

  @ApiProperty({ description: 'Report data and results' })
  @Column({ type: 'jsonb', nullable: true })
  data?: {
    // Summary statistics
    summary?: Record<string, any>;
    
    // Main data sets
    datasets?: Array<{
      name: string;
      data: any[];
      metadata?: Record<string, any>;
    }>;
    
    // Charts and visualizations
    charts?: Array<{
      type: string;
      title: string;
      data: any;
      config?: Record<string, any>;
    }>;
    
    // Key insights
    insights?: Array<{
      type: 'positive' | 'negative' | 'neutral' | 'warning';
      title: string;
      description: string;
      value?: number;
      change?: number;
      changeType?: 'increase' | 'decrease';
    }>;
    
    // Recommendations
    recommendations?: Array<{
      priority: 'high' | 'medium' | 'low';
      title: string;
      description: string;
      actionItems?: string[];
    }>;
    
    // Comparisons
    comparisons?: Record<string, {
      current: any;
      previous: any;
      change: number;
      changePercent: number;
    }>;
    
    // Raw data (if requested)
    rawData?: any[];
  };

  @ApiProperty({ description: 'Report expiration date' })
  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'organization_id' })
  organization?: Organization;

  // Virtual properties
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

  // Methods
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

    this.data.datasets.push({
      name,
      data,
      metadata,
    });
  }

  addChart(type: string, title: string, data: any, config?: Record<string, any>): void {
    if (!this.data) this.data = {};
    if (!this.data.charts) this.data.charts = [];

    this.data.charts.push({
      type,
      title,
      data,
      config,
    });
  }

  canBeAccessedBy(userId: string, userRoles: string[]): boolean {
    // Creator can always access
    if (this.createdBy === userId) return true;

    // Public reports can be accessed by anyone
    if (this.config.isPublic) return true;

    // Check allowed users
    if (this.config.allowedUsers?.includes(userId)) return true;

    // Check allowed roles
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

    // Set time if specified
    if (schedule.time) {
      const [hours, minutes] = schedule.time.split(':').map(Number);
      nextRun.setHours(hours, minutes, 0, 0);
    }

    return nextRun;
  }

  // Static factory methods
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
        schedule: {
          frequency,
          time: '09:00',
        },
        recipients,
        retentionDays: 30,
        autoDelete: true,
      },
      metadata: {},
    };
  }
}
