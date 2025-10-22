import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsUUID,
  IsObject,
  IsEnum,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVersionDto {
  @ApiPropertyOptional({ description: 'Version title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Change log describing what changed' })
  @IsOptional()
  @IsString()
  changeLog?: string;

  @ApiPropertyOptional({ description: 'Version tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Additional version metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class PublishVersionDto {
  @ApiPropertyOptional({ description: 'Force publish even if another version is published' })
  @IsOptional()
  @IsBoolean()
  forcePublish?: boolean;

  @ApiPropertyOptional({ description: 'Publish notes' })
  @IsOptional()
  @IsString()
  publishNotes?: string;
}

export class CompareVersionsDto {
  @ApiProperty({ description: 'Base version ID for comparison' })
  @IsUUID()
  baseVersionId: string;

  @ApiProperty({ description: 'Version ID to compare against base' })
  @IsUUID()
  compareVersionId: string;
}

export class RestoreVersionDto {
  @ApiProperty({ description: 'Version ID to restore' })
  @IsUUID()
  versionId: string;

  @ApiPropertyOptional({ description: 'Publish the restored version immediately' })
  @IsOptional()
  @IsBoolean()
  publishImmediately?: boolean;
}

export class VersionResponseDto {
  @ApiProperty({ description: 'Version ID' })
  id: string;

  @ApiProperty({ description: 'Entity type' })
  entityType: string;

  @ApiProperty({ description: 'Entity ID' })
  entityId: string;

  @ApiProperty({ description: 'Version number' })
  version: number;

  @ApiProperty({ description: 'Version title' })
  title: string;

  @ApiPropertyOptional({ description: 'Change log' })
  changeLog?: string;

  @ApiProperty({ description: 'Created by user ID' })
  createdBy: string;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Whether this version is published' })
  isPublished: boolean;

  @ApiPropertyOptional({ description: 'Published date' })
  publishedAt?: Date;

  @ApiPropertyOptional({ description: 'Published by user ID' })
  publishedBy?: string;

  @ApiProperty({ description: 'Version tags', type: [String] })
  tags: string[];

  @ApiPropertyOptional({ description: 'Version metadata' })
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Version data (only for authorized users)' })
  data?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Data size in bytes' })
  dataSize?: number;

  constructor(version: any) {
    this.id = version.id;
    this.entityType = version.entityType;
    this.entityId = version.entityId;
    this.version = version.version;
    this.title = version.title;
    this.changeLog = version.changeLog;
    this.createdBy = version.createdBy;
    this.createdAt = version.createdAt;
    this.isPublished = version.isPublished;
    this.publishedAt = version.publishedAt;
    this.publishedBy = version.publishedBy;
    this.tags = version.tags || [];
    this.metadata = version.metadata;
    this.data = version.data;
    this.dataSize = version.data ? JSON.stringify(version.data).length : 0;
  }
}

export class VersionListResponseDto {
  @ApiProperty({ type: [VersionResponseDto], description: 'List of versions' })
  items: VersionResponseDto[];

  @ApiProperty({ description: 'Total number of versions' })
  total: number;

  @ApiProperty({ description: 'Entity type' })
  entityType: string;

  @ApiProperty({ description: 'Entity ID' })
  entityId: string;

  @ApiPropertyOptional({ description: 'Current published version' })
  publishedVersion?: VersionResponseDto;

  @ApiPropertyOptional({ description: 'Latest version' })
  latestVersion?: VersionResponseDto;

  constructor(data: any) {
    this.items = data.items.map((item: any) => new VersionResponseDto(item));
    this.total = data.total;
    this.entityType = data.entityType;
    this.entityId = data.entityId;
    this.publishedVersion = data.items.find((item: any) => item.isPublished)
      ? new VersionResponseDto(data.items.find((item: any) => item.isPublished))
      : undefined;
    this.latestVersion = data.items.length > 0
      ? new VersionResponseDto(data.items[0])
      : undefined;
  }
}

export class VersionDifferenceDto {
  @ApiProperty({ description: 'Field name' })
  field: string;

  @ApiProperty({ description: 'Base value' })
  baseValue: any;

  @ApiProperty({ description: 'Compare value' })
  compareValue: any;

  @ApiProperty({ description: 'Difference type' })
  type: 'added' | 'removed' | 'modified';

  constructor(field: string, data: any) {
    this.field = field;
    this.baseValue = data.base;
    this.compareValue = data.compare;
    this.type = data.type;
  }
}

export class VersionComparisonDto {
  @ApiProperty({ description: 'Base version' })
  baseVersion: VersionResponseDto;

  @ApiProperty({ description: 'Compare version' })
  compareVersion: VersionResponseDto;

  @ApiProperty({ type: [VersionDifferenceDto], description: 'Differences between versions' })
  differences: VersionDifferenceDto[];

  @ApiProperty({ description: 'Summary of changes' })
  summary: {
    totalChanges: number;
    addedFields: number;
    removedFields: number;
    modifiedFields: number;
  };

  constructor(data: any) {
    this.baseVersion = new VersionResponseDto(data.baseVersion);
    this.compareVersion = new VersionResponseDto(data.compareVersion);
    
    this.differences = Object.entries(data.differences).map(
      ([field, diffData]: [string, any]) => new VersionDifferenceDto(field, diffData)
    );

    this.summary = {
      totalChanges: this.differences.length,
      addedFields: this.differences.filter(d => d.type === 'added').length,
      removedFields: this.differences.filter(d => d.type === 'removed').length,
      modifiedFields: this.differences.filter(d => d.type === 'modified').length,
    };
  }
}

export class PublishingWorkflowDto {
  @ApiProperty({ description: 'Workflow ID' })
  id: string;

  @ApiProperty({ description: 'Entity type' })
  entityType: string;

  @ApiProperty({ description: 'Entity ID' })
  entityId: string;

  @ApiProperty({ description: 'Version ID' })
  versionId: string;

  @ApiProperty({ description: 'Workflow status' })
  status: 'pending' | 'approved' | 'rejected' | 'published';

  @ApiProperty({ description: 'Requested by user ID' })
  requestedBy: string;

  @ApiProperty({ description: 'Request date' })
  requestedAt: Date;

  @ApiPropertyOptional({ description: 'Approved/rejected by user ID' })
  reviewedBy?: string;

  @ApiPropertyOptional({ description: 'Review date' })
  reviewedAt?: Date;

  @ApiPropertyOptional({ description: 'Review notes' })
  reviewNotes?: string;

  @ApiPropertyOptional({ description: 'Scheduled publish date' })
  scheduledPublishAt?: Date;

  @ApiPropertyOptional({ description: 'Actual publish date' })
  publishedAt?: Date;

  constructor(workflow: any) {
    this.id = workflow.id;
    this.entityType = workflow.entityType;
    this.entityId = workflow.entityId;
    this.versionId = workflow.versionId;
    this.status = workflow.status;
    this.requestedBy = workflow.requestedBy;
    this.requestedAt = workflow.requestedAt;
    this.reviewedBy = workflow.reviewedBy;
    this.reviewedAt = workflow.reviewedAt;
    this.reviewNotes = workflow.reviewNotes;
    this.scheduledPublishAt = workflow.scheduledPublishAt;
    this.publishedAt = workflow.publishedAt;
  }
}

export class CreateWorkflowDto {
  @ApiProperty({ description: 'Version ID to publish' })
  @IsUUID()
  versionId: string;

  @ApiPropertyOptional({ description: 'Scheduled publish date' })
  @IsOptional()
  @IsString()
  scheduledPublishAt?: string;

  @ApiPropertyOptional({ description: 'Request notes' })
  @IsOptional()
  @IsString()
  requestNotes?: string;
}

export class ReviewWorkflowDto {
  @ApiProperty({ description: 'Review decision' })
  @IsEnum(['approve', 'reject'])
  decision: 'approve' | 'reject';

  @ApiPropertyOptional({ description: 'Review notes' })
  @IsOptional()
  @IsString()
  reviewNotes?: string;
}

export class VersioningStatsDto {
  @ApiProperty({ description: 'Total versions created' })
  totalVersions: number;

  @ApiProperty({ description: 'Published versions' })
  publishedVersions: number;

  @ApiProperty({ description: 'Draft versions' })
  draftVersions: number;

  @ApiProperty({ description: 'Versions created this month' })
  versionsThisMonth: number;

  @ApiProperty({ description: 'Most active content creators' })
  topCreators: {
    userId: string;
    userName: string;
    versionCount: number;
  }[];

  @ApiProperty({ description: 'Version activity over time' })
  activityTrends: {
    date: string;
    versionsCreated: number;
    versionsPublished: number;
  }[];

  @ApiProperty({ description: 'Content with most versions' })
  mostVersionedContent: {
    entityType: string;
    entityId: string;
    entityTitle: string;
    versionCount: number;
  }[];

  constructor(data: any) {
    this.totalVersions = data.totalVersions;
    this.publishedVersions = data.publishedVersions;
    this.draftVersions = data.draftVersions;
    this.versionsThisMonth = data.versionsThisMonth;
    this.topCreators = data.topCreators;
    this.activityTrends = data.activityTrends;
    this.mostVersionedContent = data.mostVersionedContent;
  }
}
