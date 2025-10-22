import {
  Controller,
  Get,
  Post,
  Param,
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
import { MonitoringService } from './monitoring.service';

@ApiTags('Monitoring')
@Controller('monitoring')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('health')
  @ApiOperation({ summary: 'Get system health status' })
  @ApiResponse({ status: 200, description: 'Health status retrieved successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER)
  async getHealthStatus() {
    const health = await this.monitoringService.getHealthStatus();

    return {
      success: true,
      data: health,
      message: 'System health status retrieved successfully',
    };
  }

  @Get('metrics/current')
  @ApiOperation({ summary: 'Get current system metrics' })
  @ApiResponse({ status: 200, description: 'Current metrics retrieved successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER)
  async getCurrentMetrics() {
    const metrics = this.monitoringService.getCurrentMetrics();

    return {
      success: true,
      data: metrics,
      message: 'Current system metrics retrieved successfully',
    };
  }

  @Get('metrics/system')
  @ApiOperation({ summary: 'Get system metrics history' })
  @ApiResponse({ status: 200, description: 'System metrics history retrieved successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER)
  async getSystemMetrics(@Query('minutes') minutes: number = 60) {
    const metrics = this.monitoringService.getSystemMetricsHistory(minutes);

    return {
      success: true,
      data: metrics,
      message: 'System metrics history retrieved successfully',
    };
  }

  @Get('metrics/application')
  @ApiOperation({ summary: 'Get application metrics history' })
  @ApiResponse({ status: 200, description: 'Application metrics history retrieved successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER)
  async getApplicationMetrics(@Query('minutes') minutes: number = 60) {
    const metrics = this.monitoringService.getApplicationMetricsHistory(minutes);

    return {
      success: true,
      data: metrics,
      message: 'Application metrics history retrieved successfully',
    };
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get system alerts' })
  @ApiResponse({ status: 200, description: 'System alerts retrieved successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER)
  async getAlerts(@Query('resolved') resolved?: boolean) {
    const alerts = this.monitoringService.getAlerts(resolved);

    return {
      success: true,
      data: alerts,
      message: 'System alerts retrieved successfully',
    };
  }

  @Post('alerts/:id/resolve')
  @ApiOperation({ summary: 'Resolve system alert' })
  @ApiResponse({ status: 200, description: 'Alert resolved successfully' })
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN)
  async resolveAlert(@Param('id') alertId: string) {
    this.monitoringService.resolveAlert(alertId);

    return {
      success: true,
      message: 'Alert resolved successfully',
    };
  }

  @Post('metrics/collect')
  @ApiOperation({ summary: 'Manually trigger metrics collection' })
  @ApiResponse({ status: 200, description: 'Metrics collection triggered successfully' })
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN, Role.DEVELOPER)
  async collectMetrics() {
    await this.monitoringService.collectMetrics();

    return {
      success: true,
      message: 'Metrics collection triggered successfully',
    };
  }
}
