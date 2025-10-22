import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '@database/entities/organization.entity';

export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  requireUnicode: boolean;
  minScore: number;
  preventCommonPasswords: boolean;
  preventBreachedPasswords: boolean;
  preventPersonalInfo: boolean;
  preventReuse: boolean;
  historyCount: number;
  maxAge: number; // days
  warningAge: number; // days
  enforceComplexity: boolean;
  allowPassphrases: boolean;
  minWords: number; // for passphrases
  customPatterns: string[]; // regex patterns to block
  customDictionary: string[]; // custom words to block
}

export interface OrganizationPasswordPolicy extends PasswordPolicy {
  organizationId: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Password Policy Service
 * Manages organization-specific password policies and enforcement
 */
@Injectable()
export class PasswordPolicyService {
  private readonly logger = new Logger(PasswordPolicyService.name);

  // Default system-wide password policy
  private readonly defaultPolicy: PasswordPolicy = {
    minLength: 12,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    requireUnicode: false,
    minScore: 60,
    preventCommonPasswords: true,
    preventBreachedPasswords: true,
    preventPersonalInfo: true,
    preventReuse: true,
    historyCount: 5,
    maxAge: 365, // 1 year
    warningAge: 330, // 11 months
    enforceComplexity: true,
    allowPassphrases: true,
    minWords: 4,
    customPatterns: [],
    customDictionary: [],
  };

  // Industry-specific policy templates
  private readonly policyTemplates = {
    financial: {
      ...this.defaultPolicy,
      minLength: 14,
      minScore: 80,
      maxAge: 90, // 3 months
      warningAge: 75,
      historyCount: 10,
      requireUnicode: true,
    },
    healthcare: {
      ...this.defaultPolicy,
      minLength: 14,
      minScore: 75,
      maxAge: 180, // 6 months
      warningAge: 150,
      historyCount: 8,
      customPatterns: [
        '/patient/i',
        '/medical/i',
        '/health/i',
        '/hipaa/i',
      ],
    },
    education: {
      ...this.defaultPolicy,
      minLength: 10,
      minScore: 65,
      maxAge: 180, // 6 months
      warningAge: 150,
      allowPassphrases: true,
      minWords: 3,
    },
    government: {
      ...this.defaultPolicy,
      minLength: 16,
      minScore: 85,
      maxAge: 60, // 2 months
      warningAge: 45,
      historyCount: 12,
      requireUnicode: true,
      enforceComplexity: true,
    },
    startup: {
      ...this.defaultPolicy,
      minLength: 10,
      minScore: 55,
      maxAge: 365, // 1 year
      warningAge: 330,
      allowPassphrases: true,
    },
  };

  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get password policy for an organization
   */
  async getPasswordPolicy(organizationId?: string): Promise<PasswordPolicy> {
    if (!organizationId) {
      return this.getSystemPolicy();
    }

    try {
      // In a full implementation, you'd have a password_policies table
      // For now, we'll use organization settings or default to system policy
      const organization = await this.organizationRepository.findOne({
        where: { id: organizationId },
      });

      if (!organization) {
        return this.getSystemPolicy();
      }

      // Check if organization has custom policy settings
      const customPolicy = await this.getOrganizationCustomPolicy(organizationId);
      if (customPolicy) {
        return customPolicy;
      }

      // Use industry template if available
      const industryTemplate = this.getIndustryTemplate(organization.industry);
      if (industryTemplate) {
        return industryTemplate;
      }

      return this.getSystemPolicy();
    } catch (error) {
      this.logger.error(`Failed to get password policy for org ${organizationId}`, error);
      return this.getSystemPolicy();
    }
  }

