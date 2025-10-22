import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import * as DOMPurify from 'isomorphic-dompurify';
import { escape, unescape } from 'html-escaper';

@Injectable()
export class SanitizationPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (!value) return value;

    // Only sanitize body and query parameters
    if (metadata.type === 'body' || metadata.type === 'query') {
      return this.sanitizeObject(value);
    }

    return value;
  }

  private sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          // Sanitize the key as well
          const sanitizedKey = this.sanitizeString(key);
          sanitized[sanitizedKey] = this.sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }

    return obj;
  }

  private sanitizeString(str: string): string {
    if (typeof str !== 'string') return str;

    // First pass: DOMPurify to remove XSS
    let sanitized = DOMPurify.sanitize(str, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
    });

    // Second pass: Escape HTML entities
    sanitized = escape(sanitized);

    // Third pass: Remove potential SQL injection patterns
    sanitized = this.removeSqlInjectionPatterns(sanitized);

    // Fourth pass: Remove potential command injection patterns
    sanitized = this.removeCommandInjectionPatterns(sanitized);

    // Trim whitespace
    return sanitized.trim();
  }

  private removeSqlInjectionPatterns(str: string): string {
    // List of dangerous SQL patterns to neutralize
    const sqlPatterns = [
      // SQL keywords (case insensitive)
      { pattern: /(\bSELECT\b)/gi, replacement: 'SELECT_BLOCKED' },
      { pattern: /(\bINSERT\b)/gi, replacement: 'INSERT_BLOCKED' },
      { pattern: /(\bUPDATE\b)/gi, replacement: 'UPDATE_BLOCKED' },
      { pattern: /(\bDELETE\b)/gi, replacement: 'DELETE_BLOCKED' },
      { pattern: /(\bDROP\b)/gi, replacement: 'DROP_BLOCKED' },
      { pattern: /(\bCREATE\b)/gi, replacement: 'CREATE_BLOCKED' },
      { pattern: /(\bALTER\b)/gi, replacement: 'ALTER_BLOCKED' },
      { pattern: /(\bEXEC\b)/gi, replacement: 'EXEC_BLOCKED' },
      { pattern: /(\bUNION\b)/gi, replacement: 'UNION_BLOCKED' },
      { pattern: /(\bSCRIPT\b)/gi, replacement: 'SCRIPT_BLOCKED' },
      
      // SQL injection patterns
      { pattern: /(--)/g, replacement: '\\-\\-' },
      { pattern: /(\/\*)/g, replacement: '\\/\\*' },
      { pattern: /(\*\/)/g, replacement: '\\*\\/' },
      { pattern: /(\bOR\s+\d+\s*=\s*\d+)/gi, replacement: 'OR_BLOCKED' },
      { pattern: /(\bAND\s+\d+\s*=\s*\d+)/gi, replacement: 'AND_BLOCKED' },
    ];

    let sanitized = str;
    for (const { pattern, replacement } of sqlPatterns) {
      sanitized = sanitized.replace(pattern, replacement);
    }

    return sanitized;
  }

  private removeCommandInjectionPatterns(str: string): string {
    // List of dangerous command injection patterns
    const commandPatterns = [
      // Command separators
      { pattern: /(\s*;\s*)/g, replacement: ' SEMICOLON ' },
      { pattern: /(\s*\|\s*)/g, replacement: ' PIPE ' },
      { pattern: /(\s*&\s*)/g, replacement: ' AND ' },
      { pattern: /(\s*\$\s*)/g, replacement: ' DOLLAR ' },
      { pattern: /(\s*`\s*)/g, replacement: ' BACKTICK ' },
      
      // Command injection keywords
      { pattern: /(\bcat\b)/gi, replacement: 'cat_blocked' },
      { pattern: /(\bls\b)/gi, replacement: 'ls_blocked' },
      { pattern: /(\bpwd\b)/gi, replacement: 'pwd_blocked' },
      { pattern: /(\bwhoami\b)/gi, replacement: 'whoami_blocked' },
      { pattern: /(\bps\b)/gi, replacement: 'ps_blocked' },
      { pattern: /(\bkill\b)/gi, replacement: 'kill_blocked' },
      { pattern: /(\brm\b)/gi, replacement: 'rm_blocked' },
      { pattern: /(\bmv\b)/gi, replacement: 'mv_blocked' },
      { pattern: /(\bcp\b)/gi, replacement: 'cp_blocked' },
      { pattern: /(\bchmod\b)/gi, replacement: 'chmod_blocked' },
      { pattern: /(\bchown\b)/gi, replacement: 'chown_blocked' },
      { pattern: /(\bsu\b)/gi, replacement: 'su_blocked' },
      { pattern: /(\bsudo\b)/gi, replacement: 'sudo_blocked' },
    ];

    let sanitized = str;
    for (const { pattern, replacement } of commandPatterns) {
      sanitized = sanitized.replace(pattern, replacement);
    }

    return sanitized;
  }
}

@Injectable()
export class ValidationSanitizationPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (!value) return value;

    // Apply sanitization
    const sanitizationPipe = new SanitizationPipe();
    const sanitizedValue = sanitizationPipe.transform(value, metadata);

    // Perform additional validation checks
    if (metadata.type === 'body' || metadata.type === 'query') {
      this.validateSanitizedInput(sanitizedValue, metadata);
    }

    return sanitizedValue;
  }

  private validateSanitizedInput(value: any, metadata: ArgumentMetadata): void {
    if (typeof value === 'string') {
      this.validateString(value, metadata);
    } else if (typeof value === 'object' && value !== null) {
      this.validateObject(value, metadata);
    }
  }

  private validateString(str: string, metadata: ArgumentMetadata): void {
    // Check for remaining suspicious patterns after sanitization
    const suspiciousPatterns = [
      /SELECT_BLOCKED|INSERT_BLOCKED|UPDATE_BLOCKED|DELETE_BLOCKED/i,
      /UNION_BLOCKED|EXEC_BLOCKED|DROP_BLOCKED/i,
      /cat_blocked|ls_blocked|rm_blocked|sudo_blocked/i,
      /<script|<iframe|<object|javascript:|data:/i,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(str)) {
        throw new BadRequestException(
          `Input contains potentially malicious content that was blocked during sanitization`
        );
      }
    }

    // Check for excessively long strings (potential DoS)
    if (str.length > 10000) {
      throw new BadRequestException(
        `Input string too long. Maximum length is 10000 characters`
      );
    }
  }

  private validateObject(obj: any, metadata: ArgumentMetadata): void {
    // Check for deeply nested objects (potential DoS)
    const maxDepth = 10;
    if (this.getObjectDepth(obj) > maxDepth) {
      throw new BadRequestException(
        `Input object too deeply nested. Maximum depth is ${maxDepth}`
      );
    }

    // Check for too many properties (potential DoS)
    const maxProperties = 100;
    if (this.countProperties(obj) > maxProperties) {
      throw new BadRequestException(
        `Input object has too many properties. Maximum is ${maxProperties}`
      );
    }

    // Recursively validate nested objects and strings
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (typeof obj[key] === 'string') {
          this.validateString(obj[key], metadata);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          this.validateObject(obj[key], metadata);
        }
      }
    }
  }

  private getObjectDepth(obj: any, depth: number = 0): number {
    if (typeof obj !== 'object' || obj === null) {
      return depth;
    }

    let maxDepth = depth;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const currentDepth = this.getObjectDepth(obj[key], depth + 1);
        maxDepth = Math.max(maxDepth, currentDepth);
      }
    }

    return maxDepth;
  }

  private countProperties(obj: any): number {
    if (typeof obj !== 'object' || obj === null) {
      return 0;
    }

    let count = 0;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        count++;
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          count += this.countProperties(obj[key]);
        }
      }
    }

    return count;
  }
}

@Injectable()
export class FileUploadSanitizationPipe implements PipeTransform {
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/json',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB

  transform(value: any, metadata: ArgumentMetadata) {
    if (!value) return value;

    if (metadata.type === 'body' && value.mimetype) {
      return this.validateFile(value);
    }

    return value;
  }

  private validateFile(file: any): any {
    // Validate file size
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size too large. Maximum size is ${this.maxFileSize / 1024 / 1024}MB`
      );
    }

    // Validate MIME type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type not allowed. Allowed types: ${this.allowedMimeTypes.join(', ')}`
      );
    }

    // Sanitize filename
    if (file.originalname) {
      file.originalname = this.sanitizeFilename(file.originalname);
    }

    return file;
  }

  private sanitizeFilename(filename: string): string {
    // Remove path traversal attempts
    let sanitized = filename.replace(/[\/\\:*?"<>|]/g, '_');
    
    // Remove leading/trailing dots and spaces
    sanitized = sanitized.replace(/^[\s\.]+|[\s\.]+$/g, '');
    
    // Limit length
    if (sanitized.length > 255) {
      const ext = sanitized.substring(sanitized.lastIndexOf('.'));
      sanitized = sanitized.substring(0, 255 - ext.length) + ext;
    }
    
    // Ensure it's not empty
    if (!sanitized) {
      sanitized = 'file';
    }
    
    return sanitized;
  }
}
