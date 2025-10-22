import { validate } from 'class-validator';
import { Transform } from 'class-transformer';
import { 
  IsSecureString, 
  IsSecureEmail, 
  IsStrongPassword, 
  IsSecurePath 
} from './validate-input.decorator';

// Test classes for validation
class TestSecureString {
  @IsSecureString()
  value: string;
}

class TestSecureEmail {
  @IsSecureEmail()
  email: string;
}

class TestStrongPassword {
  @IsStrongPassword()
  password: string;
}

class TestSecurePath {
  @IsSecurePath()
  path: string;
}

describe('Input Validation Decorators', () => {
  describe('IsSecureString', () => {
    it('should accept valid strings', async () => {
      const test = new TestSecureString();
      test.value = 'Valid String';
      
      const errors = await validate(test);
      expect(errors).toHaveLength(0);
    });

    it('should reject SQL injection attempts', async () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'/*",
        "UNION SELECT * FROM passwords",
        "'; INSERT INTO users VALUES ('hacker'); --"
      ];

      for (const input of maliciousInputs) {
        const test = new TestSecureString();
        test.value = input;
        
        const errors = await validate(test);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.validateSecureString).toBeDefined();
      }
    });

    it('should reject XSS attempts', async () => {
      const xssInputs = [
        '<script>alert("xss")</script>',
        'javascript:alert(1)',
        '<iframe src="javascript:alert(1)"></iframe>',
        '<img onerror="alert(1)" src="x">',
        '<object data="javascript:alert(1)"></object>'
      ];

      for (const input of xssInputs) {
        const test = new TestSecureString();
        test.value = input;
        
        const errors = await validate(test);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.validateSecureString).toBeDefined();
      }
    });

    it('should sanitize and accept safe HTML-like strings', async () => {
      const test = new TestSecureString();
      test.value = 'This is a &lt;safe&gt; string';
      
      const errors = await validate(test);
      expect(errors).toHaveLength(0);
    });
  });

  describe('IsSecureEmail', () => {
    it('should accept valid email addresses', async () => {
      const validEmails = [
        'user@example.com',
        'test.email+tag@domain.co.uk',
        'user123@test-domain.org'
      ];

      for (const email of validEmails) {
        const test = new TestSecureEmail();
        test.email = email;
        
        const errors = await validate(test);
        expect(errors).toHaveLength(0);
      }
    });

    it('should reject invalid email formats', async () => {
      const invalidEmails = [
        'not-an-email',
        '@domain.com',
        'user@',
        'user..double.dot@domain.com',
        'user@domain',
        ''
      ];

      for (const email of invalidEmails) {
        const test = new TestSecureEmail();
        test.email = email;
        
        const errors = await validate(test);
        expect(errors.length).toBeGreaterThan(0);
      }
    });

    it('should reject emails with suspicious patterns', async () => {
      const suspiciousEmails = [
        'user<script>@domain.com',
        'javascript:alert@domain.com',
        'user@domain.com<script>',
        'data:text/html@domain.com'
      ];

      for (const email of suspiciousEmails) {
        const test = new TestSecureEmail();
        test.email = email;
        
        const errors = await validate(test);
        expect(errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('IsStrongPassword', () => {
    it('should accept strong passwords', async () => {
      const strongPasswords = [
        'MyStr0ngP@ssw0rd!',
        'C0mpl3x!P@ssw0rd123',
        'Sup3rS3cur3#P@ss2024'
      ];

      for (const password of strongPasswords) {
        const test = new TestStrongPassword();
        test.password = password;
        
        const errors = await validate(test);
        expect(errors).toHaveLength(0);
      }
    });

    it('should reject weak passwords', async () => {
      const weakPasswords = [
        'password',           // Too common
        '12345678',          // Too simple
        'Password',          // Missing numbers and special chars
        'password123',       // Too common pattern
        'ALLUPPERCASE123!',  // Missing lowercase
        'alllowercase123!',  // Missing uppercase
        'NoNumbers!',        // Missing numbers
        'NoSpecialChars123', // Missing special characters
        'Short1!',           // Too short
        'abc123!',           // Sequential characters
        'aaa123!',           // Repeated characters
      ];

      for (const password of weakPasswords) {
        const test = new TestStrongPassword();
        test.password = password;
        
        const errors = await validate(test);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.isStrongPassword).toBeDefined();
      }
    });

    it('should enforce minimum length of 12 characters', async () => {
      const test = new TestStrongPassword();
      test.password = 'Short1!'; // Only 7 characters
      
      const errors = await validate(test);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isStrongPassword).toBeDefined();
    });
  });

  describe('IsSecurePath', () => {
    it('should accept valid file paths', async () => {
      const validPaths = [
        'documents/file.pdf',
        'images/photo.jpg',
        'uploads/document.docx'
      ];

      for (const path of validPaths) {
        const test = new TestSecurePath();
        test.path = path;
        
        const errors = await validate(test);
        expect(errors).toHaveLength(0);
      }
    });

    it('should reject path traversal attempts', async () => {
      const maliciousPaths = [
        '../../../etc/passwd',
        '..\\windows\\system32',
        './../../sensitive/file',
        '~/../../etc/shadow',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
      ];

      for (const path of maliciousPaths) {
        const test = new TestSecurePath();
        test.path = path;
        
        const errors = await validate(test);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.isSecurePath).toBeDefined();
      }
    });
  });

  describe('Integration with Transform decorator', () => {
    class TestTransformAndValidate {
      @Transform(({ value }) => value?.trim())
      @IsSecureString()
      value: string;
    }

    it('should work with Transform decorator', async () => {
      const test = new TestTransformAndValidate();
      test.value = '  Valid String  '; // With whitespace
      
      const errors = await validate(test);
      expect(errors).toHaveLength(0);
    });
  });
});

describe('Security Edge Cases', () => {
  it('should handle null and undefined values gracefully', async () => {
    const test = new TestSecureString();
    test.value = null as any;
    
    const errors = await validate(test);
    // Should have validation error for required field, not security error
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should handle non-string values', async () => {
    const test = new TestSecureString();
    test.value = 123 as any;
    
    const errors = await validate(test);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should handle very long strings', async () => {
    const test = new TestSecureString();
    test.value = 'a'.repeat(10001); // Very long string
    
    const errors = await validate(test);
    // Should pass security validation but might fail length validation elsewhere
    // Our security validator should not crash
    expect(() => validate(test)).not.toThrow();
  });

  it('should handle unicode and special characters safely', async () => {
    const test = new TestSecureString();
    test.value = 'Hello 世界 🌍 émojis';
    
    const errors = await validate(test);
    expect(errors).toHaveLength(0);
  });
});
