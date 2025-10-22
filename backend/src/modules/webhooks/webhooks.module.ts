import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { HttpModule } from '@nestjs/axios';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Entities
import { WebhookEndpoint } from '../../database/entities/webhook-endpoint.entity';
import { WebhookDelivery } from '../../database/entities/webhook-delivery.entity';
import { ApiKey } from '../../database/entities/api-key.entity';
import { ApiKeyUsage } from '../../database/entities/api-key-usage.entity';
import { Integration } from '../../database/entities/integration.entity';

// Services
import { WebhookService } from './services/webhook.service';
import { ApiKeyService } from './services/api-key.service';
import { IntegrationService } from './services/integration.service';

// Controllers
import { WebhookController } from './controllers/webhook.controller';
import { ApiKeyController } from './controllers/api-key.controller';
import { IntegrationController } from './controllers/integration.controller';

// Processors
import { WebhookProcessor } from './processors/webhook.processor';

// Guards and Middleware
import { ApiKeyAuthGuard } from './guards/api-key-auth.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { WebhookSignatureGuard } from './guards/webhook-signature.guard';

// Interceptors
import { ApiKeyUsageInterceptor } from './interceptors/api-key-usage.interceptor';
import { RateLimitInterceptor } from './interceptors/rate-limit.interceptor';

@Module({
  imports: [
    // TypeORM entities
    TypeOrmModule.forFeature([
      WebhookEndpoint,
      WebhookDelivery,
      ApiKey,
      ApiKeyUsage,
      Integration,
    ]),

    // Bull queues for webhook processing
    BullModule.registerQueue({
      name: 'webhook-delivery',
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 1, // Retries handled by service
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }),

    // HTTP module for external API calls
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),

    // Event emitter for webhook events
    EventEmitterModule,
  ],

  controllers: [
    WebhookController,
    ApiKeyController,
    IntegrationController,
  ],

  providers: [
    // Core services
    WebhookService,
    ApiKeyService,
    IntegrationService,

    // Queue processors
    WebhookProcessor,

    // Guards
    ApiKeyAuthGuard,
    RateLimitGuard,
    WebhookSignatureGuard,

    // Interceptors
    ApiKeyUsageInterceptor,
    RateLimitInterceptor,
  ],

  exports: [
    // Export services for use in other modules
    WebhookService,
    ApiKeyService,
    IntegrationService,

    // Export guards for use in other modules
    ApiKeyAuthGuard,
    RateLimitGuard,

    // Export interceptors for use in other modules
    ApiKeyUsageInterceptor,
    RateLimitInterceptor,
  ],
})
export class WebhooksModule {
  constructor() {
    console.log('🔗 WebhooksModule initialized');
    console.log('📡 Webhook delivery queue configured');
    console.log('🔑 API key management enabled');
    console.log('🔌 Third-party integrations ready');
  }
}
