import { Module, Global } from '@nestjs/common';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RateLimitingService } from './services/rate-limiting.service';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { ErrorSanitizationService } from './services/error-sanitization.service';

@Global()
@Module({
  imports: [
    ConfigModule,
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        config: {
          host: configService.get('REDIS_HOST') || 'localhost',
          port: configService.get('REDIS_PORT') || 6379,
        },
      }),
    }),
  ],
  providers: [
    GlobalExceptionFilter,
    ResponseInterceptor,
    LoggingInterceptor,
    ErrorSanitizationService,
    RateLimitingService, // now Nest knows how to inject Redis
  ],
  exports: [
    GlobalExceptionFilter,
    ResponseInterceptor,
    LoggingInterceptor,
    RateLimitingService,
  ],
})
export class CommonModule {}
