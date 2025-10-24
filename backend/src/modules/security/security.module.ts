import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { SecurityService } from './security.service';
import { RateLimitingService } from './rate-limiting.service';
import { SecurityController } from './security.controller';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { User } from '../../database/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog, User]),
    ScheduleModule.forRoot(),
  ],
  controllers: [SecurityController],
  providers: [SecurityService, RateLimitingService],
  exports: [SecurityService, RateLimitingService],
})

export class SecurityModule {
  constructor() {
    console.log('🔒 SecurityModule initialized');
    console.log('🛡️  Advanced threat detection enabled');
    console.log('🚫 DDoS protection and rate limiting active');
  }
}
