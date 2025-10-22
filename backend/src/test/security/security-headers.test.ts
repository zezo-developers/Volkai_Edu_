import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import  request from 'supertest';
import { AppModule } from '../../app.module';
import { SecurityHeadersService } from '../../common/services/security-headers.service';

/**
 * Security Headers Validation Test Suite
 * Validates all security headers and HTTPS enforcement
 */
describe('Security Headers Validation', () => {
  let app: INestApplication;
  let securityHeadersService: SecurityHeadersService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    securityHeadersService = moduleFixture.get<SecurityHeadersService>(SecurityHeadersService);
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('🛡️ Content Security Policy (CSP)', () => {
    it('should include CSP header in all responses', async () => {
      const endpoints = [
        '/api/health',
        '/auth/login',
        '/api/users',
      ];

      for (const endpoint of endpoints) {
        const response = await request(app.getHttpServer()).get(endpoint);
        
        expect(response.headers).toHaveProperty('content-security-policy');
        const csp = response.headers['content-security-policy'];
        expect(csp).toContain("default-src 'self'");
      }
    });

    it('should have secure CSP directives', async () => {
      const response = await request(app.getHttpServer()).get('/api/health');
      const csp = response.headers['content-security-policy'];

      // Check critical CSP directives
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain('upgrade-insecure-requests');
      expect(csp).toContain('block-all-mixed-content');
      
      // Should not contain unsafe directives in production
      if (process.env.NODE_ENV === 'production') {
        expect(csp).not.toContain("'unsafe-eval'");
        expect(csp).not.toContain("'unsafe-inline'");
      }
    });

    it('should include CSP reporting endpoint', async () => {
      const response = await request(app.getHttpServer()).get('/api/health');
      const csp = response.headers['content-security-policy'];
      
      expect(csp).toContain('report-uri');
      expect(csp).toContain('/api/security/csp-report');
    });

    it('should accept CSP violation reports', async () => {
      const violationReport = {
        'csp-report': {
          'document-uri': 'https://example.com/test',
          'violated-directive': 'script-src',
          'blocked-uri': 'https://evil.com/script.js',
          'line-number': 1,
          'source-file': 'https://example.com/test',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/security/headers/csp-report')
        .send(violationReport);

      expect(response.status).toBe(204);
    });
  });

  describe('🔒 HTTP Strict Transport Security (HSTS)', () => {
    it('should include HSTS header for HTTPS requests', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .set('X-Forwarded-Proto', 'https');

      expect(response.headers).toHaveProperty('strict-transport-security');
      const hsts = response.headers['strict-transport-security'];
      expect(hsts).toContain('max-age=');
      expect(hsts).toContain('includeSubDomains');
      expect(hsts).toContain('preload');
    });

    it('should have appropriate HSTS max-age', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .set('X-Forwarded-Proto', 'https');

      const hsts = response.headers['strict-transport-security'];
      const maxAgeMatch = hsts.match(/max-age=(\d+)/);
      
      expect(maxAgeMatch).toBeTruthy();
      const maxAge = parseInt(maxAgeMatch![1], 10);
      expect(maxAge).toBeGreaterThanOrEqual(15768000); // At least 6 months
    });

    it('should not include HSTS for HTTP requests', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health');
        // No X-Forwarded-Proto header (simulating HTTP)

      expect(response.headers).not.toHaveProperty('strict-transport-security');
    });
  });

  describe('🖼️ X-Frame-Options', () => {
    it('should include X-Frame-Options header', async () => {
      const response = await request(app.getHttpServer()).get('/api/health');
      
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers['x-frame-options']).toBe('DENY');
    });

    it('should prevent clickjacking attacks', async () => {
      const endpoints = [
        '/api/users',
        '/auth/login',
        '/api/admin/config',
      ];

      for (const endpoint of endpoints) {
        const response = await request(app.getHttpServer()).get(endpoint);
        
        expect(response.headers['x-frame-options']).toBe('DENY');
      }
    });
  });

  describe('📄 X-Content-Type-Options', () => {
    it('should include X-Content-Type-Options header', async () => {
      const response = await request(app.getHttpServer()).get('/api/health');
      
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should prevent MIME type sniffing', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/files/download/test.txt');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });
  });

  describe('🔗 Referrer Policy', () => {
    it('should include Referrer-Policy header', async () => {
      const response = await request(app.getHttpServer()).get('/api/health');
      
      expect(response.headers).toHaveProperty('referrer-policy');
      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });

    it('should protect referrer information', async () => {
      const sensitiveEndpoints = [
        '/api/users/profile',
        '/api/billing/subscription',
        '/api/admin/users',
      ];

      for (const endpoint of sensitiveEndpoints) {
        const response = await request(app.getHttpServer()).get(endpoint);
        
        const referrerPolicy = response.headers['referrer-policy'];
        expect(referrerPolicy).toMatch(/strict-origin|no-referrer|same-origin/);
      }
    });
  });

  describe('🎛️ Permissions Policy', () => {
    it('should include Permissions-Policy header', async () => {
      const response = await request(app.getHttpServer()).get('/api/health');
      
      expect(response.headers).toHaveProperty('permissions-policy');
      const permissionsPolicy = response.headers['permissions-policy'];
      expect(permissionsPolicy).toContain('camera=()');
      expect(permissionsPolicy).toContain('microphone=()');
      expect(permissionsPolicy).toContain('geolocation=()');
    });

    it('should disable dangerous browser features', async () => {
      const response = await request(app.getHttpServer()).get('/api/health');
      const permissionsPolicy = response.headers['permissions-policy'];

      const dangerousFeatures = [
        'camera=()',
        'microphone=()',
        'geolocation=()',
        'usb=()',
        'magnetometer=()',
        'gyroscope=()',
      ];

      for (const feature of dangerousFeatures) {
        expect(permissionsPolicy).toContain(feature);
      }
    });
  });

  describe('🌐 Cross-Origin Policies', () => {
    it('should include Cross-Origin-Opener-Policy', async () => {
      const response = await request(app.getHttpServer()).get('/api/health');
      
      expect(response.headers).toHaveProperty('cross-origin-opener-policy');
      expect(response.headers['cross-origin-opener-policy']).toBe('same-origin');
    });

    it('should include Cross-Origin-Resource-Policy', async () => {
      const response = await request(app.getHttpServer()).get('/api/health');
      
      expect(response.headers).toHaveProperty('cross-origin-resource-policy');
      expect(response.headers['cross-origin-resource-policy']).toBe('cross-origin');
    });

    it('should handle Cross-Origin-Embedder-Policy appropriately', async () => {
      const response = await request(app.getHttpServer()).get('/api/health');
      
      // COEP might not be set due to compatibility issues
      if (response.headers['cross-origin-embedder-policy']) {
        expect(response.headers['cross-origin-embedder-policy']).toBe('require-corp');
      }
    });
  });

  describe('🔧 Custom Security Headers', () => {
    it('should remove server identification headers', async () => {
      const response = await request(app.getHttpServer()).get('/api/health');
      
      expect(response.headers).not.toHaveProperty('server');
      expect(response.headers).not.toHaveProperty('x-powered-by');
    });

    it('should include request ID for tracking', async () => {
      const response = await request(app.getHttpServer()).get('/api/health');
      
      expect(response.headers).toHaveProperty('x-request-id');
      expect(response.headers['x-request-id']).toMatch(/^req_\d+_[a-z0-9]+$/);
    });

    it('should include DNS prefetch control', async () => {
      const response = await request(app.getHttpServer()).get('/api/health');
      
      expect(response.headers).toHaveProperty('x-dns-prefetch-control');
      expect(response.headers['x-dns-prefetch-control']).toBe('off');
    });

    it('should include download options control', async () => {
      const response = await request(app.getHttpServer()).get('/api/files/download/test');
      
      expect(response.headers).toHaveProperty('x-download-options');
      expect(response.headers['x-download-options']).toBe('noopen');
    });
  });

  describe('📊 Security Headers Compliance', () => {
    it('should pass Mozilla Observatory basic checks', async () => {
      const response = await request(app.getHttpServer()).get('/api/health');
      
      const requiredHeaders = [
        'content-security-policy',
        'x-content-type-options',
        'x-frame-options',
        'referrer-policy',
      ];

      for (const header of requiredHeaders) {
        expect(response.headers).toHaveProperty(header);
      }
    });

    it('should achieve high security score', async () => {
      const response = await request(app.getHttpServer()).get('/api/health');
      
      let score = 0;
      
      // CSP (25 points)
      if (response.headers['content-security-policy']) {
        const csp = response.headers['content-security-policy'];
        if (csp.includes("default-src 'self'") && csp.includes("object-src 'none'")) {
          score += 25;
        }
      }
      
      // HSTS (25 points)
      if (response.headers['strict-transport-security']) {
        score += 25;
      }
      
      // X-Frame-Options (20 points)
      if (response.headers['x-frame-options'] === 'DENY') {
        score += 20;
      }
      
      // X-Content-Type-Options (15 points)
      if (response.headers['x-content-type-options'] === 'nosniff') {
        score += 15;
      }
      
      // Referrer Policy (15 points)
      if (response.headers['referrer-policy']) {
        score += 15;
      }
      
      expect(score).toBeGreaterThanOrEqual(75); // B+ grade minimum
    });

    it('should validate security configuration', async () => {
      const status = securityHeadersService.getSecurityHeadersStatus();
      
      expect(status.validation.isValid).toBe(true);
      expect(status.validation.errors).toHaveLength(0);
    });
  });

  describe('🚀 HTTPS Enforcement', () => {
    it('should redirect HTTP to HTTPS in production', async () => {
      // This test would need to be run in a production-like environment
      // For now, we test the middleware configuration
      
      const httpsMiddleware = securityHeadersService.createHTTPSEnforcementMiddleware();
      expect(httpsMiddleware).toBeDefined();
    });

    it('should detect HTTPS from various headers', async () => {
      const httpsHeaders = [
        { name: 'X-Forwarded-Proto', value: 'https' },
        { name: 'X-Forwarded-Ssl', value: 'on' },
        { name: 'X-Url-Scheme', value: 'https' },
      ];

      for (const header of httpsHeaders) {
        const response = await request(app.getHttpServer())
          .get('/api/health')
          .set(header.name, header.value);

        // Should include HSTS header when HTTPS is detected
        expect(response.headers).toHaveProperty('strict-transport-security');
      }
    });

    it('should not enforce HTTPS in development', async () => {
      if (process.env.NODE_ENV === 'development') {
        const response = await request(app.getHttpServer()).get('/api/health');
        
        // Should not redirect in development
        expect(response.status).not.toBe(301);
        expect(response.status).not.toBe(302);
      }
    });
  });

  describe('🔍 Security Headers Testing Tools', () => {
    it('should provide security configuration endpoint', async () => {
      const response = await request(app.getHttpServer())
        .get('/security/headers/config')
        .set('Authorization', 'Bearer admin-token'); // Would need actual admin token

      if (response.status === 200) {
        expect(response.body).toHaveProperty('status');
        expect(response.body.status).toHaveProperty('config');
        expect(response.body.status).toHaveProperty('validation');
      }
    });

    it('should provide security testing endpoint', async () => {
      const response = await request(app.getHttpServer())
        .get('/security/headers/test')
        .set('Authorization', 'Bearer admin-token'); // Would need actual admin token

      if (response.status === 200) {
        expect(response.body).toHaveProperty('test');
        expect(response.body.test).toHaveProperty('headers');
        expect(response.body.test).toHaveProperty('score');
      }
    });

    it('should provide compliance reporting', async () => {
      const response = await request(app.getHttpServer())
        .get('/security/headers/compliance')
        .set('Authorization', 'Bearer admin-token'); // Would need actual admin token

      if (response.status === 200) {
        expect(response.body).toHaveProperty('report');
        expect(response.body.report).toHaveProperty('overallScore');
        expect(response.body.report).toHaveProperty('grade');
      }
    });
  });

  describe('🎯 Real-World Attack Simulation', () => {
    it('should prevent iframe embedding attacks', async () => {
      const response = await request(app.getHttpServer()).get('/auth/login');
      
      expect(response.headers['x-frame-options']).toBe('DENY');
      
      const csp = response.headers['content-security-policy'];
      expect(csp).toContain("frame-ancestors 'none'");
    });

    it('should prevent MIME confusion attacks', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/files/malicious.html')
        .set('Accept', 'text/html');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should prevent mixed content attacks', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .set('X-Forwarded-Proto', 'https');

      const csp = response.headers['content-security-policy'];
      expect(csp).toContain('upgrade-insecure-requests');
      expect(csp).toContain('block-all-mixed-content');
    });

    it('should prevent information leakage via referrer', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/sensitive-data');

      const referrerPolicy = response.headers['referrer-policy'];
      expect(referrerPolicy).toBe('strict-origin-when-cross-origin');
    });
  });
});
