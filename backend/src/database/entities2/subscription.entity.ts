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
  @Column({ name: 'organization_id' })
  organizationId: string;

  @ApiProperty({ description: 'Plan ID' })
  @Column({ name: 'plan_id' })
  planId: string;

  @ApiProperty({ enum: SubscriptionStatus, description: 'Subscription status' })
  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.INCOMPLETE,
  })
  status: SubscriptionStatus;

  @ApiProperty({ description: 'Current period start date' })
  @Column({ name: 'current_period_start', type: 'timestamp' })
  currentPeriodStart: Date;

  @ApiProperty({ description: 'Current period end date' })
  @Column({ name: 'current_period_end', type: 'timestamp' })
  currentPeriodEnd: Date;

  @ApiProperty({ description: 'Trial start date' })
  @Column({ name: 'trial_start', type: 'timestamp', nullable: true })
  trialStart?: Date;

  @ApiProperty({ description: 'Trial end date' })
  @Column({ name: 'trial_end', type: 'timestamp', nullable: true })
  trialEnd?: Date;

  @ApiProperty({ description: 'Cancellation date' })
  @Column({ name: 'cancel_at', type: 'timestamp', nullable: true })
  cancelAt?: Date;

  @ApiProperty({ description: 'Actual cancellation date' })
  @Column({ name: 'canceled_at', type: 'timestamp', nullable: true })
  canceledAt?: Date;

  @ApiProperty({ enum: SubscriptionCancelReason, description: 'Cancellation reason' })
  @Column({
    type: 'enum',
    enum: SubscriptionCancelReason,
    nullable: true,
  })
  cancelReason?: SubscriptionCancelReason;

  @ApiProperty({ description: 'Pause start date' })
  @Column({ name: 'pause_start', type: 'timestamp', nullable: true })
  pauseStart?: Date;

  @ApiProperty({ description: 'Pause end date' })
  @Column({ name: 'pause_end', type: 'timestamp', nullable: true })
  pauseEnd?: Date;

  @ApiProperty({ description: 'Quantity of the subscription' })
  @Column({ default: 1 })
  quantity: number;

  @ApiProperty({ description: 'Subscription amount in cents' })
  @Column({ name: 'amount_cents', type: 'bigint' })
  amountCents: number;

  @ApiProperty({ description: 'Currency code' })
  @Column({ length: 3 })
  currency: string;

  @ApiProperty({ description: 'Tax amount in cents' })
  @Column({ name: 'tax_cents', type: 'bigint', default: 0 })
  taxCents: number;

  @ApiProperty({ description: 'Discount amount in cents' })
  @Column({ name: 'discount_cents', type: 'bigint', default: 0 })
  discountCents: number;

  @ApiProperty({ description: 'Billing configuration and settings' })
  @Column({ name: 'billing_config', type: 'jsonb', default: {} })
  billingConfig: {
    // Payment method
    paymentMethodId?: string;
    defaultPaymentMethod?: string;
    
    // Billing cycle
    billingCycleAnchor?: number; // Day of month for billing
    prorate?: boolean;
    
    // Dunning management
    dunningEnabled?: boolean;
    maxRetryAttempts?: number;
    retrySchedule?: number[]; // Days between retries
    
    // Notifications
    invoiceReminders?: boolean;
    paymentFailureNotifications?: boolean;
    renewalReminders?: boolean;
    
    // Tax configuration
    taxExempt?: boolean;
    taxId?: string;
    taxRates?: Array<{
      type: string;
      rate: number;
      jurisdiction: string;
    }>;
    
    // Discounts and coupons
    appliedCoupons?: Array<{
      id: string;
      code: string;
      type: 'percentage' | 'fixed';
      value: number;
      expiresAt?: Date;
    }>;
    
    // Usage-based billing
    usageBasedBilling?: boolean;
    meteringEnabled?: boolean;
    
    // Custom fields
    customFields?: Record<string, any>;
  };

  @ApiProperty({ description: 'Usage tracking and limits' })
  @Column({ name: 'usage_data', type: 'jsonb', default: {} })
  usageData: {
    // Current usage
    currentUsage?: Record<string, number>;
    
    // Usage history
    usageHistory?: Array<{
      date: Date;
      metric: string;
      value: number;
      resetType?: 'daily' | 'monthly' | 'billing_cycle';
    }>;
    
    // Usage limits
    usageLimits?: Record<string, {
      limit: number;
      current: number;
      resetDate: Date;
      overage: number;
      overageAllowed: boolean;
    }>;
    
    // Overage charges
    overageCharges?: Array<{
      metric: string;
      units: number;
      pricePerUnit: number;
      totalAmount: number;
      billingPeriod: string;
    }>;
    
    // Usage alerts
    usageAlerts?: Array<{
      metric: string;
      threshold: number;
      triggered: boolean;
      triggeredAt?: Date;
    }>;
  };

  @ApiProperty({ description: 'External provider integration data' })
  @Column({ name: 'provider_data', type: 'jsonb', default: {} })
  providerData: {
    // Stripe integration
    stripe?: {
      subscriptionId: string;
      customerId: string;
      priceId: string;
      paymentMethodId?: string;
      invoiceSettings?: Record<string, any>;
      metadata?: Record<string, string>;
    };
    
    // Razorpay integration
    razorpay?: {
      subscriptionId: string;
      customerId: string;
      planId: string;
      paymentMethodId?: string;
      metadata?: Record<string, string>;
    };
    
    // Other providers
    [key: string]: any;
  };

  @ApiProperty({ description: 'Subscription metadata and history' })
  @Column({ type: 'jsonb', default: {} })
  metadata: {
    // Source information
    source?: 'web' | 'api' | 'admin' | 'migration';
    createdBy?: string;
    
    // Change history
    changeHistory?: Array<{
      timestamp: Date;
      action: string;
      oldValue?: any;
      newValue?: any;
      reason?: string;
      performedBy?: string;
    }>;
    
    // Billing history
    billingHistory?: Array<{
      date: Date;
      action: 'created' | 'renewed' | 'upgraded' | 'downgraded' | 'paused' | 'resumed' | 'canceled';
      amount: number;
      planId: string;
      invoiceId?: string;
    }>;
    
    // Customer communication
    communications?: Array<{
      date: Date;
      type: 'email' | 'sms' | 'push' | 'in_app';
      template: string;
      status: 'sent' | 'delivered' | 'failed';
      reason?: string;
    }>;
    
    // Analytics
    analytics?: {
      lifetimeValue: number;
      churnRisk?: number;
      engagementScore?: number;
      lastActivityDate?: Date;
    };
    
    // Custom metadata
    customMetadata?: Record<string, any>;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Organization, organization => organization.subscriptions)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => Plan, plan => plan.subscriptions)
  @JoinColumn({ name: 'plan_id' })
  plan: Plan;

  @OneToMany(() => Invoice, invoice => invoice.subscription)
  invoices: Invoice[];

  @OneToMany(() => Payment, payment => payment.subscription)
  payments: Payment[];

  // Virtual properties
  get isActive(): boolean {
    return [
      SubscriptionStatus.ACTIVE,
      SubscriptionStatus.TRIALING,
    ].includes(this.status);
  }

  get isCanceled(): boolean {
    return [
      SubscriptionStatus.CANCELED,
      SubscriptionStatus.INCOMPLETE_EXPIRED,
    ].includes(this.status);
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

    // Update current usage
    this.usageData.currentUsage[metric] = (this.usageData.currentUsage[metric] || 0) + amount;

    // Add to history
    this.usageData.usageHistory.push({
      date,
      metric,
      value: amount,
      resetType: 'billing_cycle',
    });

    // Check usage limits and alerts
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
    
    // Extend current period by pause duration if paused
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
    
    // Extend subscription if it was canceled
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
    
    // Reset usage for new billing cycle
    this.resetUsage();
    
    this.addToHistory('renewed', {
      newPeriodStart: this.currentPeriodStart,
      newPeriodEnd: this.currentPeriodEnd,
    });
  }

  private calculateNextPeriodEnd(startDate: Date): Date {
    const endDate = new Date(startDate);
    
    // This would need to be implemented based on the plan's interval
    // For now, assuming monthly billing
    endDate.setMonth(endDate.getMonth() + 1);
    
    return endDate;
  }

  private checkUsageLimits(metric: string): void {
    const limits = this.usageData.usageLimits?.[metric];
    if (!limits) return;

    const currentUsage = this.getUsage(metric);
    const percentage = (currentUsage / limits.limit) * 100;

    // Check for usage alerts
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
      performedBy: 'system', // This would be set by the service
    });
  }

  // Static helper methods
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
      amountCents: 0, // No charge during trial
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
