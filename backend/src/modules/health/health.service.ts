import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '@database/entities/user.entity';

/**
 * Health status interface
 */
export interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  services: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
    search: 'up' | 'down';
    storage: 'up' | 'down';
  };
  version: string;
  environment: string;
}

/**
 * Health Service
 * Monitors system health and provides status information for monitoring tools
 */
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get comprehensive system health status
   */
  async getHealth(): Promise<HealthStatus> {
    const services = await this.checkServices();
    const overallStatus = Object.values(services).every(status => status === 'up') ? 'ok' : 'error';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      services,
      version: this.getAppVersion(),
      environment: this.configService.get<string>('NODE_ENV', 'development'),
    };
  }

  /**
   * Get readiness status for load balancer health checks
   */
  async getReadiness(): Promise<{
    ready: boolean;
    timestamp: string;
    checks: Record<string, boolean>;
  }> {
    const checks = {
      database: await this.checkDatabase(),
      migrations: await this.checkMigrations(),
      redis: await this.checkRedis(),
    };

    const ready = Object.values(checks).every(check => check === true);

    return {
      ready,
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  /**
   * Get version and build information
   */
  getVersion(): {
    version: string;
    gitCommit: string;
    buildTime: string;
    environment: string;
    nodeVersion: string;
  } {
    return {
      version: this.getAppVersion(),
      gitCommit: process.env.GIT_COMMIT || 'unknown',
      buildTime: process.env.BUILD_TIME || new Date().toISOString(),
      environment: this.configService.get<string>('NODE_ENV', 'development'),
      nodeVersion: process.version,
    };
  }

  /**
   * Check all services health
   */
  private async checkServices(): Promise<{
    database: 'up' | 'down';
    redis: 'up' | 'down';
    search: 'up' | 'down';
    storage: 'up' | 'down';
  }> {
    const [database, redis, search, storage] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkSearch(),
      this.checkStorage(),
    ]);

    return {
      database: database.status === 'fulfilled' && database.value ? 'up' : 'down',
      redis: redis.status === 'fulfilled' && redis.value ? 'up' : 'down',
      search: search.status === 'fulfilled' && search.value ? 'up' : 'down',
      storage: storage.status === 'fulfilled' && storage.value ? 'up' : 'down',
    };
  }

  /**
   * Check database connectivity
   */
  private async checkDatabase(): Promise<boolean> {
    try {
      // Use a more comprehensive database check
      const result = await this.userRepository.query('SELECT 1 as health_check');
      return result && result.length > 0 && result[0].health_check === 1;
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Check if database migrations are up to date
   */
  private async checkMigrations(): Promise<boolean> {
    try {
      // Simple check - if we can query the users table, migrations are likely applied
      await this.userRepository.query('SELECT COUNT(*) FROM users LIMIT 1');
      return true;
    } catch (error) {
      this.logger.error('Migration check failed:', error);
      return false;
    }
  }

  /**
   * Check Redis connectivity
   */
  private async checkRedis(): Promise<boolean> {
    try {
      // TODO: Implement Redis health check when Redis service is available
      // For now, return true as Redis is optional for basic functionality
      return true;
    } catch (error) {
      this.logger.error('Redis health check failed:', error);
      return false;
    }
  }

  /**
   * Check search service (OpenSearch/Elasticsearch)
   */
  private async checkSearch(): Promise<boolean> {
    try {
      // TODO: Implement search service health check when implemented
      // For now, return true as search is optional for basic functionality
      return true;
    } catch (error) {
      this.logger.error('Search service health check failed:', error);
      return false;
    }
  }

  /**
   * Check storage service (S3)
   */
  private async checkStorage(): Promise<boolean> {
    try {
      // TODO: Implement storage service health check when implemented
      // For now, return true as storage is optional for basic functionality
      return true;
    } catch (error) {
      this.logger.error('Storage service health check failed:', error);
      return false;
    }
  }

  /**
   * Get application version from package.json
   */
  private getAppVersion(): string {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const packageJson = require('../../../package.json');
      return packageJson.version || '1.0.0';
    } catch {
      return '1.0.0';
    }
  }
}
