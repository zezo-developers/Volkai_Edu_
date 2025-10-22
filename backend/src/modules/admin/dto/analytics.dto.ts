import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsUUID,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { 
  EventType, 
  EventCategory 
} from '../../../database/entities/analytics-event.entity';

export class TrackEventDto {
  @ApiProperty({ enum: EventType, description: 'Type of event to track' })
  @IsEnum(EventType)
  eventType: EventType;

  @ApiProperty({ enum: EventCategory, description: 'Event category' })
  @IsEnum(EventCategory)
  category: EventCategory;

  @ApiPropertyOptional({ description: 'User ID (optional for anonymous events)' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Session ID' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Event properties', type: 'object' })
  @IsOptional()
  @IsObject()
  properties?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Event context', type: 'object' })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}

export class PageViewDto {
  @ApiProperty({ description: 'Page URL' })
  @IsString()
  url: string;

  @ApiPropertyOptional({ description: 'Page title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Referrer URL' })
  @IsOptional()
  @IsString()
  referrer?: string;

  @ApiPropertyOptional({ description: 'Session ID' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'User ID' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'Additional page properties', type: 'object' })
  @IsOptional()
  @IsObject()
  properties?: Record<string, any>;
}

export class ConversionEventDto {
  @ApiProperty({ enum: EventType, description: 'Conversion event type' })
  @IsEnum(EventType)
  eventType: EventType;

  @ApiProperty({ description: 'User ID' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ description: 'Conversion value' })
  @IsOptional()
  value?: number;

