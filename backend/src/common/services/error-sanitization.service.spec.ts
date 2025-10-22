import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ErrorSanitizationService } from './error-sanitization.service';

describe('ErrorSanitizationService', () => {
  let service: ErrorSanitizationService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ErrorSanitizationService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ErrorSanitizationService>(ErrorSanitizationService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sanitizeError', () => {
    const mockContext = {
      request: {
        method: 'GET',
        url: '/api/test',
        ip: '127.0.0.1',
      },
      timestamp: '2024-01-15T10:30:00Z',
    };

    it('should sanitize error messages in production', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        return undefined;
      });

      const result = service.sanitizeError(
        new Error('Database connection failed at /usr/local/app/database.js:123'),
        500,
        'Database connection failed at /usr/local/app/database.js:123',
        mockContext,
        'DB_003',
      );

      expect(result.message).toBe('Database operation failed');
      expect(result.stack).toBeUndefined();
      expect(result.originalMessage).toBeUndefined();
    });

    it('should preserve detailed information in development', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        return undefined;
      });

      const error = new Error('Detailed error message');
      const result = service.sanitizeError(
        error,
        500,
        'Detailed error message',
        mockContext,
        'SYS_001',
      );

      expect(result.stack).toBeDefined();
      expect(result.originalMessage).toBe('Detailed error message');
      expect(result.details).toBeDefined();
    });

    it('should use error code messages when available', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        return undefined;
      });

      const result = service.sanitizeError(
        new Error('Some technical error'),
        401,
        'Some technical error',
        mockContext,
        'AUTH_001',
      );

      expect(result.message).toBe('Authentication required');
      expect(result.errorCode).toBe('AUTH_001');
    });

    it('should sanitize error arrays', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        return undefined;
      });

      const errors = [
        'Password must contain /usr/local/secrets',
        'Database connection string: mongodb://user:pass@localhost',
      ];

      const result = service.sanitizeError(
        new Error('Validation failed'),
        400,
        'Validation failed',
        mockContext,
        'VAL_001',
        errors,
      );

      expect(result.errors).toBeDefined();
      expect(result.errors![0]).not.toContain('/usr/local/secrets');
      expect(result.errors![1]).not.toContain('mongodb://user:pass@localhost');
    });
  });

  describe('generateErrorCode', () => {
    it('should generate appropriate error codes for different status codes', () => {
      const testCases = [
        { status: 401, expected: 'AUTH_001' },
        { status: 403, expected: 'AUTH_003' },
        { status: 400, expected: 'VAL_001' },
        { status: 404, expected: 'DB_001' },
        { status: 409, expected: 'DB_002' },
        { status: 429, expected: 'BIZ_003' },
        { status: 500, expected: 'SYS_001' },
      ];

      testCases.forEach(({ status, expected }) => {
        const result = service.generateErrorCode(new Error('test'), status);
        expect(result).toBe(expected);
      });
    });

    it('should generate specific codes for database errors', () => {
      const dbError = new Error('database connection timeout');
      const result = service.generateErrorCode(dbError, 500);
      expect(result).toBe('DB_005');
    });

    it('should generate specific codes for external service errors', () => {
      const extError = new Error('external service unavailable');
      const result = service.generateErrorCode(extError, 500);
      expect(result).toBe('EXT_001');
    });
  });

  describe('logError', () => {
    const mockContext = {
      request: {
        method: 'GET',
        url: '/api/test',
        headers: { authorization: 'Bearer token123' },
        body: { password: 'secret123' },
        ip: '127.0.0.1',
      },
      user: {
        id: 'user-123',
        email: 'test@example.com',
        role: 'user',
      },
      timestamp: '2024-01-15T10:30:00Z',
    };

    const mockSanitizedError = {
      statusCode: 500,
      message: 'Internal server error',
      timestamp: '2024-01-15T10:30:00Z',
      path: '/api/test',
      method: 'GET',
    };

    it('should sanitize sensitive headers in logs', () => {
      const logSpy = jest.spyOn(service['logger'], 'error').mockImplementation();

      service.logError(new Error('test'), mockContext, mockSanitizedError);

      expect(logSpy).toHaveBeenCalled();
      const loggedContext = logSpy.mock.calls[0][1].context;
      expect(loggedContext.request.headers.authorization).toBe('[REDACTED]');
    });

    it('should sanitize sensitive body fields in logs', () => {
      const logSpy = jest.spyOn(service['logger'], 'error').mockImplementation();

      service.logError(new Error('test'), mockContext, mockSanitizedError);

      expect(logSpy).toHaveBeenCalled();
      const loggedContext = logSpy.mock.calls[0][1].context;
      expect(loggedContext.request.body.password).toBe('[REDACTED]');
    });

    it('should remove user email in production logs', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        return undefined;
      });

      const logSpy = jest.spyOn(service['logger'], 'error').mockImplementation();

      service.logError(new Error('test'), mockContext, mockSanitizedError);

      expect(logSpy).toHaveBeenCalled();
      const loggedContext = logSpy.mock.calls[0][1].context;
      expect(loggedContext.user.email).toBeUndefined();
      expect(loggedContext.user.id).toBe('user-123');
    });

    it('should use appropriate log levels', () => {
      const errorSpy = jest.spyOn(service['logger'], 'error').mockImplementation();
      const warnSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();
      const logSpy = jest.spyOn(service['logger'], 'log').mockImplementation();

      // Test 5xx error
      service.logError(new Error('test'), mockContext, { ...mockSanitizedError, statusCode: 500 });
      expect(errorSpy).toHaveBeenCalled();

      // Test 4xx error
      service.logError(new Error('test'), mockContext, { ...mockSanitizedError, statusCode: 400 });
      expect(warnSpy).toHaveBeenCalled();

      // Test 2xx success
      service.logError(new Error('test'), mockContext, { ...mockSanitizedError, statusCode: 200 });
      expect(logSpy).toHaveBeenCalled();
    });
  });

  describe('sensitive information removal', () => {
    it('should remove file paths from error messages', () => {
      const message = 'Error in file /usr/local/app/src/database/connection.ts at line 45';
      const result = service['removeSensitiveInfo'](message);
      expect(result).not.toContain('/usr/local/app/src/database/connection.ts');
      expect(result).toContain('[REDACTED]');
    });

    it('should remove database connection strings', () => {
      const message = 'Connection failed: mongodb://user:password@localhost:27017/database';
      const result = service['removeSensitiveInfo'](message);
      expect(result).not.toContain('mongodb://user:password@localhost:27017/database');
      expect(result).toContain('[REDACTED]');
    });

    it('should remove API keys and tokens', () => {
      const message = 'API key validation failed: api_key=abc123xyz token=def456uvw';
      const result = service['removeSensitiveInfo'](message);
      expect(result).not.toContain('abc123xyz');
      expect(result).not.toContain('def456uvw');
      expect(result).toContain('[REDACTED]');
    });

    it('should remove IP addresses', () => {
      const message = 'Connection from 192.168.1.100 failed';
      const result = service['removeSensitiveInfo'](message);
      expect(result).not.toContain('192.168.1.100');
      expect(result).toContain('[IP_REDACTED]');
    });

    it('should remove stack trace information', () => {
      const message = 'Error at Object.connect (/app/database.js:123:45)';
      const result = service['removeSensitiveInfo'](message);
      expect(result).not.toContain('(/app/database.js:123:45)');
    });
  });

  describe('technical message detection', () => {
    it('should detect technical error messages', () => {
      const technicalMessages = [
        'TypeError: Cannot read property of undefined',
        'ReferenceError: variable is not defined',
        'Cannot read property "length" of null',
        'async function failed with promise rejection',
        'ENOENT: no such file or directory',
      ];

      technicalMessages.forEach(message => {
        const isTechnical = service['isTechnicalMessage'](message);
        expect(isTechnical).toBe(true);
      });
    });

    it('should not flag user-friendly messages as technical', () => {
      const userFriendlyMessages = [
        'Invalid email address',
        'Password is too short',
        'User not found',
        'Access denied',
        'File upload failed',
      ];

      userFriendlyMessages.forEach(message => {
        const isTechnical = service['isTechnicalMessage'](message);
        expect(isTechnical).toBe(false);
      });
    });
  });

  describe('production message mapping', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        return undefined;
      });
    });

    it('should map database errors to user-friendly messages', () => {
      const dbErrors = [
        { input: 'duplicate key value violates unique constraint', expected: 'Resource already exists' },
        { input: 'violates foreign key constraint', expected: 'Referenced resource not found' },
        { input: 'violates not-null constraint', expected: 'Required field missing' },
        { input: 'connection terminated unexpectedly', expected: 'Database temporarily unavailable' },
      ];

      dbErrors.forEach(({ input, expected }) => {
        const result = service['sanitizeMessage'](input);
        expect(result).toBe(expected);
      });
    });

    it('should map authentication errors to user-friendly messages', () => {
      const authErrors = [
        { input: 'jwt expired', expected: 'Session expired' },
        { input: 'jwt malformed', expected: 'Invalid authentication token' },
        { input: 'invalid signature', expected: 'Invalid authentication token' },
        { input: 'no authorization token was found', expected: 'Authentication required' },
      ];

      authErrors.forEach(({ input, expected }) => {
        const result = service['sanitizeMessage'](input);
        expect(result).toBe(expected);
      });
    });

    it('should use generic message for unknown technical errors', () => {
      const technicalError = 'TypeError: Cannot read property "foo" of undefined at /app/src/service.js:123';
      const result = service['sanitizeMessage'](technicalError);
      expect(result).toBe('An error occurred while processing your request');
    });
  });

  describe('shouldReportError', () => {
    it('should report server errors (5xx)', () => {
      expect(service.shouldReportError(500, new Error('test'))).toBe(true);
      expect(service.shouldReportError(502, new Error('test'))).toBe(true);
      expect(service.shouldReportError(503, new Error('test'))).toBe(true);
    });

    it('should report authentication failures', () => {
      expect(service.shouldReportError(401, new Error('test'))).toBe(true);
      expect(service.shouldReportError(403, new Error('test'))).toBe(true);
    });

    it('should report rate limiting', () => {
      expect(service.shouldReportError(429, new Error('test'))).toBe(true);
    });

    it('should not report client errors (4xx except auth and rate limiting)', () => {
      expect(service.shouldReportError(400, new Error('test'))).toBe(false);
      expect(service.shouldReportError(404, new Error('test'))).toBe(false);
      expect(service.shouldReportError(422, new Error('test'))).toBe(false);
    });
  });

  describe('getErrorCodeMessage', () => {
    it('should return correct messages for error codes', () => {
      const testCases = [
        { code: 'AUTH_001', expected: 'Authentication required' },
        { code: 'VAL_001', expected: 'Invalid input data' },
        { code: 'DB_001', expected: 'Resource not found' },
        { code: 'SYS_001', expected: 'Internal server error' },
        { code: 'UNKNOWN_CODE', expected: 'An error occurred' },
      ];

      testCases.forEach(({ code, expected }) => {
        const result = service.getErrorCodeMessage(code);
        expect(result).toBe(expected);
      });
    });
  });

  describe('integration tests', () => {
    it('should handle complete error sanitization workflow', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        return undefined;
      });

      const error = new Error('Database connection failed at /usr/local/app/db.js:123 with password=secret123');
      const context = {
        request: {
          method: 'POST',
          url: '/api/users?token=abc123',
          headers: { authorization: 'Bearer token123' },
          body: { password: 'userpass', email: 'test@example.com' },
          ip: '192.168.1.100',
        },
        user: { id: 'user-123', email: 'user@example.com', role: 'user' },
        timestamp: '2024-01-15T10:30:00Z',
      };

      const result = service.sanitizeError(error, 500, error.message, context, 'DB_003');

      // Check sanitized response
      expect(result.message).toBe('Database operation failed');
      expect(result.errorCode).toBe('DB_003');
      expect(result.stack).toBeUndefined();
      expect(result.originalMessage).toBeUndefined();

      // Verify logging was called with sanitized context
      const logSpy = jest.spyOn(service['logger'], 'error').mockImplementation();
      service.logError(error, context, result);

      expect(logSpy).toHaveBeenCalled();
      const loggedData = logSpy.mock.calls[0][1];
      expect(loggedData.context.request.headers.authorization).toBe('[REDACTED]');
      expect(loggedData.context.request.body.password).toBe('[REDACTED]');
      expect(loggedData.context.user.email).toBeUndefined(); // Removed in production
    });
  });
});
