import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import  Razorpay from 'razorpay';
import * as crypto from 'crypto';
import { Plan } from '../../../database/entities/plan.entity';
import { Subscription } from '../../../database/entities/subscription.entity';
import { Invoice } from '../../../database/entities/invoice.entity';
import { Payment, PaymentStatus, PaymentMethod, PaymentProvider } from '../../../database/entities/payment.entity';
import { Organization } from '../../../database/entities/organization.entity';

export interface CreateCustomerOptions {
  name: string;
  email: string;
  contact?: string;
  organizationId: string;
  notes?: Record<string, string>;
}

export interface CreateSubscriptionOptions {
  planId: string;
  customerId?: string;
  totalCount?: number;
  quantity?: number;
  customerNotify?: boolean;
  addons?: Array<{
    item: {
      name: string;
      amount: number;
      currency: string;
    };
  }>;
  notes?: Record<string, string>;
  notifyInfo?: {
    notify_phone?: string;
    notify_email?: string;
  };
}

export interface CreateOrderOptions {
  amount: number; // in paise (smallest currency unit)
  currency: string;
  receipt?: string;
  notes?: Record<string, string>;
  partialPayment?: boolean;
}

export interface CreatePaymentLinkOptions {
  amount: number; // in paise
  currency: string;
  description: string;
  customer?: {
    name: string;
    email: string;
    contact?: string;
  };
  notify?: {
    sms?: boolean;
    email?: boolean;
  };
  reminderEnable?: boolean;
  notes?: Record<string, string>;
  callbackUrl?: string;
  callbackMethod?: 'get' | 'post';
}

