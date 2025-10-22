import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import  bcrypt from 'bcrypt';
import  argon2 from 'argon2';
import  crypto from 'crypto';
import { User } from '@database/entities/user.entity';

export interface PasswordStrengthResult {
  score: number; // 0-100
  strength: 'very_weak' | 'weak' | 'fair' | 'good' | 'strong' | 'very_strong';
  feedback: string[];
  isAcceptable: boolean;
  estimatedCrackTime: string;
}

export interface PasswordHashResult {
  hash: string;
  algorithm: 'bcrypt' | 'argon2';
  metadata: {
    cost?: number;
    saltLength?: number;
    iterations?: number;
    memory?: number;
    parallelism?: number;
  };
}

export interface PasswordBreachCheck {
  isBreached: boolean;
  breachCount?: number;
  source?: string;
}

/**
 * Enhanced Password Security Service
 * Implements advanced password security features including:
 * - Multiple hashing algorithms (bcrypt, argon2)
 * - Password strength analysis
 * - Breach detection
 * - Password history tracking
 * - Secure password generation
 */
@Injectable()
export class PasswordSecurityService {
  private readonly logger = new Logger(PasswordSecurityService.name);
  
  // Common passwords list (top 10k most common passwords)
  private readonly commonPasswords = new Set([
    'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
    'admin', 'letmein', 'welcome', 'monkey', '1234567890', 'dragon',
    'master', 'hello', 'login', 'princess', 'solo', 'qwertyuiop',
    'starwars', 'superman', 'iloveyou', 'trustno1', 'batman', 'freedom'
    // In production, load from a comprehensive list
  ]);

