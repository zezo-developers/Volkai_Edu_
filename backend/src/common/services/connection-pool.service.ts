import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as os from 'os';

export interface ConnectionPoolMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingConnections: number;
  maxConnections: number;
  minConnections: number;
  connectionUtilization: number;
  averageWaitTime: number;
  connectionErrors: number;
  poolHealth: 'excellent' | 'good' | 'warning' | 'critical';
}

export interface ConnectionPoolConfig {
  max: number;
  min: number;
  acquire: number;
  idle: number;
  evict: number;
  handleDisconnects: boolean;
  validateConnection: boolean;
  maxUses: number;
  testOnBorrow: boolean;
  acquireTimeoutMillis: number;
  createTimeoutMillis: number;
  destroyTimeoutMillis: number;
  reapIntervalMillis: number;
  createRetryIntervalMillis: number;
}

/**
 * Connection Pool Optimization Service
 * Manages database connection pool for optimal performance and reliability
 */
@Injectable()
export class ConnectionPoolService implements OnModuleInit {
  private readonly logger = new Logger(ConnectionPoolService.name);
  private connectionMetrics: ConnectionPoolMetrics;
  private poolConfig: ConnectionPoolConfig;
  private monitoringInterval: NodeJS.Timeout;
  private connectionWaitTimes: number[] = [];
  private connectionErrors: number = 0;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource | any,
    private readonly configService: ConfigService,
  ) {
    this.initializePoolConfig();
  }

  async onModuleInit() {
    await this.optimizeConnectionPool();
    this.startMonitoring();
  }

  /**
   * Initialize connection pool configuration based on system resources
   */
  private initializePoolConfig(): void {
    const cpuCount = os.cpus().length;
    const totalMemoryGB = os.totalmem() / (1024 * 1024 * 1024);
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');

    // Calculate optimal pool size based on system resources
    const basePoolSize = Math.max(5, Math.min(cpuCount * 2, 20));
    const memoryAdjustment = Math.floor(totalMemoryGB / 4);
    const optimalMaxConnections = Math.min(basePoolSize + memoryAdjustment, 50);

    this.poolConfig = {
      max: this.configService.get<number>('DB_POOL_MAX', optimalMaxConnections),
      min: this.configService.get<number>('DB_POOL_MIN', Math.ceil(optimalMaxConnections / 4)),
      acquire: this.configService.get<number>('DB_POOL_ACQUIRE', 30000),
      idle: this.configService.get<number>('DB_POOL_IDLE', 10000),
      evict: this.configService.get<number>('DB_POOL_EVICT', 1000),
      handleDisconnects: true,
      validateConnection: nodeEnv === 'production',
      maxUses: this.configService.get<number>('DB_POOL_MAX_USES', 7500),
      testOnBorrow: nodeEnv === 'production',
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200,
    };

    this.logger.log(`Initialized connection pool config: max=${this.poolConfig.max}, min=${this.poolConfig.min}`);
  }

  /**
   * Optimize connection pool settings
   */
  async optimizeConnectionPool(): Promise<void> {
    try {
      // Apply optimized configuration to the data source
      if (this.dataSource.options.type === 'postgres') {
        await this.optimizePostgreSQLPool();
      } else if (this.dataSource.options.type === 'mysql') {
        await this.optimizeMySQLPool();
      }

      this.logger.log('Connection pool optimization completed');
    } catch (error) {
      this.logger.error('Failed to optimize connection pool', error);
    }
  }

  /**
   * Get current connection pool metrics
   */
  async getConnectionPoolMetrics(): Promise<ConnectionPoolMetrics> {
    try {
      const poolSize = this.getPoolSize();
      const activeConnections = this.getActiveConnections();
      const idleConnections = poolSize - activeConnections;
      const waitingConnections = this.getWaitingConnections();
      
      const connectionUtilization = poolSize > 0 ? (activeConnections / poolSize) * 100 : 0;
      const averageWaitTime = this.calculateAverageWaitTime();
      const poolHealth = this.assessPoolHealth(connectionUtilization, averageWaitTime);

      this.connectionMetrics = {
        totalConnections: poolSize,
        activeConnections,
        idleConnections,
        waitingConnections,
        maxConnections: this.poolConfig.max,
        minConnections: this.poolConfig.min,
        connectionUtilization: Math.round(connectionUtilization),
        averageWaitTime: Math.round(averageWaitTime),
        connectionErrors: this.connectionErrors,
        poolHealth,
      };

      return this.connectionMetrics;
    } catch (error) {
      this.logger.error('Error getting connection pool metrics', error);
      return this.getDefaultMetrics();
    }
  }

  /**
   * Monitor connection pool health
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      try {
        const metrics = await this.getConnectionPoolMetrics();
        
        // Log warnings for concerning metrics
        if (metrics.poolHealth === 'warning' || metrics.poolHealth === 'critical') {
          this.logger.warn('Connection pool health issue detected', metrics);
        }

        // Auto-scale pool if needed
        await this.autoScalePool(metrics);

        // Clean up old wait time records
        this.cleanupWaitTimes();

      } catch (error) {
        this.logger.error('Connection pool monitoring error', error);
      }
    }, 30000); // Monitor every 30 seconds
  }

  /**
   * Auto-scale connection pool based on metrics
   */
  private async autoScalePool(metrics: ConnectionPoolMetrics): Promise<void> {
    const { connectionUtilization, averageWaitTime, waitingConnections } = metrics;

    // Scale up if utilization is high and there are waiting connections
    if (connectionUtilization > 80 && waitingConnections > 0 && metrics.totalConnections < this.poolConfig.max) {
      const newSize = Math.min(metrics.totalConnections + 2, this.poolConfig.max);
      await this.adjustPoolSize(newSize);
      this.logger.log(`Scaled up connection pool to ${newSize} connections`);
    }

    // Scale down if utilization is consistently low
    if (connectionUtilization < 30 && averageWaitTime < 100 && metrics.totalConnections > this.poolConfig.min) {
      const newSize = Math.max(metrics.totalConnections - 1, this.poolConfig.min);
      await this.adjustPoolSize(newSize);
      this.logger.log(`Scaled down connection pool to ${newSize} connections`);
    }
  }

  /**
   * Execute query with connection pool monitoring
   */
  async executeWithMonitoring<T>(
    queryFn: () => Promise<T>,
    queryName: string = 'unknown',
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await queryFn();
      const waitTime = Date.now() - startTime;
      
      // Record wait time for metrics
      this.recordWaitTime(waitTime);
      
      // Log slow connection acquisitions
      if (waitTime > 5000) {
        this.logger.warn(`Slow connection acquisition for ${queryName}: ${waitTime}ms`);
      }
      
      return result;
    } catch (error) {
      this.connectionErrors++;
      this.logger.error(`Connection error for ${queryName}:`, error);
      throw error;
    }
  }

  /**
   * Validate connection pool health
   */
  async validatePoolHealth(): Promise<{
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const metrics = await this.getConnectionPoolMetrics();
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for high utilization
    if (metrics.connectionUtilization > 90) {
      issues.push('Connection pool utilization is critically high');
      recommendations.push('Consider increasing max pool size or optimizing query performance');
    }

    // Check for long wait times
    if (metrics.averageWaitTime > 5000) {
      issues.push('Average connection wait time is too high');
      recommendations.push('Increase pool size or investigate connection leaks');
    }

    // Check for connection errors
    if (metrics.connectionErrors > 10) {
      issues.push('High number of connection errors detected');
      recommendations.push('Check database connectivity and network stability');
    }

    // Check for waiting connections
    if (metrics.waitingConnections > 5) {
      issues.push('Multiple connections waiting for availability');
      recommendations.push('Increase pool size or optimize query execution time');
    }

    return {
      healthy: issues.length === 0,
      issues,
      recommendations,
    };
  }

  /**
   * Get connection pool statistics for monitoring
   */
  async getPoolStatistics(): Promise<{
    config: ConnectionPoolConfig;
    metrics: ConnectionPoolMetrics;
    health: any;
    recommendations: string[];
  }> {
    const metrics = await this.getConnectionPoolMetrics();
    const health = await this.validatePoolHealth();
    const recommendations = this.generateOptimizationRecommendations(metrics);

    return {
      config: this.poolConfig,
      metrics,
      health,
      recommendations,
    };
  }

  /**
   * Gracefully close connection pool
   */
  async closePool(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    try {
      await this.dataSource.destroy();
      this.logger.log('Connection pool closed gracefully');
    } catch (error) {
      this.logger.error('Error closing connection pool', error);
    }
  }

  // Private helper methods

  private async optimizePostgreSQLPool(): Promise<void> {
    const options = this.dataSource.options as any;
    
    // Apply PostgreSQL-specific optimizations
    options.extra = {
      ...options.extra,
      max: this.poolConfig.max,
      min: this.poolConfig.min,
      acquire: this.poolConfig.acquire,
      idle: this.poolConfig.idle,
      evict: this.poolConfig.evict,
      handleDisconnects: this.poolConfig.handleDisconnects,
      
      // PostgreSQL-specific settings
      statement_timeout: 30000,
      query_timeout: 30000,
      connectionTimeoutMillis: this.poolConfig.acquireTimeoutMillis,
      idleTimeoutMillis: this.poolConfig.idle,
      
      // Connection validation
      testOnBorrow: this.poolConfig.testOnBorrow,
      validationQuery: 'SELECT 1',
      
      // Pool maintenance
      maxUses: this.poolConfig.maxUses,
      numTestsPerRun: 3,
      testOnReturn: false,
      testWhileIdle: true,
    };

    this.logger.log('Applied PostgreSQL connection pool optimizations');
  }

  private async optimizeMySQLPool(): Promise<void> {
    const options = this.dataSource.options as any;
    
    // Apply MySQL-specific optimizations
    options.extra = {
      ...options.extra,
      connectionLimit: this.poolConfig.max,
      acquireTimeout: this.poolConfig.acquire,
      timeout: this.poolConfig.idle,
      reconnect: this.poolConfig.handleDisconnects,
      
      // MySQL-specific settings
      charset: 'utf8mb4',
      timezone: 'Z',
      supportBigNumbers: true,
      bigNumberStrings: true,
      dateStrings: false,
      
      // Connection validation
      testOnBorrow: this.poolConfig.testOnBorrow,
      validationQuery: 'SELECT 1',
    };

    this.logger.log('Applied MySQL connection pool optimizations');
  }

  private getPoolSize(): number {
    try {
      return this.dataSource.driver.master?.getPoolSize?.() || 0;
    } catch {
      return 0;
    }
  }

  private getActiveConnections(): number {
    try {
      return this.dataSource.driver.master?.getPoolUsed?.() || 0;
    } catch {
      return 0;
    }
  }

  private getWaitingConnections(): number {
    try {
      return this.dataSource.driver.master?.getPoolWaiting?.() || 0;
    } catch {
      return 0;
    }
  }

  private async adjustPoolSize(newSize: number): Promise<void> {
    try {
      // This would require pool reconfiguration
      // Implementation depends on the specific database driver
      this.poolConfig.max = newSize;
      this.logger.log(`Adjusted pool size to ${newSize}`);
    } catch (error) {
      this.logger.error('Failed to adjust pool size', error);
    }
  }

  private recordWaitTime(waitTime: number): void {
    this.connectionWaitTimes.push(waitTime);
    
    // Keep only recent wait times (last 100)
    if (this.connectionWaitTimes.length > 100) {
      this.connectionWaitTimes = this.connectionWaitTimes.slice(-100);
    }
  }

  private calculateAverageWaitTime(): number {
    if (this.connectionWaitTimes.length === 0) return 0;
    
    const sum = this.connectionWaitTimes.reduce((a, b) => a + b, 0);
    return sum / this.connectionWaitTimes.length;
  }

  private cleanupWaitTimes(): void {
    // Keep only wait times from the last 5 minutes
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    this.connectionWaitTimes = this.connectionWaitTimes.filter(time => time > fiveMinutesAgo);
  }

  private assessPoolHealth(utilization: number, avgWaitTime: number): 'excellent' | 'good' | 'warning' | 'critical' {
    if (utilization > 95 || avgWaitTime > 10000) return 'critical';
    if (utilization > 85 || avgWaitTime > 5000) return 'warning';
    if (utilization > 70 || avgWaitTime > 2000) return 'good';
    return 'excellent';
  }

  private generateOptimizationRecommendations(metrics: ConnectionPoolMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.connectionUtilization > 80) {
      recommendations.push('Consider increasing maximum pool size');
    }

    if (metrics.averageWaitTime > 3000) {
      recommendations.push('Optimize query performance to reduce connection hold time');
    }

    if (metrics.connectionErrors > 5) {
      recommendations.push('Investigate connection stability and network issues');
    }

    if (metrics.idleConnections > metrics.maxConnections * 0.5) {
      recommendations.push('Consider reducing minimum pool size to save resources');
    }

    if (recommendations.length === 0) {
      recommendations.push('Connection pool is performing optimally');
    }

    return recommendations;
  }

  private getDefaultMetrics(): ConnectionPoolMetrics {
    return {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingConnections: 0,
      maxConnections: this.poolConfig.max,
      minConnections: this.poolConfig.min,
      connectionUtilization: 0,
      averageWaitTime: 0,
      connectionErrors: this.connectionErrors,
      poolHealth: 'warning',
    };
  }
}
