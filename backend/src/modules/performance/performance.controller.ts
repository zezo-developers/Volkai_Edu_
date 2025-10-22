import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../database/entities/user.entity';
import { PerformanceService } from './performance.service';

@ApiTags('Performance')
@Controller('performance')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PerformanceController {
  constructor(private readonly performanceService: PerformanceService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get current performance metrics' })
  @ApiResponse({ status: 200, description: 'Performance metrics retrieved successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER)
  async getCurrentMetrics() {
    const metrics = await this.performanceService.getCurrentMetrics();

    return {
      success: true,
      data: metrics,
      message: 'Performance metrics retrieved successfully',
    };
  }

  @Get('database/health')
  @ApiOperation({ summary: 'Get database health information' })
  @ApiResponse({ status: 200, description: 'Database health retrieved successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER)
  async getDatabaseHealth() {
    const health = await this.performanceService.getDatabaseHealth();

    return {
      success: true,
      data: health,
      message: 'Database health information retrieved successfully',
    };
  }

  @Get('recommendations')
  @ApiOperation({ summary: 'Get query optimization recommendations' })
  @ApiResponse({ status: 200, description: 'Recommendations retrieved successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER)
  async getRecommendations() {
    const recommendations = await this.performanceService.getQueryOptimizationRecommendations();

    return {
      success: true,
      data: recommendations,
      message: 'Query optimization recommendations retrieved successfully',
    };
  }

  @Post('optimize')
  @ApiOperation({ summary: 'Perform database optimization' })
  @ApiResponse({ status: 200, description: 'Database optimization completed' })
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN)
  async optimizeDatabase() {
    const result = await this.performanceService.optimizeDatabase();

    return {
      success: true,
      data: result,
      message: 'Database optimization completed successfully',
    };
  }

  @Get('report')
  @ApiOperation({ summary: 'Get comprehensive performance report' })
  @ApiResponse({ status: 200, description: 'Performance report generated successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER)
  async getPerformanceReport() {
    const report = await this.performanceService.getPerformanceReport();

    return {
      success: true,
      data: report,
      message: 'Performance report generated successfully',
    };
  }

  @Get('metrics/history')
  @ApiOperation({ summary: 'Get performance metrics history' })
  @ApiResponse({ status: 200, description: 'Metrics history retrieved successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER)
  async getMetricsHistory(@Query('hours') hours: number = 1) {
    const history = this.performanceService.getMetricsHistory(hours);

    return {
      success: true,
      data: history,
      message: 'Performance metrics history retrieved successfully',
    };
  }
}
