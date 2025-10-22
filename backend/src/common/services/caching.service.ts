import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for invalidation
  compress?: boolean; // Enable compression for large values
  serialize?: boolean; // Enable JSON serialization
  namespace?: string; // Cache namespace
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalKeys: number;
  memoryUsage: number;
  evictedKeys: number;
  expiredKeys: number;
}

export interface CacheKey {
  key: string;
  ttl: number;
  size: number;
  tags: string[];
  createdAt: Date;
  lastAccessed: Date;
}

/**
 * Comprehensive Caching Service
 * Provides advanced Redis-based caching with intelligent invalidation and optimization
 */
@Injectable()
export class CachingService {
  private readonly logger = new Logger(CachingService.name);
  private readonly defaultTTL: number;
  private readonly compressionThreshold: number;
  private readonly maxValueSize: number;
  private stats: CacheStats;

  // Cache namespaces for different data types
  private readonly namespaces = {
    USER: 'user',
    COURSE: 'course',
    ORGANIZATION: 'org',
    QUERY: 'query',
    SESSION: 'session',
    API: 'api',
    SEARCH: 'search',
    FILE: 'file',
  };

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {
    this.defaultTTL = this.configService.get<number>('CACHE_DEFAULT_TTL', 3600); // 1 hour
    this.compressionThreshold = this.configService.get<number>('CACHE_COMPRESSION_THRESHOLD', 1024); // 1KB
    this.maxValueSize = this.configService.get<number>('CACHE_MAX_VALUE_SIZE', 1024 * 1024); // 1MB
    
    this.initializeStats();
    this.setupEventListeners();
  }

