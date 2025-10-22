import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { CachingService } from './caching.service';
import { QueryCacheService } from './query-cache.service';

export interface InvalidationEvent {
  type: 'entity_created' | 'entity_updated' | 'entity_deleted' | 'bulk_operation';
  entityType: string;
  entityId?: string;
  organizationId?: string;
  userId?: string;
  metadata?: any;
  timestamp: Date;
}

export interface InvalidationRule {
  entityType: string;
  patterns: string[];
  tags: string[];
  cascadeRules?: Array<{
    entityType: string;
    condition?: (event: InvalidationEvent) => boolean;
  }>;
}

/**
 * Cache Invalidation Service
 * Handles intelligent cache invalidation based on entity changes and business rules
 */
@Injectable()
export class CacheInvalidationService {
  private readonly logger = new Logger(CacheInvalidationService.name);
  
  // Invalidation rules for different entity types
    private readonly invalidationRules: Map<string, InvalidationRule> = new Map<string, InvalidationRule>([
    ['user', {
      entityType: 'user',
      patterns: [
        'user:${entityId}:*',
        'org:${organizationId}:users:*',
        'org:${organizationId}:members:*',
      ],
      tags: ['users', 'user:${entityId}', 'org:${organizationId}'],
      cascadeRules: [
        { entityType: 'enrollment', condition: (e) => !!e.userId },
        { entityType: 'organization', condition: (e) => !!e.organizationId },
      ],
    }],
    
    ['organization', {
      entityType: 'organization',
      patterns: [
        'org:${entityId}:*',
        'user:*:org:${entityId}',
      ],
      tags: ['organizations', 'org:${entityId}'],
      cascadeRules: [
        { entityType: 'user' },
        { entityType: 'course' },
        { entityType: 'enrollment' },
      ],
    }],
    
    ['course', {
      entityType: 'course',
      patterns: [
        'course:${entityId}:*',
        'org:${organizationId}:courses:*',
        'user:*:courses:*',
        'search:*',
      ],
      tags: ['courses', 'course:${entityId}', 'org:${organizationId}', 'search'],
      cascadeRules: [
        { entityType: 'lesson' },
        { entityType: 'enrollment' },
        { entityType: 'assessment' },
      ],
    }],
    
    ['enrollment', {
      entityType: 'enrollment',
      patterns: [
        'enrollment:${entityId}:*',
        'user:${userId}:enrollments:*',
        'course:*:enrollments:*',
        'user:${userId}:progress:*',
      ],
      tags: ['enrollments', 'enrollment:${entityId}', 'user:${userId}'],
      cascadeRules: [
        { entityType: 'user', condition: (e) => !!e.userId },
        { entityType: 'course', condition: (e) => !!e.metadata?.courseId },
      ],
    }],
    
    ['lesson', {
      entityType: 'lesson',
      patterns: [
        'lesson:${entityId}:*',
        'course:${metadata.courseId}:lessons:*',
        'course:${metadata.courseId}:content:*',
      ],
      tags: ['lessons', 'lesson:${entityId}', 'course:${metadata.courseId}'],
    }],
    
    ['assessment', {
      entityType: 'assessment',
      patterns: [
        'assessment:${entityId}:*',
        'course:${metadata.courseId}:assessments:*',
        'lesson:${metadata.lessonId}:assessments:*',
      ],
      tags: ['assessments', 'assessment:${entityId}'],
    }],
    
    ['file', {
      entityType: 'file',
      patterns: [
        'file:${entityId}:*',
        'user:${userId}:files:*',
        'course:${metadata.courseId}:files:*',
      ],
      tags: ['files', 'file:${entityId}'],
    }],
  ]);


