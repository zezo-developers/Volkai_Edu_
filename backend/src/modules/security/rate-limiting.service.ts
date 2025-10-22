import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: any) => string;
  onLimitReached?: (req: any) => void;
}

export interface RateLimitInfo {
  totalHits: number;
  totalHitsInWindow: number;
  remainingPoints: number;
  msBeforeNext: number;
  isFirstInDuration: boolean;
}

export interface DDoSMetrics {
  timestamp: Date;
  suspiciousIps: number;
  blockedRequests: number;
  totalRequests: number;
  averageRequestsPerIp: number;
  topOffendingIps: Array<{
    ip: string;
    requests: number;
    blocked: boolean;
  }>;
}

@Injectable()
export class RateLimitingService {
  private readonly logger = new Logger(RateLimitingService.name);
  
  // In-memory storage (in production, use Redis)
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();
  private blockedIps: Map<string, { until: number; reason: string }> = new Map();
  private suspiciousActivity: Map<string, { score: number; lastActivity: number }> = new Map();
  
  // DDoS detection
  private requestHistory: Array<{ ip: string; timestamp: number; endpoint: string }> = [];
  private readonly maxHistorySize = 10000;

  constructor(private configService: ConfigService) {}

  // Basic rate limiting
  async checkRateLimit(
    key: string,
    config: RateLimitConfig
  ): Promise<{ allowed: boolean; info: RateLimitInfo }> {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    // Clean up old entries
    this.cleanupExpiredEntries();
    
    const entry = this.requestCounts.get(key) || { count: 0, resetTime: now + config.windowMs };
    
    // Reset if window has passed
    if (now >= entry.resetTime) {
      entry.count = 0;
      entry.resetTime = now + config.windowMs;
    }
    
    const isFirstInDuration = entry.count === 0;
    entry.count++;
    
    this.requestCounts.set(key, entry);
    
    const allowed = entry.count <= config.maxRequests;
    const remainingPoints = Math.max(0, config.maxRequests - entry.count);
    const msBeforeNext = entry.resetTime - now;
    
    const info: RateLimitInfo = {
      totalHits: entry.count,
      totalHitsInWindow: entry.count,
      remainingPoints,
      msBeforeNext,
      isFirstInDuration,
    };
    
    if (!allowed && config.onLimitReached) {
      config.onLimitReached({ key, info });
    }
    
    return { allowed, info };
  }

  // Advanced DDoS detection
  async detectDDoS(
    ip: string,
    endpoint: string,
    userAgent?: string
  ): Promise<{
    isDDoS: boolean;
    suspicionScore: number;
    shouldBlock: boolean;
    reason?: string;
  }> {
    const now = Date.now();
    
    // Add to request history
    this.requestHistory.push({ ip, timestamp: now, endpoint });
    
    // Keep history size manageable
    if (this.requestHistory.length > this.maxHistorySize) {
      this.requestHistory = this.requestHistory.slice(-this.maxHistorySize);
    }
    
    // Calculate suspicion score
    const suspicionScore = this.calculateSuspicionScore(ip, endpoint, userAgent);
    
    // Update suspicious activity tracking
    this.suspiciousActivity.set(ip, {
      score: suspicionScore,
      lastActivity: now,
    });
    
    const isDDoS = suspicionScore >= 80;
    const shouldBlock = suspicionScore >= 90;
    
    let reason: string | undefined;
    if (isDDoS) {
      reason = this.getDDoSReason(ip, endpoint);
    }
    
    if (shouldBlock) {
      this.blockIp(ip, 'DDoS attack detected', 3600000); // Block for 1 hour
    }
    
    return {
      isDDoS,
      suspicionScore,
      shouldBlock,
      reason,
    };
  }

  // IP blocking management
  blockIp(ip: string, reason: string, durationMs: number): void {
    const until = Date.now() + durationMs;
    this.blockedIps.set(ip, { until, reason });
    
    this.logger.warn(`Blocked IP ${ip} for ${durationMs}ms. Reason: ${reason}`);
  }

  unblockIp(ip: string): void {
    this.blockedIps.delete(ip);
    this.logger.log(`Unblocked IP: ${ip}`);
  }

  isIpBlocked(ip: string): { blocked: boolean; reason?: string; until?: Date } {
    const blockInfo = this.blockedIps.get(ip);
    
    if (!blockInfo) {
      return { blocked: false };
    }
    
    if (Date.now() >= blockInfo.until) {
      this.blockedIps.delete(ip);
      return { blocked: false };
    }
    
    return {
      blocked: true,
      reason: blockInfo.reason,
      until: new Date(blockInfo.until),
    };
  }

