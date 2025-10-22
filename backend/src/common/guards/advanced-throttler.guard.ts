import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, response, Response } from 'express';
import { RateLimitingService, RateLimitResult } from '../services/rate-limiting.service';

export interface ThrottlerOptions {
  category: string;
  windowMs?: number;
  maxRequests?: number;
  blockDurationMs?: number;
  skipIf?: (req: Request) => boolean;
  keyGenerator?: (req: Request) => string;
  onLimitReached?: (req: Request, res: Response) => void;
}

/**
 * Decorator to set throttling options for endpoints
 */
export const Throttle = (options: ThrottlerOptions) => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (propertyKey && descriptor) {
      // Method decorator
      Reflect.defineMetadata('throttle-options', options, descriptor.value);
    } else {
      // Class decorator
      Reflect.defineMetadata('throttle-options', options, target);
    }
  };
};

/**
 * Decorator to skip throttling for specific endpoints
 */
export const SkipThrottle = () => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (propertyKey && descriptor) {
      Reflect.defineMetadata('skip-throttle', true, descriptor.value);
    } else {
      Reflect.defineMetadata('skip-throttle', true, target);
    }
  };
};

/**
 * Advanced Throttler Guard
 * Provides sophisticated rate limiting with attack detection
 */
@Injectable()
export class AdvancedThrottlerGuard implements CanActivate {
    logger = new Logger(AdvancedThrottlerGuard.name);

