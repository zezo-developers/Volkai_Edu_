import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { DataSource } from 'typeorm';

// Integration test utilities
global.integrationTestUtils = {
  // Create integration test module with real database
  createIntegrationTestModule: async (
    modules: any[] = [],
    providers: any[] = [],
    controllers: any[] = []
  ): Promise<TestingModule> => {
    return Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          ...global.testConfig.database,
          entities: [__dirname + '/../src/**/*.entity{.ts,.js}'],
          synchronize: true,
          dropSchema: true,
        }),
        CacheModule.register({
          store: 'memory',
          ttl: 300,
        }),
        ...modules,
      ],
      controllers,
      providers,
    }).compile();
  },

  // Clean database between tests
  cleanDatabase: async (dataSource: DataSource) => {
    const entities = dataSource.entityMetadatas;
    
    // Disable foreign key checks
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 0;');
    
    // Clear all tables
    for (const entity of entities) {
      const repository = dataSource.getRepository(entity.name);
      await repository.clear();
    }
    
    // Re-enable foreign key checks
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 1;');
  },

  // Seed test data
  seedTestData: async (dataSource: DataSource) => {
    // Create test organization
    const orgRepository = dataSource.getRepository('Organization');
    const testOrg = await orgRepository.save({
      name: 'Test Organization',
      slug: 'test-org',
      status: 'active',
      settings: {},
      metadata: {},
    });

    // Create test user
    const userRepository = dataSource.getRepository('User');
    const testUser = await userRepository.save({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      password: '$2b$10$hashedpassword',
      role: 'user',
      status: 'active',
      isEmailVerified: true,
      organizationId: testOrg.id,
      profile: {},
      preferences: {},
      metadata: {},
    });

    // Create test course
    const courseRepository = dataSource.getRepository('Course');
    const testCourse = await courseRepository.save({
      title: 'Test Course',
      description: 'Test course description',
      status: 'published',
      isPublished: true,
      category: 'technology',
      difficultyLevel: 'beginner',
      organizationId: testOrg.id,
      createdBy: testUser.id,
      content: {},
      settings: {},
      metadata: {},
    });

    return {
      organization: testOrg,
      user: testUser,
      course: testCourse,
    };
  },

  // Create test HTTP request
  createTestRequest: (app: any, method: string, url: string) => {
    const request = require('supertest');
    return request(app)[method.toLowerCase()](url);
  },

  // Authenticate test request
  authenticateRequest: (request: any, token: string) => {
    return request.set('Authorization', `Bearer ${token}`);
  },

  // Wait for async operations
  waitForAsync: (ms: number = 100) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // Assert database state
  assertDatabaseState: async (dataSource: DataSource, entity: string, conditions: any) => {
    const repository = dataSource.getRepository(entity);
    const count = await repository.count({ where: conditions });
    return count;
  },

  // Create test JWT token for integration tests
  createTestJwtToken: (payload: any = {}) => {
    const jwt = require('jsonwebtoken');
    const defaultPayload = {
      sub: 'test-user-id',
      email: 'test@example.com',
      role: 'user',
      organizationId: 'test-org-id',
      ...payload,
    };
    
    return jwt.sign(defaultPayload, process.env.JWT_SECRET || 'test-secret', {
      expiresIn: '1h',
    });
  },
};

// Integration test hooks
let testDataSource: DataSource;

beforeAll(async () => {
  // Set up test database connection
  const { DataSource: TypeOrmDataSource } = require('typeorm');
  
  testDataSource = new TypeOrmDataSource({
    ...global.testConfig.database,
    entities: [__dirname + '/../src/**/*.entity{.ts,.js}'],
  });
  
  await testDataSource.initialize();
});

afterAll(async () => {
  // Clean up test database connection
  if (testDataSource && testDataSource.isInitialized) {
    await testDataSource.destroy();
  }
});

beforeEach(async () => {
  // Clean database before each test
  if (testDataSource && testDataSource.isInitialized) {
    await global.integrationTestUtils.cleanDatabase(testDataSource);
  }
});

// Declare global types
declare global {
  var integrationTestUtils: any;
}