  // Adaptive rate limiting based on system load
  async getAdaptiveRateLimit(baseConfig: RateLimitConfig): Promise<RateLimitConfig> {
    const systemLoad = await this.getSystemLoad();
    const adjustmentFactor = this.calculateAdjustmentFactor(systemLoad);
    
    return {
      ...baseConfig,
      maxRequests: Math.floor(baseConfig.maxRequests * adjustmentFactor),
      windowMs: baseConfig.windowMs,
    };
  }

  // Whitelist management
  private whitelist: Set<string> = new Set([
    '127.0.0.1',
    '::1',
    // Add trusted IPs here
  ]);

  addToWhitelist(ip: string): void {
    this.whitelist.add(ip);
    this.logger.log(`Added IP to whitelist: ${ip}`);
  }

  removeFromWhitelist(ip: string): void {
    this.whitelist.delete(ip);
    this.logger.log(`Removed IP from whitelist: ${ip}`);
  }

  isWhitelisted(ip: string): boolean {
    return this.whitelist.has(ip);
  }

  // Geolocation-based rate limiting
  async getGeoBasedRateLimit(
    ip: string,
    baseConfig: RateLimitConfig
  ): Promise<RateLimitConfig> {
    // In production, integrate with IP geolocation service
    const country = await this.getCountryFromIp(ip);
    
    // Apply different limits based on country risk profile
    const riskMultiplier = this.getCountryRiskMultiplier(country);
    
    return {
      ...baseConfig,
      maxRequests: Math.floor(baseConfig.maxRequests / riskMultiplier),
    };
  }

  getBlockedIps(): string[] {
    return Array.from(this.blockedIps.keys());
  }

  // Bot detection
  detectBot(userAgent?: string, ip?: string): {
    isBot: boolean;
    botType?: string;
    confidence: number;
  } {
    if (!userAgent) {
      return { isBot: true, botType: 'no-user-agent', confidence: 0.9 };
    }
    
    const botPatterns = [
      { pattern: /bot|crawler|spider|scraper/i, type: 'web-crawler', confidence: 0.95 },
      { pattern: /curl|wget|python|java|go-http/i, type: 'http-client', confidence: 0.8 },
      { pattern: /postman|insomnia|httpie/i, type: 'api-client', confidence: 0.6 },
      { pattern: /^$/i, type: 'empty-agent', confidence: 0.9 },
    ];
    
    for (const { pattern, type, confidence } of botPatterns) {
      if (pattern.test(userAgent)) {
        return { isBot: true, botType: type, confidence };
      }
    }
    
    // Check for suspicious patterns
    if (userAgent.length < 10 || userAgent.length > 500) {
      return { isBot: true, botType: 'suspicious-agent', confidence: 0.7 };
    }
    
    return { isBot: false, confidence: 0.1 };
  }

  // Metrics and monitoring
  getDDoSMetrics(): DDoSMetrics {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    
    const recentRequests = this.requestHistory.filter(r => r.timestamp >= oneHourAgo);
    
    // Count requests per IP
    const ipCounts = new Map<string, number>();
    recentRequests.forEach(req => {
      ipCounts.set(req.ip, (ipCounts.get(req.ip) || 0) + 1);
    });
    
    const totalRequests = recentRequests.length;
    const uniqueIps = ipCounts.size;
    const averageRequestsPerIp = uniqueIps > 0 ? totalRequests / uniqueIps : 0;
    
    // Find suspicious IPs (more than 100 requests per hour)
    const suspiciousIps = Array.from(ipCounts.entries())
      .filter(([, count]) => count > 100)
      .length;
    
    // Count blocked requests
    const blockedRequests = Array.from(this.blockedIps.values())
      .filter(block => block.until > now)
      .length;
    
    // Top offending IPs
    const topOffendingIps = Array.from(ipCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([ip, requests]) => ({
        ip,
        requests,
        blocked: this.isIpBlocked(ip).blocked,
      }));
    
    return {
      timestamp: new Date(),
      suspiciousIps,
      blockedRequests,
      totalRequests,
      averageRequestsPerIp,
      topOffendingIps,
    };
  }

  // Scheduled cleanup and monitoring
  @Cron(CronExpression.EVERY_MINUTE)
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    
    // Clean up rate limit entries
    for (const [key, entry] of this.requestCounts.entries()) {
      if (now >= entry.resetTime) {
        this.requestCounts.delete(key);
      }
    }
    
    // Clean up blocked IPs
    for (const [ip, block] of this.blockedIps.entries()) {
      if (now >= block.until) {
        this.blockedIps.delete(ip);
      }
    }
    
