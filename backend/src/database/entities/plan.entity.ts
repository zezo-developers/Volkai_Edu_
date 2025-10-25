import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Subscription } from './subscription.entity';

export enum PlanType {
  FREE = 'free',
  BASIC = 'basic',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
  CUSTOM = 'custom',
}

export enum PlanInterval {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  LIFETIME = 'lifetime',
}

export enum PlanStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

@Entity('plans')
@Index(['status', 'isActive'])
@Index(['planType', 'interval'])
@Index(['priceAmount', 'currency'])
export class Plan {
  @ApiProperty({ description: 'Plan ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Plan name' })
  @Column({ length: 100 })
  name: string;

  @ApiProperty({ description: 'Plan description' })
  @Column({ type: 'text', nullable: true })
  description: string;

  @ApiProperty({ enum: PlanType, description: 'Plan type' })
  @Column({
    type: 'enum',
    enum: PlanType,
  })
  planType: PlanType;

  @ApiProperty({ enum: PlanInterval, description: 'Billing interval' })
  @Column({
    type: 'enum',
    enum: PlanInterval,
  })
  interval: PlanInterval;

  @ApiProperty({ description: 'Price amount in cents' })
  @Column({ name: 'priceAmount', type: 'bigint', default: 0 })
  priceAmount: number;

  @ApiProperty({ description: 'Currency code (ISO 4217)' })
  @Column({ length: 3, default: 'USD' })
  currency: string;

  @ApiProperty({ description: 'Setup fee in cents' })
  @Column({ name: 'setupFee', type: 'bigint', default: 0 })
  setupFee: number;

  @ApiProperty({ description: 'Trial period in days' })
  @Column({ name: 'trialDays', default: 0 })
  trialDays: number;

  @ApiProperty({ enum: PlanStatus, description: 'Plan status' })
  @Column({
    type: 'enum',
    enum: PlanStatus,
    default: PlanStatus.ACTIVE,
  })
  status: PlanStatus;

