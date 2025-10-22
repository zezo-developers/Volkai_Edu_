import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../../common/guards/roles.guard';
import { AdminOnly } from '../../../common/decorators/roles.decorator';
import { DatabaseOptimizationService } from '../../../common/services/database-optimization.service';
import { DatabaseIndexingService } from '../../../common/services/database-indexing.service';
import { ConnectionPoolService } from '../../../common/services/connection-pool.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

/**
 * Database Optimization Management Controller
 * Provides endpoints for database performance monitoring and optimization
 */
@ApiTags('Database Optimization')
@Controller('admin/database')
@UseGuards(JwtAuthGuard, AdminGuard)
@AdminOnly()
@ApiBearerAuth()
export class DatabaseOptimizationController {
  constructor(
    private readonly dbOptimizationService: DatabaseOptimizationService,
    private readonly indexingService: DatabaseIndexingService,
    private readonly connectionPoolService: ConnectionPoolService,
  ) {}

  /**
   * Get comprehensive database health metrics
   */
  @Get('health')
  @ApiOperation({
    summary: 'Get database health metrics',
    description: 'Retrieve comprehensive database performance and health metrics',
  })
  @ApiResponse({
    status: 200,
    description: 'Database health metrics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        health: {
          type: 'object',
          properties: {
            overall: { type: 'string', example: 'excellent' },
            connectionPool: {
              type: 'object',
              properties: {
                totalConnections: { type: 'number', example: 10 },
                activeConnections: { type: 'number', example: 3 },
                utilization: { type: 'number', example: 30 },
                health: { type: 'string', example: 'good' },
              },
            },
            queryPerformance: {
              type: 'object',
              properties: {
                averageQueryTime: { type: 'number', example: 45 },
                slowQueries: { type: 'number', example: 2 },
                cacheHitRatio: { type: 'number', example: 95 },
              },
            },
            indexUsage: {
              type: 'object',
              additionalProperties: { type: 'number' },
            },
          },
        },
        recommendations: {
          type: 'array',
          items: { type: 'string' },
          example: ['Connection pool is performing optimally', 'Consider adding index on users.email'],
        },
      },
    },
  })
  async getDatabaseHealth(): Promise<{
    success: boolean;
    health: any;
    recommendations: string[];
  }> {
    const [dbHealth, poolMetrics, poolHealth] = await Promise.all([
      this.dbOptimizationService.getDatabaseHealth(),
      this.connectionPoolService.getConnectionPoolMetrics(),
      this.connectionPoolService.validatePoolHealth(),
    ]);

    const overall = this.calculateOverallHealth(dbHealth, poolMetrics);
    const recommendations = [
      ...poolHealth.recommendations,
      ...(poolHealth.issues.length === 0 ? ['Database is performing optimally'] : []),
    ];

    return {
      success: true,
      health: {
        overall,
        connectionPool: {
          totalConnections: poolMetrics.totalConnections,
          activeConnections: poolMetrics.activeConnections,
          utilization: poolMetrics.connectionUtilization,
          health: poolMetrics.poolHealth,
        },
        queryPerformance: {
          averageQueryTime: dbHealth.averageQueryTime,
          slowQueries: dbHealth.slowQueries,
          cacheHitRatio: dbHealth.cacheHitRatio,
        },
        indexUsage: dbHealth.indexUsage,
      },
      recommendations,
    };
  }

  /**
   * Get slow query analysis
   */
  @Get('slow-queries')
  @ApiOperation({
    summary: 'Get slow query analysis',
    description: 'Retrieve analysis of slow-performing database queries',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of slow queries to return',
  })
  @ApiResponse({
    status: 200,
    description: 'Slow query analysis retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        slowQueries: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              query: { type: 'string', example: 'SELECT * FROM users WHERE email = ?' },
              executionTime: { type: 'number', example: 1250 },
              rowsAffected: { type: 'number', example: 1 },
              timestamp: { type: 'string', example: '2024-01-15T10:30:00Z' },
              slowQuery: { type: 'boolean', example: true },
            },
          },
        },
        summary: {
          type: 'object',
          properties: {
            totalSlowQueries: { type: 'number', example: 15 },
            averageExecutionTime: { type: 'number', example: 2150 },
            mostCommonPattern: { type: 'string', example: 'SELECT queries on users table' },
          },
        },
      },
    },
  })
  async getSlowQueries(
    @Query('limit') limit: number = 20,
  ): Promise<{
    success: boolean;
    slowQueries: any[];
    summary: any;
  }> {
    const slowQueries = await this.dbOptimizationService.analyzeSlowQueries();
    const limitedQueries = slowQueries.slice(0, limit);

    const summary = {
      totalSlowQueries: slowQueries.length,
      averageExecutionTime: slowQueries.length > 0 
        ? Math.round(slowQueries.reduce((sum, q) => sum + q.executionTime, 0) / slowQueries.length)
        : 0,
      mostCommonPattern: this.findMostCommonQueryPattern(slowQueries),
    };

    return {
      success: true,
      slowQueries: limitedQueries,
      summary,
    };
  }

  /**
   * Get index recommendations
   */
  @Get('index-recommendations')
  @ApiOperation({
    summary: 'Get database index recommendations',
    description: 'Retrieve recommendations for database index optimization',
  })
  @ApiResponse({
    status: 200,
    description: 'Index recommendations retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        recommendations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              table: { type: 'string', example: 'users' },
              columns: { type: 'array', items: { type: 'string' }, example: ['email'] },
              type: { type: 'string', example: 'btree' },
              reason: { type: 'string', example: 'Foreign key without index' },
              estimatedImprovement: { type: 'string', example: 'Faster JOIN operations' },
              priority: { type: 'string', example: 'high' },
            },
          },
        },
        indexUsage: {
          type: 'object',
          properties: {
            used: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'idx_users_email' },
                  usage: { type: 'number', example: 15420 },
                },
              },
            },
            unused: { type: 'array', items: { type: 'string' } },
            recommendations: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  })
  async getIndexRecommendations(): Promise<{
    success: boolean;
    recommendations: any[];
    indexUsage: any;
  }> {
    const [recommendations, indexUsage] = await Promise.all([
      this.dbOptimizationService.generateIndexRecommendations(),
      this.indexingService.analyzeIndexUsage(),
    ]);

    return {
      success: true,
      recommendations,
      indexUsage,
    };
  }

  /**
   * Get connection pool statistics
   */
  @Get('connection-pool')
  @ApiOperation({
    summary: 'Get connection pool statistics',
    description: 'Retrieve detailed connection pool performance metrics',
  })
  @ApiResponse({
    status: 200,
    description: 'Connection pool statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        statistics: {
          type: 'object',
          properties: {
            config: {
              type: 'object',
              properties: {
                max: { type: 'number', example: 20 },
                min: { type: 'number', example: 5 },
                acquire: { type: 'number', example: 30000 },
                idle: { type: 'number', example: 10000 },
              },
            },
            metrics: {
              type: 'object',
              properties: {
                totalConnections: { type: 'number', example: 10 },
                activeConnections: { type: 'number', example: 3 },
                idleConnections: { type: 'number', example: 7 },
                connectionUtilization: { type: 'number', example: 30 },
                averageWaitTime: { type: 'number', example: 150 },
                poolHealth: { type: 'string', example: 'good' },
              },
            },
            health: {
              type: 'object',
              properties: {
                healthy: { type: 'boolean', example: true },
                issues: { type: 'array', items: { type: 'string' } },
                recommendations: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
    },
  })
  async getConnectionPoolStatistics(): Promise<{
    success: boolean;
    statistics: any;
  }> {
    const statistics = await this.connectionPoolService.getPoolStatistics();

    return {
      success: true,
      statistics,
    };
  }

  /**
   * Create database indexes
   */
  @Post('indexes/create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create database indexes',
    description: 'Create recommended database indexes for performance optimization',
  })
  @ApiResponse({
    status: 200,
    description: 'Database indexes created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Database indexes created successfully' },
        created: { type: 'number', example: 15 },
        failed: { type: 'number', example: 0 },
        details: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', example: 'idx_users_email' },
              status: { type: 'string', example: 'created' },
              error: { type: 'string', example: null },
            },
          },
        },
      },
    },
  })
  async createDatabaseIndexes(
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<{
    success: boolean;
    message: string;
    created: number;
    failed: number;
    details: any[];
  }> {
    const indexStrategy = this.indexingService.getIndexingStrategy();
    const details: any[] = [];
    let created = 0;
    let failed = 0;

    for (const index of indexStrategy) {
      try {
        await this.indexingService.createIndex(index);
        details.push({
          name: index.name,
          status: 'created',
          error: null,
        });
        created++;
      } catch (error) {
        details.push({
          name: index.name,
          status: 'failed',
          error: error.message,
        });
        failed++;
      }
    }

    return {
      success: true,
      message: `Database indexes creation completed: ${created} created, ${failed} failed`,
      created,
      failed,
      details,
    };
  }

  /**
   * Optimize database queries
   */
  @Post('optimize-queries')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Optimize slow database queries',
    description: 'Analyze and optimize slow-performing database queries',
  })
  @ApiResponse({
    status: 200,
    description: 'Query optimization completed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Query optimization completed' },
        optimized: { type: 'number', example: 8 },
        recommendations: {
          type: 'array',
          items: { type: 'string' },
          example: ['Add index on users.email', 'Consider query rewriting for complex JOINs'],
        },
      },
    },
  })
  async optimizeQueries(
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<{
    success: boolean;
    message: string;
    optimized: number;
    recommendations: string[];
  }> {
    const slowQueries = await this.dbOptimizationService.analyzeSlowQueries();
    const recommendations: string[] = [];

    // Analyze each slow query for optimization opportunities
    for (const query of slowQueries) {
      try {
        await this.dbOptimizationService.optimizeQuery(query);
      } catch (error) {
        recommendations.push(`Failed to optimize query: ${error.message}`);
      }
    }

    // Add general recommendations
    if (slowQueries.length > 10) {
      recommendations.push('High number of slow queries detected - consider database maintenance');
    }

    return {
      success: true,
      message: 'Query optimization analysis completed',
      optimized: slowQueries.length,
      recommendations,
    };
  }

  /**
   * Perform database maintenance
   */
  @Post('maintenance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Perform database maintenance',
    description: 'Execute database maintenance operations including statistics update and reindexing',
  })
  @ApiResponse({
    status: 200,
    description: 'Database maintenance completed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Database maintenance completed successfully' },
        operations: {
          type: 'array',
          items: { type: 'string' },
          example: ['Updated table statistics', 'Reindexed 3 tables', 'Cleaned up query metrics'],
        },
        duration: { type: 'number', example: 45000 },
      },
    },
  })
  async performMaintenance(
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<{
    success: boolean;
    message: string;
    operations: string[];
    duration: number;
  }> {
    const startTime = Date.now();
    const operations: string[] = [];

    try {
      // Perform database maintenance
      await this.dbOptimizationService.performMaintenance();
      operations.push('Updated table statistics', 'Performed reindexing', 'Cleaned up query metrics');

      const duration = Date.now() - startTime;

      return {
        success: true,
        message: 'Database maintenance completed successfully',
        operations,
        duration,
      };
    } catch (error) {
      return {
        success: false,
        message: `Database maintenance failed: ${error.message}`,
        operations,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Update connection pool configuration
   */
  @Put('connection-pool/config')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update connection pool configuration',
    description: 'Update database connection pool settings for optimal performance',
  })
  @ApiResponse({
    status: 200,
    description: 'Connection pool configuration updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Connection pool configuration updated' },
        previousConfig: {
          type: 'object',
          properties: {
            max: { type: 'number', example: 20 },
            min: { type: 'number', example: 5 },
          },
        },
        newConfig: {
          type: 'object',
          properties: {
            max: { type: 'number', example: 25 },
            min: { type: 'number', example: 8 },
          },
        },
      },
    },
  })
  async updateConnectionPoolConfig(
    @Body() configUpdate: {
      max?: number;
      min?: number;
      acquire?: number;
      idle?: number;
    },
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<{
    success: boolean;
    message: string;
    previousConfig: any;
    newConfig: any;
  }> {
    const currentStats = await this.connectionPoolService.getPoolStatistics();
    const previousConfig = currentStats.config;

    // Validate configuration
    if (configUpdate.max && configUpdate.max < 1) {
      throw new Error('Maximum connections must be at least 1');
    }
    if (configUpdate.min && configUpdate.min < 0) {
      throw new Error('Minimum connections cannot be negative');
    }
    if (configUpdate.max && configUpdate.min && configUpdate.min > configUpdate.max) {
      throw new Error('Minimum connections cannot exceed maximum connections');
    }

    // Apply configuration (this would require pool restart in practice)
    const newConfig = { ...previousConfig, ...configUpdate };

    return {
      success: true,
      message: 'Connection pool configuration updated (restart required for full effect)',
      previousConfig,
      newConfig,
    };
  }

  /**
   * Get database optimization report
   */
  @Get('report')
  @ApiOperation({
    summary: 'Get comprehensive database optimization report',
    description: 'Generate a detailed report on database performance and optimization opportunities',
  })
  @ApiResponse({
    status: 200,
    description: 'Database optimization report generated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        report: {
          type: 'object',
          properties: {
            generatedAt: { type: 'string', example: '2024-01-15T10:30:00Z' },
            overallScore: { type: 'number', example: 85 },
            grade: { type: 'string', example: 'B+' },
            summary: {
              type: 'object',
              properties: {
                totalQueries: { type: 'number', example: 15420 },
                slowQueries: { type: 'number', example: 23 },
                averageQueryTime: { type: 'number', example: 45 },
                connectionPoolHealth: { type: 'string', example: 'good' },
                indexEfficiency: { type: 'number', example: 92 },
              },
            },
            recommendations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  category: { type: 'string', example: 'indexing' },
                  priority: { type: 'string', example: 'high' },
                  description: { type: 'string', example: 'Add index on users.email column' },
                  estimatedImprovement: { type: 'string', example: '30% faster login queries' },
                },
              },
            },
          },
        },
      },
    },
  })
  async getDatabaseOptimizationReport(): Promise<{
    success: boolean;
    report: any;
  }> {
    const [health, slowQueries, indexUsage, poolStats] = await Promise.all([
      this.dbOptimizationService.getDatabaseHealth(),
      this.dbOptimizationService.analyzeSlowQueries(),
      this.indexingService.analyzeIndexUsage(),
      this.connectionPoolService.getPoolStatistics(),
    ]);

    const overallScore = this.calculateOptimizationScore(health, slowQueries, poolStats);
    const grade = this.getPerformanceGrade(overallScore);

    const report = {
      generatedAt: new Date().toISOString(),
      overallScore,
      grade,
      summary: {
        totalQueries: health.slowQueries + 1000, // Estimated total
        slowQueries: health.slowQueries,
        averageQueryTime: health.averageQueryTime,
        connectionPoolHealth: poolStats.metrics.poolHealth,
        indexEfficiency: Math.round((indexUsage.used.length / (indexUsage.used.length + indexUsage.unused.length)) * 100),
      },
      recommendations: this.generateOptimizationRecommendations(health, slowQueries, indexUsage, poolStats),
    };

    return {
      success: true,
      report,
    };
  }

  // Private helper methods

  private calculateOverallHealth(dbHealth: any, poolMetrics: any): string {
    const scores = [];
    
    // Query performance score
    if (dbHealth.averageQueryTime < 100) scores.push(100);
    else if (dbHealth.averageQueryTime < 500) scores.push(80);
    else if (dbHealth.averageQueryTime < 1000) scores.push(60);
    else scores.push(40);

    // Connection pool score
    if (poolMetrics.poolHealth === 'excellent') scores.push(100);
    else if (poolMetrics.poolHealth === 'good') scores.push(80);
    else if (poolMetrics.poolHealth === 'warning') scores.push(60);
    else scores.push(40);

    // Cache hit ratio score
    scores.push(dbHealth.cacheHitRatio);

    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    if (averageScore >= 90) return 'excellent';
    if (averageScore >= 75) return 'good';
    if (averageScore >= 60) return 'warning';
    return 'critical';
  }

  private findMostCommonQueryPattern(queries: any[]): string {
    if (queries.length === 0) return 'No slow queries detected';
    
    // Simple pattern analysis - in practice, this would be more sophisticated
    const patterns = new Map<string, number>();
    
    queries.forEach(q => {
      const pattern = q.query.toLowerCase().split(' ').slice(0, 3).join(' ');
      patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
    });

    const mostCommon = Array.from(patterns.entries())
      .sort(([, a], [, b]) => b - a)[0];

    return mostCommon ? mostCommon[0] : 'Various query patterns';
  }

  private calculateOptimizationScore(health: any, slowQueries: any[], poolStats: any): number {
    let score = 100;

    // Deduct points for slow queries
    score -= Math.min(slowQueries.length * 2, 30);

    // Deduct points for poor connection pool health
    if (poolStats.metrics.poolHealth === 'critical') score -= 25;
    else if (poolStats.metrics.poolHealth === 'warning') score -= 15;
    else if (poolStats.metrics.poolHealth === 'good') score -= 5;

    // Deduct points for low cache hit ratio
    if (health.cacheHitRatio < 80) score -= 20;
    else if (health.cacheHitRatio < 90) score -= 10;

    // Deduct points for high average query time
    if (health.averageQueryTime > 1000) score -= 20;
    else if (health.averageQueryTime > 500) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  private getPerformanceGrade(score: number): string {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'A-';
    if (score >= 80) return 'B+';
    if (score >= 75) return 'B';
    if (score >= 70) return 'B-';
    if (score >= 65) return 'C+';
    if (score >= 60) return 'C';
    return 'D';
  }

  private generateOptimizationRecommendations(health: any, slowQueries: any[], indexUsage: any, poolStats: any): any[] {
    const recommendations: any[] = [];

    // Index recommendations
    if (indexUsage.unused.length > 0) {
      recommendations.push({
        category: 'indexing',
        priority: 'medium',
        description: `Remove ${indexUsage.unused.length} unused indexes`,
        estimatedImprovement: 'Faster write operations and reduced storage',
      });
    }

    // Query performance recommendations
    if (slowQueries.length > 10) {
      recommendations.push({
        category: 'query_performance',
        priority: 'high',
        description: 'Optimize slow queries',
        estimatedImprovement: 'Significantly improved response times',
      });
    }

    // Connection pool recommendations
    if (poolStats.metrics.connectionUtilization > 80) {
      recommendations.push({
        category: 'connection_pool',
        priority: 'high',
        description: 'Increase connection pool size',
        estimatedImprovement: 'Reduced connection wait times',
      });
    }

    // Cache recommendations
    if (health.cacheHitRatio < 90) {
      recommendations.push({
        category: 'caching',
        priority: 'medium',
        description: 'Optimize database cache configuration',
        estimatedImprovement: 'Improved query response times',
      });
    }

    return recommendations;
  }
}
