import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// Mock repository factory
export const createMockRepository = <T = any>(): Partial<Repository<T>> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  findAndCount: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  remove: jest.fn(),
  count: jest.fn(),
  query: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getMany: jest.fn(),
    getManyAndCount: jest.fn(),
    getRawOne: jest.fn(),
    getRawMany: jest.fn(),
  })),
});

// Mock service factory
export const createMockService = (methods: string[] = []): any => {
  const mockService: any = {};
  methods.forEach(method => {
    mockService[method] = jest.fn();
  });
  return mockService;
};

// Common test utilities for unit tests
global.unitTestUtils = {
  // Create test module for unit testing
  createUnitTestModule: async (
    providers: any[] = [],
    imports: any[] = [],
    controllers: any[] = []
  ): Promise<TestingModule> => {
    return Test.createTestingModule({
      imports,
      controllers,
      providers,
    }).compile();
  },

  // Mock repository provider
  mockRepositoryProvider: (entity: any) => ({
    provide: getRepositoryToken(entity),
    useValue: createMockRepository(),
  }),

  // Mock service provider
  mockServiceProvider: (service: any, methods: string[] = []) => ({
    provide: service,
    useValue: createMockService(methods),
  }),

  // Mock configuration service
  mockConfigService: {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        'NODE_ENV': 'test',
        'JWT_SECRET': 'test-jwt-secret',
        'JWT_EXPIRES_IN': '15m',
        'JWT_REFRESH_SECRET': 'test-refresh-secret',
        'JWT_REFRESH_EXPIRES_IN': '7d',
        'database.host': 'localhost',
        'database.port': 5433,
        'database.username': 'test_user',
        'database.password': 'test_password',
        'database.database': 'volkai_test',
        'redis.host': 'localhost',
        'redis.port': 6380,
        'redis.db': 1,
        'email.from': 'test@volkai.com',
        'aws.s3.bucket': 'test-bucket',
        'stripe.secretKey': 'sk_test_123',
        'razorpay.keyId': 'rzp_test_123',
      };
      return config[key] || defaultValue;
    }),
  },

  // Mock cache manager
  mockCacheManager: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    reset: jest.fn(),
  },

  // Mock event emitter
  mockEventEmitter: {
    emit: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    removeListener: jest.fn(),
  },

  // Mock queue
  mockQueue: {
    add: jest.fn(),
    process: jest.fn(),
    getJob: jest.fn(),
    getJobs: jest.fn(),
    clean: jest.fn(),
  },

  // Mock logger
  mockLogger: {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  },

  // Assert service method calls
  expectServiceMethodCalled: (service: any, method: string, times: number = 1) => {
    expect(service[method]).toHaveBeenCalledTimes(times);
  },

  // Assert repository method calls
  expectRepositoryMethodCalled: (repository: any, method: string, times: number = 1) => {
    expect(repository[method]).toHaveBeenCalledTimes(times);
  },

  // Mock HTTP response
  mockResponse: () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
  }),

  // Mock HTTP request
  mockRequest: (overrides: any = {}) => ({
    body: {},
    query: {},
    params: {},
    headers: {},
    user: global.testUtils.createMockUser(),
    ip: '127.0.0.1',
    method: 'GET',
    url: '/test',
    ...overrides,
  }),
};

// Unit test specific setup
beforeEach(() => {
  // Reset all mocks before each unit test
  jest.resetAllMocks();
});

// Declare global types
declare global {
  var unitTestUtils: any;
}
