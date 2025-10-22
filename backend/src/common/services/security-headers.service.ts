import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';

export interface SecurityHeadersConfig {
  // Content Security Policy
  csp: {
    enabled: boolean;
    directives: Record<string, string[]>;
    reportUri?: string;
    reportOnly?: boolean;
  };
  
  // HTTP Strict Transport Security
  hsts: {
    enabled: boolean;
    maxAge: number;
    includeSubDomains: boolean;
    preload: boolean;
  };
  
  // X-Frame-Options
  frameOptions: {
    enabled: boolean;
    policy: 'DENY' | 'SAMEORIGIN' | string;
  };
  
  // X-Content-Type-Options
  contentTypeOptions: {
    enabled: boolean;
    noSniff: boolean;
  };
  
  // Referrer Policy
  referrerPolicy: {
    enabled: boolean;
    policy: string;
  };
  
  // Permissions Policy (Feature Policy)
  permissionsPolicy: {
    enabled: boolean;
    directives: Record<string, string[]>;
  };
  
  // Cross-Origin Policies
  crossOrigin: {
    embedderPolicy: boolean;
    openerPolicy: string;
    resourcePolicy: string;
  };
  
  // Custom headers
  customHeaders: Record<string, string>;
}

/**
 * Security Headers Service
 * Manages comprehensive security headers for the application
 */
@Injectable()
export class SecurityHeadersService {
  private readonly logger = new Logger(SecurityHeadersService.name);
  
  private readonly defaultConfig: SecurityHeadersConfig = {
    csp: {
      enabled: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.jsdelivr.net'],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
        'img-src': ["'self'", 'data:', 'https:', 'blob:'],
        'media-src': ["'self'", 'https:'],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'frame-ancestors': ["'none'"],
        'upgrade-insecure-requests': [],
        'block-all-mixed-content': [],
      },
      reportUri: '/api/security/csp-report',
      reportOnly: false,
    },
    
    hsts: {
      enabled: true,
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    
    frameOptions: {
      enabled: true,
      policy: 'DENY',
    },
    
    contentTypeOptions: {
      enabled: true,
      noSniff: true,
    },
    
    referrerPolicy: {
      enabled: true,
      policy: 'strict-origin-when-cross-origin',
    },
    
    permissionsPolicy: {
      enabled: true,
      directives: {
        'accelerometer': ["'none'"],
        'ambient-light-sensor': ["'none'"],
        'autoplay': ["'self'"],
        'battery': ["'none'"],
        'camera': ["'none'"],
        'display-capture': ["'none'"],
        'document-domain': ["'none'"],
        'encrypted-media': ["'self'"],
        'execution-while-not-rendered': ["'none'"],
        'execution-while-out-of-viewport': ["'none'"],
        'fullscreen': ["'self'"],
        'geolocation': ["'none'"],
        'gyroscope': ["'none'"],
        'layout-animations': ["'self'"],
        'legacy-image-formats': ["'self'"],
        'magnetometer': ["'none'"],
        'microphone': ["'none'"],
        'midi': ["'none'"],
        'navigation-override': ["'none'"],
        'payment': ["'self'"],
        'picture-in-picture': ["'none'"],
        'publickey-credentials-get': ["'self'"],
        'sync-xhr': ["'none'"],
        'usb': ["'none'"],
        'vr': ["'none'"],
        'wake-lock': ["'none'"],
        'xr-spatial-tracking': ["'none'"],
      },
    },
    
    crossOrigin: {
      embedderPolicy: false, // Disabled for compatibility
      openerPolicy: 'same-origin',
      resourcePolicy: 'cross-origin',
    },
    
    customHeaders: {
      'X-Powered-By': '', // Remove X-Powered-By header
      'Server': '', // Remove Server header
      'X-DNS-Prefetch-Control': 'off',
      'X-Download-Options': 'noopen',
      'X-Permitted-Cross-Domain-Policies': 'none',
      'X-Request-ID': '', // Will be set dynamically
    },
  };

  constructor(private readonly configService: ConfigService) {}

