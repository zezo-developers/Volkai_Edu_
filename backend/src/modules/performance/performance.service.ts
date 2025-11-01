import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AnalyticsEvent, EventType } from '../../database/entities/analytics-event.entity';

export interface PerformanceMetrics {
  timestamp: Date;
  cpuUsage: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  databaseMetrics: {
    activeConnections: number;
    queryTime: number;
    slowQueries: number;
  };
  apiMetrics: {
    requestsPerSecond: number;
    averageResponseTime: number;
    errorRate: number;
  };
  cacheMetrics: {
    hitRate: number;
    missRate: number;
    evictionRate: number;
  };
}

export interface DatabaseHealth {
  connectionCount: number;
  slowQueries: Array<{
    query: string;
    duration: number;
    timestamp: Date;
  }>;
  tableStats: Array<{
    tableName: string;
    rowCount: number;
    size: string;
    indexUsage: number;
  }>;
  lockInfo: Array<{
    lockType: string;
    relation: string;
    duration: number;
  }>;
}

@Injectable()
export class PerformanceService {
  private readonly logger = new Logger(PerformanceService.name);
  private metricsHistory: PerformanceMetrics[] = [];
  private readonly maxHistorySize = 1000;

  constructor(
    private configService: ConfigService,
    private dataSource: DataSource,
    @InjectRepository(AnalyticsEvent)
    private analyticsEventRepository: Repository<AnalyticsEvent>,
  ) {}

  // Real-time performance monitoring
  async getCurrentMetrics(): Promise<PerformanceMetrics> {
    const [cpuUsage, memoryUsage, dbMetrics, apiMetrics, cacheMetrics] = await Promise.all([
      this.getCpuUsage(),
      this.getMemoryUsage(),
      this.getDatabaseMetrics(),
      this.getApiMetrics(),
      this.getCacheMetrics(),
    ]);

    const metrics: PerformanceMetrics = {
      timestamp: new Date(),
      cpuUsage,
      memoryUsage,
      databaseMetrics: dbMetrics,
      apiMetrics,
      cacheMetrics,
    };

    // Store in history
    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift();
    }

