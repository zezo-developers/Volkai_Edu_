import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsObject,
  IsArray,
  IsUUID,
  Length,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '../../../database/entities/user.entity';
import { 
  ConfigCategory, 
  ConfigType 
} from '../../../database/entities/system-config.entity';
import { 
  ReportType 
} from '../../../database/entities/report.entity';
import { 
  ExportType 
} from '../../../database/entities/data-export.entity';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'First name' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  lastName?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'User roles', type: [String], enum: UserRole })
  @IsOptional()
  @IsArray()
  @IsEnum(UserRole, { each: true })
  roles?: UserRole[];

  @ApiPropertyOptional({ description: 'User status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'User metadata', type: 'object' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateOrganizationDto {
  @ApiPropertyOptional({ description: 'Organization name' })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @ApiPropertyOptional({ description: 'Organization description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Organization website' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({ description: 'Organization industry' })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({ description: 'Organization size' })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiPropertyOptional({ description: 'Organization status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Organization settings', type: 'object' })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}

export class CreateSystemConfigDto {
  @ApiProperty({ description: 'Configuration key' })
  @IsString()
  @Length(1, 100)
  key: string;

  @ApiProperty({ description: 'Configuration name' })
  @IsString()
  @Length(1, 200)
  name: string;

  @ApiPropertyOptional({ description: 'Configuration description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ConfigCategory, description: 'Configuration category' })
  @IsEnum(ConfigCategory)
  category: ConfigCategory;

  @ApiProperty({ enum: ConfigType, description: 'Configuration type' })
  @IsEnum(ConfigType)
  type: ConfigType;

  @ApiProperty({ description: 'Configuration value' })
  value: any;

  @ApiPropertyOptional({ description: 'Default value' })
  @IsOptional()
  defaultValue?: any;

  @ApiPropertyOptional({ description: 'Whether configuration is read-only' })
  @IsOptional()
  @IsBoolean()
  isReadonly?: boolean;

  @ApiPropertyOptional({ description: 'Whether configuration is sensitive' })
  @IsOptional()
  @IsBoolean()
  isSensitive?: boolean;

  @ApiPropertyOptional({ description: 'Whether configuration requires restart' })
  @IsOptional()
  @IsBoolean()
  requiresRestart?: boolean;

  @ApiPropertyOptional({ description: 'Validation rules', type: 'object' })
  @IsOptional()
  @IsObject()
  validation?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Configuration metadata', type: 'object' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateSystemConfigDto {
  @ApiProperty({ description: 'New configuration value' })
  value: any;

  @ApiPropertyOptional({ description: 'Reason for change' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class GenerateReportDto {
  @ApiProperty({ enum: ReportType, description: 'Type of report to generate' })
  @IsEnum(ReportType)
  type: ReportType;

  @ApiPropertyOptional({ description: 'Report parameters', type: 'object' })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Report name' })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  name?: string;

  @ApiPropertyOptional({ description: 'Report description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Organization ID for scoped reports' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}

export class CreateDataExportDto {
  @ApiProperty({ enum: ExportType, description: 'Type of data to export' })
  @IsEnum(ExportType)
  type: ExportType;

  @ApiPropertyOptional({ description: 'Export filters', type: 'object' })
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Export name' })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  name?: string;

  @ApiPropertyOptional({ description: 'Export description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Organization ID for scoped exports' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Export format' })
  @IsOptional()
  @IsString()
  format?: string;

  @ApiPropertyOptional({ description: 'Export reason' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ModerateContentDto {
  @ApiProperty({ description: 'Content type being moderated' })
  @IsString()
  contentType: string;

  @ApiProperty({ 
    description: 'Moderation action',
    enum: ['approve', 'reject', 'flag']
  })
  @IsEnum(['approve', 'reject', 'flag'])
  action: 'approve' | 'reject' | 'flag';

  @ApiPropertyOptional({ description: 'Reason for moderation action' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  reason?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkUserActionDto {
  @ApiProperty({ description: 'User IDs to perform action on', type: [String] })
  @IsArray()
  @IsUUID(undefined, { each: true })
  userIds: string[];

  @ApiProperty({ 
    description: 'Action to perform',
    enum: ['activate', 'deactivate', 'delete', 'update_role', 'send_notification']
  })
  @IsEnum(['activate', 'deactivate', 'delete', 'update_role', 'send_notification'])
  action: string;

  @ApiPropertyOptional({ description: 'Action parameters', type: 'object' })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Reason for bulk action' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class SystemMaintenanceDto {
  @ApiPropertyOptional({ description: 'Maintenance message to display' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  message?: string;

  @ApiPropertyOptional({ description: 'Estimated maintenance duration in minutes' })
  @IsOptional()
  estimatedDuration?: number;

  @ApiPropertyOptional({ description: 'Scheduled maintenance start time' })
  @IsOptional()
  scheduledStart?: Date;

  @ApiPropertyOptional({ description: 'Whether to notify users' })
  @IsOptional()
  @IsBoolean()
  notifyUsers?: boolean;
}

export class SystemBackupDto {
  @ApiProperty({ description: 'Backup name' })
  @IsString()
  @Length(1, 200)
  name: string;

  @ApiPropertyOptional({ description: 'Backup description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Include user data' })
  @IsOptional()
  @IsBoolean()
  includeUserData?: boolean;

  @ApiPropertyOptional({ description: 'Include system configurations' })
  @IsOptional()
  @IsBoolean()
  includeConfigs?: boolean;

  @ApiPropertyOptional({ description: 'Include analytics data' })
  @IsOptional()
  @IsBoolean()
  includeAnalytics?: boolean;

  @ApiPropertyOptional({ description: 'Backup encryption password' })
  @IsOptional()
  @IsString()
  encryptionPassword?: string;
}

export class FeatureFlagDto {
  @ApiProperty({ description: 'Feature flag key' })
  @IsString()
  @Length(1, 100)
  key: string;

  @ApiProperty({ description: 'Feature flag name' })
  @IsString()
  @Length(1, 200)
  name: string;

  @ApiPropertyOptional({ description: 'Feature description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Whether feature is enabled' })
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional({ description: 'Target user percentage (0-100)' })
  @IsOptional()
  targetPercentage?: number;

  @ApiPropertyOptional({ description: 'Target user roles', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetRoles?: string[];

  @ApiPropertyOptional({ description: 'Target organizations', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  targetOrganizations?: string[];

  @ApiPropertyOptional({ description: 'Feature metadata', type: 'object' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class SystemAlertDto {
  @ApiProperty({ 
    description: 'Alert type',
    enum: ['info', 'warning', 'error', 'critical']
  })
  @IsEnum(['info', 'warning', 'error', 'critical'])
  type: 'info' | 'warning' | 'error' | 'critical';

  @ApiProperty({ description: 'Alert title' })
  @IsString()
  @Length(1, 200)
  title: string;

  @ApiProperty({ description: 'Alert message' })
  @IsString()
  @Length(1, 1000)
  message: string;

  @ApiPropertyOptional({ description: 'Alert category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Whether alert should be broadcast to all users' })
  @IsOptional()
  @IsBoolean()
  broadcast?: boolean;

  @ApiPropertyOptional({ description: 'Target user roles for alert', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetRoles?: string[];

  @ApiPropertyOptional({ description: 'Alert expiration time' })
  @IsOptional()
  expiresAt?: Date;

  @ApiPropertyOptional({ description: 'Alert metadata', type: 'object' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class DataRetentionPolicyDto {
  @ApiProperty({ description: 'Policy name' })
  @IsString()
  @Length(1, 200)
  name: string;

  @ApiProperty({ description: 'Data type this policy applies to' })
  @IsString()
  dataType: string;

  @ApiProperty({ description: 'Retention period in days' })
  retentionDays: number;

  @ApiPropertyOptional({ description: 'Whether to archive data before deletion' })
  @IsOptional()
  @IsBoolean()
  archiveBeforeDelete?: boolean;

  @ApiPropertyOptional({ description: 'Archive location' })
  @IsOptional()
  @IsString()
  archiveLocation?: string;

  @ApiPropertyOptional({ description: 'Policy description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Whether policy is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Policy metadata', type: 'object' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class GDPRRequestDto {
  @ApiProperty({ description: 'User ID for GDPR request' })
  @IsUUID()
  userId: string;

  @ApiProperty({ 
    description: 'GDPR request type',
    enum: ['access', 'rectification', 'erasure', 'portability', 'restriction']
  })
  @IsEnum(['access', 'rectification', 'erasure', 'portability', 'restriction'])
  requestType: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction';

  @ApiPropertyOptional({ description: 'Request reason' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Specific data types requested', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dataTypes?: string[];

  @ApiPropertyOptional({ description: 'Request metadata', type: 'object' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class ComplianceAuditDto {
  @ApiProperty({ description: 'Audit name' })
  @IsString()
  @Length(1, 200)
  name: string;

  @ApiProperty({ 
    description: 'Compliance framework',
    enum: ['GDPR', 'CCPA', 'SOX', 'HIPAA', 'SOC2', 'ISO27001']
  })
  @IsEnum(['GDPR', 'CCPA', 'SOX', 'HIPAA', 'SOC2', 'ISO27001'])
  framework: string;

  @ApiPropertyOptional({ description: 'Audit scope' })
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiPropertyOptional({ description: 'Audit start date' })
  @IsOptional()
  startDate?: Date;

  @ApiPropertyOptional({ description: 'Audit end date' })
  @IsOptional()
  endDate?: Date;

  @ApiPropertyOptional({ description: 'Auditor information', type: 'object' })
  @IsOptional()
  @IsObject()
  auditor?: {
    name: string;
    organization: string;
    email: string;
    certification?: string;
  };

  @ApiPropertyOptional({ description: 'Audit metadata', type: 'object' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