  /**
   * Get system-wide password policy
   */
  getSystemPolicy(): PasswordPolicy {
    // Override with environment variables if set
    return {
      ...this.defaultPolicy,
      minLength: this.configService.get<number>('PASSWORD_MIN_LENGTH', this.defaultPolicy.minLength),
      maxLength: this.configService.get<number>('PASSWORD_MAX_LENGTH', this.defaultPolicy.maxLength),
      minScore: this.configService.get<number>('PASSWORD_MIN_SCORE', this.defaultPolicy.minScore),
      maxAge: this.configService.get<number>('PASSWORD_MAX_AGE_DAYS', this.defaultPolicy.maxAge),
      warningAge: this.configService.get<number>('PASSWORD_WARNING_AGE_DAYS', this.defaultPolicy.warningAge),
      historyCount: this.configService.get<number>('PASSWORD_HISTORY_COUNT', this.defaultPolicy.historyCount),
      preventBreachedPasswords: this.configService.get<boolean>('PASSWORD_PREVENT_BREACHED', this.defaultPolicy.preventBreachedPasswords),
    };
  }

  /**
   * Get industry-specific policy template
   */
  getIndustryTemplate(industry?: string): PasswordPolicy | null {
    if (!industry) return null;
    
    const normalizedIndustry = industry.toLowerCase();
    return this.policyTemplates[normalizedIndustry] || null;
  }

