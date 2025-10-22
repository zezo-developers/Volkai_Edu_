import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, SelectQueryBuilder } from 'typeorm';
import { CachingService } from './caching.service';
import { ConfigService } from '@nestjs/config';

export interface QueryCacheOptions {
  ttl?: number;
  tags?: string[];
  invalidateOnWrite?: boolean;
  compress?: boolean;
  keyPrefix?: string;
}

export interface CachedQueryResult<T> {
  data: T[];
  count?: number;
  metadata: {
    query: string;
    parameters: any[];
    executionTime: number;
    cacheHit: boolean;
    cachedAt: Date;
    ttl: number;
  };
}

export interface QueryCacheStats {
  totalQueries: number;
  cachedQueries: number;
  cacheHitRate: number;
  averageExecutionTime: number;
  memorySaved: number;
  topCachedQueries: Array<{
    query: string;
    hitCount: number;
    avgExecutionTime: number;
  }>;
}

/**
 * Query Result Caching Service
 * Provides intelligent caching for database query results with automatic invalidation
 */
@Injectable()
export class QueryCacheService {
  private readonly logger = new Logger(QueryCacheService.name);
  private readonly defaultTTL: number;
  private readonly enableCaching: boolean;
  private queryStats: Map<string, { hits: number; totalTime: number }> = new Map();