  // Password patterns to avoid
  private readonly dangerousPatterns = [
    /^(.)\1{2,}$/, // Repeated characters (aaa, 111)
    /^(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i, // Sequential
    /^(qwerty|asdfgh|zxcvbn|qwertyuiop|asdfghjkl|zxcvbnm)/i, // Keyboard patterns
    /^(password|admin|user|login|welcome|guest|test|demo)/i, // Common words
    /^\d{4,}$/, // Only numbers
    /^[a-zA-Z]+$/, // Only letters
  ];

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Hash password using the most secure available algorithm
   */
  async hashPassword(password: string, userId?: string): Promise<PasswordHashResult> {
    // Validate password strength first
    const strengthResult = await this.analyzePasswordStrength(password, userId);
    if (!strengthResult.isAcceptable) {
      throw new BadRequestException(
        `Password is too weak: ${strengthResult.feedback.join(', ')}`
      );
    }

    // Check for breaches
    const breachResult = await this.checkPasswordBreach(password);
    if (breachResult.isBreached) {
      throw new BadRequestException(
        `This password has been found in ${breachResult.breachCount} data breaches. Please choose a different password.`
      );
    }

    // Use Argon2 for new passwords (more secure than bcrypt)
    const useArgon2 = this.configService.get<boolean>('USE_ARGON2', true);
    
    if (useArgon2) {
      return this.hashWithArgon2(password);
    } else {
      return this.hashWithBcrypt(password);
    }
  }

  /**
   * Hash password with Argon2 (recommended)
   */
  private async hashWithArgon2(password: string): Promise<PasswordHashResult> {
    const options = {
      type: argon2.argon2id, // Most secure variant
      memoryCost: this.configService.get<number>('ARGON2_MEMORY', 65536), // 64 MB
      timeCost: this.configService.get<number>('ARGON2_TIME', 3), // 3 iterations
      parallelism: this.configService.get<number>('ARGON2_PARALLELISM', 4), // 4 threads
      saltLength: 32, // 32 bytes salt
    };

    const hash = await argon2.hash(password, options);

    return {
      hash,
      algorithm: 'argon2',
      metadata: {
        iterations: options.timeCost,
        memory: options.memoryCost,
        parallelism: options.parallelism,
        saltLength: options.saltLength,
      },
    };
  }

  /**
   * Hash password with bcrypt (fallback)
   */
  private async hashWithBcrypt(password: string): Promise<PasswordHashResult> {
    const saltRounds = this.configService.get<number>('BCRYPT_ROUNDS', 14); // Increased from 12
    const hash = await bcrypt.hash(password, saltRounds);

    return {
      hash,
      algorithm: 'bcrypt',
      metadata: {
        cost: saltRounds,
      },
    };
  }

  /**
   * Verify password against hash (supports both algorithms)
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      // Detect algorithm by hash format
      if (hash.startsWith('$argon2')) {
        return await argon2.verify(hash, password);
      } else if (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')) {
        return await bcrypt.compare(password, hash);
      } else {
        this.logger.warn('Unknown hash format detected');
        return false;
      }
    } catch (error) {
      this.logger.error('Password verification failed', error);
      return false;
    }
  }

  /**
   * Analyze password strength comprehensively
   */
  async analyzePasswordStrength(password: string, userId?: string): Promise<PasswordStrengthResult> {
    const feedback: string[] = [];
    let score = 0;

    // Length check (most important factor)
    if (password.length < 8) {
      feedback.push('Password must be at least 8 characters long');
      return {
        score: 0,
        strength: 'very_weak',
        feedback,
        isAcceptable: false,
        estimatedCrackTime: 'Instantly',
      };
    } else if (password.length >= 12) {
      score += 25;
    } else if (password.length >= 10) {
      score += 15;
    } else {
      score += 5;
      feedback.push('Consider using a longer password (12+ characters recommended)');
    }

    // Character variety
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);
    const hasUnicode = /[^\x00-\x7F]/.test(password);

    let charTypes = 0;
    if (hasLower) charTypes++;
    if (hasUpper) charTypes++;
    if (hasNumbers) charTypes++;
    if (hasSpecial) charTypes++;
    if (hasUnicode) charTypes++;

    if (charTypes >= 4) {
      score += 25;
    } else if (charTypes >= 3) {
      score += 15;
      feedback.push('Add special characters for better security');
    } else if (charTypes >= 2) {
      score += 5;
      feedback.push('Use a mix of uppercase, lowercase, numbers, and special characters');
    } else {
      feedback.push('Password must contain uppercase, lowercase, numbers, and special characters');
    }

    // Check for common passwords
    if (this.commonPasswords.has(password.toLowerCase())) {
      score = Math.min(score, 10);
      feedback.push('This is a commonly used password');
    }

    // Check for dangerous patterns
    for (const pattern of this.dangerousPatterns) {
      if (pattern.test(password)) {
        score = Math.min(score, 20);
        feedback.push('Avoid predictable patterns and common words');
        break;
      }
    }

    // Check for personal information (if userId provided)
    if (userId) {
      const personalInfoPenalty = await this.checkPersonalInformation(password, userId);
      if (personalInfoPenalty > 0) {
        score = Math.max(0, score - personalInfoPenalty);
        feedback.push('Avoid using personal information in passwords');
      }
    }

    // Entropy calculation
    const entropy = this.calculateEntropy(password);
    if (entropy >= 60) {
      score += 25;
    } else if (entropy >= 40) {
      score += 15;
    } else if (entropy >= 25) {
      score += 5;
    } else {
      feedback.push('Password lacks sufficient randomness');
    }

    // Repeated characters penalty
    const repeatedChars = this.countRepeatedCharacters(password);
    if (repeatedChars > password.length * 0.3) {
      score = Math.max(0, score - 20);
      feedback.push('Reduce repeated characters');
    }

    // Dictionary word check
    if (this.containsDictionaryWords(password)) {
      score = Math.max(0, score - 15);
      feedback.push('Avoid dictionary words');
    }

    // Determine strength and acceptability
    let strength: PasswordStrengthResult['strength'];
    let isAcceptable: boolean;
    let estimatedCrackTime: string;

    if (score >= 90) {
      strength = 'very_strong';
      isAcceptable = true;
      estimatedCrackTime = 'Centuries';
    } else if (score >= 75) {
      strength = 'strong';
      isAcceptable = true;
      estimatedCrackTime = 'Years';
    } else if (score >= 60) {
      strength = 'good';
      isAcceptable = true;
      estimatedCrackTime = 'Months';
    } else if (score >= 40) {
      strength = 'fair';
      isAcceptable = true;
      estimatedCrackTime = 'Days';
      feedback.push('Consider strengthening your password');
    } else if (score >= 20) {
      strength = 'weak';
      isAcceptable = false;
      estimatedCrackTime = 'Hours';
    } else {
      strength = 'very_weak';
      isAcceptable = false;
      estimatedCrackTime = 'Minutes';
    }

    return {
      score,
      strength,
      feedback,
      isAcceptable,
      estimatedCrackTime,
    };
  }

