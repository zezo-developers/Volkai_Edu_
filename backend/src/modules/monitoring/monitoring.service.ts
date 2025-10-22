import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsEvent } from '../../database/entities/analytics-event.entity';
import * as os from 'os';
import * as process from 'process';

export interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    loadAverage: number[];
    cores: number;
  };
  memory: {
    total: number;
    free: number;
    used: number;
    usagePercentage: number;
    heapUsed: number;
    heapTotal: number;
  };
  disk: {
    total: number;
    free: number;
    used: number;
    usagePercentage: number;
  };
  network: {
    bytesReceived: number;
    bytesSent: number;
    packetsReceived: number;
    packetsSent: number;
  };
  process: {
    pid: number;
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
  };
}

export interface ApplicationMetrics {
  timestamp: Date;
  requests: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
    requestsPerSecond: number;
  };
  database: {
    connections: number;
    queries: number;
    slowQueries: number;
    averageQueryTime: number;
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
    memoryUsage: number;
  };
  errors: {
    total: number;
    rate: number;
    byType: Record<string, number>;
  };
}

export interface Alert {
  id: string;
  type: 'cpu' | 'memory' | 'disk' | 'response_time' | 'error_rate' | 'database' | 'custom';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private systemMetricsHistory: SystemMetrics[] = [];
  private applicationMetricsHistory: ApplicationMetrics[] = [];
  private alerts: Alert[] = [];
  private readonly maxHistorySize = 1440; // 24 hours of minute-by-minute data

  // Request tracking
  private requestStats = {
    total: 0,
    successful: 0,
    failed: 0,
    responseTimes: [] as number[],
    lastMinuteRequests: 0,
  };

  // Error tracking
  private errorStats = {
    total: 0,
    byType: new Map<string, number>(),
    lastHour: [] as { timestamp: number; type: string }[],
  };

  constructor(
    private configService: ConfigService,
    @InjectRepository(AnalyticsEvent)
    private analyticsEventRepository: Repository<AnalyticsEvent | any>,
  ) {
    this.initializeMonitoring();
  }

