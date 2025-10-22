import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiKeyService } from '../services/api-key.service';
import { ApiKey } from '../../../database/entities/api-key.entity';
import { RequestMethod } from '../../../database/entities/api-key-usage.entity';

@Injectable()
export class ApiKeyUsageInterceptor implements NestInterceptor {
  constructor(private apiKeyService: ApiKeyService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    // Check if API key is present
    const apiKey: ApiKey = request.apiKey;
    if (!apiKey) {
      return next.handle();
    }

    const startTime = Date.now();
    const method = request.method as RequestMethod;
    const endpoint = this.getEndpointPath(request);
    const requestSize = this.getRequestSize(request);
    const ipAddress = request.ip;
    const userAgent = request.get('User-Agent');
    const referer = request.get('Referer');

    return next.handle().pipe(
      tap({
        next: (data) => {
          // Record successful usage
          this.recordUsage(
            apiKey,
            method,
            endpoint,
            response.statusCode || 200,
            Date.now() - startTime,
            requestSize,
            this.getResponseSize(data),
            ipAddress,
            userAgent,
            referer,
            { success: true }
          );
        },
        error: (error) => {
          // Record failed usage
          this.recordUsage(
            apiKey,
            method,
            endpoint,
            error.status || 500,
            Date.now() - startTime,
            requestSize,
            0,
            ipAddress,
            userAgent,
            referer,
            { 
              success: false, 
              error: error.message,
              errorType: error.constructor.name,
            }
          );
        },
      })
    );
  }

  private async recordUsage(
    apiKey: ApiKey,
    method: RequestMethod,
    endpoint: string,
    statusCode: number,
    responseTime: number,
    requestSize?: number,
    responseSize?: number,
    ipAddress?: string,
    userAgent?: string,
    referer?: string,
    metadata?: any
  ): Promise<void> {
    try {
      await this.apiKeyService.recordUsage(
        apiKey,
        method,
        endpoint,
        statusCode,
        responseTime,
        requestSize,
        responseSize,
        ipAddress,
        userAgent,
        referer,
        metadata
      );
    } catch (error) {
      // Log error but don't throw to avoid affecting the main request
      console.error('Failed to record API key usage:', error);
    }
  }

  private getEndpointPath(request: any): string {
    // Get the route pattern instead of the full URL with parameters
    const route = request.route?.path || request.url;
    
    // Remove query parameters
    const pathWithoutQuery = route.split('?')[0];
    
    // Normalize path (remove trailing slashes, etc.)
    return pathWithoutQuery.replace(/\/+$/, '') || '/';
  }

  private getRequestSize(request: any): number | undefined {
    try {
      if (request.get('Content-Length')) {
        return parseInt(request.get('Content-Length'), 10);
      }
      
      if (request.body) {
        return Buffer.byteLength(JSON.stringify(request.body), 'utf8');
      }
      
      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  private getResponseSize(data: any): number | undefined {
    try {
      if (data) {
        return Buffer.byteLength(JSON.stringify(data), 'utf8');
      }
      
      return undefined;
    } catch (error) {
      return undefined;
    }
  }
}
