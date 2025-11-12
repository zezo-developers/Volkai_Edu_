import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
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
import { ResumeAnalyticsService } from '../services/resume-analytics.service';
import {
  ResumeAnalyticsOverviewDto,
  UserResumeAnalyticsDto,
  ResumePerformanceDto,
  SkillAnalyticsDto,
  TemplateAnalyticsDto,
} from '../dto/resume-analytics.dto';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@ApiTags('Resume Analytics')
@Controller('resume/analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ResumeAnalyticsController {
  constructor(
    private readonly analyticsService: ResumeAnalyticsService,
  ) {}

  @Get('overview')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Get resume analytics overview' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resume analytics overview retrieved successfully',
    type: ResumeAnalyticsOverviewDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiQuery({ name: 'organizationId', required: false, description: 'Filter by organization' })
  async getAnalyticsOverview(
    @Query('organizationId') organizationId?: string,
    @CurrentUser() user?: any,
  ): Promise<ResumeAnalyticsOverviewDto> {
    return await this.analyticsService.getResumeAnalyticsOverview(organizationId, user);
  }

  @Get('user/my')
  @ApiOperation({ summary: 'Get current user resume analytics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User resume analytics retrieved successfully',
    type: UserResumeAnalyticsDto,
  })
  async getMyResumeAnalytics(
    @CurrentUser() user: any,
  ): Promise<UserResumeAnalyticsDto> {
    return await this.analyticsService.getUserResumeAnalytics(user.id, user);
  }

  @Get('user/:userId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get user resume analytics by user ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User resume analytics retrieved successfully',
    type: UserResumeAnalyticsDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Cannot access other user analytics',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async getUserResumeAnalytics(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: any,
  ): Promise<UserResumeAnalyticsDto> {
    return await this.analyticsService.getUserResumeAnalytics(userId, user);
  }

  @Get('resume/:resumeId/performance')
  @ApiOperation({ summary: 'Get resume performance metrics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resume performance metrics retrieved successfully',
    type: ResumePerformanceDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Resume not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Cannot access resume performance metrics',
  })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  async getResumePerformance(
    @Param('resumeId', ParseUUIDPipe) resumeId: string,
    @CurrentUser() user: any,
  ): Promise<ResumePerformanceDto> {
    return await this.analyticsService.getResumePerformanceMetrics(resumeId, user);
  }

  @Get('skills')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Get skill analytics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Skill analytics retrieved successfully',
    type: SkillAnalyticsDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiQuery({ name: 'organizationId', required: false, description: 'Filter by organization' })
  async getSkillAnalytics(
    @Query('organizationId') organizationId?: string,
    @CurrentUser() user?: any,
  ): Promise<SkillAnalyticsDto> {
    return await this.analyticsService.getSkillAnalytics(organizationId, user);
  }

  @Get('templates')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Get template analytics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template analytics retrieved successfully',
    type: TemplateAnalyticsDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async getTemplateAnalytics(
    @CurrentUser() user?: any,
  ): Promise<TemplateAnalyticsDto> {
    return await this.analyticsService.getTemplateAnalytics(user);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get analytics dashboard data' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dashboard data retrieved successfully',
  })
  async getDashboardData(
    @CurrentUser() user: any,
  ): Promise<any> {
    const userAnalytics = await this.analyticsService.getUserResumeAnalytics(user.id, user);
    
    // Get additional dashboard-specific data
    const dashboardData = {
      userAnalytics,
      quickStats: {
        totalResumes: userAnalytics.totalResumes,
        totalViews: userAnalytics.totalViews,
        averageAtsScore: userAnalytics.averageAtsScore,
        completionRate: userAnalytics.averageCompletionRate,
      },
      recentActivity: userAnalytics.activityTrend.slice(-7), // Last 7 days
      topPerformingResume: userAnalytics.resumePerformance
        .sort((a, b) => b.views - a.views)[0] || null,
      recommendations: userAnalytics.recommendations.slice(0, 3), // Top 3 recommendations
    };

    return dashboardData;
  }

  @Get('trends')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Get resume trends and insights' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resume trends retrieved successfully',
  })
  @ApiQuery({ name: 'period', required: false, description: 'Time period (7d, 30d, 90d, 1y)' })
  @ApiQuery({ name: 'organizationId', required: false, description: 'Filter by organization' })
  async getResumeTrends(
    @Query('period') period: string = '30d',
    @Query('organizationId') organizationId?: string,
    @CurrentUser() user?: any,
  ): Promise<any> {
    // This would analyze trends over the specified period
    return {
      period,
      trends: {
        resumeCreation: {
          current: 150,
          previous: 120,
          change: 25,
          trend: 'up',
        },
        templateUsage: {
          mostPopular: 'Modern Professional',
          growthRate: 15.5,
          categoryTrends: {
            modern: 35,
            classic: 25,
            creative: 20,
            minimal: 15,
            professional: 5,
          },
        },
        skillTrends: {
          emerging: ['AI/ML', 'Cloud Computing', 'DevOps'],
          declining: ['Flash', 'Internet Explorer'],
          stable: ['JavaScript', 'Python', 'Communication'],
        },
        performanceMetrics: {
          averageViews: 45,
          averageDownloads: 12,
          conversionRate: 26.7,
          engagementRate: 68.3,
        },
      },
      insights: [
        'Resume creation increased by 25% this month',
        'Modern templates are gaining popularity',
        'AI/ML skills are trending upward',
        'Average ATS scores improved by 8%',
      ],
    };
  }

  @Get('benchmarks')
  @ApiOperation({ summary: 'Get resume performance benchmarks' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Performance benchmarks retrieved successfully',
  })
  @ApiQuery({ name: 'industry', required: false, description: 'Filter by industry' })
  @ApiQuery({ name: 'experience', required: false, description: 'Filter by experience level' })
  async getPerformanceBenchmarks(
    @Query('industry') industry?: string,
    @Query('experience') experience?: string,
    @CurrentUser() user?: any,
  ): Promise<any> {
    // This would provide industry and experience-level benchmarks
    return {
      benchmarks: {
        views: {
          percentile25: 15,
          percentile50: 35,
          percentile75: 65,
          percentile90: 120,
        },
        downloads: {
          percentile25: 3,
          percentile50: 8,
          percentile75: 18,
          percentile90: 35,
        },
        atsScore: {
          percentile25: 65,
          percentile50: 78,
          percentile75: 88,
          percentile90: 95,
        },
        completionRate: {
          percentile25: 70,
          percentile50: 85,
          percentile75: 95,
          percentile90: 100,
        },
      },
      industryAverages: industry ? {
        industry,
        averageViews: 42,
        averageDownloads: 11,
        averageAtsScore: 82,
        topSkills: ['JavaScript', 'Python', 'React', 'Node.js', 'AWS'],
      } : null,
      experienceAverages: experience ? {
        level: experience,
        averageViews: 38,
        averageDownloads: 9,
        averageAtsScore: 79,
        recommendedSections: ['experience', 'skills', 'education', 'projects'],
      } : null,
    };
  }

  @Get('export')
  @ApiOperation({ summary: 'Export analytics data' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Analytics data exported successfully',
  })
  @ApiQuery({ name: 'format', required: false, description: 'Export format (json, csv, xlsx)' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Start date for data export' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'End date for data export' })
  async exportAnalytics(
    @Query('format') format: string = 'json',
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @CurrentUser() user?: any,
  ): Promise<any> {
    const userAnalytics = await this.analyticsService.getUserResumeAnalytics(user.id, user);
    
    // This would format the data according to the requested format
    return {
      format,
      exportedAt: new Date(),
      dateRange: {
        from: dateFrom || null,
        to: dateTo || null,
      },
      data: {
        summary: {
          totalResumes: userAnalytics.totalResumes,
          totalViews: userAnalytics.totalViews,
          totalDownloads: userAnalytics.totalDownloads,
          averageAtsScore: userAnalytics.averageAtsScore,
        },
        resumes: userAnalytics.resumePerformance,
        skills: userAnalytics.skillsAnalysis,
        trends: userAnalytics.activityTrend,
      },
    };
  }

  @Get('reports/summary')
  @ApiOperation({ summary: 'Get analytics summary report' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Summary report generated successfully',
  })
  @ApiQuery({ name: 'period', required: false, description: 'Report period' })
  async getSummaryReport(
    @Query('period') period: string = 'monthly',
    @CurrentUser() user: any,
  ): Promise<any> {
    const userAnalytics = await this.analyticsService.getUserResumeAnalytics(user.id, user);
    
    return {
      reportType: 'summary',
      period,
      generatedAt: new Date(),
      user: {
        id: user.id,
        name: user.fullName,
        email: user.email,
      },
      metrics: {
        resumes: {
          total: userAnalytics.totalResumes,
          completed: userAnalytics.completedResumes,
          completionRate: userAnalytics.averageCompletionRate,
        },
        engagement: {
          totalViews: userAnalytics.totalViews,
          totalDownloads: userAnalytics.totalDownloads,
          totalShares: userAnalytics.totalShares,
        },
        quality: {
          averageAtsScore: userAnalytics.averageAtsScore,
          topPerformingResume: userAnalytics.resumePerformance[0] || null,
        },
        skills: {
          totalSkills: userAnalytics.skillsAnalysis.totalSkills,
          verifiedSkills: userAnalytics.skillsAnalysis.verifiedSkills,
          featuredSkills: userAnalytics.skillsAnalysis.featuredSkills,
        },
      },
      recommendations: userAnalytics.recommendations,
      nextSteps: [
        'Complete any unfinished resumes',
        'Optimize ATS scores for better visibility',
        'Add more verified skills to your profile',
        'Share your resume to increase visibility',
      ],
    };
  }
}
