import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial migration to create core tables for authentication and organization management
 * Creates users, organizations, memberships, roles, permissions, and audit logs tables
 */
export class InitialMigration1698000000000 implements MigrationInterface {
  name = 'InitialMigration1698000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums
    await queryRunner.query(`
      CREATE TYPE "user_status_enum" AS ENUM('active', 'inactive', 'suspended', 'deleted')
    `);
    
    await queryRunner.query(`
      CREATE TYPE "organization_size_enum" AS ENUM('startup', 'small', 'medium', 'large', 'enterprise')
    `);
    
    await queryRunner.query(`
      CREATE TYPE "organization_status_enum" AS ENUM('active', 'trial', 'suspended', 'cancelled')
    `);
    
    await queryRunner.query(`
      CREATE TYPE "membership_role_enum" AS ENUM('owner', 'admin', 'manager', 'hr', 'interviewer', 'learner')
    `);
    
    await queryRunner.query(`
      CREATE TYPE "membership_status_enum" AS ENUM('invited', 'active', 'inactive', 'removed')
    `);

    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "email" character varying(255) NOT NULL,
    "roles" character varying(255) NOT NULL,
    "passwordHash" character varying(255),
    "organizationId" character varying(255),
    "failedLoginAttempts" character varying(255),
    "lastLoginIp" character varying(255),
    "firstName" character varying(100) NOT NULL,
    "lastName" character varying(100) NOT NULL,
    "phone" character varying(20),
    "avatarUrl" text,
    "locale" character varying(10) NOT NULL DEFAULT 'en',
    "timezone" character varying(50) NOT NULL DEFAULT 'UTC',
    "status" "user_status_enum" NOT NULL DEFAULT 'active',
    "emailVerified" boolean NOT NULL DEFAULT false,
    "phoneVerified" boolean NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP,
    "emailVerificationToken" character varying(255),
    "emailVerificationExpiresAt" TIMESTAMP,
    "passwordResetToken" character varying(255),
    "passwordResetExpiresAt" TIMESTAMP,
    "refreshTokenHash" character varying(255),
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
    "deletedAt" TIMESTAMP,
    CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);

    // Create organizations table
    await queryRunner.query(`
      CREATE TABLE "organizations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "slug" character varying(100) NOT NULL,
        "domain" character varying(255),
        "logoUrl" text,
        "website" character varying(255),
        "industry" character varying(100),
        "size" "organization_size_enum",
        "timezone" character varying(50) NOT NULL DEFAULT 'UTC',
        "status" "organization_status_enum" NOT NULL DEFAULT 'trial',
        "settings" jsonb NOT NULL DEFAULT '{}',
        "createdBy" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_organizations_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_organizations_createdBy" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);

    // Create organization_memberships table
    await queryRunner.query(`
      CREATE TABLE "organization_memberships" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "organizationId" uuid NOT NULL,
        "role" "membership_role_enum" NOT NULL,
        "status" "membership_status_enum" NOT NULL DEFAULT 'active',
        "invitedBy" uuid,
        "invitedAt" TIMESTAMP,
        "joinedAt" TIMESTAMP,
        "invitationToken" character varying(255),
        "invitationExpiresAt" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_organization_memberships_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_organization_memberships_user_org" UNIQUE ("userId", "organizationId"),
        CONSTRAINT "FK_organization_memberships_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "FK_organization_memberships_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "FK_organization_memberships_invitedBy" FOREIGN KEY ("invitedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
      )
    `);

    // Create permissions table
    await queryRunner.query(`
      CREATE TABLE "permissions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(100) NOT NULL,
        "resource" character varying(50) NOT NULL,
        "action" character varying(50) NOT NULL,
        "description" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_permissions_id" PRIMARY KEY ("id")
      )
    `);

    // Create roles table
    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(100) NOT NULL,
        "description" text,
        "organizationId" uuid,
        "isSystem" boolean NOT NULL DEFAULT false,
        "permissions" text array NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_roles_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_roles_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    // Create role_permissions junction table
    await queryRunner.query(`
      CREATE TABLE "role_permissions" (
        "roleId" uuid NOT NULL,
        "permissionId" uuid NOT NULL,
        CONSTRAINT "PK_role_permissions" PRIMARY KEY ("roleId", "permissionId"),
        CONSTRAINT "FK_role_permissions_roleId" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "FK_role_permissions_permissionId" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    // Create audit_logs table
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "actorId" uuid,
        "organizationId" uuid,
        "action" character varying(100) NOT NULL,
        "resourceType" character varying(50) NOT NULL,
        "resourceId" uuid,
        "oldValues" jsonb,
        "newValues" jsonb,
        "metadata" jsonb NOT NULL DEFAULT '{}',
        "ipAddress" inet,
        "userAgent" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_audit_logs_actorId" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "FK_audit_logs_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "ai_interview_status_enum" AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'cancelled');
      CREATE TYPE "interview_format_enum" AS ENUM ('voice_only', 'video', 'text_only', 'mixed');
      CREATE TYPE "interview_difficulty_enum" AS ENUM ('easy', 'medium', 'hard');

      CREATE TABLE "ai_mock_interviews" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "job_role" character varying(255) NOT NULL,
        "job_description" text,
        "cancellationReason" text,
        "failureReason" text,
        "company_name" character varying(255),
        "difficulty" "interview_difficulty_enum" NOT NULL DEFAULT 'medium',
        "duration_minutes" integer NOT NULL DEFAULT 30,
        "format" "interview_format_enum" NOT NULL DEFAULT 'voice_only',
        "status" "ai_interview_status_enum" NOT NULL DEFAULT 'pending',
        "started_at" TIMESTAMP,
        "completed_at" TIMESTAMP,
        "config" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "transcript" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "ai_feedback" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "overall_score" integer,
        "performance_metrics" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "improvement_areas" text[] NOT NULL DEFAULT '{}',
        "strengths" text[] NOT NULL DEFAULT '{}',
        "skills_assessed" text[] NOT NULL DEFAULT '{}',
        "skill_scores" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "ai_model_version" character varying(255),
        "recording_urls" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "analytics" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "follow_up_recommendations" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ai_mock_interviews_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ai_mock_interviews_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );

      CREATE INDEX "IDX_ai_mock_interviews_userId_status" ON "ai_mock_interviews" ("user_id", "status");
      CREATE INDEX "IDX_ai_mock_interviews_jobRole_difficulty" ON "ai_mock_interviews" ("job_role", "difficulty");
      CREATE INDEX "IDX_ai_mock_interviews_createdAt" ON "ai_mock_interviews" ("created_at");
    `);

    // Create files table
    await queryRunner.query(`
       -- Create enums
      CREATE TYPE "fileOwnerTypeEnum" AS ENUM ('user', 'organization', 'system');
      CREATE TYPE "fileAccessLevelEnum" AS ENUM ('private', 'organization', 'public', 'link_only');
      CREATE TYPE "virusScanStatusEnum" AS ENUM ('pending', 'scanning', 'clean', 'infected', 'error');
      CREATE TYPE "fileProcessingStatusEnum" AS ENUM ('pending', 'processing', 'completed', 'failed');

      -- Create table with camelCase column names
      CREATE TABLE "files" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "ownerId" uuid,
        "organizationId" uuid,
        "ownerType" "fileOwnerTypeEnum" NOT NULL,
        "filename" character varying(255) NOT NULL,
        "originalFilename" character varying(255) NOT NULL,
        "mimeType" character varying(100) NOT NULL,
        "sizeBytes" bigint NOT NULL,
        "storagePath" text NOT NULL,
        "publicUrl" text,
        "cdnUrl" text,
        "thumbnailUrl" text,
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "virusScanStatus" "virusScanStatusEnum" NOT NULL DEFAULT 'pending',
        "virusScanResult" text,
        "virusScanAt" TIMESTAMP,
        "processingStatus" "fileProcessingStatusEnum" NOT NULL DEFAULT 'pending',
        "processingError" text,
        "accessLevel" "fileAccessLevelEnum" NOT NULL DEFAULT 'private',
        "downloadCount" integer NOT NULL DEFAULT 0,
        "viewCount" integer NOT NULL DEFAULT 0,
        "lastAccessedAt" TIMESTAMP,
        "expiresAt" TIMESTAMP,
        "tags" text[] NOT NULL DEFAULT '{}',
        "description" character varying(255),
        "checksum" character varying(64),
        "isProcessed" boolean NOT NULL DEFAULT false,
        "isArchived" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_files_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_files_ownerId" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_files_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL
      );

      -- Indexes
      CREATE INDEX "IDX_files_ownerId_ownerType" ON "files" ("ownerId", "ownerType");
      CREATE INDEX "IDX_files_organizationId" ON "files" ("organizationId");
      CREATE INDEX "IDX_files_mimeType" ON "files" ("mimeType");
      CREATE INDEX "IDX_files_accessLevel" ON "files" ("accessLevel");
      CREATE INDEX "IDX_files_virusScanStatus" ON "files" ("virusScanStatus");
      CREATE INDEX "IDX_files_createdAt" ON "files" ("createdAt");
      CREATE INDEX "IDX_files_expiresAt" ON "files" ("expiresAt");
    `);

    //Create Course table
    await queryRunner.query(`
      -- ==========================================================
      -- ENUMS
      -- ==========================================================
      CREATE TYPE "courseStatusEnum" AS ENUM ('draft', 'published', 'archived', 'suspended');
      CREATE TYPE "courseDifficultyEnum" AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');
      CREATE TYPE "courseAccessTypeEnum" AS ENUM ('free', 'paid', 'premium', 'organization_only');

      -- ==========================================================
      -- TABLE: courses
      -- ==========================================================
      CREATE TABLE "courses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organizationId" uuid NOT NULL,
        "instructorId" uuid NOT NULL,
        "title" character varying(255) NOT NULL,
        "slug" character varying(255) NOT NULL UNIQUE,
        "description" text,
        "shortDescription" text,
        "learningObjectives" text,
        "prerequisites" text,
        "category" character varying(100),
        "tags" text[] NOT NULL DEFAULT '{}',
        "status" "courseStatusEnum" NOT NULL DEFAULT 'draft',
        "difficulty" "courseDifficultyEnum" NOT NULL DEFAULT 'beginner',
        "accessType" "courseAccessTypeEnum" NOT NULL DEFAULT 'free',
        "price" numeric(10,2),
        "currency" character varying(3) NOT NULL DEFAULT 'USD',
        "thumbnailFileId" uuid,
        "previewVideoFileId" uuid,
        "thumbnailUrl" text,
        "previewVideoUrl" text,
        "estimatedDurationMinutes" integer NOT NULL DEFAULT 0,
        "totalLessons" integer NOT NULL DEFAULT 0,
        "totalModules" integer NOT NULL DEFAULT 0,
        "totalAssessments" integer NOT NULL DEFAULT 0,
        "averageRating" numeric(3,2) NOT NULL DEFAULT 0,
        "totalRatings" integer NOT NULL DEFAULT 0,
        "totalEnrollments" integer NOT NULL DEFAULT 0,
        "totalCompletions" integer NOT NULL DEFAULT 0,
        "viewCount" integer NOT NULL DEFAULT 0,
        "isPublished" boolean NOT NULL DEFAULT false,
        "allowEnrollment" boolean NOT NULL DEFAULT true,
        "requiresApproval" boolean NOT NULL DEFAULT false,
        "generateCertificate" boolean NOT NULL DEFAULT true,
        "passingScore" integer,
        "maxAttempts" integer,
        "timeLimit" integer,
        "publishedAt" TIMESTAMP,
        "enrollmentStartDate" TIMESTAMP,
        "enrollmentEndDate" TIMESTAMP,
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "settings" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "version" integer NOT NULL DEFAULT 0,
        "isArchived" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_courses_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_courses_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_courses_instructorId" FOREIGN KEY ("instructorId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_courses_thumbnailFileId" FOREIGN KEY ("thumbnailFileId") REFERENCES "files"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_courses_previewVideoFileId" FOREIGN KEY ("previewVideoFileId") REFERENCES "files"("id") ON DELETE SET NULL
      );

      -- ==========================================================
      -- INDEXES
      -- ==========================================================
      CREATE INDEX "IDX_courses_organizationId" ON "courses" ("organizationId");
      CREATE INDEX "IDX_courses_instructorId" ON "courses" ("instructorId");
      CREATE INDEX "IDX_courses_status" ON "courses" ("status");
      CREATE INDEX "IDX_courses_category" ON "courses" ("category");
      CREATE INDEX "IDX_courses_difficulty" ON "courses" ("difficulty");
      CREATE INDEX "IDX_courses_accessType" ON "courses" ("accessType");
      CREATE INDEX "IDX_courses_isPublished" ON "courses" ("isPublished");
      CREATE INDEX "IDX_courses_created_at" ON "courses" ("created_at");
      CREATE INDEX "IDX_courses_slug" ON "courses" ("slug");
    `);




    // Create indexes for better performance
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_users_email" ON "users" ("email")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_users_phone" ON "users" ("phone") WHERE "phone" IS NOT NULL`);
    await queryRunner.query(`CREATE INDEX "IDX_users_status" ON "users" ("status")`);
    
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_organizations_slug" ON "organizations" ("slug")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_organizations_domain" ON "organizations" ("domain") WHERE "domain" IS NOT NULL`);
    await queryRunner.query(`CREATE INDEX "IDX_organizations_status" ON "organizations" ("status")`);
    
    await queryRunner.query(`CREATE INDEX "IDX_organization_memberships_userId_organizationId" ON "organization_memberships" ("userId", "organizationId")`);
    await queryRunner.query(`CREATE INDEX "IDX_organization_memberships_organizationId_role" ON "organization_memberships" ("organizationId", "role")`);
    await queryRunner.query(`CREATE INDEX "IDX_organization_memberships_status" ON "organization_memberships" ("status")`);
    
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_permissions_name" ON "permissions" ("name")`);
    await queryRunner.query(`CREATE INDEX "IDX_permissions_resource_action" ON "permissions" ("resource", "action")`);
    
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_roles_name_organizationId" ON "roles" ("name", "organizationId")`);
    
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_actorId" ON "audit_logs" ("actorId")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_organizationId" ON "audit_logs" ("organizationId")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_resourceType_resourceId" ON "audit_logs" ("resourceType", "resourceId")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_action" ON "audit_logs" ("action")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_created_at" ON "audit_logs" ("created_at")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TABLE "role_permissions"`);
    await queryRunner.query(`DROP TABLE "roles"`);
    await queryRunner.query(`DROP TABLE "permissions"`);
    await queryRunner.query(`DROP TABLE "organization_memberships"`);
    await queryRunner.query(`DROP TABLE "organizations"`);
    await queryRunner.query(`DROP TABLE "users"`);
    
    // Drop enums
    await queryRunner.query(`DROP TYPE "membership_status_enum"`);
    await queryRunner.query(`DROP TYPE "membership_role_enum"`);
    await queryRunner.query(`DROP TYPE "organization_status_enum"`);
    await queryRunner.query(`DROP TYPE "organization_size_enum"`);
    await queryRunner.query(`DROP TYPE "user_status_enum"`);
  }
}
