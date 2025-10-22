import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../../common/guards/roles.guard';
import { AdminOnly } from '../../../common/decorators/roles.decorator';
import { CachingService } from '../../../common/services/caching.service';
import { QueryCacheService } from '../../../common/services/query-cache.service';
import { CacheInvalidationService } from '../../../common/services/cache-invalidation.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

/**
 * Caching Management Controller
 * Provides endpoints for cache monitoring, management, and optimization
 */
@ApiTags('Cache Management')
@Controller('admin/cache')
@UseGuards(JwtAuthGuard, AdminGuard)
@AdminOnly()
@ApiBearerAuth()
export class CachingController {
  constructor(
    private readonly cachingService: CachingService,
    private readonly queryCacheService: QueryCacheService,
    private readonly cacheInvalidationService: CacheInvalidationService,
  ) {}

  /**
   * Get comprehensive cache statistics
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Get cache statistics',
    description: 'Retrieve comprehensive caching performance metrics and statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Cache statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        statistics: {
          type: 'object',
          properties: {
            general: {
              type: 'object',
              properties: {
                hits: { type: 'number', example: 15420 },
                misses: { type: 'number', example: 2340 },
                hitRate: { type: 'number', example: 86.8 },
                totalKeys: { type: 'number', example: 1250 },
                memoryUsage: { type: 'number', example: 52428800 },
              },
            },
            queryCache: {
              type: 'object',
              properties: {
                totalQueries: { type: 'number', example: 8500 },
                cachedQueries: { type: 'number', example: 320 },
                cacheHitRate: { type: 'number', example: 78.5 },
                averageExecutionTime: { type: 'number', example: 45 },
                memorySaved: { type: 'number', example: 125000 },
              },
            },
            invalidation: {
              type: 'object',
              properties: {
                totalInvalidations: { type: 'number', example: 1250 },
                invalidationsByType: {
                  type: 'object',
                  additionalProperties: { type: 'number' },
                },
                averageInvalidationTime: { type: 'number', example: 15 },
              },
            },
          },
        },
      },
    },
  })
  async getCacheStatistics(): Promise<{
    success: boolean;
    statistics: any;
  }> {
    const [generalStats, queryStats, invalidationStats] = await Promise.all([
      this.cachingService.getStats(),
      this.queryCacheService.getQueryCacheStats(),
      this.cacheInvalidationService.getInvalidationStats(),
    ]);

    return {
      success: true,
      statistics: {
        general: generalStats,
        queryCache: queryStats,
        invalidation: invalidationStats,
      },
    };
  }

  /**
   * Get cached keys with metadata
   */
  @Get('keys')
  @ApiOperation({
    summary: 'Get cached keys',
    description: 'Retrieve list of cached keys with metadata and usage information',
  })
  @ApiQuery({
    name: 'namespace',
    required: false,
    type: String,
    description: 'Filter by cache namespace',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of keys to return',
  })
  @ApiResponse({
    status: 200,
    description: 'Cache keys retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        keys: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string', example: 'user:123:profile' },
              ttl: { type: 'number', example: 3600 },
              size: { type: 'number', example: 1024 },
              tags: { type: 'array', items: { type: 'string' } },
              createdAt: { type: 'string', example: '2024-01-15T10:30:00Z' },
              lastAccessed: { type: 'string', example: '2024-01-15T11:15:00Z' },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 1250 },
            limit: { type: 'number', example: 50 },
            namespace: { type: 'string', example: 'user' },
          },
        },
      },
    },
  })
  async getCacheKeys(
    @Query('namespace') namespace?: string,
    @Query('limit') limit: number = 50,
  ): Promise<{
    success: boolean;
    keys: any[];
    pagination: any;
  }> {
    const keys = await this.cachingService.getCacheKeys(namespace, limit);

    return {
      success: true,
      keys,
      pagination: {
        total: keys.length,
        limit,
        namespace: namespace || 'all',
      },
    };
  }

  /**
   * Get query cache information
   */
  @Get('queries')
  @ApiOperation({
    summary: 'Get cached queries',
    description: 'Retrieve information about cached database queries',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of queries to return',
  })
  @ApiResponse({
    status: 200,
    description: 'Cached queries retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        queries: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string', example: 'query:abc123' },
              query: { type: 'string', example: 'SELECT * FROM users WHERE...' },
              size: { type: 'number', example: 2048 },
              ttl: { type: 'number', example: 1800 },
              hitCount: { type: 'number', example: 25 },
              lastAccessed: { type: 'string', example: '2024-01-15T11:15:00Z' },
            },
          },
        },
        summary: {
          type: 'object',
          properties: {
            totalQueries: { type: 'number', example: 320 },
            totalSize: { type: 'number', example: 1048576 },
            averageHitCount: { type: 'number', example: 8.5 },
          },
        },
      },
    },
  })
  async getCachedQueries(
    @Query('limit') limit: number = 50,
  ): Promise<{
    success: boolean;
    queries: any[];
    summary: any;
  }> {
    const queries = await this.queryCacheService.getCachedQueries(limit);
    
    const summary = {
      totalQueries: queries.length,
      totalSize: queries.reduce((sum, q) => sum + q.size, 0),
      averageHitCount: queries.length > 0 
        ? Math.round(queries.reduce((sum, q) => sum + q.hitCount, 0) / queries.length * 10) / 10
        : 0,
    };

    return {
      success: true,
      queries,
      summary,
    };
  }

  /**
   * Clear cache by namespace
   */
  @Delete('namespace/:namespace')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Clear cache namespace',
    description: 'Clear all cache entries in a specific namespace',
  })
  @ApiResponse({
    status: 200,
    description: 'Cache namespace cleared successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Cache namespace cleared successfully' },
        clearedKeys: { type: 'number', example: 125 },
        namespace: { type: 'string', example: 'user' },
      },
    },
  })
  async clearNamespace(
    @Param('namespace') namespace: string,
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<{
    success: boolean;
    message: string;
    clearedKeys: number;
    namespace: string;
  }> {
    const clearedKeys = await this.cachingService.clearNamespace(namespace);

    return {
      success: true,
      message: `Cache namespace '${namespace}' cleared successfully`,
      clearedKeys,
      namespace,
    };
  }

  /**
   * Clear query cache
   */
  @Delete('queries')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Clear query cache',
    description: 'Clear all cached database query results',
  })
  @ApiResponse({
    status: 200,
    description: 'Query cache cleared successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Query cache cleared successfully' },
        clearedQueries: { type: 'number', example: 320 },
      },
    },
  })
  async clearQueryCache(
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<{
    success: boolean;
    message: string;
    clearedQueries: number;
  }> {
    const clearedQueries = await this.queryCacheService.clearQueryCache();

    return {
      success: true,
      message: 'Query cache cleared successfully',
      clearedQueries,
    };
  }

  /**
   * Invalidate cache by pattern
   */
  @Post('invalidate/pattern')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Invalidate cache by pattern',
    description: 'Invalidate cache entries matching a specific pattern',
  })
  @ApiResponse({
    status: 200,
    description: 'Cache invalidated by pattern successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Cache invalidated successfully' },
        invalidatedKeys: { type: 'number', example: 45 },
        pattern: { type: 'string', example: 'user:123:*' },
      },
    },
  })
  async invalidateByPattern(
    @Body() body: { pattern: string; namespace?: string },
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<{
    success: boolean;
    message: string;
    invalidatedKeys: number;
    pattern: string;
  }> {
    const { pattern, namespace } = body;
    const invalidatedKeys = await this.cacheInvalidationService.invalidateByCustomPattern(pattern, namespace);

    return {
      success: true,
      message: 'Cache invalidated by pattern successfully',
      invalidatedKeys,
      pattern,
    };
  }

  /**
   * Invalidate cache by tags
   */
  @Post('invalidate/tags')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Invalidate cache by tags',
    description: 'Invalidate cache entries with specific tags',
  })
  @ApiResponse({
    status: 200,
    description: 'Cache invalidated by tags successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Cache invalidated successfully' },
        invalidatedKeys: { type: 'number', example: 78 },
        tags: { type: 'array', items: { type: 'string' }, example: ['users', 'profile'] },
      },
    },
  })
  async invalidateByTags(
    @Body() body: { tags: string[] },
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<{
    success: boolean;
    message: string;
    invalidatedKeys: number;
    tags: string[];
  }> {
    const { tags } = body;
    const invalidatedKeys = await this.cacheInvalidationService.invalidateByCustomTags(tags);

    return {
      success: true,
      message: 'Cache invalidated by tags successfully',
      invalidatedKeys,
      tags,
    };
  }

  /**
   * Warm up cache
   */
  @Post('warmup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Warm up cache',
    description: 'Pre-populate cache with frequently accessed data',
  })
  @ApiResponse({
    status: 200,
    description: 'Cache warm-up completed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Cache warm-up completed successfully' },
        warmedEntries: { type: 'number', example: 150 },
        duration: { type: 'number', example: 2500 },
      },
    },
  })
  async warmUpCache(
    @Body() body: {
      type: 'common' | 'custom';
      entries?: Array<{ key: string; value: any; ttl?: number }>;
    },
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<{
    success: boolean;
    message: string;
    warmedEntries: number;
    duration: number;
  }> {
    const startTime = Date.now();
    let warmedEntries = 0;

    if (body.type === 'common') {
      // Warm up with common data patterns
      const commonWarmUpData = await this.getCommonWarmUpData();
      await this.cachingService.warmUp(commonWarmUpData);
      warmedEntries = commonWarmUpData.length;
    } else if (body.type === 'custom' && body.entries) {
      // Warm up with custom data
      const customWarmUpData = body.entries.map(entry => ({
        key: entry.key,
        value: entry.value,
        options: { ttl: entry.ttl },
      }));
      await this.cachingService.warmUp(customWarmUpData);
      warmedEntries = customWarmUpData.length;
    }

    const duration = Date.now() - startTime;

    return {
      success: true,
      message: 'Cache warm-up completed successfully',
      warmedEntries,
      duration,
    };
  }

  /**
   * Optimize cache
   */
  @Post('optimize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Optimize cache',
    description: 'Perform cache optimization by removing expired and unused entries',
  })
  @ApiResponse({
    status: 200,
    description: 'Cache optimization completed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Cache optimization completed successfully' },
        optimization: {
          type: 'object',
          properties: {
            removedExpired: { type: 'number', example: 25 },
            removedLRU: { type: 'number', example: 15 },
            compactedMemory: { type: 'number', example: 2048576 },
          },
        },
        duration: { type: 'number', example: 1500 },
      },
    },
  })
  async optimizeCache(
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<{
    success: boolean;
    message: string;
    optimization: any;
    duration: number;
  }> {
    const startTime = Date.now();
    const optimization = await this.cachingService.optimize();
    const duration = Date.now() - startTime;

    return {
      success: true,
      message: 'Cache optimization completed successfully',
      optimization,
      duration,
    };
  }

  /**
   * Get cache health report
   */
  @Get('health')
  @ApiOperation({
    summary: 'Get cache health report',
    description: 'Generate comprehensive cache health and performance report',
  })
  @ApiResponse({
    status: 200,
    description: 'Cache health report generated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        health: {
          type: 'object',
          properties: {
            overall: { type: 'string', example: 'excellent' },
            score: { type: 'number', example: 92 },
            metrics: {
              type: 'object',
              properties: {
                hitRate: { type: 'number', example: 86.8 },
                memoryUsage: { type: 'number', example: 52428800 },
                averageResponseTime: { type: 'number', example: 2.5 },
                errorRate: { type: 'number', example: 0.1 },
              },
            },
            recommendations: {
              type: 'array',
              items: { type: 'string' },
              example: [
                'Cache hit rate is excellent',
                'Consider increasing TTL for frequently accessed data',
                'Memory usage is within optimal range',
              ],
            },
          },
        },
      },
    },
  })
  async getCacheHealth(): Promise<{
    success: boolean;
    health: any;
  }> {
    const stats = await this.cachingService.getStats();
    const queryStats = await this.queryCacheService.getQueryCacheStats();

    // Calculate health score
    let score = 100;
    
    // Deduct points for low hit rate
    if (stats.hitRate < 70) score -= 20;
    else if (stats.hitRate < 80) score -= 10;
    
    // Deduct points for high memory usage (assuming 100MB is the limit)
    const memoryLimitMB = 100 * 1024 * 1024;
    if (stats.memoryUsage > memoryLimitMB * 0.9) score -= 15;
    else if (stats.memoryUsage > memoryLimitMB * 0.7) score -= 5;
    
    // Deduct points for slow query cache
    if (queryStats.averageExecutionTime > 100) score -= 10;
    else if (queryStats.averageExecutionTime > 50) score -= 5;

    const overall = this.getHealthStatus(score);
    const recommendations = this.generateHealthRecommendations(stats, queryStats, score);

    return {
      success: true,
      health: {
        overall,
        score,
        metrics: {
          hitRate: stats.hitRate,
          memoryUsage: stats.memoryUsage,
          averageResponseTime: queryStats.averageExecutionTime,
          errorRate: 0.1, // Mock error rate
        },
        recommendations,
      },
    };
  }

  /**
   * Get invalidation rules
   */
  @Get('invalidation/rules')
  @ApiOperation({
    summary: 'Get cache invalidation rules',
    description: 'Retrieve all configured cache invalidation rules',
  })
  @ApiResponse({
    status: 200,
    description: 'Invalidation rules retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        rules: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              entityType: { type: 'string', example: 'user' },
              patterns: { type: 'array', items: { type: 'string' } },
              tags: { type: 'array', items: { type: 'string' } },
              cascadeRules: { type: 'array', items: { type: 'object' } },
            },
          },
        },
      },
    },
  })
  async getInvalidationRules(): Promise<{
    success: boolean;
    rules: any;
  }> {
    const rules = this.cacheInvalidationService.getInvalidationRules();
    const rulesObject = Object.fromEntries(rules);

    return {
      success: true,
      rules: rulesObject,
    };
  }

  /**
   * Test invalidation rule
   */
  @Post('invalidation/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Test invalidation rule',
    description: 'Test how an invalidation rule would behave with given parameters',
  })
  @ApiResponse({
    status: 200,
    description: 'Invalidation rule test completed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        test: {
          type: 'object',
          properties: {
            patterns: { type: 'array', items: { type: 'string' } },
            tags: { type: 'array', items: { type: 'string' } },
            cascadeRules: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  })
  async testInvalidationRule(
    @Body() body: {
      entityType: string;
      entityId?: string;
      organizationId?: string;
      userId?: string;
      metadata?: any;
    },
  ): Promise<{
    success: boolean;
    test: any;
  }> {
    const test = await this.cacheInvalidationService.testInvalidationRule(
      body.entityType,
      {
        entityId: body.entityId,
        organizationId: body.organizationId,
        userId: body.userId,
        metadata: body.metadata,
      }
    );

    return {
      success: true,
      test,
    };
  }

  // Private helper methods

  private async getCommonWarmUpData(): Promise<Array<{
    key: string;
    value: any;
    options?: any;
  }>> {
    // Return common data patterns for warm-up
    return [
      {
        key: 'system:config',
        value: { version: '1.0.0', features: ['caching', 'optimization'] },
        options: { ttl: 3600, namespace: 'system' },
      },
      {
        key: 'common:countries',
        value: ['US', 'UK', 'CA', 'AU', 'DE'],
        options: { ttl: 86400, namespace: 'common' },
      },
      {
        key: 'common:timezones',
        value: ['UTC', 'EST', 'PST', 'GMT'],
        options: { ttl: 86400, namespace: 'common' },
      },
    ];
  }

  private getHealthStatus(score: number): string {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'fair';
    if (score >= 60) return 'poor';
    return 'critical';
  }

  private generateHealthRecommendations(
    stats: any,
    queryStats: any,
    score: number,
  ): string[] {
    const recommendations: string[] = [];

    if (stats.hitRate >= 85) {
      recommendations.push('Cache hit rate is excellent');
    } else if (stats.hitRate >= 70) {
      recommendations.push('Consider optimizing cache keys and TTL values');
    } else {
      recommendations.push('Cache hit rate is low - review caching strategy');
    }

    if (stats.memoryUsage < 50 * 1024 * 1024) {
      recommendations.push('Memory usage is within optimal range');
    } else if (stats.memoryUsage < 80 * 1024 * 1024) {
      recommendations.push('Consider increasing cache size limits');
    } else {
      recommendations.push('High memory usage - consider cache optimization');
    }

    if (queryStats.averageExecutionTime < 25) {
      recommendations.push('Query cache performance is excellent');
    } else if (queryStats.averageExecutionTime < 50) {
      recommendations.push('Query cache performance is good');
    } else {
      recommendations.push('Consider optimizing slow queries or increasing cache TTL');
    }

    if (score >= 90) {
      recommendations.push('Overall cache performance is excellent');
    } else if (score >= 80) {
      recommendations.push('Cache performance is good with room for improvement');
    } else {
      recommendations.push('Cache performance needs attention');
    }

    return recommendations;
  }
}