    return metrics;
  }

  // Database performance analysis
  async getDatabaseHealth(): Promise<DatabaseHealth> {
    const queryRunner = this.dataSource.createQueryRunner();
    
    try {
      // Get connection count
      const connectionResult = await queryRunner.query(`
        SELECT count(*) as connection_count 
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `);

      console.log('connectonResult: ',connectionResult)

      // Get slow queries (queries taking more than 1 second)
      const slowQueriesResult = await queryRunner.query(`
        SELECT query, mean_exec_time as duration, calls, last_exec_time as timestamp
        FROM pg_stat_statements 
        WHERE mean_exec_time > 1000 
        ORDER BY mean_exec_time DESC 
        LIMIT 10
      `);

      console.log('slowQueriesResult: ',slowQueriesResult)

      // Get table statistics
      const tableStatsResult = await queryRunner.query(`
        SELECT 
          schemaname,
          tablename,
          n_tup_ins + n_tup_upd + n_tup_del as total_operations,
          n_live_tup as row_count,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          idx_scan::float / GREATEST(seq_scan + idx_scan, 1) * 100 as index_usage
        FROM pg_stat_user_tables 
        ORDER BY total_operations DESC 
        LIMIT 20
      `);
        console.log('tableStatsResult: ',tableStatsResult)
      // Get lock information
      const lockInfoResult = await queryRunner.query(`
        SELECT 
          locktype,
          relation::regclass as relation,
          mode,
          granted,
          EXTRACT(EPOCH FROM (now() - query_start)) as duration
        FROM pg_locks l
        LEFT JOIN pg_stat_activity a ON l.pid = a.pid
        WHERE NOT granted OR EXTRACT(EPOCH FROM (now() - query_start)) > 5
        ORDER BY duration DESC
      `);
        console.log('lockInfoResult: ',lockInfoResult)
      return {
        connectionCount: connectionResult[0]?.connection_count || 0,
        slowQueries: slowQueriesResult.map((row: any) => ({
          query: row.query,
          duration: row.duration,
          timestamp: row.timestamp,
        })),
        tableStats: tableStatsResult.map((row: any) => ({
          tableName: `${row.schemaname}.${row.tablename}`,
          rowCount: row.row_count,
          size: row.size,
          indexUsage: row.index_usage,
        })),
        lockInfo: lockInfoResult.map((row: any) => ({
          lockType: row.locktype,
          relation: row.relation,
          duration: row.duration,
        })),
      };
    } finally {
      await queryRunner.release();
    }
  }

  // Query optimization recommendations
  async getQueryOptimizationRecommendations(): Promise<Array<{
    issue: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    recommendation: string;
    query?: string;
  }>> {
    const recommendations = [];
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      // Check for missing indexes
      const missingIndexes = await queryRunner.query(`
        SELECT 
          schemaname,
          tablename,
          seq_scan,
          seq_tup_read,
          idx_scan,
          seq_tup_read / GREATEST(seq_scan, 1) as avg_seq_read
        FROM pg_stat_user_tables 
        WHERE seq_scan > 1000 AND (idx_scan::float / GREATEST(seq_scan + idx_scan, 1)) < 0.1
        ORDER BY seq_tup_read DESC
      `);

      for (const table of missingIndexes) {
        recommendations.push({
          issue: `Table ${table.schemaname}.${table.tablename} has high sequential scan ratio`,
          severity: 'high' as const,
          recommendation: `Consider adding indexes to frequently queried columns in ${table.tablename}`,
        });
      }

      // Check for unused indexes
      const unusedIndexes = await queryRunner.query(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_scan
        FROM pg_stat_user_indexes 
        WHERE idx_scan < 10
        ORDER BY idx_scan
      `);

      for (const index of unusedIndexes) {
        recommendations.push({
          issue: `Index ${index.indexname} on ${index.schemaname}.${index.tablename} is rarely used`,
          severity: 'medium' as const,
          recommendation: `Consider dropping unused index ${index.indexname} to improve write performance`,
        });
      }

      // Check for slow queries
      const slowQueries = await queryRunner.query(`
        SELECT query, mean_exec_time, calls
        FROM pg_stat_statements 
        WHERE mean_exec_time > 5000 
        ORDER BY mean_exec_time DESC 
        LIMIT 5
      `);

      for (const slowQuery of slowQueries) {
        recommendations.push({
          issue: `Slow query detected with average execution time of ${slowQuery.mean_exec_time}ms`,
          severity: 'critical' as const,
          recommendation: 'Optimize query structure, add appropriate indexes, or consider query rewriting',
          query: slowQuery.query,
        });
      }

      // Check for bloated tables
      const bloatedTables = await queryRunner.query(`
        SELECT 
          schemaname,
          tablename,
          n_dead_tup,
          n_live_tup,
          n_dead_tup::float / GREATEST(n_live_tup + n_dead_tup, 1) * 100 as bloat_ratio
        FROM pg_stat_user_tables 
        WHERE n_dead_tup > 1000 AND n_dead_tup::float / GREATEST(n_live_tup + n_dead_tup, 1) > 0.1
        ORDER BY bloat_ratio DESC
      `);

      for (const table of bloatedTables) {
        recommendations.push({
          issue: `Table ${table.schemaname}.${table.tablename} has ${table.bloat_ratio.toFixed(1)}% dead tuples`,
          severity: 'medium' as const,
          recommendation: `Run VACUUM ANALYZE on ${table.tablename} to reclaim space and update statistics`,
        });
      }

    } finally {
      await queryRunner.release();
    }

    return recommendations;
  }

  // Performance optimization
  async optimizeDatabase(): Promise<{
    vacuumed: string[];
    reindexed: string[];
    analyzed: string[];
    errors: string[];
  }> {
    const result = {
      vacuumed: [] as string[],
      reindexed: [] as string[],
      analyzed: [] as string[],
      errors: [] as string[],
    };

    const queryRunner = this.dataSource.createQueryRunner();

    try {
      // Get tables that need maintenance
      const tablesNeedingMaintenance = await queryRunner.query(`
        SELECT schemaname, tablename, n_dead_tup, n_live_tup
        FROM pg_stat_user_tables 
        WHERE n_dead_tup > 1000 
        ORDER BY n_dead_tup DESC
      `);

      for (const table of tablesNeedingMaintenance) {
        try {
          const tableName = `${table.schemaname}.${table.tablename}`;
          
          // VACUUM table
          await queryRunner.query(`VACUUM ${tableName}`);
          result.vacuumed.push(tableName);

          // ANALYZE table
          await queryRunner.query(`ANALYZE ${tableName}`);
          result.analyzed.push(tableName);

        } catch (error) {
          result.errors.push(`Error optimizing ${table.tablename}: ${error.message}`);
        }
      }

      // Reindex heavily used indexes
      const indexesNeedingReindex = await queryRunner.query(`
        SELECT schemaname, tablename, indexname
        FROM pg_stat_user_indexes 
        WHERE idx_scan > 10000
        ORDER BY idx_scan DESC
        LIMIT 10
      `);

      for (const index of indexesNeedingReindex) {
        try {
          await queryRunner.query(`REINDEX INDEX ${index.schemaname}.${index.indexname}`);
          result.reindexed.push(index.indexname);
        } catch (error) {
          result.errors.push(`Error reindexing ${index.indexname}: ${error.message}`);
        }
      }

    } finally {
      await queryRunner.release();
    }

    return result;
  }

  // Scheduled performance monitoring
  @Cron(CronExpression.EVERY_MINUTE)
  async collectMetrics(): Promise<void> {
    try {
      const metrics = await this.getCurrentMetrics();
      
      // Log critical performance issues
      if (metrics.cpuUsage > 90) {
        this.logger.warn(`High CPU usage detected: ${metrics.cpuUsage}%`);
      }
      
      if (metrics.memoryUsage.percentage > 90) {
        this.logger.warn(`High memory usage detected: ${metrics.memoryUsage.percentage}%`);
      }
      
      if (metrics.databaseMetrics.queryTime > 1000) {
        this.logger.warn(`Slow database queries detected: ${metrics.databaseMetrics.queryTime}ms average`);
      }

      if (metrics.apiMetrics.errorRate > 5) {
        this.logger.warn(`High API error rate detected: ${metrics.apiMetrics.errorRate}%`);
      }

      // Store metrics in analytics
      await this.analyticsEventRepository.save({
        eventType: EventType.ERROR_OCCURRED,
        eventData: metrics,
        metadata: {
          source: 'performance_monitor',
          automated: true,
        },
      } as any);

    } catch (error) {
      this.logger.error(`Error collecting performance metrics: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async performHealthCheck(): Promise<void> {
    try {
      const health = await this.getDatabaseHealth();
      
      // Check for concerning metrics
      if (health.connectionCount > 80) {
        this.logger.warn(`High database connection count: ${health.connectionCount}`);
      }
      
      if (health.slowQueries.length > 5) {
        this.logger.warn(`Multiple slow queries detected: ${health.slowQueries.length}`);
      }
      
      if (health.lockInfo.length > 0) {
        this.logger.warn(`Database locks detected: ${health.lockInfo.length}`);
      }

    } catch (error) {
      this.logger.error(`Error performing health check: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async performMaintenance(): Promise<void> {
    try {
      this.logger.log('Starting automated database maintenance...');
      
      const result = await this.optimizeDatabase();
      
      this.logger.log(`Database maintenance completed:
        - Vacuumed: ${result.vacuumed.length} tables
        - Reindexed: ${result.reindexed.length} indexes
        - Analyzed: ${result.analyzed.length} tables
        - Errors: ${result.errors.length}`);

      if (result.errors.length > 0) {
        this.logger.error(`Maintenance errors: ${result.errors.join(', ')}`);
      }

    } catch (error) {
      this.logger.error(`Error performing maintenance: ${error.message}`);
    }
  }

  // Helper methods
  private async getCpuUsage(): Promise<number> {
    // Simulate CPU usage - in production, use actual system metrics
    return Math.random() * 100;
  }

  private async getMemoryUsage(): Promise<{
    used: number;
    total: number;
    percentage: number;
  }> {
    const memUsage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    
    return {
      used: memUsage.heapUsed,
      total: totalMemory,
      percentage: (memUsage.heapUsed / totalMemory) * 100,
    };
  }

  private async getDatabaseMetrics(): Promise<{
    activeConnections: number;
    queryTime: number;
    slowQueries: number;
  }> {
    const queryRunner = this.dataSource.createQueryRunner();
    
    try {
      const [connectionResult, queryTimeResult, slowQueryResult] = await Promise.all([
        queryRunner.query(`SELECT count(*) as count FROM pg_stat_activity WHERE state = 'active'`),
        queryRunner.query(`SELECT avg(mean_exec_time) as avg_time FROM pg_stat_statements`),
        queryRunner.query(`SELECT count(*) as count FROM pg_stat_statements WHERE mean_exec_time > 1000`),
      ]);

      return {
        activeConnections: connectionResult[0]?.count || 0,
        queryTime: queryTimeResult[0]?.avg_time || 0,
        slowQueries: slowQueryResult[0]?.count || 0,
      };
    } finally {
      await queryRunner.release();
    }
  }

  private async getApiMetrics(): Promise<{
    requestsPerSecond: number;
    averageResponseTime: number;
    errorRate: number;
  }> {
    // In production, integrate with APM tools like New Relic, DataDog, etc.
    // For now, return simulated metrics
    return {
      requestsPerSecond: Math.random() * 100,
      averageResponseTime: Math.random() * 500,
      errorRate: Math.random() * 5,
    };
  }

  private async getCacheMetrics(): Promise<{
    hitRate: number;
    missRate: number;
    evictionRate: number;
  }> {
    // In production, get actual Redis metrics
    return {
      hitRate: 85 + Math.random() * 10,
      missRate: 5 + Math.random() * 10,
      evictionRate: Math.random() * 5,
    };
  }

  // Public API methods
  getMetricsHistory(hours: number = 1): PerformanceMetrics[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.metricsHistory.filter(m => m.timestamp >= cutoff);
  }

  async getPerformanceReport(): Promise<{
    currentMetrics: PerformanceMetrics;
    databaseHealth: DatabaseHealth;
    recommendations: Array<{
      issue: string;
      severity: string;
      recommendation: string;
    }>;
    trends: {
      cpuTrend: number;
      memoryTrend: number;
      responseTrend: number;
    };
  }> {
    const [currentMetrics, databaseHealth, recommendations] = await Promise.all([
      this.getCurrentMetrics(),
      this.getDatabaseHealth(),
      this.getQueryOptimizationRecommendations(),
    ]);

    // Calculate trends from last hour
    const recentMetrics = this.getMetricsHistory(1);
    const trends = this.calculateTrends(recentMetrics);

    return {
      currentMetrics,
      databaseHealth,
      recommendations,
      trends,
    };
  }

  private calculateTrends(metrics: PerformanceMetrics[]): {
    cpuTrend: number;
    memoryTrend: number;
    responseTrend: number;
  } {
    if (metrics.length < 2) {
      return { cpuTrend: 0, memoryTrend: 0, responseTrend: 0 };
    }

    const first = metrics[0];
    const last = metrics[metrics.length - 1];

    return {
      cpuTrend: last.cpuUsage - first.cpuUsage,
      memoryTrend: last.memoryUsage.percentage - first.memoryUsage.percentage,
      responseTrend: last.apiMetrics.averageResponseTime - first.apiMetrics.averageResponseTime,
    };
  }
}