@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private readonly razorpay: Razorpay;

  constructor(
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
    @InjectRepository(Plan)
    private planRepository: Repository<Plan>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
  ) {
    const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');

    if (!keyId || !keySecret) {
      throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required');
    }

    this.razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  // Customer Management
  async createCustomer(options: CreateCustomerOptions): Promise<any> {
    try {
      const customer = await this.razorpay.customers.create({
        name: options.name,
        email: options.email,
        contact: options.contact,
        notes: {
          organizationId: options.organizationId,
          ...options.notes,
        },
      });

      this.logger.log(`Razorpay customer created: ${customer.id} for organization: ${options.organizationId}`);

      // Emit event for customer creation
      this.eventEmitter.emit('razorpay.customer.created', {
        customerId: customer.id,
        organizationId: options.organizationId,
        customer,
      });

      return customer;
    } catch (error) {
      this.logger.error('Failed to create Razorpay customer', error);
      throw new InternalServerErrorException('Failed to create customer');
    }
  }

  async getCustomer(customerId: string): Promise<any> {
    try {
      const customer = await this.razorpay.customers.fetch(customerId);
      return customer;
    } catch (error) {
      this.logger.error(`Failed to retrieve Razorpay customer: ${customerId}`, error);
      throw new BadRequestException('Customer not found');
    }
  }

  async updateCustomer(customerId: string, updates: Partial<CreateCustomerOptions>): Promise<any> {
    try {
      const customer = await this.razorpay.customers.edit(customerId, {
        name: updates.name,
        email: updates.email,
        contact: updates.contact,
      });

      this.logger.log(`Razorpay customer updated: ${customerId}`);
      return customer;
    } catch (error) {
      this.logger.error(`Failed to update Razorpay customer: ${customerId}`, error);
      throw new InternalServerErrorException('Failed to update customer');
    }
  }

  // Plan Management
  async createPlan(plan: Plan): Promise<any> {
    try {
      const razorpayPlan = await this.razorpay.plans.create({
        period: this.mapPlanIntervalToRazorpay(plan.interval) as any,
        interval: 1,
        item: {
          name: plan.name,
          amount: plan.priceAmount,
          currency: plan.currency,
          description: plan.description,
        },
        notes: {
          planId: plan.id,
          planType: plan.planType,
        },
      });

      this.logger.log(`Razorpay plan created: ${razorpayPlan.id} for plan: ${plan.id}`);
      return razorpayPlan;
    } catch (error) {
      this.logger.error(`Failed to create Razorpay plan for plan: ${plan.id}`, error);
      throw new InternalServerErrorException('Failed to create plan');
    }
  }

  async getPlan(planId: string): Promise<any> {
    try {
      const plan = await this.razorpay.plans.fetch(planId);
      return plan;
    } catch (error) {
      this.logger.error(`Failed to retrieve Razorpay plan: ${planId}`, error);
      throw new BadRequestException('Plan not found');
    }
  }

  // Subscription Management
  async createSubscription(options: CreateSubscriptionOptions): Promise<any> {
    try {
      const subscriptionData: any = {
        plan_id: options.planId,
        total_count: options.totalCount || 12, // Default to 12 billing cycles
        quantity: options.quantity || 1,
        customer_notify: options.customerNotify !== false,
        notes: options.notes || {},
      };

      if (options.customerId) {
        subscriptionData.customer_id = options.customerId;
      }

      if (options.addons && options.addons.length > 0) {
        subscriptionData.addons = options.addons;
      }

      if (options.notifyInfo) {
        subscriptionData.notify_info = options.notifyInfo;
      }

      const subscription = await this.razorpay.subscriptions.create(subscriptionData);

      this.logger.log(`Razorpay subscription created: ${subscription.id}`);

      // Emit event for subscription creation
      this.eventEmitter.emit('razorpay.subscription.created', {
        subscriptionId: subscription.id,
        subscription,
      });

      return subscription;
    } catch (error) {
      this.logger.error('Failed to create Razorpay subscription', error);
      throw new InternalServerErrorException('Failed to create subscription');
    }
  }

  async getSubscription(subscriptionId: string): Promise<any> {
    try {
      const subscription = await this.razorpay.subscriptions.fetch(subscriptionId);
      return subscription;
    } catch (error) {
      this.logger.error(`Failed to retrieve Razorpay subscription: ${subscriptionId}`, error);
      throw new BadRequestException('Subscription not found');
    }
  }

  async cancelSubscription(subscriptionId: string, cancelAtCycleEnd: any ): Promise<any> {
    try {
      const subscription = await this.razorpay.subscriptions.cancel(subscriptionId, cancelAtCycleEnd);


      this.logger.log(`Razorpay subscription canceled: ${subscriptionId}, at cycle end: ${cancelAtCycleEnd}`);

      // Emit event for subscription cancellation
      this.eventEmitter.emit('razorpay.subscription.canceled', {
        subscriptionId,
        cancelAtCycleEnd,
        subscription,
      });

      return subscription;
    } catch (error) {
      this.logger.error(`Failed to cancel Razorpay subscription: ${subscriptionId}`, error);
      throw new InternalServerErrorException('Failed to cancel subscription');
    }
  }

  async pauseSubscription(subscriptionId: string, pauseAt?: number): Promise<any> {
    try {
      const pauseData: any = {};
      if (pauseAt) {
        pauseData.pause_at = pauseAt;
      }

      const subscription = await this.razorpay.subscriptions.pause(subscriptionId, pauseData);

      this.logger.log(`Razorpay subscription paused: ${subscriptionId}`);
      return subscription;
    } catch (error) {
      this.logger.error(`Failed to pause Razorpay subscription: ${subscriptionId}`, error);
      throw new InternalServerErrorException('Failed to pause subscription');
    }
  }

  async resumeSubscription(subscriptionId: string, resumeAt?: number): Promise<any> {
    try {
      const resumeData: any = {};
      if (resumeAt) {
        resumeData.resume_at = resumeAt;
      }

      const subscription = await this.razorpay.subscriptions.resume(subscriptionId, resumeData);

      this.logger.log(`Razorpay subscription resumed: ${subscriptionId}`);
      return subscription;
    } catch (error) {
      this.logger.error(`Failed to resume Razorpay subscription: ${subscriptionId}`, error);
      throw new InternalServerErrorException('Failed to resume subscription');
    }
  }

  // Order Management
  async createOrder(options: CreateOrderOptions): Promise<any> {
    try {
      const order = await this.razorpay.orders.create({
        amount: options.amount,
        currency: options.currency,
        receipt: options.receipt || `receipt_${Date.now()}`,
        notes: options.notes || {},
        partial_payment: options.partialPayment || false,
      });

      this.logger.log(`Razorpay order created: ${order.id}`);
      return order;
    } catch (error) {
      this.logger.error('Failed to create Razorpay order', error);
      throw new InternalServerErrorException('Failed to create order');
    }
  }

  async getOrder(orderId: string): Promise<any> {
    try {
      const order = await this.razorpay.orders.fetch(orderId);
      return order;
    } catch (error) {
      this.logger.error(`Failed to retrieve Razorpay order: ${orderId}`, error);
      throw new BadRequestException('Order not found');
    }
  }

  async getOrderPayments(orderId: string): Promise<any[]> {
    try {
      const payments = await this.razorpay.orders.fetchPayments(orderId);
      return payments.items || [];
    } catch (error) {
      this.logger.error(`Failed to retrieve payments for Razorpay order: ${orderId}`, error);
      throw new InternalServerErrorException('Failed to retrieve order payments');
    }
  }

  // Payment Management
  async getPayment(paymentId: string): Promise<any> {
    try {
      const payment = await this.razorpay.payments.fetch(paymentId);
      return payment;
    } catch (error) {
      this.logger.error(`Failed to retrieve Razorpay payment: ${paymentId}`, error);
      throw new BadRequestException('Payment not found');
    }
  }

  async capturePayment(paymentId: string, amount: number, currency: string = 'INR'): Promise<any> {
    try {
      const payment = await this.razorpay.payments.capture(paymentId, amount, currency);

      this.logger.log(`Razorpay payment captured: ${paymentId}`);
      return payment;
    } catch (error) {
      this.logger.error(`Failed to capture Razorpay payment: ${paymentId}`, error);
      throw new InternalServerErrorException('Failed to capture payment');
    }
  }

  // Refund Management
  async createRefund(paymentId: string, amount?: number, notes?: Record<string, string>): Promise<any> {
    try {
      const refundData: any = {
        notes: notes || {},
      };

      if (amount) {
        refundData.amount = amount;
      }

      const refund = await this.razorpay.payments.refund(paymentId, refundData);

      this.logger.log(`Razorpay refund created: ${refund.id} for payment: ${paymentId}`);
      return refund;
    } catch (error) {
      this.logger.error(`Failed to create Razorpay refund for payment: ${paymentId}`, error);
      throw new InternalServerErrorException('Failed to create refund');
    }
  }

  async getRefund(paymentId: string, refundId: string): Promise<any> {
    try {
      const refund = await this.razorpay.payments.fetchRefund(paymentId, refundId);
      return refund;
    } catch (error) {
      this.logger.error(`Failed to retrieve Razorpay refund: ${refundId}`, error);
      throw new BadRequestException('Refund not found');
    }
  }

  async getAllRefunds(paymentId: string): Promise<any[]> {
    try {
      const refunds = await this.razorpay.payments.fetchMultipleRefund(paymentId);
      return refunds.items || [];
    } catch (error) {
      this.logger.error(`Failed to retrieve refunds for payment: ${paymentId}`, error);
      throw new InternalServerErrorException('Failed to retrieve refunds');
    }
  }

  // Invoice Management
  async createInvoice(invoiceData: any): Promise<any> {
    try {
      const invoice = await this.razorpay.invoices.create(invoiceData);

      this.logger.log(`Razorpay invoice created: ${invoice.id}`);
      return invoice;
    } catch (error) {
      this.logger.error('Failed to create Razorpay invoice', error);
      throw new InternalServerErrorException('Failed to create invoice');
    }
  }

  async getInvoice(invoiceId: string): Promise<any> {
    try {
      const invoice = await this.razorpay.invoices.fetch(invoiceId);
      return invoice;
    } catch (error) {
      this.logger.error(`Failed to retrieve Razorpay invoice: ${invoiceId}`, error);
      throw new BadRequestException('Invoice not found');
    }
  }

  async issueInvoice(invoiceId: string): Promise<any> {
    try {
      const invoice = await this.razorpay.invoices.issue(invoiceId);

      this.logger.log(`Razorpay invoice issued: ${invoiceId}`);
      return invoice;
    } catch (error) {
      this.logger.error(`Failed to issue Razorpay invoice: ${invoiceId}`, error);
      throw new InternalServerErrorException('Failed to issue invoice');
    }
  }

  async cancelInvoice(invoiceId: string): Promise<any> {
    try {
      const invoice = await this.razorpay.invoices.cancel(invoiceId);

      this.logger.log(`Razorpay invoice canceled: ${invoiceId}`);
      return invoice;
    } catch (error) {
      this.logger.error(`Failed to cancel Razorpay invoice: ${invoiceId}`, error);
      throw new InternalServerErrorException('Failed to cancel invoice');
    }
  }

  // Payment Link Management
  async createPaymentLink(options: CreatePaymentLinkOptions): Promise<any> {
    try {
      const paymentLinkData: any = {
        amount: options.amount,
        currency: options.currency,
        accept_partial: false,
        description: options.description,
        customer: options.customer,
        notify: options.notify || { sms: true, email: true },
        reminder_enable: options.reminderEnable !== false,
        notes: options.notes || {},
      };

      if (options.callbackUrl) {
        paymentLinkData.callback_url = options.callbackUrl;
        paymentLinkData.callback_method = options.callbackMethod || 'get';
      }

      const paymentLink = await this.razorpay.paymentLink.create(paymentLinkData);

      this.logger.log(`Razorpay payment link created: ${paymentLink.id}`);
      return paymentLink;
    } catch (error) {
      this.logger.error('Failed to create Razorpay payment link', error);
      throw new InternalServerErrorException('Failed to create payment link');
    }
  }

  async getPaymentLink(paymentLinkId: string): Promise<any> {
    try {
      const paymentLink = await this.razorpay.paymentLink.fetch(paymentLinkId);
      return paymentLink;
    } catch (error) {
      this.logger.error(`Failed to retrieve Razorpay payment link: ${paymentLinkId}`, error);
      throw new BadRequestException('Payment link not found');
    }
  }

  async cancelPaymentLink(paymentLinkId: string): Promise<any> {
    try {
      const paymentLink = await this.razorpay.paymentLink.cancel(paymentLinkId);

      this.logger.log(`Razorpay payment link canceled: ${paymentLinkId}`);
      return paymentLink;
    } catch (error) {
      this.logger.error(`Failed to cancel Razorpay payment link: ${paymentLinkId}`, error);
      throw new InternalServerErrorException('Failed to cancel payment link');
    }
  }

  // Webhook Verification and Handling
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const webhookSecret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new Error('RAZORPAY_WEBHOOK_SECRET is required for webhook verification');
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    } catch (error) {
      this.logger.error('Failed to verify Razorpay webhook signature', error);
      return false;
    }
  }

  async handleWebhookEvent(event: any): Promise<void> {
    this.logger.log(`Processing Razorpay webhook event: ${event.event}`);

    try {
      switch (event.event) {
        case 'payment.authorized':
          await this.handlePaymentAuthorized(event.payload.payment.entity);
          break;
        case 'payment.captured':
          await this.handlePaymentCaptured(event.payload.payment.entity);
          break;
        case 'payment.failed':
          await this.handlePaymentFailed(event.payload.payment.entity);
          break;
        case 'order.paid':
          await this.handleOrderPaid(event.payload.order.entity);
          break;
        case 'subscription.activated':
          await this.handleSubscriptionActivated(event.payload.subscription.entity);
          break;
        case 'subscription.charged':
          await this.handleSubscriptionCharged(event.payload.subscription.entity);
          break;
        case 'subscription.completed':
          await this.handleSubscriptionCompleted(event.payload.subscription.entity);
          break;
        case 'subscription.cancelled':
          await this.handleSubscriptionCancelled(event.payload.subscription.entity);
          break;
        case 'subscription.paused':
          await this.handleSubscriptionPaused(event.payload.subscription.entity);
          break;
        case 'subscription.resumed':
          await this.handleSubscriptionResumed(event.payload.subscription.entity);
          break;
        case 'invoice.paid':
          await this.handleInvoicePaid(event.payload.invoice.entity);
          break;
        case 'refund.created':
          await this.handleRefundCreated(event.payload.refund.entity);
          break;
        default:
          this.logger.log(`Unhandled Razorpay webhook event type: ${event.event}`);
      }
    } catch (error) {
      this.logger.error(`Failed to process Razorpay webhook event: ${event.event}`, error);
      throw error;
    }
  }

  // Private webhook handlers
  private async handlePaymentAuthorized(payment: any): Promise<void> {
    this.eventEmitter.emit('billing.payment.authorized', {
      provider: 'razorpay',
      paymentId: payment.id,
      payment,
    });
  }

  private async handlePaymentCaptured(payment: any): Promise<void> {
    this.eventEmitter.emit('billing.payment.captured', {
      provider: 'razorpay',
      paymentId: payment.id,
      payment,
    });
  }

  private async handlePaymentFailed(payment: any): Promise<void> {
    this.eventEmitter.emit('billing.payment.failed', {
      provider: 'razorpay',
      paymentId: payment.id,
      payment,
    });
  }

  private async handleOrderPaid(order: any): Promise<void> {
    this.eventEmitter.emit('billing.order.paid', {
      provider: 'razorpay',
      orderId: order.id,
      order,
    });
  }

  private async handleSubscriptionActivated(subscription: any): Promise<void> {
    this.eventEmitter.emit('billing.subscription.activated', {
      provider: 'razorpay',
      subscriptionId: subscription.id,
      subscription,
    });
  }

  private async handleSubscriptionCharged(subscription: any): Promise<void> {
    this.eventEmitter.emit('billing.subscription.charged', {
      provider: 'razorpay',
      subscriptionId: subscription.id,
      subscription,
    });
  }

  private async handleSubscriptionCompleted(subscription: any): Promise<void> {
    this.eventEmitter.emit('billing.subscription.completed', {
      provider: 'razorpay',
      subscriptionId: subscription.id,
      subscription,
    });
  }

  private async handleSubscriptionCancelled(subscription: any): Promise<void> {
    this.eventEmitter.emit('billing.subscription.cancelled', {
      provider: 'razorpay',
      subscriptionId: subscription.id,
      subscription,
    });
  }

  private async handleSubscriptionPaused(subscription: any): Promise<void> {
    this.eventEmitter.emit('billing.subscription.paused', {
      provider: 'razorpay',
      subscriptionId: subscription.id,
      subscription,
    });
  }

  private async handleSubscriptionResumed(subscription: any): Promise<void> {
    this.eventEmitter.emit('billing.subscription.resumed', {
      provider: 'razorpay',
      subscriptionId: subscription.id,
      subscription,
    });
  }

  private async handleInvoicePaid(invoice: any): Promise<void> {
    this.eventEmitter.emit('billing.invoice.paid', {
      provider: 'razorpay',
      invoiceId: invoice.id,
      invoice,
    });
  }

  private async handleRefundCreated(refund: any): Promise<void> {
    this.eventEmitter.emit('billing.refund.created', {
      provider: 'razorpay',
      refundId: refund.id,
      refund,
    });
  }

  // Utility methods
  private mapPlanIntervalToRazorpay(interval: string): string {
    const intervalMap = {
      monthly: 'monthly',
      quarterly: 'monthly', // Razorpay doesn't support quarterly, use monthly with count
      yearly: 'yearly',
    };

    return intervalMap[interval] || 'monthly';
  }

  // QR Code Management
  async createQRCode(options: {
    type: 'upi_qr' | 'bharat_qr';
    name: string;
    usage: 'single_use' | 'multiple_use';
    fixedAmount?: boolean;
    paymentAmount?: number;
    description?: string;
    customerContact?: string;
    customerEmail?: string;
    notes?: Record<string, string>;
  }): Promise<any> {
    try {
      const qrCode = await this.razorpay.qrCode.create({
        type: options.type,
        name: options.name,
        usage: options.usage,
        fixed_amount: options.fixedAmount || false,
        payment_amount: options.paymentAmount,
        description: options.description,
        notes: options.notes || {},
      });

      this.logger.log(`Razorpay QR code created: ${qrCode.id}`);
      return qrCode;
    } catch (error) {
      this.logger.error('Failed to create Razorpay QR code', error);
      throw new InternalServerErrorException('Failed to create QR code');
    }
  }

  async getQRCode(qrCodeId: string): Promise<any> {
    try {
      const qrCode = await this.razorpay.qrCode.fetch(qrCodeId);
      return qrCode;
    } catch (error) {
      this.logger.error(`Failed to retrieve Razorpay QR code: ${qrCodeId}`, error);
      throw new BadRequestException('QR code not found');
    }
  }

  async closeQRCode(qrCodeId: string): Promise<any> {
    try {
      const qrCode = await this.razorpay.qrCode.close(qrCodeId);

      this.logger.log(`Razorpay QR code closed: ${qrCodeId}`);
      return qrCode;
    } catch (error) {
      this.logger.error(`Failed to close Razorpay QR code: ${qrCodeId}`, error);
      throw new InternalServerErrorException('Failed to close QR code');
    }
  }

  // Virtual Account Management
  async createVirtualAccount(options: {
    receivers: {
      types: ['bank_account' | 'vpa' | 'qr_code'];
    };
    description: string;
    customerId?: string;
    notes?: Record<string, string>;
  }): Promise<any> {
    try {
      const virtualAccount = await this.razorpay.virtualAccounts.create({
        receivers: options.receivers,
        description: options.description,
        customer_id: options.customerId,
        notes: options.notes || {},
      });

      this.logger.log(`Razorpay virtual account created: ${virtualAccount.id}`);
      return virtualAccount;
    } catch (error) {
      this.logger.error('Failed to create Razorpay virtual account', error);
      throw new InternalServerErrorException('Failed to create virtual account');
    }
  }

  async getVirtualAccount(virtualAccountId: string): Promise<any> {
    try {
      const virtualAccount = await this.razorpay.virtualAccounts.fetch(virtualAccountId);
      return virtualAccount;
    } catch (error) {
      this.logger.error(`Failed to retrieve Razorpay virtual account: ${virtualAccountId}`, error);
      throw new BadRequestException('Virtual account not found');
    }
  }

  async closeVirtualAccount(virtualAccountId: string): Promise<any> {
    try {
      const virtualAccount = await this.razorpay.virtualAccounts.close(virtualAccountId);

      this.logger.log(`Razorpay virtual account closed: ${virtualAccountId}`);
      return virtualAccount;
    } catch (error) {
      this.logger.error(`Failed to close Razorpay virtual account: ${virtualAccountId}`, error);
      throw new InternalServerErrorException('Failed to close virtual account');
    }
  }
}
