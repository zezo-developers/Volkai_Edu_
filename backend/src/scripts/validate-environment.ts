#!/usr/bin/env ts-node

import { config } from 'dotenv';
import { join } from 'path';
import * as fs from 'fs';

// Load environment variables
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env.development';
const envPath = join(__dirname, '../../', envFile);

if (fs.existsSync(envPath)) {
  config({ path: envPath });
} else {
  console.error(`❌ Environment file not found: ${envFile}`);
  process.exit(1);
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

class EnvironmentValidator {
  private errors: string[] = [];
  private warnings: string[] = [];

  validate(): ValidationResult {
    console.log('🔍 Validating environment configuration...\n');

    this.validateRequired();
    this.validateSecurity();
    this.validateDatabase();
    this.validateRedis();
    this.validateEmail();
    this.validateFileUpload();
    this.validatePerformance();

    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
    };
  }

  private validateRequired(): void {
    const requiredVars = [
      'NODE_ENV',
      'PORT',
      'DATABASE_URL',
      'REDIS_URL',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'ENCRYPTION_KEY',
      'FRONTEND_URL',
    ];

    requiredVars.forEach(varName => {
      if (!process.env[varName]) {
        this.errors.push(`Missing required environment variable: ${varName}`);
      }
    });
  }

  private validateSecurity(): void {
    // JWT Secret validation
    if (process.env.JWT_SECRET) {
      if (process.env.JWT_SECRET.length < 32) {
        this.errors.push('JWT_SECRET must be at least 32 characters long');
      }
      if (process.env.JWT_SECRET.includes('your_super_secure') || 
          process.env.JWT_SECRET.includes('change-in-production')) {
        this.warnings.push('JWT_SECRET appears to be using default/example value');
      }
    }

    // Refresh Secret validation
    if (process.env.JWT_REFRESH_SECRET) {
      if (process.env.JWT_REFRESH_SECRET.length < 32) {
        this.errors.push('JWT_REFRESH_SECRET must be at least 32 characters long');
      }
    }

    // Encryption Key validation
    if (process.env.ENCRYPTION_KEY) {
      if (process.env.ENCRYPTION_KEY.length !== 32) {
        this.errors.push('ENCRYPTION_KEY must be exactly 32 characters long');
      }
    }

    // BCRYPT Rounds validation
    const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    if (bcryptRounds < 10) {
      this.warnings.push('BCRYPT_ROUNDS should be at least 10 for security');
    }
    if (bcryptRounds > 15) {
      this.warnings.push('BCRYPT_ROUNDS above 15 may cause performance issues');
    }

    // CORS validation
    if (process.env.NODE_ENV === 'production' && process.env.CORS_ORIGIN === '*') {
      this.errors.push('CORS_ORIGIN should not be "*" in production');
    }
  }

  private validateDatabase(): void {
    if (process.env.DATABASE_URL) {
      const dbUrl = process.env.DATABASE_URL;
      
      if (!dbUrl.startsWith('postgresql://')) {
        this.errors.push('DATABASE_URL must be a PostgreSQL connection string');
      }

      if (process.env.NODE_ENV === 'production' && !dbUrl.includes('ssl=true')) {
        this.warnings.push('Database should use SSL in production');
      }

      // Check if database name contains 'test' in non-test environment
      if (process.env.NODE_ENV !== 'test' && dbUrl.includes('_test')) {
        this.warnings.push('Using test database in non-test environment');
      }
    }

    // Synchronize warning
    if (process.env.DB_SYNCHRONIZE === 'true' && process.env.NODE_ENV === 'production') {
      this.errors.push('DB_SYNCHRONIZE should be false in production');
    }
  }

  private validateRedis(): void {
    if (process.env.REDIS_URL) {
      const redisUrl = process.env.REDIS_URL;
      
      if (!redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
        this.errors.push('REDIS_URL must be a valid Redis connection string');
      }

      if (process.env.NODE_ENV === 'production' && redisUrl.startsWith('redis://')) {
        this.warnings.push('Consider using rediss:// (SSL) for Redis in production');
      }
    }

    // Redis DB validation
    const redisDb = parseInt(process.env.REDIS_DB || '0');
    if (redisDb < 0 || redisDb > 15) {
      this.errors.push('REDIS_DB must be between 0 and 15');
    }
  }

  private validateEmail(): void {
    if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
      const smtpPort = parseInt(process.env.SMTP_PORT);
      if (smtpPort < 1 || smtpPort > 65535) {
        this.errors.push('SMTP_PORT must be a valid port number (1-65535)');
      }
    }

    if (process.env.FROM_EMAIL && !this.isValidEmail(process.env.FROM_EMAIL)) {
      this.errors.push('FROM_EMAIL must be a valid email address');
    }
  }

  private validateFileUpload(): void {
    if (process.env.MAX_FILE_SIZE) {
      const maxSize = parseInt(process.env.MAX_FILE_SIZE);
      if (maxSize <= 0) {
        this.errors.push('MAX_FILE_SIZE must be a positive number');
      }
      if (maxSize > 100 * 1024 * 1024) { // 100MB
        this.warnings.push('MAX_FILE_SIZE is very large (>100MB)');
      }
    }

    if (process.env.UPLOAD_DEST && !fs.existsSync(process.env.UPLOAD_DEST)) {
      try {
        fs.mkdirSync(process.env.UPLOAD_DEST, { recursive: true });
        console.log(`✅ Created upload directory: ${process.env.UPLOAD_DEST}`);
      } catch (error) {
        this.errors.push(`Cannot create upload directory: ${process.env.UPLOAD_DEST}`);
      }
    }
  }

  private validatePerformance(): void {
    if (process.env.CACHE_TTL) {
      const cacheTtl = parseInt(process.env.CACHE_TTL);
      if (cacheTtl <= 0) {
        this.errors.push('CACHE_TTL must be a positive number');
      }
    }

    if (process.env.RATE_LIMIT_LIMIT) {
      const rateLimit = parseInt(process.env.RATE_LIMIT_LIMIT);
      if (rateLimit <= 0) {
        this.errors.push('RATE_LIMIT_LIMIT must be a positive number');
      }
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// Run validation
const validator = new EnvironmentValidator();
const result = validator.validate();

// Display results
if (result.warnings.length > 0) {
  console.log('⚠️  Warnings:');
  result.warnings.forEach(warning => console.log(`   - ${warning}`));
  console.log();
}

if (result.errors.length > 0) {
  console.log('❌ Errors:');
  result.errors.forEach(error => console.log(`   - ${error}`));
  console.log();
  console.log('❌ Environment validation failed!');
  process.exit(1);
} else {
  console.log('✅ Environment validation passed!');
  console.log();
  console.log('Environment Summary:');
  console.log(`   - Node Environment: ${process.env.NODE_ENV}`);
  console.log(`   - Port: ${process.env.PORT}`);
  console.log(`   - Database: ${process.env.DATABASE_URL?.split('@')[1] || 'Not configured'}`);
  console.log(`   - Redis: ${process.env.REDIS_URL?.replace(/redis:\/\/.*@/, 'redis://***@') || 'Not configured'}`);
  console.log(`   - Frontend URL: ${process.env.FRONTEND_URL}`);
  console.log(`   - Cache Enabled: ${process.env.QUERY_CACHE_ENABLED === 'true' ? 'Yes' : 'No'}`);
  console.log(`   - Compression Enabled: ${process.env.COMPRESSION_ENABLED === 'true' ? 'Yes' : 'No'}`);
  
  if (result.warnings.length > 0) {
    console.log(`\n⚠️  ${result.warnings.length} warning(s) found - please review`);
  }
}