  /**
   * Get security headers configuration
   */
  getSecurityConfig(): SecurityHeadersConfig {
    const environment = this.configService.get<string>('NODE_ENV', 'development');
    const isProduction = environment === 'production';
    
    // Adjust configuration based on environment
    const config = { ...this.defaultConfig };
    
    if (!isProduction) {
      // Development-specific adjustments
      config.csp.directives['script-src'].push("'unsafe-eval'");
      config.csp.reportOnly = true;
      config.hsts.enabled = false; // Don't enforce HSTS in development
    }
    
    // Override with environment-specific settings
    if (this.configService.get<boolean>('SECURITY_CSP_REPORT_ONLY')) {
      config.csp.reportOnly = true;
    }
    
    if (this.configService.get<string>('SECURITY_CSP_REPORT_URI')) {
      config.csp.reportUri = this.configService.get<string>('SECURITY_CSP_REPORT_URI');
    }
    
    if (this.configService.get<number>('SECURITY_HSTS_MAX_AGE')) {
      config.hsts.maxAge = this.configService.get<number>('SECURITY_HSTS_MAX_AGE');
    }
    
    return config;
  }

  /**
   * Create security headers middleware
   */
  createSecurityHeadersMiddleware() {
    const config = this.getSecurityConfig();
    
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        // Generate unique request ID
        const requestId = this.generateRequestId();
        req['requestId'] = requestId;
        
        // Set Content Security Policy
        if (config.csp.enabled) {
          this.setCSPHeader(res, config.csp, requestId);
        }
        
        // Set HSTS header (only for HTTPS)
        if (config.hsts.enabled && (req.secure || req.get('X-Forwarded-Proto') === 'https')) {
          this.setHSTSHeader(res, config.hsts);
        }
        
        // Set X-Frame-Options
        if (config.frameOptions.enabled) {
          res.setHeader('X-Frame-Options', config.frameOptions.policy);
        }
        
        // Set X-Content-Type-Options
        if (config.contentTypeOptions.enabled && config.contentTypeOptions.noSniff) {
          res.setHeader('X-Content-Type-Options', 'nosniff');
        }
        
        // Set Referrer Policy
        if (config.referrerPolicy.enabled) {
          res.setHeader('Referrer-Policy', config.referrerPolicy.policy);
        }
        
        // Set Permissions Policy
        if (config.permissionsPolicy.enabled) {
          this.setPermissionsPolicyHeader(res, config.permissionsPolicy);
        }
        
        // Set Cross-Origin headers
        this.setCrossOriginHeaders(res, config.crossOrigin);
        
        // Set custom headers
        this.setCustomHeaders(res, config.customHeaders, requestId);
        
        // Security-related response modifications
        this.setSecurityResponseHeaders(res);
        
        next();
      } catch (error) {
        this.logger.error('Error setting security headers', error);
        next(); // Continue even if header setting fails
      }
    };
  }

  /**
   * Create HTTPS enforcement middleware
   */
  createHTTPSEnforcementMiddleware() {
    const enforceHTTPS = this.configService.get<boolean>('ENFORCE_HTTPS', true);
    const environment = this.configService.get<string>('NODE_ENV', 'development');
    
    if (!enforceHTTPS || environment === 'development') {
      return (req: Request, res: Response, next: NextFunction) => next();
    }
    
    return (req: Request, res: Response, next: NextFunction) => {
      // Check if request is already HTTPS
      const isHTTPS = req.secure || 
                     req.get('X-Forwarded-Proto') === 'https' ||
                     req.get('X-Forwarded-Ssl') === 'on' ||
                     req.get('X-Url-Scheme') === 'https';
      
      if (!isHTTPS) {
        const httpsUrl = `https://${req.get('Host')}${req.originalUrl}`;
        
        // Log the redirect for monitoring
        this.logger.warn(`Redirecting HTTP to HTTPS: ${req.originalUrl}`, {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          originalUrl: req.originalUrl,
        });
        
        return res.redirect(301, httpsUrl);
      }
      
      next();
    };
  }

  /**
   * Create CSP violation reporting endpoint handler
   */
  createCSPReportHandler() {
    return (req: Request, res: Response) => {
      try {
        const report = req.body;
        
        this.logger.warn('CSP Violation Report', {
          report,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString(),
        });
        
        // In production, you might want to store this in a database
        // or send to a monitoring service
        
        res.status(204).send();
      } catch (error) {
        this.logger.error('Error processing CSP report', error);
        res.status(400).json({ error: 'Invalid CSP report' });
      }
    };
  }

  /**
   * Validate security headers configuration
   */
  validateConfiguration(): { isValid: boolean; errors: string[] } {
    const config = this.getSecurityConfig();
    const errors: string[] = [];
    
    // Validate CSP directives
    if (config.csp.enabled) {
      if (!config.csp.directives['default-src']) {
        errors.push('CSP default-src directive is required');
      }
      
      // Check for unsafe directives in production
      const environment = this.configService.get<string>('NODE_ENV');
      if (environment === 'production') {
        const unsafeDirectives = ['script-src', 'style-src', 'object-src'];
        for (const directive of unsafeDirectives) {
          const values = config.csp.directives[directive] || [];
          if (values.includes("'unsafe-inline'") || values.includes("'unsafe-eval'")) {
            errors.push(`Unsafe CSP directive detected in production: ${directive}`);
          }
        }
      }
    }
    
    // Validate HSTS configuration
    if (config.hsts.enabled) {
      if (config.hsts.maxAge < 300) {
        errors.push('HSTS max-age should be at least 300 seconds');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Private helper methods

  private setCSPHeader(res: Response, csp: SecurityHeadersConfig['csp'], requestId: string): void {
    const directives = Object.entries(csp.directives)
      .map(([key, values]) => {
        if (values.length === 0) {
          return key;
        }
        return `${key} ${values.join(' ')}`;
      })
      .join('; ');
    
    let cspHeader = directives;
    
    // Add report-uri if specified
    if (csp.reportUri) {
      cspHeader += `; report-uri ${csp.reportUri}`;
    }
    
    // Add nonce for request ID
    cspHeader += `; report-to csp-endpoint`;
    
    const headerName = csp.reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';
    res.setHeader(headerName, cspHeader);
    
    // Set Report-To header for CSP reporting
    res.setHeader('Report-To', JSON.stringify({
      group: 'csp-endpoint',
      max_age: 10886400,
      endpoints: [{ url: csp.reportUri }],
    }));
  }

  private setHSTSHeader(res: Response, hsts: SecurityHeadersConfig['hsts']): void {
    let hstsValue = `max-age=${hsts.maxAge}`;
    
    if (hsts.includeSubDomains) {
      hstsValue += '; includeSubDomains';
    }
    
    if (hsts.preload) {
      hstsValue += '; preload';
    }
    
    res.setHeader('Strict-Transport-Security', hstsValue);
  }

  private setPermissionsPolicyHeader(res: Response, policy: SecurityHeadersConfig['permissionsPolicy']): void {
    const directives = Object.entries(policy.directives)
      .map(([feature, allowlist]) => {
        if (allowlist.length === 0) {
          return `${feature}=()`;
        }
        return `${feature}=(${allowlist.join(' ')})`;
      })
      .join(', ');
    
    res.setHeader('Permissions-Policy', directives);
  }

  private setCrossOriginHeaders(res: Response, crossOrigin: SecurityHeadersConfig['crossOrigin']): void {
    if (crossOrigin.embedderPolicy) {
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    }
    
    if (crossOrigin.openerPolicy) {
      res.setHeader('Cross-Origin-Opener-Policy', crossOrigin.openerPolicy);
    }
    
    if (crossOrigin.resourcePolicy) {
      res.setHeader('Cross-Origin-Resource-Policy', crossOrigin.resourcePolicy);
    }
  }

  private setCustomHeaders(res: Response, customHeaders: Record<string, string>, requestId: string): void {
    for (const [header, value] of Object.entries(customHeaders)) {
      if (header === 'X-Request-ID') {
        res.setHeader(header, requestId);
      } else if (value === '') {
        // Remove header by setting it to empty
        res.removeHeader(header);
      } else {
        res.setHeader(header, value);
      }
    }
  }

  private setSecurityResponseHeaders(res: Response): void {
    // Prevent caching of sensitive responses
    const originalJson = res.json;
    res.json = function(body: any) {
      // Add cache control for API responses
      if (!res.getHeader('Cache-Control')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
      }
      
      return originalJson.call(this, body);
    };
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get security headers status for monitoring
   */
  getSecurityHeadersStatus(): {
    config: SecurityHeadersConfig;
    validation: { isValid: boolean; errors: string[] };
    environment: string;
    httpsEnforced: boolean;
  } {
    const config = this.getSecurityConfig();
    const validation = this.validateConfiguration();
    const environment = this.configService.get<string>('NODE_ENV', 'development');
    const httpsEnforced = this.configService.get<boolean>('ENFORCE_HTTPS', true) && environment === 'production';
    
    return {
      config,
      validation,
      environment,
      httpsEnforced,
    };
  }
}
