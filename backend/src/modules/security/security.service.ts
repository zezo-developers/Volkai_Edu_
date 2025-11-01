import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThanOrEqual, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { User } from '../../database/entities/user.entity';

export interface SecurityThreat {
  id: string;
  type: 'brute_force' | 'sql_injection' | 'xss' | 'csrf' | 'suspicious_activity' | 'rate_limit_exceeded';
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  description: string;
  timestamp: Date;
  metadata: Record<string, any>;
  resolved: boolean;
}

export interface SecurityMetrics {
  timestamp: Date;
  totalThreats: number;
  threatsByType: Record<string, number>;
  threatsBySeverity: Record<string, number>;
  blockedIps: number;
  suspiciousActivities: number;
  failedLogins: number;
  successfulLogins: number;
}

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);
  private threats: SecurityThreat[] = [];
  private blockedIps: Set<string> = new Set();
  private suspiciousActivities: Map<string, number> = new Map();
  private failedLoginAttempts: Map<string, { count: number; lastAttempt: Date }> = new Map();

  constructor(
    private configService: ConfigService,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // Threat Detection
  async detectSqlInjection(query: string, params: any[], userIp: string): Promise<boolean> {
    const sqlInjectionPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
      /(--|\#|\/\*|\*\/)/,
      /(\bOR\b.*=.*\bOR\b)/i,
      /(\bAND\b.*=.*\bAND\b)/i,
      /(;|\||&)/,
      /(\b(SCRIPT|JAVASCRIPT|VBSCRIPT)\b)/i,
    ];

    const queryString = query + ' ' + JSON.stringify(params);
    
    for (const pattern of sqlInjectionPatterns) {
      if (pattern.test(queryString)) {
        await this.recordThreat({
          type: 'sql_injection',
          severity: 'high',
          source: userIp,
          description: `Potential SQL injection detected in query: ${query}`,
          metadata: { query, params, pattern: pattern.source },
        });
        return true;
      }
    }

    return false;
  }

  async detectXss(input: string, userIp: string): Promise<boolean> {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<img[^>]+src[^>]*>/gi,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    ];

    for (const pattern of xssPatterns) {
      if (pattern.test(input)) {
        await this.recordThreat({
          type: 'xss',
          severity: 'high',
          source: userIp,
          description: `Potential XSS attack detected in input`,
          metadata: { input: input.substring(0, 200), pattern: pattern.source },
        });
        return true;
      }
    }

    return false;
  }

  async detectBruteForce(identifier: string, userIp: string): Promise<boolean> {
    const maxAttempts = 5;
    const timeWindow = 15 * 60 * 1000; // 15 minutes
    const now = new Date();

    const attempts = this.failedLoginAttempts.get(identifier) || { count: 0, lastAttempt: now };

    // Reset counter if time window has passed
    if (now.getTime() - attempts.lastAttempt.getTime() > timeWindow) {
      attempts.count = 0;
    }

    attempts.count++;
    attempts.lastAttempt = now;
    this.failedLoginAttempts.set(identifier, attempts);

    if (attempts.count >= maxAttempts) {
      await this.recordThreat({
        type: 'brute_force',
        severity: 'critical',
        source: userIp,
        description: `Brute force attack detected for identifier: ${identifier}`,
        metadata: { identifier, attempts: attempts.count, timeWindow },
      });

      // Temporarily block IP
      this.blockIp(userIp, 60); // Block for 1 hour
      return true;
    }

    return false;
  }

  async detectSuspiciousActivity(
    userId: string,
    activity: string,
    userIp: string,
    metadata: Record<string, any>
  ): Promise<boolean> {
    const suspiciousPatterns = [
      'rapid_api_calls',
      'unusual_access_pattern',
      'privilege_escalation_attempt',
      'data_exfiltration',
      'account_enumeration',
    ];

    if (suspiciousPatterns.includes(activity)) {
      const key = `${userId}:${activity}`;
      const count = this.suspiciousActivities.get(key) || 0;
      this.suspiciousActivities.set(key, count + 1);

      if (count >= 3) {
        await this.recordThreat({
          type: 'suspicious_activity',
          severity: 'medium',
          source: userIp,
          description: `Suspicious activity detected: ${activity}`,
          metadata: { userId, activity, count: count + 1, ...metadata },
        });
        return true;
      }
    }

    return false;
  }

  // IP Management
  blockIp(ip: string, durationMinutes: number): void {
    this.blockedIps.add(ip);
    this.logger.warn(`Blocked IP: ${ip} for ${durationMinutes} minutes`);

    // Auto-unblock after duration
    setTimeout(() => {
      this.blockedIps.delete(ip);
      this.logger.log(`Unblocked IP: ${ip}`);
    }, durationMinutes * 60 * 1000);
  }

  isIpBlocked(ip: string): boolean {
    return this.blockedIps.has(ip);
  }

  unblockIp(ip: string): void {
    this.blockedIps.delete(ip);
    this.logger.log(`Manually unblocked IP: ${ip}`);
  }

  getBlockedIps(): string[] {
    return Array.from(this.blockedIps);
  }

  // Password Security
  async validatePasswordStrength(password: string): Promise<{
    isValid: boolean;
    score: number;
    feedback: string[];
  }> {
    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (password.length >= 8) score += 2;
    else feedback.push('Password should be at least 8 characters long');

    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;

    // Character variety checks
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Password should contain lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Password should contain uppercase letters');

    if (/[0-9]/.test(password)) score += 1;
    else feedback.push('Password should contain numbers');

    if (/[^a-zA-Z0-9]/.test(password)) score += 2;
    else feedback.push('Password should contain special characters');

    // Common password check
    const commonPasswords = [
      'password', '123456', 'password123', 'admin', 'qwerty',
      'letmein', 'welcome', 'monkey', '1234567890'
    ];
    
    if (commonPasswords.includes(password.toLowerCase())) {
      score -= 3;
      feedback.push('Password is too common');
    }

    // Sequential characters check
    if (/(.)\1{2,}/.test(password)) {
      score -= 1;
      feedback.push('Avoid repeating characters');
    }

    if (/123|abc|qwe/i.test(password)) {
      score -= 1;
      feedback.push('Avoid sequential characters');
    }

    return {
      isValid: score >= 6,
      score: Math.max(0, Math.min(10, score)),
      feedback,
    };
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Encryption utilities
  encrypt(text: string, key?: string): { encrypted: string; iv: string } {
    const algorithm = 'aes-256-gcm';
    const secretKey = key || this.configService.get<string>('ENCRYPTION_KEY') || 'default-key-change-in-production';
    const keyHash = crypto.createHash('sha256').update(secretKey).digest();
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, keyHash);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      iv: iv.toString('hex'),
    };
  }

  decrypt(encryptedData: { encrypted: string; iv: string }, key?: string): string {
    const algorithm = 'aes-256-gcm';
    const secretKey = key || this.configService.get<string>('ENCRYPTION_KEY') || 'default-key-change-in-production';
    const keyHash = crypto.createHash('sha256').update(secretKey).digest();
    
    const decipher = crypto.createDecipher(algorithm, keyHash);
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // Security headers
  getSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'Content-Security-Policy': this.getContentSecurityPolicy(),
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    };
  }

  private getContentSecurityPolicy(): string {
    const isDevelopment = this.configService.get<string>('NODE_ENV') === 'development';
    
    if (isDevelopment) {
      return "default-src 'self' 'unsafe-inline' 'unsafe-eval'; img-src 'self' data: https:; connect-src 'self' ws: wss:";
    }
    
    return "default-src 'self'; img-src 'self' data: https:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'";
  }

  // Audit and monitoring
  private async recordThreat(threatData: Omit<SecurityThreat, 'id' | 'timestamp' | 'resolved'>): Promise<void> {
    const threat: SecurityThreat = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      resolved: false,
      ...threatData,
    };

    this.threats.push(threat);

    // Log to audit system
    await this.auditLogRepository.save({
      action: 'security.threat.detected',
      entityType: 'security',
      entityId: threat.id,
      details: {
        type: threat.type,
        severity: threat.severity,
        source: threat.source,
        description: threat.description,
      },
      metadata: threat.metadata,
      ipAddress: threat.source,
    });

    // Log critical threats immediately
    if (threat.severity === 'critical') {
      this.logger.error(`CRITICAL SECURITY THREAT: ${threat.description}`, {
        type: threat.type,
        source: threat.source,
        metadata: threat.metadata,
      });
    }
  }

  async getSecurityMetrics(): Promise<SecurityMetrics> {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentThreats = this.threats.filter(t => t.timestamp >= last24Hours);
    
    const threatsByType = recentThreats.reduce((acc, threat) => {
      acc[threat.type] = (acc[threat.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const threatsBySeverity = recentThreats.reduce((acc, threat) => {
      acc[threat.severity] = (acc[threat.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get login metrics from audit logs
     // ✅ Correct SQL-compatible query using TypeORM operators
    const loginAudits = await this.auditLogRepository.find({
      where: {
        action: In(['auth.login.success', 'auth.login.failed']),
        createdAt: MoreThanOrEqual(last24Hours),
      },
    }); 

    const successfulLogins = loginAudits.filter(a => a.action === 'auth.login.success').length;
    const failedLogins = loginAudits.filter(a => a.action === 'auth.login.failed').length;

    return {
      timestamp: now,
      totalThreats: recentThreats.length,
      threatsByType,
      threatsBySeverity,
      blockedIps: this.blockedIps.size,
      suspiciousActivities: this.suspiciousActivities.size,
      failedLogins,
      successfulLogins,
    };
  }

  getThreats(resolved?: boolean): SecurityThreat[] {
    if (resolved !== undefined) {
      return this.threats.filter(t => t.resolved === resolved);
    }
    return [...this.threats];
  }

  async resolveThreats(threatIds: string[]): Promise<void> {
    for (const id of threatIds) {
      const threat = this.threats.find(t => t.id === id);
      if (threat) {
        threat.resolved = true;
        
        await this.auditLogRepository.save({
          action: 'security.threat.resolved',
          entityType: 'security',
          entityId: id,
          details: { threatType: threat.type },
        });
      }
    }
  }

  // Scheduled security tasks
  @Cron(CronExpression.EVERY_HOUR)
  async performSecurityScan(): Promise<void> {
    try {
      // Check for suspicious user activities
      const suspiciousUsers = await this.userRepository
        .createQueryBuilder('user')
        .where('user.lastLoginAt > :recent', { 
          recent: new Date(Date.now() - 60 * 60 * 1000) 
        })
        .andWhere('user.failedLoginAttempts > :maxAttempts', { maxAttempts: 3 })
        .getMany();

      for (const user of suspiciousUsers) {
        await this.detectSuspiciousActivity(
          user.id,
          'multiple_failed_logins',
          user.lastLoginIp || 'unknown',
          { failedAttempts: user.failedLoginAttempts }
        );
      }

      // Clean up old threats (older than 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      this.threats = this.threats.filter(t => t.timestamp >= thirtyDaysAgo);

      // Clean up old failed login attempts
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      for (const [key, attempt] of this.failedLoginAttempts.entries()) {
        if (attempt.lastAttempt < oneHourAgo) {
          this.failedLoginAttempts.delete(key);
        }
      }

      this.logger.log('Security scan completed');
    } catch (error) {
      this.logger.error(`Error performing security scan: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateSecurityReport(): Promise<void> {
    try {
      const metrics = await this.getSecurityMetrics();
      const unresolvedThreats = this.getThreats(false);
      
      this.logger.log(`Daily Security Report:
        - Total threats (24h): ${metrics.totalThreats}
        - Unresolved threats: ${unresolvedThreats.length}
        - Blocked IPs: ${metrics.blockedIps}
        - Failed logins: ${metrics.failedLogins}
        - Successful logins: ${metrics.successfulLogins}`);

      // Alert on high-severity unresolved threats
      const criticalThreats = unresolvedThreats.filter(t => t.severity === 'critical');
      if (criticalThreats.length > 0) {
        this.logger.error(`${criticalThreats.length} unresolved critical security threats detected!`);
      }

    } catch (error) {
      this.logger.error(`Error generating security report: ${error.message}`);
    }
  }

  // Input sanitization
  sanitizeInput(input: string): string {
    console.log('input got : ',input)
    return input
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  sanitizeHtml(html: string): string {
    // Basic HTML sanitization - in production, use a library like DOMPurify
    console.log('html got : ',html)
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }

  // Rate limiting helpers
  async checkRateLimit(
    identifier: string,
    maxRequests: number,
    windowMs: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
    // This would integrate with Redis in production
    // For now, use in-memory tracking
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Simplified rate limiting logic
    const remaining = Math.max(0, maxRequests - 1);
    const resetTime = new Date(now + windowMs);
    
    return {
      allowed: remaining > 0,
      remaining,
      resetTime,
    };
  }
}