  /**
   * Check if password has been breached (using k-anonymity with HaveIBeenPwned)
   */
  async checkPasswordBreach(password: string): Promise<PasswordBreachCheck> {
    try {
      // Create SHA-1 hash of password
      const sha1Hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
      const prefix = sha1Hash.substring(0, 5);
      const suffix = sha1Hash.substring(5);

      // Query HaveIBeenPwned API with k-anonymity
      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'Volkai-HR-Edu-Backend/1.0',
        },
      });

      if (!response.ok) {
        this.logger.warn('Failed to check password breach status');
        return { isBreached: false }; // Fail open for availability
      }

      const data = await response.text();
      const lines = data.split('\n');

      for (const line of lines) {
        const [hashSuffix, count] = line.split(':');
        if (hashSuffix === suffix) {
          return {
            isBreached: true,
            breachCount: parseInt(count.trim(), 10),
            source: 'HaveIBeenPwned',
          };
        }
      }

      return { isBreached: false };
    } catch (error) {
      this.logger.error('Error checking password breach status', error);
      return { isBreached: false }; // Fail open
    }
  }

  /**
   * Generate a secure password
   */
  generateSecurePassword(length: number = 16): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = lowercase + uppercase + numbers + special;
    
    let password = '';
    
    // Ensure at least one character from each set
    password += this.getRandomChar(lowercase);
    password += this.getRandomChar(uppercase);
    password += this.getRandomChar(numbers);
    password += this.getRandomChar(special);
    
    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += this.getRandomChar(allChars);
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Check if password needs to be rehashed (algorithm upgrade)
   */
  needsRehash(hash: string): boolean {
    // If using bcrypt and we want to upgrade to Argon2
    const useArgon2 = this.configService.get<boolean>('USE_ARGON2', true);
    if (useArgon2 && !hash.startsWith('$argon2')) {
      return true;
    }

    // Check bcrypt cost factor
    if (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')) {
      const currentCost = this.configService.get<number>('BCRYPT_ROUNDS', 14);
      const hashCost = parseInt(hash.split('$')[2], 10);
      return hashCost < currentCost;
    }

    return false;
  }

  /**
   * Validate password against user's password history
   */
  async validatePasswordHistory(userId: string, newPassword: string): Promise<boolean> {
    // This would check against stored password history
    // Implementation depends on whether you store password history
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['passwordHash'], // In real implementation, you'd have a password_history table
    });

    if (!user) {
      return true; // Allow if user not found
    }

    // Check if new password is same as current
    const isSameAsCurrent = await this.verifyPassword(newPassword, user.passwordHash);
    if (isSameAsCurrent) {
      throw new BadRequestException('New password cannot be the same as current password');
    }

    // In a full implementation, you'd check against the last N passwords
    return true;
  }

  // Private helper methods

  private getRandomChar(chars: string): string {
    const randomBytes = crypto.randomBytes(1);
    return chars[randomBytes[0] % chars.length];
  }

  private calculateEntropy(password: string): number {
    const charSet = new Set(password);
    const charSetSize = charSet.size;
    return password.length * Math.log2(charSetSize);
  }

  private countRepeatedCharacters(password: string): number {
    const charCount = new Map<string, number>();
    for (const char of password) {
      charCount.set(char, (charCount.get(char) || 0) + 1);
    }
    
    let repeated = 0;
    for (const count of charCount.values()) {
      if (count > 1) {
        repeated += count - 1;
      }
    }
    
    return repeated;
  }

  private containsDictionaryWords(password: string): boolean {
    // Simple dictionary check - in production, use a comprehensive dictionary
    const commonWords = [
      'password', 'admin', 'user', 'login', 'welcome', 'guest', 'test',
      'demo', 'root', 'system', 'master', 'super', 'secret', 'private'
    ];
    
    const lowerPassword = password.toLowerCase();
    return commonWords.some(word => lowerPassword.includes(word));
  }

  private async checkPersonalInformation(password: string, userId: string): Promise<number> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['firstName', 'lastName', 'email'],
      });

      if (!user) {
        return 0;
      }

      const lowerPassword = password.toLowerCase();
      let penalty = 0;

      // Check if password contains name parts
      if (user.firstName && lowerPassword.includes(user.firstName.toLowerCase())) {
        penalty += 30;
      }
      if (user.lastName && lowerPassword.includes(user.lastName.toLowerCase())) {
        penalty += 30;
      }

      // Check if password contains email parts
      if (user.email) {
        const emailParts = user.email.split('@')[0].toLowerCase();
        if (lowerPassword.includes(emailParts)) {
          penalty += 25;
        }
      }

      return penalty;
    } catch (error) {
      this.logger.error('Error checking personal information', error);
      return 0;
    }
  }
}
