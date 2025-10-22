import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ApiKeyService } from '../services/api-key.service';
import { ApiKey } from '../../../database/entities/api-key.entity';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    // Check if API key is present (should be set by ApiKeyAuthGuard)
    const apiKey: ApiKey = request.apiKey;
    if (!apiKey) {
      // If no API key, skip rate limiting (handled by other guards)
      return true;
    }

    // Check rate limit
    const rateLimitStatus = await this.apiKeyService.checkRateLimit(apiKey);

    // Set rate limit headers
    response.setHeader('X-RateLimit-Limit', rateLimitStatus.limit);
    response.setHeader('X-RateLimit-Remaining', rateLimitStatus.remaining);
    response.setHeader('X-RateLimit-Reset', Math.ceil(rateLimitStatus.resetTime.getTime() / 1000));

    if (!rateLimitStatus.allowed) {
      // Record rate limit hit
      await this.apiKeyService.recordRateLimit(apiKey);

      // Set additional headers for rate limit exceeded
      response.setHeader('Retry-After', Math.ceil((rateLimitStatus.resetTime.getTime() - Date.now()) / 1000));

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Rate limit exceeded',
          error: 'Too Many Requests',
          rateLimitInfo: {
            limit: rateLimitStatus.limit,
            remaining: rateLimitStatus.remaining,
            resetTime: rateLimitStatus.resetTime,
          },
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    return true;
  }
}
