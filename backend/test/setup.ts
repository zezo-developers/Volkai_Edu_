import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import * as dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Global test configuration
global.testConfig = {
  database: {
    type: 'postgres',
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT) || 5433,
    username: process.env.TEST_DB_USERNAME || 'test_user',
    password: process.env.TEST_DB_PASSWORD || 'test_password',
    database: process.env.TEST_DB_DATABASE || 'volkai_test',
    synchronize: true,
    dropSchema: true,
    logging: false,
  },
  redis: {
    host: process.env.TEST_REDIS_HOST || 'localhost',
    port: parseInt(process.env.TEST_REDIS_PORT) || 6380,
    db: parseInt(process.env.TEST_REDIS_DB) || 1,
  },
};

// Mock external services
jest.mock('aws-sdk', () => ({
  S3: jest.fn(() => ({
    upload: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Location: 'https://test-bucket.s3.amazonaws.com/test-file.jpg',
        Key: 'test-file.jpg',
      }),
    }),
    deleteObject: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({}),
    }),
    getSignedUrl: jest.fn().mockReturnValue('https://test-presigned-url.com'),
  })),
}));

jest.mock('stripe', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    customers: {
      create: jest.fn().mockResolvedValue({ id: 'cus_test123' }),
      retrieve: jest.fn().mockResolvedValue({ id: 'cus_test123' }),
      update: jest.fn().mockResolvedValue({ id: 'cus_test123' }),
    },
    subscriptions: {
      create: jest.fn().mockResolvedValue({ id: 'sub_test123', status: 'active' }),
      retrieve: jest.fn().mockResolvedValue({ id: 'sub_test123', status: 'active' }),
      update: jest.fn().mockResolvedValue({ id: 'sub_test123', status: 'active' }),
      cancel: jest.fn().mockResolvedValue({ id: 'sub_test123', status: 'canceled' }),
    },
    invoices: {
      create: jest.fn().mockResolvedValue({ id: 'in_test123' }),
      pay: jest.fn().mockResolvedValue({ id: 'in_test123', status: 'paid' }),
    },
    paymentMethods: {
      create: jest.fn().mockResolvedValue({ id: 'pm_test123' }),
      attach: jest.fn().mockResolvedValue({ id: 'pm_test123' }),
    },
  })),
}));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({
      messageId: 'test-message-id',
      accepted: ['test@example.com'],
      rejected: [],
    }),
  })),
}));

// Global test utilities
global.testUtils = {
  // Create test module with common dependencies
  createTestModule: async (moduleClass: any, providers: any[] = []) => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot(global.testConfig.database as any),
        CacheModule.register({
          store: 'memory',
          ttl: 300,
        }),
      ],
      providers: [...providers],
    }).compile();

    return module;
  },

  // Create mock user
  createMockUser: (overrides: any = {}) => ({
    id: 'user-test-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'user',
    status: 'active',
    isEmailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  // Create mock organization
  createMockOrganization: (overrides: any = {}) => ({
    id: 'org-test-id',
    name: 'Test Organization',
    slug: 'test-org',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  // Create mock course
  createMockCourse: (overrides: any = {}) => ({
    id: 'course-test-id',
    title: 'Test Course',
    description: 'Test course description',
    status: 'published',
    isPublished: true,
    category: 'technology',
    difficultyLevel: 'beginner',
    organizationId: 'org-test-id',
    createdBy: 'user-test-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  // Create mock JWT token
  createMockJwtToken: (payload: any = {}) => {
    const defaultPayload = {
      sub: 'user-test-id',
      email: 'test@example.com',
      role: 'user',
      organizationId: 'org-test-id',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      ...payload,
    };
    
    // Simple mock token (in real tests, use proper JWT library)
    return `mock.jwt.token.${Buffer.from(JSON.stringify(defaultPayload)).toString('base64')}`;
  },

  // Wait for async operations
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Generate random test data
  randomString: (length: number = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  randomEmail: () => `test-${global.testUtils.randomString(8)}@example.com`,

  randomNumber: (min: number = 1, max: number = 100) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
};

// Global test hooks
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  // Increase timeout for database operations
  jest.setTimeout(30000);
});

afterAll(async () => {
  // Clean up any global resources
});

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Clean up after each test
});

// Custom matchers
expect.extend({
  toBeValidUUID(received) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = typeof received === 'string' && uuidRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  },

  toBeValidEmail(received) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = typeof received === 'string' && emailRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid email`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid email`,
        pass: false,
      };
    }
  },

  toBeWithinRange(received, min, max) {
    const pass = received >= min && received <= max;
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${min}-${max}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${min}-${max}`,
        pass: false,
      };
    }
  },
});

// Declare global types for TypeScript
declare global {
  var testConfig: any;
  var testUtils: any;
  
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeValidEmail(): R;
      toBeWithinRange(min: number, max: number): R;
    }
  }
}
