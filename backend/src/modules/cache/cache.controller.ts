import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../database/entities/user.entity';
import { AdvancedCacheService } from './advanced-cache.service';

@ApiTags('Cache')
@Controller('cache')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CacheController {
  constructor(private readonly cacheService: AdvancedCacheService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get cache statistics' })
  @ApiResponse({ status: 200, description: 'Cache statistics retrieved successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER)
  async getStats() {
    const stats = this.cacheService.getStats();

    return {
      success: true,
      data: stats,
      message: 'Cache statistics retrieved successfully',
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Check cache health' })
  @ApiResponse({ status: 200, description: 'Cache health check completed' })
  @Roles(Role.ADMIN, Role.DEVELOPER)
  async healthCheck() {
    const health = await this.cacheService.healthCheck();

    return {
      success: true,
      data: health,
      message: 'Cache health check completed',
    };
  }

  @Get('keys/top')
  @ApiOperation({ summary: 'Get top accessed cache keys' })
  @ApiResponse({ status: 200, description: 'Top cache keys retrieved successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER)
  async getTopKeys(@Query('limit') limit: number = 10) {
    const topKeys = this.cacheService.getTopKeys(limit);

    return {
      success: true,
      data: topKeys,
      message: 'Top cache keys retrieved successfully',
    };
  }

  @Get('keys/:key/info')
  @ApiOperation({ summary: 'Get cache key information' })
  @ApiResponse({ status: 200, description: 'Cache key information retrieved successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER)
  async getKeyInfo(
    @Param('key') key: string,
    @Query('namespace') namespace?: string
  ) {
    const keyInfo = this.cacheService.getKeyInfo(key, namespace);

    return {
      success: true,
      data: keyInfo,
      message: 'Cache key information retrieved successfully',
    };
  }

  @Get('tags/:tag/keys')
  @ApiOperation({ summary: 'Get keys by tag' })
  @ApiResponse({ status: 200, description: 'Tagged keys retrieved successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER)
  async getKeysByTag(@Param('tag') tag: string) {
    const keys = this.cacheService.getKeysByTag(tag);

    return {
      success: true,
      data: keys,
      message: 'Tagged keys retrieved successfully',
    };
  }

  @Delete('keys/:key')
  @ApiOperation({ summary: 'Delete cache key' })
  @ApiResponse({ status: 200, description: 'Cache key deleted successfully' })
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN, Role.DEVELOPER)
  async deleteKey(
    @Param('key') key: string,
    @Query('namespace') namespace?: string
  ) {
    await this.cacheService.del(key, namespace);

    return {
      success: true,
      message: 'Cache key deleted successfully',
    };
  }

  @Delete('tags/:tag')
  @ApiOperation({ summary: 'Invalidate cache by tag' })
  @ApiResponse({ status: 200, description: 'Cache invalidated by tag successfully' })
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN, Role.DEVELOPER)
  async invalidateByTag(@Param('tag') tag: string) {
    await this.cacheService.invalidateByTags([tag]);

    return {
      success: true,
      message: `Cache invalidated for tag: ${tag}`,
    };
  }

  @Delete('tags')
  @ApiOperation({ summary: 'Invalidate cache by multiple tags' })
  @ApiResponse({ status: 200, description: 'Cache invalidated by tags successfully' })
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN, Role.DEVELOPER)
  async invalidateByTags(@Body('tags') tags: string[]) {
    await this.cacheService.invalidateByTags(tags);

    return {
      success: true,
      message: `Cache invalidated for tags: ${tags.join(', ')}`,
    };
  }

  @Delete('pattern')
  @ApiOperation({ summary: 'Invalidate cache by pattern' })
  @ApiResponse({ status: 200, description: 'Cache invalidated by pattern successfully' })
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN, Role.DEVELOPER)
  async invalidateByPattern(@Body('pattern') pattern: string) {
    await this.cacheService.invalidateByPattern(pattern);

    return {
      success: true,
      message: `Cache invalidated for pattern: ${pattern}`,
    };
  }

  @Delete('namespace/:namespace')
  @ApiOperation({ summary: 'Clear cache namespace' })
  @ApiResponse({ status: 200, description: 'Cache namespace cleared successfully' })
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN)
  async clearNamespace(@Param('namespace') namespace: string) {
    await this.cacheService.clearNamespace(namespace);

    return {
      success: true,
      message: `Cache namespace cleared: ${namespace}`,
    };
  }

  @Post('warm')
  @ApiOperation({ summary: 'Warm cache with predefined data' })
  @ApiResponse({ status: 200, description: 'Cache warming completed successfully' })
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN, Role.DEVELOPER)
  async warmCache(@Body('entries') entries: Array<{
    key: string;
    value: any;
    options?: any;
  }>) {
    // Convert entries to the format expected by warmCache
    const warmingEntries = entries.map(entry => ({
      key: entry.key,
      factory: async () => entry.value,
      options: entry.options,
    }));

    await this.cacheService.warmCache(warmingEntries);

    return {
      success: true,
      message: `Cache warmed with ${entries.length} entries`,
    };
  }

  @Get('keys/:key')
  @ApiOperation({ summary: 'Get cache value' })
  @ApiResponse({ status: 200, description: 'Cache value retrieved successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER)
  async getCacheValue(
    @Param('key') key: string,
    @Query('namespace') namespace?: string
  ) {
    const value = await this.cacheService.get(key, { namespace });

    return {
      success: true,
      data: { key, value, found: value !== null },
      message: value !== null ? 'Cache value retrieved successfully' : 'Cache key not found',
    };
  }

  @Post('keys/:key')
  @ApiOperation({ summary: 'Set cache value' })
  @ApiResponse({ status: 200, description: 'Cache value set successfully' })
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN, Role.DEVELOPER)
  async setCacheValue(
    @Param('key') key: string,
    @Body('value') value: any,
    @Body('ttl') ttl?: number,
    @Body('tags') tags?: string[],
    @Body('namespace') namespace?: string
  ) {
    await this.cacheService.set(key, value, {
      ttl,
      tags,
      namespace,
    });

    return {
      success: true,
      message: 'Cache value set successfully',
    };
  }
}
