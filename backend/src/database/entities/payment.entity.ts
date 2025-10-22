import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Invoice } from './invoice.entity';
import { Subscription } from './subscription.entity';
import { Organization } from './organization.entity';

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELED = 'canceled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  DISPUTED = 'disputed',
  CHARGEBACK = 'chargeback',
}

export enum PaymentMethod {
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  WALLET = 'wallet',
  UPI = 'upi',
  NET_BANKING = 'net_banking',
  EMI = 'emi',
  CRYPTOCURRENCY = 'cryptocurrency',
  CASH = 'cash',
  CHECK = 'check',
}

export enum PaymentProvider {
  STRIPE = 'stripe',
  RAZORPAY = 'razorpay',
  PAYPAL = 'paypal',
  SQUARE = 'square',
  MANUAL = 'manual',
}

export enum PaymentType {
  SUBSCRIPTION = 'subscription',
  ONE_TIME = 'one_time',
  SETUP = 'setup',
  REFUND = 'refund',
  CHARGEBACK = 'chargeback',
}

@Entity('payments')
@Index(['organizationId', 'status'])
@Index(['invoiceId', 'status'])
@Index(['subscriptionId', 'status'])
@Index(['status', 'createdAt'])
@Index(['paymentProvider', 'providerPaymentId'])
@Index(['paymentMethod', 'status'])
export class Payment {
  @ApiProperty({ description: 'Payment ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Organization ID' })
  @Column({ name: 'organization_id' })
  organizationId: string;

  @ApiProperty({ description: 'Invoice ID' })
  @Column({ name: 'invoice_id', nullable: true })
  invoiceId?: string;

  @ApiProperty({ description: 'Subscription ID' })
  @Column({ name: 'subscription_id', nullable: true })
  subscriptionId?: string;

  @ApiProperty({ enum: PaymentStatus, description: 'Payment status' })
  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @ApiProperty({ enum: PaymentType, description: 'Payment type' })
  @Column({
    type: 'enum',
    enum: PaymentType,
    default: PaymentType.ONE_TIME,
  })
  type: PaymentType;

  @ApiProperty({ enum: PaymentProvider, description: 'Payment provider' })
  @Column({
    type: 'enum',
    enum: PaymentProvider,
  })
  paymentProvider: PaymentProvider;

  @ApiProperty({ description: 'Provider payment ID' })
  @Column({ name: 'provider_payment_id', nullable: true })
  providerPaymentId?: string;

  @ApiProperty({ enum: PaymentMethod, description: 'Payment method' })
  @Column({
    type: 'enum',
    enum: PaymentMethod,
  })
  paymentMethod: PaymentMethod;

  @ApiProperty({ description: 'Payment amount in cents' })
  @Column({ name: 'amount_cents', type: 'bigint' })
  amountCents: number;

  @ApiProperty({ description: 'Currency code' })
  @Column({ length: 3 })
  currency: string;

  @ApiProperty({ description: 'Processing fee in cents' })
  @Column({ name: 'fee_cents', type: 'bigint', default: 0 })
  feeCents: number;

  @ApiProperty({ description: 'Net amount after fees in cents' })
  @Column({ name: 'net_amount_cents', type: 'bigint' })
  netAmountCents: number;

  @ApiProperty({ description: 'Refunded amount in cents' })
  @Column({ name: 'refunded_amount_cents', type: 'bigint', default: 0 })
  refundedAmountCents: number;

