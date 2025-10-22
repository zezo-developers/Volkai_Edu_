import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  constructor(private configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const isDevelopment = this.configService.get<string>('NODE_ENV') === 'development';
    const domain = this.configService.get<string>('DOMAIN') || 'localhost';
    
    // Prevent clickjacking attacks
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Enable XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Strict Transport Security (HTTPS only)
    if (!isDevelopment) {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );
    }
    
    // Content Security Policy
    const csp = this.buildContentSecurityPolicy(isDevelopment, domain);
    res.setHeader('Content-Security-Policy', csp);
    
    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Permissions Policy (formerly Feature Policy)
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
    );
    
    // Cross-Origin policies
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    
    // Remove server information
    res.removeHeader('X-Powered-By');
    res.setHeader('Server', 'Volkai-API');
    
    // Cache control for sensitive endpoints
    if (this.isSensitiveEndpoint(req.path)) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    
    // HSTS preload for production
    if (!isDevelopment) {
      res.setHeader('Expect-CT', 'max-age=86400, enforce');
    }
    
    next();
  }

  private buildContentSecurityPolicy(isDevelopment: boolean, domain: string): string {
    const policies = [];
    
    if (isDevelopment) {
      // More relaxed CSP for development
      policies.push("default-src 'self' 'unsafe-inline' 'unsafe-eval'");
      policies.push("script-src 'self' 'unsafe-inline' 'unsafe-eval' localhost:* ws: wss:");
      policies.push("style-src 'self' 'unsafe-inline'");
      policies.push("img-src 'self' data: blob: https:");
      policies.push("connect-src 'self' localhost:* ws: wss: https:");
      policies.push("font-src 'self' data:");
      policies.push("media-src 'self' blob:");
      policies.push("object-src 'none'");
      policies.push("base-uri 'self'");
      policies.push("form-action 'self'");
    } else {
      // Strict CSP for production
      policies.push("default-src 'self'");
      policies.push("script-src 'self' 'sha256-[hash]'"); // Add specific hashes for inline scripts
      policies.push("style-src 'self' 'unsafe-inline'"); // Allow inline styles for UI frameworks
      policies.push("img-src 'self' data: https:");
      policies.push(`connect-src 'self' https://*.${domain} wss://*.${domain}`);
      policies.push("font-src 'self' data:");
      policies.push("media-src 'self'");
      policies.push("object-src 'none'");
      policies.push("base-uri 'self'");
      policies.push("form-action 'self'");
      policies.push("frame-ancestors 'none'");
      policies.push("upgrade-insecure-requests");
    }
    
    return policies.join('; ');
  }

  private isSensitiveEndpoint(path: string): boolean {
    const sensitivePatterns = [
      '/auth/',
      '/admin/',
      '/api-keys/',
      '/billing/',
      '/users/profile',
      '/organizations/',
    ];
    
    return sensitivePatterns.some(pattern => path.includes(pattern));
  }
}
