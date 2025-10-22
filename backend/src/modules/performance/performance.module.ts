import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { PerformanceService } from './performance.service';
import { PerformanceController } from './performance.controller';
import { AnalyticsEvent } from '../../database/entities/analytics-event.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AnalyticsEvent]),
    ScheduleModule.forRoot(),
  ],
  controllers: [PerformanceController],
  providers: [PerformanceService],
  exports: [PerformanceService],
})
export class PerformanceModule {
  constructor() {
    console.log('🚀 PerformanceModule initialized');
    console.log('📊 Database performance monitoring enabled');
    console.log('⚡ Real-time metrics collection active');
  }
}
