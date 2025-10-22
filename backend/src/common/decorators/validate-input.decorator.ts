import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsString, IsEmail, IsOptional, ValidateIf, registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import * as DOMPurify from 'isomorphic-dompurify';
import { escape } from 'html-escaper';

/**
 * Custom validation decorator for secure string input
 * Sanitizes XSS attempts and validates string format
 */
export function IsSecureString(validationOptions?: ValidationOptions) {
  return applyDecorators(
    IsString(validationOptions),
    Transform(({ value }) => {
      if (typeof value !== 'string') return value;
      
      // Remove potential XSS payloads
      const sanitized = DOMPurify.sanitize(value, { 
        ALLOWED_TAGS: [], 
        ALLOWED_ATTR: [] 
      });
      
      // Escape HTML entities
      return escape(sanitized.trim());
    }),
    ValidateSecureString(validationOptions)
  );
}

/**
 * Custom validation decorator for secure email input
 */
export function IsSecureEmail(validationOptions?: ValidationOptions) {
  return applyDecorators(
    IsEmail({}, validationOptions),
    Transform(({ value }) => {
      if (typeof value !== 'string') return value;
      
      // Sanitize and normalize email
      const sanitized = DOMPurify.sanitize(value.toLowerCase().trim(), { 
        ALLOWED_TAGS: [], 
        ALLOWED_ATTR: [] 
      });
      
      return sanitized;
    }),
    ValidateSecureEmail(validationOptions)
  );
}

/**
 * Custom validation decorator for secure optional string
 */
export function IsSecureOptionalString(validationOptions?: ValidationOptions) {
  return applyDecorators(
    IsOptional(),
    ValidateIf((object, value) => value !== undefined && value !== null && value !== ''),
    IsSecureString(validationOptions)
  );
}

/**
 * Custom validation decorator for preventing SQL injection patterns
 */
export function ValidateSecureString(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string | symbol) {
    registerDecorator({
      name: 'validateSecureString',
      target: object.constructor,
      propertyName: propertyName.toString(),
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') return true;
          
          // Check for SQL injection patterns
          const sqlInjectionPatterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
            /(--|\/\*|\*\/|;|'|"|`)/,
            /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
            /(\b(OR|AND)\s+['"]\w+['"]?\s*=\s*['"]\w+['"]?)/i,
            /(UNION\s+SELECT)/i,
            /(EXEC\s*\()/i,
          ];
          
          for (const pattern of sqlInjectionPatterns) {
            if (pattern.test(value)) {
              return false;
            }
          }
          
          // Check for XSS patterns that might have escaped sanitization
          const xssPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /javascript:/i,
            /on\w+\s*=/i,
            /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
            /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
          ];
          
          for (const pattern of xssPatterns) {
            if (pattern.test(value)) {
              return false;
            }
          }
          
          return true;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} contains potentially malicious content`;
        },
      },
    });
  };
}

/**
 * Custom validation decorator for secure email validation
 */
export function ValidateSecureEmail(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string | symbol) {
    registerDecorator({
      name: 'validateSecureEmail',
      target: object.constructor,
      propertyName: propertyName.toString(),
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') return true;
          
          // Enhanced email validation
          const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
          
          if (!emailRegex.test(value)) {
            return false;
          }
          
          // Check for suspicious patterns in email
          const suspiciousPatterns = [
            /[<>]/,
            /javascript:/i,
            /data:/i,
            /vbscript:/i,
          ];
          
          for (const pattern of suspiciousPatterns) {
            if (pattern.test(value)) {
              return false;
            }
          }
          
          return true;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid and secure email address`;
        },
      },
    });
  };
}

/**
 * Custom validation decorator for password strength
 */
export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string | symbol) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName: propertyName.toString(),
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          
          // Password strength requirements
          const minLength = 12;
          const hasUpperCase = /[A-Z]/.test(value);
          const hasLowerCase = /[a-z]/.test(value);
          const hasNumbers = /\d/.test(value);
          const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);
          
          // Check minimum length
          if (value.length < minLength) return false;
          
          // Check complexity requirements
          if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
            return false;
          }
          
          // Check for common weak passwords
          const commonPasswords = [
            'password', '123456789', 'qwerty', 'abc123', 'password123',
            'admin', 'letmein', 'welcome', 'monkey', '1234567890'
          ];
          
          const lowerValue = value.toLowerCase();
          for (const common of commonPasswords) {
            if (lowerValue.includes(common)) {
              return false;
            }
          }
          
          // Check for sequential characters
          const hasSequential = /(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|123|234|345|456|567|678|789|890)/i.test(value);
          if (hasSequential) return false;
          
          // Check for repeated characters
          const hasRepeated = /(.)\1{2,}/.test(value);
          if (hasRepeated) return false;
          
          return true;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be at least 12 characters long and contain uppercase, lowercase, numbers, and special characters. Avoid common passwords and patterns.`;
        },
      },
    });
  };
}

/**
 * Custom validation decorator for preventing path traversal
 */
export function IsSecurePath(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string | symbol) {
    registerDecorator({
      name: 'isSecurePath',
      target: object.constructor,
      propertyName: propertyName.toString(),
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') return true;
          
          // Check for path traversal patterns
          const pathTraversalPatterns = [
            /\.\./,
            /\.\\/,
            /\.\/\./,
            /~\//,
            /\\\.\./,
            /%2e%2e/i,
            /%2f/i,
            /%5c/i,
          ];
          
          for (const pattern of pathTraversalPatterns) {
            if (pattern.test(value)) {
              return false;
            }
          }
          
          return true;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} contains invalid path characters`;
        },
      },
    });
  };
}
