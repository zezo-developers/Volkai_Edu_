import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

// Entities
import { ResumeTemplate } from '../../database/entities/resume-template.entity';
import { UserResume } from '../../database/entities/user-resume.entity';
import { ResumeSection } from '../../database/entities/resume-section.entity';
import { SkillCategory } from '../../database/entities/skill-category.entity';
import { Skill } from '../../database/entities/skill.entity';
import { UserSkill } from '../../database/entities/user-skill.entity';
import { User } from '../../database/entities/user.entity';

// Services
import { TemplateManagementService } from './services/template-management.service';
import { ResumeBuilderService } from './services/resume-builder.service';
import { SkillsIntegrationService } from './services/skills-integration.service';
import { PdfExportService } from './services/pdf-export.service';
import { ResumeAnalyticsService } from './services/resume-analytics.service';

// Controllers
import { TemplateManagementController } from './controllers/template-management.controller';
import { ResumeBuilderController } from './controllers/resume-builder.controller';
import { SkillsIntegrationController } from './controllers/skills-integration.controller';
import { PdfExportController } from './controllers/pdf-export.controller';
import { ResumeAnalyticsController } from './controllers/resume-analytics.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Resume entities
      ResumeTemplate,
      UserResume,
      ResumeSection,
      
      // Skills entities
      SkillCategory,
      Skill,
      UserSkill,
      
      // User entity for relations
      User,
    ]),
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    ConfigModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [
    TemplateManagementController,
    ResumeBuilderController,
    SkillsIntegrationController,
    PdfExportController,
    ResumeAnalyticsController,
  ],
  providers: [
    TemplateManagementService,
    ResumeBuilderService,
    SkillsIntegrationService,
    PdfExportService,
    ResumeAnalyticsService,
  ],
  exports: [
    TemplateManagementService,
    ResumeBuilderService,
    SkillsIntegrationService,
    PdfExportService,
    ResumeAnalyticsService,
  ],
})
export class ResumeModule {}
