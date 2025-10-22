import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { AdvancedCacheService } from './advanced-cache.service';
import { CacheController } from './cache.controller';

@Module({
  imports: [
    NestCacheModule.register(),
    ScheduleModule.forRoot(),
  ],
  controllers: [CacheController],
  providers: [AdvancedCacheService],
  exports: [AdvancedCacheService],
})
export class CacheModule {
  constructor() {
    console.log('💾 CacheModule initialized');
    console.log('🚀 Advanced caching with compression and tagging enabled');
    console.log('📊 Cache analytics and monitoring active');
  }
}
