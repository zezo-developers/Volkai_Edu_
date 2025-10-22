import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeyService } from '../services/api-key.service';
import { ApiScope } from '../../../database/entities/api-key.entity';

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private apiKeyService: ApiKeyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Extract API key from header
    const apiKey = this.extractApiKey(request);
    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    // Validate API key
    const validationResult = await this.apiKeyService.validateApiKey(
      apiKey,
      request.ip,
      request.get('User-Agent'),
      request.get('Referer')
    );

    if (!validationResult.isValid) {
      throw new UnauthorizedException(validationResult.error || 'Invalid API key');
    }

    // Check required scopes
    const requiredScopes = this.reflector.get<ApiScope[]>('api-scopes', context.getHandler()) || [];
    if (requiredScopes.length > 0) {
      const hasRequiredScope = requiredScopes.some(scope => 
        validationResult.apiKey.hasScope(scope)
      );

      if (!hasRequiredScope) {
        throw new UnauthorizedException('Insufficient API key permissions');
      }
    }

    // Attach API key to request for later use
    request.apiKey = validationResult.apiKey;
    request.rateLimitInfo = validationResult.rateLimitInfo;

    return true;
  }

  private extractApiKey(request: any): string | null {
    // Check Authorization header (Bearer token)
    const authHeader = request.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check X-API-Key header
    const apiKeyHeader = request.get('X-API-Key');
    if (apiKeyHeader) {
      return apiKeyHeader;
    }

    // Check query parameter (less secure, but sometimes needed)
    if (request.query && request.query.api_key) {
      return request.query.api_key;
    }

    return null;
  }
}
