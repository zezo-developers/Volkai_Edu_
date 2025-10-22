import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsObject,
  IsArray,
  IsUUID,
  IsEmail,
  IsDateString,
  Min,
  Max,
  Length,
  ValidateNested,
  IsISO4217CurrencyCode,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { 
  PaymentProvider, 
  PaymentMethod 
} from '../../../database/entities/payment.entity';
import { 
  SubscriptionCancelReason 
} from '../../../database/entities/subscription.entity';

export class BillingAddressDto {
  @ApiProperty({ description: 'Full name' })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiProperty({ description: 'Email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Address line 1' })
  @IsString()
  @Length(1, 100)
  line1: string;

  @ApiPropertyOptional({ description: 'Address line 2' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  line2?: string;

  @ApiProperty({ description: 'City' })
  @IsString()
  @Length(1, 50)
  city: string;

  @ApiPropertyOptional({ description: 'State/Province' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  state?: string;

  @ApiProperty({ description: 'Postal/ZIP code' })
  @IsString()
  @Length(1, 20)
  postalCode: string;

  @ApiProperty({ description: 'Country code (ISO 3166-1 alpha-2)' })
  @IsString()
  @Length(2, 2)
  @Transform(({ value }) => value.toUpperCase())
  country: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  phone?: string;
}

export class CreateSubscriptionDto {
  @ApiPropertyOptional({ description: 'Organization ID (defaults to current user organization)' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiProperty({ description: 'Plan ID' })
  @IsUUID()
  planId: string;

  @ApiProperty({ enum: PaymentProvider, description: 'Payment provider' })
  @IsEnum(PaymentProvider)
  paymentProvider: PaymentProvider;

  @ApiPropertyOptional({ description: 'Payment method ID from provider' })
  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @ApiPropertyOptional({ description: 'Coupon code for discount' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  couponCode?: string;

  @ApiPropertyOptional({ type: BillingAddressDto, description: 'Billing address' })
  @IsOptional()
  @ValidateNested()
  @Type(() => BillingAddressDto)
  billingAddress?: BillingAddressDto;

  @ApiPropertyOptional({ description: 'Subscription quantity' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Custom metadata', type: 'object' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Start subscription immediately' })
  @IsOptional()
  @IsBoolean()
  startImmediately?: boolean;

  @ApiPropertyOptional({ description: 'Trial override in days' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(365)
  trialDays?: number;
}

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({ description: 'New plan ID for upgrade/downgrade' })
  @IsOptional()
  @IsUUID()
  planId?: string;

  @ApiPropertyOptional({ description: 'Subscription quantity' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Coupon code for discount' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  couponCode?: string;

  @ApiPropertyOptional({ description: 'Date to pause subscription' })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => new Date(value))
  pauseAt?: Date;

  @ApiPropertyOptional({ description: 'Date to resume subscription' })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => new Date(value))
  resumeAt?: Date;

  @ApiPropertyOptional({ description: 'Update payment method ID' })
  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @ApiPropertyOptional({ type: BillingAddressDto, description: 'Update billing address' })
  @IsOptional()
  @ValidateNested()
  @Type(() => BillingAddressDto)
  billingAddress?: BillingAddressDto;

  @ApiPropertyOptional({ description: 'Custom metadata updates', type: 'object' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Prorate the change' })
  @IsOptional()
  @IsBoolean()
  prorate?: boolean;
}

export class CancelSubscriptionDto {
  @ApiPropertyOptional({ enum: SubscriptionCancelReason, description: 'Cancellation reason' })
  @IsOptional()
  @IsEnum(SubscriptionCancelReason)
  reason?: SubscriptionCancelReason;

  @ApiPropertyOptional({ description: 'Date to cancel subscription (defaults to end of current period)' })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => new Date(value))
  cancelAt?: Date;

  @ApiPropertyOptional({ description: 'Cancel immediately instead of at period end' })
  @IsOptional()
  @IsBoolean()
  cancelImmediately?: boolean;

  @ApiPropertyOptional({ description: 'Additional cancellation notes' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  notes?: string;

  @ApiPropertyOptional({ description: 'Request refund for unused time' })
  @IsOptional()
  @IsBoolean()
  requestRefund?: boolean;
}

export class PauseSubscriptionDto {
  @ApiPropertyOptional({ description: 'Date to pause subscription (defaults to now)' })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => new Date(value))
  pauseAt?: Date;

  @ApiPropertyOptional({ description: 'Date to automatically resume subscription' })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => new Date(value))
  resumeAt?: Date;

  @ApiPropertyOptional({ description: 'Reason for pausing' })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  reason?: string;

  @ApiPropertyOptional({ description: 'Collect payment on resume' })
  @IsOptional()
  @IsBoolean()
  collectOnResume?: boolean;
}

export class UsageItemDto {
  @ApiProperty({ description: 'Usage metric name' })
  @IsString()
  @Length(1, 50)
  metric: string;

  @ApiProperty({ description: 'Usage value' })
  @IsNumber()
  @Min(0)
  value: number;

  @ApiPropertyOptional({ description: 'Timestamp for usage (defaults to now)' })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => new Date(value))
  timestamp?: Date;

  @ApiPropertyOptional({ description: 'Additional metadata for usage', type: 'object' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UsageRecordDto {
  @ApiProperty({ type: [UsageItemDto], description: 'Usage items to record' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UsageItemDto)
  usage: UsageItemDto[];

  @ApiPropertyOptional({ description: 'Batch identifier for related usage' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  batchId?: string;

  @ApiPropertyOptional({ description: 'Source of usage data' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  source?: string;
}

export class SubscriptionQueryDto {
  @ApiPropertyOptional({ description: 'Filter by organization ID' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Filter by plan ID' })
  @IsOptional()
  @IsUUID()
  planId?: string;

  @ApiPropertyOptional({ description: 'Filter by subscription status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by payment provider' })
  @IsOptional()
  @IsEnum(PaymentProvider)
  paymentProvider?: PaymentProvider;

  @ApiPropertyOptional({ description: 'Filter by currency' })
  @IsOptional()
  @IsISO4217CurrencyCode()
  currency?: string;

  @ApiPropertyOptional({ description: 'Filter subscriptions created after date' })
  @IsOptional()
  @IsDateString()
  createdAfter?: string;

  @ApiPropertyOptional({ description: 'Filter subscriptions created before date' })
  @IsOptional()
  @IsDateString()
  createdBefore?: string;

  @ApiPropertyOptional({ description: 'Filter subscriptions ending after date' })
  @IsOptional()
  @IsDateString()
  endingAfter?: string;

  @ApiPropertyOptional({ description: 'Filter subscriptions ending before date' })
  @IsOptional()
  @IsDateString()
  endingBefore?: string;

  @ApiPropertyOptional({ description: 'Include trial subscriptions' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  })
  @IsBoolean()
  includeTrials?: boolean;

  @ApiPropertyOptional({ description: 'Include canceled subscriptions' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  })
  @IsBoolean()
  includeCanceled?: boolean;

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

export class SubscriptionPreviewDto {
  @ApiProperty({ description: 'Plan ID to preview' })
  @IsUUID()
  planId: string;

  @ApiPropertyOptional({ description: 'Subscription quantity' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Coupon code' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  couponCode?: string;

  @ApiPropertyOptional({ description: 'Currency for preview' })
  @IsOptional()
  @IsISO4217CurrencyCode()
  currency?: string;

  @ApiPropertyOptional({ description: 'Include tax calculation' })
  @IsOptional()
  @IsBoolean()
  includeTax?: boolean;

  @ApiPropertyOptional({ type: BillingAddressDto, description: 'Billing address for tax calculation' })
  @IsOptional()
  @ValidateNested()
  @Type(() => BillingAddressDto)
  billingAddress?: BillingAddressDto;
}

export class SubscriptionChangePreviewDto {
  @ApiProperty({ description: 'New plan ID' })
  @IsUUID()
  newPlanId: string;

  @ApiPropertyOptional({ description: 'New quantity' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  newQuantity?: number;

  @ApiPropertyOptional({ description: 'Date of change (defaults to now)' })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => new Date(value))
  changeDate?: Date;

  @ApiPropertyOptional({ description: 'Prorate the change' })
  @IsOptional()
  @IsBoolean()
  prorate?: boolean;

  @ApiPropertyOptional({ description: 'Apply coupon to new plan' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  couponCode?: string;
}

export class SubscriptionRenewalDto {
  @ApiPropertyOptional({ description: 'Force renewal even if not due' })
  @IsOptional()
  @IsBoolean()
  forceRenewal?: boolean;

  @ApiPropertyOptional({ description: 'Renewal date (defaults to current period end)' })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => new Date(value))
  renewalDate?: Date;

  @ApiPropertyOptional({ description: 'Update payment method for renewal' })
  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @ApiPropertyOptional({ description: 'Send renewal notification' })
  @IsOptional()
  @IsBoolean()
  sendNotification?: boolean;
}

export class SubscriptionTransferDto {
  @ApiProperty({ description: 'Target organization ID' })
  @IsUUID()
  targetOrganizationId: string;

  @ApiPropertyOptional({ description: 'Transfer date (defaults to now)' })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => new Date(value))
  transferDate?: Date;

  @ApiPropertyOptional({ description: 'Reason for transfer' })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  reason?: string;

  @ApiPropertyOptional({ description: 'Prorate for transfer' })
  @IsOptional()
  @IsBoolean()
  prorate?: boolean;

  @ApiPropertyOptional({ description: 'Transfer usage data' })
  @IsOptional()
  @IsBoolean()
  transferUsage?: boolean;
}

export class SubscriptionReactivateDto {
  @ApiPropertyOptional({ description: 'New plan ID (defaults to previous plan)' })
  @IsOptional()
  @IsUUID()
  planId?: string;

  @ApiPropertyOptional({ description: 'Payment method ID' })
  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @ApiPropertyOptional({ description: 'Reactivation date (defaults to now)' })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => new Date(value))
  reactivationDate?: Date;

  @ApiPropertyOptional({ description: 'Apply trial period' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(365)
  trialDays?: number;

  @ApiPropertyOptional({ description: 'Coupon code for reactivation discount' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  couponCode?: string;
}

export class SubscriptionNotificationDto {
  @ApiProperty({ description: 'Notification type' })
  @IsString()
  @Length(1, 50)
  type: string;

  @ApiPropertyOptional({ description: 'Notification recipients (defaults to organization admins)' })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  recipients?: string[];

  @ApiPropertyOptional({ description: 'Custom notification data', type: 'object' })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Schedule notification for later' })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => new Date(value))
  scheduleFor?: Date;
}

export class BulkSubscriptionActionDto {
  @ApiProperty({ description: 'Subscription IDs to act upon', type: [String] })
  @IsArray()
  @IsUUID(undefined, { each: true })
  subscriptionIds: string[];

  @ApiProperty({ description: 'Action to perform' })
  @IsString()
  @Length(1, 50)
  action: string;

  @ApiPropertyOptional({ description: 'Action parameters', type: 'object' })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Perform action asynchronously' })
  @IsOptional()
  @IsBoolean()
  async?: boolean;

  @ApiPropertyOptional({ description: 'Send notifications for each action' })
  @IsOptional()
  @IsBoolean()
  sendNotifications?: boolean;
}
