import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial migration to create core tables for authentication and organization management
 * Creates users, organizations, memberships, roles, permissions, and audit logs tables
 */
export class InitialMigration1698000000000 implements MigrationInterface {
  name = 'InitialMigration1698000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums
    // await queryRunner.query(`
    //   CREATE TYPE "user_status_enum" AS ENUM('active', 'inactive', 'suspended', 'deleted')
    // `);
    
    // await queryRunner.query(`
    //   CREATE TYPE "organization_size_enum" AS ENUM('startup', 'small', 'medium', 'large', 'enterprise')
    // `);
    
    // await queryRunner.query(`
    //   CREATE TYPE "organization_status_enum" AS ENUM('active', 'trial', 'suspended', 'cancelled')
    // `);
    
    // await queryRunner.query(`
    //   CREATE TYPE "membership_role_enum" AS ENUM('owner', 'admin', 'manager', 'hr', 'interviewer', 'learner')
    // `);
    
    // await queryRunner.query(`
    //   CREATE TYPE "membership_status_enum" AS ENUM('invited', 'active', 'inactive', 'removed')
    // `);

    // // Create users table
    // await queryRunner.query(`
    //   CREATE TABLE "users" (
    //     "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    // "email" character varying(255) NOT NULL,
    // "roles" character varying(255) NOT NULL,
    // "passwordHash" character varying(255),
    // "organizationId" character varying(255),
    // "failedLoginAttempts" character varying(255),
    // "lastLoginIp" character varying(255),
    // "firstName" character varying(100) NOT NULL,
    // "lastName" character varying(100) NOT NULL,
    // "phone" character varying(20),
    // "avatarUrl" text,
    // "locale" character varying(10) NOT NULL DEFAULT 'en',
    // "timezone" character varying(50) NOT NULL DEFAULT 'UTC',
    // "status" "user_status_enum" NOT NULL DEFAULT 'active',
    // "emailVerified" boolean NOT NULL DEFAULT false,
    // "phoneVerified" boolean NOT NULL DEFAULT false,
    // "lastLoginAt" TIMESTAMP,
    // "emailVerificationToken" character varying(255),
    // "emailVerificationExpiresAt" TIMESTAMP,
    // "passwordResetToken" character varying(255),
    // "passwordResetExpiresAt" TIMESTAMP,
    // "refreshTokenHash" character varying(255),
    // "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    // "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
    // "deletedAt" TIMESTAMP,
    // CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
    //   )
    // `);

    // // Create organizations table
    // await queryRunner.query(`
    //   CREATE TABLE "organizations" (
    //     "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    //     "name" character varying(255) NOT NULL,
    //     "slug" character varying(100) NOT NULL,
    //     "domain" character varying(255),
    //     "logoUrl" text,
    //     "website" character varying(255),
    //     "industry" character varying(100),
    //     "size" "organization_size_enum",
    //     "timezone" character varying(50) NOT NULL DEFAULT 'UTC',
    //     "status" "organization_status_enum" NOT NULL DEFAULT 'trial',
    //     "settings" jsonb NOT NULL DEFAULT '{}',
    //     "createdBy" uuid NOT NULL,
    //     "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    //     "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
    //     CONSTRAINT "PK_organizations_id" PRIMARY KEY ("id"),
    //     CONSTRAINT "FK_organizations_createdBy" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    //   )
    // `);

    // // Create organization_memberships table
    // await queryRunner.query(`
    //   CREATE TABLE "organization_memberships" (
    //     "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    //     "userId" uuid NOT NULL,
    //     "organizationId" uuid NOT NULL,
    //     "role" "membership_role_enum" NOT NULL,
    //     "status" "membership_status_enum" NOT NULL DEFAULT 'active',
    //     "invitedBy" uuid,
    //     "invitedAt" TIMESTAMP,
    //     "joinedAt" TIMESTAMP,
    //     "invitationToken" character varying(255),
    //     "invitationExpiresAt" TIMESTAMP,
    //     "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    //     CONSTRAINT "PK_organization_memberships_id" PRIMARY KEY ("id"),
    //     CONSTRAINT "UQ_organization_memberships_user_org" UNIQUE ("userId", "organizationId"),
    //     CONSTRAINT "FK_organization_memberships_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    //     CONSTRAINT "FK_organization_memberships_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    //     CONSTRAINT "FK_organization_memberships_invitedBy" FOREIGN KEY ("invitedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
    //   )
    // `);

    // // Create permissions table
    // await queryRunner.query(`
    //   CREATE TABLE "permissions" (
    //     "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    //     "name" character varying(100) NOT NULL,
    //     "resource" character varying(50) NOT NULL,
    //     "action" character varying(50) NOT NULL,
    //     "description" text,
    //     "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    //     CONSTRAINT "PK_permissions_id" PRIMARY KEY ("id")
    //   )
    // `);

    // // Create roles table
    // await queryRunner.query(`
    //   CREATE TABLE "roles" (
    //     "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    //     "name" character varying(100) NOT NULL,
    //     "description" text,
    //     "organizationId" uuid,
    //     "isSystem" boolean NOT NULL DEFAULT false,
    //     "permissions" text array NOT NULL DEFAULT '{}',
    //     "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    //     CONSTRAINT "PK_roles_id" PRIMARY KEY ("id"),
    //     CONSTRAINT "FK_roles_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
    //   )
    // `);

    // // Create role_permissions junction table
    // await queryRunner.query(`
    //   CREATE TABLE "role_permissions" (
    //     "roleId" uuid NOT NULL,
    //     "permissionId" uuid NOT NULL,
    //     CONSTRAINT "PK_role_permissions" PRIMARY KEY ("roleId", "permissionId"),
    //     CONSTRAINT "FK_role_permissions_roleId" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    //     CONSTRAINT "FK_role_permissions_permissionId" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE
    //   )
    // `);

    // // Create audit_logs table
    // await queryRunner.query(`
    //   CREATE TABLE "audit_logs" (
    //     "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    //     "actorId" uuid,
    //     "organizationId" uuid,
    //     "action" character varying(100) NOT NULL,
    //     "resourceType" character varying(50) NOT NULL,
    //     "resourceId" uuid,
    //     "oldValues" jsonb,
    //     "newValues" jsonb,
    //     "metadata" jsonb NOT NULL DEFAULT '{}',
    //     "ipAddress" inet,
    //     "userAgent" text,
    //     "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    //     CONSTRAINT "PK_audit_logs_id" PRIMARY KEY ("id"),
    //     CONSTRAINT "FK_audit_logs_actorId" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    //     CONSTRAINT "FK_audit_logs_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE
    //   )
    // `);

    // await queryRunner.query(`
    //   CREATE TYPE "ai_interview_status_enum" AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'cancelled');
    //   CREATE TYPE "interview_format_enum" AS ENUM ('voice_only', 'video', 'text_only', 'mixed');
    //   CREATE TYPE "interview_difficulty_enum" AS ENUM ('easy', 'medium', 'hard');

    //   CREATE TABLE "ai_mock_interviews" (
    //     "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    //     "user_id" uuid NOT NULL,
    //     "job_role" character varying(255) NOT NULL,
    //     "job_description" text,
    //     "cancellationReason" text,
    //     "failureReason" text,
    //     "company_name" character varying(255),
    //     "difficulty" "interview_difficulty_enum" NOT NULL DEFAULT 'medium',
    //     "duration_minutes" integer NOT NULL DEFAULT 30,
    //     "format" "interview_format_enum" NOT NULL DEFAULT 'voice_only',
    //     "status" "ai_interview_status_enum" NOT NULL DEFAULT 'pending',
    //     "started_at" TIMESTAMP,
    //     "completed_at" TIMESTAMP,
    //     "config" jsonb NOT NULL DEFAULT '{}'::jsonb,
    //     "transcript" jsonb NOT NULL DEFAULT '{}'::jsonb,
    //     "ai_feedback" jsonb NOT NULL DEFAULT '{}'::jsonb,
    //     "overall_score" integer,
    //     "performance_metrics" jsonb NOT NULL DEFAULT '{}'::jsonb,
    //     "improvement_areas" text[] NOT NULL DEFAULT '{}',
    //     "strengths" text[] NOT NULL DEFAULT '{}',
    //     "skills_assessed" text[] NOT NULL DEFAULT '{}',
    //     "skill_scores" jsonb NOT NULL DEFAULT '{}'::jsonb,
    //     "ai_model_version" character varying(255),
    //     "recording_urls" jsonb NOT NULL DEFAULT '{}'::jsonb,
    //     "analytics" jsonb NOT NULL DEFAULT '{}'::jsonb,
    //     "follow_up_recommendations" jsonb NOT NULL DEFAULT '{}'::jsonb,
    //     "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
    //     "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    //     "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
    //     CONSTRAINT "PK_ai_mock_interviews_id" PRIMARY KEY ("id"),
    //     CONSTRAINT "FK_ai_mock_interviews_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    //   );

    //   CREATE INDEX "IDX_ai_mock_interviews_userId_status" ON "ai_mock_interviews" ("user_id", "status");
    //   CREATE INDEX "IDX_ai_mock_interviews_jobRole_difficulty" ON "ai_mock_interviews" ("job_role", "difficulty");
    //   CREATE INDEX "IDX_ai_mock_interviews_createdAt" ON "ai_mock_interviews" ("created_at");
    // `);

    // // Create files table
    // await queryRunner.query(`
    //    -- Create enums
    //   CREATE TYPE "fileOwnerTypeEnum" AS ENUM ('user', 'organization', 'system');
    //   CREATE TYPE "fileAccessLevelEnum" AS ENUM ('private', 'organization', 'public', 'link_only');
    //   CREATE TYPE "virusScanStatusEnum" AS ENUM ('pending', 'scanning', 'clean', 'infected', 'error');
    //   CREATE TYPE "fileProcessingStatusEnum" AS ENUM ('pending', 'processing', 'completed', 'failed');

    //   -- Create table with camelCase column names
    //   CREATE TABLE "files" (
    //     "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    //     "ownerId" uuid,
    //     "organizationId" uuid,
    //     "ownerType" "fileOwnerTypeEnum" NOT NULL,
    //     "filename" character varying(255) NOT NULL,
    //     "originalFilename" character varying(255) NOT NULL,
    //     "mimeType" character varying(100) NOT NULL,
    //     "sizeBytes" bigint NOT NULL,
    //     "storagePath" text NOT NULL,
    //     "publicUrl" text,
    //     "cdnUrl" text,
    //     "thumbnailUrl" text,
    //     "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
    //     "virusScanStatus" "virusScanStatusEnum" NOT NULL DEFAULT 'pending',
    //     "virusScanResult" text,
    //     "virusScanAt" TIMESTAMP,
    //     "processingStatus" "fileProcessingStatusEnum" NOT NULL DEFAULT 'pending',
    //     "processingError" text,
    //     "accessLevel" "fileAccessLevelEnum" NOT NULL DEFAULT 'private',
    //     "downloadCount" integer NOT NULL DEFAULT 0,
    //     "viewCount" integer NOT NULL DEFAULT 0,
    //     "lastAccessedAt" TIMESTAMP,
    //     "expiresAt" TIMESTAMP,
    //     "tags" text[] NOT NULL DEFAULT '{}',
    //     "description" character varying(255),
    //     "checksum" character varying(64),
    //     "isProcessed" boolean NOT NULL DEFAULT false,
    //     "isArchived" boolean NOT NULL DEFAULT false,
    //     "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    //     "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    //     CONSTRAINT "PK_files_id" PRIMARY KEY ("id"),
    //     CONSTRAINT "FK_files_ownerId" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL,
    //     CONSTRAINT "FK_files_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL
    //   );

    //   -- Indexes
    //   CREATE INDEX "IDX_files_ownerId_ownerType" ON "files" ("ownerId", "ownerType");
    //   CREATE INDEX "IDX_files_organizationId" ON "files" ("organizationId");
    //   CREATE INDEX "IDX_files_mimeType" ON "files" ("mimeType");
    //   CREATE INDEX "IDX_files_accessLevel" ON "files" ("accessLevel");
    //   CREATE INDEX "IDX_files_virusScanStatus" ON "files" ("virusScanStatus");
    //   CREATE INDEX "IDX_files_createdAt" ON "files" ("createdAt");
    //   CREATE INDEX "IDX_files_expiresAt" ON "files" ("expiresAt");
    // `);

    // //Create Course table
    // await queryRunner.query(`
    //   -- ==========================================================
    //   -- ENUMS
    //   -- ==========================================================
    //   CREATE TYPE "courseStatusEnum" AS ENUM ('draft', 'published', 'archived', 'suspended');
    //   CREATE TYPE "courseDifficultyEnum" AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');
    //   CREATE TYPE "courseAccessTypeEnum" AS ENUM ('free', 'paid', 'premium', 'organization_only');

