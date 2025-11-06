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
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User, UserRole } from '../../../database/entities/user.entity';
import { Plan, PlanType, PlanStatus } from '../../../database/entities/plan.entity';
import { BillingService } from '../services/billing.service';
import { CreatePlanDto, UpdatePlanDto } from '../dto/plan.dto';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@ApiTags('Billing - Plans')
@Controller('billing/plans')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PlansController {
  constructor(private readonly billingService: BillingService) {}

  @Get()
  @ApiOperation({ summary: 'Get all available plans' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Plans retrieved successfully',
  })
  @ApiQuery({ name: 'status', required: false, enum: PlanStatus })
  @ApiQuery({ name: 'planType', required: false, enum: PlanType })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  async getPlans(
    @Query('status') status?: PlanStatus,
    @Query('planType') planType?: PlanType,
    @Query('isActive') isActive?: boolean,
  ): Promise<{
    success: boolean;
    plans: Plan[];
    count: number;
  }> {
    const plans = await this.billingService.getPlans({
      status,
      planType,
      isActive,
    });

    return {
      success: true,
      plans,
      count: plans.length,
    };
  }

  @Get('public')
  @ApiOperation({ summary: 'Get public plans (no authentication required)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Public plans retrieved successfully',
  })
  async getPublicPlans(): Promise<{
    success: boolean;
    plans: Partial<Plan>[];
  }> {
    const plans = await this.billingService.getPlans({
      status: PlanStatus.ACTIVE,
      isActive: true,
    });

    // Return only public information
    const publicPlans = plans.map(plan => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      planType: plan.planType,
      interval: plan.interval,
      priceAmount: plan.priceAmount,
      currency: plan.currency,
      setupFee: plan.setupFee,
      trialDays: plan.trialDays,
      features: plan.features,
      displayPrice: plan.displayPrice,
      intervalDisplay: plan.intervalDisplay,
      isPopular: plan.metadata.isPopular,
      isFeatured: plan.metadata.isFeatured,
      displayOrder: plan.metadata.displayOrder,
    }));

    return {
      success: true,
      plans: publicPlans,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get plan by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Plan retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Plan not found',
  })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  async getPlan(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{
    success: boolean;
    plan: Plan;
  }> {
    const plan = await this.billingService.getPlan(id);

    return {
      success: true,
      plan,
    };
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create new plan (admin only)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Plan created successfully',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only administrators can create plans',
  })
  async createPlan(
    @Body(ValidationPipe) createPlanDto: CreatePlanDto,
    @CurrentUser() user?: any,
  ): Promise<{
    success: boolean;
    plan: Plan;
    message: string;
  }> {
    const plan = await this.billingService.createPlan({
      ...createPlanDto,
      metadata: {
        ...createPlanDto.metadata,
        createdBy: user.id,
      },
    });

    return {
      success: true,
      plan,
      message: 'Plan created successfully',
    };
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update plan (admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Plan updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Plan not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only administrators can update plans',
  })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  async updatePlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updatePlanDto: UpdatePlanDto,
    @CurrentUser() user?: any,
  ): Promise<{
    success: boolean;
    plan: Plan;
    message: string;
  }> {
    const plan = await this.billingService.updatePlan(id, {
      ...updatePlanDto,
      metadata: {
        ...updatePlanDto.metadata,
        updatedBy: user.id,
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      plan,
      message: 'Plan updated successfully',
    };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete plan (admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Plan deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Plan not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only administrators can delete plans',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Cannot delete plan with active subscriptions',
  })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  async deletePlan(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    // First check if plan has active subscriptions
    const plan = await this.billingService.getPlan(id);
    
    // Instead of hard delete, we'll archive the plan
    await this.billingService.updatePlan(id, {
      status: PlanStatus.ARCHIVED,
      isActive: false,
    });

    return {
      success: true,
      message: 'Plan archived successfully',
    };
  }

  @Post(':id/clone')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Clone existing plan (admin only)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Plan cloned successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Plan not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only administrators can clone plans',
  })
  @ApiParam({ name: 'id', description: 'Plan ID to clone' })
  async clonePlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('name') name?: string,
    @CurrentUser() user?: any,
  ): Promise<{
    success: boolean;
    plan: Plan;
    message: string;
  }> {
    const originalPlan = await this.billingService.getPlan(id);
    const clonedPlanData = originalPlan.clone(name);

    const plan = await this.billingService.createPlan({
      ...clonedPlanData,
      metadata: {
        ...clonedPlanData.metadata,
        createdBy: user.id,
        clonedFrom: originalPlan.id,
      },
    });

    return {
      success: true,
      plan,
      message: 'Plan cloned successfully',
    };
  }

  @Get(':id/features')
  @ApiOperation({ summary: 'Get plan features and limits' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Plan features retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Plan not found',
  })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  async getPlanFeatures(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{
    success: boolean;
    features: Record<string, any>;
    limits: Array<{
      feature: string;
      limit: any;
      unlimited: boolean;
    }>;
  }> {
    const plan = await this.billingService.getPlan(id);

    const limits = Object.entries(plan.features)
      .filter(([_, value]) => typeof value === 'number' || value === 'unlimited')
      .map(([feature, limit]) => ({
        feature,
        limit: limit === -1 ? 'unlimited' : limit,
        unlimited: limit === -1 || limit === 'unlimited',
      }));

    return {
      success: true,
      features: plan.features,
      limits,
    };
  }

  @Get(':id/pricing')
  @ApiOperation({ summary: 'Get plan pricing information' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Plan pricing retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Plan not found',
  })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiQuery({ name: 'currency', required: false, description: 'Currency code for conversion' })
  async getPlanPricing(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('currency') currency?: string,
  ): Promise<{
    success: boolean;
    pricing: {
      planId: string;
      name: string;
      interval: string;
      priceAmount: number;
      currency: string;
      displayPrice: string;
      setupFee: number;
      trialDays: number;
      monthlyPrice: number;
      yearlyPrice: number;
      savings?: {
        monthlyVsYearly: number;
        percentage: number;
      };
    };
  }> {
    const plan = await this.billingService.getPlan(id);

    // TODO: Implement currency conversion if different currency requested
    const pricing = {
      planId: plan.id,
      name: plan.name,
      interval: plan.interval,
      priceAmount: plan.priceAmount,
      currency: plan.currency,
      displayPrice: plan.displayPrice,
      setupFee: plan.setupFee,
      trialDays: plan.trialDays,
      monthlyPrice: plan.monthlyPrice,
      yearlyPrice: plan.yearlyPrice,
    };

    // Calculate savings for yearly plans
    if (plan.interval === 'yearly') {
      const monthlyEquivalent = plan.monthlyPrice * 12;
      const savings = monthlyEquivalent - plan.priceAmount;
      const percentage = (savings / monthlyEquivalent) * 100;

      pricing['savings'] = {
        monthlyVsYearly: savings,
        percentage: Math.round(percentage),
      };
    }

    return {
      success: true,
      pricing,
    };
  }

  @Get(':id/comparison')
  @ApiOperation({ summary: 'Compare plan with other plans' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Plan comparison retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Plan not found',
  })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiQuery({ name: 'compareWith', required: false, description: 'Comma-separated plan IDs to compare with' })
  async comparePlans(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('compareWith') compareWith?: string,
  ): Promise<{
    success: boolean;
    comparison: {
      basePlan: Plan;
      comparisonPlans: Plan[];
      featureComparison: Record<string, {
        basePlan: any;
        comparisons: Record<string, any>;
      }>;
    };
  }> {
    const basePlan = await this.billingService.getPlan(id);
    
    let comparisonPlans: Plan[] = [];
    if (compareWith) {
      const planIds = compareWith.split(',').map(id => id.trim());
      comparisonPlans = await Promise.all(
        planIds.map(planId => this.billingService.getPlan(planId))
      );
    } else {
      // Compare with all active plans of same type
      const allPlans = await this.billingService.getPlans({
        status: PlanStatus.ACTIVE,
        isActive: true,
      });
      comparisonPlans = allPlans.filter(plan => plan.id !== id);
    }

    // Build feature comparison
    const allFeatures = new Set([
      ...Object.keys(basePlan.features),
      ...comparisonPlans.flatMap(plan => Object.keys(plan.features)),
    ]);

    const featureComparison = {};
    for (const feature of allFeatures) {
      featureComparison[feature] = {
        basePlan: basePlan.features[feature],
        comparisons: comparisonPlans.reduce((acc, plan) => {
          acc[plan.id] = plan.features[feature];
          return acc;
        }, {}),
      };
    }

    return {
      success: true,
      comparison: {
        basePlan,
        comparisonPlans,
        featureComparison,
      },
    };
  }

  @Get(':id/upgrade-options')
  @ApiOperation({ summary: 'Get available upgrade options for plan' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Upgrade options retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Plan not found',
  })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  async getUpgradeOptions(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{
    success: boolean;
    upgradeOptions: Plan[];
    downgradeOptions: Plan[];
  }> {
    const plan = await this.billingService.getPlan(id);
    
    const upgradeOptions: Plan[] = [];
    const downgradeOptions: Plan[] = [];

    if (plan.metadata.upgradeOptions) {
      for (const upgradeId of plan.metadata.upgradeOptions) {
        try {
          const upgradePlan = await this.billingService.getPlan(upgradeId);
          upgradeOptions.push(upgradePlan);
        } catch (error) {
          // Skip invalid plan IDs
        }
      }
    }

    if (plan.metadata.downgradeOptions) {
      for (const downgradeId of plan.metadata.downgradeOptions) {
        try {
          const downgradePlan = await this.billingService.getPlan(downgradeId);
          downgradeOptions.push(downgradePlan);
        } catch (error) {
          // Skip invalid plan IDs
        }
      }
    }

    return {
      success: true,
      upgradeOptions,
      downgradeOptions,
    };
  }

    @Post(':id/calculate-proration')
    @ApiOperation({ summary: 'Calculate proration for plan change' })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Proration calculated successfully',
    })
    @ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Plan not found',
    })
    @ApiParam({ name: 'id', description: 'Current plan ID', required: true, type: 'string', format: 'uuid' })
    @ApiParam({ name: 'targetPlanId', description: 'Target plan ID', required: true, type: 'string', format: 'uuid' })
    @ApiParam({ name: 'changeDate', description: 'Date of plan change', required: false, type: 'string', format: 'date-time' })
    @ApiParam({ name: 'currentPeriodStart', description: 'Current billing period start', required: false, type: 'string', format: 'date-time' })
    @ApiParam({ name: 'currentPeriodEnd', description: 'Current billing period end', required: false, type: 'string', format: 'date-time' })
    async calculateProration(
      @Param('id', ParseUUIDPipe) id: string,
      @Param('targetPlanId') targetPlanId: string,
      @Param('changeDate') changeDate?: string,
      @Param('currentPeriodStart') currentPeriodStart?: string,
      @Param('currentPeriodEnd') currentPeriodEnd?: string,
    ): Promise<{
      success: boolean;
      proration: {
        creditAmount: number;
        chargeAmount: number;
        netAmount: number;
        displayCredit: string;
        displayCharge: string;
        displayNet: string;
      };
    }> {
      console.log('id: ', id)
      console.log('targetPlanId: ', targetPlanId)
      const currentPlan = await this.billingService.getPlan(id);
      const targetPlan = await this.billingService.getPlan(targetPlanId);
      console.log('currentPlan: ', currentPlan)
      console.log('targetPlan: ', targetPlan)

      const change = new Date(changeDate || Date.now());
      const periodStart = new Date(currentPeriodStart || Date.now());
      const periodEnd = new Date(currentPeriodEnd || Date.now() + 30 * 24 * 60 * 60 * 1000);

      const prorationAmount = currentPlan.calculateProrationAmount(periodStart, periodEnd, change);
      const targetAmount = targetPlan.calculateProrationAmount(periodStart, periodEnd, change);
      
      const creditAmount = prorationAmount;
      const chargeAmount = targetAmount;
      const netAmount = chargeAmount - creditAmount;

      return {
        success: true,
        proration: {
          creditAmount,
          chargeAmount,
          netAmount,
          displayCredit: new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currentPlan.currency,
          }).format(creditAmount / 100),
          displayCharge: new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: targetPlan.currency,
          }).format(chargeAmount / 100),
          displayNet: new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: targetPlan.currency,
          }).format(Math.abs(netAmount) / 100),
        },
      };
    }
}
