import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PerformanceService } from './performance.service';
import { AnalyticsEvent } from '../../database/entities/analytics-event.entity';

describe('PerformanceService', () => {
  let service: PerformanceService;
  let configService: ConfigService;
  let dataSource: DataSource;
  let analyticsEventRepository: any;

  beforeEach(async () => {
    const mockDataSource = {
      createQueryRunner: jest.fn(() => ({
        query: jest.fn(),
        release: jest.fn(),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerformanceService,
        {
          provide: ConfigService,
          useValue: global.unitTestUtils.mockConfigService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        global.unitTestUtils.mockRepositoryProvider(AnalyticsEvent),
      ],
    }).compile();

    service = module.get<PerformanceService>(PerformanceService);
    configService = module.get<ConfigService>(ConfigService);
    dataSource = module.get<DataSource>(DataSource);
    analyticsEventRepository = module.get(getRepositoryToken(AnalyticsEvent));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCurrentMetrics', () => {
    it('should return current performance metrics', async () => {
      const metrics = await service.getCurrentMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.timestamp).toBeInstanceOf(Date);
      expect(metrics.cpuUsage).toBeGreaterThanOrEqual(0);
      expect(metrics.memoryUsage).toBeDefined();
      expect(metrics.memoryUsage.total).toBeGreaterThan(0);
      expect(metrics.databaseMetrics).toBeDefined();
      expect(metrics.apiMetrics).toBeDefined();
      expect(metrics.cacheMetrics).toBeDefined();
    });

    it('should store metrics in history', async () => {
      const initialHistoryLength = service.getMetricsHistory().length;
      await service.getCurrentMetrics();
      const newHistoryLength = service.getMetricsHistory().length;

      expect(newHistoryLength).toBe(initialHistoryLength + 1);
    });
  });

  describe('getDatabaseHealth', () => {
    it('should return database health information', async () => {
      const mockQueryRunner = {
        query: jest.fn()
          .mockResolvedValueOnce([{ connection_count: 5 }])
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([]),
        release: jest.fn(),
      };

      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

      const health = await service.getDatabaseHealth();

      expect(health).toBeDefined();
      expect(health.connectionCount).toBe(5);
      expect(health.slowQueries).toBeInstanceOf(Array);
      expect(health.tableStats).toBeInstanceOf(Array);
      expect(health.lockInfo).toBeInstanceOf(Array);
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const mockQueryRunner = {
        query: jest.fn().mockRejectedValue(new Error('Database error')),
        release: jest.fn(),
      };

      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

      const health = await service.getDatabaseHealth();

      expect(health.connectionCount).toBe(0);
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('getQueryOptimizationRecommendations', () => {
    it('should return optimization recommendations', async () => {
      const mockQueryRunner = {
        query: jest.fn()
          .mockResolvedValueOnce([
            {
              schemaname: 'public',
              tablename: 'users',
              seq_scan: 1000,
              seq_tup_read: 50000,
              idx_scan: 100,
            }
          ])
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([]),
        release: jest.fn(),
      };

      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

      const recommendations = await service.getQueryOptimizationRecommendations();

      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0]).toHaveProperty('issue');
      expect(recommendations[0]).toHaveProperty('severity');
      expect(recommendations[0]).toHaveProperty('recommendation');
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('optimizeDatabase', () => {
    it('should optimize database tables', async () => {
      const mockQueryRunner = {
        query: jest.fn()
          .mockResolvedValueOnce([
            { schemaname: 'public', tablename: 'users', n_dead_tup: 1000, n_live_tup: 5000 }
          ])
          .mockResolvedValue(undefined),
        release: jest.fn(),
      };

      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

      const result = await service.optimizeDatabase();

      expect(result).toBeDefined();
      expect(result.vacuumed).toBeInstanceOf(Array);
      expect(result.reindexed).toBeInstanceOf(Array);
      expect(result.analyzed).toBeInstanceOf(Array);
      expect(result.errors).toBeInstanceOf(Array);
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should handle optimization errors', async () => {
      const mockQueryRunner = {
        query: jest.fn()
          .mockResolvedValueOnce([
            { schemaname: 'public', tablename: 'users', n_dead_tup: 1000, n_live_tup: 5000 }
          ])
          .mockRejectedValue(new Error('Optimization error')),
        release: jest.fn(),
      };

      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

      const result = await service.optimizeDatabase();

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Optimization error');
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('getMetricsHistory', () => {
    it('should return metrics history for specified duration', () => {
      // Add some mock metrics to history
      service['metricsHistory'] = [
        {
          timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
          cpuUsage: 50,
          memoryUsage: { total: 1000, free: 500, used: 500, usagePercentage: 50, heapUsed: 100, heapTotal: 200 },
          databaseMetrics: { activeConnections: 5, queryTime: 100, slowQueries: 0 },
          apiMetrics: { requestsPerSecond: 10, averageResponseTime: 200, errorRate: 1 },
          cacheMetrics: { hitRate: 90, missRate: 10, evictionRate: 0 },
        },
        {
          timestamp: new Date(Date.now() - 90 * 60 * 1000), // 90 minutes ago
          cpuUsage: 60,
          memoryUsage: { total: 1000, free: 400, used: 600, usagePercentage: 60, heapUsed: 120, heapTotal: 200 },
          databaseMetrics: { activeConnections: 7, queryTime: 150, slowQueries: 1 },
          apiMetrics: { requestsPerSecond: 15, averageResponseTime: 250, errorRate: 2 },
          cacheMetrics: { hitRate: 85, missRate: 15, evictionRate: 1 },
        },
      ];

      const history = service.getMetricsHistory(1); // Last 1 hour

      expect(history).toHaveLength(1);
      expect(history[0].cpuUsage).toBe(50);
    });
  });

  describe('getPerformanceReport', () => {
    it('should generate comprehensive performance report', async () => {
      const mockQueryRunner = {
        query: jest.fn()
          .mockResolvedValue([]),
        release: jest.fn(),
      };

      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

      const report = await service.getPerformanceReport();

      expect(report).toBeDefined();
      expect(report.currentMetrics).toBeDefined();
      expect(report.databaseHealth).toBeDefined();
      expect(report.recommendations).toBeInstanceOf(Array);
      expect(report.trends).toBeDefined();
      expect(report.trends.cpuTrend).toBeDefined();
      expect(report.trends.memoryTrend).toBeDefined();
      expect(report.trends.responseTrend).toBeDefined();
    });
  });
});
