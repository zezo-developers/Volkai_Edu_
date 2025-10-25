import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1698000000000 implements MigrationInterface {
  name = 'AddPerformanceIndexes1698000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // User performance indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_email_status" ON "users" ("email", "status");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_created_at" ON "users" ("created_at");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_lastLoginAt" ON "users" ("lastLoginAt");
    `);

    // Organization performance indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_organizations_status_created_at" ON "organizations" ("status", "created_at");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_org_memberships_user_org" ON "organization_memberships" ("userId", "organizationId");
    `);

    // Course performance indexes
    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "idx_courses_status_published" ON "courses" ("status", "is_published", "created_at");
    // `);

    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "idx_courses_organization_status" ON "courses" ("organizationId", "status");
    // `);

    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "idx_courses_category_difficulty" ON "courses" ("category", "difficulty_level");
    // `);

    // // Enrollment performance indexes
    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "idx_enrollments_user_status" ON "enrollments" ("user_id", "status");
    // `);

    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "idx_enrollments_course_status" ON "enrollments" ("course_id", "status");
    // `);

    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "idx_enrollments_progress" ON "enrollments" ("progress_percentage", "status");
    // `);

    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "idx_enrollments_completion" ON "enrollments" ("completed_at", "status");
    // `);

    // // Assessment performance indexes
    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "idx_assessment_attempts_user_assessment" ON "assessment_attempts" ("user_id", "assessment_id");
    // `);

    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "idx_assessment_attempts_status_score" ON "assessment_attempts" ("status", "score");
    // `);

    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "idx_assessment_attempts_completed" ON "assessment_attempts" ("completed_at", "status");
    // `);

    // // Job application performance indexes
    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "idx_job_applications_user_status" ON "job_applications" ("user_id", "status");
    // `);

    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "idx_job_applications_job_status" ON "job_applications" ("job_id", "status");
    // `);

    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "idx_job_applications_applied_at" ON "job_applications" ("applied_at", "status");
    // `);

    // // Interview performance indexes
    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "idx_interview_sessions_user_status" ON "interview_sessions" ("user_id", "status");
    // `);

    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "idx_interview_sessions_scheduled" ON "interview_sessions" ("scheduled_at", "status");
    // `);

    // // Notification performance indexes
    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "idx_notifications_user_read" ON "notifications" ("user_id", "is_read", "created_at");
    // `);

    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "idx_notifications_type_status" ON "notifications" ("type", "status");
    // `);

    // // Billing performance indexes
    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "idx_subscriptions_org_status" ON "subscriptions" ("organization_id", "status");
    // `);

    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "idx_subscriptions_expires_at" ON "subscriptions" ("expires_at", "status");
    // `);

    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "idx_invoices_org_status" ON "invoices" ("organization_id", "status");
    // `);

    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "idx_invoices_due_date" ON "invoices" ("due_date", "status");
    // `);

    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "idx_payments_invoice_status" ON "payments" ("invoice_id", "status");
    // `);

    // // Webhook performance indexes
    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "idx_webhook_deliveries_endpoint_status" ON "webhook_deliveries" ("endpoint_id", "status");
    // `);

    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "idx_webhook_deliveries_created_status" ON "webhook_deliveries" ("created_at", "status");
    // `);

    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "idx_webhook_deliveries_scheduled" ON "webhook_deliveries" ("scheduled_at", "status");
    // `);

    // // API Key performance indexes
    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "idx_api_keys_org_status" ON "api_keys" ("organization_id", "status");
    // `);

    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "idx_api_keys_expires_at" ON "api_keys" ("expires_at", "status");
    // `);

    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "idx_api_key_usage_key_created" ON "api_key_usage" ("api_key_id", "created_at");
    // `);

    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "idx_api_key_usage_endpoint_status" ON "api_key_usage" ("endpoint", "status");
    // `);

    // // Analytics performance indexes
    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "idx_analytics_events_type_created" ON "analytics_events" ("event_type", "created_at");
    // `);

    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "idx_analytics_events_user_created" ON "analytics_events" ("user_id", "created_at");
    // `);

    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "idx_analytics_events_org_created" ON "analytics_events" ("organization_id", "created_at");
    // `);

    // Audit log performance indexes
    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_created" ON "audit_logs" ("user_id", "created_at");
    // `);

    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "idx_audit_logs_action_created" ON "audit_logs" ("action", "created_at");
    // `);

    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity_created" ON "audit_logs" ("entity_type", "entity_id", "created_at");
    // `);

    // // File performance indexes
    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "idx_files_user_type" ON "files" ("uploaded_by", "file_type");
    // `);

    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "idx_files_org_created" ON "files" ("organization_id", "created_at");
    // `);

    // Composite indexes for complex queries
    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "idx_courses_search" ON "courses" ("organization_id", "status", "is_published", "category");
    // `);

    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "idx_jobs_search" ON "jobs" ("organization_id", "status", "job_type", "location");
    // `);

    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "idx_users_search" ON "users" ("organization_id", "status", "role", "created_at");
    // `);

    // Full-text search indexes (PostgreSQL specific)
    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "idx_courses_fulltext" ON "courses" USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));
    // `);

    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "idx_jobs_fulltext" ON "jobs" USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));
    // `);

    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "idx_users_fulltext" ON "users" USING gin(to_tsvector('english', firstName || ' ' || lastName || ' ' || COALESCE(email, '')));
    // `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop all performance indexes
    const indexes = [
      'idx_users_email_status',
      'idx_users_created_at',
      'idx_users_lastLoginAt',
      'idx_organizations_status_created',
      'idx_org_memberships_user_org',
      // 'idx_courses_status_published',
      // 'idx_courses_organization_status',
      // 'idx_courses_category_difficulty',
      // 'idx_enrollments_user_status',
      // 'idx_enrollments_course_status',
      // 'idx_enrollments_progress',
      // 'idx_enrollments_completion',
      // 'idx_assessment_attempts_user_assessment',
      // 'idx_assessment_attempts_status_score',
      // 'idx_assessment_attempts_completed',
      // 'idx_job_applications_user_status',
      // 'idx_job_applications_job_status',
      // 'idx_job_applications_applied_at',
      // 'idx_interview_sessions_user_status',
      // 'idx_interview_sessions_scheduled',
      // 'idx_notifications_user_read',
      // 'idx_notifications_type_status',
      // 'idx_subscriptions_org_status',
      // 'idx_subscriptions_expires_at',
      // 'idx_invoices_org_status',
      // 'idx_invoices_due_date',
      // 'idx_payments_invoice_status',
      // 'idx_webhook_deliveries_endpoint_status',
      // 'idx_webhook_deliveries_created_status',
      // 'idx_webhook_deliveries_scheduled',
      // 'idx_api_keys_org_status',
      // 'idx_api_keys_expires_at',
      // 'idx_api_key_usage_key_created',
      // 'idx_api_key_usage_endpoint_status',
      // 'idx_analytics_events_type_created',
      // 'idx_analytics_events_user_created',
      // 'idx_analytics_events_org_created',
      // 'idx_audit_logs_user_created',
      // 'idx_audit_logs_action_created',
      // 'idx_audit_logs_entity_created',
      // 'idx_files_user_type',
      // 'idx_files_org_created',
      // 'idx_courses_search',
      // 'idx_jobs_search',
      'idx_users_search',
      // 'idx_courses_fulltext',
      // 'idx_jobs_fulltext',
      'idx_users_fulltext',
    ];

    for (const index of indexes) {
      await queryRunner.query(`DROP INDEX IF EXISTS "${index}";`);
    }
  }
}