    //   -- ==========================================================
    //   -- TABLE: courses
    //   -- ==========================================================
    //   CREATE TABLE "courses" (
    //     "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    //     "organizationId" uuid NOT NULL,
    //     "instructorId" uuid NOT NULL,
    //     "title" character varying(255) NOT NULL,
    //     "slug" character varying(255) NOT NULL UNIQUE,
    //     "description" text,
    //     "shortDescription" text,
    //     "learningObjectives" text,
    //     "prerequisites" text,
    //     "category" character varying(100),
    //     "tags" text[] NOT NULL DEFAULT '{}',
    //     "status" "courseStatusEnum" NOT NULL DEFAULT 'draft',
    //     "difficulty" "courseDifficultyEnum" NOT NULL DEFAULT 'beginner',
    //     "accessType" "courseAccessTypeEnum" NOT NULL DEFAULT 'free',
    //     "price" numeric(10,2),
    //     "currency" character varying(3) NOT NULL DEFAULT 'USD',
    //     "thumbnailFileId" uuid,
    //     "previewVideoFileId" uuid,
    //     "thumbnailUrl" text,
    //     "previewVideoUrl" text,
    //     "estimatedDurationMinutes" integer NOT NULL DEFAULT 0,
    //     "totalLessons" integer NOT NULL DEFAULT 0,
    //     "totalModules" integer NOT NULL DEFAULT 0,
    //     "totalAssessments" integer NOT NULL DEFAULT 0,
    //     "averageRating" numeric(3,2) NOT NULL DEFAULT 0,
    //     "totalRatings" integer NOT NULL DEFAULT 0,
    //     "totalEnrollments" integer NOT NULL DEFAULT 0,
    //     "totalCompletions" integer NOT NULL DEFAULT 0,
    //     "viewCount" integer NOT NULL DEFAULT 0,
    //     "isPublished" boolean NOT NULL DEFAULT false,
    //     "allowEnrollment" boolean NOT NULL DEFAULT true,
    //     "requiresApproval" boolean NOT NULL DEFAULT false,
    //     "generateCertificate" boolean NOT NULL DEFAULT true,
    //     "passingScore" integer,
    //     "maxAttempts" integer,
    //     "timeLimit" integer,
    //     "publishedAt" TIMESTAMP,
    //     "enrollmentStartDate" TIMESTAMP,
    //     "enrollmentEndDate" TIMESTAMP,
    //     "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
    //     "settings" jsonb NOT NULL DEFAULT '{}'::jsonb,
    //     "version" integer NOT NULL DEFAULT 0,
    //     "isArchived" boolean NOT NULL DEFAULT false,
    //     "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    //     "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    //     CONSTRAINT "PK_courses_id" PRIMARY KEY ("id"),
    //     CONSTRAINT "FK_courses_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
    //     CONSTRAINT "FK_courses_instructorId" FOREIGN KEY ("instructorId") REFERENCES "users"("id") ON DELETE CASCADE,
    //     CONSTRAINT "FK_courses_thumbnailFileId" FOREIGN KEY ("thumbnailFileId") REFERENCES "files"("id") ON DELETE SET NULL,
    //     CONSTRAINT "FK_courses_previewVideoFileId" FOREIGN KEY ("previewVideoFileId") REFERENCES "files"("id") ON DELETE SET NULL
    //   );

    //   -- ==========================================================
    //   -- INDEXES
    //   -- ==========================================================
    //   CREATE INDEX "IDX_courses_organizationId" ON "courses" ("organizationId");
    //   CREATE INDEX "IDX_courses_instructorId" ON "courses" ("instructorId");
    //   CREATE INDEX "IDX_courses_status" ON "courses" ("status");
    //   CREATE INDEX "IDX_courses_category" ON "courses" ("category");
    //   CREATE INDEX "IDX_courses_difficulty" ON "courses" ("difficulty");
    //   CREATE INDEX "IDX_courses_accessType" ON "courses" ("accessType");
    //   CREATE INDEX "IDX_courses_isPublished" ON "courses" ("isPublished");
    //   CREATE INDEX "IDX_courses_created_at" ON "courses" ("created_at");
    //   CREATE INDEX "IDX_courses_slug" ON "courses" ("slug");
    // `);




    // // Create indexes for better performance
    // await queryRunner.query(`CREATE UNIQUE INDEX "IDX_users_email" ON "users" ("email")`);
    // await queryRunner.query(`CREATE UNIQUE INDEX "IDX_users_phone" ON "users" ("phone") WHERE "phone" IS NOT NULL`);
    // await queryRunner.query(`CREATE INDEX "IDX_users_status" ON "users" ("status")`);
    
    // await queryRunner.query(`CREATE UNIQUE INDEX "IDX_organizations_slug" ON "organizations" ("slug")`);
    // await queryRunner.query(`CREATE UNIQUE INDEX "IDX_organizations_domain" ON "organizations" ("domain") WHERE "domain" IS NOT NULL`);
    // await queryRunner.query(`CREATE INDEX "IDX_organizations_status" ON "organizations" ("status")`);
    
    // await queryRunner.query(`CREATE INDEX "IDX_organization_memberships_userId_organizationId" ON "organization_memberships" ("userId", "organizationId")`);
    // await queryRunner.query(`CREATE INDEX "IDX_organization_memberships_organizationId_role" ON "organization_memberships" ("organizationId", "role")`);
    // await queryRunner.query(`CREATE INDEX "IDX_organization_memberships_status" ON "organization_memberships" ("status")`);
    
    // await queryRunner.query(`CREATE UNIQUE INDEX "IDX_permissions_name" ON "permissions" ("name")`);
    // await queryRunner.query(`CREATE INDEX "IDX_permissions_resource_action" ON "permissions" ("resource", "action")`);
    
    // await queryRunner.query(`CREATE UNIQUE INDEX "IDX_roles_name_organizationId" ON "roles" ("name", "organizationId")`);
    
    // await queryRunner.query(`CREATE INDEX "IDX_audit_logs_actorId" ON "audit_logs" ("actorId")`);
    // await queryRunner.query(`CREATE INDEX "IDX_audit_logs_organizationId" ON "audit_logs" ("organizationId")`);
    // await queryRunner.query(`CREATE INDEX "IDX_audit_logs_resourceType_resourceId" ON "audit_logs" ("resourceType", "resourceId")`);
    // await queryRunner.query(`CREATE INDEX "IDX_audit_logs_action" ON "audit_logs" ("action")`);
    // await queryRunner.query(`CREATE INDEX "IDX_audit_logs_created_at" ON "audit_logs" ("created_at")`);


    //*********************************************************** */


    
// Users Table
await queryRunner.query(`
  -- Create enums
  CREATE TYPE "userStatusEnum" AS ENUM ('active', 'inactive', 'suspended', 'deleted');

  -- Create table
  CREATE TABLE "users" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "email" character varying(255) NOT NULL UNIQUE,
    "roles" character varying(255) NOT NULL UNIQUE,
    "passwordHash" character varying(255),
    "organizationId" character varying(255),
    "failedLoginAttempts" character varying(255),
    "lastLoginIp" character varying(255),
    "firstName" character varying(100) NOT NULL,
    "lastName" character varying(100) NOT NULL,
    "phone" character varying(20) UNIQUE,
    "avatarUrl" text,
    "locale" character varying(10) NOT NULL DEFAULT 'en',
    "timezone" character varying(50) NOT NULL DEFAULT 'UTC',
    "status" "userStatusEnum" NOT NULL DEFAULT 'active',
    "emailVerified" boolean NOT NULL DEFAULT false,
    "phoneVerified" boolean NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP,
    "emailVerificationToken" character varying(255),
    "emailVerificationExpiresAt" TIMESTAMP,
    "passwordResetToken" character varying(255),
    "passwordResetExpiresAt" TIMESTAMP,
    "refreshTokenHash" character varying(255),
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    "deletedAt" TIMESTAMP,
    CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
  );

  -- Indexes
  CREATE UNIQUE INDEX "IDX_users_email" ON "users" ("email");
  CREATE UNIQUE INDEX "IDX_users_roles" ON "users" ("roles");
  CREATE UNIQUE INDEX "IDX_users_phone" ON "users" ("phone") WHERE "phone" IS NOT NULL;
  CREATE INDEX "IDX_users_status" ON "users" ("status");
  CREATE INDEX "IDX_users_createdAt" ON "users" ("createdAt");
  CREATE INDEX "IDX_users_organizationId" ON "users" ("organizationId");
`);

// Organizations Table
await queryRunner.query(`
  -- Create enums
  CREATE TYPE "organizationSizeEnum" AS ENUM ('startup', 'small', 'medium', 'large', 'enterprise');
  CREATE TYPE "organizationStatusEnum" AS ENUM ('active', 'trial', 'suspended', 'cancelled');

  -- Create table
  CREATE TABLE "organizations" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "name" character varying(255) NOT NULL,
    "slug" character varying(100) NOT NULL,
    "domain" character varying(255),
    "logoUrl" text,
    "website" character varying(255),
    "industry" character varying(100),
    "size" "organizationSizeEnum",
    "timezone" character varying(50) NOT NULL DEFAULT 'UTC',
    "status" "organizationStatusEnum" NOT NULL DEFAULT 'trial',
    "settings" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "createdBy" uuid NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_organizations_id" PRIMARY KEY ("id"),
    CONSTRAINT "UQ_organizations_slug" UNIQUE ("slug"),
    CONSTRAINT "UQ_organizations_domain" UNIQUE ("domain"),
    CONSTRAINT "FK_organizations_createdBy" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE
  );

  -- Indexes
  CREATE UNIQUE INDEX "IDX_organizations_slug" ON "organizations" ("slug");
  CREATE UNIQUE INDEX "IDX_organizations_domain" ON "organizations" ("domain") WHERE domain IS NOT NULL;
  CREATE INDEX "IDX_organizations_status" ON "organizations" ("status");
`);


// Organization Memberships Table
await queryRunner.query(`
  -- Create enums
  CREATE TYPE "membershipRoleEnum" AS ENUM ('owner', 'admin', 'manager', 'hr', 'interviewer', 'learner');
  CREATE TYPE "membershipStatusEnum" AS ENUM ('invited', 'active', 'inactive', 'removed');

  -- Create table
  CREATE TABLE "organization_memberships" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "userId" uuid NOT NULL,
    "organizationId" uuid NOT NULL,
    "role" "membershipRoleEnum" NOT NULL,
    "status" "membershipStatusEnum" NOT NULL DEFAULT 'active',
    "invitedBy" uuid,
    "invitedAt" TIMESTAMP,
    "joinedAt" TIMESTAMP,
    "invitationToken" character varying(255),
    "invitationExpiresAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_organization_memberships_id" PRIMARY KEY ("id"),
    CONSTRAINT "UQ_organization_memberships_userId_organizationId" UNIQUE ("userId", "organizationId"),
    CONSTRAINT "FK_organization_memberships_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_organization_memberships_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_organization_memberships_invitedBy" FOREIGN KEY ("invitedBy") REFERENCES "users"("id") ON DELETE SET NULL
  );

  -- Indexes
  CREATE INDEX "IDX_organization_memberships_userId_organizationId" ON "organization_memberships" ("userId", "organizationId");
  CREATE INDEX "IDX_organization_memberships_organizationId_role" ON "organization_memberships" ("organizationId", "role");
  CREATE INDEX "IDX_organization_memberships_status" ON "organization_memberships" ("status");
`);





    //Ai Mock Interview table
    await queryRunner.query(`
      -- Create enums
      CREATE TYPE "aiInterviewStatusEnum" AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'cancelled');
      CREATE TYPE "interviewFormatEnum" AS ENUM ('voice_only', 'video', 'text_only', 'mixed');
      CREATE TYPE "interviewDifficultyEnum" AS ENUM ('easy', 'medium', 'hard');

      -- Create table
      CREATE TABLE "ai_mock_interviews" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "jobRole" character varying(255) NOT NULL,
        "jobDescription" text,
        "cancellationReason" text,
        "failureReason" text,
        "companyName" character varying(255),
        "difficulty" "interviewDifficultyEnum" NOT NULL DEFAULT 'medium',
        "durationMinutes" integer NOT NULL DEFAULT 30,
        "format" "interviewFormatEnum" NOT NULL DEFAULT 'voice_only',
        "status" "aiInterviewStatusEnum" NOT NULL DEFAULT 'pending',
        "startedAt" TIMESTAMP,
        "completedAt" TIMESTAMP,
        "config" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "transcript" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "aiFeedback" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "overallScore" integer,
        "performanceMetrics" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "improvementAreas" text[] NOT NULL DEFAULT '{}',
        "strengths" text[] NOT NULL DEFAULT '{}',
        "skillsAssessed" text[] NOT NULL DEFAULT '{}',
        "skillScores" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "aiModelVersion" character varying(255),
        "recordingUrls" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "analytics" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "followUpRecommendations" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ai_mock_interviews_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ai_mock_interviews_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      );

      -- Indexes
      CREATE INDEX "IDX_ai_mock_interviews_userId_status" ON "ai_mock_interviews" ("userId", "status");
      CREATE INDEX "IDX_ai_mock_interviews_jobRole_difficulty" ON "ai_mock_interviews" ("jobRole", "difficulty");
      CREATE INDEX "IDX_ai_mock_interviews_createdAt" ON "ai_mock_interviews" ("createdAt");
    `);

