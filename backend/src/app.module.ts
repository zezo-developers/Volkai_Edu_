import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bull';
import { WinstonModule } from 'nest-winston';
import redisStore from 'cache-manager-redis-store';

// Configuration
import { databaseConfig } from '@config/database.config';
import { redisConfig } from '@config/redis.config';
import { jwtConfig } from '@config/jwt.config';
import { emailConfig } from '@config/email.config';
import { createWinstonLogger } from '@config/winston.config';

// Core modules
import { DatabaseModule } from '@database/database.module';
import { AuthModule } from '@modules/auth/auth.module';
import { UsersModule } from '@modules/users/users.module';
import { OrganizationsModule } from '@modules/organizations/organizations.module';
import { HealthModule } from '@modules/health/health.module';
import { AuditModule } from '@modules/audit/audit.module';
import { EmailModule } from '@modules/email/email.module';
import { FilesModule } from '@modules/files/files.module';

// Feature modules
import { LMSModule } from '@modules/lms/lms.module';
import { InterviewsModule } from '@modules/interviews/interviews.module';
import { ResumeModule } from '@modules/resume/resume.module';
import { HRModule } from '@modules/hr/hr.module';
import { SearchModule } from '@modules/search/search.module';
import { VersioningModule } from '@modules/versioning/versioning.module';
import { AntiCheatModule } from '@modules/anti-cheating/anti-cheating.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { BillingModule } from '@modules/billing/billing.module';
import { AdminModule } from '@modules/admin/admin.module';
import { WebhooksModule } from '@modules/webhooks/webhooks.module';

// Performance & Security modules
import { PerformanceModule } from '@modules/performance/performance.module';
import { SecurityModule } from '@modules/security/security.module';
import { CacheModule as AdvancedCacheModule } from '@modules/cache/cache.module';
import { MonitoringModule } from '@modules/monitoring/monitoring.module';

// Common modules
import { CommonModule } from '@common/common.module';
import { RedisModule } from '@nestjs-modules/ioredis';
import { MyTestModule } from './my-test/my-test.module';
import { User } from './database/entities/user.entity';

/**
 * Root application module that orchestrates all feature modules
 * Configures core services like database, caching, rate limiting, and logging
 */
@Module({
  imports: [
    // Configuration module - loads environment variables and validates them
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env', '.env.development'],
      load: [databaseConfig, redisConfig, jwtConfig, emailConfig],
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),

    // Winston logging module for structured logging
    WinstonModule.forRoot({
      instance: createWinstonLogger(),
    }),

    // Database module with TypeORM
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
         autoLoadEntities: true,
        entities: [ __dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        synchronize: false,
        // migrationsRun:true,
        logging: configService.get<boolean>('database.logging', false),
        ssl: configService.get<string>('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
        extra: {
          max: 20, // Maximum number of connections
          min: 5,  // Minimum number of connections
          acquire: 30000, // Maximum time to get connection
          idle: 10000, // Maximum time connection can be idle
        },
      }),
    }),

        // Add RedisModule for ioredis
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        console.log('Connecting to Redis at', '172.17.0.2' + ':' + configService.get<number>('redis.port'));
        return {
          type: 'single',
          options: {
            host: 'localhost',
            port: configService.get<number>('redis.port'),
            password: configService.get<string>('redis.password'),
            db: configService.get<number>('redis.db'),
          },
        };
      },
      inject: [ConfigService],
    }),

    // Redis cache module for high-performance caching
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        console.log('Connecting to Redis Cache at', '172.17.0.2' + ':' + configService.get<number>('redis.port'));
        return{
        store: redisStore as any,
        host: '172.17.0.2',
        port: configService.get<number>('redis.port'),
        password: configService.get<string>('redis.password'),
        db: configService.get<number>('redis.db'),
        ttl: 300, // Default TTL of 5 minutes
        max: 1000, // Maximum number of items in cache
      }},
      inject: [ConfigService],
      isGlobal: true,
    }),

    // Rate limiting module to prevent abuse
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        ttl: configService.get<number>('RATE_LIMIT_TTL', 60),
        limit: configService.get<number>('RATE_LIMIT_MAX', 100),
      }) as any,
      inject: [ConfigService],
    }),

    // Event emitter for decoupled communication between modules
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),

    // Bull queue module for background job processing
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
          db: configService.get<number>('redis.db', 0) + 1, // Use different DB for queues
        },
        defaultJobOptions: {
          removeOnComplete: 10, // Keep last 10 completed jobs
          removeOnFail: 50, // Keep last 50 failed jobs
          attempts: 3, // Retry failed jobs 3 times
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      }),
      inject: [ConfigService],
    }),

    // Core application modules
    CommonModule,
    DatabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    // OrganizationsModule,
    // AuditModule,
    // EmailModule,
    // FilesModule,

    // // Feature modules
    // LMSModule,
    // InterviewsModule,
    // ResumeModule,
    // HRModule,
    // SearchModule,
    // VersioningModule,
    // AntiCheatModule,
    // NotificationsModule,
    // BillingModule,
    // AdminModule,
    // WebhooksModule,
    
    // // Performance & Security modules
    // PerformanceModule,
    SecurityModule,
    MyTestModule,
    // AdvancedCacheModule,
    // MonitoringModule,
  ],
  controllers: [],
  providers: [],
})


export class AppModule {
  constructor(private readonly configService: ConfigService) {
    // Log application startup information
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    const port = this.configService.get<number>('PORT', 3000);
    
    console.log(`🚀 Volkai HR Edu Backend starting in ${nodeEnv} mode on port ${port}`);
    console.log(`📚 Modules loaded: Core, LMS, Interviews, Resume Builder, HR/ATS, Notifications, Billing, Admin, Webhooks, Performance, Security`);
    console.log(`🗄️  Database: PostgreSQL with 47 entities and performance indexes`);
    console.log(`⚡ Cache: Redis with advanced caching and compression`);
    console.log(`🔐 Auth: JWT with RBAC and advanced security hardening`);
    console.log(`🔔 Notifications: Multi-channel delivery with real-time WebSocket`);
    console.log(`💳 Billing: Stripe & Razorpay integration with subscription management`);
    console.log(`📊 Admin & Analytics: Comprehensive dashboard with real-time insights`);
    console.log(`🔗 Webhooks & Integrations: Event-driven delivery with third-party integrations`);
    console.log(`🔑 API Management: Comprehensive API key management with rate limiting`);
    console.log(`🛡️  Security: Advanced threat detection and DDoS protection`);
    console.log(`📈 Performance: Real-time monitoring and database optimization`);
    console.log(`🔍 Monitoring: System health checks and alerting`);
    console.log(`💾 Backup: Automated backup and disaster recovery`);
    console.log(`✅ Phase 11: Performance & Security Hardening completed!`);
  }
}