  constructor(
    private readonly rateLimitingService: RateLimitingService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Check if throttling should be skipped
    const skipThrottle = this.reflector.getAllAndOverride<boolean>('skip-throttle', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipThrottle) {
      return true;
    }

    // Get throttling options
    const options = this.getThrottleOptions(context);
    if (!options) {
      // No throttling configured, allow request
      return true;
    }

    // Check if request should be skipped based on custom logic
    if (options.skipIf && options.skipIf(request)) {
      return true;
    }

    try {
      // Check if IP/user is already blocked
      const isBlocked = await this.rateLimitingService.isBlocked(request, options.category);
      if (isBlocked) {
        this.setRateLimitHeaders(response, {
          allowed: false,
          totalHits: 0,
          remainingPoints: 0,
          resetTime: new Date(Date.now() + (options.blockDurationMs || 300000)),
          retryAfter: Math.ceil((options.blockDurationMs || 300000) / 1000),
        });

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Too many requests. You are temporarily blocked.',
            error: 'Too Many Requests',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Detect attack patterns
      const attackPatterns = await this.rateLimitingService.detectAttackPatterns(request);
      
      // Handle detected attacks
      for (const pattern of attackPatterns) {
        await this.handleAttackPattern(request, pattern, options);
      }

      // Check rate limit
      const rateLimitResult = await this.rateLimitingService.checkRateLimit(
        request,
        options.category,
        {
          windowMs: options.windowMs,
          maxRequests: options.maxRequests,
          blockDurationMs: options.blockDurationMs,
          keyGenerator: options.keyGenerator,
        },
      );

      // Set rate limit headers
      this.setRateLimitHeaders(response, rateLimitResult);

      if (!rateLimitResult.allowed) {
        // Call custom handler if provided
        if (options.onLimitReached) {
          options.onLimitReached(request, response);
        }

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Too many requests. Please try again later.',
            error: 'Too Many Requests',
            retryAfter: rateLimitResult.retryAfter,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('Rate limiting error', error);
      // Fail open - allow request if rate limiting service fails
      return true;
    }
  }

  public getThrottleOptions(context: ExecutionContext): ThrottlerOptions | null {
    // Try to get method-level options first
    const methodOptions = this.reflector.get<ThrottlerOptions>(
      'throttle-options',
      context.getHandler(),
    );

    if (methodOptions) {
      return methodOptions;
    }

    // Fall back to class-level options
    const classOptions = this.reflector.get<ThrottlerOptions>(
      'throttle-options',
      context.getClass(),
    );

    if (classOptions) {
      return classOptions;
    }

    // Default options based on route path
    return this.getDefaultOptionsForRoute(context);
  }

  private getDefaultOptionsForRoute(context: ExecutionContext): ThrottlerOptions | null {
    const request = context.switchToHttp().getRequest<Request>();
    const path = request.route?.path || request.path;
    const method = request.method.toLowerCase();

    // Authentication routes
    if (path.includes('/auth/login')) {
      return { category: 'auth:login' };
    }
    if (path.includes('/auth/register')) {
      return { category: 'auth:register' };
    }
    if (path.includes('/auth/password')) {
      return { category: 'auth:password-reset' };
    }
    if (path.includes('/auth/verify')) {
      return { category: 'auth:verify-email' };
    }

    // Admin routes
    if (path.includes('/admin/config')) {
      return { category: 'admin:config' };
    }
    if (path.includes('/admin/users')) {
      return { category: 'admin:users' };
    }

    // Billing routes
    if (path.includes('/billing/payment')) {
      return { category: 'billing:payment' };
    }

    // Upload routes
    if (path.includes('/upload') || method === 'post' && path.includes('/files')) {
      return { category: 'api:upload' };
    }

    // Search routes
    if (path.includes('/search')) {
      return { category: 'api:search' };
    }

    // Health check routes
    if (path.includes('/health')) {
      return { category: 'public:health' };
    }

    // Default API rate limiting
    if (path.startsWith('/api/')) {
      return { category: 'api:general' };
    }

    return null; // No rate limiting for unmatched routes
  }

  private setRateLimitHeaders(response: Response, result: RateLimitResult): void {
    response.setHeader('X-RateLimit-Limit', result.totalHits + result.remainingPoints);
    response.setHeader('X-RateLimit-Remaining', Math.max(0, result.remainingPoints));
    response.setHeader('X-RateLimit-Reset', result.resetTime.getTime());
    
    if (result.retryAfter) {
      response.setHeader('Retry-After', result.retryAfter);
    }
  }

  private async handleAttackPattern(
    request: Request,
    pattern: any,
    options: ThrottlerOptions,
  ): Promise<void> {
    this.logger.warn(`Attack pattern detected: ${pattern.type}`, {
      ip: this.getClientIp(request),
      severity: pattern.severity,
      confidence: pattern.confidence,
      indicators: pattern.indicators,
    });

    // Take action based on pattern severity and recommendation
    switch (pattern.recommendedAction) {
      case 'block':
        if (pattern.severity === 'critical' || pattern.severity === 'high') {
          const blockDuration = this.getBlockDurationForSeverity(pattern.severity);
          await this.rateLimitingService.blockKey(
            request,
            options.category,
            blockDuration,
            `Automatic block due to ${pattern.type} attack pattern`,
          );
        }
        break;

      case 'throttle':
        // Reduce rate limits for this IP
        // This would be implemented by modifying the rate limit config
        break;

      case 'captcha':
        // In a full implementation, you'd set a flag to require CAPTCHA
        response.setHeader('X-Require-Captcha', 'true');
        break;

      case 'monitor':
        // Just log and monitor - no immediate action
        break;
    }
  }

  private getBlockDurationForSeverity(severity: string): number {
    switch (severity) {
      case 'critical':
        return 24 * 60 * 60 * 1000; // 24 hours
      case 'high':
        return 2 * 60 * 60 * 1000; // 2 hours
      case 'medium':
        return 30 * 60 * 1000; // 30 minutes
      case 'low':
        return 5 * 60 * 1000; // 5 minutes
      default:
        return 15 * 60 * 1000; // 15 minutes
    }
  }

  private getClientIp(request: Request): string {
    return (
      request.get('CF-Connecting-IP') ||
      request.get('X-Forwarded-For')?.split(',')[0] ||
      request.get('X-Real-IP') ||
      request.connection.remoteAddress ||
      '127.0.0.1'
    );
  }
}

/**
 * Adaptive Throttler Guard
 * Adjusts rate limits based on system load and user behavior
 */
@Injectable()
export class AdaptiveThrottlerGuard extends AdvancedThrottlerGuard {
   logger = new Logger(AdaptiveThrottlerGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    
    // Get current system load (in a real implementation, this would come from monitoring)
    const systemLoad = await this.getCurrentSystemLoad();
    
    // Adjust rate limits based on system load
    if (systemLoad > 80) {
      // System under high load - be more restrictive
      const options = this.getThrottleOptions(context);
      if (options) {
        // Reduce limits by 50%
        options.maxRequests = Math.max(1, Math.floor((options.maxRequests || 100) * 0.5));
        options.blockDurationMs = (options.blockDurationMs || 300000) * 2;
      }
    }

    return super.canActivate(context);
  }

  private async getCurrentSystemLoad(): Promise<number> {
    // In a real implementation, this would get actual system metrics
    // For now, return a mock value
    return Math.random() * 100;
  }
}

/**
 * User-based Throttler Guard
 * Provides different rate limits for different user types
 */
@Injectable()
export class UserBasedThrottlerGuard extends AdvancedThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;

    // Adjust rate limits based on user type
    const options = this.getThrottleOptions(context);
    if (options && user) {
      const multiplier = this.getRateLimitMultiplierForUser(user);
      options.maxRequests = Math.floor((options.maxRequests || 100) * multiplier);
    }

    return super.canActivate(context);
  }

  private getRateLimitMultiplierForUser(user: any): number {
    // Premium users get higher limits
    if (user.subscriptionTier === 'premium') {
      return 5.0;
    }
    
    // Pro users get moderate increase
    if (user.subscriptionTier === 'pro') {
      return 2.0;
    }
    
    // Admin users get very high limits
    if (user.role === 'admin' || user.role === 'super_admin') {
      return 10.0;
    }
    
    // Regular users get standard limits
    return 1.0;
  }
}