  /**
   * Validate password against policy
   */
  async validatePasswordAgainstPolicy(
    password: string,
    policy: PasswordPolicy,
    userId?: string,
    organizationId?: string,
  ): Promise<{
    isValid: boolean;
    violations: string[];
    score: number;
  }> {
    const violations: string[] = [];

    // Length checks
    if (password.length < policy.minLength) {
      violations.push(`Password must be at least ${policy.minLength} characters long`);
    }
    if (password.length > policy.maxLength) {
      violations.push(`Password must not exceed ${policy.maxLength} characters`);
    }

    // Character requirements
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      violations.push('Password must contain at least one uppercase letter');
    }
    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      violations.push('Password must contain at least one lowercase letter');
    }
    if (policy.requireNumbers && !/\d/.test(password)) {
      violations.push('Password must contain at least one number');
    }
    if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
      violations.push('Password must contain at least one special character');
    }
    if (policy.requireUnicode && !/[^\x00-\x7F]/.test(password)) {
      violations.push('Password must contain at least one Unicode character');
    }

    // Passphrase validation (if enabled)
    if (policy.allowPassphrases && this.isPassphrase(password)) {
      const wordCount = password.split(/\s+/).length;
      if (wordCount < policy.minWords) {
        violations.push(`Passphrase must contain at least ${policy.minWords} words`);
      }
    }

    // Custom pattern checks
    for (const pattern of policy.customPatterns) {
      try {
        const regex = new RegExp(pattern);
        if (regex.test(password)) {
          violations.push('Password contains prohibited patterns');
          break;
        }
      } catch (error) {
        this.logger.warn(`Invalid custom pattern: ${pattern}`);
      }
    }

    // Custom dictionary checks
    const lowerPassword = password.toLowerCase();
    for (const word of policy.customDictionary) {
      if (lowerPassword.includes(word.toLowerCase())) {
        violations.push('Password contains prohibited words');
        break;
      }
    }

    // Calculate basic score (more detailed scoring would be in PasswordSecurityService)
    const score = this.calculateBasicScore(password, policy);

    if (policy.enforceComplexity && score < policy.minScore) {
      violations.push(`Password complexity score (${score}) is below required minimum (${policy.minScore})`);
    }

    return {
      isValid: violations.length === 0,
      violations,
      score,
    };
  }

  /**
   * Check if password needs to be changed based on age policy
   */
  async checkPasswordAge(
    userId: string,
    organizationId?: string,
  ): Promise<{
    needsChange: boolean;
    needsWarning: boolean;
    daysUntilExpiry: number;
    policy: PasswordPolicy;
  }> {
    const policy = await this.getPasswordPolicy(organizationId);
    
    // In a full implementation, you'd get the user's password change date
    // For now, we'll simulate it
    const lastPasswordChange = new Date(); // This would come from user record
    const daysSinceChange = Math.floor(
      (Date.now() - lastPasswordChange.getTime()) / (1000 * 60 * 60 * 24)
    );

    const daysUntilExpiry = policy.maxAge - daysSinceChange;
    const needsChange = daysSinceChange >= policy.maxAge;
    const needsWarning = daysSinceChange >= policy.warningAge;

    return {
      needsChange,
      needsWarning,
      daysUntilExpiry,
      policy,
    };
  }

  /**
   * Get available policy templates
   */
  getAvailableTemplates(): Record<string, Partial<PasswordPolicy>> {
    return Object.entries(this.policyTemplates).reduce((acc, [key, template]) => {
      acc[key] = {
        minLength: template.minLength,
        minScore: template.minScore,
        maxAge: template.maxAge,
        historyCount: template.historyCount,
      };
      return acc;
    }, {} as Record<string, Partial<PasswordPolicy>>);
  }

  /**
   * Create custom policy for organization
   */
  async createOrganizationPolicy(
    organizationId: string,
    policy: Partial<PasswordPolicy> | any,
    createdBy: string,
  ): Promise<OrganizationPasswordPolicy> {
    // In a full implementation, this would save to a password_policies table
    const fullPolicy: OrganizationPasswordPolicy = {
      ...this.defaultPolicy,
      ...policy,
      organizationId,
      name: policy.name || 'Custom Policy',
      description: policy.description || 'Custom password policy',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy,
    };

    this.logger.log(`Created custom password policy for organization ${organizationId}`);
    return fullPolicy;
  }

  /**
   * Generate policy compliance report
   */
  async generateComplianceReport(organizationId: string): Promise<{
    policy: PasswordPolicy;
    compliance: {
      totalUsers: number;
      compliantUsers: number;
      nonCompliantUsers: number;
      expiredPasswords: number;
      weakPasswords: number;
      breachedPasswords: number;
    };
    recommendations: string[];
  }> {
    const policy = await this.getPasswordPolicy(organizationId);
    
    // In a full implementation, you'd query actual user data
    const mockCompliance = {
      totalUsers: 100,
      compliantUsers: 85,
      nonCompliantUsers: 15,
      expiredPasswords: 8,
      weakPasswords: 5,
      breachedPasswords: 2,
    };

    const recommendations: string[] = [];
    
    if (mockCompliance.nonCompliantUsers > mockCompliance.totalUsers * 0.1) {
      recommendations.push('Consider implementing mandatory password training');
    }
    
    if (mockCompliance.expiredPasswords > 0) {
      recommendations.push('Set up automated password expiry notifications');
    }
    
    if (mockCompliance.breachedPasswords > 0) {
      recommendations.push('Enable automatic breach detection and forced password resets');
    }

    return {
      policy,
      compliance: mockCompliance,
      recommendations,
    };
  }

  // Private helper methods

  private async getOrganizationCustomPolicy(organizationId: string): Promise<PasswordPolicy | null> {
    // In a full implementation, this would query the password_policies table
    // For now, return null to use default/template policies
    return null;
  }

  private isPassphrase(password: string): boolean {
    // Simple heuristic: contains spaces and multiple words
    return /\s/.test(password) && password.split(/\s+/).length >= 3;
  }

  private calculateBasicScore(password: string, policy: PasswordPolicy): number {
    let score = 0;

    // Length scoring
    if (password.length >= policy.minLength) {
      score += Math.min(25, password.length - policy.minLength + 10);
    }

    // Character variety scoring
    let charTypes = 0;
    if (/[a-z]/.test(password)) charTypes++;
    if (/[A-Z]/.test(password)) charTypes++;
    if (/\d/.test(password)) charTypes++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) charTypes++;
    if (/[^\x00-\x7F]/.test(password)) charTypes++;

    score += charTypes * 15;

    // Entropy bonus
    const uniqueChars = new Set(password).size;
    score += Math.min(20, uniqueChars * 2);

    // Passphrase bonus
    if (policy.allowPassphrases && this.isPassphrase(password)) {
      const wordCount = password.split(/\s+/).length;
      if (wordCount >= policy.minWords) {
        score += 15;
      }
    }

    return Math.min(100, score);
  }
}
