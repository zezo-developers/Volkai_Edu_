import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiKey } from '../../../database/entities/api-key.entity';

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    // Check if API key is present
    const apiKey: ApiKey = request.apiKey;
    const rateLimitInfo = request.rateLimitInfo;
    
    if (apiKey && rateLimitInfo) {
      // Set rate limit headers
      response.setHeader('X-RateLimit-Limit', rateLimitInfo.limit);
      response.setHeader('X-RateLimit-Remaining', rateLimitInfo.remaining);
      response.setHeader('X-RateLimit-Reset', Math.ceil(rateLimitInfo.resetTime.getTime() / 1000));
      
      // Add API key info headers (without exposing sensitive data)
      response.setHeader('X-API-Key-ID', apiKey.id);
      response.setHeader('X-API-Key-Name', apiKey.name);
      response.setHeader('X-API-Key-Type', apiKey.type);
      
      // Add usage info if available
      if (apiKey.metadata) {
        const dailyUsage = apiKey.dailyUsage;
        const monthlyUsage = apiKey.monthlyUsage;
        
        if (apiKey.config.dailyLimit) {
          response.setHeader('X-Daily-Limit', apiKey.config.dailyLimit);
          response.setHeader('X-Daily-Usage', dailyUsage);
          response.setHeader('X-Daily-Remaining', Math.max(0, apiKey.config.dailyLimit - dailyUsage));
        }
        
        if (apiKey.config.monthlyLimit) {
          response.setHeader('X-Monthly-Limit', apiKey.config.monthlyLimit);
          response.setHeader('X-Monthly-Usage', monthlyUsage);
          response.setHeader('X-Monthly-Remaining', Math.max(0, apiKey.config.monthlyLimit - monthlyUsage));
        }
      }
    }

    return next.handle().pipe(
      tap({
        next: () => {
          // Additional processing after successful request
          if (apiKey) {
            // Could add success-specific headers or logging here
          }
        },
        error: (error) => {
          // Additional processing after failed request
          if (apiKey) {
            // Could add error-specific headers or logging here
            if (error.status === 429) {
              // Rate limit exceeded
              response.setHeader('X-RateLimit-Exceeded', 'true');
            }
          }
        },
      })
    );
  }
}
