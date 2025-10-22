import { Module, Global } from '@nestjs/common';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { LoggingInterceptor } from './interceptors/logging.interceptor';

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
  ],
  exports: [
    GlobalExceptionFilter,
    ResponseInterceptor,
    LoggingInterceptor,
  ],
})
export class CommonModule {}