  @ApiPropertyOptional({ description: 'Currency code' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Conversion properties', type: 'object' })
  @IsOptional()
  @IsObject()
  properties?: Record<string, any>;
}

export class CustomEventDto {
  @ApiProperty({ description: 'Custom event name' })
  @IsString()
  eventName: string;

  @ApiPropertyOptional({ description: 'User ID' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Event properties', type: 'object' })
  @IsOptional()
  @IsObject()
  properties?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Event context', type: 'object' })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}

export class AnalyticsQueryDto {
  @ApiPropertyOptional({ description: 'Organization ID filter' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Start date for analytics query' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'End date for analytics query' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ 
    description: 'Time period granularity',
    enum: ['hour', 'day', 'week', 'month', 'quarter', 'year']
  })
  @IsOptional()
  @IsEnum(['hour', 'day', 'week', 'month', 'quarter', 'year'])
  granularity?: string;

  @ApiPropertyOptional({ description: 'Metrics to include', type: [String] })
  @IsOptional()
  metrics?: string[];

  @ApiPropertyOptional({ description: 'Dimensions to group by', type: [String] })
  @IsOptional()
  dimensions?: string[];

  @ApiPropertyOptional({ description: 'Filters to apply', type: 'object' })
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;
}

export class FunnelAnalysisDto {
  @ApiProperty({ description: 'Funnel steps', type: [String] })
  steps: Array<{
    name: string;
    eventType: EventType;
    filters?: Record<string, any>;
  }>;

  @ApiPropertyOptional({ description: 'Organization ID filter' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Start date for funnel analysis' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'End date for funnel analysis' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Conversion window in days' })
  @IsOptional()
  conversionWindow?: number;
}

export class CohortAnalysisDto {
  @ApiProperty({ 
    description: 'Cohort type',
    enum: ['registration', 'first_purchase', 'first_login', 'custom']
  })
  @IsEnum(['registration', 'first_purchase', 'first_login', 'custom'])
  cohortType: string;

  @ApiPropertyOptional({ description: 'Custom cohort event type' })
  @IsOptional()
  @IsEnum(EventType)
  customEventType?: EventType;

  @ApiPropertyOptional({ 
    description: 'Analysis period',
    enum: ['daily', 'weekly', 'monthly']
  })
  @IsOptional()
  @IsEnum(['daily', 'weekly', 'monthly'])
  period?: string;

  @ApiPropertyOptional({ description: 'Number of periods to analyze' })
  @IsOptional()
  periods?: number;

  @ApiPropertyOptional({ description: 'Organization ID filter' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Start date for cohort analysis' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'End date for cohort analysis' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class RetentionAnalysisDto {
  @ApiPropertyOptional({ 
    description: 'Retention period',
    enum: ['daily', 'weekly', 'monthly']
  })
  @IsOptional()
  @IsEnum(['daily', 'weekly', 'monthly'])
  period?: string;

  @ApiPropertyOptional({ description: 'Number of periods to analyze' })
  @IsOptional()
  periods?: number;

  @ApiPropertyOptional({ description: 'Organization ID filter' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'User segment filters', type: 'object' })
  @IsOptional()
  @IsObject()
  segmentFilters?: Record<string, any>;
}

export class UserSegmentDto {
  @ApiProperty({ description: 'Segment name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Segment description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Segment criteria', type: 'object' })
  @IsObject()
  criteria: {
    // User properties
    userProperties?: Record<string, any>;
    
    // Behavioral criteria
    events?: Array<{
      eventType: EventType;
      count?: number;
      timeframe?: string;
      properties?: Record<string, any>;
    }>;
    
    // Demographic criteria
    demographics?: {
      ageRange?: [number, number];
      location?: string[];
      roles?: string[];
    };
    
    // Engagement criteria
    engagement?: {
      lastActiveWithin?: string;
      sessionCount?: number;
      totalTimeSpent?: number;
    };
    
    // Business criteria
    business?: {
      subscriptionStatus?: string[];
      totalSpent?: [number, number];
      planType?: string[];
    };
  };

  @ApiPropertyOptional({ description: 'Organization ID scope' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}

export class A_BTestDto {
  @ApiProperty({ description: 'Test name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Test description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Test variants' })
  variants: Array<{
    name: string;
    description?: string;
    allocation: number; // Percentage 0-100
    config: Record<string, any>;
  }>;

  @ApiProperty({ description: 'Success metrics' })
  successMetrics: Array<{
    name: string;
    eventType: EventType;
    aggregation: 'count' | 'sum' | 'average' | 'unique';
    property?: string;
  }>;

  @ApiPropertyOptional({ description: 'Target audience criteria', type: 'object' })
  @IsOptional()
  @IsObject()
  targetAudience?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Test duration in days' })
  @IsOptional()
  duration?: number;

  @ApiPropertyOptional({ description: 'Minimum sample size' })
  @IsOptional()
  minSampleSize?: number;

  @ApiPropertyOptional({ description: 'Statistical significance threshold' })
  @IsOptional()
  significanceThreshold?: number;
}

export class DashboardConfigDto {
  @ApiProperty({ description: 'Dashboard name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Dashboard description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Dashboard widgets' })
  widgets: Array<{
    id: string;
    type: string;
    title: string;
    position: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    config: Record<string, any>;
    dataSource: {
      type: string;
      query: Record<string, any>;
    };
  }>;

  @ApiPropertyOptional({ description: 'Dashboard layout', type: 'object' })
  @IsOptional()
  @IsObject()
  layout?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Dashboard filters', type: 'object' })
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Refresh interval in seconds' })
  @IsOptional()
  refreshInterval?: number;

  @ApiPropertyOptional({ description: 'Whether dashboard is public' })
  @IsOptional()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Organization ID scope' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}

export class AlertRuleDto {
  @ApiProperty({ description: 'Alert rule name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Alert rule description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Metric to monitor' })
  @IsString()
  metric: string;

  @ApiProperty({ 
    description: 'Alert condition',
    enum: ['greater_than', 'less_than', 'equals', 'not_equals', 'percentage_change']
  })
  @IsEnum(['greater_than', 'less_than', 'equals', 'not_equals', 'percentage_change'])
  condition: string;

  @ApiProperty({ description: 'Threshold value' })
  threshold: number;

  @ApiPropertyOptional({ description: 'Time window for evaluation in minutes' })
  @IsOptional()
  timeWindow?: number;

  @ApiPropertyOptional({ description: 'Alert frequency in minutes' })
  @IsOptional()
  frequency?: number;

  @ApiPropertyOptional({ description: 'Alert recipients', type: [String] })
  @IsOptional()
  recipients?: string[];

  @ApiPropertyOptional({ description: 'Alert channels', type: [String] })
  @IsOptional()
  channels?: string[];

  @ApiPropertyOptional({ description: 'Alert filters', type: 'object' })
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Whether alert is active' })
  @IsOptional()
  isActive?: boolean;
}