    // Clean up old request history
    const oneHourAgo = now - 3600000;
    this.requestHistory = this.requestHistory.filter(r => r.timestamp >= oneHourAgo);
    
    // Clean up suspicious activity
    const tenMinutesAgo = now - 600000;
    for (const [ip, activity] of this.suspiciousActivity.entries()) {
      if (activity.lastActivity < tenMinutesAgo) {
        this.suspiciousActivity.delete(ip);
      }
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  private generateSecurityReport(): void {
    const metrics = this.getDDoSMetrics();
    
    this.logger.log(`Hourly Security Report:
      - Total requests: ${metrics.totalRequests}
      - Suspicious IPs: ${metrics.suspiciousIps}
      - Blocked requests: ${metrics.blockedRequests}
      - Average requests per IP: ${metrics.averageRequestsPerIp.toFixed(2)}
      - Active blocks: ${this.blockedIps.size}
      - Rate limit entries: ${this.requestCounts.size}`);
    
    if (metrics.suspiciousIps > 10) {
      this.logger.warn(`High number of suspicious IPs detected: ${metrics.suspiciousIps}`);
    }
  }

  // Private helper methods
  private calculateSuspicionScore(ip: string, endpoint: string, userAgent?: string): number {
    let score = 0;
    const now = Date.now();
    const fiveMinutesAgo = now - 300000;
    
    // Count recent requests from this IP
    const recentRequests = this.requestHistory.filter(
      r => r.ip === ip && r.timestamp >= fiveMinutesAgo
    );
    
    // High request frequency
    if (recentRequests.length > 100) score += 40;
    else if (recentRequests.length > 50) score += 20;
    else if (recentRequests.length > 20) score += 10;
    
    // Endpoint diversity (low diversity = suspicious)
    const uniqueEndpoints = new Set(recentRequests.map(r => r.endpoint)).size;
    if (uniqueEndpoints === 1 && recentRequests.length > 10) score += 20;
    else if (uniqueEndpoints < 3 && recentRequests.length > 20) score += 15;
    
    // Bot detection
    const botInfo = this.detectBot(userAgent, ip);
    if (botInfo.isBot) {
      score += botInfo.confidence * 30;
    }
    
    // Previous suspicious activity
    const previousActivity = this.suspiciousActivity.get(ip);
    if (previousActivity && previousActivity.score > 50) {
      score += 20;
    }
    
    // Check if IP is already flagged
    if (this.isIpBlocked(ip).blocked) {
      score += 50;
    }
    
    return Math.min(100, score);
  }

  private getDDoSReason(ip: string, endpoint: string): string {
    const reasons = [];
    const now = Date.now();
    const fiveMinutesAgo = now - 300000;
    
    const recentRequests = this.requestHistory.filter(
      r => r.ip === ip && r.timestamp >= fiveMinutesAgo
    );
    
    if (recentRequests.length > 100) {
      reasons.push(`High request frequency: ${recentRequests.length} requests in 5 minutes`);
    }
    
    const uniqueEndpoints = new Set(recentRequests.map(r => r.endpoint)).size;
    if (uniqueEndpoints === 1) {
      reasons.push(`Targeting single endpoint: ${endpoint}`);
    }
    
    return reasons.join('; ');
  }

  private async getSystemLoad(): Promise<number> {
    // In production, get actual system metrics
    // For now, simulate based on current activity
    const activeConnections = this.requestCounts.size;
    const blockedIps = this.blockedIps.size;
    
    // Simple load calculation (0-1 scale)
    return Math.min(1, (activeConnections + blockedIps * 2) / 1000);
  }

  private calculateAdjustmentFactor(systemLoad: number): number {
    // Reduce rate limits when system is under high load
    if (systemLoad > 0.8) return 0.5;
    if (systemLoad > 0.6) return 0.7;
    if (systemLoad > 0.4) return 0.9;
    return 1.0;
  }

  private async getCountryFromIp(ip: string): Promise<string> {
    // In production, use IP geolocation service
    // For now, return default
    return 'US';
  }

  private getCountryRiskMultiplier(country: string): number {
    // Risk multipliers based on country (higher = more restrictive)
    const riskProfiles: Record<string, number> = {
      'CN': 2.0, // China
      'RU': 2.0, // Russia
      'KP': 3.0, // North Korea
      'IR': 2.5, // Iran
      'US': 1.0, // United States
      'CA': 1.0, // Canada
      'GB': 1.0, // United Kingdom
      'DE': 1.0, // Germany
      'FR': 1.0, // France
      'JP': 1.0, // Japan
      'AU': 1.0, // Australia
    };
    
    return riskProfiles[country] || 1.5; // Default for unknown countries
  }
}