    //Analytics Event Table
    await queryRunner.query(`
  -- Create enums
  CREATE TYPE "eventTypeEnum" AS ENUM (
    'user_login',
    'user_logout',
    'user_registration',
    'user_profile_update',
    'user_password_change',
    'course_view',
    'course_enrollment',
    'course_completion',
    'lesson_start',
    'lesson_complete',
    'assessment_start',
    'assessment_submit',
    'assessment_complete',
    'interview_schedule',
    'interview_start',
    'interview_complete',
    'ai_interview_start',
    'ai_interview_complete',
    'resume_create',
    'resume_update',
    'resume_download',
    'resume_share',
    'job_view',
    'job_application',
    'job_bookmark',
    'subscription_create',
    'subscription_upgrade',
    'subscription_cancel',
    'payment_success',
    'payment_failed',
    'api_request',
    'error_occurred',
    'feature_usage',
    'export_data',
    'login_failed',
    'suspicious_activity',
    'permission_denied',
    'content_create',
    'content_update',
    'content_delete',
    'content_moderate'
  );

  CREATE TYPE "eventCategoryEnum" AS ENUM (
    'user',
    'learning',
    'assessment',
    'interview',
    'resume',
    'job',
    'billing',
    'system',
    'security',
    'content'
  );

  -- Create table
  CREATE TABLE "analytics_events" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "eventType" "eventTypeEnum" NOT NULL,
    "category" "eventCategoryEnum" NOT NULL,
    "userId" uuid NULL,
    "organizationId" uuid NULL,
    "sessionId" character varying(255) NULL,
    "ipAddress" character varying(255) NULL,
    "userAgent" text NULL,
    "referrer" text NULL,
    "properties" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "context" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_analytics_events_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_analytics_events_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL,
    CONSTRAINT "FK_analytics_events_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL
  );

  -- Indexes
  CREATE INDEX "IDX_analytics_events_eventType_createdAt" ON "analytics_events" ("eventType", "createdAt");
  CREATE INDEX "IDX_analytics_events_userId_createdAt" ON "analytics_events" ("userId", "createdAt");
  CREATE INDEX "IDX_analytics_events_organizationId_createdAt" ON "analytics_events" ("organizationId", "createdAt");
  CREATE INDEX "IDX_analytics_events_category_createdAt" ON "analytics_events" ("category", "createdAt");
  CREATE INDEX "IDX_analytics_events_sessionId" ON "analytics_events" ("sessionId");
  CREATE INDEX "IDX_analytics_events_ipAddress" ON "analytics_events" ("ipAddress");
`);

    // Api Keys Table
await queryRunner.query(`
  -- Create enums
  CREATE TYPE "apiKeyStatusEnum" AS ENUM ('active', 'inactive', 'suspended', 'revoked', 'expired');
  CREATE TYPE "apiKeyTypeEnum" AS ENUM ('public', 'secret', 'webhook', 'integration', 'partner', 'internal');
  CREATE TYPE "apiScopeEnum" AS ENUM (
    'user:read',
    'user:write',
    'user:delete',
    'org:read',
    'org:write',
    'org:admin',
    'course:read',
    'course:write',
    'course:publish',
    'assessment:read',
    'assessment:write',
    'assessment:grade',
    'interview:read',
    'interview:write',
    'interview:schedule',
    'job:read',
    'job:write',
    'job:apply',
    'billing:read',
    'billing:write',
    'analytics:read',
    'analytics:write',
    'webhook:read',
    'webhook:write',
    'webhook:manage',
    'admin:read',
    'admin:write',
    'admin:system',
    '*',
    'read:*'
  );

  -- Create table
  CREATE TABLE "api_keys" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "name" character varying(200) NOT NULL,
    "description" text,
    "keyHash" character varying NOT NULL UNIQUE,
    "keyPrefix" character varying(20) NOT NULL,
    "type" "apiKeyTypeEnum" NOT NULL DEFAULT 'secret',
    "status" "apiKeyStatusEnum" NOT NULL DEFAULT 'active',
    "organizationId" uuid,
    "createdBy" uuid NOT NULL,
    "scopes" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "config" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "expiresAt" TIMESTAMP,
    "lastUsedAt" TIMESTAMP,
    "lastUsedIp" character varying,
    "lastUserAgent" text,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_api_keys_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_api_keys_createdBy" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_api_keys_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL
  );

  -- Indexes
  CREATE UNIQUE INDEX "IDX_api_keys_keyHash" ON "api_keys" ("keyHash");
  CREATE INDEX "IDX_api_keys_organizationId_status" ON "api_keys" ("organizationId", "status");
  CREATE INDEX "IDX_api_keys_createdBy_status" ON "api_keys" ("createdBy", "status");
  CREATE INDEX "IDX_api_keys_type_status" ON "api_keys" ("type", "status");
  CREATE INDEX "IDX_api_keys_expiresAt" ON "api_keys" ("expiresAt");
`);

      // Api Key Usage Table
      await queryRunner.query(`

      -- Create enums
      CREATE TYPE "requestMethodEnum" AS ENUM (
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'HEAD',
        'OPTIONS'
      );

      CREATE TYPE "usageStatusEnum" AS ENUM (
        'success',
        'error',
        'rate_limited',
        'unauthorized',
        'forbidden',
        'not_found'
      );

      -- Create table
      CREATE TABLE "api_key_usage" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "apiKeyId" uuid NOT NULL,
        "organizationId" uuid,
        "method" "requestMethodEnum" NOT NULL,
        "endpoint" character varying(500) NOT NULL,
        "status" "usageStatusEnum" NOT NULL,
        "statusCode" integer NOT NULL,
        "responseTime" integer NOT NULL,
        "requestSize" integer,
        "responseSize" integer,
        "ipAddress" character varying(255),
        "userAgent" text,
        "referer" text,
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_api_key_usage_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_api_key_usage_apiKeyId" FOREIGN KEY ("apiKeyId") REFERENCES "api_keys"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_api_key_usage_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL
      );

      -- Indexes
      CREATE INDEX "IDX_api_key_usage_apiKeyId_createdAt" ON "api_key_usage" ("apiKeyId", "createdAt");
      CREATE INDEX "IDX_api_key_usage_status_createdAt" ON "api_key_usage" ("status", "createdAt");
      CREATE INDEX "IDX_api_key_usage_endpoint_createdAt" ON "api_key_usage" ("endpoint", "createdAt");
      CREATE INDEX "IDX_api_key_usage_ipAddress_createdAt" ON "api_key_usage" ("ipAddress", "createdAt");
      CREATE INDEX "IDX_api_key_usage_organizationId_createdAt" ON "api_key_usage" ("organizationId", "createdAt");
    `);

// Files Table
await queryRunner.query(`
  -- Create enums
  CREATE TYPE "fileOwnerTypeEnum" AS ENUM ('user', 'organization', 'system');
  CREATE TYPE "fileAccessLevelEnum" AS ENUM ('private', 'organization', 'public', 'link_only');
  CREATE TYPE "virusScanStatusEnum" AS ENUM ('pending', 'scanning', 'clean', 'infected', 'error');
  CREATE TYPE "fileProcessingStatusEnum" AS ENUM ('pending', 'processing', 'completed', 'failed');

  -- Create table
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
    
// Courses Table
await queryRunner.query(`
  -- Create enums
  CREATE TYPE "courseStatusEnum" AS ENUM ('draft', 'published', 'archived', 'suspended');
  CREATE TYPE "courseDifficultyEnum" AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');
  CREATE TYPE "courseAccessTypeEnum" AS ENUM ('free', 'paid', 'premium', 'organization_only');

  -- Create table
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
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_courses_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_courses_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_courses_instructorId" FOREIGN KEY ("instructorId") REFERENCES "users"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_courses_thumbnailFileId" FOREIGN KEY ("thumbnailFileId") REFERENCES "files"("id") ON DELETE SET NULL,
    CONSTRAINT "FK_courses_previewVideoFileId" FOREIGN KEY ("previewVideoFileId") REFERENCES "files"("id") ON DELETE SET NULL
  );

  -- Indexes
  CREATE INDEX "IDX_courses_organizationId" ON "courses" ("organizationId");
  CREATE INDEX "IDX_courses_instructorId" ON "courses" ("instructorId");
  CREATE INDEX "IDX_courses_status" ON "courses" ("status");
  CREATE INDEX "IDX_courses_category" ON "courses" ("category");
  CREATE INDEX "IDX_courses_difficulty" ON "courses" ("difficulty");
  CREATE INDEX "IDX_courses_accessType" ON "courses" ("accessType");
  CREATE INDEX "IDX_courses_isPublished" ON "courses" ("isPublished");
  CREATE INDEX "IDX_courses_createdAt" ON "courses" ("createdAt");
  CREATE INDEX "IDX_courses_slug" ON "courses" ("slug");
`);

// Modules Table
await queryRunner.query(`
  -- Create enums
  CREATE TYPE "moduleStatusEnum" AS ENUM ('draft', 'published', 'archived');

  -- Create table
  CREATE TABLE "modules" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "courseId" uuid NOT NULL,
    "title" character varying(255) NOT NULL,
    "slug" character varying(255),
    "description" text,
    "learningObjectives" text,
    "sortOrder" integer NOT NULL DEFAULT 0,
    "status" "moduleStatusEnum" NOT NULL DEFAULT 'draft',
    "isPublished" boolean NOT NULL DEFAULT false,
    "isRequired" boolean NOT NULL DEFAULT false,
    "allowSkip" boolean NOT NULL DEFAULT false,
    "estimatedDurationMinutes" integer NOT NULL DEFAULT 0,
    "totalLessons" integer NOT NULL DEFAULT 0,
    "totalAssessments" integer NOT NULL DEFAULT 0,
    "completionCount" integer NOT NULL DEFAULT 0,
    "passingScore" integer,
    "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "settings" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "version" integer NOT NULL DEFAULT 1,
    "isArchived" boolean NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_modules_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_modules_courseId" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE
  );

  -- Indexes
  CREATE INDEX "IDX_modules_courseId" ON "modules" ("courseId");
  CREATE INDEX "IDX_modules_status" ON "modules" ("status");
  CREATE INDEX "IDX_modules_isPublished" ON "modules" ("isPublished");
  CREATE INDEX "IDX_modules_sortOrder" ON "modules" ("sortOrder");
  CREATE INDEX "IDX_modules_createdAt" ON "modules" ("createdAt");
`);

// Lessons Table
await queryRunner.query(`
  -- Create enums
  CREATE TYPE "lessonTypeEnum" AS ENUM ('video', 'text', 'audio', 'document', 'interactive', 'quiz', 'assignment', 'live_session');
  CREATE TYPE "lessonStatusEnum" AS ENUM ('draft', 'published', 'archived');

  -- Create table
  CREATE TABLE "lessons" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "moduleId" uuid NOT NULL,
    "title" character varying(255) NOT NULL,
    "slug" character varying(255),
    "description" text,
    "type" "lessonTypeEnum" NOT NULL DEFAULT 'text',
    "content" text,
    "videoUrl" text,
    "audioUrl" text,
    "videoFileId" uuid,
    "audioFileId" uuid,
    "attachmentFileIds" uuid[] NOT NULL DEFAULT '{}',
    "sortOrder" integer NOT NULL DEFAULT 0,
    "status" "lessonStatusEnum" NOT NULL DEFAULT 'draft',
    "isPublished" boolean NOT NULL DEFAULT false,
    "isRequired" boolean NOT NULL DEFAULT false,
    "allowSkip" boolean NOT NULL DEFAULT false,
    "isFree" boolean NOT NULL DEFAULT false,
    "estimatedDurationMinutes" integer NOT NULL DEFAULT 0,
    "videoDurationSeconds" integer NOT NULL DEFAULT 0,
    "audioDurationSeconds" integer NOT NULL DEFAULT 0,
    "viewCount" integer NOT NULL DEFAULT 0,
    "completionCount" integer NOT NULL DEFAULT 0,
    "averageRating" decimal(3,2) NOT NULL DEFAULT 0,
    "totalRatings" integer NOT NULL DEFAULT 0,
    "passingScore" integer,
    "maxAttempts" integer,
    "timeLimit" integer,
    "interactiveContent" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "quizData" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "settings" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "version" integer NOT NULL DEFAULT 1,
    "isArchived" boolean NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_lessons_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_lessons_moduleId" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_lessons_videoFileId" FOREIGN KEY ("videoFileId") REFERENCES "files"("id") ON DELETE SET NULL,
    CONSTRAINT "FK_lessons_audioFileId" FOREIGN KEY ("audioFileId") REFERENCES "files"("id") ON DELETE SET NULL
  );

  -- Indexes
  CREATE INDEX "IDX_lessons_moduleId" ON "lessons" ("moduleId");
  CREATE INDEX "IDX_lessons_type" ON "lessons" ("type");
  CREATE INDEX "IDX_lessons_status" ON "lessons" ("status");
  CREATE INDEX "IDX_lessons_isPublished" ON "lessons" ("isPublished");
  CREATE INDEX "IDX_lessons_sortOrder" ON "lessons" ("sortOrder");
  CREATE INDEX "IDX_lessons_createdAt" ON "lessons" ("createdAt");
