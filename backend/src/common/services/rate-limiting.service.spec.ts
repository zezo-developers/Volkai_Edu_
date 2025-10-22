import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RateLimitingService } from './rate-limiting.service';
import { Organization } from '@database/entities/organization.entity';
import Redis from 'ioredis';

// Mock Redis
const mockRedis = {
  pipeline: jest.fn(() => ({
    zremrangebyscore: jest.fn().mockReturnThis(),
    zcard: jest.fn().mockReturnThis(),
    zadd: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  })),
  get: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  zcount: jest.fn(),
  hgetall: jest.fn(),
};

describe('RateLimitingService', () => {
  let service: RateLimitingService;
  let redis: jest.Mocked<Redis>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitingService,
        {
          provide: 'default_IORedisModuleConnectionToken',
          useValue: mockRedis,
        },
        {
          provide: getRepositoryToken(Organization),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RateLimitingService>(RateLimitingService);
    redis = mockRedis as any;
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkRateLimit', () => {
    const mockRequest = {
      connection: { remoteAddress: '192.168.1.1' },
      get: jest.fn(),
      path: '/test',
      method: 'GET',
    } as any;

    it('should allow requests within rate limit', async () => {
      // Mock Redis pipeline results
      redis.pipeline().exec.mockResolvedValue([
        [null, 0], // zremrangebyscore
        [null, 2], // zcard (current count)
        [null, 1], // zadd
        [null, 1], // expire
      ]);

      const result = await service.checkRateLimit(mockRequest, 'api:general');

      expect(result.allowed).toBe(true);
      expect(result.totalHits).toBe(3);
      expect(result.remainingPoints).toBeGreaterThan(0);
    });

    it('should block requests exceeding rate limit', async () => {
      // Mock Redis pipeline results showing limit exceeded
      redis.pipeline().exec.mockResolvedValue([
        [null, 0], // zremrangebyscore
        [null, 100], // zcard (current count at limit)
        [null, 1], // zadd
        [null, 1], // expire
      ]);

      redis.get.mockResolvedValue(null); // Not already blocked

      const result = await service.checkRateLimit(mockRequest, 'api:general');

      expect(result.allowed).toBe(false);
      expect(result.totalHits).toBe(101);
      expect(result.remainingPoints).toBe(0);
      expect(result.retryAfter).toBeDefined();
    });

    it('should handle Redis errors gracefully', async () => {
      redis.pipeline().exec.mockRejectedValue(new Error('Redis connection failed'));

      const result = await service.checkRateLimit(mockRequest, 'api:general');

      // Should fail open
      expect(result.allowed).toBe(true);
      expect(result.totalHits).toBe(0);
      expect(result.remainingPoints).toBe(999);
    });

    it('should use correct configuration for different categories', async () => {
      redis.pipeline().exec.mockResolvedValue([
        [null, 0],
        [null, 1],
        [null, 1],
        [null, 1],
      ]);

      await service.checkRateLimit(mockRequest, 'auth:login');

      // Should use auth:login specific configuration
      expect(redis.pipeline).toHaveBeenCalled();
    });
  });

  describe('isBlocked', () => {
    const mockRequest = {
      connection: { remoteAddress: '192.168.1.1' },
      get: jest.fn(),
    } as any;

    it('should return true for blocked IPs', async () => {
      redis.get.mockResolvedValue('blocked');

      const result = await service.isBlocked(mockRequest, 'auth:login');

      expect(result).toBe(true);
    });

    it('should return false for non-blocked IPs', async () => {
      redis.get.mockResolvedValue(null);

      const result = await service.isBlocked(mockRequest, 'auth:login');

      expect(result).toBe(false);
    });

    it('should handle Redis errors gracefully', async () => {
      redis.get.mockRejectedValue(new Error('Redis error'));

      const result = await service.isBlocked(mockRequest, 'auth:login');

      expect(result).toBe(false); // Fail open
    });
  });

  describe('blockKey', () => {
    const mockRequest = {
      connection: { remoteAddress: '192.168.1.1' },
      get: jest.fn(),
      path: '/test',
      method: 'GET',
    } as any;

    it('should block IP successfully', async () => {
      redis.setex.mockResolvedValue('OK');

      await service.blockKey(mockRequest, 'auth:login', 300000, 'Test block');

      expect(redis.setex).toHaveBeenCalledWith(
        expect.stringContaining('blocked'),
        300,
        expect.any(String),
      );
    });

    it('should handle blocking errors gracefully', async () => {
      redis.setex.mockRejectedValue(new Error('Redis error'));

      await expect(
        service.blockKey(mockRequest, 'auth:login', 300000, 'Test block')
      ).resolves.not.toThrow();
    });
  });

  describe('detectAttackPatterns', () => {
    const mockRequest = {
      connection: { remoteAddress: '192.168.1.1' },
      get: jest.fn(() => 'Mozilla/5.0'),
      path: '/auth/login',
      method: 'POST',
    } as any;

    it('should detect brute force attacks', async () => {
      redis.zcount.mockResolvedValue(15); // Above threshold

      const patterns = await service.detectAttackPatterns(mockRequest);

      expect(patterns).toHaveLength(1);
      expect(patterns[0].type).toBe('brute_force');
      expect(patterns[0].severity).toBe('high');
    });

    it('should detect DDoS attacks', async () => {
      redis.zcount
        .mockResolvedValueOnce(5) // brute force - below threshold
        .mockResolvedValueOnce(250); // DDoS - above threshold

      const patterns = await service.detectAttackPatterns(mockRequest);

      expect(patterns.some(p => p.type === 'ddos')).toBe(true);
    });

    it('should detect credential stuffing', async () => {
      mockRequest.get = jest.fn(() => 'python-requests/2.25.1');
      redis.zcount
        .mockResolvedValueOnce(5) // brute force
        .mockResolvedValueOnce(50) // DDoS
        .mockResolvedValueOnce(10); // credential stuffing with suspicious UA

      const patterns = await service.detectAttackPatterns(mockRequest);

      expect(patterns.some(p => p.type === 'credential_stuffing')).toBe(true);
    });

    it('should handle detection errors gracefully', async () => {
      redis.zcount.mockRejectedValue(new Error('Redis error'));

      const patterns = await service.detectAttackPatterns(mockRequest);

      expect(patterns).toEqual([]);
    });
  });

  describe('getStatistics', () => {
    it('should return statistics for different time ranges', async () => {
      redis.hgetall.mockResolvedValue({
        totalRequests: '1000',
        blockedRequests: '50',
      });

      const stats = await service.getStatistics('hour');

      expect(stats.totalRequests).toBe(1000);
      expect(stats.blockedRequests).toBe(50);
      expect(stats.topBlockedIPs).toBeDefined();
      expect(stats.attackPatterns).toBeDefined();
      expect(stats.categories).toBeDefined();
    });

    it('should handle statistics errors gracefully', async () => {
      redis.hgetall.mockRejectedValue(new Error('Redis error'));

      const stats = await service.getStatistics('day');

      expect(stats.totalRequests).toBe(0);
      expect(stats.blockedRequests).toBe(0);
    });
  });

  describe('getAdaptiveRateLimit', () => {
    const baseConfig = {
      windowMs: 60000,
      maxRequests: 100,
      blockDurationMs: 300000,
    };

    it('should reduce limits under high system load', async () => {
      const adaptiveConfig = await service.getAdaptiveRateLimit(baseConfig, 95);

      expect(adaptiveConfig.maxRequests).toBeLessThan(baseConfig.maxRequests);
      expect(adaptiveConfig.blockDurationMs).toBeGreaterThan(baseConfig.blockDurationMs);
    });

    it('should maintain limits under normal load', async () => {
      const adaptiveConfig = await service.getAdaptiveRateLimit(baseConfig, 50);

      expect(adaptiveConfig.maxRequests).toBe(baseConfig.maxRequests);
      expect(adaptiveConfig.blockDurationMs).toBe(baseConfig.blockDurationMs);
    });

    it('should ensure minimum limits', async () => {
      const adaptiveConfig = await service.getAdaptiveRateLimit(baseConfig, 99);

      expect(adaptiveConfig.maxRequests).toBeGreaterThanOrEqual(1);
    });
  });

  describe('integration tests', () => {
    it('should handle complete rate limiting workflow', async () => {
      const mockRequest = {
        connection: { remoteAddress: '192.168.1.1' },
        get: jest.fn(),
        path: '/auth/login',
        method: 'POST',
      } as any;

      // First request - should be allowed
      redis.pipeline().exec.mockResolvedValue([
        [null, 0],
        [null, 1],
        [null, 1],
        [null, 1],
      ]);

      const result1 = await service.checkRateLimit(mockRequest, 'auth:login');
      expect(result1.allowed).toBe(true);

      // Multiple requests - should hit limit
      redis.pipeline().exec.mockResolvedValue([
        [null, 0],
        [null, 5], // At limit
        [null, 1],
        [null, 1],
      ]);
      redis.get.mockResolvedValue(null);

      const result2 = await service.checkRateLimit(mockRequest, 'auth:login');
      expect(result2.allowed).toBe(false);

      // Check if blocked
      redis.get.mockResolvedValue('blocked');
      const isBlocked = await service.isBlocked(mockRequest, 'auth:login');
      expect(isBlocked).toBe(true);
    });
  });

  describe('security edge cases', () => {
    it('should handle malformed IP addresses', async () => {
      const mockRequest = {
        connection: { remoteAddress: 'invalid-ip' },
        get: jest.fn(),
      } as any;

      redis.pipeline().exec.mockResolvedValue([
        [null, 0],
        [null, 1],
        [null, 1],
        [null, 1],
      ]);

      await expect(
        service.checkRateLimit(mockRequest, 'api:general')
      ).resolves.not.toThrow();
    });

    it('should handle missing request properties', async () => {
      const mockRequest = {} as any;

      redis.pipeline().exec.mockResolvedValue([
        [null, 0],
        [null, 1],
        [null, 1],
        [null, 1],
      ]);

      await expect(
        service.checkRateLimit(mockRequest, 'api:general')
      ).resolves.not.toThrow();
    });

    it('should handle concurrent requests safely', async () => {
      const mockRequest = {
        connection: { remoteAddress: '192.168.1.1' },
        get: jest.fn(),
      } as any;

      redis.pipeline().exec.mockResolvedValue([
        [null, 0],
        [null, 1],
        [null, 1],
        [null, 1],
      ]);

      // Simulate concurrent requests
      const promises = Array(10).fill(null).map(() => 
        service.checkRateLimit(mockRequest, 'api:general')
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toHaveProperty('allowed');
        expect(result).toHaveProperty('totalHits');
      });
    });
  });
});
