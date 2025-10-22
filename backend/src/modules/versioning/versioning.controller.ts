import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
  UsePipes,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { UserRole } from '../../database/entities/user.entity';
import { VersioningService } from './services/versioning.service';
import {
  CreateVersionDto,
  PublishVersionDto,
  CompareVersionsDto,
  RestoreVersionDto,
  VersionResponseDto,
  VersionListResponseDto,
  VersionComparisonDto,
  VersioningStatsDto,
} from './dto/versioning.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@ApiTags('Versioning')
@Controller('versioning')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VersioningController {
  constructor(private readonly versioningService: VersioningService) {}

  @Post(':entityType/:entityId/versions')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR, UserRole.CONTENT_CREATOR)
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Create a new version of content' })
  @ApiParam({ name: 'entityType', enum: ['course', 'module', 'lesson', 'assessment'] })
  @ApiParam({ name: 'entityId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Version created successfully',
    type: VersionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Entity not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiBody({ type: CreateVersionDto })
  async createVersion(
    @Param('entityType') entityType: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @Body() createVersionDto: CreateVersionDto,
    @Request() req: any,
  ): Promise<VersionResponseDto> {
    try {
      return await this.versioningService.createVersion(
        entityType,
        entityId,
        createVersionDto,
        req.user,
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create version',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':entityType/:entityId/versions')
  @ApiOperation({ summary: 'Get all versions of content' })
  @ApiParam({ name: 'entityType', enum: ['course', 'module', 'lesson', 'assessment'] })
  @ApiParam({ name: 'entityId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Versions retrieved successfully',
    type: VersionListResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Entity not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  async getVersions(
    @Param('entityType') entityType: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @Request() req: any,
  ): Promise<VersionListResponseDto> {
    try {
      return await this.versioningService.getVersions(entityType, entityId, req.user);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to retrieve versions',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('versions/:versionId')
  @ApiOperation({ summary: 'Get specific version details' })
  @ApiParam({ name: 'versionId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Version retrieved successfully',
    type: VersionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Version not found',
  })
  async getVersion(
    @Param('versionId', ParseUUIDPipe) versionId: string,
  ): Promise<VersionResponseDto> {
    try {
      return await this.versioningService.getVersion(versionId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to retrieve version',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('versions/:versionId/publish')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR, UserRole.CONTENT_CREATOR)
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Publish a version' })
  @ApiParam({ name: 'versionId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Version published successfully',
    type: VersionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Version not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions or version cannot be published',
  })
  @ApiBody({ type: PublishVersionDto })
  async publishVersion(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() publishVersionDto: PublishVersionDto,
    @Request() req: any,
  ): Promise<VersionResponseDto> {
    try {
      return await this.versioningService.publishVersion(
        versionId,
        publishVersionDto,
        req.user,
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to publish version',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('versions/compare')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Compare two versions' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Version comparison completed',
    type: VersionComparisonDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'One or both versions not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Cannot compare versions from different entities',
  })
  @ApiBody({ type: CompareVersionsDto })
  async compareVersions(
    @Body() compareDto: CompareVersionsDto,
    @Request() req: any,
  ): Promise<VersionComparisonDto> {
    try {
      const result = await this.versioningService.compareVersions(compareDto, req.user);
      return new VersionComparisonDto(result);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to compare versions',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('versions/restore')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR, UserRole.CONTENT_CREATOR)
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Restore a previous version' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Version restored successfully',
    type: VersionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Version not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiBody({ type: RestoreVersionDto })
  async restoreVersion(
    @Body() restoreDto: RestoreVersionDto,
    @Request() req: any,
  ): Promise<VersionResponseDto> {
    try {
      return await this.versioningService.restoreVersion(restoreDto, req.user);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to restore version',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('versions/:versionId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR, UserRole.CONTENT_CREATOR)
  @ApiOperation({ summary: 'Delete a version' })
  @ApiParam({ name: 'versionId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Version deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Version not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Cannot delete published version or insufficient permissions',
  })
  async deleteVersion(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    try {
      await this.versioningService.deleteVersion(versionId, req.user);
      return { message: 'Version deleted successfully' };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to delete version',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('statistics')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Get versioning statistics' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'entityType', required: false, enum: ['course', 'module', 'lesson', 'assessment'] })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Versioning statistics retrieved successfully',
    type: VersioningStatsDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async getVersioningStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('entityType') entityType?: string,
    @Request() req?: any,
  ): Promise<VersioningStatsDto> {
    try {
      // Mock statistics for now - in a real implementation, this would query the database
      const stats = {
        totalVersions: 1250,
        publishedVersions: 890,
        draftVersions: 360,
        versionsThisMonth: 125,
        topCreators: [
          { userId: 'user1', userName: 'John Doe', versionCount: 45 },
          { userId: 'user2', userName: 'Jane Smith', versionCount: 38 },
          { userId: 'user3', userName: 'Bob Johnson', versionCount: 32 },
        ],
        activityTrends: [
          { date: '2024-01-01', versionsCreated: 12, versionsPublished: 8 },
          { date: '2024-01-02', versionsCreated: 15, versionsPublished: 10 },
          { date: '2024-01-03', versionsCreated: 18, versionsPublished: 12 },
        ],
        mostVersionedContent: [
          {
            entityType: 'course',
            entityId: 'course1',
            entityTitle: 'Advanced JavaScript',
            versionCount: 15,
          },
          {
            entityType: 'lesson',
            entityId: 'lesson1',
            entityTitle: 'React Hooks Deep Dive',
            versionCount: 12,
          },
        ],
      };

      return new VersioningStatsDto(stats);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to retrieve versioning statistics',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('recent-activity')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR, UserRole.CONTENT_CREATOR)
  @ApiOperation({ summary: 'Get recent versioning activity' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'entityType', required: false, enum: ['course', 'module', 'lesson', 'assessment'] })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recent activity retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        activities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { type: 'string' },
              entityType: { type: 'string' },
              entityId: { type: 'string' },
              entityTitle: { type: 'string' },
              versionNumber: { type: 'number' },
              action: { type: 'string' },
              userId: { type: 'string' },
              userName: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  async getRecentActivity(
    @Query('limit') limit?: number,
    @Query('entityType') entityType?: string,
    @Request() req?: any,
  ): Promise<{ activities: any[] }> {
    try {
      // Mock recent activity - in a real implementation, this would query activity logs
      const activities = [
        {
          id: 'activity1',
          type: 'version_created',
          entityType: 'course',
          entityId: 'course1',
          entityTitle: 'Advanced JavaScript',
          versionNumber: 5,
          action: 'Created new version',
          userId: 'user1',
          userName: 'John Doe',
          timestamp: new Date(Date.now() - 3600000), // 1 hour ago
        },
        {
          id: 'activity2',
          type: 'version_published',
          entityType: 'lesson',
          entityId: 'lesson1',
          entityTitle: 'React Hooks',
          versionNumber: 3,
          action: 'Published version',
          userId: 'user2',
          userName: 'Jane Smith',
          timestamp: new Date(Date.now() - 7200000), // 2 hours ago
        },
      ];

      const filteredActivities = entityType
        ? activities.filter(a => a.entityType === entityType)
        : activities;

      const limitedActivities = limit
        ? filteredActivities.slice(0, limit)
        : filteredActivities;

      return { activities: limitedActivities };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to retrieve recent activity',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