`);



// Enrollment Table
await queryRunner.query(`
  -- Create enums
  CREATE TYPE "enrollmentStatusEnum" AS ENUM (
    'pending',
    'active',
    'completed',
    'suspended',
    'cancelled',
    'expired'
  );

  -- Create table
  CREATE TABLE "enrollments" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "userId" uuid NOT NULL,
    "courseId" uuid NOT NULL,
    "status" "enrollmentStatusEnum" NOT NULL DEFAULT 'pending',
    "progressPercentage" decimal(5,2) NOT NULL DEFAULT 0,
    "completedLessons" integer NOT NULL DEFAULT 0,
    "totalLessons" integer NOT NULL DEFAULT 0,
    "completedAssessments" integer NOT NULL DEFAULT 0,
    "totalAssessments" integer NOT NULL DEFAULT 0,
    "totalTimeSpentMinutes" integer NOT NULL DEFAULT 0,
    "finalScore" decimal(3,2),
    "averageScore" decimal(3,2),
    "attemptCount" integer NOT NULL DEFAULT 0,
    "maxAttempts" integer,
    "lastAccessedAt" TIMESTAMP,
    "startedAt" TIMESTAMP,
    "completedAt" TIMESTAMP,
    "certificateIssuedAt" TIMESTAMP,
    "expiresAt" TIMESTAMP,
    "paidAmount" decimal(10,2),
    "currency" character varying(3),
    "paymentTransactionId" character varying(255),
    "paymentDate" TIMESTAMP,
    "notes" text,
    "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "preferences" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "receiveNotifications" boolean NOT NULL DEFAULT true,
    "isArchived" boolean NOT NULL DEFAULT false,
    "enrolledAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_enrollments_id" PRIMARY KEY ("id"),
    CONSTRAINT "UQ_enrollments_userId_courseId" UNIQUE ("userId", "courseId"),
    CONSTRAINT "FK_enrollments_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_enrollments_courseId" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE
  );

  -- Indexes
  CREATE INDEX "IDX_enrollments_userId" ON "enrollments" ("userId");
  CREATE INDEX "IDX_enrollments_courseId" ON "enrollments" ("courseId");
  CREATE INDEX "IDX_enrollments_status" ON "enrollments" ("status");
  CREATE INDEX "IDX_enrollments_enrolledAt" ON "enrollments" ("enrolledAt");
  CREATE INDEX "IDX_enrollments_completedAt" ON "enrollments" ("completedAt");
  CREATE INDEX "IDX_enrollments_progressPercentage" ON "enrollments" ("progressPercentage");
`);


// Assessments Table
await queryRunner.query(`
  -- Create enums
  CREATE TYPE "assessmentTypeEnum" AS ENUM ('quiz', 'assignment', 'exam', 'project', 'survey', 'practice');
  CREATE TYPE "assessmentStatusEnum" AS ENUM ('draft', 'published', 'archived');
  CREATE TYPE "questionTypeEnumForAssessment" AS ENUM (
    'multiple_choice',
    'true_false',
    'short_answer',
    'long_answer',
    'fill_in_blank',
    'matching',
    'ordering',
    'file_upload',
    'code'
  );

  -- Create table
  CREATE TABLE "assessments" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "courseId" uuid NOT NULL,
    "moduleId" uuid,
    "lessonId" uuid,
    "title" character varying(255) NOT NULL,
    "slug" character varying(255),
    "description" text,
    "instructions" text,
    "type" "assessmentTypeEnum" NOT NULL DEFAULT 'quiz',
    "status" "assessmentStatusEnum" NOT NULL DEFAULT 'draft',
    "isPublished" boolean NOT NULL DEFAULT false,
    "isRequired" boolean NOT NULL DEFAULT false,
    "isGraded" boolean NOT NULL DEFAULT true,
    "totalPoints" integer NOT NULL DEFAULT 100,
    "passingScore" integer NOT NULL DEFAULT 70,
    "timeLimit" integer,
    "maxAttempts" integer NOT NULL DEFAULT 1,
    "questionCount" integer NOT NULL DEFAULT 0,
    "allowRetake" boolean NOT NULL DEFAULT false,
    "showResults" boolean NOT NULL DEFAULT true,
    "showCorrectAnswers" boolean NOT NULL DEFAULT false,
    "randomizeQuestions" boolean NOT NULL DEFAULT true,
    "randomizeOptions" boolean NOT NULL DEFAULT false,
    "requireProctoring" boolean NOT NULL DEFAULT false,
    "preventBacktracking" boolean NOT NULL DEFAULT false,
    "oneQuestionAtTime" boolean NOT NULL DEFAULT false,
    "totalQuestions" integer NOT NULL DEFAULT 0,
    "totalAttempts" integer NOT NULL DEFAULT 0,
    "averageScore" decimal(3,2) NOT NULL DEFAULT 0,
    "highestScore" decimal(3,2) NOT NULL DEFAULT 0,
    "lowestScore" decimal(3,2) NOT NULL DEFAULT 0,
    "passCount" integer NOT NULL DEFAULT 0,
    "failCount" integer NOT NULL DEFAULT 0,
    "availableFrom" TIMESTAMP,
    "availableUntil" TIMESTAMP,
    "questions" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "settings" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "version" integer NOT NULL DEFAULT 1,
    "isArchived" boolean NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_assessments_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_assessments_courseId" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_assessments_moduleId" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE SET NULL,
    CONSTRAINT "FK_assessments_lessonId" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE SET NULL
  );

  -- Indexes
  CREATE INDEX "IDX_assessments_courseId" ON "assessments" ("courseId");
  CREATE INDEX "IDX_assessments_moduleId" ON "assessments" ("moduleId");
  CREATE INDEX "IDX_assessments_lessonId" ON "assessments" ("lessonId");
  CREATE INDEX "IDX_assessments_type" ON "assessments" ("type");
  CREATE INDEX "IDX_assessments_status" ON "assessments" ("status");
  CREATE INDEX "IDX_assessments_isPublished" ON "assessments" ("isPublished");
  CREATE INDEX "IDX_assessments_createdAt" ON "assessments" ("createdAt");
`);


// Assessment Attempts Table
await queryRunner.query(`
  -- Create enums
  CREATE TYPE "assessmentAttemptStatusEnum" AS ENUM (
    'started',
    'in_progress',
    'submitted',
    'graded',
    'abandoned',
    'expired'
  );

  -- Create table
  CREATE TABLE "assessment_attempts" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "userId" uuid NOT NULL,
    "assessmentId" uuid NOT NULL,
    "enrollmentId" uuid NOT NULL,
    "attemptNumber" integer NOT NULL,
    "status" "assessmentAttemptStatusEnum" NOT NULL DEFAULT 'started',
    "score" numeric(5,2),
    "earnedPoints" integer,
    "totalPoints" integer,
    "correctAnswers" integer,
    "totalQuestions" integer,
    "passed" boolean,
    "timeSpentSeconds" integer NOT NULL DEFAULT 0,
    "timeLimitSeconds" integer,
    "startedAt" TIMESTAMP NOT NULL,
    "submittedAt" TIMESTAMP,
    "gradedAt" TIMESTAMP,
    "expiresAt" TIMESTAMP,
    "responses" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "questionOrder" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "gradingDetails" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "feedback" text,
    "instructorNotes" text,
    "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "proctoring" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "ipAddress" character varying(45),
    "userAgent" text,
    "flaggedForReview" boolean NOT NULL DEFAULT false,
    "flags" text[] NOT NULL DEFAULT '{}',
    "isArchived" boolean NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_assessment_attempts_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_assessment_attempts_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_assessment_attempts_assessmentId" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_assessment_attempts_enrollmentId" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE CASCADE
  );

  -- Indexes
  CREATE INDEX "IDX_assessment_attempts_userId" ON "assessment_attempts" ("userId");
  CREATE INDEX "IDX_assessment_attempts_assessmentId" ON "assessment_attempts" ("assessmentId");
  CREATE INDEX "IDX_assessment_attempts_enrollmentId" ON "assessment_attempts" ("enrollmentId");
  CREATE INDEX "IDX_assessment_attempts_status" ON "assessment_attempts" ("status");
  CREATE INDEX "IDX_assessment_attempts_score" ON "assessment_attempts" ("score");
  CREATE INDEX "IDX_assessment_attempts_startedAt" ON "assessment_attempts" ("startedAt");
  CREATE INDEX "IDX_assessment_attempts_submittedAt" ON "assessment_attempts" ("submittedAt");
`);




// Audit Logs Table
await queryRunner.query(`
  -- Create table
  CREATE TABLE "audit_logs" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "actorId" uuid,
    "organizationId" uuid,
    "action" character varying(100) NOT NULL,
    "resourceType" character varying(50) NOT NULL,
    "resourceId" uuid,
    "oldValues" jsonb,
    "newValues" jsonb,
    "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "ipAddress" inet,
    "userAgent" text,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_audit_logs_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_audit_logs_actorId" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL,
    CONSTRAINT "FK_audit_logs_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL
  );

  -- Indexes
  CREATE INDEX "IDX_audit_logs_actorId" ON "audit_logs" ("actorId");
  CREATE INDEX "IDX_audit_logs_organizationId" ON "audit_logs" ("organizationId");
  CREATE INDEX "IDX_audit_logs_resourceType_resourceId" ON "audit_logs" ("resourceType", "resourceId");
  CREATE INDEX "IDX_audit_logs_action" ON "audit_logs" ("action");
  CREATE INDEX "IDX_audit_logs_createdAt" ON "audit_logs" ("createdAt");
`);


// Certificates Table
await queryRunner.query(`
  -- Create enums
  CREATE TYPE "certificateStatusEnum" AS ENUM ('pending', 'issued', 'revoked', 'expired');
  CREATE TYPE "certificateTypeEnum" AS ENUM ('completion', 'achievement', 'participation', 'excellence');

  -- Create table
  CREATE TABLE "certificates" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "userId" uuid NOT NULL,
    "courseId" uuid NOT NULL,
    "enrollmentId" uuid NOT NULL,
    "organizationId" uuid NOT NULL,
    "certificateNumber" character varying(50) NOT NULL UNIQUE,
    "verificationCode" character varying(32) NOT NULL UNIQUE,
    "title" character varying(255) NOT NULL,
    "description" text,
    "type" "certificateTypeEnum" NOT NULL DEFAULT 'completion',
    "status" "certificateStatusEnum" NOT NULL DEFAULT 'pending',
    "finalScore" numeric(5,2),
    "passingScore" numeric(5,2),
    "grade" character varying(50),
    "issuedAt" TIMESTAMP NOT NULL,
    "expiresAt" TIMESTAMP,
    "revokedAt" TIMESTAMP,
    "revokedReason" text,
    "revokedBy" uuid,
    "certificateUrl" text,
    "certificateFileId" uuid,
    "publicUrl" text,
    "templateId" character varying(255),
    "templateData" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "verificationData" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "viewCount" integer NOT NULL DEFAULT 0,
    "downloadCount" integer NOT NULL DEFAULT 0,
    "verificationCount" integer NOT NULL DEFAULT 0,
    "lastViewedAt" TIMESTAMP,
    "lastDownloadedAt" TIMESTAMP,
    "lastVerifiedAt" TIMESTAMP,
    "isPublic" boolean NOT NULL DEFAULT true,
    "isArchived" boolean NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_certificates_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_certificates_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_certificates_courseId" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_certificates_enrollmentId" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_certificates_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_certificates_revokedBy" FOREIGN KEY ("revokedBy") REFERENCES "users"("id") ON DELETE SET NULL
  );

  -- Indexes
  CREATE INDEX "IDX_certificates_userId" ON "certificates" ("userId");
  CREATE INDEX "IDX_certificates_courseId" ON "certificates" ("courseId");
  CREATE INDEX "IDX_certificates_enrollmentId" ON "certificates" ("enrollmentId");
  CREATE INDEX "IDX_certificates_organizationId" ON "certificates" ("organizationId");
  CREATE INDEX "IDX_certificates_status" ON "certificates" ("status");
  CREATE INDEX "IDX_certificates_type" ON "certificates" ("type");
  CREATE INDEX "IDX_certificates_issuedAt" ON "certificates" ("issuedAt");
  CREATE INDEX "IDX_certificates_certificateNumber" ON "certificates" ("certificateNumber");
  CREATE INDEX "IDX_certificates_verificationCode" ON "certificates" ("verificationCode");
