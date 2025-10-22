import { Injectable, Logger, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { 
  Plan, 
  PlanType, 
  PlanInterval, 
  PlanStatus 
} from '../../../database/entities/plan.entity';
import { 
  Subscription, 
  SubscriptionStatus, 
  SubscriptionCancelReason 
} from '../../../database/entities/subscription.entity';
import { 
  Invoice, 
  InvoiceStatus, 
  InvoiceType 
} from '../../../database/entities/invoice.entity';
import { 
  Payment, 
  PaymentStatus, 
  PaymentMethod, 
  PaymentProvider, 
  PaymentType 
} from '../../../database/entities/payment.entity';
import { Organization } from '../../../database/entities/organization.entity';
import { User } from '../../../database/entities/user.entity';
import { StripeService } from './stripe.service';
import { RazorpayService } from './razorpay.service';
import { NotificationService } from '../../notifications/services/notification.service';

export interface CreateSubscriptionDto {
  organizationId: string;
  planId: string;
  paymentProvider: PaymentProvider;
  paymentMethodId?: string;
  couponCode?: string;
  billingAddress?: {
    name: string;
    email: string;
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
}

export interface UpdateSubscriptionDto {
  planId?: string;
  quantity?: number;
  couponCode?: string;
  pauseAt?: Date;
  resumeAt?: Date;
}

export interface CreatePaymentDto {
  organizationId: string;
  invoiceId?: string;
  amount: number;
  currency: string;
  paymentProvider: PaymentProvider;
  paymentMethod: PaymentMethod;
  description?: string;
  metadata?: Record<string, any>;
}

export interface BillingUsage {
  metric: string;
  value: number;
  timestamp?: Date;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private dataSource: DataSource,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
    private stripeService: StripeService,
    private razorpayService: RazorpayService,
    private notificationService: NotificationService,
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
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // Plan Management
  async createPlan(planData: Partial<Plan>): Promise<Plan> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create plan in database
      const plan = this.planRepository.create(planData);
      const savedPlan = await queryRunner.manager.save(plan);

      // Create plan in payment providers if not free
      if (savedPlan.planType !== PlanType.FREE) {
        // Create in Stripe
        try {
          const stripeProduct = await this.stripeService.createProduct(savedPlan);
          const stripePrice = await this.stripeService.createPrice(savedPlan, stripeProduct.id);
          
          savedPlan.metadata.stripeProductId = stripeProduct.id;
          savedPlan.metadata.stripePriceId = stripePrice.id;
        } catch (error) {
          this.logger.warn('Failed to create Stripe product/price', error);
        }

        // Create in Razorpay
        try {
          const razorpayPlan = await this.razorpayService.createPlan(savedPlan);
          savedPlan.metadata.razorpayPlanId = razorpayPlan.id;
        } catch (error) {
          this.logger.warn('Failed to create Razorpay plan', error);
        }

        await queryRunner.manager.save(savedPlan);
      }

      await queryRunner.commitTransaction();

      this.logger.log(`Plan created: ${savedPlan.id}`);
      this.eventEmitter.emit('billing.plan.created', { plan: savedPlan });

      return savedPlan;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to create plan', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getPlans(filters?: {
    status?: PlanStatus;
    planType?: PlanType;
    isActive?: boolean;
  }): Promise<Plan[]> {
    const query = this.planRepository.createQueryBuilder('plan');

    if (filters?.status) {
      query.andWhere('plan.status = :status', { status: filters.status });
    }

    if (filters?.planType) {
      query.andWhere('plan.planType = :planType', { planType: filters.planType });
    }

    if (filters?.isActive !== undefined) {
      query.andWhere('plan.isActive = :isActive', { isActive: filters.isActive });
    }

    query.orderBy('plan.metadata->\'displayOrder\'', 'ASC');
    query.addOrderBy('plan.priceAmount', 'ASC');

    return query.getMany();
  }

  async getPlan(planId: string): Promise<Plan> {
    const plan = await this.planRepository.findOne({ where: { id: planId } });
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }
    return plan;
  }

  async updatePlan(planId: string, updates: Partial<Plan>): Promise<Plan> {
    const plan = await this.getPlan(planId);
    Object.assign(plan, updates);
    
    const updatedPlan = await this.planRepository.save(plan);
    
    this.eventEmitter.emit('billing.plan.updated', { plan: updatedPlan });
    return updatedPlan;
  }

  // Subscription Management
  async createSubscription(dto: CreateSubscriptionDto): Promise<Subscription> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const organization = await this.organizationRepository.findOne({
        where: { id: dto.organizationId }
      });
      if (!organization) {
        throw new NotFoundException('Organization not found');
      }

      const plan = await this.getPlan(dto.planId);

      // Check if organization already has an active subscription
      const existingSubscription = await this.subscriptionRepository.findOne({
        where: {
          organizationId: dto.organizationId,
          status: SubscriptionStatus.ACTIVE,
        }
      });

      if (existingSubscription) {
        throw new ConflictException('Organization already has an active subscription');
      }

      // Create subscription in database
      const subscriptionData:any = {
        organizationId: dto.organizationId,
        planId: dto.planId,
        status: plan.isFreePlan ? SubscriptionStatus.ACTIVE : SubscriptionStatus.INCOMPLETE,
        currentPeriodStart: new Date(),
        currentPeriodEnd: this.calculatePeriodEnd(new Date(), plan.interval),
        quantity: 1,
        amountCents: plan.priceAmount,
        currency: plan.currency,
        taxCents: 0,
        discountCents: 0,
        billingConfig: {
          paymentMethodId: dto.paymentMethodId,
          prorate: true,
          dunningEnabled: true,
          maxRetryAttempts: 3,
          retrySchedule: [1, 3, 7],
        },
        usageData: {
          currentUsage: {},
          usageHistory: [],
          usageLimits: this.createUsageLimits(plan),
        },
        metadata: {
          source: 'api',
          billingHistory: [],
        },
      };

      // Add trial if plan has trial days
      if (plan.trialDays > 0) {
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + plan.trialDays);
        
        subscriptionData.status = SubscriptionStatus.TRIALING;
        subscriptionData['trialStart'] = new Date();
        subscriptionData['trialEnd'] = trialEnd;
        subscriptionData.currentPeriodEnd = trialEnd;
        subscriptionData.amountCents = 0; // No charge during trial
      }

      const subscription = this.subscriptionRepository.create(subscriptionData);
      const savedSubscription:any = await queryRunner.manager.save(subscription);

      // Create subscription in payment provider if not free plan
      if (!plan.isFreePlan) {
        try {
          if (dto.paymentProvider === PaymentProvider.STRIPE) {
            await this.createStripeSubscription(savedSubscription, plan, dto);
          } else if (dto.paymentProvider === PaymentProvider.RAZORPAY) {
            await this.createRazorpaySubscription(savedSubscription, plan, dto);
          }
        } catch (error) {
          this.logger.error('Failed to create subscription in payment provider', error);
          throw error;
        }
      }

      await queryRunner.commitTransaction();

      this.logger.log(`Subscription created: ${savedSubscription.id} for organization: ${dto.organizationId}`);
      this.eventEmitter.emit('billing.subscription.created', { subscription: savedSubscription });

      return savedSubscription;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to create subscription', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getSubscription(subscriptionId: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
      relations: ['organization', 'plan'],
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }

  async getOrganizationSubscription(organizationId: string): Promise<Subscription | null> {
    return this.subscriptionRepository.findOne({
      where: {
        organizationId,
        status: SubscriptionStatus.ACTIVE,
      },
      relations: ['plan'],
    });
  }

  async updateSubscription(subscriptionId: string, updates: UpdateSubscriptionDto): Promise<Subscription> {
    const subscription = await this.getSubscription(subscriptionId);

    if (updates.planId && updates.planId !== subscription.planId) {
      return this.changeSubscriptionPlan(subscription, updates.planId);
    }

    if (updates.pauseAt) {
      return this.pauseSubscription(subscriptionId, updates.pauseAt);
    }

    if (updates.resumeAt) {
      return this.resumeSubscription(subscriptionId);
    }

    // Update other fields
    Object.assign(subscription, updates);
    const updatedSubscription = await this.subscriptionRepository.save(subscription);

    this.eventEmitter.emit('billing.subscription.updated', { subscription: updatedSubscription });
    return updatedSubscription;
  }

  async cancelSubscription(
    subscriptionId: string, 
    reason: SubscriptionCancelReason = SubscriptionCancelReason.USER_REQUESTED,
    cancelAt?: Date
  ): Promise<Subscription> {
    const subscription = await this.getSubscription(subscriptionId);

    if (!subscription.canCancel()) {
      throw new BadRequestException('Subscription cannot be canceled');
    }

    subscription.cancel(cancelAt, reason);
    const canceledSubscription = await this.subscriptionRepository.save(subscription);

    // Cancel in payment provider
    if (subscription.providerData.stripe?.subscriptionId) {
      await this.stripeService.cancelSubscription(
        subscription.providerData.stripe.subscriptionId,
        !cancelAt || cancelAt > new Date()
      );
    }

    if (subscription.providerData.razorpay?.subscriptionId) {
      await this.razorpayService.cancelSubscription(
        subscription.providerData.razorpay.subscriptionId,
        !cancelAt || cancelAt > new Date()
      );
    }

    this.logger.log(`Subscription canceled: ${subscriptionId}`);
    this.eventEmitter.emit('billing.subscription.canceled', { subscription: canceledSubscription });

    return canceledSubscription;
  }

  async pauseSubscription(subscriptionId: string, pauseAt?: Date): Promise<Subscription> {
    const subscription = await this.getSubscription(subscriptionId);

    if (!subscription.canPause()) {
      throw new BadRequestException('Subscription cannot be paused');
    }

    subscription.pause(pauseAt);
    const pausedSubscription = await this.subscriptionRepository.save(subscription);

    // Pause in payment provider
    if (subscription.providerData.stripe?.subscriptionId) {
      await this.stripeService.updateSubscription(subscription.providerData.stripe.subscriptionId, {
        pause_collection: {
          behavior: 'void',
        },
      });
    }

    if (subscription.providerData.razorpay?.subscriptionId) {
      await this.razorpayService.pauseSubscription(
        subscription.providerData.razorpay.subscriptionId,
        pauseAt ? Math.floor(pauseAt.getTime() / 1000) : undefined
      );
    }

    this.logger.log(`Subscription paused: ${subscriptionId}`);
    this.eventEmitter.emit('billing.subscription.paused', { subscription: pausedSubscription });

    return pausedSubscription;
  }

  async resumeSubscription(subscriptionId: string): Promise<Subscription> {
    const subscription = await this.getSubscription(subscriptionId);

    if (!subscription.canResume()) {
      throw new BadRequestException('Subscription cannot be resumed');
    }

    subscription.resume();
    const resumedSubscription = await this.subscriptionRepository.save(subscription);

    // Resume in payment provider
    if (subscription.providerData.stripe?.subscriptionId) {
      await this.stripeService.updateSubscription(subscription.providerData.stripe.subscriptionId, {
        pause_collection: null,
      });
    }

    if (subscription.providerData.razorpay?.subscriptionId) {
      await this.razorpayService.resumeSubscription(subscription.providerData.razorpay.subscriptionId);
    }

    this.logger.log(`Subscription resumed: ${subscriptionId}`);
    this.eventEmitter.emit('billing.subscription.resumed', { subscription: resumedSubscription });

    return resumedSubscription;
  }

  // Usage Tracking
  async recordUsage(subscriptionId: string, usage: BillingUsage[]): Promise<void> {
    const subscription = await this.getSubscription(subscriptionId);

    for (const usageItem of usage) {
      subscription.addUsage(usageItem.metric, usageItem.value, usageItem.timestamp);
    }

    await this.subscriptionRepository.save(subscription);

    this.eventEmitter.emit('billing.usage.recorded', {
      subscriptionId,
      usage,
    });
  }

  async getUsage(subscriptionId: string, metric?: string): Promise<Record<string, number>> {
    const subscription = await this.getSubscription(subscriptionId);

    if (metric) {
      return { [metric]: subscription.getUsage(metric) };
    }

    return subscription.usageData.currentUsage || {};
  }

  async checkUsageLimits(subscriptionId: string): Promise<{
    withinLimits: boolean;
    violations: Array<{
      metric: string;
      current: number;
      limit: number;
      percentage: number;
    }>;
  }> {
    const subscription = await this.getSubscription(subscriptionId);
    const plan = await this.getPlan(subscription.planId);

    const violations = [];
    let withinLimits = true;

    for (const [metric, limit] of Object.entries(plan.features)) {
      if (typeof limit === 'number' && limit > 0) {
        const current = subscription.getUsage(metric);
        const percentage = (current / limit) * 100;

        if (current > limit) {
          withinLimits = false;
          violations.push({
            metric,
            current,
            limit,
            percentage,
          });
        }
      }
    }

    return { withinLimits, violations };
  }

  // Invoice Management
  async createInvoice(subscriptionId: string, type: InvoiceType = InvoiceType.SUBSCRIPTION): Promise<Invoice> {
    const subscription = await this.getSubscription(subscriptionId);
    const plan = await this.getPlan(subscription.planId);

    const invoiceData = Invoice.createFromSubscription(
      subscription,
      subscription.currentPeriodStart,
      subscription.currentPeriodEnd
    );

    invoiceData.type = type;

    const invoice = this.invoiceRepository.create(invoiceData);
    const savedInvoice = await this.invoiceRepository.save(invoice);

    this.logger.log(`Invoice created: ${savedInvoice.id} for subscription: ${subscriptionId}`);
    this.eventEmitter.emit('billing.invoice.created', { invoice: savedInvoice });

    return savedInvoice;
  }

  async getInvoice(invoiceId: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId },
      relations: ['organization', 'subscription'],
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  async finalizeInvoice(invoiceId: string): Promise<Invoice> {
    const invoice = await this.getInvoice(invoiceId);

    if (!invoice.isDraft) {
      throw new BadRequestException('Only draft invoices can be finalized');
    }

    invoice.finalize();
    const finalizedInvoice = await this.invoiceRepository.save(invoice);

    this.eventEmitter.emit('billing.invoice.finalized', { invoice: finalizedInvoice });
    return finalizedInvoice;
  }

  async payInvoice(invoiceId: string, paymentData: CreatePaymentDto): Promise<Payment> {
    const invoice = await this.getInvoice(invoiceId);

    if (invoice.isPaid) {
      throw new BadRequestException('Invoice is already paid');
    }

    const payment = await this.createPayment({
      ...paymentData,
      invoiceId,
      amount: invoice.amountDueCents,
      currency: invoice.currency,
    });

    return payment;
  }

  // Payment Management
  async createPayment(dto: CreatePaymentDto): Promise<Payment> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let invoice: Invoice | undefined;
      if (dto.invoiceId) {
        invoice = await this.getInvoice(dto.invoiceId);
      }

      const paymentData = Payment.createFromInvoice(
        invoice!,
        dto.paymentProvider,
        dto.paymentMethod
      );

      paymentData.description = dto.description;
      paymentData.metadata = dto.metadata;

      const payment = this.paymentRepository.create(paymentData);
      const savedPayment = await queryRunner.manager.save(payment);

      // Process payment with provider
      if (dto.paymentProvider === PaymentProvider.STRIPE) {
        await this.processStripePayment(savedPayment, dto);
      } else if (dto.paymentProvider === PaymentProvider.RAZORPAY) {
        await this.processRazorpayPayment(savedPayment, dto);
      }

      await queryRunner.commitTransaction();

      this.logger.log(`Payment created: ${savedPayment.id}`);
      this.eventEmitter.emit('billing.payment.created', { payment: savedPayment });

      return savedPayment;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to create payment', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getPayment(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['organization', 'invoice', 'subscription'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async refundPayment(paymentId: string, amount?: number, reason?: string): Promise<string> {
    const payment = await this.getPayment(paymentId);

    if (!payment.canBeRefunded) {
      throw new BadRequestException('Payment cannot be refunded');
    }

    const refundAmount = amount || payment.refundableAmount;
    const refundId = payment.refund(refundAmount, reason);

    await this.paymentRepository.save(payment);

    // Process refund with provider
    if (payment.providerData.stripe?.paymentIntentId) {
      await this.stripeService.createRefund(payment.providerData.stripe.paymentIntentId, refundAmount);
    }

    if (payment.providerData.razorpay?.paymentId) {
      await this.razorpayService.createRefund(payment.providerData.razorpay.paymentId, refundAmount, { reason });
    }

    this.logger.log(`Payment refund initiated: ${refundId} for payment: ${paymentId}`);
    this.eventEmitter.emit('billing.payment.refund_initiated', { payment, refundId, amount: refundAmount });

    return refundId;
  }

  // Scheduled Tasks
  @Cron(CronExpression.EVERY_HOUR)
  async processSubscriptionRenewals(): Promise<void> {
    this.logger.log('Processing subscription renewals');

    const subscriptionsToRenew = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .where('subscription.status = :status', { status: SubscriptionStatus.ACTIVE })
      .andWhere('subscription.currentPeriodEnd <= :now', { now: new Date() })
      .getMany();

    for (const subscription of subscriptionsToRenew) {
      try {
        await this.renewSubscription(subscription);
      } catch (error) {
        this.logger.error(`Failed to renew subscription: ${subscription.id}`, error);
      }
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async processPastDueInvoices(): Promise<void> {
    this.logger.log('Processing past due invoices');

    const pastDueInvoices = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.status = :status', { status: InvoiceStatus.OPEN })
      .andWhere('invoice.dueDate < :now', { now: new Date() })
      .getMany();

    for (const invoice of pastDueInvoices) {
      try {
        invoice.markAsPastDue();
        await this.invoiceRepository.save(invoice);

        // Send past due notification
        this.eventEmitter.emit('billing.invoice.past_due', { invoice });
      } catch (error) {
        this.logger.error(`Failed to process past due invoice: ${invoice.id}`, error);
      }
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async processUsageResets(): Promise<void> {
    this.logger.log('Processing usage resets');

    const subscriptions = await this.subscriptionRepository.find({
      where: { status: SubscriptionStatus.ACTIVE }
    });

    for (const subscription of subscriptions) {
      try {
        // Reset monthly usage if it's a new billing cycle
        if (this.shouldResetUsage(subscription)) {
          subscription.resetUsage();
          await this.subscriptionRepository.save(subscription);
        }
      } catch (error) {
        this.logger.error(`Failed to reset usage for subscription: ${subscription.id}`, error);
      }
    }
  }

  // Event Handlers
  @OnEvent('billing.subscription.created')
  async handleSubscriptionCreated(event: { subscription: Subscription }): Promise<void> {
    // Send welcome notification
    await this.notificationService.sendNotification({
      templateKey: 'subscription_created',
      recipientId: event.subscription.organizationId,
      recipientType: 'organization',
      data: {
        subscription: event.subscription,
      },
    });
  }

  @OnEvent('billing.invoice.past_due')
  async handleInvoicePastDue(event: { invoice: Invoice }): Promise<void> {
    // Send past due notification
    await this.notificationService.sendNotification({
      templateKey: 'invoice_past_due',
      recipientId: event.invoice.organizationId,
      recipientType: 'organization',
      data: {
        invoice: event.invoice,
        daysOverdue: event.invoice.daysOverdue,
      },
    });
  }

  // Private helper methods
  private async createStripeSubscription(
    subscription: Subscription,
    plan: Plan,
    dto: CreateSubscriptionDto
  ): Promise<void> {
    // Implementation for Stripe subscription creation
    // This would involve creating customer, setting up payment method, etc.
  }

  private async createRazorpaySubscription(
    subscription: Subscription,
    plan: Plan,
    dto: CreateSubscriptionDto
  ): Promise<void> {
    // Implementation for Razorpay subscription creation
  }

  private async processStripePayment(payment: Payment, dto: CreatePaymentDto): Promise<void> {
    // Implementation for Stripe payment processing
  }

  private async processRazorpayPayment(payment: Payment, dto: CreatePaymentDto): Promise<void> {
    // Implementation for Razorpay payment processing
  }

  private async renewSubscription(subscription: Subscription): Promise<void> {
    // Create invoice for next period
    const invoice = await this.createInvoice(subscription.id);
    await this.finalizeInvoice(invoice.id);

    // Renew subscription
    subscription.renew();
    await this.subscriptionRepository.save(subscription);

    this.eventEmitter.emit('billing.subscription.renewed', { subscription, invoice });
  }

  private async changeSubscriptionPlan(subscription: Subscription, newPlanId: string): Promise<Subscription> {
    const newPlan = await this.getPlan(newPlanId);
    const oldPlan = await this.getPlan(subscription.planId);

    // Calculate proration
    const proration = subscription.calculateProration(newPlan);

    // Update subscription
    subscription.planId = newPlanId;
    subscription.amountCents = newPlan.priceAmount;

    if (proration.netAmount > 0) {
      // Create invoice for upgrade
      const invoice = await this.createInvoice(subscription.id, InvoiceType.PRORATED);
      invoice.addLineItem({
        type: 'subscription',
        description: `Upgrade to ${newPlan.name}`,
        quantity: 1,
        unitPrice: proration.netAmount,
        totalPrice: proration.netAmount,
      });
      await this.invoiceRepository.save(invoice);
    }

    const updatedSubscription = await this.subscriptionRepository.save(subscription);

    this.eventEmitter.emit('billing.subscription.plan_changed', {
      subscription: updatedSubscription,
      oldPlan,
      newPlan,
      proration,
    });

    return updatedSubscription;
  }

  private calculatePeriodEnd(startDate: Date, interval: PlanInterval): Date {
    const endDate = new Date(startDate);

    switch (interval) {
      case PlanInterval.MONTHLY:
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case PlanInterval.QUARTERLY:
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case PlanInterval.YEARLY:
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
      default:
        endDate.setMonth(endDate.getMonth() + 1);
    }

    return endDate;
  }

  private createUsageLimits(plan: Plan): Record<string, any> {
    const limits = {};
    
    for (const [feature, limit] of Object.entries(plan.features)) {
      if (typeof limit === 'number' && limit > 0) {
        limits[feature] = {
          limit,
          current: 0,
          resetDate: new Date(),
          overage: 0,
          overageAllowed: plan.metadata.overage?.enabled || false,
        };
      }
    }

    return limits;
  }

  private shouldResetUsage(subscription: Subscription): boolean {
    const now = new Date();
    const lastReset = new Date(subscription?.usageData?.usageLimits?.resetDate as any || subscription.currentPeriodStart);
    
    // Reset if it's a new billing cycle
    return now >= subscription.currentPeriodEnd && now.getTime() - lastReset.getTime() > 24 * 60 * 60 * 1000;
  }
}