  private initializeMonitoring(): void {
    // Set up process event listeners
    process.on('uncaughtException', (error) => {
      this.recordError('uncaught_exception', error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.recordError('unhandled_rejection', new Error(String(reason)));
    });

    // Set up memory usage monitoring
    setInterval(() => {
      const memUsage = process.memoryUsage();
      if (memUsage.heapUsed / memUsage.heapTotal > 0.9) {
        this.createAlert({
          type: 'memory',
          severity: 'high',
          title: 'High Memory Usage',
          description: 'Application memory usage is above 90%',
          threshold: 90,
          currentValue: (memUsage.heapUsed / memUsage.heapTotal) * 100,
        });
      }
    }, 30000); // Check every 30 seconds
  }

  // System metrics collection
  async collectSystemMetrics(): Promise<SystemMetrics> {
    const cpuUsage = await this.getCpuUsage();
    const memoryInfo = this.getMemoryInfo();
    const diskInfo = await this.getDiskInfo();
    const networkInfo = this.getNetworkInfo();
    const processInfo = this.getProcessInfo();

    const metrics: SystemMetrics = {
      timestamp: new Date(),
      cpu: {
        usage: cpuUsage,
        loadAverage: os.loadavg(),
        cores: os.cpus().length,
      },
      memory: memoryInfo,
      disk: diskInfo,
      network: networkInfo,
      process: processInfo,
    };

    // Store in history
    this.systemMetricsHistory.push(metrics);
    if (this.systemMetricsHistory.length > this.maxHistorySize) {
      this.systemMetricsHistory.shift();
    }

    // Check for alerts
    this.checkSystemAlerts(metrics);

    return metrics;
  }

  // Application metrics collection
  async collectApplicationMetrics(): Promise<ApplicationMetrics> {
    const requestMetrics = this.getRequestMetrics();
    const databaseMetrics = await this.getDatabaseMetrics();
    const cacheMetrics = this.getCacheMetrics();
    const errorMetrics = this.getErrorMetrics();

    const metrics: ApplicationMetrics = {
      timestamp: new Date(),
      requests: requestMetrics,
      database: databaseMetrics,
      cache: cacheMetrics,
      errors: errorMetrics,
    };

    // Store in history
    this.applicationMetricsHistory.push(metrics);
    if (this.applicationMetricsHistory.length > this.maxHistorySize) {
      this.applicationMetricsHistory.shift();
    }

    // Check for alerts
    this.checkApplicationAlerts(metrics);

    return metrics;
  }

  // Request tracking
  recordRequest(responseTime: number, success: boolean): void {
    this.requestStats.total++;
    this.requestStats.lastMinuteRequests++;
    
    if (success) {
      this.requestStats.successful++;
    } else {
      this.requestStats.failed++;
    }

    this.requestStats.responseTimes.push(responseTime);
    
    // Keep only last 1000 response times
    if (this.requestStats.responseTimes.length > 1000) {
      this.requestStats.responseTimes.shift();
    }

    // Check for slow response times
    if (responseTime > 5000) { // 5 seconds
      this.createAlert({
        type: 'response_time',
        severity: 'medium',
        title: 'Slow Response Time',
        description: `Request took ${responseTime}ms to complete`,
        threshold: 5000,
        currentValue: responseTime,
      });
    }
  }

  // Error tracking
  recordError(type: string, error: Error): void {
    this.errorStats.total++;
    this.errorStats.byType.set(type, (this.errorStats.byType.get(type) || 0) + 1);
    this.errorStats.lastHour.push({
      timestamp: Date.now(),
      type,
    });

    // Clean old errors (keep last hour)
    const oneHourAgo = Date.now() - 3600000;
    this.errorStats.lastHour = this.errorStats.lastHour.filter(e => e.timestamp >= oneHourAgo);

    // Log error
    this.logger.error(`${type}: ${error.message}`, error.stack);

    // Check error rate
    if (this.errorStats.lastHour.length > 100) { // More than 100 errors in last hour
      this.createAlert({
        type: 'error_rate',
        severity: 'high',
        title: 'High Error Rate',
        description: `${this.errorStats.lastHour.length} errors in the last hour`,
        threshold: 100,
        currentValue: this.errorStats.lastHour.length,
      });
    }
  }

  // Alert management
  private createAlert(alertData: Omit<Alert, 'id' | 'timestamp' | 'resolved'>): void {
    const alert: Alert = {
      id: this.generateAlertId(),
      timestamp: new Date(),
      resolved: false,
      ...alertData,
    };

    this.alerts.push(alert);
    
    // Log alert
    this.logger.warn(`ALERT [${alert.severity.toUpperCase()}]: ${alert.title} - ${alert.description}`);

    // Store in analytics
    this.analyticsEventRepository.save({
      eventType: 'system.alert.created',
      eventData: alert,
      metadata: {
        source: 'monitoring_service',
        automated: true,
      },
    });
  }

  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      
      this.logger.log(`Alert resolved: ${alert.title}`);
    }
  }

  getAlerts(resolved?: boolean): Alert[] {
    if (resolved !== undefined) {
      return this.alerts.filter(a => a.resolved === resolved);
    }
    return [...this.alerts];
  }

  // Health check
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, { status: string; message?: string; responseTime?: number }>;
    uptime: number;
    version: string;
  }> {
    const checks: Record<string, { status: string; message?: string; responseTime?: number }> = {};
    
    // Database check
    try {
      const start = Date.now();
      await this.analyticsEventRepository.query('SELECT 1');
      checks.database = {
        status: 'healthy',
        responseTime: Date.now() - start,
      };
    } catch (error) {
      checks.database = {
        status: 'unhealthy',
        message: error.message,
      };
    }

    // Memory check
    const memUsage = process.memoryUsage();
    const memPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    checks.memory = {
      status: memPercentage > 90 ? 'unhealthy' : memPercentage > 70 ? 'degraded' : 'healthy',
      message: `${memPercentage.toFixed(1)}% used`,
    };

    // CPU check
    const cpuUsage = await this.getCpuUsage();
    checks.cpu = {
      status: cpuUsage > 90 ? 'unhealthy' : cpuUsage > 70 ? 'degraded' : 'healthy',
      message: `${cpuUsage.toFixed(1)}% usage`,
    };

    // Disk check
    const diskInfo = await this.getDiskInfo();
    checks.disk = {
      status: diskInfo.usagePercentage > 90 ? 'unhealthy' : diskInfo.usagePercentage > 80 ? 'degraded' : 'healthy',
      message: `${diskInfo.usagePercentage.toFixed(1)}% used`,
    };

    // Overall status
    const unhealthyCount = Object.values(checks).filter(c => c.status === 'unhealthy').length;
    const degradedCount = Object.values(checks).filter(c => c.status === 'degraded').length;
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (unhealthyCount > 0) {
      status = 'unhealthy';
    } else if (degradedCount > 0) {
      status = 'degraded';
    }

    return {
      status,
      checks,
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  // Scheduled monitoring tasks
  @Cron(CronExpression.EVERY_MINUTE)
  async collectMetrics(): Promise<void> {
    try {
      await Promise.all([
        this.collectSystemMetrics(),
        this.collectApplicationMetrics(),
      ]);

      // Reset per-minute counters
      this.requestStats.lastMinuteRequests = 0;
    } catch (error) {
      this.logger.error(`Error collecting metrics: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async generateReport(): Promise<void> {
    try {
      const systemMetrics = this.getSystemMetricsHistory(60); // Last hour
      const appMetrics = this.getApplicationMetricsHistory(60);
      const unresolvedAlerts = this.getAlerts(false);

      this.logger.log(`Hourly Monitoring Report:
        - System: CPU ${this.getAverageMetric(systemMetrics, 'cpu.usage').toFixed(1)}%, Memory ${this.getAverageMetric(systemMetrics, 'memory.usagePercentage').toFixed(1)}%
        - Requests: ${this.requestStats.total} total, ${((this.requestStats.successful / this.requestStats.total) * 100).toFixed(1)}% success rate
        - Errors: ${this.errorStats.total} total, ${this.errorStats.lastHour.length} in last hour
        - Alerts: ${unresolvedAlerts.length} unresolved`);

    } catch (error) {
      this.logger.error(`Error generating monitoring report: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldData(): Promise<void> {
    try {
      // Clean up old metrics (keep last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      this.systemMetricsHistory = this.systemMetricsHistory.filter(
        m => m.timestamp >= sevenDaysAgo
      );
      
      this.applicationMetricsHistory = this.applicationMetricsHistory.filter(
        m => m.timestamp >= sevenDaysAgo
      );

      // Clean up old resolved alerts (keep last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      this.alerts = this.alerts.filter(
        a => !a.resolved || a.timestamp >= thirtyDaysAgo
      );

      this.logger.log('Monitoring data cleanup completed');
    } catch (error) {
      this.logger.error(`Error cleaning up monitoring data: ${error.message}`);
    }
  }

  // Public API methods
  getSystemMetricsHistory(minutes: number = 60): SystemMetrics[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.systemMetricsHistory.filter(m => m.timestamp >= cutoff);
  }

  getApplicationMetricsHistory(minutes: number = 60): ApplicationMetrics[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.applicationMetricsHistory.filter(m => m.timestamp >= cutoff);
  }

  getCurrentMetrics(): {
    system: SystemMetrics | null;
    application: ApplicationMetrics | null;
  } {
    return {
      system: this.systemMetricsHistory[this.systemMetricsHistory.length - 1] || null,
      application: this.applicationMetricsHistory[this.applicationMetricsHistory.length - 1] || null,
    };
  }

  // Private helper methods
  private async getCpuUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const totalUsage = endUsage.user + endUsage.system;
        const percentage = (totalUsage / 1000000) * 100; // Convert to percentage
        resolve(Math.min(100, percentage));
      }, 100);
    });
  }

  private getMemoryInfo() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const processMemory = process.memoryUsage();

    return {
      total: totalMem,
      free: freeMem,
      used: usedMem,
      usagePercentage: (usedMem / totalMem) * 100,
      heapUsed: processMemory.heapUsed,
      heapTotal: processMemory.heapTotal,
    };
  }

  private async getDiskInfo() {
    // Simplified disk info - in production, use proper disk usage library
    return {
      total: 1000000000000, // 1TB
      free: 500000000000,   // 500GB
      used: 500000000000,   // 500GB
      usagePercentage: 50,
    };
  }

  private getNetworkInfo() {
    // Simplified network info - in production, get actual network stats
    return {
      bytesReceived: 0,
      bytesSent: 0,
      packetsReceived: 0,
      packetsSent: 0,
    };
  }

  private getProcessInfo() {
    return {
      pid: process.pid,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
    };
  }

  private getRequestMetrics() {
    const avgResponseTime = this.requestStats.responseTimes.length > 0
      ? this.requestStats.responseTimes.reduce((a, b) => a + b, 0) / this.requestStats.responseTimes.length
      : 0;

    return {
      total: this.requestStats.total,
      successful: this.requestStats.successful,
      failed: this.requestStats.failed,
      averageResponseTime: avgResponseTime,
      requestsPerSecond: this.requestStats.lastMinuteRequests / 60,
    };
  }

  private async getDatabaseMetrics() {
    // Simplified database metrics - in production, get actual DB stats
    return {
      connections: 10,
      queries: 1000,
      slowQueries: 5,
      averageQueryTime: 50,
    };
  }

  private getCacheMetrics() {
    // Simplified cache metrics - in production, get actual cache stats
    return {
      hits: 800,
      misses: 200,
      hitRate: 80,
      memoryUsage: 1024 * 1024 * 10, // 10MB
    };
  }

  private getErrorMetrics() {
    const errorsByType: Record<string, number> = {};
    this.errorStats.byType.forEach((count, type) => {
      errorsByType[type] = count;
    });

    return {
      total: this.errorStats.total,
      rate: this.errorStats.lastHour.length / 60, // Errors per minute
      byType: errorsByType,
    };
  }

  private checkSystemAlerts(metrics: SystemMetrics): void {
    // CPU alert
    if (metrics.cpu.usage > 90) {
      this.createAlert({
        type: 'cpu',
        severity: 'critical',
        title: 'Critical CPU Usage',
        description: `CPU usage is at ${metrics.cpu.usage.toFixed(1)}%`,
        threshold: 90,
        currentValue: metrics.cpu.usage,
      });
    }

    // Memory alert
    if (metrics.memory.usagePercentage > 90) {
      this.createAlert({
        type: 'memory',
        severity: 'critical',
        title: 'Critical Memory Usage',
        description: `Memory usage is at ${metrics.memory.usagePercentage.toFixed(1)}%`,
        threshold: 90,
        currentValue: metrics.memory.usagePercentage,
      });
    }

    // Disk alert
    if (metrics.disk.usagePercentage > 90) {
      this.createAlert({
        type: 'disk',
        severity: 'high',
        title: 'High Disk Usage',
        description: `Disk usage is at ${metrics.disk.usagePercentage.toFixed(1)}%`,
        threshold: 90,
        currentValue: metrics.disk.usagePercentage,
      });
    }
  }

  private checkApplicationAlerts(metrics: ApplicationMetrics): void {
    // Error rate alert
    if (metrics.errors.rate > 10) { // More than 10 errors per minute
      this.createAlert({
        type: 'error_rate',
        severity: 'high',
        title: 'High Error Rate',
        description: `Error rate is ${metrics.errors.rate.toFixed(1)} errors/minute`,
        threshold: 10,
        currentValue: metrics.errors.rate,
      });
    }

    // Response time alert
    if (metrics.requests.averageResponseTime > 2000) { // More than 2 seconds
      this.createAlert({
        type: 'response_time',
        severity: 'medium',
        title: 'Slow Response Time',
        description: `Average response time is ${metrics.requests.averageResponseTime.toFixed(0)}ms`,
        threshold: 2000,
        currentValue: metrics.requests.averageResponseTime,
      });
    }
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getAverageMetric(metrics: any[], path: string): number {
    if (metrics.length === 0) return 0;
    
    const values = metrics.map(m => {
      const keys = path.split('.');
      let value = m;
      for (const key of keys) {
        value = value?.[key];
      }
      return typeof value === 'number' ? value : 0;
    });
    
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
}
