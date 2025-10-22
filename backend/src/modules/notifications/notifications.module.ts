import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Entities
import { Notification } from '../../database/entities/notification.entity';
import { NotificationTemplate } from '../../database/entities/notification-template.entity';
import { UserNotificationPreferences } from '../../database/entities/user-notification-preferences.entity';
import { User } from '../../database/entities/user.entity';
import { Organization } from '../../database/entities/organization.entity';

// Services
import { NotificationService } from './services/notification.service';
import { DeliveryService } from './services/delivery.service';
import { TemplateService } from './services/template.service';
import { PreferencesService } from './services/preferences.service';

// Controllers
import { NotificationsController } from './controllers/notifications.controller';
import { TemplatesController } from './controllers/templates.controller';
import { PreferencesController } from './controllers/preferences.controller';

// Gateways
import { WebSocketGateway } from './gateways/websocket.gateway';

// Processors
import { NotificationProcessor } from './processors/notification.processor';

// External modules
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      NotificationTemplate,
      UserNotificationPreferences,
      User,
      Organization,
    ]),
    BullModule.registerQueue({
      name: 'notifications',
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }),
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
    EmailModule,
    ConfigModule,
  ],
  controllers: [
    NotificationsController,
    TemplatesController,
    PreferencesController,
  ],
  providers: [
    NotificationService,
    DeliveryService,
    TemplateService,
    PreferencesService,
    WebSocketGateway,
    NotificationProcessor,
  ],
  exports: [
    NotificationService,
    DeliveryService,
    TemplateService,
    PreferencesService,
    WebSocketGateway,
  ],
})
export class NotificationsModule {}
