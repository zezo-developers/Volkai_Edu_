import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@/database/entities/user.entity';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

/**
 * Health Module
 * Provides system health monitoring and status endpoints
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([User]), // For database health checks
  ],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
