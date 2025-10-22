import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '@database/entities/audit-log.entity';
import { AuditService } from './audit.service';
import { AuditListener } from './listeners/audit.listener';

/**
 * Audit Module
 * Provides comprehensive audit logging for security and compliance
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog]),
  ],
  providers: [AuditService, AuditListener],
  exports: [AuditService],
})
export class AuditModule {}