  // Cache invalidation rules based on entity changes
  private readonly invalidationRules = {
    users: ['user:*', 'organization:*', 'enrollment:*'],
    organizations: ['organization:*', 'user:*', 'course:*'],
    courses: ['course:*', 'enrollment:*', 'lesson:*'],
    enrollments: ['enrollment:*', 'user:*', 'course:*'],
    lessons: ['lesson:*', 'course:*'],
    assessments: ['assessment:*', 'course:*', 'lesson:*'],
    files: ['file:*', 'course:*', 'user:*'],
  };

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly cachingService: CachingService,
    private readonly configService: ConfigService,
  ) {
    this.defaultTTL = this.configService.get<number>('QUERY_CACHE_TTL', 1800); // 30 minutes
    this.enableCaching = this.configService.get<boolean>('ENABLE_QUERY_CACHE', true);
  }

  /**
   * Execute query with caching
   */
  async executeQuery<T>(
    query: string,
    parameters: any[] = [],
    options: QueryCacheOptions = {},
  ): Promise<CachedQueryResult<T>> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(query, parameters, options.keyPrefix);
    
    if (!this.enableCaching) {
      return this.executeDirectQuery<T>(query, parameters, startTime, false);
    }

    try {
      // Try to get from cache first
      const cachedResult = await this.cachingService.get<CachedQueryResult<T>>(
        cacheKey,
        { namespace: 'query' }
      );

      if (cachedResult) {
        // Update query stats
        this.updateQueryStats(query, Date.now() - startTime, true);
        
        // Update metadata
        cachedResult.metadata.cacheHit = true;
        
        this.logger.debug(`Cache hit for query: ${query.substring(0, 100)}...`);
        return cachedResult;
      }

      // Execute query and cache result
      const result = await this.executeDirectQuery<T>(query, parameters, startTime, false);
      
      // Cache the result
      await this.cacheQueryResult(cacheKey, result, options);
      
      return result;
    } catch (error) {
      this.logger.error(`Query cache error: ${error.message}`);
      return this.executeDirectQuery<T>(query, parameters, startTime, false);
    }
  }

  /**
   * Execute query builder with caching
   */
  async executeQueryBuilder<T>(
    queryBuilder: SelectQueryBuilder<T>,
    options: QueryCacheOptions = {},
  ): Promise<CachedQueryResult<T>> {
    const query = queryBuilder.getQuery();
    const parameters = queryBuilder.getParameters();
    
    return this.executeQuery<T>(query, Object.values(parameters), options);
  }

  /**
   * Execute paginated query with caching
   */
  async executePaginatedQuery<T>(
    query: string,
    parameters: any[] = [],
    page: number = 1,
    limit: number = 20,
    options: QueryCacheOptions = {},
  ): Promise<CachedQueryResult<T> & { pagination: any }> {
    const offset = (page - 1) * limit;
    const paginatedQuery = `${query} LIMIT ${limit} OFFSET ${offset}`;
    const countQuery = `SELECT COUNT(*) as total FROM (${query}) as count_query`;

    // Execute both queries
    const [dataResult, countResult] = await Promise.all([
      this.executeQuery<T>(paginatedQuery, parameters, options),
      this.executeQuery<{ total: number }>(countQuery, parameters, {
        ...options,
        keyPrefix: `${options.keyPrefix || ''}:count`,
      }),
    ]);

    const total = countResult.data[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      ...dataResult,
      count: total,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Invalidate cache by entity type
   */
  async invalidateByEntity(entityName: string, entityId?: string): Promise<void> {
    const patterns = this.invalidationRules[entityName.toLowerCase()] || [`${entityName.toLowerCase()}:*`];
    
    for (const pattern of patterns) {
      const fullPattern = entityId ? pattern.replace('*', `*${entityId}*`) : pattern;
      await this.cachingService.invalidateByPattern(fullPattern, 'query');
    }

    this.logger.log(`Invalidated cache for entity: ${entityName}${entityId ? ` (${entityId})` : ''}`);
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    await this.cachingService.invalidateByTags(tags);
    this.logger.log(`Invalidated cache by tags: ${tags.join(', ')}`);
  }

  /**
   * Warm up cache with frequently used queries
   */
  async warmUpCache(queries: Array<{
    query: string;
    parameters?: any[];
    options?: QueryCacheOptions;
  }>): Promise<void> {
    this.logger.log(`Warming up query cache with ${queries.length} queries...`);

    const warmUpPromises = queries.map(async ({ query, parameters = [], options = {} }) => {
      try {
        await this.executeQuery(query, parameters, options);
      } catch (error) {
        this.logger.error(`Cache warm-up error for query: ${query.substring(0, 100)}...`, error);
      }
    });

    await Promise.all(warmUpPromises);
    this.logger.log('Query cache warm-up completed');
  }

  /**
   * Get query cache statistics
   */
  async getQueryCacheStats(): Promise<QueryCacheStats> {
    const cacheStats = await this.cachingService.getStats();
    
    // Calculate query-specific stats
    let totalQueries = 0;
    let totalTime = 0;
    let cachedQueries = 0;

    const topQueries: Array<{
      query: string;
      hitCount: number;
      avgExecutionTime: number;
    }> = [];

    for (const [query, stats] of this.queryStats.entries()) {
      totalQueries += stats.hits;
      totalTime += stats.totalTime;
      
      if (stats.hits > 1) {
        cachedQueries++;
        topQueries.push({
          query: query.substring(0, 100) + '...',
          hitCount: stats.hits,
          avgExecutionTime: Math.round(stats.totalTime / stats.hits),
        });
      }
    }

    // Sort by hit count
    topQueries.sort((a, b) => b.hitCount - a.hitCount);

    return {
      totalQueries,
      cachedQueries,
      cacheHitRate: cacheStats.hitRate,
      averageExecutionTime: totalQueries > 0 ? Math.round(totalTime / totalQueries) : 0,
      memorySaved: this.calculateMemorySaved(),
      topCachedQueries: topQueries.slice(0, 10),
    };
  }

  /**
   * Clear all query cache
   */
  async clearQueryCache(): Promise<number> {
    const cleared = await this.cachingService.clearNamespace('query');
    this.queryStats.clear();
    this.logger.log(`Cleared ${cleared} query cache entries`);
    return cleared;
  }

  /**
   * Get cached query keys with metadata
   */
  async getCachedQueries(limit: number = 50): Promise<Array<{
    key: string;
    query: string;
    size: number;
    ttl: number;
    hitCount: number;
    lastAccessed: Date;
  }>> {
    const cacheKeys = await this.cachingService.getCacheKeys('query', limit);
    
    return cacheKeys.map(cacheKey => {
      const queryHash = cacheKey.key.split(':').pop();
      const stats = this.findQueryStatsByHash(queryHash || '');
      
      return {
        key: cacheKey.key,
        query: this.extractQueryFromKey(cacheKey.key),
        size: cacheKey.size,
        ttl: cacheKey.ttl,
        hitCount: stats?.hits || 0,
        lastAccessed: cacheKey.lastAccessed,
      };
    });
  }

  /**
   * Execute query with automatic cache invalidation setup
   */
  async executeWithInvalidation<T>(
    query: string,
    parameters: any[] = [],
    entityTypes: string[],
    options: QueryCacheOptions = {},
  ): Promise<CachedQueryResult<T>> {
    // Add entity types as tags for automatic invalidation
    const enhancedOptions = {
      ...options,
      tags: [...(options.tags || []), ...entityTypes],
    };

    return this.executeQuery<T>(query, parameters, enhancedOptions);
  }

  // Private helper methods

  private async executeDirectQuery<T>(
    query: string,
    parameters: any[],
    startTime: number,
    cacheHit: boolean,
  ): Promise<CachedQueryResult<T>> {
    try {
      const result = await this.dataSource.query(query, parameters);
      const executionTime = Date.now() - startTime;
      
      // Update query stats
      this.updateQueryStats(query, executionTime, cacheHit);

      return {
        data: result,
        metadata: {
          query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
          parameters,
          executionTime,
          cacheHit,
          cachedAt: new Date(),
          ttl: this.defaultTTL,
        },
      };
    } catch (error) {
      this.logger.error(`Query execution error: ${error.message}`);
      throw error;
    }
  }

  private generateCacheKey(query: string, parameters: any[], keyPrefix?: string): string {
    const normalizedQuery = this.normalizeQuery(query);
    const paramString = JSON.stringify(parameters);
    const hash = require('crypto')
      .createHash('md5')
      .update(normalizedQuery + paramString)
      .digest('hex');
    
    return keyPrefix ? `${keyPrefix}:${hash}` : hash;
  }

  private normalizeQuery(query: string): string {
    return query
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  private async cacheQueryResult<T>(
    cacheKey: string,
    result: CachedQueryResult<T>,
    options: QueryCacheOptions,
  ): Promise<void> {
    const ttl = options.ttl || this.defaultTTL;
    const tags = options.tags || [];

    await this.cachingService.set(
      cacheKey,
      result,
      {
        ttl,
        tags,
        compress: options.compress || result.data.length > 100,
        namespace: 'query',
      }
    );
  }

  private updateQueryStats(query: string, executionTime: number, cacheHit: boolean): void {
    const normalizedQuery = this.normalizeQuery(query);
    const stats = this.queryStats.get(normalizedQuery) || { hits: 0, totalTime: 0 };
    
    stats.hits++;
    if (!cacheHit) {
      stats.totalTime += executionTime;
    }
    
    this.queryStats.set(normalizedQuery, stats);
  }

  private calculateMemorySaved(): number {
    // Estimate memory saved by caching
    // This is a simplified calculation
    let memorySaved = 0;
    
    for (const [, stats] of this.queryStats.entries()) {
      if (stats.hits > 1) {
        // Estimate that each cache hit saves average execution time worth of memory/CPU
        memorySaved += (stats.hits - 1) * (stats.totalTime / stats.hits);
      }
    }
    
    return Math.round(memorySaved);
  }

  private findQueryStatsByHash(hash: string): { hits: number; totalTime: number } | undefined {
    // This is a simplified implementation
    // In practice, you'd maintain a mapping of hashes to queries
    for (const [, stats] of this.queryStats.entries()) {
      // Return first match for demonstration
      return stats;
    }
    return undefined;
  }

  private extractQueryFromKey(key: string): string {
    // Extract query information from cache key
    // This is a simplified implementation
    return 'SELECT ... (query details from cache key)';
  }

  /**
   * Repository-level caching helpers
   */

  /**
   * Cache user queries
   */
  async cacheUserQuery<T>(
    userId: string,
    queryType: string,
    query: string,
    parameters: any[] = [],
    options: QueryCacheOptions = {},
  ): Promise<CachedQueryResult<T>> {
    return this.executeQuery<T>(query, parameters, {
      ...options,
      keyPrefix: `user:${userId}:${queryType}`,
      tags: ['users', `user:${userId}`, ...(options.tags || [])],
    });
  }

  /**
   * Cache course queries
   */
  async cacheCourseQuery<T>(
    courseId: string,
    queryType: string,
    query: string,
    parameters: any[] = [],
    options: QueryCacheOptions = {},
  ): Promise<CachedQueryResult<T>> {
    return this.executeQuery<T>(query, parameters, {
      ...options,
      keyPrefix: `course:${courseId}:${queryType}`,
      tags: ['courses', `course:${courseId}`, ...(options.tags || [])],
    });
  }

  /**
   * Cache organization queries
   */
  async cacheOrganizationQuery<T>(
    orgId: string,
    queryType: string,
    query: string,
    parameters: any[] = [],
    options: QueryCacheOptions = {},
  ): Promise<CachedQueryResult<T>> {
    return this.executeQuery<T>(query, parameters, {
      ...options,
      keyPrefix: `org:${orgId}:${queryType}`,
      tags: ['organizations', `org:${orgId}`, ...(options.tags || [])],
    });
  }

  /**
   * Cache search queries
   */
  async cacheSearchQuery<T>(
    searchTerm: string,
    filters: any,
    query: string,
    parameters: any[] = [],
    options: QueryCacheOptions = {},
  ): Promise<CachedQueryResult<T>> {
    const searchHash = require('crypto')
      .createHash('md5')
      .update(searchTerm + JSON.stringify(filters))
      .digest('hex');

    return this.executeQuery<T>(query, parameters, {
      ...options,
      keyPrefix: `search:${searchHash}`,
      tags: ['search', ...(options.tags || [])],
      ttl: options.ttl || 600, // Shorter TTL for search results
    });
  }
}
