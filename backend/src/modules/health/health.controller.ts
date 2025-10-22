import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService, HealthStatus } from './health.service';
import { Public } from '@modules/auth/decorators/public.decorator';

/**
 * Health Controller
 * Provides system health check endpoints for monitoring and load balancers
 */
@ApiTags('Health')
@Controller()
@Public() // Health endpoints are public
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Health check endpoint
   * Returns overall system health status with service details
   */
  @Get('health')
  @ApiOperation({
    summary: 'System health check',
    description: 'Check overall system health including database, Redis, and external services',
  })
  @ApiResponse({
    status: 200,
    description: 'System is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2023-01-01T00:00:00.000Z' },
        uptime: { type: 'number', example: 12345 },
        services: {
          type: 'object',
          properties: {
            database: { type: 'string', example: 'up' },
            redis: { type: 'string', example: 'up' },
            search: { type: 'string', example: 'up' },
            storage: { type: 'string', example: 'up' },
          },
        },
        version: { type: 'string', example: '1.0.0' },
        environment: { type: 'string', example: 'production' },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'System is unhealthy',
  })
  async getHealth(): Promise<HealthStatus> {
    return this.healthService.getHealth();
  }

  /**
   * Readiness check endpoint
   * Returns readiness status for load balancer health checks
   */
  @Get('ready')
  @ApiOperation({
    summary: 'Readiness check',
    description: 'Check if system is ready to accept traffic (for load balancers)',
  })
  @ApiResponse({
    status: 200,
    description: 'System is ready',
    schema: {
      type: 'object',
      properties: {
        ready: { type: 'boolean', example: true },
        timestamp: { type: 'string', example: '2023-01-01T00:00:00.000Z' },
        checks: {
          type: 'object',
          properties: {
            database: { type: 'boolean', example: true },
            migrations: { type: 'boolean', example: true },
            redis: { type: 'boolean', example: true },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'System is not ready',
  })
  async getReadiness(): Promise<{
    ready: boolean;
    timestamp: string;
    checks: Record<string, boolean>;
  }> {
    return this.healthService.getReadiness();
  }

  /**
   * Version information endpoint
   * Returns application version and build information
   */
  @Get('version')
  @ApiOperation({
    summary: 'Version information',
    description: 'Get application version, build time, and environment information',
  })
  @ApiResponse({
    status: 200,
    description: 'Version information',
    schema: {
      type: 'object',
      properties: {
        version: { type: 'string', example: '1.0.0' },
        gitCommit: { type: 'string', example: 'abc123def456' },
        buildTime: { type: 'string', example: '2023-01-01T00:00:00.000Z' },
        environment: { type: 'string', example: 'production' },
        nodeVersion: { type: 'string', example: '18.17.0' },
      },
    },
  })
  async getVersion(): Promise<{
    version: string;
    gitCommit: string;
    buildTime: string;
    environment: string;
    nodeVersion: string;
  }> {
    return this.healthService.getVersion();
  }
}
