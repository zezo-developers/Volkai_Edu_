import { Module } from '@nestjs/common';
import { EmailService } from './email.service';

/**
 * Email Module
 * Provides email functionality with template support and SendGrid integration
 */
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
