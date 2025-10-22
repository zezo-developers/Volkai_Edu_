import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

// Entities
import { Job } from '../../database/entities/job.entity';
import { JobApplication } from '../../database/entities/job-application.entity';
import { HRProfile } from '../../database/entities/hr-profile.entity';
import { Team } from '../../database/entities/team.entity';
import { TeamMember } from '../../database/entities/team-member.entity';
import { User } from '../../database/entities/user.entity';
import { Organization } from '../../database/entities/organization.entity';
import { UserResume } from '../../database/entities/user-resume.entity';
import { InterviewSession } from '../../database/entities/interview-session.entity';
import { Skill } from '../../database/entities/skill.entity';

// Services
import { JobManagementService } from './services/job-management.service';
import { ApplicationTrackingService } from './services/application-tracking.service';
import { HRProfileService } from './services/hr-profile.service';
import { TeamManagementService } from './services/team-management.service';
import { IntegrationService } from './services/integration.service';

// Controllers
import { JobManagementController } from './controllers/job-management.controller';
import { ApplicationTrackingController } from './controllers/application-tracking.controller';
import { HRProfileController } from './controllers/hr-profile.controller';
import { TeamManagementController } from './controllers/team-management.controller';
import { IntegrationController } from './controllers/integration.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Job and Application entities
      Job,
      JobApplication,
      
      // HR Profile and Team entities
      HRProfile,
      Team,
      TeamMember,
      
      // Related entities
      User,
      Organization,
      UserResume,
      InterviewSession,
      Skill,
    ]),
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    ConfigModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [
    JobManagementController,
    ApplicationTrackingController,
    HRProfileController,
    TeamManagementController,
    IntegrationController,
  ],
  providers: [
    JobManagementService,
    ApplicationTrackingService,
    HRProfileService,
    TeamManagementService,
    IntegrationService,
  ],
  exports: [
    JobManagementService,
    ApplicationTrackingService,
    HRProfileService,
    TeamManagementService,
    IntegrationService,
  ],
})
export class HRModule {}