`);





// Data Exports Table
await queryRunner.query(`
  -- Create enums
  CREATE TYPE "exportTypeEnum" AS ENUM (
    'users',
    'organizations',
    'courses',
    'assessments',
    'interviews',
    'resumes',
    'jobs',
    'applications',
    'payments',
    'invoices',
    'subscriptions',
    'analytics',
    'audit_logs',
    'notifications',
    'system_configs',
    'custom'
  );

  CREATE TYPE "exportStatusEnum" AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'expired',
    'cancelled'
  );

  CREATE TYPE "exportFormatEnum" AS ENUM (
    'csv',
    'xlsx',
    'json',
    'xml',
    'pdf',
    'zip'
  );

  CREATE TYPE "exportReasonEnum" AS ENUM (
    'data_migration',
    'backup',
    'compliance',
    'gdpr_request',
    'analytics',
    'integration',
    'audit',
    'custom'
  );

  -- Create table
  CREATE TABLE "data_exports" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "name" character varying(200) NOT NULL,
    "description" text,
    "exportType" "exportTypeEnum" NOT NULL,
    "status" "exportStatusEnum" NOT NULL DEFAULT 'pending',
    "format" "exportFormatEnum" NOT NULL DEFAULT 'csv',
    "reason" "exportReasonEnum" NOT NULL DEFAULT 'custom',
    "organizationId" uuid,
    "requestedBy" uuid NOT NULL,
    "filters" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "config" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "expiresAt" TIMESTAMP,
    "approvedAt" TIMESTAMP,
    "approvedBy" uuid,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_data_exports_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_data_exports_requestedBy" FOREIGN KEY ("requestedBy") REFERENCES "users"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_data_exports_approvedBy" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE SET NULL,
    CONSTRAINT "FK_data_exports_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL
  );

  -- Indexes
  CREATE INDEX "IDX_data_exports_organizationId_exportType" ON "data_exports" ("organizationId", "exportType");
  CREATE INDEX "IDX_data_exports_requestedBy_status" ON "data_exports" ("requestedBy", "status");
  CREATE INDEX "IDX_data_exports_status_createdAt" ON "data_exports" ("status", "createdAt");
  CREATE INDEX "IDX_data_exports_exportType_createdAt" ON "data_exports" ("exportType", "createdAt");
  CREATE INDEX "IDX_data_exports_expiresAt" ON "data_exports" ("expiresAt");
`);





// HR Profiles Table
await queryRunner.query(`
  -- Create enums
  CREATE TYPE "employmentTypeEnum" AS ENUM ('full_time', 'part_time', 'contract', 'intern', 'consultant');

  -- Create table
  CREATE TABLE "hr_profiles" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "userId" uuid NOT NULL UNIQUE,
    "employeeId" character varying(50),
    "department" character varying(100),
    "position" character varying(255),
    "managerId" uuid,
    "hireDate" date,
    "employmentType" "employmentTypeEnum",
    "salary" decimal(12,2),
    "currency" character varying(3) NOT NULL DEFAULT 'USD',
    "benefits" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "emergencyContact" jsonb,
    "documents" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "performanceData" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "workSchedule" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "trainingData" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_hr_profiles_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_hr_profiles_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_hr_profiles_managerId" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE SET NULL
  );

  -- Indexes
  CREATE INDEX "IDX_hr_profiles_employeeId" ON "hr_profiles" ("employeeId");
  CREATE INDEX "IDX_hr_profiles_department" ON "hr_profiles" ("department");
  CREATE INDEX "IDX_hr_profiles_managerId" ON "hr_profiles" ("managerId");
`);


// Integrations Table
await queryRunner.query(`
  -- Create enums
  CREATE TYPE "integrationTypeEnum" AS ENUM (
    'calendar',
    'video_conferencing',
    'social_login',
    'job_board',
    'email_marketing',
    'crm',
    'payment',
    'storage',
    'analytics',
    'communication',
    'custom'
  );

  CREATE TYPE "integrationProviderEnum" AS ENUM (
    'google_calendar',
    'outlook_calendar',
    'apple_calendar',
    'zoom',
    'microsoft_teams',
    'google_meet',
    'webex',
    'google_oauth',
    'microsoft_oauth',
    'linkedin_oauth',
    'github_oauth',
    'facebook_oauth',
    'indeed',
    'linkedin_jobs',
    'glassdoor',
    'monster',
    'mailchimp',
    'sendgrid',
    'mailgun',
    'salesforce',
    'hubspot',
    'pipedrive',
    'custom'
  );

  CREATE TYPE "integrationStatusEnum" AS ENUM (
    'active',
    'inactive',
    'configuring',
    'error',
    'suspended',
    'deprecated'
  );

  -- Create table
  CREATE TABLE "integrations" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "name" character varying(200) NOT NULL,
    "description" text,
    "type" "integrationTypeEnum" NOT NULL,
    "provider" "integrationProviderEnum" NOT NULL,
    "status" "integrationStatusEnum" NOT NULL DEFAULT 'configuring',
    "organizationId" uuid,
    "createdBy" uuid NOT NULL,
    "config" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "credentials" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "settings" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_integrations_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_integrations_createdBy" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_integrations_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL
  );

  -- Indexes
  CREATE INDEX "IDX_integrations_organizationId_type" ON "integrations" ("organizationId", "type");
  CREATE INDEX "IDX_integrations_provider_status" ON "integrations" ("provider", "status");
  CREATE INDEX "IDX_integrations_createdBy_status" ON "integrations" ("createdBy", "status");
  CREATE INDEX "IDX_integrations_type_status" ON "integrations" ("type", "status");
`);


// Interview Question Banks Table
await queryRunner.query(`
  -- Create enums
  -- CREATE TYPE "interviewDifficultyEnum" AS ENUM ('easy', 'medium', 'hard', 'expert');

  -- Create table
  CREATE TABLE "interview_question_banks" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "organizationId" uuid,
    "name" character varying(255) NOT NULL,
    "description" text,
    "category" character varying(100),
    "difficulty" "interviewDifficultyEnum",
    "tags" text[] NOT NULL DEFAULT '{}',
    "isPublic" boolean NOT NULL DEFAULT false,
    "isActive" boolean NOT NULL DEFAULT true,
    "iconUrl" character varying,
    "color" character varying,
    "statistics" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "config" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "createdBy" uuid NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_interview_question_banks_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_interview_question_banks_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL,
    CONSTRAINT "FK_interview_question_banks_createdBy" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE
  );

  -- Indexes
  CREATE INDEX "IDX_interview_question_banks_organizationId_isPublic" ON "interview_question_banks" ("organizationId", "isPublic");
  CREATE INDEX "IDX_interview_question_banks_category_difficulty" ON "interview_question_banks" ("category", "difficulty");
  CREATE INDEX "IDX_interview_question_banks_createdBy" ON "interview_question_banks" ("createdBy");
`);


// Interview Questions Table
await queryRunner.query(`
  -- Create enums
  -- CREATE TYPE "interviewDifficultyEnum" AS ENUM ('easy', 'medium', 'hard', 'expert');
  CREATE TYPE "questionTypeEnum" AS ENUM ('behavioral', 'technical', 'situational', 'coding', 'system_design', 'case_study', 'general');

  -- Create table
  CREATE TABLE "interview_questions" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "questionBankId" uuid NOT NULL,
    "questionText" text NOT NULL,
    "expectedAnswer" text,
    "followUpQuestions" text[] NOT NULL DEFAULT '{}',
    "evaluationCriteria" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "timeLimitMinutes" integer,
    "difficulty" "interviewDifficultyEnum" NOT NULL DEFAULT 'medium',
    "type" "questionTypeEnum" NOT NULL DEFAULT 'general',
    "tags" text[] NOT NULL DEFAULT '{}',
    "hints" text[] NOT NULL DEFAULT '{}',
    "sampleAnswers" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "resources" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "statistics" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "config" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "isActive" boolean NOT NULL DEFAULT true,
    "orderIndex" integer,
    "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_interview_questions_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_interview_questions_questionBankId" FOREIGN KEY ("questionBankId") REFERENCES "interview_question_banks"("id") ON DELETE CASCADE
  );

  -- Indexes
  CREATE INDEX "IDX_interview_questions_questionBankId_difficulty" ON "interview_questions" ("questionBankId", "difficulty");
  CREATE INDEX "IDX_interview_questions_type_difficulty" ON "interview_questions" ("type", "difficulty");
  -- CREATE INDEX "IDX_interview_questions_tags" ON "interview_questions" USING GIN ("tags");
`);

// Jobs Table
await queryRunner.query(`
  -- Create enums
  CREATE TYPE "jobTypeEnum" AS ENUM ('full_time', 'part_time', 'contract', 'internship', 'freelance');
  CREATE TYPE "workModeEnum" AS ENUM ('office', 'remote', 'hybrid');
  CREATE TYPE "experienceLevelEnum" AS ENUM ('entry', 'junior', 'mid', 'senior', 'lead', 'executive');
  CREATE TYPE "jobStatusEnum" AS ENUM ('draft', 'published', 'paused', 'closed', 'archived');

  -- Create table
  CREATE TABLE "jobs" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "organizationId" uuid NOT NULL,
    "title" character varying(255) NOT NULL,
    "applications" character varying(255) NOT NULL,
    "slug" character varying(255) NOT NULL,
    "description" text NOT NULL,
    "requirements" text,
    "responsibilities" text,
    "location" character varying(255),
    "type" "jobTypeEnum" NOT NULL DEFAULT 'full_time',
    "mode" "workModeEnum" NOT NULL DEFAULT 'office',
    "experienceLevel" "experienceLevelEnum",
    "salaryMin" decimal(12,2),
    "salaryMax" decimal(12,2),
    "currency" character varying(3) NOT NULL DEFAULT 'USD',
    "department" character varying(100),
    "tags" text[] NOT NULL DEFAULT '{}',
    "skillsRequired" text[] NOT NULL DEFAULT '{}',
    "status" "jobStatusEnum" NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP,
    "expiresAt" TIMESTAMP,
    "createdBy" uuid NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_jobs_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_jobs_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_jobs_createdBy" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE
  );

  -- Indexes
  CREATE INDEX "IDX_jobs_organizationId_status" ON "jobs" ("organizationId", "status");
  CREATE INDEX "IDX_jobs_type_experienceLevel" ON "jobs" ("type", "experienceLevel");
  CREATE INDEX "IDX_jobs_publishedAt" ON "jobs" ("publishedAt");
`);

// Interview Session Table
await queryRunner.query(`
  -- Create enums
  CREATE TYPE "interviewTypeEnum" AS ENUM ('technical', 'behavioral', 'hr', 'case_study', 'group', 'panel');
  CREATE TYPE "interviewModeEnum" AS ENUM ('video', 'audio', 'chat', 'in_person');
  CREATE TYPE "interviewStatusEnum" AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show');

  -- Create table
  CREATE TABLE "interview_sessions" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "organizationId" uuid,
    "candidateId" uuid NOT NULL,
    "interviewerId" uuid,
    "jobId" uuid,
    "type" "interviewTypeEnum" NOT NULL DEFAULT 'technical',
    "mode" "interviewModeEnum" NOT NULL DEFAULT 'video',
    "status" "interviewStatusEnum" NOT NULL DEFAULT 'scheduled',
    "scheduledAt" TIMESTAMP NOT NULL,
    "startedAt" TIMESTAMP,
    "endedAt" TIMESTAMP,
    "durationMinutes" integer,
    "meetingUrl" character varying(255),
    "meetingId" character varying(255),
    "recordingUrl" character varying(255),
    "notes" text,
    "feedback" jsonb,
    "score" integer,
    "difficulty" character varying(255),
    "tags" text[],
    "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "isAiInterview" boolean NOT NULL DEFAULT false,
    "aiConfig" jsonb,
    "preparationTime" integer NOT NULL DEFAULT 5,
    "allowReschedule" boolean NOT NULL DEFAULT true,
    "rescheduleDeadlineHours" integer NOT NULL DEFAULT 24,
    "reminderSent" boolean NOT NULL DEFAULT false,
    "followupSent" boolean NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_interview_sessions_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_interview_sessions_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL,
    CONSTRAINT "FK_interview_sessions_candidateId" FOREIGN KEY ("candidateId") REFERENCES "users"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_interview_sessions_interviewerId" FOREIGN KEY ("interviewerId") REFERENCES "users"("id") ON DELETE SET NULL,
    CONSTRAINT "FK_interview_sessions_jobId" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE SET NULL
  );

  -- Indexes
  CREATE INDEX "IDX_interview_sessions_organizationId_status" ON "interview_sessions" ("organizationId", "status");
  CREATE INDEX "IDX_interview_sessions_candidateId_scheduledAt" ON "interview_sessions" ("candidateId", "scheduledAt");
  CREATE INDEX "IDX_interview_sessions_interviewerId_status" ON "interview_sessions" ("interviewerId", "status");
  CREATE INDEX "IDX_interview_sessions_createdAt" ON "interview_sessions" ("createdAt");
