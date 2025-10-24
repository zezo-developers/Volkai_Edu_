import { Module, Global } from '@nestjs/common';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { ErrorSanitizationService } from './services/error-sanitization.service';
import { RateLimitingService } from './services/rate-limiting.service';

/**
 * Common module that provides shared utilities, filters, and interceptors
 * Made global so all modules can access these common functionalities
 */
@Global()
@Module({
  providers: [
    GlobalExceptionFilter,
    ResponseInterceptor,
    LoggingInterceptor,
    ErrorSanitizationService,
    RateLimitingService,
    ErrorSanitizationService,
  ],
  exports: [
    GlobalExceptionFilter,
    ResponseInterceptor,
    LoggingInterceptor,
    RateLimitingService,
    ErrorSanitizationService,
  ],
})
export class CommonModule {}