  constructor(
    private readonly cachingService: CachingService,
    private readonly queryCacheService: QueryCacheService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Invalidate cache based on entity change event
   */
  async invalidateCache(event: InvalidationEvent): Promise<{
    patternsInvalidated: number;
    tagsInvalidated: number;
    cascadeInvalidations: number;
  }> {
    const rule = this.invalidationRules.get(event.entityType);
    if (!rule) {
      this.logger.warn(`No invalidation rule found for entity type: ${event.entityType}`);
      return { patternsInvalidated: 0, tagsInvalidated: 0, cascadeInvalidations: 0 };
    }

    let patternsInvalidated = 0;
    let tagsInvalidated = 0;
    let cascadeInvalidations = 0;

    try {
      // Invalidate by patterns
      const resolvedPatterns = this.resolvePatterns(rule.patterns, event);
      for (const pattern of resolvedPatterns) {
        const invalidated = await this.cachingService.invalidateByPattern(pattern);
        patternsInvalidated += invalidated;
      }

      // Invalidate by tags
      const resolvedTags = this.resolveTags(rule.tags, event);
      if (resolvedTags.length > 0) {
        tagsInvalidated = await this.cachingService.invalidateByTags(resolvedTags);
      }

      // Invalidate query cache
      await this.queryCacheService.invalidateByEntity(event.entityType, event.entityId);

      // Handle cascade invalidations
      if (rule.cascadeRules) {
        for (const cascadeRule of rule.cascadeRules) {
          if (!cascadeRule.condition || cascadeRule.condition(event)) {
            const cascadeEvent: InvalidationEvent = {
              ...event,
              type: 'bulk_operation',
              entityType: cascadeRule.entityType,
            };
            
            const cascadeResult = await this.invalidateCache(cascadeEvent);
            cascadeInvalidations += cascadeResult.patternsInvalidated + cascadeResult.tagsInvalidated;
          }
        }
      }

      this.logger.log(
        `Cache invalidated for ${event.entityType}:${event.entityId || 'bulk'} - ` +
        `Patterns: ${patternsInvalidated}, Tags: ${tagsInvalidated}, Cascade: ${cascadeInvalidations}`
      );

      // Emit invalidation event for monitoring
      this.eventEmitter.emit('cache.invalidated', {
        ...event,
        result: { patternsInvalidated, tagsInvalidated, cascadeInvalidations },
      });

      return { patternsInvalidated, tagsInvalidated, cascadeInvalidations };
    } catch (error) {
      this.logger.error(`Cache invalidation error for ${event.entityType}:${event.entityId}`, error);
      return { patternsInvalidated: 0, tagsInvalidated: 0, cascadeInvalidations: 0 };
    }
  }

  /**
   * Bulk invalidate cache for multiple entities
   */
  async bulkInvalidateCache(events: InvalidationEvent[]): Promise<void> {
    this.logger.log(`Bulk cache invalidation for ${events.length} events`);

    const invalidationPromises = events.map(event => this.invalidateCache(event));
    await Promise.all(invalidationPromises);
  }

  /**
   * Invalidate cache by custom pattern
   */
  async invalidateByCustomPattern(pattern: string, namespace?: string): Promise<number> {
    return this.cachingService.invalidateByPattern(pattern, namespace);
  }

  /**
   * Invalidate cache by custom tags
   */
  async invalidateByCustomTags(tags: string[]): Promise<number> {
    return this.cachingService.invalidateByTags(tags);
  }

  /**
   * Schedule cache invalidation
   */
  async scheduleInvalidation(
    event: InvalidationEvent,
    delayMs: number,
  ): Promise<void> {
    setTimeout(async () => {
      await this.invalidateCache(event);
    }, delayMs);

    this.logger.log(`Scheduled cache invalidation for ${event.entityType}:${event.entityId} in ${delayMs}ms`);
  }

  /**
   * Get invalidation statistics
   */
  async getInvalidationStats(): Promise<{
    totalInvalidations: number;
    invalidationsByType: Record<string, number>;
    averageInvalidationTime: number;
    recentInvalidations: Array<{
      entityType: string;
      entityId?: string;
      timestamp: Date;
      patternsInvalidated: number;
    }>;
  }> {
    // This would be implemented with actual metrics collection
    // For now, return mock data
    return {
      totalInvalidations: 1250,
      invalidationsByType: {
        user: 450,
        course: 320,
        organization: 180,
        enrollment: 200,
        lesson: 100,
      },
      averageInvalidationTime: 15,
      recentInvalidations: [
        {
          entityType: 'user',
          entityId: 'user-123',
          timestamp: new Date(Date.now() - 5 * 60 * 1000),
          patternsInvalidated: 8,
        },
        {
          entityType: 'course',
          entityId: 'course-456',
          timestamp: new Date(Date.now() - 10 * 60 * 1000),
          patternsInvalidated: 15,
        },
      ],
    };
  }

  // Event listeners for automatic cache invalidation

  @OnEvent('user.created')
  async handleUserCreated(payload: any): Promise<void> {
    await this.invalidateCache({
      type: 'entity_created',
      entityType: 'user',
      entityId: payload.id,
      organizationId: payload.organizationId,
      timestamp: new Date(),
    });
  }

  @OnEvent('user.updated')
  async handleUserUpdated(payload: any): Promise<void> {
    await this.invalidateCache({
      type: 'entity_updated',
      entityType: 'user',
      entityId: payload.id,
      organizationId: payload.organizationId,
      timestamp: new Date(),
    });
  }

  @OnEvent('user.deleted')
  async handleUserDeleted(payload: any): Promise<void> {
    await this.invalidateCache({
      type: 'entity_deleted',
      entityType: 'user',
      entityId: payload.id,
      organizationId: payload.organizationId,
      timestamp: new Date(),
    });
  }

  @OnEvent('course.created')
  async handleCourseCreated(payload: any): Promise<void> {
    await this.invalidateCache({
      type: 'entity_created',
      entityType: 'course',
      entityId: payload.id,
      organizationId: payload.organizationId,
      timestamp: new Date(),
    });
  }

  @OnEvent('course.updated')
  async handleCourseUpdated(payload: any): Promise<void> {
    await this.invalidateCache({
      type: 'entity_updated',
      entityType: 'course',
      entityId: payload.id,
      organizationId: payload.organizationId,
      timestamp: new Date(),
    });
  }

  @OnEvent('course.deleted')
  async handleCourseDeleted(payload: any): Promise<void> {
    await this.invalidateCache({
      type: 'entity_deleted',
      entityType: 'course',
      entityId: payload.id,
      organizationId: payload.organizationId,
      timestamp: new Date(),
    });
  }

  @OnEvent('enrollment.created')
  async handleEnrollmentCreated(payload: any): Promise<void> {
    await this.invalidateCache({
      type: 'entity_created',
      entityType: 'enrollment',
      entityId: payload.id,
      userId: payload.userId,
      metadata: { courseId: payload.courseId },
      timestamp: new Date(),
    });
  }

  @OnEvent('enrollment.updated')
  async handleEnrollmentUpdated(payload: any): Promise<void> {
    await this.invalidateCache({
      type: 'entity_updated',
      entityType: 'enrollment',
      entityId: payload.id,
      userId: payload.userId,
      metadata: { courseId: payload.courseId },
      timestamp: new Date(),
    });
  }

  @OnEvent('organization.updated')
  async handleOrganizationUpdated(payload: any): Promise<void> {
    await this.invalidateCache({
      type: 'entity_updated',
      entityType: 'organization',
      entityId: payload.id,
      timestamp: new Date(),
    });
  }

  // Private helper methods

  private resolvePatterns(patterns: string[], event: InvalidationEvent): string[] {
    return patterns.map(pattern => this.resolveTemplate(pattern, event));
  }

  private resolveTags(tags: string[], event: InvalidationEvent): string[] {
    return tags.map(tag => this.resolveTemplate(tag, event));
  }

  private resolveTemplate(template: string, event: InvalidationEvent): string {
    return template
      .replace('${entityId}', event.entityId || '*')
      .replace('${organizationId}', event.organizationId || '*')
      .replace('${userId}', event.userId || '*')
      .replace('${metadata.courseId}', event.metadata?.courseId || '*')
      .replace('${metadata.lessonId}', event.metadata?.lessonId || '*');
  }

  /**
   * Add custom invalidation rule
   */
  addInvalidationRule(entityType: string, rule: InvalidationRule): void {
    this.invalidationRules.set(entityType, rule);
    this.logger.log(`Added custom invalidation rule for entity type: ${entityType}`);
  }

  /**
   * Remove invalidation rule
   */
  removeInvalidationRule(entityType: string): void {
    this.invalidationRules.delete(entityType);
    this.logger.log(`Removed invalidation rule for entity type: ${entityType}`);
  }

  /**
   * Get all invalidation rules
   */
  getInvalidationRules(): Map<string, InvalidationRule> {
    return new Map(this.invalidationRules);
  }

  /**
   * Test invalidation rule
   */
  async testInvalidationRule(
    entityType: string,
    mockEvent: Partial<InvalidationEvent>,
  ): Promise<{
    patterns: string[];
    tags: string[];
    cascadeRules: string[];
  }> {
    const rule = this.invalidationRules.get(entityType);
    if (!rule) {
      throw new Error(`No invalidation rule found for entity type: ${entityType}`);
    }

    const event: InvalidationEvent = {
      type: 'entity_updated',
      entityType,
      timestamp: new Date(),
      ...mockEvent,
    };

    const patterns = this.resolvePatterns(rule.patterns, event);
    const tags = this.resolveTags(rule.tags, event);
    const cascadeRules = rule.cascadeRules?.map(r => r.entityType) || [];

    return { patterns, tags, cascadeRules };
  }

  /**
   * Warm up cache after invalidation
   */
  async warmUpAfterInvalidation(
    entityType: string,
    entityId: string,
    warmUpQueries: Array<{
      query: string;
      parameters?: any[];
    }>,
  ): Promise<void> {
    this.logger.log(`Warming up cache after invalidation for ${entityType}:${entityId}`);

    try {
      await this.queryCacheService.warmUpCache(warmUpQueries);
    } catch (error) {
      this.logger.error(`Cache warm-up error after invalidation:`, error);
    }
  }

  /**
   * Smart invalidation based on entity relationships
   */
  async smartInvalidate(
    entityType: string,
    entityId: string,
    changedFields: string[],
  ): Promise<void> {
    // Only invalidate relevant caches based on what fields changed
    const relevantPatterns = this.getRelevantPatternsForFields(entityType, changedFields);
    
    for (const pattern of relevantPatterns) {
      await this.cachingService.invalidateByPattern(pattern);
    }

    this.logger.log(
      `Smart invalidation for ${entityType}:${entityId} - ` +
      `Fields: ${changedFields.join(', ')}, Patterns: ${relevantPatterns.length}`
    );
  }

  private getRelevantPatternsForFields(entityType: string, changedFields: string[]): string[] {
    // Define field-to-pattern mappings for smart invalidation
    const fieldMappings: Record<string, Record<string, string[]>> = {
      user: {
        email: ['user:*:profile:*', 'user:*:auth:*'],
        firstName: ['user:*:profile:*', 'user:*:display:*'],
        lastName: ['user:*:profile:*', 'user:*:display:*'],
        role: ['user:*:permissions:*', 'org:*:members:*'],
        status: ['user:*:*', 'org:*:members:*'],
      },
      course: {
        title: ['course:*:*', 'search:*'],
        description: ['course:*:details:*', 'search:*'],
        status: ['course:*:*', 'org:*:courses:*'],
        publishedAt: ['course:*:*', 'search:*'],
      },
    };

    const entityMappings = fieldMappings[entityType] || {};
    const relevantPatterns: string[] = [];

    for (const field of changedFields) {
      const patterns = entityMappings[field] || [];
      relevantPatterns.push(...patterns);
    }

    return [...new Set(relevantPatterns)]; // Remove duplicates
  }
}
