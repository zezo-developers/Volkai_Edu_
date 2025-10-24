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

export enum ExportType {
  USERS = 'users',
  ORGANIZATIONS = 'organizations',
  COURSES = 'courses',
  ASSESSMENTS = 'assessments',
  INTERVIEWS = 'interviews',
  RESUMES = 'resumes',
  JOBS = 'jobs',
  APPLICATIONS = 'applications',
  PAYMENTS = 'payments',
  INVOICES = 'invoices',
  SUBSCRIPTIONS = 'subscriptions',
  ANALYTICS = 'analytics',
  AUDIT_LOGS = 'audit_logs',
  NOTIFICATIONS = 'notifications',
  SYSTEM_CONFIGS = 'system_configs',
  CUSTOM = 'custom',
}

export enum ExportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum ExportFormat {
  CSV = 'csv',
  XLSX = 'xlsx',
  JSON = 'json',
  XML = 'xml',
  PDF = 'pdf',
  ZIP = 'zip',
}

export enum ExportReason {
  DATA_MIGRATION = 'data_migration',
  BACKUP = 'backup',
  COMPLIANCE = 'compliance',
  GDPR_REQUEST = 'gdpr_request',
  ANALYTICS = 'analytics',
  INTEGRATION = 'integration',
  AUDIT = 'audit',
  CUSTOM = 'custom',
}

@Entity('data_exports')
@Index(['organizationId', 'exportType'])
@Index(['requestedBy', 'status'])
@Index(['status', 'createdAt'])
@Index(['exportType', 'createdAt'])
@Index(['expiresAt'])
export class DataExport {
  @ApiProperty({ description: 'Export ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Export name/title' })
  @Column({ length: 200 })
  name: string;

