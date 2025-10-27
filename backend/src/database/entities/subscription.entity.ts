import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Plan } from './plan.entity';
import { Organization } from './organization.entity';
import { Invoice } from './invoice.entity';
import { Payment } from './payment.entity';

export enum SubscriptionStatus {
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid',
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  PAUSED = 'paused',
}

export enum SubscriptionCancelReason {
  USER_REQUESTED = 'user_requested',
  PAYMENT_FAILED = 'payment_failed',
  FRAUD = 'fraud',
  ADMIN_CANCELED = 'admin_canceled',
  DOWNGRADE = 'downgrade',
  UPGRADE = 'upgrade',
  EXPIRED = 'expired',
}

@Entity('subscriptions')
@Index(['organizationId', 'status'])
@Index(['planId', 'status'])
@Index(['status', 'currentPeriodEnd'])
@Index(['trialEnd'])
@Index(['cancelAt'])
export class Subscription {
  @ApiProperty({ description: 'Subscription ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Organization ID' })
  @Column({ name: 'organizationId' })
  organizationId: string;

  @ApiProperty({ description: 'Plan ID' })
  @Column({ name: 'planId' })
  planId: string;

  @ApiProperty({ enum: SubscriptionStatus, description: 'Subscription status' })
  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.INCOMPLETE,
  })
  status: SubscriptionStatus;

  @ApiProperty({ description: 'Current period start date' })
  @Column({ name: 'currentPeriodStart', type: 'timestamp' })
  currentPeriodStart: Date;

  @ApiProperty({ description: 'Current period end date' })
  @Column({ name: 'currentPeriodEnd', type: 'timestamp' })
  currentPeriodEnd: Date;

  @ApiProperty({ description: 'Trial start date' })
  @Column({ name: 'trialStart', type: 'timestamp', nullable: true })
  trialStart?: Date;

  @ApiProperty({ description: 'Trial end date' })
  @Column({ name: 'trialEnd', type: 'timestamp', nullable: true })
  trialEnd?: Date;

  @ApiProperty({ description: 'Cancellation date' })
  @Column({ name: 'cancelAt', type: 'timestamp', nullable: true })
  cancelAt?: Date;

  @ApiProperty({ description: 'Actual cancellation date' })
  @Column({ name: 'canceledAt', type: 'timestamp', nullable: true })
  canceledAt?: Date;

  @ApiProperty({ enum: SubscriptionCancelReason, description: 'Cancellation reason' })
  @Column({
    type: 'enum',
    enum: SubscriptionCancelReason,
    nullable: true,
  })
  cancelReason?: SubscriptionCancelReason;

  @ApiProperty({ description: 'Pause start date' })
  @Column({ name: 'pauseStart', type: 'timestamp', nullable: true })
  pauseStart?: Date;

  @ApiProperty({ description: 'Pause end date' })
  @Column({ name: 'pauseEnd', type: 'timestamp', nullable: true })
  pauseEnd?: Date;

  @ApiProperty({ description: 'Quantity of the subscription' })
  @Column({ default: 1 })
  quantity: number;

  @ApiProperty({ description: 'Subscription amount in cents' })
  @Column({ name: 'amountCents', type: 'bigint' })
  amountCents: number;

  @ApiProperty({ description: 'Currency code' })
  @Column({ length: 3 })
  currency: string;

  @ApiProperty({ description: 'Tax amount in cents' })
  @Column({ name: 'taxCents', type: 'bigint', default: 0 })
  taxCents: number;

  @ApiProperty({ description: 'Discount amount in cents' })
  @Column({ name: 'discountCents', type: 'bigint', default: 0 })
  discountCents: number;

  @ApiProperty({ description: 'Billing configuration and settings' })
  @Column({ name: 'billingConfig', type: 'jsonb', default: {} })
  billingConfig: {
    paymentMethodId?: string;
    defaultPaymentMethod?: string;
    billingCycleAnchor?: number;
    prorate?: boolean;
    dunningEnabled?: boolean;
    maxRetryAttempts?: number;
    retrySchedule?: number[];
    invoiceReminders?: boolean;
    paymentFailureNotifications?: boolean;
    renewalReminders?: boolean;
    taxExempt?: boolean;
    taxId?: string;
    taxRates?: Array<{
      type: string;
      rate: number;
      jurisdiction: string;
    }>;
    appliedCoupons?: Array<{
      id: string;
      code: string;
      type: 'percentage' | 'fixed';
      value: number;
      expiresAt?: Date;
    }>;
    usageBasedBilling?: boolean;
    meteringEnabled?: boolean;
    customFields?: Record<string, any>;
  };

  @ApiProperty({ description: 'Usage tracking and limits' })
  @Column({ name: 'usageData', type: 'jsonb', default: {} })
  usageData: {
    currentUsage?: Record<string, number>;
    usageHistory?: Array<{
      date: Date;
      metric: string;
      value: number;
      resetType?: 'daily' | 'monthly' | 'billing_cycle';
    }>;
    usageLimits?: Record<string, {
      limit: number;
      current: number;
      resetDate: Date;
      overage: number;
      overageAllowed: boolean;
    }>;
    overageCharges?: Array<{
      metric: string;
      units: number;
      pricePerUnit: number;
      totalAmount: number;
      billingPeriod: string;
    }>;
    usageAlerts?: Array<{
      metric: string;
      threshold: number;
      triggered: boolean;
      triggeredAt?: Date;
    }>;
  };

  @ApiProperty({ description: 'External provider integration data' })
  @Column({ name: 'providerData', type: 'jsonb', default: {} })
  providerData: {
    stripe?: {
      subscriptionId: string;
      customerId: string;
      priceId: string;
      paymentMethodId?: string;
      invoiceSettings?: Record<string, any>;
      metadata?: Record<string, string>;
    };
    razorpay?: {
      subscriptionId: string;
      customerId: string;
      planId: string;
      paymentMethodId?: string;
      metadata?: Record<string, string>;
    };
    [key: string]: any;
  };

  @ApiProperty({ description: 'Subscription metadata and history' })
  @Column({ name: 'metadata', type: 'jsonb', default: {} })
  metadata: {
    source?: 'web' | 'api' | 'admin' | 'migration';
    createdBy?: string;
    changeHistory?: Array<{
      timestamp: Date;
      action: string;
      oldValue?: any;
      newValue?: any;
      reason?: string;
      performedBy?: string;
    }>;
    billingHistory?: Array<{
      date: Date;
      action: 'created' | 'renewed' | 'upgraded' | 'downgraded' | 'paused' | 'resumed' | 'canceled';
      amount: number;
      planId: string;
      invoiceId?: string;
    }>;
    communications?: Array<{
      date: Date;
      type: 'email' | 'sms' | 'push' | 'in_app';
      template: string;
      status: 'sent' | 'delivered' | 'failed';
      reason?: string;
    }>;
    analytics?: {
      lifetimeValue: number;
      churnRisk?: number;
      engagementScore?: number;
      lastActivityDate?: Date;
    };
    customMetadata?: Record<string, any>;
  };

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Organization, organization => organization.subscriptions)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @ManyToOne(() => Plan, plan => plan.subscriptions)
  @JoinColumn({ name: 'planId' })
  plan: Plan;

  @OneToMany(() => Invoice, invoice => invoice.subscription)
  invoices: Invoice[];

  @OneToMany(() => Payment, payment => payment.subscription)
  payments: Payment[];

  // Virtual properties
  get isActive(): boolean {
    return [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING].includes(this.status);
  }

  get isCanceled(): boolean {
    return [SubscriptionStatus.CANCELED, SubscriptionStatus.INCOMPLETE_EXPIRED].includes(this.status);
  }

  get isPastDue(): boolean {
    return this.status === SubscriptionStatus.PAST_DUE;
  }

  get isTrialing(): boolean {
    return this.status === SubscriptionStatus.TRIALING;
  }

  get isPaused(): boolean {
    return this.status === SubscriptionStatus.PAUSED;
  }

  get trialDaysRemaining(): number {
    if (!this.trialEnd) return 0;
    const now = new Date();
    const diffTime = this.trialEnd.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  get daysUntilRenewal(): number {
    const now = new Date();
    const diffTime = this.currentPeriodEnd.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  get totalAmount(): number {
    return this.amountCents + this.taxCents - this.discountCents;
  }

  get displayAmount(): string {
    const amount = this.totalAmount / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.currency,
    }).format(amount);
  }

  get nextBillingDate(): Date {
    if (this.cancelAt && this.cancelAt < this.currentPeriodEnd) {
      return this.cancelAt;
    }
    return this.currentPeriodEnd;
  }

  // Methods
  canUpgrade(): boolean {
    return this.isActive && !this.isPaused;
  }

  canDowngrade(): boolean {
    return this.isActive && !this.isPaused;
  }

  canPause(): boolean {
    return this.isActive && !this.isPaused;
  }

  canResume(): boolean {
    return this.isPaused;
  }

  canCancel(): boolean {
    return this.isActive || this.isPaused;
  }

  calculateProration(newPlan: Plan, changeDate: Date = new Date()): {
    creditAmount: number;
    chargeAmount: number;
    netAmount: number;
  } {
    const remainingDays = Math.max(0,
      Math.ceil((this.currentPeriodEnd.getTime() - changeDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    const totalDays = Math.ceil(
      (this.currentPeriodEnd.getTime() - this.currentPeriodStart.getTime()) / (1000 * 60 * 60 * 24)
    );

    const unusedRatio = remainingDays / totalDays;
    const creditAmount = Math.round(this.amountCents * unusedRatio);
    const chargeAmount = Math.round(newPlan.priceAmount * unusedRatio);
    const netAmount = chargeAmount - creditAmount;

    return { creditAmount, chargeAmount, netAmount };
  }

  addUsage(metric: string, amount: number, date: Date = new Date()): void {
    if (!this.usageData.currentUsage) {
      this.usageData.currentUsage = {};
    }

    if (!this.usageData.usageHistory) {
      this.usageData.usageHistory = [];
    }

    this.usageData.currentUsage[metric] = (this.usageData.currentUsage[metric] || 0) + amount;

    this.usageData.usageHistory.push({
      date,
      metric,
      value: amount,
      resetType: 'billing_cycle',
    });

    this.checkUsageLimits(metric);
  }

  resetUsage(metric?: string): void {
    if (metric) {
      if (this.usageData.currentUsage) {
        this.usageData.currentUsage[metric] = 0;
      }
    } else {
      this.usageData.currentUsage = {};
    }
  }

  getUsage(metric: string): number {
    return this.usageData.currentUsage?.[metric] || 0;
  }

  getUsagePercentage(metric: string, limit: number): number {
    const usage = this.getUsage(metric);
    return limit > 0 ? Math.min(100, (usage / limit) * 100) : 0;
  }

  isUsageLimitExceeded(metric: string, limit: number): boolean {
    return this.getUsage(metric) > limit;
  }

  pause(pauseEnd?: Date): void {
    this.status = SubscriptionStatus.PAUSED;
    this.pauseStart = new Date();
    this.pauseEnd = pauseEnd;
    this.addToHistory('paused', { pauseEnd });
  }

  resume(): void {
    if (!this.isPaused) return;
    this.status = SubscriptionStatus.ACTIVE;
    if (this.pauseStart && this.pauseEnd) {
      const pauseDuration = this.pauseEnd.getTime() - this.pauseStart.getTime();
      this.currentPeriodEnd = new Date(this.currentPeriodEnd.getTime() + pauseDuration);
    }
    this.pauseStart = undefined;
    this.pauseEnd = undefined;
    this.addToHistory('resumed');
  }

  cancel(cancelAt?: Date, reason?: SubscriptionCancelReason): void {
    this.cancelAt = cancelAt || new Date();
    this.cancelReason = reason || SubscriptionCancelReason.USER_REQUESTED;

    if (!cancelAt || cancelAt <= new Date()) {
      this.status = SubscriptionStatus.CANCELED;
      this.canceledAt = new Date();
    }

    this.addToHistory('canceled', { reason, cancelAt: this.cancelAt });
  }

  reactivate(): void {
    if (!this.isCanceled) return;
    this.status = SubscriptionStatus.ACTIVE;
    this.cancelAt = undefined;
    this.canceledAt = undefined;
    this.cancelReason = undefined;

    const now = new Date();
    if (this.currentPeriodEnd < now) {
      this.currentPeriodStart = now;
      this.currentPeriodEnd = this.calculateNextPeriodEnd(now);
    }

    this.addToHistory('reactivated');
  }

  renew(): void {
    const now = new Date();
    this.currentPeriodStart = this.currentPeriodEnd;
    this.currentPeriodEnd = this.calculateNextPeriodEnd(this.currentPeriodStart);
    this.resetUsage();
    this.addToHistory('renewed', {
      newPeriodStart: this.currentPeriodStart,
      newPeriodEnd: this.currentPeriodEnd,
    });
  }

  private calculateNextPeriodEnd(startDate: Date): Date {
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    return endDate;
  }

  private checkUsageLimits(metric: string): void {
    const limits = this.usageData.usageLimits?.[metric];
    if (!limits) return;
    const currentUsage = this.getUsage(metric);
    const percentage = (currentUsage / limits.limit) * 100;
    const alerts = this.usageData.usageAlerts || [];
    alerts.forEach(alert => {
      if (alert.metric === metric && percentage >= alert.threshold && !alert.triggered) {
        alert.triggered = true;
        alert.triggeredAt = new Date();
      }
    });
  }

  private addToHistory(action: string, data?: any): void {
    if (!this.metadata.changeHistory) {
      this.metadata.changeHistory = [];
    }
    this.metadata.changeHistory.push({
      timestamp: new Date(),
      action,
      newValue: data,
      performedBy: 'system',
    });
  }

  static createTrialSubscription(
    organizationId: string,
    planId: string,
    trialDays: number,
  ): Partial<Subscription> {
    const now = new Date();
    const trialEnd = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

    return {
      organizationId,
      planId,
      status: SubscriptionStatus.TRIALING,
      currentPeriodStart: now,
      currentPeriodEnd: trialEnd,
      trialStart: now,
      trialEnd,
      quantity: 1,
      amountCents: 0,
      currency: 'USD',
      taxCents: 0,
      discountCents: 0,
      billingConfig: {
        prorate: true,
        dunningEnabled: true,
        maxRetryAttempts: 3,
        retrySchedule: [1, 3, 7],
        invoiceReminders: true,
        paymentFailureNotifications: true,
        renewalReminders: true,
      },
      usageData: {
        currentUsage: {},
        usageHistory: [],
        usageLimits: {},
        overageCharges: [],
        usageAlerts: [],
      },
      metadata: {
        source: 'web',
        changeHistory: [],
        billingHistory: [],
        communications: [],
      },
    };
  }
}
