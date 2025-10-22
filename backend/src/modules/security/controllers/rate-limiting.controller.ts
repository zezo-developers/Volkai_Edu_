import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../../common/guards/roles.guard';
import { AdminOnly } from '../../../common/decorators/roles.decorator';
import { RateLimitingService } from '../../../common/services/rate-limiting.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

/**
 * Rate Limiting Management Controller
 * Provides endpoints for monitoring and managing rate limits
 */
@ApiTags('Rate Limiting Management')
@Controller('security/rate-limiting')
@UseGuards(JwtAuthGuard, AdminGuard)
@AdminOnly()
@ApiBearerAuth()
export class RateLimitingController {
  constructor(private readonly rateLimitingService: RateLimitingService) {}

  /**
   * Get rate limiting statistics
   */
  @Get('statistics')
  @ApiOperation({
    summary: 'Get rate limiting statistics',
    description: 'Retrieve comprehensive rate limiting statistics and metrics',
  })
  @ApiQuery({
    name: 'timeRange',
    required: false,
    enum: ['hour', 'day', 'week'],
    description: 'Time range for statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        statistics: {
          type: 'object',
          properties: {
            totalRequests: { type: 'number', example: 15420 },
            blockedRequests: { type: 'number', example: 234 },
            blockRate: { type: 'number', example: 1.52 },
            topBlockedIPs: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  ip: { type: 'string', example: '192.168.1.100' },
                  count: { type: 'number', example: 45 },
                  lastSeen: { type: 'string', example: '2024-01-15T10:30:00Z' },
                },
              },
            },
            attackPatterns: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', example: 'brute_force' },
                  count: { type: 'number', example: 15 },
                  severity: { type: 'string', example: 'high' },
                },
              },
            },
            categories: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  category: { type: 'string', example: 'auth:login' },
                  requests: { type: 'number', example: 1250 },
                  blocks: { type: 'number', example: 45 },
                  blockRate: { type: 'number', example: 3.6 },
                },
              },
            },
          },
        },
      },
    },
  })
  async getStatistics(
    @Query('timeRange') timeRange: 'hour' | 'day' | 'week' = 'hour',
  ): Promise<{
    success: boolean;
    statistics: any;
  }> {
    const stats = await this.rateLimitingService.getStatistics(timeRange);
    
    // Calculate additional metrics
    const blockRate = stats.totalRequests > 0 
      ? (stats.blockedRequests / stats.totalRequests) * 100 
      : 0;

    const enhancedStats = {
      ...stats,
      blockRate: Math.round(blockRate * 100) / 100,
      categories: stats.categories.map(cat => ({
        ...cat,
        blockRate: cat.requests > 0 
          ? Math.round((cat.blocks / cat.requests) * 10000) / 100 
          : 0,
      })),
    };

    return {
      success: true,
      statistics: enhancedStats,
    };
  }

  /**
   * Get currently blocked IPs/users
   */
  @Get('blocked')
  @ApiOperation({
    summary: 'Get blocked IPs and users',
    description: 'Retrieve list of currently blocked IPs and users',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by rate limit category',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
  })
  @ApiResponse({
    status: 200,
    description: 'Blocked entities retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        blocked: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string', example: '192.168.1.100' },
              category: { type: 'string', example: 'auth:login' },
              blockedAt: { type: 'string', example: '2024-01-15T10:30:00Z' },
              expiresAt: { type: 'string', example: '2024-01-15T11:00:00Z' },
              reason: { type: 'string', example: 'Rate limit exceeded' },
              remainingTime: { type: 'number', example: 1800 },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 20 },
            total: { type: 'number', example: 45 },
            totalPages: { type: 'number', example: 3 },
          },
        },
      },
    },
  })
  async getBlocked(
    @Query('category') category?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ): Promise<{
    success: boolean;
    blocked: any[];
    pagination: any;
  }> {
    // In a real implementation, this would query Redis for blocked keys
    // For now, return mock data
    const mockBlocked = [
      {
        key: '192.168.1.100',
        category: 'auth:login',
        blockedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
        reason: 'Too many failed login attempts',
        remainingTime: 1200,
      },
      {
        key: 'user:12345',
        category: 'api:upload',
        blockedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 25 * 60 * 1000).toISOString(),
        reason: 'Upload rate limit exceeded',
        remainingTime: 1500,
      },
    ];

    const filtered = category 
      ? mockBlocked.filter(item => item.category === category)
      : mockBlocked;

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedResults = filtered.slice(startIndex, endIndex);

    return {
      success: true,
      blocked: paginatedResults,
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
      },
    };
  }

  /**
   * Manually block an IP or user
   */
  @Post('block')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Manually block IP or user',
    description: 'Manually block an IP address or user for a specified duration',
  })
  @ApiResponse({
    status: 200,
    description: 'Entity blocked successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'IP blocked successfully' },
        blockedUntil: { type: 'string', example: '2024-01-15T12:00:00Z' },
      },
    },
  })
  async blockEntity(
    @Body() blockDto: {
      ip?: string;
      userId?: string;
      category: string;
      durationMinutes: number;
      reason: string;
    },
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<{
    success: boolean;
    message: string;
    blockedUntil: string;
  }> {
    const { ip, userId, category, durationMinutes, reason } = blockDto;
    const durationMs = durationMinutes * 60 * 1000;

    // Create a mock request object for the service
    const mockRequest = {
      connection: { remoteAddress: ip },
      user: userId ? { id: userId } : undefined,
      get: () => null,
    } as any;

    await this.rateLimitingService.blockKey(
      mockRequest,
      category,
      durationMs,
      `Manual block by ${admin.email}: ${reason}`,
    );

    const blockedUntil = new Date(Date.now() + durationMs).toISOString();
    const entity = ip || `user:${userId}`;

    return {
      success: true,
      message: `${entity} blocked successfully`,
      blockedUntil,
    };
  }

  /**
   * Unblock an IP or user
   */
  @Delete('block')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Unblock IP or user',
    description: 'Remove a block from an IP address or user',
  })
  @ApiResponse({
    status: 200,
    description: 'Entity unblocked successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'IP unblocked successfully' },
      },
    },
  })
  async unblockEntity(
    @Body() unblockDto: {
      ip?: string;
      userId?: string;
      category: string;
      reason: string;
    },
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    const { ip, userId, category, reason } = unblockDto;

    // Create a mock request object for the service
    const mockRequest = {
      connection: { remoteAddress: ip },
      user: userId ? { id: userId } : undefined,
      get: () => null,
    } as any;

    await this.rateLimitingService.unblockKey(
      mockRequest,
      category,
      `Manual unblock by ${admin.email}: ${reason}`,
    );

    const entity = ip || `user:${userId}`;

    return {
      success: true,
      message: `${entity} unblocked successfully`,
    };
  }

  /**
   * Get attack patterns detected in the last period
   */
  @Get('attack-patterns')
  @ApiOperation({
    summary: 'Get detected attack patterns',
    description: 'Retrieve recently detected attack patterns and threats',
  })
  @ApiQuery({
    name: 'hours',
    required: false,
    type: Number,
    description: 'Number of hours to look back (default: 24)',
  })
  @ApiQuery({
    name: 'severity',
    required: false,
    enum: ['low', 'medium', 'high', 'critical'],
    description: 'Filter by severity level',
  })
  @ApiResponse({
    status: 200,
    description: 'Attack patterns retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        patterns: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'pattern_123' },
              type: { type: 'string', example: 'brute_force' },
              severity: { type: 'string', example: 'high' },
              confidence: { type: 'number', example: 95 },
              detectedAt: { type: 'string', example: '2024-01-15T10:30:00Z' },
              sourceIp: { type: 'string', example: '192.168.1.100' },
              indicators: {
                type: 'array',
                items: { type: 'string' },
                example: ['50 failed login attempts in 5 minutes', 'Multiple user accounts targeted'],
              },
              actionTaken: { type: 'string', example: 'IP blocked for 2 hours' },
              status: { type: 'string', example: 'mitigated' },
            },
          },
        },
        summary: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 15 },
            byType: {
              type: 'object',
              example: {
                brute_force: 8,
                ddos: 3,
                enumeration: 2,
                credential_stuffing: 2,
              },
            },
            bySeverity: {
              type: 'object',
              example: {
                critical: 1,
                high: 5,
                medium: 6,
                low: 3,
              },
            },
          },
        },
      },
    },
  })
  async getAttackPatterns(
    @Query('hours') hours: number = 24,
    @Query('severity') severity?: 'low' | 'medium' | 'high' | 'critical',
  ): Promise<{
    success: boolean;
    patterns: any[];
    summary: any;
  }> {
    // In a real implementation, this would query stored attack patterns
    // For now, return mock data
    const mockPatterns = [
      {
        id: 'pattern_001',
        type: 'brute_force',
        severity: 'high',
        confidence: 95,
        detectedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        sourceIp: '192.168.1.100',
        indicators: [
          '50 failed login attempts in 5 minutes',
          'Multiple user accounts targeted',
          'Consistent timing pattern',
        ],
        actionTaken: 'IP blocked for 2 hours',
        status: 'mitigated',
      },
      {
        id: 'pattern_002',
        type: 'ddos',
        severity: 'critical',
        confidence: 98,
        detectedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        sourceIp: '10.0.0.50',
        indicators: [
          '500 requests per second',
          'Distributed across multiple endpoints',
          'Suspicious user agent patterns',
        ],
        actionTaken: 'IP blocked for 24 hours, upstream filtering enabled',
        status: 'mitigated',
      },
    ];

    const filtered = severity 
      ? mockPatterns.filter(pattern => pattern.severity === severity)
      : mockPatterns;

    const summary = {
      total: filtered.length,
      byType: filtered.reduce((acc, pattern) => {
        acc[pattern.type] = (acc[pattern.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      bySeverity: filtered.reduce((acc, pattern) => {
        acc[pattern.severity] = (acc[pattern.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    return {
      success: true,
      patterns: filtered,
      summary,
    };
  }

  /**
   * Update rate limit configuration
   */
  @Post('config/:category')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update rate limit configuration',
    description: 'Update rate limiting configuration for a specific category',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuration updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Rate limit configuration updated' },
        config: {
          type: 'object',
          properties: {
            category: { type: 'string', example: 'auth:login' },
            windowMs: { type: 'number', example: 900000 },
            maxRequests: { type: 'number', example: 5 },
            blockDurationMs: { type: 'number', example: 1800000 },
          },
        },
      },
    },
  })
  async updateConfig(
    @Param('category') category: string,
    @Body() configDto: {
      windowMs?: number;
      maxRequests?: number;
      blockDurationMs?: number;
    },
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<{
    success: boolean;
    message: string;
    config: any;
  }> {
    // In a real implementation, this would update the configuration
    // For now, just return the updated config
    const updatedConfig = {
      category,
      ...configDto,
      updatedBy: admin.email,
      updatedAt: new Date().toISOString(),
    };

    return {
      success: true,
      message: 'Rate limit configuration updated successfully',
      config: updatedConfig,
    };
  }

  /**
   * Test rate limiting for debugging
   */
  @Post('test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Test rate limiting',
    description: 'Test rate limiting configuration for debugging purposes',
  })
  @ApiResponse({
    status: 200,
    description: 'Rate limit test completed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        testResult: {
          type: 'object',
          properties: {
            category: { type: 'string', example: 'auth:login' },
            allowed: { type: 'boolean', example: true },
            totalHits: { type: 'number', example: 3 },
            remainingPoints: { type: 'number', example: 2 },
            resetTime: { type: 'string', example: '2024-01-15T11:15:00Z' },
          },
        },
      },
    },
  })
  async testRateLimit(
    @Body() testDto: {
      category: string;
      ip?: string;
      userId?: string;
    },
  ): Promise<{
    success: boolean;
    testResult: any;
  }> {
    const { category, ip, userId } = testDto;

    // Create a mock request for testing
    const mockRequest = {
      connection: { remoteAddress: ip || '127.0.0.1' },
      user: userId ? { id: userId } : undefined,
      get: () => null,
      path: '/test',
      method: 'POST',
    } as any;

    const result = await this.rateLimitingService.checkRateLimit(mockRequest, category);

    return {
      success: true,
      testResult: {
        category,
        ...result,
        resetTime: result.resetTime.toISOString(),
      },
    };
  }
}