`);

// Interview Responses Table
await queryRunner.query(`
  -- Create enums
  CREATE TYPE "responseStatusEnum" AS ENUM ('pending', 'answered', 'skipped', 'timed_out');

  -- Create table
  CREATE TABLE "interview_responses" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "interviewSessionId" uuid NOT NULL,
    "questionId" uuid NOT NULL,
    "userId" uuid NOT NULL,
    "questionText" text NOT NULL,
    "userResponse" text,
    "audioUrl" character varying,
    "videoUrl" character varying,
    "screenRecordingUrl" character varying,
    "codeSubmission" text,
    "programmingLanguage" character varying,
    "responseTimeSeconds" integer,
    "thinkingTimeSeconds" integer,
    "status" "responseStatusEnum" NOT NULL DEFAULT 'pending',
    "aiScore" integer,
    "humanScore" integer,
    "finalScore" integer,
    "aiFeedback" text,
    "humanFeedback" text,
    "evaluationBreakdown" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "speechAnalysis" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "behavioralAnalysis" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "codeAnalysis" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "needsReview" boolean NOT NULL DEFAULT false,
    "reviewNotes" text,
    "reviewedBy" uuid,
    "reviewedAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_interview_responses_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_interview_responses_interviewSessionId" FOREIGN KEY ("interviewSessionId") REFERENCES "interview_sessions"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_interview_responses_questionId" FOREIGN KEY ("questionId") REFERENCES "interview_questions"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_interview_responses_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_interview_responses_reviewedBy" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL
  );

  -- Indexes
  CREATE INDEX "IDX_interview_responses_interviewSessionId_questionId" ON "interview_responses" ("interviewSessionId", "questionId");
  CREATE INDEX "IDX_interview_responses_userId_createdAt" ON "interview_responses" ("userId", "createdAt");
`);


// Plans Table
await queryRunner.query(`
  -- Create enums
  CREATE TYPE "planTypeEnum" AS ENUM ('free', 'basic', 'professional', 'enterprise', 'custom');
  CREATE TYPE "planIntervalEnum" AS ENUM ('monthly', 'quarterly', 'yearly', 'lifetime');
  CREATE TYPE "planStatusEnum" AS ENUM ('active', 'inactive', 'archived');

  -- Create table
  CREATE TABLE "plans" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "name" character varying(100) NOT NULL,
    "description" text,
    "planType" "planTypeEnum" NOT NULL,
    "interval" "planIntervalEnum" NOT NULL,
    "priceAmount" bigint NOT NULL DEFAULT 0,
    "currency" character varying(3) NOT NULL DEFAULT 'USD',
    "setupFee" bigint NOT NULL DEFAULT 0,
    "trialDays" integer NOT NULL DEFAULT 0,
    "status" "planStatusEnum" NOT NULL DEFAULT 'active',
    "isActive" boolean NOT NULL DEFAULT true,
    "features" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "terms" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_plans_id" PRIMARY KEY ("id")
  );

  -- Indexes
  CREATE INDEX "IDX_plans_status_isActive" ON "plans" ("status", "isActive");
  CREATE INDEX "IDX_plans_planType_interval" ON "plans" ("planType", "interval");
  CREATE INDEX "IDX_plans_priceAmount_currency" ON "plans" ("priceAmount", "currency");
`);



// Subscriptions Table
await queryRunner.query(`
  -- Create enums
  CREATE TYPE "subscriptionStatusEnum" AS ENUM (
    'trialing',
    'active',
    'past_due',
    'canceled',
    'unpaid',
    'incomplete',
    'incomplete_expired',
    'paused'
  );

  CREATE TYPE "subscriptionCancelReasonEnum" AS ENUM (
    'user_requested',
    'payment_failed',
    'fraud',
    'admin_canceled',
    'downgrade',
    'upgrade',
    'expired'
  );

  -- Create table
  CREATE TABLE "subscriptions" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "organizationId" uuid NOT NULL,
    "planId" uuid NOT NULL,
    "status" "subscriptionStatusEnum" NOT NULL DEFAULT 'incomplete',
    "currentPeriodStart" TIMESTAMP NOT NULL,
    "currentPeriodEnd" TIMESTAMP NOT NULL,
    "trialStart" TIMESTAMP,
    "trialEnd" TIMESTAMP,
    "cancelAt" TIMESTAMP,
    "canceledAt" TIMESTAMP,
    "cancelReason" "subscriptionCancelReasonEnum",
    "pauseStart" TIMESTAMP,
    "pauseEnd" TIMESTAMP,
    "quantity" integer NOT NULL DEFAULT 1,
    "amountCents" bigint NOT NULL,
    "currency" character varying(3) NOT NULL,
    "taxCents" bigint NOT NULL DEFAULT 0,
    "discountCents" bigint NOT NULL DEFAULT 0,
    "billingConfig" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "usageData" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "providerData" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_subscriptions_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_subscriptions_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_subscriptions_planId" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE CASCADE
  );

  -- Indexes
  CREATE INDEX "IDX_subscriptions_organizationId_status" ON "subscriptions" ("organizationId", "status");
  CREATE INDEX "IDX_subscriptions_planId_status" ON "subscriptions" ("planId", "status");
  CREATE INDEX "IDX_subscriptions_status_currentPeriodEnd" ON "subscriptions" ("status", "currentPeriodEnd");
  CREATE INDEX "IDX_subscriptions_trialEnd" ON "subscriptions" ("trialEnd");
  CREATE INDEX "IDX_subscriptions_cancelAt" ON "subscriptions" ("cancelAt");
`);

// Invoice Table
await queryRunner.query(`
  -- Create enums
  CREATE TYPE "invoiceStatusEnum" AS ENUM ('draft', 'open', 'paid', 'past_due', 'canceled', 'void');
  CREATE TYPE "invoiceTypeEnum" AS ENUM ('subscription', 'one_time', 'usage', 'credit_note', 'prorated');

  -- Create table
  CREATE TABLE "invoices" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "invoiceNumber" character varying(255) NOT NULL UNIQUE,
    "organizationId" uuid NOT NULL,
    "subscriptionId" uuid,
    "status" "invoiceStatusEnum" NOT NULL DEFAULT 'draft',
    "type" "invoiceTypeEnum" NOT NULL DEFAULT 'subscription',
    "issueDate" TIMESTAMP NOT NULL,
    "dueDate" TIMESTAMP NOT NULL,
    "periodStart" TIMESTAMP,
    "periodEnd" TIMESTAMP,
    "subtotalCents" bigint NOT NULL,
    "taxCents" bigint NOT NULL DEFAULT 0,
    "discountCents" bigint NOT NULL DEFAULT 0,
    "totalCents" bigint NOT NULL,
    "amountPaidCents" bigint NOT NULL DEFAULT 0,
    "amountDueCents" bigint NOT NULL,
    "currency" character varying(3) NOT NULL,
    "lineItems" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "taxBreakdown" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "discounts" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "billingAddress" jsonb,
    "deliveryInfo" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "paymentTerms" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "providerData" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "finalizedAt" TIMESTAMP,
    "paidAt" TIMESTAMP,
    "voidedAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_invoices_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_invoices_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_invoices_subscriptionId" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL
  );

  -- Indexes
  CREATE INDEX "IDX_invoices_organizationId_status" ON "invoices" ("organizationId", "status");
  CREATE INDEX "IDX_invoices_subscriptionId_status" ON "invoices" ("subscriptionId", "status");
  CREATE INDEX "IDX_invoices_status_dueDate" ON "invoices" ("status", "dueDate");
  CREATE UNIQUE INDEX "IDX_invoices_invoiceNumber" ON "invoices" ("invoiceNumber");
  CREATE INDEX "IDX_invoices_createdAt" ON "invoices" ("createdAt");
`);





// Resume Templates Table
await queryRunner.query(`
  -- Create enums
  CREATE TYPE "templateCategoryEnum" AS ENUM (
    'modern',
    'classic',
    'creative',
    'minimal',
    'professional',
    'academic'
  );

  -- Create table
  CREATE TABLE "resume_templates" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "name" character varying(255) NOT NULL,
    "description" text,
    "category" "templateCategoryEnum",
    "previewImageUrl" character varying,
    "templateData" jsonb NOT NULL,
    "isPremium" boolean NOT NULL DEFAULT false,
    "isActive" boolean NOT NULL DEFAULT true,
    "downloadCount" integer NOT NULL DEFAULT 0,
    "rating" decimal(3,2) NOT NULL DEFAULT 0,
    "ratingCount" integer NOT NULL DEFAULT 0,
    "tags" text[] NOT NULL DEFAULT '{}',
    "features" text[] NOT NULL DEFAULT '{}',
    "difficultyLevel" character varying NOT NULL DEFAULT 'beginner',
    "completionTime" integer,
    "customizationOptions" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "atsScore" integer,
    "createdBy" uuid NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_resume_templates_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_resume_templates_createdBy" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE
  );

  -- Indexes
  CREATE INDEX "IDX_resume_templates_category_isActive" ON "resume_templates" ("category", "isActive");
  CREATE INDEX "IDX_resume_templates_isPremium_rating" ON "resume_templates" ("isPremium", "rating");
  CREATE INDEX "IDX_resume_templates_downloadCount" ON "resume_templates" ("downloadCount");
`);


// User Resumes Table
await queryRunner.query(`
  -- Create enums
  CREATE TYPE "resumeVisibilityEnum" AS ENUM ('private', 'public', 'org_only', 'link_only');

  -- Create table
  CREATE TABLE "user_resumes" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "userId" uuid NOT NULL,
    "templateId" uuid,
    "title" character varying(255) NOT NULL,
    "isPrimary" boolean NOT NULL DEFAULT false,
    "visibility" "resumeVisibilityEnum" NOT NULL DEFAULT 'private',
    "data" jsonb NOT NULL,
    "pdfUrl" character varying,
    "lastGeneratedAt" TIMESTAMP,
    "viewCount" integer NOT NULL DEFAULT 0,
    "downloadCount" integer NOT NULL DEFAULT 0,
    "shareCount" integer NOT NULL DEFAULT 0,
    "analytics" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "customization" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "shareToken" character varying,
    "shareExpiresAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_user_resumes_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_user_resumes_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_user_resumes_templateId" FOREIGN KEY ("templateId") REFERENCES "resume_templates"("id") ON DELETE SET NULL
  );

  -- Indexes
  CREATE INDEX "IDX_user_resumes_userId_isPrimary" ON "user_resumes" ("userId", "isPrimary");
  CREATE INDEX "IDX_user_resumes_visibility_createdAt" ON "user_resumes" ("visibility", "createdAt");
  CREATE INDEX "IDX_user_resumes_templateId" ON "user_resumes" ("templateId");
`);


// Resume Sections Table
await queryRunner.query(`
  -- Create enums
  CREATE TYPE "sectionTypeEnum" AS ENUM (
    'personal_info',
    'summary',
    'experience',
    'education',
    'skills',
    'projects',
    'certifications',
    'languages',
    'hobbies',
    'references',
    'custom'
  );

  -- Create table
  CREATE TABLE "resume_sections" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "resumeId" uuid NOT NULL,
    "type" "sectionTypeEnum" NOT NULL,
    "title" character varying(255),
    "content" jsonb NOT NULL,
    "orderIndex" integer NOT NULL,
    "isVisible" boolean NOT NULL DEFAULT true,
    "styling" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "config" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_resume_sections_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_resume_sections_resumeId" FOREIGN KEY ("resumeId") REFERENCES "user_resumes"("id") ON DELETE CASCADE
  );

  -- Indexes
  CREATE INDEX "IDX_resume_sections_resumeId_orderIndex" ON "resume_sections" ("resumeId", "orderIndex");
  CREATE INDEX "IDX_resume_sections_type_isVisible" ON "resume_sections" ("type", "isVisible");