  @ApiProperty({ description: 'Export description' })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ enum: ExportType, description: 'Type of data being exported' })
  @Column({
    type: 'enum',
    enum: ExportType,
  })
  exportType: ExportType;

  @ApiProperty({ enum: ExportStatus, description: 'Export processing status' })
  @Column({
    type: 'enum',
    enum: ExportStatus,
    default: ExportStatus.PENDING,
  })
  status: ExportStatus;

  @ApiProperty({ enum: ExportFormat, description: 'Export file format' })
  @Column({
    type: 'enum',
    enum: ExportFormat,
    default: ExportFormat.CSV,
  })
  format: ExportFormat;

  @ApiProperty({ enum: ExportReason, description: 'Reason for export' })
  @Column({
    type: 'enum',
    enum: ExportReason,
    default: ExportReason.CUSTOM,
  })
  reason: ExportReason;

  @ApiProperty({ description: 'Organization ID (nullable for system exports)' })
  @Column({ name: 'organization_id', nullable: true })
  organizationId?: string;

  @ApiProperty({ description: 'User who requested the export' })
  @Column({ name: 'requested_by' })
  requestedBy: string;

  @ApiProperty({ description: 'Export filters and parameters' })
  @Column({ type: 'jsonb', default: {} })
  filters: {
    // Date range filters
    dateFrom?: Date;
    dateTo?: Date;
    createdAfter?: Date;
    createdBefore?: Date;
    updatedAfter?: Date;
    updatedBefore?: Date;
    
    // Entity filters
    entityIds?: string[];
    userIds?: string[];
    organizationIds?: string[];
    
    // Status filters
    statuses?: string[];
    
    // Type filters
    types?: string[];
    categories?: string[];
    
    // Custom field filters
    customFilters?: Record<string, any>;
    
    // Search filters
    searchQuery?: string;
    searchFields?: string[];
    
    // Relationship filters
    includeRelated?: boolean;
    relatedEntities?: string[];
    
    // Data filters
    includeDeleted?: boolean;
    includeArchived?: boolean;
    includePersonalData?: boolean;
    includeSensitiveData?: boolean;
    
    // Pagination (for large exports)
    batchSize?: number;
    maxRecords?: number;
  };

  @ApiProperty({ description: 'Export configuration and options' })
  @Column({ type: 'jsonb', default: {} })
  config: {
    // Field selection
    fields?: string[];
    excludeFields?: string[];
    
    // Data transformation
    transformations?: Array<{
      field: string;
      type: 'mask' | 'hash' | 'encrypt' | 'anonymize' | 'format';
      options?: Record<string, any>;
    }>;
    
    // File options
    compression?: boolean;
    encryption?: boolean;
    password?: string;
    
    // CSV specific options
    delimiter?: string;
    quote?: string;
    escape?: string;
    header?: boolean;
    
    // Excel specific options
    worksheetName?: string;
    includeFormulas?: boolean;
    
    // JSON specific options
    prettyPrint?: boolean;
    includeSchema?: boolean;
    
    // Privacy options
    anonymizePersonalData?: boolean;
    maskSensitiveFields?: boolean;
    excludePersonalInfo?: boolean;
    
    // Compliance options
    gdprCompliant?: boolean;
    includeConsentStatus?: boolean;
    dataRetentionInfo?: boolean;
    
    // Notification options
    notifyOnCompletion?: boolean;
    notificationEmails?: string[];
    
    // Access control
    requireApproval?: boolean;
    approvedBy?: string;
    approvalDate?: Date;
    
    // Retention
    retentionDays?: number;
    autoDelete?: boolean;
    
    // Custom options
    customOptions?: Record<string, any>;
  };

  @ApiProperty({ description: 'Export processing metadata' })
  @Column({ type: 'jsonb', default: {} })
  metadata: {
    // Processing info
    processingStarted?: Date;
    processingCompleted?: Date;
    processingDuration?: number; // milliseconds
    
    // Data info
    totalRecords?: number;
    processedRecords?: number;
    skippedRecords?: number;
    errorRecords?: number;
    
    // File info
    fileName?: string;
    fileSize?: number; // bytes
    filePath?: string;
    downloadUrl?: string;
    checksumMD5?: string;
    checksumSHA256?: string;
    
    // Progress tracking
    progress?: number; // 0-100
    currentStep?: string;
    estimatedCompletion?: Date;
    
    // Error info
    errors?: Array<{
      timestamp: Date;
      error: string;
      recordId?: string;
      context?: Record<string, any>;
    }>;
    
    // Performance metrics
    recordsPerSecond?: number;
    memoryUsage?: number;
    cpuUsage?: number;
    
    // Security info
    encryptionMethod?: string;
    accessLog?: Array<{
      timestamp: Date;
      userId: string;
      action: string;
      ipAddress?: string;
    }>;
    
    // Compliance info
    dataClassification?: string;
    privacyLevel?: 'public' | 'internal' | 'confidential' | 'restricted';
    complianceChecks?: Record<string, boolean>;
    
    // Usage tracking
    downloadCount?: number;
    lastDownloaded?: Date;
    sharedWith?: string[];
    
    // Custom metadata
    tags?: string[];
    customFields?: Record<string, any>;
  };

  @ApiProperty({ description: 'Export expiration date' })
  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @ApiProperty({ description: 'Export approval date' })
  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt?: Date;

  @ApiProperty({ description: 'User who approved the export' })
  @Column({ name: 'approved_by', nullable: true })
  approvedBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'requested_by' })
  requester: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approver?: User;

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'organization_id' })
  organization?: Organization;

  // Virtual properties
  get isCompleted(): boolean {
    return this.status === ExportStatus.COMPLETED;
  }

  get isFailed(): boolean {
    return this.status === ExportStatus.FAILED;
  }

  get isExpired(): boolean {
    return this.expiresAt ? new Date() > this.expiresAt : false;
  }

  get isProcessing(): boolean {
    return [ExportStatus.PENDING, ExportStatus.PROCESSING].includes(this.status);
  }

  get requiresApproval(): boolean {
    return !!this.config.requireApproval;
  }

  get isApproved(): boolean {
    return !!this.approvedAt;
  }

  get downloadCount(): number {
    return this.metadata.downloadCount || 0;
  }

  get fileSize(): number {
    return this.metadata.fileSize || 0;
  }

  get progress(): number {
    return this.metadata.progress || 0;
  }

  get displayFileSize(): string {
    const size = this.fileSize;
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  get estimatedTimeRemaining(): number | null {
    if (!this.metadata.processingStarted || this.progress === 0) return null;
    
    const elapsed = Date.now() - this.metadata.processingStarted.getTime();
    const rate = this.progress / elapsed;
    const remaining = (100 - this.progress) / rate;
    
    return Math.round(remaining);
  }

  // Methods
  startProcessing(): void {
    this.status = ExportStatus.PROCESSING;
    this.metadata.processingStarted = new Date();
    this.metadata.progress = 0;
  }

  updateProgress(progress: number, currentStep?: string): void {
    this.metadata.progress = Math.min(100, Math.max(0, progress));
    if (currentStep) {
      this.metadata.currentStep = currentStep;
    }
    
    // Update estimated completion
    if (progress > 0 && this.metadata.processingStarted) {
      const elapsed = Date.now() - this.metadata.processingStarted.getTime();
      const rate = progress / elapsed;
      const remaining = (100 - progress) / rate;
      this.metadata.estimatedCompletion = new Date(Date.now() + remaining);
    }
  }

  completeProcessing(filePath: string, fileSize: number, recordCount: number): void {
    this.status = ExportStatus.COMPLETED;
    this.metadata.processingCompleted = new Date();
    this.metadata.filePath = filePath;
    this.metadata.fileSize = fileSize;
    this.metadata.totalRecords = recordCount;
    this.metadata.progress = 100;
    
    if (this.metadata.processingStarted) {
      this.metadata.processingDuration = 
        this.metadata.processingCompleted.getTime() - this.metadata.processingStarted.getTime();
      
      if (this.metadata.processingDuration > 0) {
        this.metadata.recordsPerSecond = recordCount / (this.metadata.processingDuration / 1000);
      }
    }
  }

  failProcessing(error: string, context?: Record<string, any>): void {
    this.status = ExportStatus.FAILED;
    
    if (!this.metadata.errors) {
      this.metadata.errors = [];
    }
    
    this.metadata.errors.push({
      timestamp: new Date(),
      error,
      context,
    });
  }

  cancel(): void {
    this.status = ExportStatus.CANCELLED;
  }

  approve(approvedBy: string): void {
    this.approvedBy = approvedBy;
    this.approvedAt = new Date();
  }

  markAsDownloaded(userId: string, ipAddress?: string): void {
    this.metadata.downloadCount = (this.metadata.downloadCount || 0) + 1;
    this.metadata.lastDownloaded = new Date();
    
    if (!this.metadata.accessLog) {
      this.metadata.accessLog = [];
    }
    
    this.metadata.accessLog.push({
      timestamp: new Date(),
      userId,
      action: 'download',
      ipAddress,
    });
  }

  setExpiration(days: number): void {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + days);
    this.expiresAt = expirationDate;
  }

  addError(error: string, recordId?: string, context?: Record<string, any>): void {
    if (!this.metadata.errors) {
      this.metadata.errors = [];
    }
    
    this.metadata.errors.push({
      timestamp: new Date(),
      error,
      recordId,
      context,
    });
    
    this.metadata.errorRecords = (this.metadata.errorRecords || 0) + 1;
  }

  setChecksum(md5: string, sha256: string): void {
    this.metadata.checksumMD5 = md5;
    this.metadata.checksumSHA256 = sha256;
  }

  canBeAccessedBy(userId: string, userRoles: string[]): boolean {
    // Requester can always access
    if (this.requestedBy === userId) return true;
    
    // Approver can access
    if (this.approvedBy === userId) return true;
    
    // System admins can access
    if (userRoles.includes('admin')) return true;
    
    // Organization admins can access organization exports
    if (this.organizationId && userRoles.includes('org_admin')) return true;
    
    return false;
  }

  shouldAutoDelete(): boolean {
    return this.config.autoDelete && this.isExpired;
  }

  isGDPRCompliant(): boolean {
    return this.config.gdprCompliant || false;
  }

  containsPersonalData(): boolean {
    return !this.config.excludePersonalInfo;
  }

  containsSensitiveData(): boolean {
    return this.filters.includeSensitiveData || false;
  }

  getDataClassification(): string {
    return this.metadata.dataClassification || 'internal';
  }

  // Static factory methods
  static createUserDataExport(
    name: string,
    requestedBy: string,
    organizationId?: string,
    userIds?: string[]
  ): Partial<DataExport> {
    return {
      name,
      exportType: ExportType.USERS,
      format: ExportFormat.CSV,
      reason: ExportReason.CUSTOM,
      requestedBy,
      organizationId,
      status: ExportStatus.PENDING,
      filters: {
        userIds,
        includePersonalData: true,
      },
      config: {
        anonymizePersonalData: false,
        gdprCompliant: true,
        retentionDays: 30,
        autoDelete: true,
      },
      metadata: {},
    };
  }

  static createGDPRExport(
    name: string,
    requestedBy: string,
    userId: string
  ): Partial<DataExport> {
    return {
      name,
      exportType: ExportType.USERS,
      format: ExportFormat.JSON,
      reason: ExportReason.GDPR_REQUEST,
      requestedBy,
      status: ExportStatus.PENDING,
      filters: {
        userIds: [userId],
        includePersonalData: true,
        includeSensitiveData: true,
        includeDeleted: true,
      },
      config: {
        fields: ['*'], // Include all fields for GDPR
        gdprCompliant: true,
        includeConsentStatus: true,
        dataRetentionInfo: true,
        retentionDays: 90,
        requireApproval: true,
      },
      metadata: {
        dataClassification: 'confidential',
        privacyLevel: 'restricted',
      },
    };
  }

  static createSystemBackup(
    name: string,
    requestedBy: string,
    exportTypes: ExportType[]
  ): Partial<DataExport> {
    return {
      name,
      exportType: ExportType.CUSTOM,
      format: ExportFormat.ZIP,
      reason: ExportReason.BACKUP,
      requestedBy,
      status: ExportStatus.PENDING,
      filters: {
        includeDeleted: false,
        includeArchived: true,
      },
      config: {
        compression: true,
        encryption: true,
        retentionDays: 365,
        requireApproval: true,
        customOptions: {
          exportTypes,
        },
      },
      metadata: {
        dataClassification: 'confidential',
      },
    };
  }

  static createComplianceExport(
    name: string,
    requestedBy: string,
    organizationId: string,
    dateFrom: Date,
    dateTo: Date
  ): Partial<DataExport> {
    return {
      name,
      exportType: ExportType.AUDIT_LOGS,
      format: ExportFormat.XLSX,
      reason: ExportReason.COMPLIANCE,
      requestedBy,
      organizationId,
      status: ExportStatus.PENDING,
      filters: {
        dateFrom,
        dateTo,
        includeDeleted: true,
      },
      config: {
        gdprCompliant: true,
        includeConsentStatus: true,
        retentionDays: 2555, // 7 years for compliance
        requireApproval: true,
      },
      metadata: {
        dataClassification: 'restricted',
        privacyLevel: 'restricted',
      },
    };
  }
}
