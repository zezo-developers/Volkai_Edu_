import { Transform } from 'class-transformer';
import { Column, ColumnOptions } from 'typeorm';
import { EncryptionService } from '../services/encryption.service';

// Metadata key for encrypted fields
export const ENCRYPTED_FIELDS_KEY = Symbol('encryptedFields');

/**
 * Decorator for marking fields as encrypted
 */
export function EncryptedField(options?: ColumnOptions) {
  return function (target: any, propertyKey: string) {
    // Mark field as encrypted in metadata
    const encryptedFields = Reflect.getMetadata(ENCRYPTED_FIELDS_KEY, target.constructor) || [];
    encryptedFields.push(propertyKey);
    Reflect.defineMetadata(ENCRYPTED_FIELDS_KEY, encryptedFields, target.constructor);

    // Apply TypeORM column decorator with JSON type for encrypted data
    Column({ 
      type: 'json',
      nullable: true,
      ...options 
    })(target, propertyKey);
  };
}

/**
 * Encryption transformer for automatic encryption/decryption
 */
export class EncryptionTransformer {
  private static encryptionService: EncryptionService;

  static setEncryptionService(service: EncryptionService) {
    this.encryptionService = service;
  }

  static encrypt(value: any): any {
    if (!value || !this.encryptionService) return value;
    
    // Return a promise that will be resolved during entity save
    return {
      __encrypted: true,
      value: value,
    };
  }

  static decrypt(value: any): any {
    if (!value || typeof value !== 'object' || !value.encryptedValue) {
      return value;
    }

    // Return a promise that will be resolved during entity load
    return {
      __encrypted_data: value,
    };
  }
}

/**
 * Transform decorator for encryption
 */
export function EncryptTransform() {
  return Transform(({ value, obj, key }) => {
    // During serialization (saving to DB)
    if (value && typeof value === 'object' && value.__encrypted) {
      return EncryptionTransformer.encrypt(value.value);
    }
    
    // During deserialization (loading from DB)
    if (value && typeof value === 'object' && value.encryptedValue) {
      return EncryptionTransformer.decrypt(value);
    }
    
    return value;
  });
}

/**
 * Get encrypted fields from entity metadata
 */
export function getEncryptedFields(entityClass: any): string[] {
  return Reflect.getMetadata(ENCRYPTED_FIELDS_KEY, entityClass) || [];
}
