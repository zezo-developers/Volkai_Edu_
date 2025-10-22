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
import { Subscription } from './subscription.entity';
import { Organization } from './organization.entity';
import { Payment } from './payment.entity';

export enum InvoiceStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  PAID = 'paid',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  VOID = 'void',
}

export enum InvoiceType {
  SUBSCRIPTION = 'subscription',
  ONE_TIME = 'one_time',
  USAGE = 'usage',
  CREDIT_NOTE = 'credit_note',
  PRORATED = 'prorated',
}

@Entity('invoices')
@Index(['organizationId', 'status'])
@Index(['subscriptionId', 'status'])
@Index(['status', 'dueDate'])
@Index(['invoiceNumber'], { unique: true })
@Index(['createdAt'])
export class Invoice {
  @ApiProperty({ description: 'Invoice ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Invoice number (human-readable)' })
  @Column({ name: 'invoice_number', unique: true })
  invoiceNumber: string;

  @ApiProperty({ description: 'Organization ID' })
  @Column({ name: 'organization_id' })
  organizationId: string;

  @ApiProperty({ description: 'Subscription ID' })
  @Column({ name: 'subscription_id', nullable: true })
  subscriptionId?: string;

  @ApiProperty({ enum: InvoiceStatus, description: 'Invoice status' })
  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.DRAFT,
  })
  status: InvoiceStatus;

  @ApiProperty({ enum: InvoiceType, description: 'Invoice type' })
  @Column({
    type: 'enum',
    enum: InvoiceType,
    default: InvoiceType.SUBSCRIPTION,
  })
  type: InvoiceType;

  @ApiProperty({ description: 'Invoice issue date' })
  @Column({ name: 'issue_date', type: 'timestamp' })
  issueDate: Date;

  @ApiProperty({ description: 'Invoice due date' })
  @Column({ name: 'due_date', type: 'timestamp' })
  dueDate: Date;

  @ApiProperty({ description: 'Billing period start' })
  @Column({ name: 'period_start', type: 'timestamp', nullable: true })
  periodStart?: Date;

  @ApiProperty({ description: 'Billing period end' })
  @Column({ name: 'period_end', type: 'timestamp', nullable: true })
  periodEnd?: Date;

  @ApiProperty({ description: 'Subtotal amount in cents' })
  @Column({ name: 'subtotal_cents', type: 'bigint' })
  subtotalCents: number;

  @ApiProperty({ description: 'Tax amount in cents' })
  @Column({ name: 'tax_cents', type: 'bigint', default: 0 })
  taxCents: number;

  @ApiProperty({ description: 'Discount amount in cents' })
  @Column({ name: 'discount_cents', type: 'bigint', default: 0 })
  discountCents: number;

  @ApiProperty({ description: 'Total amount in cents' })
  @Column({ name: 'total_cents', type: 'bigint' })
  totalCents: number;

  @ApiProperty({ description: 'Amount paid in cents' })
  @Column({ name: 'amount_paid_cents', type: 'bigint', default: 0 })
  amountPaidCents: number;

  @ApiProperty({ description: 'Amount due in cents' })
  @Column({ name: 'amount_due_cents', type: 'bigint' })
  amountDueCents: number;

  @ApiProperty({ description: 'Currency code' })
  @Column({ length: 3 })
  currency: string;

  @ApiProperty({ description: 'Invoice line items' })
  @Column({ name: 'line_items', type: 'jsonb', default: [] })
  lineItems: Array<{
    id: string;
    type: 'subscription' | 'usage' | 'one_time' | 'discount' | 'tax';
    description: string;
    quantity: number;
    unitPrice: number; // in cents
    totalPrice: number; // in cents
    
    // Subscription specific
    planId?: string;
    planName?: string;
    periodStart?: Date;
    periodEnd?: Date;
    
    // Usage specific
    usageMetric?: string;
    usageQuantity?: number;
    usageUnitPrice?: number;
    
    // Tax specific
    taxRate?: number;
    taxType?: string;
    taxJurisdiction?: string;
    
    // Discount specific
    discountType?: 'percentage' | 'fixed';
    discountValue?: number;
    couponCode?: string;
    
    // Metadata
    metadata?: Record<string, any>;
  }>;

  @ApiProperty({ description: 'Tax breakdown' })
  @Column({ name: 'tax_breakdown', type: 'jsonb', default: [] })
  taxBreakdown: Array<{
    type: string;
    rate: number;
    amount: number; // in cents
    jurisdiction: string;
    taxableAmount: number; // in cents
  }>;

  @ApiProperty({ description: 'Applied discounts and coupons' })
  @Column({ name: 'discounts', type: 'jsonb', default: [] })
  discounts: Array<{
    id: string;
    code?: string;
    name: string;
    type: 'percentage' | 'fixed';
    value: number;
    amount: number; // in cents
    appliedTo: string[]; // line item IDs
  }>;

  @ApiProperty({ description: 'Billing address' })
  @Column({ name: 'billing_address', type: 'jsonb', nullable: true })
  billingAddress?: {
    name: string;
    company?: string;
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
    taxId?: string;
  };

  @ApiProperty({ description: 'Invoice delivery information' })
  @Column({ name: 'delivery_info', type: 'jsonb', default: {} })
  deliveryInfo: {
    // Email delivery
    emailSent?: boolean;
    emailSentAt?: Date;
    emailRecipients?: string[];
    
    // PDF generation
    pdfGenerated?: boolean;
    pdfGeneratedAt?: Date;
    pdfUrl?: string;
    
    // Print delivery
    printRequested?: boolean;
    printAddress?: Record<string, any>;
    
    // Delivery status
    deliveryAttempts?: Array<{
      timestamp: Date;
      method: 'email' | 'pdf' | 'print';
      status: 'success' | 'failed';
      error?: string;
    }>;
  };

  @ApiProperty({ description: 'Payment terms and conditions' })
  @Column({ name: 'payment_terms', type: 'jsonb', default: {} })
  paymentTerms: {
    // Payment terms
    paymentDueDays?: number;
    lateFeePercentage?: number;
    lateFeeFixed?: number; // in cents
    
    // Payment methods
    acceptedPaymentMethods?: string[];
    preferredPaymentMethod?: string;
    
    // Collection settings
    autoCollectionEnabled?: boolean;
    maxCollectionAttempts?: number;
    collectionSchedule?: number[]; // Days after due date
    
    // Dunning settings
    dunningEnabled?: boolean;
    dunningSchedule?: Array<{
      daysAfterDue: number;
      action: 'email' | 'sms' | 'call' | 'suspend';
      template?: string;
    }>;
    
    // Legal terms
    termsAndConditions?: string;
    notes?: string;
  };

  @ApiProperty({ description: 'External provider data' })
  @Column({ name: 'provider_data', type: 'jsonb', default: {} })
  providerData: {
    // Stripe integration
    stripe?: {
      invoiceId: string;
      paymentIntentId?: string;
      chargeId?: string;
      customerId: string;
      subscriptionId?: string;
      metadata?: Record<string, string>;
    };
    
    // Razorpay integration
    razorpay?: {
      invoiceId: string;
      orderId?: string;
      customerId: string;
      subscriptionId?: string;
      metadata?: Record<string, string>;
    };
    
    // Other providers
    [key: string]: any;
  };

  @ApiProperty({ description: 'Invoice metadata and audit trail' })
  @Column({ type: 'jsonb', default: {} })
  metadata: {
    // Source information
    source?: 'subscription' | 'manual' | 'api' | 'usage';
    createdBy?: string;
    
    // Processing information
    processingStarted?: Date;
    processingCompleted?: Date;
    processingErrors?: string[];
    
    // Payment tracking
    paymentAttempts?: Array<{
      timestamp: Date;
      amount: number;
      paymentMethodId?: string;
      status: 'success' | 'failed' | 'pending';
      error?: string;
      transactionId?: string;
    }>;
    
    // Communication history
    communications?: Array<{
      timestamp: Date;
      type: 'email' | 'sms' | 'call' | 'letter';
      template?: string;
      recipient?: string;
      status: 'sent' | 'delivered' | 'failed';
      response?: string;
    }>;
    
    // Dispute information
    disputes?: Array<{
      timestamp: Date;
      reason: string;
      amount: number;
      status: 'open' | 'resolved' | 'lost';
      resolution?: string;
    }>;
    
    // Audit trail
    auditTrail?: Array<{
      timestamp: Date;
      action: string;
      performedBy: string;
      oldValue?: any;
      newValue?: any;
      reason?: string;
    }>;
    
    // Custom metadata
    customFields?: Record<string, any>;
  };

  @ApiProperty({ description: 'Invoice finalization date' })
  @Column({ name: 'finalized_at', type: 'timestamp', nullable: true })
  finalizedAt?: Date;

  @ApiProperty({ description: 'Invoice paid date' })
  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt?: Date;

  @ApiProperty({ description: 'Invoice void date' })
  @Column({ name: 'voided_at', type: 'timestamp', nullable: true })
  voidedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Organization, organization => organization.invoices)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => Subscription, subscription => subscription.invoices, { nullable: true })
  @JoinColumn({ name: 'subscription_id' })
  subscription?: Subscription;

  @OneToMany(() => Payment, payment => payment.invoice)
  payments: Payment[];

  // Virtual properties
  get isPaid(): boolean {
    return this.status === InvoiceStatus.PAID;
  }

  get isPastDue(): boolean {
    return this.status === InvoiceStatus.PAST_DUE || 
           (this.status === InvoiceStatus.OPEN && new Date() > this.dueDate);
  }

  get isVoid(): boolean {
    return this.status === InvoiceStatus.VOID;
  }

  get isCanceled(): boolean {
    return this.status === InvoiceStatus.CANCELED;
  }

  get isOpen(): boolean {
    return this.status === InvoiceStatus.OPEN;
  }

  get isDraft(): boolean {
    return this.status === InvoiceStatus.DRAFT;
  }

  get daysOverdue(): number {
    if (!this.isPastDue) return 0;
    const now = new Date();
    const diffTime = now.getTime() - this.dueDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  get daysToDue(): number {
    const now = new Date();
    const diffTime = this.dueDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  get displayTotal(): string {
    const amount = this.totalCents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.currency,
    }).format(amount);
  }

  get displayAmountDue(): string {
    const amount = this.amountDueCents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.currency,
    }).format(amount);
  }

  get isFullyPaid(): boolean {
    return this.amountDueCents <= 0;
  }

  get isPartiallyPaid(): boolean {
    return this.amountPaidCents > 0 && this.amountDueCents > 0;
  }

  // Methods
  addLineItem(item: Partial<Invoice['lineItems'][0]>): void {
    const lineItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: item.type || 'one_time',
      description: item.description || '',
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || 0,
      totalPrice: item.totalPrice || (item.quantity || 1) * (item.unitPrice || 0),
      ...item,
    } as Invoice['lineItems'][0];

    this.lineItems.push(lineItem);
    this.recalculateAmounts();
  }

  removeLineItem(itemId: string): boolean {
    const initialLength = this.lineItems.length;
    this.lineItems = this.lineItems.filter(item => item.id !== itemId);
    
    if (this.lineItems.length < initialLength) {
      this.recalculateAmounts();
      return true;
    }
    return false;
  }

  updateLineItem(itemId: string, updates: Partial<Invoice['lineItems'][0]>): boolean {
    const item = this.lineItems.find(item => item.id === itemId);
    if (!item) return false;

    Object.assign(item, updates);
    
    // Recalculate total price if quantity or unit price changed
    if (updates.quantity !== undefined || updates.unitPrice !== undefined) {
      item.totalPrice = item.quantity * item.unitPrice;
    }

    this.recalculateAmounts();
    return true;
  }

  applyDiscount(discount: Partial<Invoice['discounts'][0]>): void {
    const discountItem = {
      id: `discount_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: discount.name || 'Discount',
      type: discount.type || 'fixed',
      value: discount.value || 0,
      amount: 0,
      appliedTo: discount.appliedTo || [],
      ...discount,
    } as Invoice['discounts'][0];

    // Calculate discount amount
    if (discountItem.type === 'percentage') {
      discountItem.amount = Math.round(this.subtotalCents * (discountItem.value / 100));
    } else {
      discountItem.amount = discountItem.value;
    }

    this.discounts.push(discountItem);
    this.recalculateAmounts();
  }

  removeDiscount(discountId: string): boolean {
    const initialLength = this.discounts.length;
    this.discounts = this.discounts.filter(discount => discount.id !== discountId);
    
    if (this.discounts.length < initialLength) {
      this.recalculateAmounts();
      return true;
    }
    return false;
  }

  addTax(taxInfo: Partial<Invoice['taxBreakdown'][0]>): void {
    const tax = {
      type: taxInfo.type || 'sales_tax',
      rate: taxInfo.rate || 0,
      amount: 0,
      jurisdiction: taxInfo.jurisdiction || 'unknown',
      taxableAmount: this.subtotalCents - this.discountCents,
      ...taxInfo,
    } as Invoice['taxBreakdown'][0];

    tax.amount = Math.round(tax.taxableAmount * (tax.rate / 100));
    
    this.taxBreakdown.push(tax);
    this.recalculateAmounts();
  }

  recalculateAmounts(): void {
    // Calculate subtotal from line items
    this.subtotalCents = this.lineItems.reduce((sum, item) => sum + item.totalPrice, 0);

    // Calculate total discount
    this.discountCents = this.discounts.reduce((sum, discount) => sum + discount.amount, 0);

    // Calculate total tax
    this.taxCents = this.taxBreakdown.reduce((sum, tax) => sum + tax.amount, 0);

    // Calculate total
    this.totalCents = this.subtotalCents - this.discountCents + this.taxCents;

    // Update amount due
    this.amountDueCents = this.totalCents - this.amountPaidCents;
  }

  finalize(): void {
    if (this.status !== InvoiceStatus.DRAFT) return;

    this.status = InvoiceStatus.OPEN;
    this.finalizedAt = new Date();
    this.recalculateAmounts();

    this.addToAuditTrail('finalized', 'system');
  }

  markAsPaid(paymentAmount: number, paymentDate: Date = new Date()): void {
    this.amountPaidCents += paymentAmount;
    this.amountDueCents = Math.max(0, this.totalCents - this.amountPaidCents);

    if (this.amountDueCents <= 0) {
      this.status = InvoiceStatus.PAID;
      this.paidAt = paymentDate;
    }

    this.addToAuditTrail('payment_received', 'system', { amount: paymentAmount });
  }

  markAsPastDue(): void {
    if (this.status === InvoiceStatus.OPEN && new Date() > this.dueDate) {
      this.status = InvoiceStatus.PAST_DUE;
      this.addToAuditTrail('marked_past_due', 'system');
    }
  }

  void(reason?: string): void {
    if (this.isPaid) {
      throw new Error('Cannot void a paid invoice');
    }

    this.status = InvoiceStatus.VOID;
    this.voidedAt = new Date();
    this.addToAuditTrail('voided', 'system', { reason });
  }

  cancel(reason?: string): void {
    if (this.isPaid) {
      throw new Error('Cannot cancel a paid invoice');
    }

    this.status = InvoiceStatus.CANCELED;
    this.addToAuditTrail('canceled', 'system', { reason });
  }

  generatePDF(): Promise<string> {
    // This would integrate with a PDF generation service
    // For now, return a placeholder URL
    const pdfUrl = `/invoices/${this.id}/pdf`;
    
    this.deliveryInfo.pdfGenerated = true;
    this.deliveryInfo.pdfGeneratedAt = new Date();
    this.deliveryInfo.pdfUrl = pdfUrl;

    return Promise.resolve(pdfUrl);
  }

  sendByEmail(recipients: string[]): void {
    this.deliveryInfo.emailSent = true;
    this.deliveryInfo.emailSentAt = new Date();
    this.deliveryInfo.emailRecipients = recipients;

    if (!this.deliveryInfo.deliveryAttempts) {
      this.deliveryInfo.deliveryAttempts = [];
    }

    this.deliveryInfo.deliveryAttempts.push({
      timestamp: new Date(),
      method: 'email',
      status: 'success', // This would be determined by actual email service
    });

    this.addToAuditTrail('email_sent', 'system', { recipients });
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
  static generateInvoiceNumber(prefix: string = 'INV'): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const timestamp = now.getTime().toString().slice(-6);
    
    return `${prefix}-${year}${month}-${timestamp}`;
  }

  static createFromSubscription(
    subscription: Subscription,
    periodStart: Date,
    periodEnd: Date,
  ): Partial<Invoice> {
    const now = new Date();
    const dueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    return {
      invoiceNumber: Invoice.generateInvoiceNumber(),
      organizationId: subscription.organizationId,
      subscriptionId: subscription.id,
      status: InvoiceStatus.DRAFT,
      type: InvoiceType.SUBSCRIPTION,
      issueDate: now,
      dueDate,
      periodStart,
      periodEnd,
      subtotalCents: subscription.amountCents,
      taxCents: subscription.taxCents,
      discountCents: subscription.discountCents,
      totalCents: subscription.totalAmount,
      amountPaidCents: 0,
      amountDueCents: subscription.totalAmount,
      currency: subscription.currency,
      lineItems: [
        {
          id: `sub_${subscription.id}`,
          type: 'subscription',
          description: `Subscription for ${periodStart.toDateString()} - ${periodEnd.toDateString()}`,
          quantity: subscription.quantity,
          unitPrice: subscription.amountCents,
          totalPrice: subscription.amountCents * subscription.quantity,
          planId: subscription.planId,
          periodStart,
          periodEnd,
        },
      ],
      taxBreakdown: [],
      discounts: [],
      deliveryInfo: {},
      paymentTerms: {
        paymentDueDays: 30,
        autoCollectionEnabled: true,
        maxCollectionAttempts: 3,
        collectionSchedule: [1, 7, 14],
        dunningEnabled: true,
        dunningSchedule: [
          { daysAfterDue: 1, action: 'email', template: 'payment_reminder' },
          { daysAfterDue: 7, action: 'email', template: 'payment_overdue' },
          { daysAfterDue: 14, action: 'email', template: 'final_notice' },
        ],
      },
      providerData: {},
      metadata: {
        source: 'subscription',
        auditTrail: [],
      },
    };
  }
}
