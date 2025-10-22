import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsObject,
  IsArray,
  Min,
  Max,
  Length,
  IsISO4217CurrencyCode,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PlanType, PlanInterval, PlanStatus } from '../../../database/entities/plan.entity';

export class PlanFeaturesDto {
  @ApiPropertyOptional({ description: 'Maximum number of users' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUsers?: number;

  @ApiPropertyOptional({ description: 'Maximum number of organizations' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxOrganizations?: number;

  @ApiPropertyOptional({ description: 'Maximum number of courses' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxCourses?: number;

  @ApiPropertyOptional({ description: 'Maximum students per course' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxStudentsPerCourse?: number;

  @ApiPropertyOptional({ description: 'Maximum storage in GB' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxStorageGB?: number;

  @ApiPropertyOptional({ description: 'Maximum bandwidth in GB' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxBandwidthGB?: number;

  @ApiPropertyOptional({ description: 'Custom branding enabled' })
  @IsOptional()
  @IsBoolean()
  customBranding?: boolean;

  @ApiPropertyOptional({ description: 'Advanced analytics enabled' })
  @IsOptional()
  @IsBoolean()
  advancedAnalytics?: boolean;

  @ApiPropertyOptional({ description: 'Priority support enabled' })
  @IsOptional()
  @IsBoolean()
  prioritySupport?: boolean;

  @ApiPropertyOptional({ description: 'SSO integration enabled' })
  @IsOptional()
  @IsBoolean()
  ssoIntegration?: boolean;

  @ApiPropertyOptional({ description: 'API access enabled' })
  @IsOptional()
  @IsBoolean()
  apiAccess?: boolean;

  @ApiPropertyOptional({ description: 'White labeling enabled' })
  @IsOptional()
  @IsBoolean()
  whiteLabeling?: boolean;

  @ApiPropertyOptional({ description: 'Custom domain enabled' })
  @IsOptional()
  @IsBoolean()
  customDomain?: boolean;

  @ApiPropertyOptional({ description: 'Available assessment types', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assessmentTypes?: string[];

  @ApiPropertyOptional({ description: 'Number of certificate templates' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  certificateTemplates?: number;

  @ApiPropertyOptional({ description: 'Video conferencing enabled' })
  @IsOptional()
  @IsBoolean()
  videoConferencing?: boolean;

  @ApiPropertyOptional({ description: 'Live streaming enabled' })
  @IsOptional()
  @IsBoolean()
  liveStreaming?: boolean;

  @ApiPropertyOptional({ description: 'Number of job postings allowed' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  jobPostings?: number;

  @ApiPropertyOptional({ description: 'Candidate database access' })
  @IsOptional()
  @IsBoolean()
  candidateDatabase?: boolean;

  @ApiPropertyOptional({ description: 'ATS integration enabled' })
  @IsOptional()
  @IsBoolean()
  atsIntegration?: boolean;

  @ApiPropertyOptional({ description: 'Background checks enabled' })
  @IsOptional()
  @IsBoolean()
  backgroundChecks?: boolean;

  @ApiPropertyOptional({ description: 'Number of AI mock interviews' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  aiMockInterviews?: number;

  @ApiPropertyOptional({ description: 'Video interviews enabled' })
  @IsOptional()
  @IsBoolean()
  videoInterviews?: boolean;

  @ApiPropertyOptional({ description: 'Interview recording enabled' })
  @IsOptional()
  @IsBoolean()
  interviewRecording?: boolean;

  @ApiPropertyOptional({ description: 'Number of resume templates' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  resumeTemplates?: number;

  @ApiPropertyOptional({ description: 'Resume analytics enabled' })
  @IsOptional()
  @IsBoolean()
  resumeAnalytics?: boolean;

  @ApiPropertyOptional({ description: 'Number of email notifications per month' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  emailNotifications?: number;

  @ApiPropertyOptional({ description: 'Number of SMS notifications per month' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  smsNotifications?: number;

  @ApiPropertyOptional({ description: 'Push notifications enabled' })
  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Number of webhooks allowed' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  webhooks?: number;

  @ApiPropertyOptional({ description: 'API calls per month' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  apiCallsPerMonth?: number;

  @ApiPropertyOptional({ description: 'Available support channels', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportChannels?: string[];

  @ApiPropertyOptional({ description: 'Support response time' })
  @IsOptional()
  @IsString()
  supportResponseTime?: string;

  @ApiPropertyOptional({ description: 'Dedicated account manager' })
  @IsOptional()
  @IsBoolean()
  dedicatedManager?: boolean;

  @ApiPropertyOptional({ description: 'GDPR compliance' })
  @IsOptional()
  @IsBoolean()
  gdprCompliance?: boolean;

  @ApiPropertyOptional({ description: 'SOC 2 compliance' })
  @IsOptional()
  @IsBoolean()
  soc2Compliance?: boolean;

  @ApiPropertyOptional({ description: 'Data retention period in years' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  dataRetentionYears?: number;

  @ApiPropertyOptional({ description: 'Audit logs enabled' })
  @IsOptional()
  @IsBoolean()
  auditLogs?: boolean;

  @ApiPropertyOptional({ description: 'Custom features', type: 'object' })
  @IsOptional()
  @IsObject()
  customFeatures?: Record<string, any>;
}

export class PlanMetadataDto {
  @ApiPropertyOptional({ description: 'Display order for sorting' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({ description: 'Mark as popular plan' })
  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;

  @ApiPropertyOptional({ description: 'Mark as featured plan' })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: 'Plan color theme' })
  @IsOptional()
  @IsString()
  @Length(3, 7)
  color?: string;

  @ApiPropertyOptional({ description: 'Plan icon' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: 'Original price before discount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  originalPrice?: number;

  @ApiPropertyOptional({ description: 'Discount percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercentage?: number;

  @ApiPropertyOptional({ description: 'Promotional text' })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  promotionalText?: string;

  @ApiPropertyOptional({ description: 'Available regions', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  availableRegions?: string[];

  @ApiPropertyOptional({ description: 'Target audience', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetAudience?: string[];

  @ApiPropertyOptional({ description: 'Available upgrade options', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  upgradeOptions?: string[];

  @ApiPropertyOptional({ description: 'Available downgrade options', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  downgradeOptions?: string[];

  @ApiPropertyOptional({ description: 'Prorate upgrades' })
  @IsOptional()
  @IsBoolean()
  prorateUpgrades?: boolean;

  @ApiPropertyOptional({ description: 'Prorate downgrades' })
  @IsOptional()
  @IsBoolean()
  prorateDowngrades?: boolean;

  @ApiPropertyOptional({ description: 'Allow mid-cycle cancellation' })
  @IsOptional()
  @IsBoolean()
  allowMidCycleCancellation?: boolean;

  @ApiPropertyOptional({ description: 'Stripe product ID' })
  @IsOptional()
  @IsString()
  stripeProductId?: string;

  @ApiPropertyOptional({ description: 'Stripe price ID' })
  @IsOptional()
  @IsString()
  stripePriceId?: string;

  @ApiPropertyOptional({ description: 'Razorpay plan ID' })
  @IsOptional()
  @IsString()
  razorpayPlanId?: string;

  @ApiPropertyOptional({ description: 'Track usage for this plan' })
  @IsOptional()
  @IsBoolean()
  trackUsage?: boolean;

  @ApiPropertyOptional({ description: 'Usage metrics to track', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  usageMetrics?: string[];

  @ApiPropertyOptional({ description: 'Overage configuration', type: 'object' })
  @IsOptional()
  @IsObject()
  overage?: {
    enabled: boolean;
    pricePerUnit: number;
    freeUnits: number;
  };

  @ApiPropertyOptional({ description: 'Usage warning thresholds', type: [Number] })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  @Max(100, { each: true })
  usageWarningThresholds?: number[];

  @ApiPropertyOptional({ description: 'Custom metadata fields', type: 'object' })
  @IsOptional()
  @IsObject()
  customFields?: Record<string, any>;
}

export class PlanTermsDto {
  @ApiPropertyOptional({ description: 'Minimum commitment in months' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(36)
  minimumCommitmentMonths?: number;

  @ApiPropertyOptional({ description: 'Cancellation policy' })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  cancellationPolicy?: string;

  @ApiPropertyOptional({ description: 'Refund policy' })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  refundPolicy?: string;

  @ApiPropertyOptional({ description: 'Fair usage policy' })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  fairUsagePolicy?: string;

  @ApiPropertyOptional({ description: 'Data retention policy' })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  dataRetentionPolicy?: string;

  @ApiPropertyOptional({ description: 'Terms of service URL' })
  @IsOptional()
  @IsString()
  termsOfServiceUrl?: string;

  @ApiPropertyOptional({ description: 'Privacy policy URL' })
  @IsOptional()
  @IsString()
  privacyPolicyUrl?: string;

  @ApiPropertyOptional({ description: 'SLA URL' })
  @IsOptional()
  @IsString()
  slaUrl?: string;

  @ApiPropertyOptional({ description: 'Payment terms' })
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @ApiPropertyOptional({ description: 'Late fee percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  lateFeePercentage?: number;

  @ApiPropertyOptional({ description: 'Custom terms', type: 'object' })
  @IsOptional()
  @IsObject()
  customTerms?: Record<string, string>;
}

export class CreatePlanDto {
  @ApiProperty({ description: 'Plan name' })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiPropertyOptional({ description: 'Plan description' })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  description?: string;

  @ApiProperty({ enum: PlanType, description: 'Plan type' })
  @IsEnum(PlanType)
  planType: PlanType;

  @ApiProperty({ enum: PlanInterval, description: 'Billing interval' })
  @IsEnum(PlanInterval)
  interval: PlanInterval;

  @ApiProperty({ description: 'Price amount in cents' })
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => Math.round(value))
  priceAmount: number;

  @ApiProperty({ description: 'Currency code (ISO 4217)' })
  @IsISO4217CurrencyCode()
  @Transform(({ value }) => value.toUpperCase())
  currency: string;

  @ApiPropertyOptional({ description: 'Setup fee in cents' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => Math.round(value))
  setupFee?: number;

  @ApiPropertyOptional({ description: 'Trial period in days' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(365)
  trialDays?: number;

  @ApiPropertyOptional({ enum: PlanStatus, description: 'Plan status' })
  @IsOptional()
  @IsEnum(PlanStatus)
  status?: PlanStatus;

  @ApiPropertyOptional({ description: 'Whether plan is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: PlanFeaturesDto, description: 'Plan features and limits' })
  @IsOptional()
  @ValidateNested()
  @Type(() => PlanFeaturesDto)
  features?: PlanFeaturesDto;

  @ApiPropertyOptional({ type: PlanMetadataDto, description: 'Plan metadata' })
  @IsOptional()
  @ValidateNested()
  @Type(() => PlanMetadataDto)
  metadata?: PlanMetadataDto;

  @ApiPropertyOptional({ type: PlanTermsDto, description: 'Plan terms and conditions' })
  @IsOptional()
  @ValidateNested()
  @Type(() => PlanTermsDto)
  terms?: PlanTermsDto;
}

export class UpdatePlanDto extends PartialType(CreatePlanDto) {
  @ApiPropertyOptional({ description: 'Plan name' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional({ enum: PlanType, description: 'Plan type' })
  @IsOptional()
  @IsEnum(PlanType)
  planType?: PlanType;

  @ApiPropertyOptional({ enum: PlanInterval, description: 'Billing interval' })
  @IsOptional()
  @IsEnum(PlanInterval)
  interval?: PlanInterval;

  @ApiPropertyOptional({ description: 'Price amount in cents' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => Math.round(value))
  priceAmount?: number;

  @ApiPropertyOptional({ description: 'Currency code (ISO 4217)' })
  @IsOptional()
  @IsISO4217CurrencyCode()
  @Transform(({ value }) => value.toUpperCase())
  currency?: string;
}

export class PlanQueryDto {
  @ApiPropertyOptional({ enum: PlanStatus, description: 'Filter by plan status' })
  @IsOptional()
  @IsEnum(PlanStatus)
  status?: PlanStatus;

  @ApiPropertyOptional({ enum: PlanType, description: 'Filter by plan type' })
  @IsOptional()
  @IsEnum(PlanType)
  planType?: PlanType;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  })
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by currency' })
  @IsOptional()
  @IsISO4217CurrencyCode()
  currency?: string;

  @ApiPropertyOptional({ description: 'Minimum price filter (in cents)' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum price filter (in cents)' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Filter by target audience' })
  @IsOptional()
  @IsString()
  targetAudience?: string;

  @ApiPropertyOptional({ description: 'Sort by field' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort order', enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';

  @ApiPropertyOptional({ description: 'Page number for pagination' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class PlanComparisonDto {
  @ApiProperty({ description: 'Plan IDs to compare', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => Array.isArray(value) ? value : [value])
  planIds: string[];

  @ApiPropertyOptional({ description: 'Features to compare', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional({ description: 'Include pricing comparison' })
  @IsOptional()
  @IsBoolean()
  includePricing?: boolean;

  @ApiPropertyOptional({ description: 'Include feature comparison' })
  @IsOptional()
  @IsBoolean()
  includeFeatures?: boolean;
}

export class PlanProrationDto {
  @ApiProperty({ description: 'Target plan ID for change' })
  @IsString()
  targetPlanId: string;

  @ApiPropertyOptional({ description: 'Date of plan change' })
  @IsOptional()
  @Transform(({ value }) => new Date(value))
  changeDate?: Date;

  @ApiPropertyOptional({ description: 'Current billing period start' })
  @IsOptional()
  @Transform(({ value }) => new Date(value))
  currentPeriodStart?: Date;

  @ApiPropertyOptional({ description: 'Current billing period end' })
  @IsOptional()
  @Transform(({ value }) => new Date(value))
  currentPeriodEnd?: Date;

  @ApiPropertyOptional({ description: 'Current subscription quantity' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;
}