  @ApiProperty({ description: 'Payment description' })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ description: 'Payment method details' })
  @Column({ name: 'payment_method_details', type: 'jsonb', default: {} })
  paymentMethodDetails: {
    // Card details
    card?: {
      brand: string;
      last4: string;
      expMonth: number;
      expYear: number;
      country?: string;
      funding?: 'credit' | 'debit' | 'prepaid';
      fingerprint?: string;
    };
    
    // Bank transfer details
    bankTransfer?: {
      accountType?: string;
      bankName?: string;
      routingNumber?: string;
      accountNumberLast4?: string;
      country?: string;
    };
    
    // UPI details
    upi?: {
      vpa?: string;
      provider?: string;
    };
    
    // Wallet details
    wallet?: {
      provider: string;
      accountId?: string;
    };
    
    // EMI details
    emi?: {
      tenure: number;
      interestRate: number;
      monthlyAmount: number;
      provider: string;
    };
    
    // Cryptocurrency details
    crypto?: {
      currency: string;
      address?: string;
      transactionHash?: string;
      network?: string;
    };
  };

  @ApiProperty({ description: 'Billing address' })
  @Column({ name: 'billing_address', type: 'jsonb', nullable: true })
  billingAddress?: {
    name: string;
    email?: string;
    phone?: string;
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };

  @ApiProperty({ description: 'Payment processing information' })
  @Column({ name: 'processing_info', type: 'jsonb', default: {} })
  processingInfo: {
    // Processing timestamps
    initiatedAt?: Date;
    authorizedAt?: Date;
    capturedAt?: Date;
    settledAt?: Date;
    
    // Processing details
    authorizationCode?: string;
    processorResponseCode?: string;
    processorResponseMessage?: string;
    
    // Risk assessment
    riskScore?: number;
    riskLevel?: 'low' | 'medium' | 'high';
    fraudDetected?: boolean;
    
    // 3D Secure
    threeDSecure?: {
      authenticated: boolean;
      version?: string;
      cavv?: string;
      eci?: string;
    };
    
    // Network transaction details
    networkTransactionId?: string;
    acquirerReferenceNumber?: string;
    
    // Failure details
    failureCode?: string;
    failureMessage?: string;
    failureReason?: string;
    
    // Retry information
    retryAttempt?: number;
    maxRetries?: number;
    nextRetryAt?: Date;
  };

  @ApiProperty({ description: 'Provider-specific data' })
  @Column({ name: 'provider_data', type: 'jsonb', default: {} })
  providerData: {
    // Stripe specific
    stripe?: {
      paymentIntentId: string;
      chargeId?: string;
      paymentMethodId?: string;
      customerId?: string;
      setupIntentId?: string;
      balanceTransactionId?: string;
      receiptUrl?: string;
      metadata?: Record<string, string>;
    };
    
    // Razorpay specific
    razorpay?: {
      paymentId: string;
      orderId?: string;
      customerId?: string;
      invoiceId?: string;
      refundId?: string;
      metadata?: Record<string, string>;
    };
    
    // Other providers
    [key: string]: any;
  };

  @ApiProperty({ description: 'Refund information' })
  @Column({ name: 'refund_info', type: 'jsonb', default: {} })
  refundInfo: {
    refunds?: Array<{
      id: string;
      amount: number; // in cents
      reason?: string;
      status: 'pending' | 'succeeded' | 'failed' | 'canceled';
      createdAt: Date;
      processedAt?: Date;
      providerRefundId?: string;
      metadata?: Record<string, any>;
    }>;
    
    totalRefunded?: number; // in cents
    refundableAmount?: number; // in cents
    refundPolicy?: string;
    refundDeadline?: Date;
  };

  @ApiProperty({ description: 'Dispute and chargeback information' })
  @Column({ name: 'dispute_info', type: 'jsonb', default: {} })
  disputeInfo: {
    disputes?: Array<{
      id: string;
      amount: number; // in cents
      reason: string;
      status: 'warning_needs_response' | 'warning_under_review' | 'warning_closed' | 'needs_response' | 'under_review' | 'charge_refunded' | 'won' | 'lost';
      createdAt: Date;
      evidenceDueBy?: Date;
      evidence?: {
        accessActivityLog?: string;
        billingAddress?: string;
        cancellationPolicy?: string;
        cancellationPolicyDisclosure?: string;
        cancellationRebuttal?: string;
        customerCommunication?: string;
        customerEmailAddress?: string;
        customerName?: string;
        customerPurchaseIp?: string;
        customerSignature?: string;
        duplicateChargeDocumentation?: string;
        duplicateChargeExplanation?: string;
        duplicateChargeId?: string;
        productDescription?: string;
        receipt?: string;
        refundPolicy?: string;
        refundPolicyDisclosure?: string;
        refundRefusalExplanation?: string;
        serviceDate?: string;
        serviceDocumentation?: string;
        shippingAddress?: string;
        shippingCarrier?: string;
        shippingDate?: string;
        shippingDocumentation?: string;
        shippingTrackingNumber?: string;
        uncategorizedFile?: string;
        uncategorizedText?: string;
      };
      providerDisputeId?: string;
    }>;
    
    totalDisputed?: number; // in cents
    hasActiveDisputes?: boolean;
  };

  @ApiProperty({ description: 'Payment metadata and audit trail' })
  @Column({ type: 'jsonb', default: {} })
  metadata: {
    // Source information
    source?: 'web' | 'mobile' | 'api' | 'admin' | 'webhook';
    userAgent?: string;
    ipAddress?: string;
    
    // Customer information
    customerEmail?: string;
    customerPhone?: string;
    customerId?: string;
    
    // Order information
    orderId?: string;
    orderItems?: Array<{
      name: string;
      quantity: number;
      price: number;
    }>;
    
    // Campaign tracking
    campaignId?: string;
    affiliateId?: string;
    referrer?: string;
    
    // Audit trail
    auditTrail?: Array<{
      timestamp: Date;
      action: string;
      performedBy: string;
      oldValue?: any;
      newValue?: any;
      reason?: string;
    }>;
    
    // Notifications
    notifications?: Array<{
      type: 'email' | 'sms' | 'webhook';
      status: 'sent' | 'delivered' | 'failed';
      timestamp: Date;
      recipient?: string;
      template?: string;
    }>;
    
    // Custom fields
    customFields?: Record<string, any>;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Organization, organization => organization.payments)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => Invoice, invoice => invoice.payments, { nullable: true })
  @JoinColumn({ name: 'invoice_id' })
  invoice?: Invoice;

  @ManyToOne(() => Subscription, subscription => subscription.payments, { nullable: true })
  @JoinColumn({ name: 'subscription_id' })
  subscription?: Subscription;

  // Virtual properties
  get isSuccessful(): boolean {
    return this.status === PaymentStatus.SUCCEEDED;
  }

  get isFailed(): boolean {
    return this.status === PaymentStatus.FAILED;
  }

  get isPending(): boolean {
    return [PaymentStatus.PENDING, PaymentStatus.PROCESSING].includes(this.status);
  }

  get isRefunded(): boolean {
    return [PaymentStatus.REFUNDED, PaymentStatus.PARTIALLY_REFUNDED].includes(this.status);
  }

  get isDisputed(): boolean {
    return [PaymentStatus.DISPUTED, PaymentStatus.CHARGEBACK].includes(this.status);
  }

  get displayAmount(): string {
    const amount = this.amountCents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.currency,
    }).format(amount);
  }

  get displayNetAmount(): string {
    const amount = this.netAmountCents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.currency,
    }).format(amount);
  }

  get refundableAmount(): number {
    return Math.max(0, this.amountCents - this.refundedAmountCents);
  }

  get canBeRefunded(): boolean {
    return this.isSuccessful && this.refundableAmount > 0;
  }

  get paymentMethodDisplay(): string {
    const details = this.paymentMethodDetails;
    
    switch (this.paymentMethod) {
      case PaymentMethod.CARD:
        return details.card ? `**** **** **** ${details.card.last4}` : 'Card';
      case PaymentMethod.UPI:
        return details.upi?.vpa || 'UPI';
      case PaymentMethod.WALLET:
        return details.wallet?.provider || 'Wallet';
      case PaymentMethod.BANK_TRANSFER:
        return details.bankTransfer?.bankName || 'Bank Transfer';
      default:
        return this.paymentMethod.replace('_', ' ').toUpperCase();
    }
  }

  // Methods
  markAsSucceeded(providerData?: any): void {
    this.status = PaymentStatus.SUCCEEDED;
    this.processingInfo.capturedAt = new Date();
    this.netAmountCents = this.amountCents - this.feeCents;
    
    if (providerData) {
      Object.assign(this.providerData, providerData);
    }
    
    this.addToAuditTrail('payment_succeeded', 'system');
  }

  markAsFailed(reason: string, code?: string): void {
    this.status = PaymentStatus.FAILED;
    this.processingInfo.failureMessage = reason;
    this.processingInfo.failureCode = code;
    
    this.addToAuditTrail('payment_failed', 'system', { reason, code });
  }

  authorize(authCode?: string): void {
    this.processingInfo.authorizedAt = new Date();
    this.processingInfo.authorizationCode = authCode;
    
    this.addToAuditTrail('payment_authorized', 'system', { authCode });
  }

  capture(): void {
    if (this.status !== PaymentStatus.PROCESSING) {
      throw new Error('Payment must be in processing status to capture');
    }
    
    this.markAsSucceeded();
  }

  refund(amount: number, reason?: string): string {
    if (!this.canBeRefunded) {
      throw new Error('Payment cannot be refunded');
    }
    
    if (amount > this.refundableAmount) {
      throw new Error('Refund amount exceeds refundable amount');
    }
    
    const refundId = `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (!this.refundInfo.refunds) {
      this.refundInfo.refunds = [];
    }
    
    this.refundInfo.refunds.push({
      id: refundId,
      amount,
      reason,
      status: 'pending',
      createdAt: new Date(),
    });
    
    this.refundedAmountCents += amount;
    
    // Update status based on refund amount
    if (this.refundedAmountCents >= this.amountCents) {
      this.status = PaymentStatus.REFUNDED;
    } else {
      this.status = PaymentStatus.PARTIALLY_REFUNDED;
    }
    
    this.refundInfo.totalRefunded = this.refundedAmountCents;
    this.refundInfo.refundableAmount = this.refundableAmount;
    
    this.addToAuditTrail('refund_initiated', 'system', { refundId, amount, reason });
    
    return refundId;
  }

  processRefund(refundId: string, providerRefundId?: string): void {
    const refund = this.refundInfo.refunds?.find(r => r.id === refundId);
    if (!refund) {
      throw new Error('Refund not found');
    }
    
    refund.status = 'succeeded';
    refund.processedAt = new Date();
    refund.providerRefundId = providerRefundId;
    
    this.addToAuditTrail('refund_processed', 'system', { refundId, providerRefundId });
  }

  createDispute(amount: number, reason: string, providerDisputeId?: string): string {
    const disputeId = `disp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (!this.disputeInfo.disputes) {
      this.disputeInfo.disputes = [];
    }
    
    this.disputeInfo.disputes.push({
      id: disputeId,
      amount,
      reason,
      status: 'needs_response',
      createdAt: new Date(),
      evidenceDueBy: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      providerDisputeId,
    });
    
    this.status = PaymentStatus.DISPUTED;
    this.disputeInfo.totalDisputed = (this.disputeInfo.totalDisputed || 0) + amount;
    this.disputeInfo.hasActiveDisputes = true;
    
    this.addToAuditTrail('dispute_created', 'system', { disputeId, amount, reason });
    
    return disputeId;
  }

  updateRiskScore(score: number, level: 'low' | 'medium' | 'high'): void {
    this.processingInfo.riskScore = score;
    this.processingInfo.riskLevel = level;
    
    if (level === 'high') {
      this.processingInfo.fraudDetected = true;
    }
  }

  retry(): void {
    if (this.status !== PaymentStatus.FAILED) {
      throw new Error('Only failed payments can be retried');
    }
    
    this.processingInfo.retryAttempt = (this.processingInfo.retryAttempt || 0) + 1;
    this.status = PaymentStatus.PENDING;
    
    // Calculate next retry time with exponential backoff
    const backoffMinutes = Math.pow(2, this.processingInfo.retryAttempt) * 5; // 5, 10, 20, 40 minutes
    this.processingInfo.nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);
    
    this.addToAuditTrail('payment_retried', 'system', { 
      attempt: this.processingInfo.retryAttempt,
      nextRetryAt: this.processingInfo.nextRetryAt,
    });
  }

  cancel(reason?: string): void {
    if (this.isSuccessful) {
      throw new Error('Cannot cancel a successful payment');
    }
    
    this.status = PaymentStatus.CANCELED;
    this.addToAuditTrail('payment_canceled', 'system', { reason });
  }

  private addToAuditTrail(action: string, performedBy: string, data?: any): void {
    if (!this.metadata.auditTrail) {
      this.metadata.auditTrail = [];
    }
    
    this.metadata.auditTrail.push({
      timestamp: new Date(),
      action,
      performedBy,
      newValue: data,
    });
  }

  // Static helper methods
  static createFromInvoice(
    invoice: Invoice,
    paymentProvider: PaymentProvider,
    paymentMethod: PaymentMethod,
  ): Partial<Payment> {
    return {
      organizationId: invoice.organizationId,
      invoiceId: invoice.id,
      subscriptionId: invoice.subscriptionId,
      status: PaymentStatus.PENDING,
      type: invoice.type === 'subscription' ? PaymentType.SUBSCRIPTION : PaymentType.ONE_TIME,
      paymentProvider,
      paymentMethod,
      amountCents: invoice.amountDueCents,
      currency: invoice.currency,
      feeCents: 0,
      netAmountCents: 0,
      refundedAmountCents: 0,
      description: `Payment for invoice ${invoice.invoiceNumber}`,
      paymentMethodDetails: {},
      processingInfo: {
        initiatedAt: new Date(),
        maxRetries: 3,
      },
      providerData: {},
      refundInfo: {
        refunds: [],
        totalRefunded: 0,
        refundableAmount: invoice.amountDueCents,
      },
      disputeInfo: {
        disputes: [],
        totalDisputed: 0,
        hasActiveDisputes: false,
      },
      metadata: {
        source: 'web',
        auditTrail: [],
        notifications: [],
      },
    };
  }

  static calculateProcessingFee(
    amount: number,
    paymentMethod: PaymentMethod,
    paymentProvider: PaymentProvider,
  ): number {
    // This would contain actual fee calculation logic based on provider and method
    // For now, using sample rates
    
    const feeRates = {
      [PaymentProvider.STRIPE]: {
        [PaymentMethod.CARD]: 0.029, // 2.9% + 30 cents
        [PaymentMethod.BANK_TRANSFER]: 0.008, // 0.8%
        [PaymentMethod.WALLET]: 0.025, // 2.5%
      },
      [PaymentProvider.RAZORPAY]: {
        [PaymentMethod.CARD]: 0.02, // 2%
        [PaymentMethod.UPI]: 0.005, // 0.5%
        [PaymentMethod.NET_BANKING]: 0.015, // 1.5%
        [PaymentMethod.WALLET]: 0.02, // 2%
      },
    };
    
    const rate = feeRates[paymentProvider]?.[paymentMethod] || 0.025;
    const percentageFee = Math.round(amount * rate);
    const fixedFee = paymentMethod === PaymentMethod.CARD ? 30 : 0; // 30 cents for cards
    
    return percentageFee + fixedFee;
  }
}
