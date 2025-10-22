import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

// Entities
import { AnalyticsEvent } from '../../database/entities/analytics-event.entity';
import { SystemConfig } from '../../database/entities/system-config.entity';
import { Report } from '../../database/entities/report.entity';
import { DataExport } from '../../database/entities/data-export.entity';
import { User } from '../../database/entities/user.entity';
import { Organization } from '../../database/entities/organization.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { Subscription } from '../../database/entities/subscription.entity';
import { Course } from '../../database/entities/course.entity';
import { Job } from '../../database/entities/job.entity';
import { Payment } from '../../database/entities/payment.entity';

// Services
import { AdminService } from './services/admin.service';
import { AnalyticsService } from './services/analytics.service';

// Controllers
import { AdminController } from './controllers/admin.controller';
import { AnalyticsController } from './controllers/analytics.controller';

// External modules
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AnalyticsEvent,
      SystemConfig,
      Report,
      DataExport,
      User,
      Organization,
      AuditLog,
      Subscription,
      Course,
      Job,
      Payment,
    ]),
    BullModule.registerQueue({
      name: 'admin',
      defaultJobOptions: {
        removeOnComplete: 25,
        removeOnFail: 10,
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 3000,
        },
      },
    }),
    BullModule.registerQueue({
      name: 'analytics',
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 25,
        attempts: 1,
        backoff: {
          type: 'fixed',
          delay: 1000,
        },
      },
    }),
    BullModule.registerQueue({
      name: 'reports',
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 5,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    }),
    BullModule.registerQueue({
      name: 'exports',
      defaultJobOptions: {
        removeOnComplete: 5,
        removeOnFail: 3,
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 10000,
        },
      },
    }),
    ConfigModule,
    ScheduleModule.forRoot(),
    NotificationsModule,
  ],
  controllers: [
    AdminController,
    AnalyticsController,
  ],
  providers: [
    AdminService,
    AnalyticsService,
  ],
  exports: [
    AdminService,
    AnalyticsService,
  ],
})
export class AdminModule {}
