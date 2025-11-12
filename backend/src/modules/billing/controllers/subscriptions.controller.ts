import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OrgAdminGuard, RolesGuard, SelfOrAdminGuard } from '../../../common/guards/roles.guard';
import { OrgAdmin, ManagerRole, Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User, UserRole } from '../../../database/entities/user.entity';
import { 
  Subscription, 
  SubscriptionStatus, 
  SubscriptionCancelReason 
} from '../../../database/entities/subscription.entity';
import { PaymentProvider } from '../../../database/entities/payment.entity';
import { BillingService } from '../services/billing.service';
import { 
  CreateSubscriptionDto, 
  UpdateSubscriptionDto, 
  CancelSubscriptionDto,
  PauseSubscriptionDto,
  UsageRecordDto 
} from '../dto/subscription.dto';

@ApiTags('Billing - Subscriptions')
@Controller('billing/subscriptions')
// @UseGuards(JwtAuthGuard, OrgAdminGuard)
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class SubscriptionsController {
  constructor(private readonly billingService: BillingService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Get all subscriptions (admin/HR only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Subscriptions retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiQuery({ name: 'status', required: false, enum: SubscriptionStatus })
  @ApiQuery({ name: 'organizationId', required: false, description: 'Filter by organization' })
  @ApiQuery({ name: 'planId', required: false, description: 'Filter by plan' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getSubscriptions(
    @Query('status') status?: SubscriptionStatus,
    @Query('organizationId') organizationId?: string,
    @Query('planId') planId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{
    success: boolean;
    subscriptions: Subscription[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    // This would be implemented with proper filtering and pagination
    // For now, returning a placeholder response
    return {
      success: true,
      subscriptions: [],
      pagination: {
        page: page || 1,
        limit: limit || 20,
        total: 0,
        totalPages: 0,
      },
    };
  }

  @Get('my')
  @ApiOperation({ summary: 'Get current organization subscription' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Organization subscription retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No active subscription found',
  })
  async getMySubscription(
    @CurrentUser() user: any,
  ): Promise<{
    success: boolean;
    subscription: Subscription | null;
    hasActiveSubscription: boolean;
  }> {
    const subscription = await this.billingService.getOrganizationSubscription(
      user.organizationId
    );

    return {
      success: true,
      subscription,
      hasActiveSubscription: subscription?.isActive || false,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get subscription by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Subscription retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Subscription not found',
  })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  async getSubscription(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ): Promise<{
    success: boolean;
    subscription: Subscription;
  }> {
    const subscription = await this.billingService.getSubscription(id);

    // Check if user has access to this subscription
    if (subscription.organizationId !== user.organizationId && 
        !user.roles.includes(UserRole.ADMIN)) {
      throw new Error('Access denied');
    }

    return {
      success: true,
      subscription,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create new subscription' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Subscription created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid subscription data',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Organization already has an active subscription',
  })
  async createSubscription(
    @Body(ValidationPipe) createSubscriptionDto: CreateSubscriptionDto,
    @CurrentUser() user: any,
  ): Promise<{
    success: boolean;
    subscription: Subscription;
    message: string;
    nextAction?: {
      type: 'payment_required' | 'setup_payment_method' | 'trial_started' | 'active';
      data?: any;
    };
  }> {
    // Use current user's organization if not specified
    if (!createSubscriptionDto.organizationId) {
      createSubscriptionDto.organizationId = user.organizationId;
    }

    // Verify user has permission to create subscription for this organization
    if (createSubscriptionDto.organizationId !== user.organizationId && 
        !user.roles.includes(UserRole.ADMIN)) {
      throw new Error('Access denied');
    }

    const subscription:any = await this.billingService.createSubscription(createSubscriptionDto as any);

    // Determine next action based on subscription status
    let nextAction;
    switch (subscription.status) {
      case SubscriptionStatus.INCOMPLETE:
        nextAction = {
          type: 'payment_required' as const,
          data: {
            clientSecret: subscription.providerData.stripe?.paymentIntentId,
            amount: subscription.totalAmount,
            currency: subscription.currency,
          },
        };
        break;
      case SubscriptionStatus.TRIALING:
        nextAction = {
          type: 'trial_started' as const,
          data: {
            trialEnd: subscription.trialEnd,
            daysRemaining: subscription.trialDaysRemaining,
          },
        };
        break;
      case SubscriptionStatus.ACTIVE:
        nextAction = {
          type: 'active' as const,
        };
        break;
      default:
        nextAction = {
          type: 'setup_payment_method' as const,
        };
    }

    return {
      success: true,
      subscription,
      message: 'Subscription created successfully',
      nextAction,
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update subscription' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Subscription updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Subscription not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid update data',
  })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  async updateSubscription(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateSubscriptionDto: UpdateSubscriptionDto,
    @CurrentUser() user: any,
  ): Promise<{
    success: boolean;
    subscription: Subscription;
    message: string;
    proration?: {
      creditAmount: number;
      chargeAmount: number;
      netAmount: number;
    };
  }> {
    const subscription = await this.billingService.getSubscription(id);

    // Check permissions
    if (subscription.organizationId !== user.organizationId && 
        !user.roles.includes(UserRole.ADMIN)) {
      throw new Error('Access denied');
    }

    const updatedSubscription = await this.billingService.updateSubscription(id, updateSubscriptionDto);

    return {
      success: true,
      subscription: updatedSubscription,
      message: 'Subscription updated successfully',
    };
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Subscription canceled successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Subscription not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Subscription cannot be canceled',
  })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  async cancelSubscription(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) cancelDto: CancelSubscriptionDto,
    @CurrentUser() user: any,
  ): Promise<{
    success: boolean;
    subscription: Subscription;
    message: string;
    cancellationDetails: {
      cancelAt: Date;
      reason: SubscriptionCancelReason;
      refundAmount?: number;
      accessUntil: Date;
    };
  }> {
    const subscription = await this.billingService.getSubscription(id);

    // Check permissions
    if (subscription.organizationId !== user.organizationId && 
        !user.roles.includes(UserRole.ADMIN)) {
      throw new Error('Access denied');
    }

    const canceledSubscription = await this.billingService.cancelSubscription(
      id,
      cancelDto.reason,
      cancelDto.cancelAt
    );

    return {
      success: true,
      subscription: canceledSubscription,
      message: 'Subscription canceled successfully',
      cancellationDetails: {
        cancelAt: canceledSubscription.cancelAt!,
        reason: canceledSubscription.cancelReason!,
        accessUntil: canceledSubscription.currentPeriodEnd,
      },
    };
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pause subscription' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Subscription paused successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Subscription not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Subscription cannot be paused',
  })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  async pauseSubscription(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) pauseDto: PauseSubscriptionDto,
    @CurrentUser() user: any,
  ): Promise<{
    success: boolean;
    subscription: Subscription;
    message: string;
    pauseDetails: {
      pauseStart: Date;
      pauseEnd?: Date;
      resumeAt?: Date;
    };
  }> {
    const subscription = await this.billingService.getSubscription(id);

    // Check permissions
    if (subscription.organizationId !== user.organizationId && 
        !user.roles.includes(UserRole.ADMIN)) {
      throw new Error('Access denied');
    }

    const pausedSubscription = await this.billingService.pauseSubscription(id, pauseDto.pauseAt);

    return {
      success: true,
      subscription: pausedSubscription,
      message: 'Subscription paused successfully',
      pauseDetails: {
        pauseStart: pausedSubscription.pauseStart!,
        pauseEnd: pausedSubscription.pauseEnd,
        resumeAt: pauseDto.pauseAt,
      },
    };
  }

  @Post(':id/resume')
  @ApiOperation({ summary: 'Resume paused subscription' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Subscription resumed successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Subscription not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Subscription cannot be resumed',
  })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  async resumeSubscription(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ): Promise<{
    success: boolean;
    subscription: Subscription;
    message: string;
    resumeDetails: {
      resumedAt: Date;
      nextBillingDate: Date;
    };
  }> {
    const subscription = await this.billingService.getSubscription(id);

    // Check permissions
    if (subscription.organizationId !== user.organizationId && 
        !user.roles.includes(UserRole.ADMIN)) {
      throw new Error('Access denied');
    }

    const resumedSubscription = await this.billingService.resumeSubscription(id);

    return {
      success: true,
      subscription: resumedSubscription,
      message: 'Subscription resumed successfully',
      resumeDetails: {
        resumedAt: new Date(),
        nextBillingDate: resumedSubscription.nextBillingDate,
      },
    };
  }

  @Get(':id/usage')
  @ApiOperation({ summary: 'Get subscription usage data' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Usage data retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Subscription not found',
  })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  @ApiQuery({ name: 'metric', required: false, description: 'Specific metric to retrieve' })
  async getUsage(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('metric') metric?: string,
    @CurrentUser() user?: any,
  ): Promise<{
    success: boolean;
    usage: Record<string, number>;
    limits: Record<string, {
      current: number;
      limit: number;
      percentage: number;
      unlimited: boolean;
    }>;
    warnings: Array<{
      metric: string;
      current: number;
      limit: number;
      percentage: number;
      threshold: number;
    }>;
  }> {
    const subscription = await this.billingService.getSubscription(id);

    // Check permissions
    if (subscription.organizationId !== user.organizationId && 
        !user.roles.includes(UserRole.ADMIN)) {
      throw new Error('Access denied');
    }

    const usage = await this.billingService.getUsage(id, metric);
    const limitCheck = await this.billingService.checkUsageLimits(id);

    // Build limits response
    const limits = {};
    const warnings = [];

    for (const [metricName, current] of Object.entries(usage)) {
      const plan = subscription.plan;
      const limit = plan?.getFeatureLimit(metricName);
      const unlimited = plan?.isFeatureUnlimited(metricName) || false;

      if (limit !== null && !unlimited) {
        const percentage = (current / limit) * 100;
        limits[metricName] = {
          current,
          limit,
          percentage: Math.round(percentage * 100) / 100,
          unlimited: false,
        };

        // Check for warnings
        const warningThresholds = plan?.metadata.usageWarningThresholds || [80, 90, 95];
        for (const threshold of warningThresholds) {
          if (percentage >= threshold) {
            warnings.push({
              metric: metricName,
              current,
              limit,
              percentage: Math.round(percentage * 100) / 100,
              threshold,
            });
            break; // Only add the first threshold exceeded
          }
        }
      } else {
        limits[metricName] = {
          current,
          limit: -1,
          percentage: 0,
          unlimited: true,
        };
      }
    }

    return {
      success: true,
      usage,
      limits,
      warnings,
    };
  }

  @Post(':id/usage')
  @ApiOperation({ summary: 'Record usage for subscription' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Usage recorded successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Subscription not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid usage data',
  })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  async recordUsage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) usageDto: UsageRecordDto,
    @CurrentUser() user: any,
  ): Promise<{
    success: boolean;
    message: string;
    usage: Record<string, number>;
    limitViolations?: Array<{
      metric: string;
      current: number;
      limit: number;
      overage: number;
    }> | any;
  }> {
    const subscription = await this.billingService.getSubscription(id);

    // Check permissions
    if (subscription.organizationId !== user.organizationId && 
        !user.roles.includes(UserRole.ADMIN)) {
      throw new Error('Access denied');
    }

    await this.billingService.recordUsage(id, usageDto.usage);

    // Get updated usage
    const updatedUsage = await this.billingService.getUsage(id);
    const limitCheck = await this.billingService.checkUsageLimits(id);

    return {
      success: true,
      message: 'Usage recorded successfully',
      usage: updatedUsage,
      limitViolations: limitCheck.withinLimits ? undefined : limitCheck.violations,
    };
  }

  @Get(':id/invoices')
  @ApiOperation({ summary: 'Get subscription invoices' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invoices retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Subscription not found',
  })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by invoice status' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getSubscriptionInvoices(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @CurrentUser() user?: any,
  ): Promise<{
    success: boolean;
    invoices: any[];
    count: number;
  }> {
    const subscription = await this.billingService.getSubscription(id);

    // Check permissions
    if (subscription.organizationId !== user.organizationId && 
        !user.roles.includes(UserRole.ADMIN)) {
      throw new Error('Access denied');
    }

    // This would fetch invoices related to the subscription
    // For now, returning placeholder
    return {
      success: true,
      invoices: [],
      count: 0,
    };
  }

  @Get(':id/payments')
  @ApiOperation({ summary: 'Get subscription payments' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payments retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Subscription not found',
  })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by payment status' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getSubscriptionPayments(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @CurrentUser() user?: any,
  ): Promise<{
    success: boolean;
    payments: any[];
    count: number;
  }> {
    const subscription = await this.billingService.getSubscription(id);

    // Check permissions
    if (subscription.organizationId !== user.organizationId && 
        !user.roles.includes(UserRole.ADMIN)) {
      throw new Error('Access denied');
    }

    // This would fetch payments related to the subscription
    // For now, returning placeholder
    return {
      success: true,
      payments: [],
      count: 0,
    };
  }

  @Post(':id/preview-change')
  @ApiOperation({ summary: 'Preview subscription plan change' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Plan change preview calculated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Subscription not found',
  })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  async previewPlanChange(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('newPlanId', ParseUUIDPipe) newPlanId: string,
    @Body('changeDate') changeDate?: string,
    @CurrentUser() user?: any,
  ): Promise<{
    success: boolean;
    preview: {
      currentPlan: any;
      newPlan: any;
      proration: {
        creditAmount: number;
        chargeAmount: number;
        netAmount: number;
        displayCredit: string;
        displayCharge: string;
        displayNet: string;
      };
      nextBillingDate: Date;
      immediateCharge: boolean;
    };
  }> {
    const subscription = await this.billingService.getSubscription(id);

    // Check permissions
    if (subscription.organizationId !== user.organizationId && 
        !user.roles.includes(UserRole.ADMIN)) {
      throw new Error('Access denied');
    }

    const currentPlan = await this.billingService.getPlan(subscription.planId);
    const newPlan = await this.billingService.getPlan(newPlanId);

    const change = changeDate ? new Date(changeDate) : new Date();
    const proration = subscription.calculateProration(newPlan, change);

    return {
      success: true,
      preview: {
        currentPlan: {
          id: currentPlan.id,
          name: currentPlan.name,
          priceAmount: currentPlan.priceAmount,
          displayPrice: currentPlan.displayPrice,
        },
        newPlan: {
          id: newPlan.id,
          name: newPlan.name,
          priceAmount: newPlan.priceAmount,
          displayPrice: newPlan.displayPrice,
        },
        proration: {
          creditAmount: proration.creditAmount,
          chargeAmount: proration.chargeAmount,
          netAmount: proration.netAmount,
          displayCredit: new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: subscription.currency,
          }).format(proration.creditAmount / 100),
          displayCharge: new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: subscription.currency,
          }).format(proration.chargeAmount / 100),
          displayNet: new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: subscription.currency,
          }).format(Math.abs(proration.netAmount) / 100),
        },
        nextBillingDate: subscription.currentPeriodEnd,
        immediateCharge: proration.netAmount > 0,
      },
    };
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get subscription history and events' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Subscription history retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Subscription not found',
  })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  async getSubscriptionHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ): Promise<{
    success: boolean;
    history: {
      changeHistory: Array<{
        timestamp: Date;
        action: string;
        oldValue?: any;
        newValue?: any;
        reason?: string;
        performedBy?: string;
      }>;
      billingHistory: Array<{
        date: Date;
        action: string;
        amount: number;
        planId: string;
        invoiceId?: string;
      }>;
      usageHistory: Array<{
        date: Date;
        metric: string;
        value: number;
        resetType?: string;
      }>;
    };
  }> {
    const subscription = await this.billingService.getSubscription(id);

    // Check permissions
    if (subscription.organizationId !== user.organizationId && 
        !user.roles.includes(UserRole.ADMIN)) {
      throw new Error('Access denied');
    }

    return {
      success: true,
      history: {
        changeHistory: subscription.metadata.changeHistory || [],
        billingHistory: subscription.metadata.billingHistory || [],
        usageHistory: subscription.usageData.usageHistory || [],
      },
    };
  }
}
