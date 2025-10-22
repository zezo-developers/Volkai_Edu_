import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { MonitoringService } from './monitoring.service';
import { MonitoringController } from './monitoring.controller';
import { AnalyticsEvent } from '../../database/entities/analytics-event.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AnalyticsEvent]),
    ScheduleModule.forRoot(),
  ],
  controllers: [MonitoringController],
  providers: [MonitoringService],
  exports: [MonitoringService],
})
export class MonitoringModule {
  constructor() {
    console.log('📊 MonitoringModule initialized');
    console.log('🔍 Real-time system monitoring enabled');
    console.log('🚨 Alert system and health checks active');
  }
}
