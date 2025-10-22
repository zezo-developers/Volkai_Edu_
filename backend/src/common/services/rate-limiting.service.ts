import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { Request } from 'express';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  blockDurationMs?: number; // How long to block after limit exceeded
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  keyGenerator?: (req: Request) => string; // Custom key generation
  onLimitReached?: (req: Request, key: string) => void; // Callback when limit reached
}

export interface RateLimitResult {
  allowed: boolean;
  totalHits: number;
  remainingPoints: number;
  resetTime: Date;
  retryAfter?: number; // Seconds to wait before retry
}

export interface AttackPattern {
  type: 'brute_force' | 'ddos' | 'credential_stuffing' | 'enumeration' | 'scraping';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-100
  indicators: string[];
  recommendedAction: 'monitor' | 'throttle' | 'block' | 'captcha';
}

/**
 * Advanced Rate Limiting Service
 * Implements multiple rate limiting strategies with Redis backend
 * Includes attack detection and adaptive throttling
 */
@Injectable()
export class RateLimitingService {
  private readonly logger = new Logger(RateLimitingService.name);

  // Rate limit configurations for different endpoints
  private readonly rateLimitConfigs = {
    // Authentication endpoints - strict limits
    'auth:login': {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5, // 5 attempts per 15 minutes
      blockDurationMs: 30 * 60 * 1000, // Block for 30 minutes after limit
    },
    'auth:register': {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3, // 3 registrations per hour per IP
      blockDurationMs: 2 * 60 * 60 * 1000, // Block for 2 hours
    },
    'auth:password-reset': {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3, // 3 password reset attempts per hour
      blockDurationMs: 60 * 60 * 1000, // Block for 1 hour
    },
    'auth:verify-email': {
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxRequests: 3, // 3 verification attempts per 5 minutes
      blockDurationMs: 15 * 60 * 1000, // Block for 15 minutes
    },

    // API endpoints - moderate limits
    'api:general': {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100, // 100 requests per minute
      blockDurationMs: 5 * 60 * 1000, // Block for 5 minutes
    },
    'api:search': {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 30, // 30 searches per minute
      blockDurationMs: 2 * 60 * 1000, // Block for 2 minutes
    },
    'api:upload': {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 10, // 10 uploads per minute
      blockDurationMs: 10 * 60 * 1000, // Block for 10 minutes
    },

    // Admin endpoints - very strict limits
    'admin:config': {
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxRequests: 10, // 10 config changes per 5 minutes
      blockDurationMs: 30 * 60 * 1000, // Block for 30 minutes
    },
    'admin:users': {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 20, // 20 user operations per minute
      blockDurationMs: 15 * 60 * 1000, // Block for 15 minutes
    },

    // Billing endpoints - strict limits
    'billing:payment': {
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxRequests: 5, // 5 payment attempts per 5 minutes
      blockDurationMs: 60 * 60 * 1000, // Block for 1 hour
    },

    // Public endpoints - generous limits
    'public:health': {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 1000, // 1000 health checks per minute
      blockDurationMs: 60 * 1000, // Block for 1 minute
    },
  };

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Check rate limit for a request
   */
  async checkRateLimit(
    req: Request,
    category: string,
    customConfig?: Partial<RateLimitConfig>,
  ): Promise<RateLimitResult> {
    const config = { ...this.rateLimitConfigs[category], ...customConfig };
    if (!config) {
      throw new Error(`Rate limit configuration not found for category: ${category}`);
    }

    const key = this.generateKey(req, category, config);
    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      // Use Redis pipeline for atomic operations
      const pipeline = this.redis.pipeline();
      
      // Remove expired entries
      pipeline.zremrangebyscore(key, 0, windowStart);
      
      // Count current requests in window
      pipeline.zcard(key);
      
      // Add current request
      pipeline.zadd(key, now, `${now}-${Math.random()}`);
      
      // Set expiry
      pipeline.expire(key, Math.ceil(config.windowMs / 1000));

      const results = await pipeline.exec();
      const currentCount = results[1][1] as number;

      // Check if limit exceeded
      if (currentCount >= config.maxRequests) {
        // Check if already blocked
        const blockKey = `${key}:blocked`;
        const isBlocked = await this.redis.get(blockKey);
        
        if (!isBlocked && config.blockDurationMs) {
          // Set block
          await this.redis.setex(
            blockKey,
            Math.ceil(config.blockDurationMs / 1000),
            now.toString(),
          );
          
          // Log security event
          await this.logSecurityEvent(req, category, 'rate_limit_exceeded', {
            currentCount,
            maxRequests: config.maxRequests,
            windowMs: config.windowMs,
          });
        }

        const resetTime = new Date(now + config.windowMs);
        const retryAfter = config.blockDurationMs 
          ? Math.ceil(config.blockDurationMs / 1000)
          : Math.ceil(config.windowMs / 1000);

        return {
          allowed: false,
          totalHits: currentCount + 1,
          remainingPoints: 0,
          resetTime,
          retryAfter,
        };
      }

      const resetTime = new Date(now + config.windowMs);
      return {
        allowed: true,
        totalHits: currentCount + 1,
        remainingPoints: config.maxRequests - (currentCount + 1),
        resetTime,
      };

    } catch (error) {
      this.logger.error(`Rate limiting error for key ${key}`, error);
      // Fail open - allow request if Redis is down
      return {
        allowed: true,
        totalHits: 0,
        remainingPoints: 999,
        resetTime: new Date(now + config.windowMs),
      };
    }
  }

  /**
   * Check if IP/user is currently blocked
   */
  async isBlocked(req: Request, category: string): Promise<boolean> {
    const config = this.rateLimitConfigs[category];
    if (!config) return false;

    const key = this.generateKey(req, category, config);
    const blockKey = `${key}:blocked`;
    
    try {
      const blocked = await this.redis.get(blockKey);
      return blocked !== null;
    } catch (error) {
      this.logger.error(`Error checking block status for ${blockKey}`, error);
      return false; // Fail open
    }
  }

  /**
   * Manually block an IP/user
   */
  async blockKey(
    req: Request,
    category: string,
    durationMs: number,
    reason: string,
  ): Promise<void> {
    const config = this.rateLimitConfigs[category];
    if (!config) return;

    const key = this.generateKey(req, category, config);
    const blockKey = `${key}:blocked`;
    
    try {
      await this.redis.setex(
        blockKey,
        Math.ceil(durationMs / 1000),
        JSON.stringify({
          blockedAt: Date.now(),
          reason,
          duration: durationMs,
        }),
      );

      await this.logSecurityEvent(req, category, 'manual_block', {
        reason,
        durationMs,
      });

      this.logger.warn(`Manually blocked ${key} for ${reason}`);
    } catch (error) {
      this.logger.error(`Error blocking key ${blockKey}`, error);
    }
  }

  /**
   * Unblock an IP/user
   */
  async unblockKey(req: Request, category: string, reason: string): Promise<void> {
    const config = this.rateLimitConfigs[category];
    if (!config) return;

    const key = this.generateKey(req, category, config);
    const blockKey = `${key}:blocked`;
    
    try {
      await this.redis.del(blockKey);
      
      await this.logSecurityEvent(req, category, 'manual_unblock', {
        reason,
      });

      this.logger.log(`Manually unblocked ${key} for ${reason}`);
    } catch (error) {
      this.logger.error(`Error unblocking key ${blockKey}`, error);
    }
  }

  /**
   * Detect attack patterns based on request behavior
   */
  async detectAttackPatterns(req: Request): Promise<AttackPattern[]> {
    const patterns: AttackPattern[] = [];
    const clientIp = this.getClientIp(req);
    const userAgent = req.get('User-Agent') || '';
    const path = req.path;

    try {
      // Check for brute force attacks
      const bruteForcePattern = await this.detectBruteForce(clientIp);
      if (bruteForcePattern) {
        patterns.push(bruteForcePattern);
      }

      // Check for DDoS patterns
      const ddosPattern = await this.detectDDoS(clientIp);
      if (ddosPattern) {
        patterns.push(ddosPattern);
      }

      // Check for credential stuffing
      const credentialStuffingPattern = await this.detectCredentialStuffing(clientIp, userAgent);
      if (credentialStuffingPattern) {
        patterns.push(credentialStuffingPattern);
      }

      // Check for enumeration attacks
      const enumerationPattern = await this.detectEnumeration(clientIp, path);
      if (enumerationPattern) {
        patterns.push(enumerationPattern);
      }

      // Check for scraping behavior
      const scrapingPattern = await this.detectScraping(clientIp, userAgent, path);
      if (scrapingPattern) {
        patterns.push(scrapingPattern);
      }

    } catch (error) {
      this.logger.error('Error detecting attack patterns', error);
    }

    return patterns;
  }

  /**
   * Get rate limiting statistics
   */
  async getStatistics(timeRange: 'hour' | 'day' | 'week' = 'hour'): Promise<{
    totalRequests: number;
    blockedRequests: number;
    topBlockedIPs: Array<{ ip: string; count: number }>;
    attackPatterns: Array<{ type: string; count: number }>;
    categories: Array<{ category: string; requests: number; blocks: number }>;
  }> {
    const now = Date.now();
    const ranges = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
    };
    
    const rangeMs = ranges[timeRange];
    const startTime = now - rangeMs;

    try {
      // Get statistics from Redis
      const statsKey = `rate_limit:stats:${timeRange}`;
      const stats = await this.redis.hgetall(statsKey);

      // In a full implementation, you'd aggregate real data
      // For now, return mock statistics
      return {
        totalRequests: parseInt(stats.totalRequests || '0'),
        blockedRequests: parseInt(stats.blockedRequests || '0'),
        topBlockedIPs: [
          { ip: '192.168.1.100', count: 45 },
          { ip: '10.0.0.50', count: 23 },
          { ip: '172.16.0.75', count: 12 },
        ],
        attackPatterns: [
          { type: 'brute_force', count: 15 },
          { type: 'ddos', count: 8 },
          { type: 'enumeration', count: 5 },
        ],
        categories: [
          { category: 'auth:login', requests: 1250, blocks: 45 },
          { category: 'api:general', requests: 8500, blocks: 12 },
          { category: 'api:search', requests: 2100, blocks: 8 },
        ],
      };
    } catch (error) {
      this.logger.error('Error getting rate limiting statistics', error);
      return {
        totalRequests: 0,
        blockedRequests: 0,
        topBlockedIPs: [],
        attackPatterns: [],
        categories: [],
      };
    }
  }

  /**
   * Adaptive rate limiting based on system load
   */
  async getAdaptiveRateLimit(
    baseConfig: RateLimitConfig,
    systemLoad: number, // 0-100
  ): Promise<RateLimitConfig> {
    // Adjust limits based on system load
    let multiplier = 1;
    
    if (systemLoad > 90) {
      multiplier = 0.1; // Very restrictive
    } else if (systemLoad > 80) {
      multiplier = 0.3; // Restrictive
    } else if (systemLoad > 70) {
      multiplier = 0.5; // Moderate
    } else if (systemLoad > 60) {
      multiplier = 0.7; // Slightly restrictive
    }

    return {
      ...baseConfig,
      maxRequests: Math.max(1, Math.floor(baseConfig.maxRequests * multiplier)),
      blockDurationMs: baseConfig.blockDurationMs 
        ? Math.floor(baseConfig.blockDurationMs * (2 - multiplier))
        : undefined,
    };
  }

  // Private helper methods

  private generateKey(req: Request, category: string, config: RateLimitConfig): string {
    if (config.keyGenerator) {
      return `rate_limit:${category}:${config.keyGenerator(req)}`;
    }

    const clientIp = this.getClientIp(req);
    const userId = (req as any).user?.id;
    
    // Use user ID if authenticated, otherwise IP
    const identifier = userId || clientIp;
    return `rate_limit:${category}:${identifier}`;
  }

  private getClientIp(req: Request): string {
    return (
      req.get('CF-Connecting-IP') || // Cloudflare
      req.get('X-Forwarded-For')?.split(',')[0] || // Load balancer
      req.get('X-Real-IP') || // Nginx
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      '127.0.0.1'
    );
  }

  private async logSecurityEvent(
    req: Request,
    category: string,
    event: string,
    details: any,
  ): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      category,
      ip: this.getClientIp(req),
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      userId: (req as any).user?.id,
      details,
    };

    try {
      // Store in Redis for immediate access
      const logKey = `security_events:${Date.now()}:${Math.random()}`;
      await this.redis.setex(logKey, 7 * 24 * 60 * 60, JSON.stringify(logEntry)); // 7 days

      // In production, also send to logging service
      this.logger.warn(`Security event: ${event}`, logEntry);
    } catch (error) {
      this.logger.error('Error logging security event', error);
    }
  }

  private async detectBruteForce(clientIp: string): Promise<AttackPattern | null> {
    const key = `brute_force:${clientIp}`;
    const window = 5 * 60 * 1000; // 5 minutes
    const threshold = 10; // 10 failed attempts

    try {
      const count = await this.redis.zcount(key, Date.now() - window, Date.now());
      
      if (count >= threshold) {
        return {
          type: 'brute_force',
          severity: 'high',
          confidence: Math.min(100, (count / threshold) * 100),
          indicators: [
            `${count} failed login attempts in 5 minutes`,
            `IP: ${clientIp}`,
          ],
          recommendedAction: 'block',
        };
      }
    } catch (error) {
      this.logger.error('Error detecting brute force', error);
    }

    return null;
  }

  private async detectDDoS(clientIp: string): Promise<AttackPattern | null> {
    const key = `ddos:${clientIp}`;
    const window = 60 * 1000; // 1 minute
    const threshold = 200; // 200 requests per minute

    try {
      const count = await this.redis.zcount(key, Date.now() - window, Date.now());
      
      if (count >= threshold) {
        return {
          type: 'ddos',
          severity: 'critical',
          confidence: Math.min(100, (count / threshold) * 100),
          indicators: [
            `${count} requests in 1 minute`,
            `IP: ${clientIp}`,
          ],
          recommendedAction: 'block',
        };
      }
    } catch (error) {
      this.logger.error('Error detecting DDoS', error);
    }

    return null;
  }

  private async detectCredentialStuffing(
    clientIp: string,
    userAgent: string,
  ): Promise<AttackPattern | null> {
    // Look for patterns indicating credential stuffing
    const suspiciousUserAgents = [
      'python-requests',
      'curl',
      'wget',
      'PostmanRuntime',
    ];

    const key = `credential_stuffing:${clientIp}`;
    const window = 10 * 60 * 1000; // 10 minutes
    const threshold = 20; // 20 different login attempts

    try {
      const count = await this.redis.zcount(key, Date.now() - window, Date.now());
      const isSuspiciousUA = suspiciousUserAgents.some(ua => 
        userAgent.toLowerCase().includes(ua.toLowerCase())
      );
      
      if (count >= threshold || (count >= 5 && isSuspiciousUA)) {
        return {
          type: 'credential_stuffing',
          severity: 'high',
          confidence: isSuspiciousUA ? 90 : Math.min(80, (count / threshold) * 100),
          indicators: [
            `${count} login attempts with different credentials`,
            `Suspicious User-Agent: ${userAgent}`,
            `IP: ${clientIp}`,
          ],
          recommendedAction: 'captcha',
        };
      }
    } catch (error) {
      this.logger.error('Error detecting credential stuffing', error);
    }

    return null;
  }

  private async detectEnumeration(clientIp: string, path: string): Promise<AttackPattern | null> {
    // Detect user/resource enumeration attempts
    const enumerationPaths = ['/users/', '/api/users/', '/admin/users/'];
    const isEnumerationPath = enumerationPaths.some(p => path.includes(p));
    
    if (!isEnumerationPath) return null;

    const key = `enumeration:${clientIp}`;
    const window = 5 * 60 * 1000; // 5 minutes
    const threshold = 50; // 50 enumeration requests

    try {
      const count = await this.redis.zcount(key, Date.now() - window, Date.now());
      
      if (count >= threshold) {
        return {
          type: 'enumeration',
          severity: 'medium',
          confidence: Math.min(100, (count / threshold) * 100),
          indicators: [
            `${count} enumeration requests in 5 minutes`,
            `Path pattern: ${path}`,
            `IP: ${clientIp}`,
          ],
          recommendedAction: 'throttle',
        };
      }
    } catch (error) {
      this.logger.error('Error detecting enumeration', error);
    }

    return null;
  }

  private async detectScraping(
    clientIp: string,
    userAgent: string,
    path: string,
  ): Promise<AttackPattern | null> {
    const scrapingIndicators = [
      'bot',
      'crawler',
      'spider',
      'scraper',
      'python',
      'curl',
      'wget',
    ];

    const isSuspiciousUA = scrapingIndicators.some(indicator =>
      userAgent.toLowerCase().includes(indicator)
    );

    const key = `scraping:${clientIp}`;
    const window = 60 * 1000; // 1 minute
    const threshold = 30; // 30 requests per minute

    try {
      const count = await this.redis.zcount(key, Date.now() - window, Date.now());
      
      if ((count >= threshold) || (count >= 10 && isSuspiciousUA)) {
        return {
          type: 'scraping',
          severity: 'low',
          confidence: isSuspiciousUA ? 85 : Math.min(70, (count / threshold) * 100),
          indicators: [
            `${count} requests in 1 minute`,
            `Suspicious User-Agent: ${userAgent}`,
            `IP: ${clientIp}`,
          ],
          recommendedAction: 'monitor',
        };
      }
    } catch (error) {
      this.logger.error('Error detecting scraping', error);
    }

    return null;
  }
}
