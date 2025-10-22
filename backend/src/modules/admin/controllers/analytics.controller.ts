import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpStatus,
  ParseIntPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User, UserRole } from '../../../database/entities/user.entity';
import { 
  AnalyticsService, 
  AnalyticsMetrics, 
  UsageTrends, 
  TopPerformers 
} from '../services/analytics.service';
import { 
  EventType, 
  EventCategory, 
  AnalyticsEvent 
} from '../../../database/entities/analytics-event.entity';
import { TrackEventDto } from '../dto/analytics.dto';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@ApiTags('Admin - Analytics')
@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.HR)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get comprehensive analytics overview' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Analytics overview retrieved successfully',
  })
  @ApiQuery({ name: 'organizationId', required: false, description: 'Filter by organization' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Start date for metrics' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'End date for metrics' })
  async getAnalyticsOverview(
    @Query('organizationId') organizationId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<{
    success: boolean;
    metrics: AnalyticsMetrics;
    trends: UsageTrends[];
    topPerformers: TopPerformers;
  }> {
    const from = dateFrom ? new Date(dateFrom) : undefined;
    const to = dateTo ? new Date(dateTo) : undefined;

    const [metrics, trends, topPerformers] = await Promise.all([
      this.analyticsService.getMetrics(organizationId, from, to),
      this.analyticsService.getUsageTrends(organizationId, 'daily', 30),
      this.analyticsService.getTopPerformers(organizationId),
    ]);

    return {
      success: true,
      metrics,
      trends,
      topPerformers,
    };
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get detailed analytics metrics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Analytics metrics retrieved successfully',
  })
  @ApiQuery({ name: 'organizationId', required: false, description: 'Filter by organization' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Start date for metrics' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'End date for metrics' })
  async getMetrics(
    @Query('organizationId') organizationId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<{
    success: boolean;
    metrics: AnalyticsMetrics;
  }> {
    const from = dateFrom ? new Date(dateFrom) : undefined;
    const to = dateTo ? new Date(dateTo) : undefined;

    const metrics = await this.analyticsService.getMetrics(organizationId, from, to);

    return {
      success: true,
      metrics,
    };
  }

  @Get('trends')
  @ApiOperation({ summary: 'Get usage trends over time' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Usage trends retrieved successfully',
  })
  @ApiQuery({ name: 'organizationId', required: false, description: 'Filter by organization' })
  @ApiQuery({ name: 'period', required: false, enum: ['daily', 'weekly', 'monthly'] })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days to include' })
  async getUsageTrends(
    @Query('organizationId') organizationId?: string,
    @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'daily',
    @Query('days', new ParseIntPipe({ optional: true })) days: number = 30,
  ): Promise<{
    success: boolean;
    trends: UsageTrends[];
    summary: {
      totalUsers: number;
      totalSessions: number;
      totalPageViews: number;
      totalRevenue: number;
      totalConversions: number;
      averageUsersPerPeriod: number;
      growthRate: number;
    };
  }> {
    const trends = await this.analyticsService.getUsageTrends(organizationId, period, days);

    // Calculate summary statistics
    const summary = {
      totalUsers: trends.reduce((sum, t) => sum + t.users, 0),
      totalSessions: trends.reduce((sum, t) => sum + t.sessions, 0),
      totalPageViews: trends.reduce((sum, t) => sum + t.pageViews, 0),
      totalRevenue: trends.reduce((sum, t) => sum + t.revenue, 0),
      totalConversions: trends.reduce((sum, t) => sum + t.conversions, 0),
      averageUsersPerPeriod: trends.length > 0 
        ? Math.round(trends.reduce((sum, t) => sum + t.users, 0) / trends.length)
        : 0,
      growthRate: trends.length >= 2
        ? ((trends[trends.length - 1].users - trends[0].users) / trends[0].users) * 100
        : 0,
    };

    return {
      success: true,
      trends,
      summary,
    };
  }

  @Get('top-performers')
  @ApiOperation({ summary: 'Get top performing content and users' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Top performers retrieved successfully',
  })
  @ApiQuery({ name: 'organizationId', required: false, description: 'Filter by organization' })
  async getTopPerformers(
    @Query('organizationId') organizationId?: string,
  ): Promise<{
    success: boolean;
    topPerformers: TopPerformers;
  }> {
    const topPerformers = await this.analyticsService.getTopPerformers(organizationId);

    return {
      success: true,
      topPerformers,
    };
  }

  @Get('events')
  @ApiOperation({ summary: 'Get analytics events by category' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Analytics events retrieved successfully',
  })
  @ApiQuery({ name: 'category', required: true, enum: EventCategory })
  @ApiQuery({ name: 'organizationId', required: false, description: 'Filter by organization' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Start date' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'End date' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getEventsByCategory(
    @Query('category') category: EventCategory,
    @Query('organizationId') organizationId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 100,
  ): Promise<{
    success: boolean;
    events: AnalyticsEvent[];
    count: number;
  }> {
    const from = dateFrom ? new Date(dateFrom) : undefined;
    const to = dateTo ? new Date(dateTo) : undefined;

    const events = await this.analyticsService.getEventsByCategory(
      category,
      organizationId,
      from,
      to,
      limit
    );

    return {
      success: true,
      events,
      count: events.length,
    };
  }

  @Get('conversion-funnel')
  @ApiOperation({ summary: 'Get conversion funnel analytics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Conversion funnel retrieved successfully',
  })
  @ApiQuery({ name: 'organizationId', required: false, description: 'Filter by organization' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Start date' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'End date' })
  async getConversionFunnel(
    @Query('organizationId') organizationId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<{
    success: boolean;
    funnel: Array<{
      step: string;
      count: number;
      conversionRate: number;
    }>;
    insights: {
      totalConversions: number;
      overallConversionRate: number;
      dropOffPoints: Array<{
        step: string;
        dropOffRate: number;
      }>;
    };
  }> {
    const from = dateFrom ? new Date(dateFrom) : undefined;
    const to = dateTo ? new Date(dateTo) : undefined;

    const funnel = await this.analyticsService.getConversionFunnel(organizationId, from, to);

    // Calculate insights
    const totalConversions = funnel[funnel.length - 1]?.count || 0;
    const overallConversionRate = funnel.length > 0 
      ? (totalConversions / funnel[0].count) * 100 
      : 0;

    const dropOffPoints = funnel.slice(1).map((step, index) => ({
      step: step.step,
      dropOffRate: 100 - step.conversionRate,
    }));

    return {
      success: true,
      funnel,
      insights: {
        totalConversions,
        overallConversionRate,
        dropOffPoints,
      },
    };
  }

  @Post('events/track')
  @ApiOperation({ summary: 'Track custom analytics event' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Event tracked successfully',
  })
  async trackEvent(
    @Body(ValidationPipe) trackEventDto: TrackEventDto,
    @CurrentUser() user: User,
  ): Promise<{
    success: boolean;
    event: AnalyticsEvent;
    message: string;
  }> {
    const event = await this.analyticsService.trackEvent({
      eventType: trackEventDto.eventType,
      category: trackEventDto.category,
      userId: trackEventDto.userId || user.id,
      organizationId: trackEventDto.organizationId,
      sessionId: trackEventDto.sessionId,
      properties: trackEventDto.properties || {},
      context: trackEventDto.context || {},
    });

    return {
      success: true,
      event,
      message: 'Event tracked successfully',
    };
  }

  @Get('user-engagement')
  @ApiOperation({ summary: 'Get user engagement analytics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User engagement analytics retrieved successfully',
  })
  @ApiQuery({ name: 'organizationId', required: false, description: 'Filter by organization' })
  @ApiQuery({ name: 'period', required: false, enum: ['daily', 'weekly', 'monthly'] })
  async getUserEngagement(
    @Query('organizationId') organizationId?: string,
    @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'daily',
  ): Promise<{
    success: boolean;
    engagement: {
      activeUsers: {
        daily: number;
        weekly: number;
        monthly: number;
      };
      sessionMetrics: {
        averageDuration: number;
        averagePageViews: number;
        bounceRate: number;
      };
      userRetention: {
        day1: number;
        day7: number;
        day30: number;
      };
      engagementScore: number;
    };
  }> {
    // This would calculate comprehensive user engagement metrics
    const engagement = {
      activeUsers: {
        daily: await this.analyticsService.getDailyActiveUsers(organizationId),
        weekly: await this.analyticsService.getWeeklyActiveUsers(organizationId),
        monthly: await this.analyticsService.getMonthlyActiveUsers(organizationId),
      },
      sessionMetrics: {
        averageDuration: 0, // Would be calculated from actual session data
        averagePageViews: 0, // Would be calculated from page view events
        bounceRate: 0, // Would be calculated from session data
      },
      userRetention: {
        day1: 0, // Would be calculated from user activity data
        day7: 0,
        day30: 0,
      },
      engagementScore: 0, // Composite score based on various metrics
    };

    return {
      success: true,
      engagement,
    };
  }

  @Get('revenue-analytics')
  @ApiOperation({ summary: 'Get revenue and billing analytics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Revenue analytics retrieved successfully',
  })
  @ApiQuery({ name: 'organizationId', required: false, description: 'Filter by organization' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Start date' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'End date' })
  async getRevenueAnalytics(
    @Query('organizationId') organizationId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<{
    success: boolean;
    revenue: {
      total: number;
      monthlyRecurring: number;
      averageRevenuePerUser: number;
      churnRate: number;
      lifetimeValue: number;
      revenueByPlan: Array<{
        planName: string;
        revenue: number;
        subscribers: number;
      }>;
      revenueGrowth: number;
    };
  }> {
    const from = dateFrom ? new Date(dateFrom) : undefined;
    const to = dateTo ? new Date(dateTo) : undefined;

    const metrics = await this.analyticsService.getMetrics(organizationId, from, to);

    const revenue = {
      total: metrics.totalRevenue,
      monthlyRecurring: metrics.monthlyRecurringRevenue,
      averageRevenuePerUser: metrics.averageRevenuePerUser,
      churnRate: metrics.churnRate,
      lifetimeValue: metrics.lifetimeValue,
      revenueByPlan: [], // Would be calculated from subscription data
      revenueGrowth: 0, // Would be calculated by comparing periods
    };

    return {
      success: true,
      revenue,
    };
  }

  @Get('system-performance')
  @ApiOperation({ summary: 'Get system performance analytics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'System performance analytics retrieved successfully',
  })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Start date' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'End date' })
  async getSystemPerformance(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<{
    success: boolean;
    performance: {
      apiMetrics: {
        totalRequests: number;
        averageResponseTime: number;
        errorRate: number;
        requestsPerSecond: number;
      };
      systemHealth: {
        uptime: number;
        cpuUsage: number;
        memoryUsage: number;
        diskUsage: number;
      };
      errorAnalysis: {
        totalErrors: number;
        errorsByType: Array<{
          type: string;
          count: number;
          percentage: number;
        }>;
        criticalErrors: number;
      };
    };
  }> {
    const from = dateFrom ? new Date(dateFrom) : undefined;
    const to = dateTo ? new Date(dateTo) : undefined;

    const metrics = await this.analyticsService.getMetrics(undefined, from, to);

    const performance = {
      apiMetrics: {
        totalRequests: metrics.apiRequests,
        averageResponseTime: metrics.averageResponseTime,
        errorRate: metrics.errorRate,
        requestsPerSecond: metrics.apiRequests / (24 * 60 * 60), // Rough calculation
      },
      systemHealth: {
        uptime: metrics.uptime,
        cpuUsage: 0, // Would be fetched from system monitoring
        memoryUsage: 0, // Would be fetched from system monitoring
        diskUsage: 0, // Would be fetched from system monitoring
      },
      errorAnalysis: {
        totalErrors: 0, // Would be calculated from error events
        errorsByType: [], // Would be grouped from error events
        criticalErrors: 0, // Would be filtered from error events
      },
    };

    return {
      success: true,
      performance,
    };
  }

  @Get('custom-dashboard')
  @ApiOperation({ summary: 'Get custom dashboard data' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Custom dashboard data retrieved successfully',
  })
  @ApiQuery({ name: 'widgets', required: false, description: 'Comma-separated widget names' })
  @ApiQuery({ name: 'organizationId', required: false, description: 'Filter by organization' })
  async getCustomDashboard(
    @Query('widgets') widgets?: string,
    @Query('organizationId') organizationId?: string,
  ): Promise<{
    success: boolean;
    dashboard: {
      widgets: Array<{
        name: string;
        type: string;
        data: any;
        config: any;
      }>;
      lastUpdated: Date;
    };
  }> {
    const widgetNames = widgets ? widgets.split(',') : [
      'user_metrics',
      'revenue_metrics',
      'engagement_metrics',
      'system_health',
    ];

    const dashboardWidgets = [];

    for (const widgetName of widgetNames) {
      let widgetData = {};
      
      switch (widgetName.trim()) {
        case 'user_metrics':
          const metrics = await this.analyticsService.getMetrics(organizationId);
          widgetData = {
            totalUsers: metrics.totalUsers,
            activeUsers: metrics.activeUsers,
            newUsers: metrics.newUsers,
            userGrowthRate: metrics.userGrowthRate,
          };
          break;
        
        case 'revenue_metrics':
          const revenueMetrics = await this.analyticsService.getMetrics(organizationId);
          widgetData = {
            totalRevenue: revenueMetrics.totalRevenue,
            monthlyRecurringRevenue: revenueMetrics.monthlyRecurringRevenue,
            averageRevenuePerUser: revenueMetrics.averageRevenuePerUser,
          };
          break;
        
        case 'engagement_metrics':
          const engagementMetrics = await this.analyticsService.getMetrics(organizationId);
          widgetData = {
            dailyActiveUsers: engagementMetrics.dailyActiveUsers,
            weeklyActiveUsers: engagementMetrics.weeklyActiveUsers,
            monthlyActiveUsers: engagementMetrics.monthlyActiveUsers,
            sessionDuration: engagementMetrics.sessionDuration,
          };
          break;
        
        case 'system_health':
          const systemMetrics = await this.analyticsService.getMetrics();
          widgetData = {
            apiRequests: systemMetrics.apiRequests,
            averageResponseTime: systemMetrics.averageResponseTime,
            errorRate: systemMetrics.errorRate,
            uptime: systemMetrics.uptime,
          };
          break;
      }

      dashboardWidgets.push({
        name: widgetName.trim(),
        type: 'metric_card',
        data: widgetData,
        config: {
          refreshInterval: 300000, // 5 minutes
          chartType: 'line',
        },
      });
    }

    return {
      success: true,
      dashboard: {
        widgets: dashboardWidgets,
        lastUpdated: new Date(),
      },
    };
  }
}
