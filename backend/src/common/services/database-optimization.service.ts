import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, QueryRunner } from 'typeorm';
import { ConfigService } from '@nestjs/config';

export interface QueryPerformanceMetrics {
  query: string;
  executionTime: number;
  rowsAffected: number;
  timestamp: Date;
  parameters?: any[];
  slowQuery: boolean;
}

export interface DatabaseHealth {
  connectionCount: number;
  activeConnections: number;
  idleConnections: number;
  slowQueries: number;
  averageQueryTime: number;
  cacheHitRatio: number;
  indexUsage: Record<string, number>;
}

export interface IndexRecommendation {
  table: string;
  columns: string[];
  type: 'btree' | 'hash' | 'gin' | 'gist';
  reason: string;
  estimatedImprovement: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Database Optimization Service
 * Provides comprehensive database performance optimization and monitoring
 */
@Injectable()
export class DatabaseOptimizationService {
  private readonly logger = new Logger(DatabaseOptimizationService.name);
  private queryMetrics: QueryPerformanceMetrics[] = [];
  private readonly slowQueryThreshold: number;
  private readonly maxMetricsHistory: number = 1000;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource | any,
    private readonly configService: ConfigService,
  ) {
    this.slowQueryThreshold = this.configService.get<number>('DB_SLOW_QUERY_THRESHOLD', 1000);
  }

  /**
   * Initialize database optimization
   */
  async initialize(): Promise<void> {
    this.logger.log('Initializing database optimization service...');
    
    // Setup query logging
    await this.setupQueryLogging();
    
    // Create performance monitoring views
    await this.createPerformanceViews();
    
    // Setup connection pool monitoring
    await this.setupConnectionPoolMonitoring();
    
    this.logger.log('Database optimization service initialized');
  }

  /**
   * Optimize database connection pool
   */
  async optimizeConnectionPool(): Promise<void> {
    const options = this.dataSource.options;
    
    // Calculate optimal pool size based on system resources
    const cpuCount = require('os').cpus().length;
    const optimalPoolSize = Math.max(5, Math.min(cpuCount * 2, 20));
    
    this.logger.log(`Optimizing connection pool: ${optimalPoolSize} connections`);
    
    // Update pool configuration
    if ('extra' in options) {
      options.extra = {
        ...options.extra,
        max: optimalPoolSize,
        min: Math.ceil(optimalPoolSize / 4),
        acquire: 30000,
        idle: 10000,
        evict: 1000,
        handleDisconnects: true,
      };
    }
  }

  /**
   * Analyze and optimize slow queries
   */
  async analyzeSlowQueries(): Promise<QueryPerformanceMetrics[]> {
    const slowQueries = this.queryMetrics
      .filter(metric => metric.slowQuery)
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 20);

    for (const query of slowQueries) {
      await this.optimizeQuery(query);
    }