`);

// Job Application Table
await queryRunner.query(`
  -- Create enums
  CREATE TYPE "applicationStatusEnum" AS ENUM ('applied', 'screening', 'interviewing', 'offered', 'hired', 'rejected', 'withdrawn');
  CREATE TYPE "applicationStageEnum" AS ENUM ('screening', 'phone_screen', 'technical', 'onsite', 'final', 'offer', 'hired');
  CREATE TYPE "applicationSourceEnum" AS ENUM ('direct', 'referral', 'linkedin', 'job_board', 'career_page', 'other');

  -- Create table
  CREATE TABLE "job_applications" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "jobId" uuid NOT NULL,
    "candidateId" uuid,
    "externalEmail" character varying(255),
    "externalName" character varying(255),
    "parsedResumeData" character varying(255),
    "resumeId" uuid,
    "coverLetter" text,
    "status" "applicationStatusEnum" NOT NULL DEFAULT 'applied',
    "stage" "applicationStageEnum" NOT NULL DEFAULT 'screening',
    "source" "applicationSourceEnum" NOT NULL DEFAULT 'direct',
    "notes" text,
    "rating" integer,
    "assignedTo" uuid,
    "appliedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "formData" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "timeline" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "screeningData" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "communications" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "interviewData" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "rejectionData" jsonb,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_job_applications_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_job_applications_jobId" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_job_applications_candidateId" FOREIGN KEY ("candidateId") REFERENCES "users"("id") ON DELETE SET NULL,
    CONSTRAINT "FK_job_applications_resumeId" FOREIGN KEY ("resumeId") REFERENCES "user_resumes"("id") ON DELETE SET NULL,
    CONSTRAINT "FK_job_applications_assignedTo" FOREIGN KEY ("assignedTo") REFERENCES "users"("id") ON DELETE SET NULL
  );

  -- Indexes
  CREATE INDEX "IDX_job_applications_jobId_status" ON "job_applications" ("jobId", "status");
  CREATE INDEX "IDX_job_applications_candidateId_appliedAt" ON "job_applications" ("candidateId", "appliedAt");
  CREATE INDEX "IDX_job_applications_assignedTo_status" ON "job_applications" ("assignedTo", "status");
  CREATE INDEX "IDX_job_applications_stage_lastActivityAt" ON "job_applications" ("stage", "lastActivityAt");
  CREATE INDEX "IDX_job_applications_createdAt" ON "job_applications" ("createdAt");
`);




// Lesson Progress Table
await queryRunner.query(`
  -- Create enums
  CREATE TYPE "lessonProgressStatusEnum" AS ENUM ('not_started', 'in_progress', 'completed', 'skipped');

  -- Create table
  CREATE TABLE "lesson_progress" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "userId" uuid NOT NULL,
    "lessonId" uuid NOT NULL,
    "enrollmentId" uuid NOT NULL,
    "status" "lessonProgressStatusEnum" NOT NULL DEFAULT 'not_started',
    "progressPercentage" decimal(5,2) NOT NULL DEFAULT 0,
    "timeSpentSeconds" integer NOT NULL DEFAULT 0,
    "videoWatchedSeconds" integer NOT NULL DEFAULT 0,
    "audioListenedSeconds" integer NOT NULL DEFAULT 0,
    "totalDurationSeconds" integer NOT NULL DEFAULT 0,
    "score" decimal(3,2),
    "attemptCount" integer NOT NULL DEFAULT 0,
    "maxAttempts" integer,
    "startedAt" TIMESTAMP,
    "completedAt" TIMESTAMP,
    "lastAccessedAt" TIMESTAMP,
    "bookmarkPosition" integer NOT NULL DEFAULT 0,
    "completedSections" text[] NOT NULL DEFAULT '{}',
    "interactionData" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "quizResponses" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "notes" text,
    "rating" decimal(3,2),
    "feedback" text,
    "isBookmarked" boolean NOT NULL DEFAULT false,
    "needsReview" boolean NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_lesson_progress_id" PRIMARY KEY ("id"),
    CONSTRAINT "UQ_lesson_progress_userId_lessonId" UNIQUE ("userId", "lessonId"),
    CONSTRAINT "FK_lesson_progress_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_lesson_progress_lessonId" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_lesson_progress_enrollmentId" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE CASCADE
  );

  -- Indexes
  CREATE INDEX "IDX_lesson_progress_userId" ON "lesson_progress" ("userId");
  CREATE INDEX "IDX_lesson_progress_lessonId" ON "lesson_progress" ("lessonId");
  CREATE INDEX "IDX_lesson_progress_enrollmentId" ON "lesson_progress" ("enrollmentId");
  CREATE INDEX "IDX_lesson_progress_status" ON "lesson_progress" ("status");
  CREATE INDEX "IDX_lesson_progress_completedAt" ON "lesson_progress" ("completedAt");
  CREATE INDEX "IDX_lesson_progress_progressPercentage" ON "lesson_progress" ("progressPercentage");
`);







// Notification Templates Table
await queryRunner.query(`
  -- Create enums
  CREATE TYPE "notificationChannelEnum" AS ENUM ('email', 'sms', 'push', 'in_app', 'webhook');

  -- Create table
  CREATE TABLE "notification_templates" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "key" character varying(100) NOT NULL UNIQUE,
    "name" character varying(255) NOT NULL,
    "description" text,
    "channels" text[] NOT NULL DEFAULT '{}',
    "subjectTemplate" text,
    "bodyTemplate" text NOT NULL,
    "variables" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "styling" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "deliverySettings" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "localization" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "validationRules" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "isActive" boolean NOT NULL DEFAULT true,
    "usageStats" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_notification_templates_id" PRIMARY KEY ("id")
  );

  -- Indexes
  CREATE UNIQUE INDEX "IDX_notification_templates_key" ON "notification_templates" ("key");
  CREATE INDEX "IDX_notification_templates_isActive" ON "notification_templates" ("isActive");
`);


// Notifications Table
await queryRunner.query(`
  -- Create enums
  CREATE TYPE "notificationStatusEnum" AS ENUM ('pending', 'sent', 'delivered', 'read', 'failed', 'cancelled');
  CREATE TYPE "notificationPriorityEnum" AS ENUM ('low', 'medium', 'high', 'urgent');
  -- CREATE TYPE "notificationChannelEnum" AS ENUM ('email', 'sms', 'push', 'in_app', 'webhook');

  -- Create table
  CREATE TABLE "notifications" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "userId" uuid,
    "organizationId" uuid,
    "templateKey" character varying(100),
    "channel" "notificationChannelEnum" NOT NULL,
    "subject" character varying(255),
    "body" text NOT NULL,
    "data" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "status" "notificationStatusEnum" NOT NULL DEFAULT 'pending',
    "priority" "notificationPriorityEnum" NOT NULL DEFAULT 'medium',
    "scheduledAt" TIMESTAMP,
    "sentAt" TIMESTAMP,
    "deliveredAt" TIMESTAMP,
    "readAt" TIMESTAMP,
    "errorMessage" text,
    "retryCount" integer NOT NULL DEFAULT 0,
    "nextRetryAt" TIMESTAMP,
    "deliveryInfo" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "interactionData" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_notifications_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL,
    CONSTRAINT "FK_notifications_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL,
    CONSTRAINT "FK_notifications_templateKey" FOREIGN KEY ("templateKey") REFERENCES "notification_templates"("key") ON DELETE SET NULL
  );

  -- Indexes
  CREATE INDEX "IDX_notifications_userId_status" ON "notifications" ("userId", "status");
  CREATE INDEX "IDX_notifications_organizationId_channel" ON "notifications" ("organizationId", "channel");
  CREATE INDEX "IDX_notifications_templateKey_createdAt" ON "notifications" ("templateKey", "createdAt");
  CREATE INDEX "IDX_notifications_scheduledAt" ON "notifications" ("scheduledAt");
  CREATE INDEX "IDX_notifications_status_retryCount" ON "notifications" ("status", "retryCount");
`);


// Payments Table
await queryRunner.query(`
  -- Create enums
  CREATE TYPE "paymentStatusEnum" AS ENUM ('pending', 'processing', 'succeeded', 'failed', 'canceled', 'refunded', 'partially_refunded', 'disputed', 'chargeback');
  CREATE TYPE "paymentMethodEnum" AS ENUM ('card', 'bank_transfer', 'wallet', 'upi', 'net_banking', 'emi', 'cryptocurrency', 'cash', 'check');
  CREATE TYPE "paymentProviderEnum" AS ENUM ('stripe', 'razorpay', 'paypal', 'square', 'manual');
  CREATE TYPE "paymentTypeEnum" AS ENUM ('subscription', 'one_time', 'setup', 'refund', 'chargeback');

  -- Create table
  CREATE TABLE "payments" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "organizationId" uuid NOT NULL,
    "invoiceId" uuid,
    "subscriptionId" uuid,
    "status" "paymentStatusEnum" NOT NULL DEFAULT 'pending',
    "type" "paymentTypeEnum" NOT NULL DEFAULT 'one_time',
    "paymentProvider" "paymentProviderEnum" NOT NULL,
    "providerPaymentId" character varying,
    "paymentMethod" "paymentMethodEnum" NOT NULL,
    "amountCents" bigint NOT NULL,
    "currency" character varying(3) NOT NULL,
    "feeCents" bigint NOT NULL DEFAULT 0,
    "netAmountCents" bigint NOT NULL,
    "refundedAmountCents" bigint NOT NULL DEFAULT 0,
    "description" text,
    "paymentMethodDetails" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "billingAddress" jsonb,
    "processingInfo" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "providerData" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "refundInfo" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "disputeInfo" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_payments_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_payments_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_payments_invoiceId" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL,
    CONSTRAINT "FK_payments_subscriptionId" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL
  );

  -- Indexes
  CREATE INDEX "IDX_payments_organizationId_status" ON "payments" ("organizationId", "status");
  CREATE INDEX "IDX_payments_invoiceId_status" ON "payments" ("invoiceId", "status");
  CREATE INDEX "IDX_payments_subscriptionId_status" ON "payments" ("subscriptionId", "status");
  CREATE INDEX "IDX_payments_status_createdAt" ON "payments" ("status", "createdAt");
  CREATE INDEX "IDX_payments_paymentProvider_providerPaymentId" ON "payments" ("paymentProvider", "providerPaymentId");
  CREATE INDEX "IDX_payments_paymentMethod_status" ON "payments" ("paymentMethod", "status");
`);

// Permission Table
await queryRunner.query(`
  -- Create table
  CREATE TABLE "permissions" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "name" character varying(100) NOT NULL UNIQUE,
    "resource" character varying(50) NOT NULL,
    "action" character varying(50) NOT NULL,
    "description" text,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_permissions_id" PRIMARY KEY ("id")
  );

  -- Indexes
  CREATE UNIQUE INDEX "IDX_permissions_name" ON "permissions" ("name");
  CREATE INDEX "IDX_permissions_resource_action" ON "permissions" ("resource", "action");
`);





// Reports Table
await queryRunner.query(`
  -- Create enums
  CREATE TYPE "reportTypeEnum" AS ENUM (
    'user_analytics',
    'learning_analytics',
    'assessment_analytics',
    'interview_analytics',
    'resume_analytics',
    'job_analytics',
    'billing_analytics',
    'system_performance',
    'security_audit',
    'compliance_report',
    'custom_report'
  );

  CREATE TYPE "reportStatusEnum" AS ENUM (
    'pending',
    'generating',
    'completed',
    'failed',
    'expired'
  );

  CREATE TYPE "reportFormatEnum" AS ENUM (
    'pdf',
    'csv',
    'xlsx',
    'json',
    'html'
  );

  -- Create table
  CREATE TABLE "reports" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "name" character varying(200) NOT NULL,
    "description" text,
    "reportType" "reportTypeEnum" NOT NULL,
    "status" "reportStatusEnum" NOT NULL DEFAULT 'pending',
    "format" "reportFormatEnum" NOT NULL DEFAULT 'pdf',
    "organizationId" uuid,
    "createdBy" uuid NOT NULL,
    "parameters" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "config" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "data" jsonb,
    "expiresAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_reports_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_reports_createdBy" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_reports_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL
  );

  -- Indexes
  CREATE INDEX "IDX_reports_organizationId_reportType" ON "reports" ("organizationId", "reportType");
  CREATE INDEX "IDX_reports_createdBy_status" ON "reports" ("createdBy", "status");
  CREATE INDEX "IDX_reports_status_createdAt" ON "reports" ("status", "createdAt");
  CREATE INDEX "IDX_reports_reportType_createdAt" ON "reports" ("reportType", "createdAt");
`);




// Roles Table
await queryRunner.query(`
  -- Create table
  CREATE TABLE "roles" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "name" character varying(100) NOT NULL,
    "description" text,
    "organizationId" uuid,
    "isSystem" boolean NOT NULL DEFAULT false,
    "permissions" text[] NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_roles_id" PRIMARY KEY ("id"),
    CONSTRAINT "UQ_roles_name_organizationId" UNIQUE ("name", "organizationId"),
    CONSTRAINT "FK_roles_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL
  );

  -- Junction table for many-to-many relation between roles and permissions
  CREATE TABLE "role_permissions" (
    "roleId" uuid NOT NULL,
    "permissionId" uuid NOT NULL,
    CONSTRAINT "PK_role_permissions" PRIMARY KEY ("roleId", "permissionId"),
    CONSTRAINT "FK_role_permissions_roleId" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_role_permissions_permissionId" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE
  );

  -- Indexes
  CREATE INDEX "IDX_roles_name_organizationId" ON "roles" ("name", "organizationId");
