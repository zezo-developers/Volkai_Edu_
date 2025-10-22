import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as crypto from 'crypto';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for invalidation
  compress?: boolean; // Enable compression for large values
  serialize?: boolean; // Custom serialization
  namespace?: string; // Cache namespace
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
  memoryUsage: number;
  keyCount: number;
}

export interface CacheKey {
  key: string;
  namespace?: string;
  tags?: string[];
  size: number;
  ttl: number;
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
}

@Injectable()
export class AdvancedCacheService {
  private readonly logger = new Logger(AdvancedCacheService.name);
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    hitRate: 0,
    memoryUsage: 0,
    keyCount: 0,
  };
  private keyMetadata: Map<string, CacheKey> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
  ) {}

  // Enhanced get method with statistics and compression
  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    const fullKey = this.buildKey(key, options?.namespace);
    
    try {
      let value = await this.cacheManager.get<string>(fullKey);
      
      if (value === null || value === undefined) {
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }

      this.stats.hits++;
      this.updateKeyAccess(fullKey);
      this.updateHitRate();

      // Handle decompression and deserialization
      if (options?.compress && value.startsWith('compressed:')) {
        value = this.decompress(value.substring(11));
      }

      if (options?.serialize !== false) {
        try {
          return JSON.parse(value);
        } catch {
          return value as T;
        }
      }

      return value as T;
    } catch (error) {
      this.logger.error(`Cache get error for key ${fullKey}: ${error.message}`);
      return null;
    }
  }

  // Enhanced set method with compression and tagging
  async set<T>(
    key: string, 
    value: T, 
    options?: CacheOptions
  ): Promise<void> {
    const fullKey = this.buildKey(key, options?.namespace);
    const ttl = options?.ttl || 300; // Default 5 minutes

    try {
      let serializedValue: string;
      
      if (options?.serialize !== false) {
        serializedValue = JSON.stringify(value);
      } else {
        serializedValue = value as string;
      }

      // Compress large values
      if (options?.compress || serializedValue.length > 1024) {
        serializedValue = 'compressed:' + this.compress(serializedValue);
      }

      await this.cacheManager.set(fullKey, serializedValue, ttl * 1000);
      
      this.stats.sets++;
      this.updateKeyMetadata(fullKey, serializedValue, ttl, options?.tags);
      
      // Update tag index
      if (options?.tags) {
        this.updateTagIndex(fullKey, options.tags);
      }

    } catch (error) {
      this.logger.error(`Cache set error for key ${fullKey}: ${error.message}`);
    }
  }

  // Multi-get for batch operations
  async mget<T>(keys: string[], options?: CacheOptions): Promise<(T | null)[]> {
    const promises = keys.map(key => this.get<T>(key, options));
    return Promise.all(promises);
  }

  // Multi-set for batch operations
  async mset<T>(
    entries: Array<{ key: string; value: T; options?: CacheOptions }>
  ): Promise<void> {
    const promises = entries.map(entry => 
      this.set(entry.key, entry.value, entry.options)
    );
    await Promise.all(promises);
  }

  // Delete single key
  async del(key: string, namespace?: string): Promise<void> {
    const fullKey = this.buildKey(key, namespace);
    
    try {
      await this.cacheManager.del(fullKey);
      this.stats.deletes++;
      this.removeKeyMetadata(fullKey);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${fullKey}: ${error.message}`);
    }
  }

  // Delete multiple keys
  async mdel(keys: string[], namespace?: string): Promise<void> {
    const promises = keys.map(key => this.del(key, namespace));
    await Promise.all(promises);
  }

  // Cache-aside pattern with automatic refresh
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    let value = await this.get<T>(key, options);
    
    if (value === null) {
      value = await factory();
      await this.set(key, value, options);
    }
    
    return value;
  }

  // Invalidate by tags
  async invalidateByTags(tags: string[]): Promise<void> {
    const keysToDelete = new Set<string>();
    
    for (const tag of tags) {
      const taggedKeys = this.tagIndex.get(tag);
      if (taggedKeys) {
        taggedKeys.forEach(key => keysToDelete.add(key));
      }
    }

    if (keysToDelete.size > 0) {
      await this.mdel(Array.from(keysToDelete));
      this.logger.log(`Invalidated ${keysToDelete.size} keys by tags: ${tags.join(', ')}`);
    }
  }

  // Invalidate by pattern
  async invalidateByPattern(pattern: string): Promise<void> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const keysToDelete: string[] = [];

    for (const [key] of this.keyMetadata) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    if (keysToDelete.length > 0) {
      await this.mdel(keysToDelete);
      this.logger.log(`Invalidated ${keysToDelete.length} keys by pattern: ${pattern}`);
    }
  }

  // Namespace operations
  async clearNamespace(namespace: string): Promise<void> {
    const prefix = `${namespace}:`;
    const keysToDelete: string[] = [];

    for (const [key] of this.keyMetadata) {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    }

    if (keysToDelete.length > 0) {
      await this.mdel(keysToDelete);
      this.logger.log(`Cleared ${keysToDelete.length} keys from namespace: ${namespace}`);
    }
  }

  // Cache warming
  async warmCache(
    entries: Array<{
      key: string;
      factory: () => Promise<any>;
      options?: CacheOptions;
    }>
  ): Promise<void> {
    this.logger.log(`Warming cache with ${entries.length} entries...`);
    
    const promises = entries.map(async entry => {
      try {
        const value = await entry.factory();
        await this.set(entry.key, value, entry.options);
      } catch (error) {
        this.logger.error(`Cache warming failed for key ${entry.key}: ${error.message}`);
      }
    });

    await Promise.all(promises);
    this.logger.log('Cache warming completed');
  }

  // Statistics and monitoring
  getStats(): CacheStats {
    this.stats.keyCount = this.keyMetadata.size;
    this.stats.memoryUsage = this.calculateMemoryUsage();
    return { ...this.stats };
  }

  getKeyInfo(key: string, namespace?: string): CacheKey | null {
    const fullKey = this.buildKey(key, namespace);
    return this.keyMetadata.get(fullKey) || null;
  }

  getTopKeys(limit: number = 10): CacheKey[] {
    return Array.from(this.keyMetadata.values())
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);
  }

  getKeysByTag(tag: string): string[] {
    const taggedKeys = this.tagIndex.get(tag);
    return taggedKeys ? Array.from(taggedKeys) : [];
  }

  // Health check
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    stats: CacheStats;
    issues: string[];
  }> {
    const issues: string[] = [];
    const stats = this.getStats();
    
    // Check hit rate
    if (stats.hitRate < 50) {
      issues.push('Low cache hit rate');
    }
    
    // Check memory usage (if available)
    if (stats.memoryUsage > 1024 * 1024 * 100) { // 100MB
      issues.push('High memory usage');
    }
    
    // Check if cache is responsive
    try {
      const testKey = 'health_check_' + Date.now();
      await this.set(testKey, 'test', { ttl: 1 });
      const value = await this.get(testKey);
      await this.del(testKey);
      
      if (value !== 'test') {
        issues.push('Cache read/write test failed');
      }
    } catch (error) {
      issues.push(`Cache connectivity issue: ${error.message}`);
    }

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (issues.length > 0) {
      status = issues.length > 2 ? 'unhealthy' : 'degraded';
    }

    return { status, stats, issues };
  }

  // Scheduled maintenance
  @Cron(CronExpression.EVERY_HOUR)
  async performMaintenance(): Promise<void> {
    try {
      // Clean expired key metadata
      const now = new Date();
      const expiredKeys: string[] = [];

      for (const [key, metadata] of this.keyMetadata) {
        const expiresAt = new Date(metadata.createdAt.getTime() + metadata.ttl * 1000);
        if (now > expiresAt) {
          expiredKeys.push(key);
        }
      }

      // Remove expired metadata
      for (const key of expiredKeys) {
        this.removeKeyMetadata(key);
      }

      // Update statistics
      this.stats.keyCount = this.keyMetadata.size;
      
      if (expiredKeys.length > 0) {
        this.logger.log(`Cleaned up ${expiredKeys.length} expired cache entries`);
      }

    } catch (error) {
      this.logger.error(`Cache maintenance error: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateReport(): Promise<void> {
    const stats = this.getStats();
    const topKeys = this.getTopKeys(5);
    
    this.logger.log(`Daily Cache Report:
      - Hit Rate: ${stats.hitRate.toFixed(2)}%
      - Total Keys: ${stats.keyCount}
      - Memory Usage: ${(stats.memoryUsage / 1024 / 1024).toFixed(2)} MB
      - Operations: ${stats.hits + stats.misses} gets, ${stats.sets} sets, ${stats.deletes} deletes
      - Top Keys: ${topKeys.map(k => `${k.key} (${k.accessCount} hits)`).join(', ')}`);
  }

  // Private helper methods
  private buildKey(key: string, namespace?: string): string {
    return namespace ? `${namespace}:${key}` : key;
  }

  private updateKeyMetadata(
    key: string, 
    value: string, 
    ttl: number, 
    tags?: string[]
  ): void {
    const existing = this.keyMetadata.get(key);
    const now = new Date();
    
    this.keyMetadata.set(key, {
      key,
      tags: tags || [],
      size: Buffer.byteLength(value, 'utf8'),
      ttl,
      createdAt: existing?.createdAt || now,
      lastAccessed: now,
      accessCount: existing?.accessCount || 0,
    });
  }

  private updateKeyAccess(key: string): void {
    const metadata = this.keyMetadata.get(key);
    if (metadata) {
      metadata.lastAccessed = new Date();
      metadata.accessCount++;
    }
  }

  private removeKeyMetadata(key: string): void {
    const metadata = this.keyMetadata.get(key);
    if (metadata?.tags) {
      // Remove from tag index
      for (const tag of metadata.tags) {
        const taggedKeys = this.tagIndex.get(tag);
        if (taggedKeys) {
          taggedKeys.delete(key);
          if (taggedKeys.size === 0) {
            this.tagIndex.delete(tag);
          }
        }
      }
    }
    this.keyMetadata.delete(key);
  }

  private updateTagIndex(key: string, tags: string[]): void {
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(key);
    }
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  private calculateMemoryUsage(): number {
    let totalSize = 0;
    for (const metadata of this.keyMetadata.values()) {
      totalSize += metadata.size;
    }
    return totalSize;
  }

  private compress(data: string): string {
    // Simple compression using zlib (in production, consider better algorithms)
    const zlib = require('zlib');
    return zlib.deflateSync(data).toString('base64');
  }

  private decompress(data: string): string {
    const zlib = require('zlib');
    return zlib.inflateSync(Buffer.from(data, 'base64')).toString();
  }

  // Cache decorators support
  createCacheKey(prefix: string, ...args: any[]): string {
    const hash = crypto
      .createHash('md5')
      .update(JSON.stringify(args))
      .digest('hex');
    return `${prefix}:${hash}`;
  }

  // Distributed cache invalidation (for multi-instance deployments)
  async broadcastInvalidation(pattern: string): Promise<void> {
    // In production, this would use Redis pub/sub or similar
    // For now, just log the invalidation
    this.logger.log(`Broadcasting cache invalidation for pattern: ${pattern}`);
    await this.invalidateByPattern(pattern);
  }
}
