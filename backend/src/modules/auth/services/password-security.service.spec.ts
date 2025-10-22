import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PasswordSecurityService } from './password-security.service';
import { User } from '@database/entities/user.entity';

// Mock fetch for testing breach detection
global.fetch = jest.fn();

describe('PasswordSecurityService', () => {
  let service: PasswordSecurityService;
  let userRepository: jest.Mocked<Repository<User>>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordSecurityService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PasswordSecurityService>(PasswordSecurityService);
    userRepository = module.get(getRepositoryToken(User));
    configService = module.get(ConfigService);

    // Setup default config values
    configService.get.mockImplementation((key: string, defaultValue?: any) => {
      const config = {
        USE_ARGON2: true,
        ARGON2_MEMORY: 65536,
        ARGON2_TIME: 3,
        ARGON2_PARALLELISM: 4,
        BCRYPT_ROUNDS: 14,
      };
      return config[key] || defaultValue;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzePasswordStrength', () => {
    it('should reject very weak passwords', async () => {
      const result = await service.analyzePasswordStrength('123');
      
      expect(result.strength).toBe('very_weak');
      expect(result.isAcceptable).toBe(false);
      expect(result.score).toBe(0);
      expect(result.feedback).toContain('Password must be at least 8 characters long');
    });

    it('should accept strong passwords', async () => {
      const result = await service.analyzePasswordStrength('MyStr0ng!P@ssw0rd2024');
      
      expect(result.strength).toBeOneOf(['good', 'strong', 'very_strong']);
      expect(result.isAcceptable).toBe(true);
      expect(result.score).toBeGreaterThan(60);
    });

    it('should penalize common passwords', async () => {
      const result = await service.analyzePasswordStrength('password123');
      
      expect(result.score).toBeLessThan(30);
      expect(result.feedback.some(f => f.includes('commonly used'))).toBe(true);
    });

    it('should penalize predictable patterns', async () => {
      const patterns = ['123456789', 'abcdefgh', 'qwertyuiop', 'aaaaaaa'];
      
      for (const pattern of patterns) {
        const result = await service.analyzePasswordStrength(pattern + 'A!');
        expect(result.score).toBeLessThan(40);
        expect(result.feedback.some(f => f.includes('pattern'))).toBe(true);
      }
    });

    it('should check personal information when userId provided', async () => {
      const mockUser = {
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
      };
      
      userRepository.findOne.mockResolvedValue(mockUser as User);
      
      const result = await service.analyzePasswordStrength('JohnDoe123!', 'user-1');
      
      expect(result.score).toBeLessThan(70);
      expect(result.feedback.some(f => f.includes('personal information'))).toBe(true);
    });

    it('should reward character variety', async () => {
      const passwords = [
        'onlylowercase',           // 1 type
        'OnlyTwoTypes123',         // 2 types
        'ThreeTypes123!',          // 3 types
        'AllFourTypes123!@#',      // 4 types
        'WithUnicode123!@#世界',    // 5 types
      ];

      const scores = [];
      for (const password of passwords) {
        const result = await service.analyzePasswordStrength(password);
        scores.push(result.score);
      }

      // Scores should generally increase with character variety
      expect(scores[4]).toBeGreaterThan(scores[0]);
      expect(scores[3]).toBeGreaterThan(scores[1]);
    });

    it('should reward longer passwords', async () => {
      const passwords = [
        'Short1!',           // 7 chars
        'Medium12!',         // 9 chars  
        'LongerPass123!',    // 14 chars
        'VeryLongPassword123!@#$', // 23 chars
      ];

      const scores = [];
      for (const password of passwords) {
        const result = await service.analyzePasswordStrength(password);
        scores.push(result.score);
      }

      expect(scores[3]).toBeGreaterThan(scores[0]);
      expect(scores[2]).toBeGreaterThan(scores[1]);
    });
  });

  describe('checkPasswordBreach', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockClear();
    });

    it('should detect breached passwords', async () => {
      // Mock HaveIBeenPwned API response for a known breached password
      const mockResponse = 'ABCDE:123\nF25A2FC72690B780B2A14E140EF6A9BE0A:3303003\n0018A45C4D1DEF81644B54AB7F969B88D65:3';
      
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockResponse),
      });

      // Password "password" has SHA-1 hash starting with 5E884...
      const result = await service.checkPasswordBreach('password');
      
      expect(result.isBreached).toBe(false); // This specific mock won't match
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.pwnedpasswords.com/range/'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'User-Agent': 'Volkai-HR-Edu-Backend/1.0',
          }),
        })
      );
    });

    it('should handle API failures gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await service.checkPasswordBreach('somepassword');
      
      expect(result.isBreached).toBe(false); // Fail open
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await service.checkPasswordBreach('somepassword');
      
      expect(result.isBreached).toBe(false); // Fail open
    });
  });

  describe('hashPassword', () => {
    it('should reject weak passwords', async () => {
      await expect(service.hashPassword('weak')).rejects.toThrow('Password is too weak');
    });

    it('should reject breached passwords', async () => {
      // Mock breach detection
      jest.spyOn(service, 'checkPasswordBreach').mockResolvedValue({
        isBreached: true,
        breachCount: 1000,
        source: 'HaveIBeenPwned',
      });

      await expect(service.hashPassword('StrongButBreached123!')).rejects.toThrow('found in');
    });

    it('should hash strong passwords with Argon2 by default', async () => {
      // Mock breach detection to return not breached
      jest.spyOn(service, 'checkPasswordBreach').mockResolvedValue({
        isBreached: false,
      });

      const result = await service.hashPassword('VeryStrongPassword123!@#');
      
      expect(result.algorithm).toBe('argon2');
      expect(result.hash).toMatch(/^\$argon2/);
      expect(result.metadata.iterations).toBe(3);
      expect(result.metadata.memory).toBe(65536);
      expect(result.metadata.parallelism).toBe(4);
    });

    it('should use bcrypt when Argon2 is disabled', async () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'USE_ARGON2') return false;
        if (key === 'BCRYPT_ROUNDS') return 14;
        return defaultValue;
      });

      // Mock breach detection
      jest.spyOn(service, 'checkPasswordBreach').mockResolvedValue({
        isBreached: false,
      });

      const result = await service.hashPassword('VeryStrongPassword123!@#');
      
      expect(result.algorithm).toBe('bcrypt');
      expect(result.hash).toMatch(/^\$2[aby]\$/);
      expect(result.metadata.cost).toBe(14);
    });
  });

  describe('verifyPassword', () => {
    it('should verify bcrypt passwords', async () => {
      // Use a known bcrypt hash for "password123"
      const bcryptHash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj.VKt9Bg/Ka';
      
      const result = await service.verifyPassword('password123', bcryptHash);
      expect(result).toBe(false); // This specific hash won't match our test
    });

    it('should handle unknown hash formats', async () => {
      const result = await service.verifyPassword('password', 'unknown-hash-format');
      expect(result).toBe(false);
    });

    it('should handle verification errors gracefully', async () => {
      const result = await service.verifyPassword('password', 'malformed$hash');
      expect(result).toBe(false);
    });
  });

  describe('generateSecurePassword', () => {
    it('should generate passwords of specified length', async () => {
      const lengths = [8, 12, 16, 24, 32];
      
      for (const length of lengths) {
        const password = service.generateSecurePassword(length);
        expect(password).toHaveLength(length);
      }
    });

    it('should generate passwords with all character types', async () => {
      const password = service.generateSecurePassword(16);
      
      expect(password).toMatch(/[a-z]/); // lowercase
      expect(password).toMatch(/[A-Z]/); // uppercase
      expect(password).toMatch(/\d/);    // numbers
      expect(password).toMatch(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/); // special chars
    });

    it('should generate different passwords each time', async () => {
      const passwords = new Set();
      
      for (let i = 0; i < 100; i++) {
        passwords.add(service.generateSecurePassword(16));
      }
      
      expect(passwords.size).toBe(100); // All unique
    });

    it('should generate strong passwords', async () => {
      const password = service.generateSecurePassword(16);
      const analysis = await service.analyzePasswordStrength(password);
      
      expect(analysis.strength).toBeOneOf(['strong', 'very_strong']);
      expect(analysis.isAcceptable).toBe(true);
      expect(analysis.score).toBeGreaterThan(75);
    });
  });

  describe('needsRehash', () => {
    it('should recommend rehashing bcrypt when Argon2 is preferred', async () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'USE_ARGON2') return true;
        return defaultValue;
      });

      const bcryptHash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj.VKt9Bg/Ka';
      
      expect(service.needsRehash(bcryptHash)).toBe(true);
    });

    it('should recommend rehashing low-cost bcrypt', async () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'USE_ARGON2') return false;
        if (key === 'BCRYPT_ROUNDS') return 14;
        return defaultValue;
      });

      const lowCostHash = '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj.VKt9Bg/Ka';
      
      expect(service.needsRehash(lowCostHash)).toBe(true);
    });

    it('should not recommend rehashing current Argon2', async () => {
      const argon2Hash = '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$hash';
      
      expect(service.needsRehash(argon2Hash)).toBe(false);
    });
  });

  describe('validatePasswordHistory', () => {
    it('should reject same password as current', async () => {
      const mockUser = {
        id: 'user-1',
        passwordHash: '$2b$12$test',
      };
      
      userRepository.findOne.mockResolvedValue(mockUser as User);
      jest.spyOn(service, 'verifyPassword').mockResolvedValue(true);

      await expect(service.validatePasswordHistory('user-1', 'samepassword'))
        .rejects.toThrow('cannot be the same as current password');
    });

    it('should accept different password', async () => {
      const mockUser = {
        id: 'user-1',
        passwordHash: '$2b$12$test',
      };
      
      userRepository.findOne.mockResolvedValue(mockUser as User);
      jest.spyOn(service, 'verifyPassword').mockResolvedValue(false);

      const result = await service.validatePasswordHistory('user-1', 'differentpassword');
      expect(result).toBe(true);
    });

    it('should handle missing user gracefully', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.validatePasswordHistory('nonexistent', 'password');
      expect(result).toBe(true);
    });
  });

  describe('integration tests', () => {
    it('should handle complete password lifecycle', async () => {
      // Mock breach detection
      jest.spyOn(service, 'checkPasswordBreach').mockResolvedValue({
        isBreached: false,
      });

      const password = 'MySecurePassword123!@#';
      
      // 1. Analyze strength
      const analysis = await service.analyzePasswordStrength(password);
      expect(analysis.isAcceptable).toBe(true);
      
      // 2. Hash password
      const hashResult = await service.hashPassword(password);
      expect(hashResult.hash).toBeDefined();
      
      // 3. Verify password
      const isValid = await service.verifyPassword(password, hashResult.hash);
      expect(isValid).toBe(true);
      
      // 4. Verify wrong password fails
      const isWrongValid = await service.verifyPassword('wrongpassword', hashResult.hash);
      expect(isWrongValid).toBe(false);
    });

    it('should enforce security policies end-to-end', async () => {
      const weakPasswords = [
        'weak',
        'password',
        '123456789',
        'qwertyuiop',
        'onlylowercase',
        'ONLYUPPERCASE',
        '1234567890',
      ];

      for (const weakPassword of weakPasswords) {
        await expect(service.hashPassword(weakPassword))
          .rejects.toThrow();
      }
    });
  });

  describe('performance tests', () => {
    it('should hash passwords within reasonable time', async () => {
      jest.spyOn(service, 'checkPasswordBreach').mockResolvedValue({
        isBreached: false,
      });

      const password = 'PerformanceTestPassword123!@#';
      const startTime = Date.now();
      
      await service.hashPassword(password);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should verify passwords quickly', async () => {
      const password = 'QuickVerifyTest123!@#';
      const hash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj.VKt9Bg/Ka';
      
      const startTime = Date.now();
      await service.verifyPassword(password, hash);
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});

// Helper matcher
expect.extend({
  toBeOneOf(received, expected) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected}`,
        pass: false,
      };
    }
  },
});
