import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { HealthService } from './health.service';
import { User } from '@database/entities/user.entity';

describe('HealthService', () => {
  let service: HealthService;
  let userRepository: Repository<User>;
  let configService: ConfigService;

  const mockUserRepository = {
    query: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHealth', () => {
    it('should return health status with all services up', async () => {
      mockUserRepository.query.mockResolvedValue([]);

      const result = await service.getHealth();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('services');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('environment');
    });

    it('should return error status when database is down', async () => {
      mockUserRepository.query.mockRejectedValue(new Error('Database connection failed'));

      const result = await service.getHealth();

      expect(result.status).toBe('error');
      expect(result.services.database).toBe('down');
    });
  });

  describe('getReadiness', () => {
    it('should return ready status when all checks pass', async () => {
      mockUserRepository.query.mockResolvedValue([]);

      const result = await service.getReadiness();

      expect(result).toHaveProperty('ready');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('checks');
      expect(result.checks).toHaveProperty('database');
      expect(result.checks).toHaveProperty('migrations');
      expect(result.checks).toHaveProperty('redis');
    });

    it('should return not ready when database check fails', async () => {
      mockUserRepository.query.mockRejectedValue(new Error('Database error'));

      const result = await service.getReadiness();

      expect(result.ready).toBe(false);
      expect(result.checks.database).toBe(false);
    });
  });

  describe('getVersion', () => {
    it('should return version information', () => {
      mockConfigService.get.mockReturnValue('development');

      const result = service.getVersion();

      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('gitCommit');
      expect(result).toHaveProperty('buildTime');
      expect(result).toHaveProperty('environment');
      expect(result).toHaveProperty('nodeVersion');
    });
  });
});