`);


// Skill Categories Table
await queryRunner.query(`
  -- Create table
  CREATE TABLE "skill_categories" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "name" character varying(100) NOT NULL,
    "description" text,
    "icon" character varying(50),
    "color" character varying,
    "displayOrder" integer NOT NULL DEFAULT 0,
    "isActive" boolean NOT NULL DEFAULT true,
    "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_skill_categories_id" PRIMARY KEY ("id"),
    CONSTRAINT "UQ_skill_categories_name" UNIQUE ("name")
  );

  -- Indexes
  CREATE INDEX "IDX_skill_categories_name" ON "skill_categories" ("name");
`);


// Skills Table
await queryRunner.query(`
  -- Create table
  CREATE TABLE "skills" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "name" character varying(100) NOT NULL,
    "categoryId" uuid,
    "description" text,
    "aliases" text[] NOT NULL DEFAULT '{}',
    "isVerified" boolean NOT NULL DEFAULT false,
    "isActive" boolean NOT NULL DEFAULT true,
    "iconUrl" character varying,
    "color" character varying,
    "popularityScore" integer NOT NULL DEFAULT 0,
    "trendingScore" integer NOT NULL DEFAULT 0,
    "userCount" integer NOT NULL DEFAULT 0,
    "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "tags" text[] NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_skills_id" PRIMARY KEY ("id"),
    CONSTRAINT "UQ_skills_name" UNIQUE ("name"),
    CONSTRAINT "FK_skills_categoryId" FOREIGN KEY ("categoryId") REFERENCES "skill_categories"("id") ON DELETE SET NULL
  );

  -- Indexes
  CREATE INDEX "IDX_skills_name" ON "skills" ("name");
  CREATE INDEX "IDX_skills_categoryId_isVerified" ON "skills" ("categoryId", "isVerified");
  CREATE INDEX "IDX_skills_isVerified_popularityScore" ON "skills" ("isVerified", "popularityScore");
`);




// System Configs Table
await queryRunner.query(`
  -- Create enums
  CREATE TYPE "configCategoryEnum" AS ENUM (
    'system',
    'security',
    'billing',
    'notifications',
    'integrations',
    'features',
    'ui',
    'analytics',
    'compliance',
    'performance'
  );

  CREATE TYPE "configTypeEnum" AS ENUM (
    'string',
    'number',
    'boolean',
    'json',
    'array',
    'encrypted'
  );

  CREATE TYPE "configEnvironmentEnum" AS ENUM (
    'all',
    'development',
    'staging',
    'production'
  );

  -- Create table
  CREATE TABLE "system_configs" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "key" character varying(100) NOT NULL,
    "name" character varying(200) NOT NULL,
    "description" text,
    "category" "configCategoryEnum" NOT NULL,
    "type" "configTypeEnum" NOT NULL,
    "value" text NOT NULL,
    "defaultValue" text,
    "environment" "configEnvironmentEnum" NOT NULL DEFAULT 'all',
    "isActive" boolean NOT NULL DEFAULT true,
    "isReadonly" boolean NOT NULL DEFAULT false,
    "isSensitive" boolean NOT NULL DEFAULT false,
    "requiresRestart" boolean NOT NULL DEFAULT false,
    "validation" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "updatedBy" uuid,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_system_configs_id" PRIMARY KEY ("id"),
    CONSTRAINT "UQ_system_configs_key" UNIQUE ("key"),
    CONSTRAINT "FK_system_configs_updatedBy" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL
  );

  -- Indexes
  CREATE INDEX "IDX_system_configs_key" ON "system_configs" ("key");
  CREATE INDEX "IDX_system_configs_category_isActive" ON "system_configs" ("category", "isActive");
  CREATE INDEX "IDX_system_configs_environment" ON "system_configs" ("environment");
  CREATE INDEX "IDX_system_configs_updatedAt" ON "system_configs" ("updatedAt");
`);

// Teams Table
await queryRunner.query(`
  -- Create enums
  CREATE TYPE "teamStatusEnum" AS ENUM ('active', 'inactive', 'archived');

  -- Create table
  CREATE TABLE "teams" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "orgId" uuid NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" text,
    "leadId" uuid,
    "department" character varying(100),
    "color" character varying(7),
    "avatarUrl" character varying,
    "settings" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "metrics" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "status" "teamStatusEnum" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_teams_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_teams_orgId" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_teams_leadId" FOREIGN KEY ("leadId") REFERENCES "users"("id") ON DELETE SET NULL
  );

  -- Indexes
  CREATE INDEX "IDX_teams_orgId" ON "teams" ("orgId");
  CREATE INDEX "IDX_teams_department" ON "teams" ("department");
  CREATE INDEX "IDX_teams_leadId" ON "teams" ("leadId");
`);


// Team Members Table
await queryRunner.query(`
  -- Create enums
  CREATE TYPE "teamRoleEnum" AS ENUM ('lead', 'senior', 'member', 'intern');
  CREATE TYPE "teamMemberStatusEnum" AS ENUM ('active', 'inactive', 'on_leave', 'removed');

  -- Create table
  CREATE TABLE "team_members" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "teamId" uuid NOT NULL,
    "userId" uuid NOT NULL,
    "role" "teamRoleEnum" NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "teamMemberStatusEnum" NOT NULL DEFAULT 'active',
    "responsibilities" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "performanceMetrics" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "availability" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "feedback" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_team_members_id" PRIMARY KEY ("id"),
    CONSTRAINT "UQ_team_members_teamId_userId" UNIQUE ("teamId", "userId"),
    CONSTRAINT "FK_team_members_teamId" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_team_members_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
  );

  -- Indexes
  CREATE INDEX "IDX_team_members_teamId" ON "team_members" ("teamId");
  CREATE INDEX "IDX_team_members_userId" ON "team_members" ("userId");
  CREATE INDEX "IDX_team_members_role" ON "team_members" ("role");
`);





// User Notification Preferences Table
await queryRunner.query(`
  -- Create enums
  -- CREATE TYPE "notificationChannelEnum" AS ENUM ('email', 'sms', 'push', 'inApp', 'webhook');

  -- Create table
  CREATE TABLE "user_notification_preferences" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "userId" uuid NOT NULL,
    "templateKey" character varying(100),
    "channel" "notificationChannelEnum",
    "isEnabled" boolean NOT NULL DEFAULT true,
    "frequencySettings" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "channelSettings" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "contentFilters" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "privacySettings" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "schedulingRules" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_user_notification_preferences_id" PRIMARY KEY ("id"),
    CONSTRAINT "UQ_user_notification_preferences_userId_templateKey_channel" UNIQUE ("userId", "templateKey", "channel"),
    CONSTRAINT "FK_user_notification_preferences_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
  );

  -- Indexes
  CREATE INDEX "IDX_user_notification_preferences_userId" ON "user_notification_preferences" ("userId");
  CREATE INDEX "IDX_user_notification_preferences_templateKey" ON "user_notification_preferences" ("templateKey");
  CREATE INDEX "IDX_user_notification_preferences_channel_isEnabled" ON "user_notification_preferences" ("channel", "isEnabled");
`);



// User Skills Table
await queryRunner.query(`
  -- Create enums
  CREATE TYPE "skillProficiencyEnum" AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');

  -- Create table
  CREATE TABLE "user_skills" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "userId" uuid NOT NULL,
    "skillId" uuid NOT NULL,
    "proficiencyLevel" "skillProficiencyEnum" NOT NULL DEFAULT 'beginner',
    "yearsExperience" integer,
    "isFeatured" boolean NOT NULL DEFAULT false,
    "confidenceLevel" integer,
    "acquisitionMethod" character varying(50),
    "verificationData" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "verifiedBy" uuid,
    "verifiedAt" TIMESTAMP,
    "evidence" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "usage" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "learningData" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "endorsements" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "tags" text[] NOT NULL DEFAULT '{}',
    "notes" text,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_user_skills_id" PRIMARY KEY ("id"),
    CONSTRAINT "UQ_user_skills_userId_skillId" UNIQUE ("userId", "skillId"),
    CONSTRAINT "FK_user_skills_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_user_skills_skillId" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_user_skills_verifiedBy" FOREIGN KEY ("verifiedBy") REFERENCES "users"("id") ON DELETE SET NULL
  );

  -- Indexes
  CREATE INDEX "IDX_user_skills_userId_proficiencyLevel" ON "user_skills" ("userId", "proficiencyLevel");
  CREATE INDEX "IDX_user_skills_skillId_isFeatured" ON "user_skills" ("skillId", "isFeatured");
  CREATE INDEX "IDX_user_skills_verifiedAt" ON "user_skills" ("verifiedAt");
`);

// Webhook Endpoints Table
await queryRunner.query(`
  -- Create enums
  CREATE TYPE "webhookStatusEnum" AS ENUM ('active', 'inactive', 'disabled', 'suspended');
  CREATE TYPE "webhookEventEnum" AS ENUM (
    'user.created', 'user.updated', 'user.deleted', 'user.login', 'user.logout',
    'organization.created', 'organization.updated', 'organization.deleted',
    'course.created', 'course.updated', 'course.published', 'course.deleted',
    'enrollment.created', 'enrollment.completed', 'enrollment.cancelled',
    'assessment.started', 'assessment.completed', 'assessment.graded',
    'interview.scheduled', 'interview.started', 'interview.completed', 'interview.cancelled',
    'job.created', 'job.updated', 'job.closed',
    'application.submitted', 'application.reviewed', 'application.accepted', 'application.rejected',
    'subscription.created', 'subscription.updated', 'subscription.cancelled',
    'payment.succeeded', 'payment.failed',
    'invoice.created', 'invoice.paid',
    'certificate.issued', 'certificate.revoked',
    'system.maintenance', 'system.alert',
    'custom.event'
  );

  -- Create table
  CREATE TABLE "webhook_endpoints" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "name" character varying(200) NOT NULL,
    "description" text,
    "url" character varying(2048) NOT NULL,
    "status" "webhookStatusEnum" NOT NULL DEFAULT 'active',
    "isActive" boolean NOT NULL DEFAULT true,
    "organizationId" uuid,
    "createdBy" uuid NOT NULL,
    "events" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "config" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "verificationToken" character varying,
    "isVerified" boolean NOT NULL DEFAULT false,
    "lastVerifiedAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_webhook_endpoints_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_webhook_endpoints_createdBy" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_webhook_endpoints_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL
  );

  -- Indexes
  CREATE INDEX "IDX_webhook_endpoints_organizationId_status" ON "webhook_endpoints" ("organizationId", "status");
  CREATE INDEX "IDX_webhook_endpoints_createdBy_status" ON "webhook_endpoints" ("createdBy", "status");
  CREATE INDEX "IDX_webhook_endpoints_url" ON "webhook_endpoints" ("url");
  CREATE INDEX "IDX_webhook_endpoints_status_isActive" ON "webhook_endpoints" ("status", "isActive");
`);


// Webhook Deliveries Table
await queryRunner.query(`
  -- Create enums
  CREATE TYPE "deliveryStatusEnum" AS ENUM ('pending', 'processing', 'success', 'failed', 'retrying', 'cancelled', 'expired');
  CREATE TYPE "deliveryPriorityEnum" AS ENUM ('low', 'normal', 'high', 'critical');


  -- Create table
  CREATE TABLE "webhook_deliveries" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "endpointId" uuid NOT NULL,
    "eventType" "webhookEventEnum" NOT NULL,
    "status" "deliveryStatusEnum" NOT NULL DEFAULT 'pending',
    "priority" "deliveryPriorityEnum" NOT NULL DEFAULT 'normal',
    "organizationId" uuid,
    "payload" jsonb NOT NULL,
    "request" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "response" jsonb,
    "attempts" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "error" jsonb,
    "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "scheduledAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP,
    "completedAt" TIMESTAMP,
    "expiresAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_webhook_deliveries_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_webhook_deliveries_endpointId" FOREIGN KEY ("endpointId") REFERENCES "webhook_endpoints"("id") ON DELETE CASCADE
  );

  -- Indexes
  CREATE INDEX "IDX_webhook_deliveries_endpointId_status" ON "webhook_deliveries" ("endpointId", "status");
  CREATE INDEX "IDX_webhook_deliveries_status_scheduledAt" ON "webhook_deliveries" ("status", "scheduledAt");
  CREATE INDEX "IDX_webhook_deliveries_eventType_createdAt" ON "webhook_deliveries" ("eventType", "createdAt");
  CREATE INDEX "IDX_webhook_deliveries_organizationId_createdAt" ON "webhook_deliveries" ("organizationId", "createdAt");
  CREATE INDEX "IDX_webhook_deliveries_priority_scheduledAt" ON "webhook_deliveries" ("priority", "scheduledAt");
`);







      
















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
