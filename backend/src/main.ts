import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { SecurityHeadersService } from './common/services/security-headers.service';
import { WinstonModule } from 'nest-winston';
import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger.config';
import { ValidationSanitizationPipe } from './common/pipes/sanitization.pipe';
import { GlobalExceptionFilter } from '@common/filters/global-exception.filter';
import { ResponseInterceptor } from '@common/interceptors/response.interceptor';
import { LoggingInterceptor } from '@common/interceptors/logging.interceptor';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { createWinstonLogger } from '@config/winston.config';
import 'reflect-metadata';

console.log("Hello")
/**
 * Bootstrap function to initialize and start the NestJS application
 * Sets up all middleware, validation, documentation, and security features
 */
async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  console.log('Bootstrap');

  try {
    // Create Winston logger instance
    const winstonLogger = createWinstonLogger();

    // Create NestJS application with Winston logger
    const app = await NestFactory.create(AppModule, {
      
    });

    // Get configuration service
    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT', 3000);
    console.log('port: ', port);
    const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
    const nodeEnv = configService.get<string>('NODE_ENV', 'development');

    // Advanced security headers middleware
    const securityHeadersService = new SecurityHeadersService(configService);
    
    // HTTPS enforcement (production only)
    app.use(securityHeadersService.createHTTPSEnforcementMiddleware());
    
    // Comprehensive security headers
    app.use(securityHeadersService.createSecurityHeadersMiddleware());
    
    // Basic helmet as fallback (with minimal config to avoid conflicts)
    app.use(helmet({
      contentSecurityPolicy: false, // Handled by our service
      hsts: false, // Handled by our service
      crossOriginEmbedderPolicy: false,
    }));

    // Compression middleware
    app.use(compression());

    // CORS configuration
    app.enableCors({
      origin: configService.get<string>('CORS_ORIGIN', 'http://localhost:3001'),
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true,
    });

    // Global API prefix
    app.setGlobalPrefix(apiPrefix);

    // Global validation and sanitization pipes
    app.useGlobalPipes(
      new ValidationSanitizationPipe(), // First sanitize input
      new ValidationPipe({
        whitelist: true, // Remove unknown properties
        forbidNonWhitelisted: true, // Throw error for unknown properties
        transform: true, // Transform payloads to DTO instances
        transformOptions: {
          enableImplicitConversion: true, // Convert string to number/boolean automatically
        },
        validateCustomDecorators: true,
        stopAtFirstError: false, // Return all validation errors
      }),
    );

    // Global exception filter for consistent error handling
    app.useGlobalFilters(new GlobalExceptionFilter({} as any));

    // Global guards for authentication and authorization
    const reflector = app.get(Reflector);
    app.useGlobalGuards(new JwtAuthGuard(reflector));

    // Global interceptors
    app.useGlobalInterceptors(
      new LoggingInterceptor(), // Request/response logging
      new ResponseInterceptor(configService), // Standardize response format
    );

    // Swagger API documentation (only in development/staging)
    if (nodeEnv !== 'production') {
      setupSwagger(app);
      logger.log(`📚 API Documentation available at: http://localhost:${port}/api/docs`);
      logger.log(`📖 ReDoc Documentation available at: http://localhost:${port}/api/redoc`);
    }

    // Start the application
    await app.listen(port);

    logger.log(`🚀 Application is running on: http://localhost:${port}/${apiPrefix}`);
    logger.log(`🌍 Environment: ${nodeEnv}`);
    logger.log(`📊 Health check: http://localhost:${port}/${apiPrefix}/health`);

  } catch (error) {
    console.error('Error starting application:', error);
    logger.error('❌ Error starting application:', error);
    process.exit(1);
  }
}



// Handle unhandled promise rejections


process.on('unhandledRejection', (reason, promise) => {
  console.log('unhandledREjection')
  const logger = new Logger('UnhandledRejection');
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.log('uncaughtException')
  const logger = new Logger('UncaughtException');
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM')
  const logger = new Logger('SIGTERM');
  logger.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT')
  const logger = new Logger('SIGINT');
  logger.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

bootstrap();
