import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from './user.entity';

export enum ConfigCategory {
  SYSTEM = 'system',
  SECURITY = 'security',
  BILLING = 'billing',
  NOTIFICATIONS = 'notifications',
  INTEGRATIONS = 'integrations',
  FEATURES = 'features',
  UI = 'ui',
  ANALYTICS = 'analytics',
  COMPLIANCE = 'compliance',
  PERFORMANCE = 'performance',
}

export enum ConfigType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  JSON = 'json',
  ARRAY = 'array',
  ENCRYPTED = 'encrypted',
}

export enum ConfigEnvironment {
  ALL = 'all',
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
}

@Entity('system_configs')
@Index(['key'], { unique: true })
@Index(['category', 'isActive'])
@Index(['environment'])
@Index(['updatedAt'])
export class SystemConfig {
  @ApiProperty({ description: 'Configuration ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Configuration key (unique identifier)' })
  @Column({ unique: true, length: 100 })
  key: string;

  @ApiProperty({ description: 'Human-readable name' })
  @Column({ length: 200 })
  name: string;

  @ApiProperty({ description: 'Configuration description' })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ enum: ConfigCategory, description: 'Configuration category' })
  @Column({
    type: 'enum',
    enum: ConfigCategory,
  })
  category: ConfigCategory;

  @ApiProperty({ enum: ConfigType, description: 'Value type' })
  @Column({
    type: 'enum',
    enum: ConfigType,
  })
  type: ConfigType;

  @ApiProperty({ description: 'Configuration value' })
  @Column({ type: 'text' })
  value: string;

  @ApiProperty({ description: 'Default value' })
  @Column({ name: 'default_value', type: 'text', nullable: true })
  defaultValue?: string;

  @ApiProperty({ enum: ConfigEnvironment, description: 'Target environment' })
  @Column({
    type: 'enum',
    enum: ConfigEnvironment,
    default: ConfigEnvironment.ALL,
  })
  environment: ConfigEnvironment;

  @ApiProperty({ description: 'Whether configuration is active' })
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Whether configuration is read-only' })
  @Column({ name: 'is_readonly', default: false })
  isReadonly: boolean;

  @ApiProperty({ description: 'Whether configuration is sensitive/encrypted' })
  @Column({ name: 'is_sensitive', default: false })
  isSensitive: boolean;

  @ApiProperty({ description: 'Whether configuration requires restart' })
  @Column({ name: 'requires_restart', default: false })
  requiresRestart: boolean;

  @ApiProperty({ description: 'Validation rules and constraints' })
  @Column({ type: 'jsonb', default: {} })
  validation: {
    // Type-specific validation
    minLength?: number;
    maxLength?: number;
    minValue?: number;
    maxValue?: number;
    pattern?: string; // Regex pattern
    
    // Allowed values
    allowedValues?: any[];
    
    // Custom validation
    customValidator?: string; // Function name or expression
    
    // Dependencies
    dependsOn?: string[]; // Other config keys this depends on
    conflicts?: string[]; // Config keys that conflict with this one
    
    // Environment restrictions
    allowedEnvironments?: ConfigEnvironment[];
    
    // Format validation
    format?: 'email' | 'url' | 'ip' | 'port' | 'json' | 'base64' | 'hex';
    
    // Required fields for JSON type
    requiredFields?: string[];
    
    // Array validation
    arrayItemType?: ConfigType;
    minItems?: number;
    maxItems?: number;
    uniqueItems?: boolean;
  };

  @ApiProperty({ description: 'Configuration metadata' })
  @Column({ type: 'jsonb', default: {} })
  metadata: {
    // Display information
    displayOrder?: number;
    group?: string;
    icon?: string;
    color?: string;
    
    // Help and documentation
    helpText?: string;
    documentationUrl?: string;
    examples?: any[];
    
    // Feature flags
    featureFlag?: string;
    betaFeature?: boolean;
    experimentalFeature?: boolean;
    
    // Versioning
    version?: string;
    deprecatedSince?: string;
    removedIn?: string;
    replacedBy?: string;
    
    // Change tracking
    changeHistory?: Array<{
      timestamp: Date;
      oldValue: any;
      newValue: any;
      changedBy: string;
      reason?: string;
    }>;
    
    // Usage tracking
    lastAccessed?: Date;
    accessCount?: number;
    
    // Security
    encryptionMethod?: string;
    lastRotated?: Date;
    rotationInterval?: number; // days
    
    // Performance impact
    performanceImpact?: 'low' | 'medium' | 'high';
    cacheTimeout?: number; // seconds
    
    // Custom metadata
    tags?: string[];
    customFields?: Record<string, any>;
  };

  @ApiProperty({ description: 'User who last updated this configuration' })
  @Column({ name: 'updated_by', nullable: true })
  updatedBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updater?: User;

  // Virtual properties
  get isEncrypted(): boolean {
    return this.type === ConfigType.ENCRYPTED || this.isSensitive;
  }

  get isDeprecated(): boolean {
    return !!this.metadata.deprecatedSince;
  }

  get isExperimental(): boolean {
    return !!this.metadata.experimentalFeature;
  }

  get displayValue(): string {
    if (this.isSensitive) {
      return '***HIDDEN***';
    }
    
    if (this.type === ConfigType.JSON) {
      try {
        return JSON.stringify(JSON.parse(this.value), null, 2);
      } catch {
        return this.value;
      }
    }
    
    return this.value;
  }

  // Methods
  getParsedValue(): any {
    switch (this.type) {
      case ConfigType.BOOLEAN:
        return this.value.toLowerCase() === 'true';
      
      case ConfigType.NUMBER:
        const num = parseFloat(this.value);
        return isNaN(num) ? 0 : num;
      
      case ConfigType.JSON:
        try {
          return JSON.parse(this.value);
        } catch {
          return null;
        }
      
      case ConfigType.ARRAY:
        try {
          return JSON.parse(this.value);
        } catch {
          return this.value.split(',').map(v => v.trim());
        }
      
      case ConfigType.ENCRYPTED:
        // This would be decrypted by a service
        return this.value;
      
      default:
        return this.value;
    }
  }

  setValue(newValue: any, userId?: string): void {
    let stringValue: string;
    
    switch (this.type) {
      case ConfigType.BOOLEAN:
        stringValue = Boolean(newValue).toString();
        break;
      
      case ConfigType.NUMBER:
        stringValue = Number(newValue).toString();
        break;
      
      case ConfigType.JSON:
      case ConfigType.ARRAY:
        stringValue = JSON.stringify(newValue);
        break;
      
      default:
        stringValue = String(newValue);
    }

    // Track change history
    if (!this.metadata.changeHistory) {
      this.metadata.changeHistory = [];
    }

    this.metadata.changeHistory.push({
      timestamp: new Date(),
      oldValue: this.getParsedValue(),
      newValue,
      changedBy: userId || 'system',
    });

    this.value = stringValue;
    this.updatedBy = userId;
  }

  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const parsedValue = this.getParsedValue();

    // Type validation
    if (this.type === ConfigType.NUMBER && isNaN(Number(this.value))) {
      errors.push('Value must be a valid number');
    }

    if (this.type === ConfigType.BOOLEAN && !['true', 'false'].includes(this.value.toLowerCase())) {
      errors.push('Value must be true or false');
    }

    if (this.type === ConfigType.JSON) {
      try {
        JSON.parse(this.value);
      } catch {
        errors.push('Value must be valid JSON');
      }
    }

    // Validation rules
    const validation = this.validation;

    if (validation.minLength && this.value.length < validation.minLength) {
      errors.push(`Value must be at least ${validation.minLength} characters`);
    }

    if (validation.maxLength && this.value.length > validation.maxLength) {
      errors.push(`Value must be no more than ${validation.maxLength} characters`);
    }

    if (validation.minValue && parsedValue < validation.minValue) {
      errors.push(`Value must be at least ${validation.minValue}`);
    }

    if (validation.maxValue && parsedValue > validation.maxValue) {
      errors.push(`Value must be no more than ${validation.maxValue}`);
    }

    if (validation.pattern && !new RegExp(validation.pattern).test(this.value)) {
      errors.push('Value does not match required pattern');
    }

    if (validation.allowedValues && !validation.allowedValues.includes(parsedValue)) {
      errors.push(`Value must be one of: ${validation.allowedValues.join(', ')}`);
    }

    // Format validation
    if (validation.format) {
      switch (validation.format) {
        case 'email':
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.value)) {
            errors.push('Value must be a valid email address');
          }
          break;
        
        case 'url':
          try {
            new URL(this.value);
          } catch {
            errors.push('Value must be a valid URL');
          }
          break;
        
        case 'ip':
          if (!/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(this.value)) {
            errors.push('Value must be a valid IP address');
          }
          break;
        
        case 'port':
          const port = parseInt(this.value);
          if (isNaN(port) || port < 1 || port > 65535) {
            errors.push('Value must be a valid port number (1-65535)');
          }
          break;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  canBeModified(currentEnvironment: string): boolean {
    if (this.isReadonly) return false;
    if (!this.isActive) return false;
    
    if (this.environment !== ConfigEnvironment.ALL && 
        this.environment !== currentEnvironment) {
      return false;
    }

    return true;
  }

  needsRestart(): boolean {
    return this.requiresRestart;
  }

  addToHistory(action: string, userId: string, details?: any): void {
    if (!this.metadata.changeHistory) {
      this.metadata.changeHistory = [];
    }

    this.metadata.changeHistory.push({
      timestamp: new Date(),
      oldValue: action,
      newValue: details,
      changedBy: userId,
    });
  }

  // Static factory methods
  static createSystemConfig(
    key: string,
    name: string,
    value: any,
    type: ConfigType = ConfigType.STRING,
    category: ConfigCategory = ConfigCategory.SYSTEM
  ): Partial<SystemConfig> {
    return {
      key,
      name,
      value: String(value),
      type,
      category,
      environment: ConfigEnvironment.ALL,
      isActive: true,
      isReadonly: false,
      isSensitive: false,
      requiresRestart: false,
      validation: {},
      metadata: {},
    };
  }

  static createSecretConfig(
    key: string,
    name: string,
    value: string,
    description?: string
  ): Partial<SystemConfig> {
    return {
      key,
      name,
      description,
      value,
      type: ConfigType.ENCRYPTED,
      category: ConfigCategory.SECURITY,
      environment: ConfigEnvironment.ALL,
      isActive: true,
      isReadonly: false,
      isSensitive: true,
      requiresRestart: true,
      validation: {
        minLength: 1,
      },
      metadata: {
        encryptionMethod: 'AES-256-GCM',
      },
    };
  }

  static createFeatureFlag(
    key: string,
    name: string,
    enabled: boolean = false,
    description?: string
  ): Partial<SystemConfig> {
    return {
      key,
      name,
      description,
      value: String(enabled),
      type: ConfigType.BOOLEAN,
      category: ConfigCategory.FEATURES,
      environment: ConfigEnvironment.ALL,
      isActive: true,
      isReadonly: false,
      isSensitive: false,
      requiresRestart: false,
      validation: {},
      metadata: {
        group: 'Feature Flags',
      },
    };
  }

  // Default system configurations
  static getDefaultConfigs(): Partial<SystemConfig>[] {
    return [
      // System configs
      this.createSystemConfig('app.name', 'Application Name', 'Volkai HR Edu', ConfigType.STRING, ConfigCategory.SYSTEM),
      this.createSystemConfig('app.version', 'Application Version', '1.0.0', ConfigType.STRING, ConfigCategory.SYSTEM),
      this.createSystemConfig('app.environment', 'Environment', 'development', ConfigType.STRING, ConfigCategory.SYSTEM),
      this.createSystemConfig('app.debug', 'Debug Mode', false, ConfigType.BOOLEAN, ConfigCategory.SYSTEM),
      this.createSystemConfig('app.maintenance_mode', 'Maintenance Mode', false, ConfigType.BOOLEAN, ConfigCategory.SYSTEM),
      
      // Security configs
      this.createSystemConfig('security.session_timeout', 'Session Timeout (minutes)', 60, ConfigType.NUMBER, ConfigCategory.SECURITY),
      this.createSystemConfig('security.max_login_attempts', 'Max Login Attempts', 5, ConfigType.NUMBER, ConfigCategory.SECURITY),
      this.createSystemConfig('security.password_min_length', 'Minimum Password Length', 8, ConfigType.NUMBER, ConfigCategory.SECURITY),
      this.createSystemConfig('security.require_2fa', 'Require 2FA', false, ConfigType.BOOLEAN, ConfigCategory.SECURITY),
      
      // Feature flags
      this.createFeatureFlag('features.ai_interviews', 'AI Mock Interviews', true, 'Enable AI-powered mock interviews'),
      this.createFeatureFlag('features.resume_builder', 'Resume Builder', true, 'Enable resume builder functionality'),
      this.createFeatureFlag('features.job_board', 'Job Board', true, 'Enable job board functionality'),
      this.createFeatureFlag('features.analytics', 'Analytics Dashboard', true, 'Enable analytics and reporting'),
      
      // Billing configs
      this.createSystemConfig('billing.default_currency', 'Default Currency', 'USD', ConfigType.STRING, ConfigCategory.BILLING),
      this.createSystemConfig('billing.trial_days', 'Default Trial Days', 14, ConfigType.NUMBER, ConfigCategory.BILLING),
      this.createSystemConfig('billing.grace_period_days', 'Grace Period Days', 3, ConfigType.NUMBER, ConfigCategory.BILLING),
      
      // Notification configs
      this.createSystemConfig('notifications.email_enabled', 'Email Notifications', true, ConfigType.BOOLEAN, ConfigCategory.NOTIFICATIONS),
      this.createSystemConfig('notifications.sms_enabled', 'SMS Notifications', false, ConfigType.BOOLEAN, ConfigCategory.NOTIFICATIONS),
      this.createSystemConfig('notifications.push_enabled', 'Push Notifications', true, ConfigType.BOOLEAN, ConfigCategory.NOTIFICATIONS),
      
      // Performance configs
      this.createSystemConfig('performance.cache_ttl', 'Default Cache TTL (seconds)', 3600, ConfigType.NUMBER, ConfigCategory.PERFORMANCE),
      this.createSystemConfig('performance.max_file_size_mb', 'Max File Size (MB)', 100, ConfigType.NUMBER, ConfigCategory.PERFORMANCE),
      this.createSystemConfig('performance.api_rate_limit', 'API Rate Limit (per minute)', 1000, ConfigType.NUMBER, ConfigCategory.PERFORMANCE),
    ];
  }
}