    return slowQueries;
  }

  /**
   * Generate index recommendations
   */
  async generateIndexRecommendations(): Promise<IndexRecommendation[]> {
    const recommendations: IndexRecommendation[] = [];

    try {
      // Analyze query patterns to suggest indexes
      const queryAnalysis = await this.analyzeQueryPatterns();
      
      // Check for missing indexes on foreign keys
      const foreignKeyIndexes = await this.checkForeignKeyIndexes();
      recommendations.push(...foreignKeyIndexes);
      
      // Check for composite index opportunities
      const compositeIndexes = await this.suggestCompositeIndexes(queryAnalysis);
      recommendations.push(...compositeIndexes);
      
      // Check for unused indexes
      const unusedIndexes = await this.findUnusedIndexes();
      recommendations.push(...unusedIndexes.map(index => ({
        table: index.table,
        columns: [index.column],
        type: 'btree' as const,
        reason: 'Unused index - consider dropping',
        estimatedImprovement: 'Reduced storage and faster writes',
        priority: 'low' as const,
      })));

    } catch (error) {
      this.logger.error('Error generating index recommendations', error);
    }

    return recommendations;
  }

  /**
   * Optimize specific query
   */
  async optimizeQuery(queryMetric: QueryPerformanceMetrics): Promise<void> {
    const { query, executionTime } = queryMetric;
    
    this.logger.warn(`Optimizing slow query (${executionTime}ms): ${query.substring(0, 100)}...`);
    
    try {
      // Get query execution plan
      const executionPlan = await this.getQueryExecutionPlan(query, queryMetric.parameters);
      
      // Analyze execution plan for optimization opportunities
      const optimizations = this.analyzeExecutionPlan(executionPlan);
      
      // Log optimization suggestions
      if (optimizations.length > 0) {
        this.logger.log(`Query optimization suggestions: ${optimizations.join(', ')}`);
      }
      
    } catch (error) {
      this.logger.error(`Error optimizing query: ${error.message}`);
    }
  }

  /**
   * Get database health metrics
   */
  async getDatabaseHealth(): Promise<DatabaseHealth> {
    try {
      const connectionCount = this.dataSource.driver.master.getPoolSize?.() || 0;
      const activeConnections = this.dataSource.driver.master.getPoolUsed?.() || 0;
      const idleConnections = connectionCount - activeConnections;
      
      const slowQueries = this.queryMetrics.filter(m => m.slowQuery).length;
      const averageQueryTime = this.queryMetrics.length > 0 
        ? this.queryMetrics.reduce((sum, m) => sum + m.executionTime, 0) / this.queryMetrics.length
        : 0;
      
      // Get cache hit ratio (PostgreSQL specific)
      const cacheHitRatio = await this.getCacheHitRatio();
      
      // Get index usage statistics
      const indexUsage = await this.getIndexUsageStats();

      return {
        connectionCount,
        activeConnections,
        idleConnections,
        slowQueries,
        averageQueryTime: Math.round(averageQueryTime),
        cacheHitRatio,
        indexUsage,
      };
    } catch (error) {
      this.logger.error('Error getting database health metrics', error);
      return {
        connectionCount: 0,
        activeConnections: 0,
        idleConnections: 0,
        slowQueries: 0,
        averageQueryTime: 0,
        cacheHitRatio: 0,
        indexUsage: {},
      };
    }
  }

  /**
   * Execute optimized query with monitoring
   */
  async executeOptimizedQuery<T>(
    query: string,
    parameters?: any[],
    entityManager?: EntityManager,
  ): Promise<T[]> {
    const startTime = Date.now();
    const manager = entityManager || this.dataSource.manager;
    
    try {
      const result = await manager.query(query, parameters);
      const executionTime = Date.now() - startTime;
      
      // Record query metrics
      this.recordQueryMetrics({
        query,
        executionTime,
        rowsAffected: Array.isArray(result) ? result.length : 0,
        timestamp: new Date(),
        parameters,
        slowQuery: executionTime > this.slowQueryThreshold,
      });
      
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // Record failed query metrics
      this.recordQueryMetrics({
        query,
        executionTime,
        rowsAffected: 0,
        timestamp: new Date(),
        parameters,
        slowQuery: true,
      });
      
      throw error;
    }
  }

  /**
   * Bulk insert optimization
   */
  async bulkInsert<T>(
    entityClass: new () => T,
    entities: Partial<T>[],
    chunkSize: number = 1000,
  ): Promise<void> {
    const repository = this.dataSource.getRepository(entityClass);
    
    // Process in chunks to avoid memory issues
    for (let i = 0; i < entities.length; i += chunkSize) {
      const chunk = entities.slice(i, i + chunkSize);
      
      await this.dataSource.transaction(async (manager) => {
        await manager.save(entityClass, chunk);
      });
      
      this.logger.log(`Bulk inserted ${Math.min(i + chunkSize, entities.length)}/${entities.length} records`);
    }
  }

  /**
   * Database maintenance operations
   */
  async performMaintenance(): Promise<void> {
    this.logger.log('Starting database maintenance...');
    
    try {
      // Update table statistics
      await this.updateTableStatistics();
      
      // Reindex tables if needed
      await this.reindexTables();
      
      // Clean up old query metrics
      this.cleanupQueryMetrics();
      
      this.logger.log('Database maintenance completed');
    } catch (error) {
      this.logger.error('Database maintenance failed', error);
    }
  }

  // Private helper methods

  private async setupQueryLogging(): Promise<void> {
    // Enable query logging for slow queries
    if (this.dataSource.options.type === 'postgres') {
      try {
        await this.dataSource.query(`
          ALTER SYSTEM SET log_min_duration_statement = ${this.slowQueryThreshold};
          SELECT pg_reload_conf();
        `);
      } catch (error) {
        this.logger.warn('Could not configure PostgreSQL query logging', error.message);
      }
    }
  }

  private async createPerformanceViews(): Promise<void> {
    if (this.dataSource.options.type === 'postgres') {
      try {
        // Create view for slow queries analysis
        await this.dataSource.query(`
          CREATE OR REPLACE VIEW slow_queries_analysis AS
          SELECT 
            query,
            calls,
            total_time,
            mean_time,
            rows,
            100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
          FROM pg_stat_statements
          WHERE mean_time > ${this.slowQueryThreshold}
          ORDER BY total_time DESC;
        `);
      } catch (error) {
        this.logger.warn('Could not create performance views', error.message);
      }
    }
  }

  private async setupConnectionPoolMonitoring(): Promise<void> {
    // Monitor connection pool health
    setInterval(async () => {
      try {
        const health = await this.getDatabaseHealth();
        
        if (health.activeConnections / health.connectionCount > 0.8) {
          this.logger.warn('High connection pool usage detected', health);
        }
        
        if (health.averageQueryTime > this.slowQueryThreshold) {
          this.logger.warn('High average query time detected', health);
        }
      } catch (error) {
        this.logger.error('Connection pool monitoring error', error);
      }
    }, 60000); // Check every minute
  }

  private recordQueryMetrics(metrics: QueryPerformanceMetrics): void {
    this.queryMetrics.push(metrics);
    
    // Keep only recent metrics
    if (this.queryMetrics.length > this.maxMetricsHistory) {
      this.queryMetrics = this.queryMetrics.slice(-this.maxMetricsHistory);
    }
    
    // Log slow queries
    if (metrics.slowQuery) {
      this.logger.warn(`Slow query detected (${metrics.executionTime}ms): ${metrics.query.substring(0, 200)}...`);
    }
  }

  private async analyzeQueryPatterns(): Promise<any[]> {
    // Analyze common query patterns from metrics
    const patterns = new Map<string, number>();
    
    this.queryMetrics.forEach(metric => {
      // Extract table names and operations
      const pattern = this.extractQueryPattern(metric.query);
      patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
    });
    
    return Array.from(patterns.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
  }

  private extractQueryPattern(query: string): string {
    // Normalize query to identify patterns
    return query
      .toLowerCase()
      .replace(/\d+/g, '?')
      .replace(/'[^']*'/g, '?')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async checkForeignKeyIndexes(): Promise<IndexRecommendation[]> {
    const recommendations: IndexRecommendation[] = [];
    
    if (this.dataSource.options.type === 'postgres') {
      try {
        const result = await this.dataSource.query(`
          SELECT 
            tc.table_name,
            kcu.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND NOT EXISTS (
              SELECT 1 FROM pg_indexes 
              WHERE tablename = tc.table_name 
                AND indexdef LIKE '%' || kcu.column_name || '%'
            );
        `);
        
        result.forEach((row: any) => {
          recommendations.push({
            table: row.table_name,
            columns: [row.column_name],
            type: 'btree',
            reason: 'Foreign key without index',
            estimatedImprovement: 'Faster JOIN operations',
            priority: 'high',
          });
        });
      } catch (error) {
        this.logger.error('Error checking foreign key indexes', error);
      }
    }
    
    return recommendations;
  }

  private async suggestCompositeIndexes(queryPatterns: any[]): Promise<IndexRecommendation[]> {
    const recommendations: IndexRecommendation[] = [];
    
    // Analyze query patterns for composite index opportunities
    // This is a simplified implementation - in practice, you'd analyze actual query plans
    
    return recommendations;
  }

  private async findUnusedIndexes(): Promise<Array<{ table: string; column: string }>> {
    const unusedIndexes: Array<{ table: string; column: string }> = [];
    
    if (this.dataSource.options.type === 'postgres') {
      try {
        const result = await this.dataSource.query(`
          SELECT 
            schemaname,
            tablename,
            indexname,
            idx_tup_read,
            idx_tup_fetch
          FROM pg_stat_user_indexes
          WHERE idx_tup_read = 0 AND idx_tup_fetch = 0
            AND indexname NOT LIKE '%_pkey';
        `);
        
        result.forEach((row: any) => {
          unusedIndexes.push({
            table: row.tablename,
            column: row.indexname,
          });
        });
      } catch (error) {
        this.logger.error('Error finding unused indexes', error);
      }
    }
    
    return unusedIndexes;
  }

  private async getQueryExecutionPlan(query: string, parameters?: any[]): Promise<any[]> {
    try {
      const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
      const result = await this.dataSource.query(explainQuery, parameters);
      return result[0]['QUERY PLAN'];
    } catch (error) {
      this.logger.error('Error getting query execution plan', error);
      return [];
    }
  }

  private analyzeExecutionPlan(plan: any[]): string[] {
    const optimizations: string[] = [];
    
    // Analyze execution plan for common issues
    const planText = JSON.stringify(plan);
    
    if (planText.includes('Seq Scan')) {
      optimizations.push('Consider adding indexes for sequential scans');
    }
    
    if (planText.includes('Sort')) {
      optimizations.push('Consider adding indexes for sorting operations');
    }
    
    if (planText.includes('Hash Join') && planText.includes('large')) {
      optimizations.push('Consider optimizing large hash joins');
    }
    
    return optimizations;
  }

  private async getCacheHitRatio(): Promise<number> {
    if (this.dataSource.options.type === 'postgres') {
      try {
        const result = await this.dataSource.query(`
          SELECT 
            sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100 as hit_ratio
          FROM pg_statio_user_tables;
        `);
        
        return Math.round(result[0]?.hit_ratio || 0);
      } catch (error) {
        this.logger.error('Error getting cache hit ratio', error);
      }
    }
    
    return 0;
  }

  private async getIndexUsageStats(): Promise<Record<string, number>> {
    const stats: Record<string, number> = {};
    
    if (this.dataSource.options.type === 'postgres') {
      try {
        const result = await this.dataSource.query(`
          SELECT 
            indexrelname as index_name,
            idx_tup_read + idx_tup_fetch as usage_count
          FROM pg_stat_user_indexes
          ORDER BY usage_count DESC
          LIMIT 10;
        `);
        
        result.forEach((row: any) => {
          stats[row.index_name] = row.usage_count;
        });
      } catch (error) {
        this.logger.error('Error getting index usage stats', error);
      }
    }
    
    return stats;
  }

  private async updateTableStatistics(): Promise<void> {
    if (this.dataSource.options.type === 'postgres') {
      try {
        await this.dataSource.query('ANALYZE;');
        this.logger.log('Table statistics updated');
      } catch (error) {
        this.logger.error('Error updating table statistics', error);
      }
    }
  }

  private async reindexTables(): Promise<void> {
    if (this.dataSource.options.type === 'postgres') {
      try {
        // Only reindex if fragmentation is high
        const result = await this.dataSource.query(`
          SELECT schemaname, tablename 
          FROM pg_stat_user_tables 
          WHERE n_dead_tup > n_live_tup * 0.1;
        `);
        
        for (const row of result) {
          await this.dataSource.query(`REINDEX TABLE ${row.schemaname}.${row.tablename};`);
          this.logger.log(`Reindexed table: ${row.tablename}`);
        }
      } catch (error) {
        this.logger.error('Error reindexing tables', error);
      }
    }
  }

  private cleanupQueryMetrics(): void {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    this.queryMetrics = this.queryMetrics.filter(metric => metric.timestamp > cutoffTime);
    
    this.logger.log(`Cleaned up query metrics, ${this.queryMetrics.length} records remaining`);
  }
}
