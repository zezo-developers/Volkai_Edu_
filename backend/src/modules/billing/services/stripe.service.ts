import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Stripe from 'stripe';
import { Plan } from '../../../database/entities/plan.entity';
import { Subscription } from '../../../database/entities/subscription.entity';
import { Invoice } from '../../../database/entities/invoice.entity';
import { Payment, PaymentStatus, PaymentMethod, PaymentProvider } from '../../../database/entities/payment.entity';
import { Organization } from '../../../database/entities/organization.entity';

export interface CreateCustomerOptions {
  email: string;
  name: string;
  phone?: string;
  organizationId: string;
  metadata?: Record<string, string>;
}

export interface CreateSubscriptionOptions {
  customerId: string;
  priceId: string;
  organizationId: string;
  trialDays?: number;
  metadata?: Record<string, string>;
  paymentMethodId?: string;
  couponId?: string;
}

export interface CreatePaymentIntentOptions {
  amount: number; // in cents
  currency: string;
  customerId?: string;
  paymentMethodId?: string;
  description?: string;
  metadata?: Record<string, string>;
  automaticPaymentMethods?: boolean;
}

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe;

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
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is required');
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: null,
      typescript: true,
    });
  }

  // Customer Management
  async createCustomer(options: CreateCustomerOptions): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.create({
        email: options.email,
        name: options.name,
        phone: options.phone,
        metadata: {
          organizationId: options.organizationId,
          ...options.metadata,
        },
      });

      this.logger.log(`Stripe customer created: ${customer.id} for organization: ${options.organizationId}`);

      // Emit event for customer creation
      this.eventEmitter.emit('stripe.customer.created', {
        customerId: customer.id,
        organizationId: options.organizationId,
        customer,
      });

      return customer;
    } catch (error) {
      this.logger.error('Failed to create Stripe customer', error);
      throw new InternalServerErrorException('Failed to create customer');
    }
  }

  async getCustomer(customerId: string): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.retrieve(customerId) as Stripe.Customer;
      return customer;
    } catch (error) {
      this.logger.error(`Failed to retrieve Stripe customer: ${customerId}`, error);
      throw new BadRequestException('Customer not found');
    }
  }

  async updateCustomer(customerId: string, updates: Partial<CreateCustomerOptions>): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.update(customerId, {
        email: updates.email,
        name: updates.name,
        phone: updates.phone,
        metadata: updates.metadata,
      });

      this.logger.log(`Stripe customer updated: ${customerId}`);
      return customer;
    } catch (error) {
      this.logger.error(`Failed to update Stripe customer: ${customerId}`, error);
      throw new InternalServerErrorException('Failed to update customer');
    }
  }

  // Product and Price Management
  async createProduct(plan: Plan): Promise<Stripe.Product> {
    try {
      const product = await this.stripe.products.create({
        name: plan.name,
        description: plan.description,
        metadata: {
          planId: plan.id,
          planType: plan.planType,
        },
      });

      this.logger.log(`Stripe product created: ${product.id} for plan: ${plan.id}`);
      return product;
    } catch (error) {
      this.logger.error(`Failed to create Stripe product for plan: ${plan.id}`, error);
      throw new InternalServerErrorException('Failed to create product');
    }
  }

  async createPrice(plan: Plan, productId: string): Promise<Stripe.Price> {
    try {
      const priceData: Stripe.PriceCreateParams = {
        product: productId,
        unit_amount: plan.priceAmount,
        currency: plan.currency.toLowerCase(),
        metadata: {
          planId: plan.id,
          planType: plan.planType,
        },
      };

      // Add recurring configuration for subscription plans
      if (plan.planType !== 'free') {
        priceData.recurring = {
          interval: this.mapPlanIntervalToStripe(plan.interval),
          interval_count: 1,
        };
      }

      const price = await this.stripe.prices.create(priceData);

      this.logger.log(`Stripe price created: ${price.id} for plan: ${plan.id}`);
      return price;
    } catch (error) {
      this.logger.error(`Failed to create Stripe price for plan: ${plan.id}`, error);
      throw new InternalServerErrorException('Failed to create price');
    }
  }

  // Subscription Management
  async createSubscription(options: CreateSubscriptionOptions): Promise<Stripe.Subscription> {
    try {
      const subscriptionData: Stripe.SubscriptionCreateParams = {
        customer: options.customerId,
        items: [{ price: options.priceId }],
        metadata: {
          organizationId: options.organizationId,
          ...options.metadata,
        },
        expand: ['latest_invoice.payment_intent'],
      };

      // Add trial period if specified
      if (options.trialDays && options.trialDays > 0) {
        subscriptionData.trial_period_days = options.trialDays;
      }

      // Add payment method if provided
      if (options.paymentMethodId) {
        subscriptionData.default_payment_method = options.paymentMethodId;
      }

      // Add coupon if provided
      // if (options.couponId) {
      //   subscriptionData.coupon = options.couponId;
      // }

      // Configure payment behavior
      subscriptionData.payment_behavior = 'default_incomplete';
      subscriptionData.payment_settings = {
        save_default_payment_method: 'on_subscription',
      };

      const subscription = await this.stripe.subscriptions.create(subscriptionData);

      this.logger.log(`Stripe subscription created: ${subscription.id} for organization: ${options.organizationId}`);

      // Emit event for subscription creation
      this.eventEmitter.emit('stripe.subscription.created', {
        subscriptionId: subscription.id,
        organizationId: options.organizationId,
        subscription,
      });

      return subscription;
    } catch (error) {
      this.logger.error('Failed to create Stripe subscription', error);
      throw new InternalServerErrorException('Failed to create subscription');
    }
  }

  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['latest_invoice.payment_intent'],
      });
      return subscription;
    } catch (error) {
      this.logger.error(`Failed to retrieve Stripe subscription: ${subscriptionId}`, error);
      throw new BadRequestException('Subscription not found');
    }
  }

  async updateSubscription(
    subscriptionId: string,
    updates: Partial<Stripe.SubscriptionUpdateParams>,
  ): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        ...updates,
        expand: ['latest_invoice.payment_intent'],
      });

      this.logger.log(`Stripe subscription updated: ${subscriptionId}`);
      return subscription;
    } catch (error) {
      this.logger.error(`Failed to update Stripe subscription: ${subscriptionId}`, error);
      throw new InternalServerErrorException('Failed to update subscription');
    }
  }

  async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd: boolean = true): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: cancelAtPeriodEnd,
      });

      this.logger.log(`Stripe subscription canceled: ${subscriptionId}, at period end: ${cancelAtPeriodEnd}`);

      // Emit event for subscription cancellation
      this.eventEmitter.emit('stripe.subscription.canceled', {
        subscriptionId,
        cancelAtPeriodEnd,
        subscription,
      });

      return subscription;
    } catch (error) {
      this.logger.error(`Failed to cancel Stripe subscription: ${subscriptionId}`, error);
      throw new InternalServerErrorException('Failed to cancel subscription');
    }
  }

  // Payment Intent Management
  async createPaymentIntent(options: CreatePaymentIntentOptions): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntentData: Stripe.PaymentIntentCreateParams = {
        amount: options.amount,
        currency: options.currency.toLowerCase(),
        description: options.description,
        metadata: options.metadata || {},
      };

      if (options.customerId) {
        paymentIntentData.customer = options.customerId;
      }

      if (options.paymentMethodId) {
        paymentIntentData.payment_method = options.paymentMethodId;
        paymentIntentData.confirmation_method = 'manual';
        paymentIntentData.confirm = true;
      }

      if (options.automaticPaymentMethods) {
        paymentIntentData.automatic_payment_methods = {
          enabled: true,
        };
      }

      const paymentIntent = await this.stripe.paymentIntents.create(paymentIntentData);

      this.logger.log(`Stripe payment intent created: ${paymentIntent.id}`);
      return paymentIntent;
    } catch (error) {
      this.logger.error('Failed to create Stripe payment intent', error);
      throw new InternalServerErrorException('Failed to create payment intent');
    }
  }

  async confirmPaymentIntent(paymentIntentId: string, paymentMethodId?: string): Promise<Stripe.PaymentIntent> {
    try {
      const confirmData: Stripe.PaymentIntentConfirmParams = {};

      if (paymentMethodId) {
        confirmData.payment_method = paymentMethodId;
      }

      const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId, confirmData);

      this.logger.log(`Stripe payment intent confirmed: ${paymentIntentId}`);
      return paymentIntent;
    } catch (error) {
      this.logger.error(`Failed to confirm Stripe payment intent: ${paymentIntentId}`, error);
      throw new InternalServerErrorException('Failed to confirm payment');
    }
  }

  // Payment Method Management
  async attachPaymentMethod(paymentMethodId: string, customerId: string): Promise<Stripe.PaymentMethod> {
    try {
      const paymentMethod = await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      this.logger.log(`Payment method attached: ${paymentMethodId} to customer: ${customerId}`);
      return paymentMethod;
    } catch (error) {
      this.logger.error(`Failed to attach payment method: ${paymentMethodId}`, error);
      throw new InternalServerErrorException('Failed to attach payment method');
    }
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
    try {
      const paymentMethod = await this.stripe.paymentMethods.detach(paymentMethodId);

      this.logger.log(`Payment method detached: ${paymentMethodId}`);
      return paymentMethod;
    } catch (error) {
      this.logger.error(`Failed to detach payment method: ${paymentMethodId}`, error);
      throw new InternalServerErrorException('Failed to detach payment method');
    }
  }

  async listCustomerPaymentMethods(customerId: string, type: string = 'card'): Promise<Stripe.PaymentMethod[]> {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: type as Stripe.PaymentMethodListParams.Type,
      });

      return paymentMethods.data;
    } catch (error) {
      this.logger.error(`Failed to list payment methods for customer: ${customerId}`, error);
      throw new InternalServerErrorException('Failed to list payment methods');
    }
  }

  // Invoice Management
  async createInvoice(customerId: string, description?: string): Promise<Stripe.Invoice> {
    try {
      const invoice = await this.stripe.invoices.create({
        customer: customerId,
        description,
        auto_advance: false, // Don't auto-finalize
      });

      this.logger.log(`Stripe invoice created: ${invoice.id} for customer: ${customerId}`);
      return invoice;
    } catch (error) {
      this.logger.error(`Failed to create Stripe invoice for customer: ${customerId}`, error);
      throw new InternalServerErrorException('Failed to create invoice');
    }
  }

  async finalizeInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    try {
      const invoice = await this.stripe.invoices.finalizeInvoice(invoiceId);

      this.logger.log(`Stripe invoice finalized: ${invoiceId}`);
      return invoice;
    } catch (error) {
      this.logger.error(`Failed to finalize Stripe invoice: ${invoiceId}`, error);
      throw new InternalServerErrorException('Failed to finalize invoice');
    }
  }

  async payInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    try {
      const invoice = await this.stripe.invoices.pay(invoiceId);

      this.logger.log(`Stripe invoice paid: ${invoiceId}`);
      return invoice;
    } catch (error) {
      this.logger.error(`Failed to pay Stripe invoice: ${invoiceId}`, error);
      throw new InternalServerErrorException('Failed to pay invoice');
    }
  }

  // Webhook Handling
  async constructWebhookEvent(payload: string | Buffer, signature: string): Promise<Stripe.Event> {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is required for webhook verification');
    }

    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      return event;
    } catch (error) {
      this.logger.error('Failed to construct Stripe webhook event', error);
      throw new BadRequestException('Invalid webhook signature');
    }
  }

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    this.logger.log(`Processing Stripe webhook event: ${event.type}`);

    try {
      switch (event.type) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
          break;
        default:
          this.logger.log(`Unhandled Stripe webhook event type: ${event.type}`);
      }
    } catch (error) {
      this.logger.error(`Failed to process Stripe webhook event: ${event.type}`, error);
      throw error;
    }
  }

  // Private webhook handlers
  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    // This would sync the Stripe subscription with our local subscription entity
    this.eventEmitter.emit('billing.subscription.created', {
      provider: 'stripe',
      subscriptionId: subscription.id,
      subscription,
    });
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    // This would update our local subscription entity
    this.eventEmitter.emit('billing.subscription.updated', {
      provider: 'stripe',
      subscriptionId: subscription.id,
      subscription,
    });
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    // This would mark our local subscription as canceled
    this.eventEmitter.emit('billing.subscription.deleted', {
      provider: 'stripe',
      subscriptionId: subscription.id,
      subscription,
    });
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    // This would mark our local invoice as paid
    this.eventEmitter.emit('billing.invoice.payment_succeeded', {
      provider: 'stripe',
      invoiceId: invoice.id,
      invoice,
    });
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    // This would mark our local invoice as failed and trigger dunning
    this.eventEmitter.emit('billing.invoice.payment_failed', {
      provider: 'stripe',
      invoiceId: invoice.id,
      invoice,
    });
  }

  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    // This would update our local payment entity
    this.eventEmitter.emit('billing.payment.succeeded', {
      provider: 'stripe',
      paymentIntentId: paymentIntent.id,
      paymentIntent,
    });
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    // This would mark our local payment as failed
    this.eventEmitter.emit('billing.payment.failed', {
      provider: 'stripe',
      paymentIntentId: paymentIntent.id,
      paymentIntent,
    });
  }

  // Utility methods
  private mapPlanIntervalToStripe(interval: string): Stripe.PriceCreateParams.Recurring.Interval {
    const intervalMap = {
      monthly: 'month' as const,
      quarterly: 'month' as const, // Will use interval_count: 3
      yearly: 'year' as const,
    };

    return intervalMap[interval] || 'month';
  }

  // Refund Management
  async createRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: Stripe.RefundCreateParams.Reason,
  ): Promise<Stripe.Refund> {
    try {
      const refundData: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
        reason: reason || 'requested_by_customer',
      };

      if (amount) {
        refundData.amount = amount;
      }

      const refund = await this.stripe.refunds.create(refundData);

      this.logger.log(`Stripe refund created: ${refund.id} for payment intent: ${paymentIntentId}`);
      return refund;
    } catch (error) {
      this.logger.error(`Failed to create Stripe refund for payment intent: ${paymentIntentId}`, error);
      throw new InternalServerErrorException('Failed to create refund');
    }
  }

  // Setup Intent for saving payment methods
  async createSetupIntent(customerId: string, paymentMethodTypes?: string[]): Promise<Stripe.SetupIntent> {
    try {
      const setupIntent = await this.stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: paymentMethodTypes || ['card'],
        usage: 'off_session',
      });

      this.logger.log(`Stripe setup intent created: ${setupIntent.id} for customer: ${customerId}`);
      return setupIntent;
    } catch (error) {
      this.logger.error(`Failed to create Stripe setup intent for customer: ${customerId}`, error);
      throw new InternalServerErrorException('Failed to create setup intent');
    }
  }

  // Coupon Management
  async createCoupon(
    id: string,
    percentOff?: number,
    amountOff?: number,
    currency?: string,
    duration: Stripe.CouponCreateParams.Duration = 'once',
  ): Promise<Stripe.Coupon> {
    try {
      const couponData: Stripe.CouponCreateParams = {
        id,
        duration,
      };

      if (percentOff) {
        couponData.percent_off = percentOff;
      } else if (amountOff && currency) {
        couponData.amount_off = amountOff;
        couponData.currency = currency.toLowerCase();
      } else {
        throw new BadRequestException('Either percent_off or amount_off with currency must be provided');
      }

      const coupon = await this.stripe.coupons.create(couponData);

      this.logger.log(`Stripe coupon created: ${coupon.id}`);
      return coupon;
    } catch (error) {
      this.logger.error(`Failed to create Stripe coupon: ${id}`, error);
      throw new InternalServerErrorException('Failed to create coupon');
    }
  }

  // Usage Records for metered billing
  async createUsageRecord(
    subscriptionItemId: string,
    quantity: number,
    timestamp?: number,
  ): Promise<any> {
    try {
      // @ts-ignore
      const usageRecord = await this.stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
        quantity,
        timestamp: timestamp || Math.floor(Date.now() / 1000),
        action: 'increment',
      });

      this.logger.log(`Stripe usage record created for subscription item: ${subscriptionItemId}`);
      return usageRecord;
    } catch (error) {
      this.logger.error(`Failed to create Stripe usage record for subscription item: ${subscriptionItemId}`, error);
      throw new InternalServerErrorException('Failed to create usage record');
    }
  }
}