  @ApiProperty({ description: 'Whether plan is currently active' })
  @Column({ name: 'isActive', default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Plan features and limits' })
  @Column({ type: 'jsonb', default: {} })
  features: {
    maxUsers?: number;
    maxOrganizations?: number;
    maxCourses?: number;
    maxStudentsPerCourse?: number;
    maxStorageGB?: number;
    maxBandwidthGB?: number;
    customBranding?: boolean;
    advancedAnalytics?: boolean;
    prioritySupport?: boolean;
    ssoIntegration?: boolean;
    apiAccess?: boolean;
    whiteLabeling?: boolean;
    customDomain?: boolean;
    assessmentTypes?: string[];
    certificateTemplates?: number;
    videoConferencing?: boolean;
    liveStreaming?: boolean;
    jobPostings?: number;
    candidateDatabase?: boolean;
    atsIntegration?: boolean;
    backgroundChecks?: boolean;
    aiMockInterviews?: number;
    videoInterviews?: boolean;
    interviewRecording?: boolean;
    resumeTemplates?: number;
    resumeAnalytics?: boolean;
    emailNotifications?: number;
    smsNotifications?: number;
    pushNotifications?: boolean;
    webhooks?: number;
    apiCallsPerMonth?: number;
    supportChannels?: string[];
    supportResponseTime?: string;
    dedicatedManager?: boolean;
    gdprCompliance?: boolean;
    soc2Compliance?: boolean;
    dataRetentionYears?: number;
    auditLogs?: boolean;
    customFeatures?: Record<string, any>;
  };

  @ApiProperty({ description: 'Plan metadata and configuration' })
  @Column({ type: 'jsonb', default: {} })
  metadata: {
    displayOrder?: number;
    isPopular?: boolean;
    isFeatured?: boolean;
    color?: string;
    icon?: string;
    clonedFrom?: string;
    clonedAt?: Date;
    updatedBy?: string;
    updatedAt?: Date;
    originalPrice?: number;
    discountPercentage?: number;
    promotionalText?: string;
    availableRegions?: string[];
    targetAudience?: string[];
    upgradeOptions?: string[];
    downgradeOptions?: string[];
    createdBy?: string;
    prorateUpgrades?: boolean;
    prorateDowngrades?: boolean;
    allowMidCycleCancellation?: boolean;
    stripeProductId?: string;
    stripePriceId?: string;
    razorpayPlanId?: string;
    trackUsage?: boolean;
    usageMetrics?: string[];
    overage?: {
      enabled: boolean;
      pricePerUnit: number;
      freeUnits: number;
    };
    usageWarningThresholds?: number[];
    customFields?: Record<string, any>;
  };

  @ApiProperty({ description: 'Plan terms and conditions' })
  @Column({ type: 'jsonb', default: {} })
  terms: {
    minimumCommitmentMonths?: number;
    cancellationPolicy?: string;
    refundPolicy?: string;
    fairUsagePolicy?: string;
    dataRetentionPolicy?: string;
    termsOfServiceUrl?: string;
    privacyPolicyUrl?: string;
    slaUrl?: string;
    paymentTerms?: string;
    lateFeePercentage?: number;
    customTerms?: Record<string, string>;
  };

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => Subscription, subscription => subscription.plan)
  subscriptions: Subscription[];

  // Virtual properties
  get isFreePlan(): boolean {
    return this.planType === PlanType.FREE || this.priceAmount === 0;
  }

  get monthlyPrice(): number {
    switch (this.interval) {
      case PlanInterval.MONTHLY:
        return this.priceAmount;
      case PlanInterval.QUARTERLY:
        return Math.round(this.priceAmount / 3);
      case PlanInterval.YEARLY:
        return Math.round(this.priceAmount / 12);
      default:
        return this.priceAmount;
    }
  }

  get yearlyPrice(): number {
    switch (this.interval) {
      case PlanInterval.MONTHLY:
        return this.priceAmount * 12;
      case PlanInterval.QUARTERLY:
        return this.priceAmount * 4;
      case PlanInterval.YEARLY:
        return this.priceAmount;
      default:
        return this.priceAmount;
    }
  }

  get displayPrice(): string {
    const amount = this.priceAmount / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.currency,
    }).format(amount);
  }

  get intervalDisplay(): string {
    const intervalMap = {
      [PlanInterval.MONTHLY]: 'month',
      [PlanInterval.QUARTERLY]: 'quarter',
      [PlanInterval.YEARLY]: 'year',
      [PlanInterval.LIFETIME]: 'lifetime',
    };
    return intervalMap[this.interval] || this.interval;
  }

  // Methods
  hasFeature(featureName: string): boolean {
    return !!this.features[featureName];
  }

  getFeatureLimit(featureName: string): number | null {
    const limit = this.features[featureName];
    return typeof limit === 'number' ? limit : null;
  }

  isFeatureUnlimited(featureName: string): boolean {
    const limit = this.features[featureName];
    return limit === -1 || limit === 'unlimited';
  }

  canUpgradeTo(targetPlanId: string): boolean {
    return this.metadata.upgradeOptions?.includes(targetPlanId) || false;
  }

  canDowngradeTo(targetPlanId: string): boolean {
    return this.metadata.downgradeOptions?.includes(targetPlanId) || false;
  }

  calculateProrationAmount(
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    changeDate: Date = new Date(),
  ): number {
    if (!this.metadata.prorateUpgrades) return 0;
    const totalPeriodMs = currentPeriodEnd.getTime() - currentPeriodStart.getTime();
    const remainingPeriodMs = currentPeriodEnd.getTime() - changeDate.getTime();
    const remainingRatio = remainingPeriodMs / totalPeriodMs;
    return Math.round(this.priceAmount * remainingRatio);
  }

  getUsageWarningThreshold(percentage: number): boolean {
    const thresholds = this.metadata.usageWarningThresholds || [80, 90, 95, 100];
    return thresholds.includes(percentage);
  }

  validateFeatureUsage(featureName: string, currentUsage: number): {
    allowed: boolean;
    limit: number | null;
    overageAllowed: boolean;
    overagePrice?: number;
  } {
    const limit = this.getFeatureLimit(featureName);
    const isUnlimited = this.isFeatureUnlimited(featureName);
    if (isUnlimited) return { allowed: true, limit: null, overageAllowed: false };
    if (limit === null) return { allowed: false, limit: null, overageAllowed: false };
    const overage = this.metadata.overage;
    const overageAllowed = overage?.enabled && currentUsage > limit;
    return {
      allowed: currentUsage <= limit || overageAllowed,
      limit,
      overageAllowed,
      overagePrice: overage?.pricePerUnit,
    };
  }

  clone(newName?: string): Partial<Plan> {
    return {
      name: newName || `${this.name} (Copy)`,
      description: this.description,
      planType: this.planType,
      interval: this.interval,
      priceAmount: this.priceAmount,
      currency: this.currency,
      setupFee: this.setupFee,
      trialDays: this.trialDays,
      features: { ...this.features },
      metadata: { ...this.metadata },
      terms: { ...this.terms },
      status: PlanStatus.INACTIVE,
      isActive: false,
    };
  }

  // Static helper methods
  static createFreePlan(): Partial<Plan> {
    return {
      name: 'Free Plan',
      description: 'Get started with basic features at no cost',
      planType: PlanType.FREE,
      interval: PlanInterval.MONTHLY,
      priceAmount: 0,
      currency: 'USD',
      setupFee: 0,
      trialDays: 0,
      features: {
        maxUsers: 1,
        maxOrganizations: 1,
        maxCourses: 3,
        maxStudentsPerCourse: 10,
        maxStorageGB: 1,
        maxBandwidthGB: 5,
        customBranding: false,
        advancedAnalytics: false,
        prioritySupport: false,
        assessmentTypes: ['mcq'],
        certificateTemplates: 1,
        jobPostings: 1,
        aiMockInterviews: 5,
        resumeTemplates: 3,
        emailNotifications: 100,
        supportChannels: ['email'],
        supportResponseTime: '24h',
      },
      metadata: {
        displayOrder: 1,
        isPopular: false,
        isFeatured: false,
        targetAudience: ['individual'],
        upgradeOptions: [],
        prorateUpgrades: true,
        allowMidCycleCancellation: true,
        trackUsage: true,
        usageMetrics: ['users', 'storage', 'courses'],
        usageWarningThresholds: [80, 90, 95, 100],
      },
      terms: {
        cancellationPolicy: 'Cancel anytime',
        refundPolicy: 'No refunds for free plan',
        paymentTerms: 'immediate',
      },
      status: PlanStatus.ACTIVE,
      isActive: true,
    };
  }

  static getDefaultFeatures(): Record<string, any> {
    return {
      maxUsers: 1,
      maxOrganizations: 1,
      maxCourses: 1,
      maxStudentsPerCourse: 10,
      maxStorageGB: 1,
      maxBandwidthGB: 5,
      customBranding: false,
      advancedAnalytics: false,
      prioritySupport: false,
      ssoIntegration: false,
      apiAccess: false,
      whiteLabeling: false,
      customDomain: false,
      assessmentTypes: ['mcq'],
      certificateTemplates: 1,
      videoConferencing: false,
      liveStreaming: false,
      jobPostings: 1,
      candidateDatabase: false,
      atsIntegration: false,
      backgroundChecks: false,
      aiMockInterviews: 5,
      videoInterviews: false,
      interviewRecording: false,
      resumeTemplates: 3,
      resumeAnalytics: false,
      emailNotifications: 100,
      smsNotifications: 0,
      pushNotifications: true,
      webhooks: 1,
      apiCallsPerMonth: 1000,
      supportChannels: ['email'],
      supportResponseTime: '24h',
      dedicatedManager: false,
      gdprCompliance: true,
      soc2Compliance: false,
      dataRetentionYears: 1,
      auditLogs: false,
    };
  }
}
