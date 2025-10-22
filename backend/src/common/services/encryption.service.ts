import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import crypto from 'crypto';
import AWS from 'aws-sdk';

export interface EncryptionConfig {
  algorithm: string;
  keyId: string;
  region: string;
  rotationInterval: number;
}

export interface EncryptedData {
  encryptedValue: string;
  keyId: string;
  algorithm: string;
  iv: string;
  tag: string;
}

/**
 * Field-Level Encryption Service
 * Provides transparent encryption/decryption for PII data using AWS KMS
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly kms: AWS.KMS;
  private readonly config: EncryptionConfig;
  private readonly dataKeyCache = new Map<string, { key: Buffer; expiresAt: number }>();

  constructor(private readonly configService: ConfigService) {
    this.config = {
      algorithm: 'aes-256-gcm',
      keyId: this.configService.get<string>('KMS_KEY_ID', 'alias/volkai-encryption-key'),
      region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
      rotationInterval: 24 * 60 * 60 * 1000, // 24 hours
    };

    this.kms = new AWS.KMS({
      region: this.config.region,
      accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
    });
  }

  /**
   * Encrypt sensitive data
   */
  async encrypt(plaintext: string, context?: Record<string, string>): Promise<EncryptedData> {
    if (!plaintext) return null;

    try {
      const dataKey = await this.getDataKey(context);
      const iv = crypto.randomBytes(12); // 12 bytes for GCM mode
      const cipher = crypto.createCipheriv(this.config.algorithm, dataKey, iv) as crypto.CipherGCM;
      
      // Set Additional Authenticated Data (AAD)
      cipher.setAAD(Buffer.from(JSON.stringify(context || {})));

      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      const tag = cipher.getAuthTag();

      return {
        encryptedValue: encrypted,
        keyId: this.config.keyId,
        algorithm: this.config.algorithm,
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
      };
    } catch (error) {
      this.logger.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  async decrypt(encryptedData: EncryptedData, context?: Record<string, string>): Promise<string> {
    if (!encryptedData?.encryptedValue) return null;

    try {
      const dataKey = await this.getDataKey(context);
      const iv = Buffer.from(encryptedData.iv, 'base64');
      const decipher = crypto.createDecipheriv(encryptedData.algorithm, dataKey, iv) as crypto.DecipherGCM;
      
      decipher.setAAD(Buffer.from(JSON.stringify(context || {})));
      decipher.setAuthTag(Buffer.from(encryptedData.tag, 'base64'));

      let decrypted = decipher.update(encryptedData.encryptedValue, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encrypt multiple fields
   */
  async encryptFields(data: Record<string, any>, fields: string[]): Promise<Record<string, any>> {
    const result = { ...data };
    
    for (const field of fields) {
      if (result[field]) {
        result[field] = await this.encrypt(result[field], { field });
      }
    }
    
    return result;
  }

  /**
   * Decrypt multiple fields
   */
  async decryptFields(data: Record<string, any>, fields: string[]): Promise<Record<string, any>> {
    const result = { ...data };
    
    for (const field of fields) {
      if (result[field] && typeof result[field] === 'object') {
        result[field] = await this.decrypt(result[field], { field });
      }
    }
    
    return result;
  }

  /**
   * Rotate encryption keys
   */
  async rotateKeys(): Promise<void> {
    try {
      // Clear data key cache to force new key generation
      this.dataKeyCache.clear();
      
      // Create new KMS key version
      await this.kms.createKey({
        Description: 'Volkai HR Edu Encryption Key - Rotated',
        KeyUsage: 'ENCRYPT_DECRYPT',
        KeySpec: 'SYMMETRIC_DEFAULT',
      }).promise();
      
      this.logger.log('Encryption keys rotated successfully');
    } catch (error) {
      this.logger.error('Key rotation failed:', error);
      throw error;
    }
  }

  /**
   * Get or generate data encryption key
   */
  private async getDataKey(context?: Record<string, string>): Promise<Buffer> {
    const cacheKey = JSON.stringify(context || {});
    const cached = this.dataKeyCache.get(cacheKey);
    
    if (cached && cached.expiresAt > Date.now()) {
      return cached.key;
    }

    try {
      const result = await this.kms.generateDataKey({
        KeyId: this.config.keyId,
        KeySpec: 'AES_256',
        EncryptionContext: context,
      }).promise();

      const dataKey = Buffer.from(result.Plaintext as Uint8Array);
      
      // Cache the key
      this.dataKeyCache.set(cacheKey, {
        key: dataKey,
        expiresAt: Date.now() + this.config.rotationInterval,
      });

      return dataKey;
    } catch (error) {
      this.logger.error('Failed to generate data key:', error);
      throw error;
    }
  }
}