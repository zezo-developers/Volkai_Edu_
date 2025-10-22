import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SecurityHeadersService } from './security-headers.service';
import { Request, Response } from 'express';

describe('SecurityHeadersService', () => {
  let service: SecurityHeadersService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityHeadersService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SecurityHeadersService>(SecurityHeadersService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSecurityConfig', () => {
    it('should return default configuration', () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'NODE_ENV') return 'production';
        return defaultValue;
      });

      const config = service.getSecurityConfig();

      expect(config.csp.enabled).toBe(true);
      expect(config.hsts.enabled).toBe(true);
      expect(config.frameOptions.enabled).toBe(true);
      expect(config.contentTypeOptions.enabled).toBe(true);
      expect(config.referrerPolicy.enabled).toBe(true);
      expect(config.permissionsPolicy.enabled).toBe(true);
    });

    it('should adjust configuration for development environment', () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'NODE_ENV') return 'development';
        return defaultValue;
      });

      const config = service.getSecurityConfig();

      expect(config.csp.reportOnly).toBe(true);
      expect(config.hsts.enabled).toBe(false);
      expect(config.csp.directives['script-src']).toContain("'unsafe-eval'");
    });

    it('should override with environment variables', () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'SECURITY_CSP_REPORT_ONLY') return true;
        if (key === 'SECURITY_HSTS_MAX_AGE') return 86400;
        return defaultValue;
      });

      const config = service.getSecurityConfig();

      expect(config.csp.reportOnly).toBe(true);
      expect(config.hsts.maxAge).toBe(86400);
    });
  });

  describe('createSecurityHeadersMiddleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: jest.Mock;

    beforeEach(() => {
      mockRequest = {
        secure: true,
        get: jest.fn(),
        ip: '127.0.0.1',
      };

      mockResponse = {
        setHeader: jest.fn(),
        removeHeader: jest.fn(),
        json: jest.fn(),
      };

      nextFunction = jest.fn();

      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'NODE_ENV') return 'production';
        return defaultValue;
      });
    });

    it('should set all security headers', () => {
      const middleware = service.createSecurityHeadersMiddleware();
      
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Security-Policy',
        expect.stringContaining("default-src 'self'")
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        expect.stringContaining('max-age=31536000')
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Referrer-Policy',
        'strict-origin-when-cross-origin'
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Permissions-Policy',
        expect.stringContaining("accelerometer=('none')")
      );
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should not set HSTS for non-HTTPS requests', () => {
      mockRequest.secure = false;
      (mockRequest.get as jest.Mock).mockReturnValue(null);

      const middleware = service.createSecurityHeadersMiddleware();
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.setHeader).not.toHaveBeenCalledWith(
        'Strict-Transport-Security',
        expect.anything()
      );
    });

    it('should set HSTS for X-Forwarded-Proto HTTPS', () => {
      mockRequest.secure = false;
      (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'X-Forwarded-Proto') return 'https';
        return null;
      });

      const middleware = service.createSecurityHeadersMiddleware();
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        expect.stringContaining('max-age=31536000')
      );
    });

    it('should handle middleware errors gracefully', () => {
      (mockResponse.setHeader as jest.Mock).mockImplementation(() => {
        throw new Error('Header setting failed');
      });

      const middleware = service.createSecurityHeadersMiddleware();
      
      expect(() => {
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      }).not.toThrow();
      
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should generate unique request IDs', () => {
      const middleware = service.createSecurityHeadersMiddleware();
      
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      const firstRequestId = mockRequest['requestId'];
      
      // Reset mocks
      jest.clearAllMocks();
      mockRequest = { secure: true, get: jest.fn(), ip: '127.0.0.1' };
      
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      const secondRequestId = mockRequest['requestId'];
      
      expect(firstRequestId).toBeDefined();
      expect(secondRequestId).toBeDefined();
      expect(firstRequestId).not.toBe(secondRequestId);
    });
  });

  describe('createHTTPSEnforcementMiddleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: jest.Mock;

    beforeEach(() => {
      mockRequest = {
        secure: false,
        get: jest.fn(),
        originalUrl: '/test',
        ip: '127.0.0.1',
      };

      mockResponse = {
        redirect: jest.fn(),
      };

      nextFunction = jest.fn();
    });

    it('should redirect HTTP to HTTPS in production', () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'ENFORCE_HTTPS') return true;
        if (key === 'NODE_ENV') return 'production';
        return defaultValue;
      });

      (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'Host') return 'example.com';
        return null;
      });

      const middleware = service.createHTTPSEnforcementMiddleware();
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.redirect).toHaveBeenCalledWith(301, 'https://example.com/test');
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should not redirect HTTPS requests', () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'ENFORCE_HTTPS') return true;
        if (key === 'NODE_ENV') return 'production';
        return defaultValue;
      });

      mockRequest.secure = true;

      const middleware = service.createHTTPSEnforcementMiddleware();
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.redirect).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should not redirect in development', () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'ENFORCE_HTTPS') return true;
        if (key === 'NODE_ENV') return 'development';
        return defaultValue;
      });

      const middleware = service.createHTTPSEnforcementMiddleware();
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.redirect).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should detect HTTPS from X-Forwarded-Proto', () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'ENFORCE_HTTPS') return true;
        if (key === 'NODE_ENV') return 'production';
        return defaultValue;
      });

      (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'X-Forwarded-Proto') return 'https';
        return null;
      });

      const middleware = service.createHTTPSEnforcementMiddleware();
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.redirect).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('createCSPReportHandler', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;

    beforeEach(() => {
      mockRequest = {
        body: {
          'csp-report': {
            'document-uri': 'https://example.com/test',
            'violated-directive': 'script-src',
            'blocked-uri': 'https://evil.com/script.js',
          },
        },
        ip: '127.0.0.1',
        get: jest.fn(() => 'Mozilla/5.0'),
      };

      mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        json: jest.fn(),
      };
    });

    it('should handle valid CSP reports', () => {
      const handler = service.createCSPReportHandler();
      handler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it('should handle invalid CSP reports', () => {
      mockRequest.body = null;

      const handler = service.createCSPReportHandler();
      handler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid CSP report' });
    });
  });

  describe('validateConfiguration', () => {
    it('should validate correct configuration', () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'NODE_ENV') return 'production';
        return defaultValue;
      });

      const validation = service.validateConfiguration();

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect unsafe CSP directives in production', () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'NODE_ENV') return 'production';
        return defaultValue;
      });

      // Mock a service that would return unsafe directives
      jest.spyOn(service, 'getSecurityConfig').mockReturnValue({
        csp: {
          enabled: true,
          directives: {
            'default-src': ["'self'"],
            'script-src': ["'self'", "'unsafe-eval'"],
          },
          reportOnly: false,
        },
        hsts: { enabled: true, maxAge: 31536000, includeSubDomains: true, preload: true },
        frameOptions: { enabled: true, policy: 'DENY' },
        contentTypeOptions: { enabled: true, noSniff: true },
        referrerPolicy: { enabled: true, policy: 'strict-origin-when-cross-origin' },
        permissionsPolicy: { enabled: true, directives: {} },
        crossOrigin: { embedderPolicy: false, openerPolicy: 'same-origin', resourcePolicy: 'cross-origin' },
        customHeaders: {},
      } as any);

      const validation = service.validateConfiguration();

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        expect.stringContaining('Unsafe CSP directive detected in production')
      );
    });

    it('should detect short HSTS max-age', () => {
      jest.spyOn(service, 'getSecurityConfig').mockReturnValue({
        csp: { enabled: true, directives: { 'default-src': ["'self'"] }, reportOnly: false },
        hsts: { enabled: true, maxAge: 100, includeSubDomains: true, preload: true },
        frameOptions: { enabled: true, policy: 'DENY' },
        contentTypeOptions: { enabled: true, noSniff: true },
        referrerPolicy: { enabled: true, policy: 'strict-origin-when-cross-origin' },
        permissionsPolicy: { enabled: true, directives: {} },
        crossOrigin: { embedderPolicy: false, openerPolicy: 'same-origin', resourcePolicy: 'cross-origin' },
        customHeaders: {},
      } as any);

      const validation = service.validateConfiguration();

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('HSTS max-age should be at least 300 seconds');
    });
  });

  describe('getSecurityHeadersStatus', () => {
    it('should return comprehensive status', () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'ENFORCE_HTTPS') return true;
        return defaultValue;
      });

      const status = service.getSecurityHeadersStatus();

      expect(status).toHaveProperty('config');
      expect(status).toHaveProperty('validation');
      expect(status).toHaveProperty('environment', 'production');
      expect(status).toHaveProperty('httpsEnforced', true);
      expect(status.validation).toHaveProperty('isValid');
      expect(status.validation).toHaveProperty('errors');
    });

    it('should indicate HTTPS not enforced in development', () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'NODE_ENV') return 'development';
        if (key === 'ENFORCE_HTTPS') return true;
        return defaultValue;
      });

      const status = service.getSecurityHeadersStatus();

      expect(status.environment).toBe('development');
      expect(status.httpsEnforced).toBe(false);
    });
  });

  describe('integration tests', () => {
    it('should work end-to-end with all middleware', () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'ENFORCE_HTTPS') return true;
        return defaultValue;
      });

      const mockRequest = {
        secure: false,
        get: jest.fn((header: string) => {
          if (header === 'Host') return 'example.com';
          if (header === 'X-Forwarded-Proto') return 'http';
          return null;
        }),
        originalUrl: '/api/test',
        ip: '127.0.0.1',
      };

      const mockResponse = {
        redirect: jest.fn(),
        setHeader: jest.fn(),
        removeHeader: jest.fn(),
        json: jest.fn(),
      };

      const nextFunction = jest.fn();

      // Test HTTPS enforcement
      const httpsMiddleware = service.createHTTPSEnforcementMiddleware();
      httpsMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.redirect).toHaveBeenCalledWith(301, 'https://example.com/api/test');
    });

    it('should handle HTTPS request with all security headers', () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'NODE_ENV') return 'production';
        return defaultValue;
      });

      const mockRequest = {
        secure: true,
        get: jest.fn(),
        ip: '127.0.0.1',
      };

      const mockResponse = {
        setHeader: jest.fn(),
        removeHeader: jest.fn(),
        json: jest.fn(),
      };

      const nextFunction = jest.fn();

      // Test security headers
      const securityMiddleware = service.createSecurityHeadersMiddleware();
      securityMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Verify all major security headers are set
      const setHeaderCalls = (mockResponse.setHeader as jest.Mock).mock.calls;
      const headerNames = setHeaderCalls.map(call => call[0]);

      expect(headerNames).toContain('Content-Security-Policy');
      expect(headerNames).toContain('Strict-Transport-Security');
      expect(headerNames).toContain('X-Frame-Options');
      expect(headerNames).toContain('X-Content-Type-Options');
      expect(headerNames).toContain('Referrer-Policy');
      expect(headerNames).toContain('Permissions-Policy');
      expect(headerNames).toContain('X-Request-ID');

      expect(nextFunction).toHaveBeenCalled();
    });
  });
});
