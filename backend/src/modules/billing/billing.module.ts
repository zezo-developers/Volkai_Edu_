import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

// Entities
import { Plan } from '../../database/entities/plan.entity';
import { Subscription } from '../../database/entities/subscription.entity';
import { Invoice } from '../../database/entities/invoice.entity';
import { Payment } from '../../database/entities/payment.entity';
import { Organization } from '../../database/entities/organization.entity';
import { User } from '../../database/entities/user.entity';

// Services
import { BillingService } from './services/billing.service';
import { StripeService } from './services/stripe.service';
import { RazorpayService } from './services/razorpay.service';

// Controllers
import { PlansController } from './controllers/plans.controller';
import { SubscriptionsController } from './controllers/subscriptions.controller';

// External modules
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Plan,
      Subscription,
      Invoice,
      Payment,
      Organization,
      User,
    ]),
    BullModule.registerQueue({
      name: 'billing',
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 25,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }),
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 3,
    }),
    ConfigModule,
    ScheduleModule.forRoot(),
    NotificationsModule,
  ],
  controllers: [
    PlansController,
    SubscriptionsController,
  ],
  providers: [
    BillingService,
    StripeService,
    RazorpayService,
  ],
  exports: [
    BillingService,
    StripeService,
    RazorpayService,
  ],
})
export class BillingModule {}