  /**
   * Get cached value with automatic deserialization
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const fullKey = this.buildKey(key, options.namespace);
    
    try {
      const value = await this.redis.get(fullKey);
      
      if (value === null) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      
      // Update last accessed time
      await this.updateLastAccessed(fullKey);
      
      // Deserialize value
      return this.deserializeValue<T>(value, options);
    } catch (error) {
      this.logger.error(`Cache get error for key ${fullKey}:`, error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set cached value with automatic serialization and compression
   */
  async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {},
  ): Promise<boolean> {
    const fullKey = this.buildKey(key, options.namespace);
    const ttl = options.ttl || this.defaultTTL;

    try {
      // Serialize value
      const serializedValue = this.serializeValue(value, options);
      
      // Check value size
      if (serializedValue.length > this.maxValueSize) {
        this.logger.warn(`Cache value too large for key ${fullKey}: ${serializedValue.length} bytes`);
        return false;
      }

      // Set value with TTL
      const result = await this.redis.setex(fullKey, ttl, serializedValue);
      
      // Store metadata
      await this.storeCacheMetadata(fullKey, {
        size: serializedValue.length,
        tags: options.tags || [],
        ttl,
      });

      return result === 'OK';
    } catch (error) {
      this.logger.error(`Cache set error for key ${fullKey}:`, error);
      return false;
    }
  }

  /**
   * Delete cached value
   */
  async del(key: string, namespace?: string): Promise<boolean> {
    const fullKey = this.buildKey(key, namespace);
    
    try {
      const result = await this.redis.del(fullKey);
      
      // Remove metadata
      await this.removeCacheMetadata(fullKey);
      
      return result > 0;
    } catch (error) {
      this.logger.error(`Cache delete error for key ${fullKey}:`, error);
      return false;
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string, namespace?: string): Promise<boolean> {
    const fullKey = this.buildKey(key, namespace);
    
    try {
      const result = await this.redis.exists(fullKey);
      return result === 1;
    } catch (error) {
      this.logger.error(`Cache exists error for key ${fullKey}:`, error);
      return false;
    }
  }

  /**
   * Get multiple cached values
   */
  async mget<T>(keys: string[], namespace?: string): Promise<(T | null)[]> {
    const fullKeys = keys.map(key => this.buildKey(key, namespace));
    
    try {
      const values = await this.redis.mget(...fullKeys);
      
      return values.map((value, index) => {
        if (value === null) {
          this.stats.misses++;
          return null;
        }
        
        this.stats.hits++;
        return this.deserializeValue<T>(value);
      });
    } catch (error) {
      this.logger.error(`Cache mget error:`, error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple cached values
   */
  async mset<T>(
    keyValuePairs: Array<{ key: string; value: T; options?: CacheOptions }>,
    namespace?: string,
  ): Promise<boolean> {
    try {
      const pipeline = this.redis.pipeline();
      
      for (const { key, value, options = {} } of keyValuePairs) {
        const fullKey = this.buildKey(key, namespace || options.namespace);
        const ttl = options.ttl || this.defaultTTL;
        const serializedValue = this.serializeValue(value, options);
        
        pipeline.setex(fullKey, ttl, serializedValue);
      }
      
      const results = await pipeline.exec();
      return results?.every(([error, result]) => error === null && result === 'OK') || false;
    } catch (error) {
      this.logger.error(`Cache mset error:`, error);
      return false;
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    let deletedCount = 0;
    
    try {
      for (const tag of tags) {
        const keys = await this.getKeysByTag(tag);
        
        if (keys.length > 0) {
          const deleted = await this.redis.del(...keys);
          deletedCount += deleted;
          
          // Remove metadata for deleted keys
          await Promise.all(keys.map(key => this.removeCacheMetadata(key)));
        }
      }
      
      this.logger.log(`Invalidated ${deletedCount} cache entries by tags: ${tags.join(', ')}`);
      return deletedCount;
    } catch (error) {
      this.logger.error(`Cache invalidation error for tags ${tags.join(', ')}:`, error);
      return 0;
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidateByPattern(pattern: string, namespace?: string): Promise<number> {
    const fullPattern = this.buildKey(pattern, namespace);
    
    try {
      const keys = await this.redis.keys(fullPattern);
      
      if (keys.length === 0) {
        return 0;
      }
      
      const deleted = await this.redis.del(...keys);
      
      // Remove metadata for deleted keys
      await Promise.all(keys.map(key => this.removeCacheMetadata(key)));
      
      this.logger.log(`Invalidated ${deleted} cache entries by pattern: ${fullPattern}`);
      return deleted;
    } catch (error) {
      this.logger.error(`Cache invalidation error for pattern ${fullPattern}:`, error);
      return 0;
    }
  }

  /**
   * Clear entire cache namespace
   */
  async clearNamespace(namespace: string): Promise<number> {
    return this.invalidateByPattern('*', namespace);
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      
      // Parse memory usage
      const memoryMatch = info.match(/used_memory:(\d+)/);
      const memoryUsage = memoryMatch ? parseInt(memoryMatch[1], 10) : 0;
      
      // Parse total keys
      const keysMatch = keyspace.match(/keys=(\d+)/);
      const totalKeys = keysMatch ? parseInt(keysMatch[1], 10) : 0;
      
      // Calculate hit rate
      const totalRequests = this.stats.hits + this.stats.misses;
      const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;
      
      return {
        ...this.stats,
        hitRate: Math.round(hitRate * 100) / 100,
        totalKeys,
        memoryUsage,
      };
    } catch (error) {
      this.logger.error('Error getting cache stats:', error);
      return this.stats;
    }
  }

  /**
   * Get cache keys with metadata
   */
  async getCacheKeys(namespace?: string, limit: number = 100): Promise<CacheKey[]> {
    const pattern = namespace ? `${namespace}:*` : '*';
    
    try {
      const keys = await this.redis.keys(pattern);
      const limitedKeys = keys.slice(0, limit);
      
      const cacheKeys: CacheKey[] = [];
      
      for (const key of limitedKeys) {
        const ttl = await this.redis.ttl(key);
        const metadata = await this.getCacheMetadata(key);
        
        cacheKeys.push({
          key,
          ttl,
          size: metadata?.size || 0,
          tags: metadata?.tags || [],
          createdAt: metadata?.createdAt || new Date(),
          lastAccessed: metadata?.lastAccessed || new Date(),
        });
      }
      
      return cacheKeys.sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime());
    } catch (error) {
      this.logger.error('Error getting cache keys:', error);
      return [];
    }
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUp(warmUpData: Array<{ key: string; value: any; options?: CacheOptions }>): Promise<void> {
    this.logger.log(`Warming up cache with ${warmUpData.length} entries...`);
    
    try {
      const pipeline = this.redis.pipeline();
      
      for (const { key, value, options = {} } of warmUpData) {
        const fullKey = this.buildKey(key, options.namespace);
        const ttl = options.ttl || this.defaultTTL;
        const serializedValue = this.serializeValue(value, options);
        
        pipeline.setex(fullKey, ttl, serializedValue);
      }
      
      await pipeline.exec();
      this.logger.log('Cache warm-up completed');
    } catch (error) {
      this.logger.error('Cache warm-up error:', error);
    }
  }

  /**
   * Optimize cache by removing expired and least recently used entries
   */
  async optimize(): Promise<{
    removedExpired: number;
    removedLRU: number;
    compactedMemory: number;
  }> {
    this.logger.log('Starting cache optimization...');
    
    try {
      // Remove expired keys
      const expiredKeys = await this.findExpiredKeys();
      const removedExpired = expiredKeys.length > 0 ? await this.redis.del(...expiredKeys) : 0;
      
      // Get memory usage before optimization
      const memoryBefore = await this.getMemoryUsage();
      
      // Remove least recently used keys if memory usage is high
      let removedLRU = 0;
      if (memoryBefore > 100 * 1024 * 1024) { // 100MB threshold
        const lruKeys = await this.findLRUKeys(100);
        removedLRU = lruKeys.length > 0 ? await this.redis.del(...lruKeys) : 0;
      }
      
      // Get memory usage after optimization
      const memoryAfter = await this.getMemoryUsage();
      const compactedMemory = memoryBefore - memoryAfter;
      
      this.logger.log(`Cache optimization completed: ${removedExpired} expired, ${removedLRU} LRU, ${compactedMemory} bytes freed`);
      
      return {
        removedExpired,
        removedLRU,
        compactedMemory,
      };
    } catch (error) {
      this.logger.error('Cache optimization error:', error);
      return { removedExpired: 0, removedLRU: 0, compactedMemory: 0 };
    }
  }

  // Private helper methods

  private buildKey(key: string, namespace?: string): string {
    const ns = namespace || this.namespaces.API;
    return `${ns}:${key}`;
  }

  private serializeValue<T>(value: T, options: CacheOptions = {}): string {
    if (options.serialize === false) {
      return String(value);
    }

    const serialized = JSON.stringify(value);
    
    // Apply compression if value is large enough
    if (options.compress && serialized.length > this.compressionThreshold) {
      return this.compressValue(serialized);
    }
    
    return serialized;
  }

  private deserializeValue<T>(value: string, options: CacheOptions = {}): T {
    if (options.serialize === false) {
      return value as unknown as T;
    }

    try {
      // Check if value is compressed
      const decompressed = this.isCompressed(value) ? this.decompressValue(value) : value;
      return JSON.parse(decompressed);
    } catch (error) {
      this.logger.error('Cache deserialization error:', error);
      return value as unknown as T;
    }
  }

  private compressValue(value: string): string {
    // Simple compression implementation - in production, use a proper compression library
    return `compressed:${Buffer.from(value).toString('base64')}`;
  }

  private decompressValue(value: string): string {
    if (!value.startsWith('compressed:')) {
      return value;
    }
    
    const compressed = value.replace('compressed:', '');
    return Buffer.from(compressed, 'base64').toString('utf8');
  }

  private isCompressed(value: string): boolean {
    return value.startsWith('compressed:');
  }

  private async storeCacheMetadata(key: string, metadata: {
    size: number;
    tags: string[];
    ttl: number;
  }): Promise<void> {
    const metadataKey = `meta:${key}`;
    const metadataValue = {
      ...metadata,
      createdAt: new Date(),
      lastAccessed: new Date(),
    };
    
    try {
      await this.redis.setex(metadataKey, metadata.ttl, JSON.stringify(metadataValue));
      
      // Store tag associations
      for (const tag of metadata.tags) {
        await this.redis.sadd(`tag:${tag}`, key);
        await this.redis.expire(`tag:${tag}`, metadata.ttl);
      }
    } catch (error) {
      this.logger.error(`Error storing cache metadata for ${key}:`, error);
    }
  }

  private async getCacheMetadata(key: string): Promise<any> {
    const metadataKey = `meta:${key}`;
    
    try {
      const metadata = await this.redis.get(metadataKey);
      return metadata ? JSON.parse(metadata) : null;
    } catch (error) {
      return null;
    }
  }

  private async removeCacheMetadata(key: string): Promise<void> {
    const metadataKey = `meta:${key}`;
    
    try {
      // Get metadata to find tags
      const metadata = await this.getCacheMetadata(key);
      
      // Remove tag associations
      if (metadata?.tags) {
        for (const tag of metadata.tags) {
          await this.redis.srem(`tag:${tag}`, key);
        }
      }
      
      // Remove metadata
      await this.redis.del(metadataKey);
    } catch (error) {
      this.logger.error(`Error removing cache metadata for ${key}:`, error);
    }
  }

  private async updateLastAccessed(key: string): Promise<void> {
    const metadataKey = `meta:${key}`;
    
    try {
      const metadata = await this.getCacheMetadata(key);
      if (metadata) {
        metadata.lastAccessed = new Date();
        await this.redis.setex(metadataKey, await this.redis.ttl(key), JSON.stringify(metadata));
      }
    } catch (error) {
      // Ignore errors for performance
    }
  }

  private async getKeysByTag(tag: string): Promise<string[]> {
    try {
      return await this.redis.smembers(`tag:${tag}`);
    } catch (error) {
      return [];
    }
  }

  private async findExpiredKeys(): Promise<string[]> {
    // This is a simplified implementation
    // In practice, Redis handles expired key cleanup automatically
    return [];
  }

  private async findLRUKeys(limit: number): Promise<string[]> {
    try {
      const keys = await this.getCacheKeys(undefined, limit * 2);
      return keys
        .sort((a, b) => a.lastAccessed.getTime() - b.lastAccessed.getTime())
        .slice(0, limit)
        .map(k => k.key);
    } catch (error) {
      return [];
    }
  }

  private async getMemoryUsage(): Promise<number> {
    try {
      const info = await this.redis.info('memory');
      const match = info.match(/used_memory:(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    } catch (error) {
      return 0;
    }
  }

  private initializeStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalKeys: 0,
      memoryUsage: 0,
      evictedKeys: 0,
      expiredKeys: 0,
    };
  }

  private setupEventListeners(): void {
    // Setup periodic cache optimization
    setInterval(async () => {
      try {
        await this.optimize();
      } catch (error) {
        this.logger.error('Scheduled cache optimization error:', error);
      }
    }, 60 * 60 * 1000); // Every hour
  }

  // Namespace-specific helper methods

  getUserCacheKey(userId: string, suffix?: string): string {
    return suffix ? `${userId}:${suffix}` : userId;
  }

  getCourseCacheKey(courseId: string, suffix?: string): string {
    return suffix ? `${courseId}:${suffix}` : courseId;
  }

  getOrganizationCacheKey(orgId: string, suffix?: string): string {
    return suffix ? `${orgId}:${suffix}` : orgId;
  }

  getQueryCacheKey(query: string, params?: any): string {
    const paramString = params ? JSON.stringify(params) : '';
    const hash = require('crypto').createHash('md5').update(query + paramString).digest('hex');
    return `query:${hash}`;
  }
}
