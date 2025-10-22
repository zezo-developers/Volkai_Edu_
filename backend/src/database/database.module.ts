import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Import all entities
// Core entities
import { User } from './entities/user.entity';
import { Organization } from './entities/organization.entity';
import { OrganizationMembership } from './entities/organization-membership.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { AuditLog } from './entities/audit-log.entity';
import { File } from './entities/file.entity';

// LMS entities
import { Course } from './entities/course.entity';
import { Module as CourseModule } from './entities/module.entity';
import { Lesson } from './entities/lesson.entity';
import { Assessment } from './entities/assessment.entity';
import { AssessmentAttempt } from './entities/assessment-attempt.entity';
import { Enrollment } from './entities/enrollment.entity';
import { LessonProgress } from './entities/lesson-progress.entity';
import { Certificate } from './entities/certificate.entity';

// Interview entities
import { InterviewSession } from './entities/interview-session.entity';
import { InterviewQuestion } from './entities/interview-question.entity';
import { InterviewQuestionBank } from './entities/interview-question-bank.entity';
import { InterviewResponse } from './entities/interview-response.entity';
import { AiMockInterview } from './entities/ai-mock-interview.entity';

// Resume entities
import { ResumeTemplate } from './entities/resume-template.entity';
import { UserResume } from './entities/user-resume.entity';
import { ResumeSection } from './entities/resume-section.entity';
import { SkillCategory } from './entities/skill-category.entity';
import { Skill } from './entities/skill.entity';
import { UserSkill } from './entities/user-skill.entity';

// HR entities
import { Job } from './entities/job.entity';
import { JobApplication } from './entities/job-application.entity';
import { HRProfile } from './entities/hr-profile.entity';
import { Team } from './entities/team.entity';
import { TeamMember } from './entities/team-member.entity';

// Notification entities
import { Notification } from './entities/notification.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import { UserNotificationPreferences } from './entities/user-notification-preferences.entity';

// Billing entities
import { Plan } from './entities/plan.entity';
import { Subscription } from './entities/subscription.entity';
import { Invoice } from './entities/invoice.entity';
import { Payment } from './entities/payment.entity';

// Admin & Analytics entities
import { AnalyticsEvent } from './entities/analytics-event.entity';
import { SystemConfig } from './entities/system-config.entity';
import { Report } from './entities/report.entity';
import { DataExport } from './entities/data-export.entity';

// Webhooks & Integrations entities
import { WebhookEndpoint } from './entities/webhook-endpoint.entity';
import { WebhookDelivery } from './entities/webhook-delivery.entity';
import { ApiKey } from './entities/api-key.entity';
import { ApiKeyUsage } from './entities/api-key-usage.entity';
import { Integration } from './entities/integration.entity';

/**
 * Database module that exports all entity repositories
 * Provides centralized access to database entities
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Core entities
      User,
      Organization,
      OrganizationMembership,
      Role,
      Permission,
      AuditLog,
      File,
      
      // LMS entities
      Course,
      CourseModule,
      Lesson,
      Assessment,
      AssessmentAttempt,
      Enrollment,
      LessonProgress,
      Certificate,
      
      // Interview entities
      InterviewSession,
      InterviewQuestion,
      InterviewQuestionBank,
      InterviewResponse,
      AiMockInterview,
      
      // Resume entities
      ResumeTemplate,
      UserResume,
      ResumeSection,
      SkillCategory,
      Skill,
      UserSkill,
      
      // HR entities
      Job,
      JobApplication,
      HRProfile,
      Team,
      TeamMember,
      
      // Notification entities
      Notification,
      NotificationTemplate,
      UserNotificationPreferences,
      
      // Billing entities
      Plan,
      Subscription,
      Invoice,
      Payment,
      
      // Admin & Analytics entities
      AnalyticsEvent,
      SystemConfig,
      Report,
      DataExport,
      
      // Webhooks & Integrations entities
      WebhookEndpoint,
      WebhookDelivery,
      ApiKey,
      ApiKeyUsage,
      Integration,
    ]),
  ],
  exports: [
    TypeOrmModule,
  ],
})
export class DatabaseModule {}
