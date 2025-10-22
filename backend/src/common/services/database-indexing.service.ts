import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface IndexDefinition {
  name: string;
  table: string;
  columns: string[];
  type: 'btree' | 'hash' | 'gin' | 'gist' | 'spgist' | 'brin';
  unique: boolean;
  partial?: string; // WHERE clause for partial indexes
  concurrent: boolean;
  priority: 'critical' | 'high' | 'medium' | 'low';
  description: string;
}

/**
 * Database Indexing Strategy Service
 * Manages comprehensive database indexing for optimal query performance
 */
@Injectable()
export class DatabaseIndexingService {
  private readonly logger = new Logger(DatabaseIndexingService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Get comprehensive indexing strategy for all entities
   */
  getIndexingStrategy(): IndexDefinition[] {
    return [
      // User entity indexes
      ...this.getUserIndexes(),
      
      // Organization entity indexes
      ...this.getOrganizationIndexes(),
      
      // Course entity indexes
      ...this.getCourseIndexes(),
      
      // Enrollment entity indexes
      ...this.getEnrollmentIndexes(),
      
      // Lesson entity indexes
      ...this.getLessonIndexes(),
      
      // Assessment entity indexes
      ...this.getAssessmentIndexes(),
      
      // File entity indexes
      ...this.getFileIndexes(),
      
      // Audit log indexes
      ...this.getAuditLogIndexes(),
      
      // Session and security indexes
      ...this.getSecurityIndexes(),
    ];
  }

  /**
   * Create all recommended indexes
   */
  async createAllIndexes(): Promise<void> {
    const indexes = this.getIndexingStrategy();
    const sortedIndexes = this.prioritizeIndexes(indexes);

    this.logger.log(`Creating ${sortedIndexes.length} database indexes...`);

    for (const index of sortedIndexes) {
      try {
        await this.createIndex(index);
        this.logger.log(`✅ Created index: ${index.name}`);
      } catch (error) {
        this.logger.error(`❌ Failed to create index ${index.name}: ${error.message}`);
      }
    }

    this.logger.log('Database indexing strategy implementation completed');
  }

  /**
   * Create a specific index
   */
  async createIndex(index: IndexDefinition): Promise<void> {
    const sql = this.generateIndexSQL(index);
    
    try {
      await this.dataSource.query(sql);
    } catch (error) {
      // Ignore "already exists" errors
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }
  }

  /**
   * Drop an index if it exists
   */
  async dropIndex(indexName: string, tableName: string): Promise<void> {
    const sql = `DROP INDEX IF EXISTS ${indexName}`;
    await this.dataSource.query(sql);
    this.logger.log(`Dropped index: ${indexName} on table ${tableName}`);
  }

  /**
   * Analyze index usage and provide recommendations
   */
  async analyzeIndexUsage(): Promise<{
    used: Array<{ name: string; usage: number }>;
    unused: string[];
    recommendations: string[];
  }> {
    if (this.dataSource.options.type !== 'postgres') {
      return { used: [], unused: [], recommendations: ['Index analysis only available for PostgreSQL'] };
    }

    try {
      // Get index usage statistics
      const usageStats = await this.dataSource.query(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_tup_read,
          idx_tup_fetch,
          idx_tup_read + idx_tup_fetch as total_usage
        FROM pg_stat_user_indexes
        ORDER BY total_usage DESC;
      `);

      const used = usageStats
        .filter((stat: any) => stat.total_usage > 0)
        .map((stat: any) => ({
          name: stat.indexname,
          usage: stat.total_usage,
        }));

      const unused = usageStats
        .filter((stat: any) => stat.total_usage === 0 && !stat.indexname.endsWith('_pkey'))
        .map((stat: any) => stat.indexname);

      const recommendations = this.generateIndexRecommendations(usageStats);

      return { used, unused, recommendations };
    } catch (error) {
      this.logger.error('Error analyzing index usage', error);
      return { used: [], unused: [], recommendations: [] };
    }
  }

  // Private methods for entity-specific indexes

  private getUserIndexes(): IndexDefinition[] {
    return [
      {
        name: 'idx_users_email_unique',
        table: 'users',
        columns: ['email'],
        type: 'btree',
        unique: true,
        concurrent: true,
        priority: 'critical',
        description: 'Unique index for user email authentication',
      },
      {
        name: 'idx_users_organization_id',
        table: 'users',
        columns: ['organization_id'],
        type: 'btree',
        unique: false,
        concurrent: true,
        priority: 'high',
        description: 'Index for organization-based user queries',
      },
      {
        name: 'idx_users_role_status',
        table: 'users',
        columns: ['role', 'status'],
        type: 'btree',
        unique: false,
        concurrent: true,
        priority: 'high',
        description: 'Composite index for role-based access control queries',
      },
      {
        name: 'idx_users_created_at',
        table: 'users',
        columns: ['created_at'],
        type: 'btree',
        unique: false,
        concurrent: true,
        priority: 'medium',
        description: 'Index for user registration analytics and sorting',
      },
      {
        name: 'idx_users_last_login',
        table: 'users',
        columns: ['last_login_at'],
        type: 'btree',
        unique: false,
        concurrent: true,
        priority: 'medium',
        description: 'Index for user activity tracking',
      },
      {
        name: 'idx_users_email_verification',
        table: 'users',
        columns: ['email_verified_at'],
        type: 'btree',
        unique: false,
        partial: 'email_verified_at IS NULL',
        concurrent: true,
        priority: 'medium',
        description: 'Partial index for unverified users',
      },
    ];
  }

  private getOrganizationIndexes(): IndexDefinition[] {
    return [
      {
        name: 'idx_organizations_slug_unique',
        table: 'organizations',
        columns: ['slug'],
        type: 'btree',
        unique: true,
        concurrent: true,
        priority: 'critical',
        description: 'Unique index for organization slug routing',
      },
      {
        name: 'idx_organizations_status',
        table: 'organizations',
        columns: ['status'],
        type: 'btree',
        unique: false,
        concurrent: true,
        priority: 'high',
        description: 'Index for active organization filtering',
      },
      {
        name: 'idx_organizations_subscription',
        table: 'organizations',
        columns: ['subscription_tier', 'subscription_status'],
        type: 'btree',
        unique: false,
        concurrent: true,
        priority: 'high',
        description: 'Index for subscription-based feature access',
      },
      {
        name: 'idx_organizations_created_at',
        table: 'organizations',
        columns: ['created_at'],
        type: 'btree',
        unique: false,
        concurrent: true,
        priority: 'medium',
        description: 'Index for organization analytics',
      },
    ];
  }

  private getCourseIndexes(): IndexDefinition[] {
    return [
      {
        name: 'idx_courses_organization_id',
        table: 'courses',
        columns: ['organization_id'],
        type: 'btree',
        unique: false,
        concurrent: true,
        priority: 'critical',
        description: 'Index for organization-specific course queries',
      },
      {
        name: 'idx_courses_status_published',
        table: 'courses',
        columns: ['status', 'published_at'],
        type: 'btree',
        unique: false,
        concurrent: true,
        priority: 'high',
        description: 'Index for published course filtering',
      },
      {
        name: 'idx_courses_category_level',
        table: 'courses',
        columns: ['category', 'level'],
        type: 'btree',
        unique: false,
        concurrent: true,
        priority: 'high',
        description: 'Index for course catalog filtering',
      },
      {
        name: 'idx_courses_instructor_id',
        table: 'courses',
        columns: ['instructor_id'],
        type: 'btree',
        unique: false,
        concurrent: true,
        priority: 'high',
        description: 'Index for instructor course queries',
      },
      {
        name: 'idx_courses_search_text',
        table: 'courses',
        columns: ['title', 'description'],
        type: 'gin',
        unique: false,
        concurrent: true,
        priority: 'medium',
        description: 'Full-text search index for course content',
      },
      {
        name: 'idx_courses_enrollment_count',
        table: 'courses',
        columns: ['enrollment_count'],
        type: 'btree',
        unique: false,
        concurrent: true,
        priority: 'medium',
        description: 'Index for popular course sorting',
      },
    ];
  }

  private getEnrollmentIndexes(): IndexDefinition[] {
    return [
      {
        name: 'idx_enrollments_user_course_unique',
        table: 'enrollments',
        columns: ['user_id', 'course_id'],
        type: 'btree',
        unique: true,
        concurrent: true,
        priority: 'critical',
        description: 'Unique constraint for user-course enrollment',
      },
      {
        name: 'idx_enrollments_course_id',
        table: 'enrollments',
        columns: ['course_id'],
        type: 'btree',
        unique: false,
        concurrent: true,
        priority: 'high',
        description: 'Index for course enrollment queries',
      },
      {
        name: 'idx_enrollments_user_id',
        table: 'enrollments',
        columns: ['user_id'],
        type: 'btree',
        unique: false,
        concurrent: true,
        priority: 'high',
        description: 'Index for user enrollment queries',
      },
      {
        name: 'idx_enrollments_status_progress',
        table: 'enrollments',
        columns: ['status', 'progress_percentage'],
        type: 'btree',
        unique: false,
        concurrent: true,
        priority: 'high',
        description: 'Index for enrollment progress tracking',
      },
      {
        name: 'idx_enrollments_completed_at',
        table: 'enrollments',
        columns: ['completed_at'],
        type: 'btree',
        unique: false,
        partial: 'completed_at IS NOT NULL',
        concurrent: true,
        priority: 'medium',
        description: 'Partial index for completed enrollments',
      },
    ];
  }

  private getLessonIndexes(): IndexDefinition[] {
    return [
      {
        name: 'idx_lessons_course_id_order',
        table: 'lessons',
        columns: ['course_id', 'order_index'],
        type: 'btree',
        unique: false,
        concurrent: true,
        priority: 'critical',
        description: 'Index for ordered lesson retrieval',
      },
      {
        name: 'idx_lessons_status',
        table: 'lessons',
        columns: ['status'],
        type: 'btree',
        unique: false,
        concurrent: true,
        priority: 'high',
        description: 'Index for published lesson filtering',
      },
      {
        name: 'idx_lessons_type',
        table: 'lessons',
        columns: ['type'],
        type: 'btree',
        unique: false,
        concurrent: true,
        priority: 'medium',
        description: 'Index for lesson type filtering',
      },
    ];
  }

  private getAssessmentIndexes(): IndexDefinition[] {
    return [
      {
        name: 'idx_assessments_course_id',
        table: 'assessments',
        columns: ['course_id'],
        type: 'btree',
        unique: false,
        concurrent: true,
        priority: 'high',
        description: 'Index for course assessment queries',
      },
      {
        name: 'idx_assessments_lesson_id',
        table: 'assessments',
        columns: ['lesson_id'],
        type: 'btree',
        unique: false,
        concurrent: true,
        priority: 'high',
        description: 'Index for lesson assessment queries',
      },
      {
        name: 'idx_assessment_submissions_user_assessment',
        table: 'assessment_submissions',
        columns: ['user_id', 'assessment_id'],
        type: 'btree',
        unique: false,
        concurrent: true,
        priority: 'high',
        description: 'Index for user assessment submissions',
      },
      {
        name: 'idx_assessment_submissions_submitted_at',
        table: 'assessment_submissions',
        columns: ['submitted_at'],
        type: 'btree',
        unique: false,
        concurrent: true,
        priority: 'medium',
        description: 'Index for assessment submission analytics',
      },
    ];
  }

  private getFileIndexes(): IndexDefinition[] {
    return [
      {
        name: 'idx_files_owner_id',
        table: 'files',
        columns: ['owner_id'],
        type: 'btree',
        unique: false,
        concurrent: true,
        priority: 'high',
        description: 'Index for user file queries',
      },
      {
        name: 'idx_files_course_id',
        table: 'files',
        columns: ['course_id'],
        type: 'btree',
        unique: false,
        concurrent: true,
        priority: 'high',
        description: 'Index for course file queries',
      },
      {
        name: 'idx_files_type_status',
        table: 'files',
        columns: ['file_type', 'status'],
        type: 'btree',
        unique: false,
        concurrent: true,
        priority: 'medium',
        description: 'Index for file type and status filtering',
      },
      {
        name: 'idx_files_created_at',
        table: 'files',
        columns: ['created_at'],
        type: 'btree',
        unique: false,
        concurrent: true,
        priority: 'medium',
        description: 'Index for file upload analytics',
      },
    ];
  }

  private getAuditLogIndexes(): IndexDefinition[] {
    return [
      {
        name: 'idx_audit_logs_user_id',
        table: 'audit_logs',
        columns: ['user_id'],
        type: 'btree',
        unique: false,
        concurrent: true,
        priority: 'high',
        description: 'Index for user activity audit queries',
      },
      {
        name: 'idx_audit_logs_action_timestamp',
        table: 'audit_logs',
        columns: ['action', 'timestamp'],
        type: 'btree',
        unique: false,
        concurrent: true,
        priority: 'high',
        description: 'Index for action-based audit queries',
      },
      {
        name: 'idx_audit_logs_resource_type_id',
        table: 'audit_logs',
        columns: ['resource_type', 'resource_id'],
        type: 'btree',
        unique: false,
        concurrent: true,
        priority: 'medium',
        description: 'Index for resource-specific audit queries',
      },
      {
        name: 'idx_audit_logs_timestamp',
        table: 'audit_logs',
        columns: ['timestamp'],
        type: 'brin',
        unique: false,
        concurrent: true,
        priority: 'medium',
        description: 'BRIN index for time-series audit log queries',
      },
    ];
  }

  private getSecurityIndexes(): IndexDefinition[] {
    return [
      {
        name: 'idx_refresh_tokens_user_id',
        table: 'refresh_tokens',
        columns: ['user_id'],
        type: 'btree',
        unique: false,
        concurrent: true,
        priority: 'high',
        description: 'Index for user refresh token queries',
      },
      {
        name: 'idx_refresh_tokens_expires_at',
        table: 'refresh_tokens',
        columns: ['expires_at'],
        type: 'btree',
        unique: false,
        concurrent: true,
        priority: 'high',
        description: 'Index for token expiration cleanup',
      },
      {
        name: 'idx_password_reset_tokens_email',
        table: 'password_reset_tokens',
        columns: ['email'],
        type: 'btree',
        unique: false,
        concurrent: true,
        priority: 'medium',
        description: 'Index for password reset queries',
      },
      {
        name: 'idx_email_verification_tokens_email',
        table: 'email_verification_tokens',
        columns: ['email'],
        type: 'btree',
        unique: false,
        concurrent: true,
        priority: 'medium',
        description: 'Index for email verification queries',
      },
    ];
  }

  private prioritizeIndexes(indexes: IndexDefinition[]): IndexDefinition[] {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    
    return indexes.sort((a, b) => {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  private generateIndexSQL(index: IndexDefinition): string {
    const concurrentClause = index.concurrent ? 'CONCURRENTLY' : '';
    const uniqueClause = index.unique ? 'UNIQUE' : '';
    const typeClause = index.type !== 'btree' ? `USING ${index.type}` : '';
    const columnsClause = index.columns.join(', ');
    const partialClause = index.partial ? `WHERE ${index.partial}` : '';

    return `
      CREATE ${uniqueClause} INDEX ${concurrentClause} IF NOT EXISTS ${index.name}
      ON ${index.table} ${typeClause} (${columnsClause})
      ${partialClause}
    `.replace(/\s+/g, ' ').trim();
  }

  private generateIndexRecommendations(usageStats: any[]): string[] {
    const recommendations: string[] = [];

    // Find unused indexes
    const unusedIndexes = usageStats.filter(stat => 
      stat.total_usage === 0 && !stat.indexname.endsWith('_pkey')
    );

    if (unusedIndexes.length > 0) {
      recommendations.push(`Consider dropping ${unusedIndexes.length} unused indexes to improve write performance`);
    }

    // Find heavily used indexes
    const heavilyUsed = usageStats.filter(stat => stat.total_usage > 10000);
    if (heavilyUsed.length > 0) {
      recommendations.push(`${heavilyUsed.length} indexes are heavily used - ensure they are properly maintained`);
    }

    // Check for missing indexes on foreign keys
    recommendations.push('Review foreign key columns for missing indexes');

    return recommendations;
  }
}
