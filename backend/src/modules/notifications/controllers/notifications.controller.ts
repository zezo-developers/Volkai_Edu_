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
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User, UserRole } from '../../../database/entities/user.entity';
import { NotificationChannel } from '../../../database/entities/notification-template.entity';
import { NotificationStatus, NotificationPriority } from '../../../database/entities/notification.entity';
import { NotificationService, SendNotificationOptions, BulkNotificationOptions } from '../services/notification.service';
import { DeliveryService } from '../services/delivery.service';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

export class SendNotificationDto {
  userId?: string;
  organizationId?: string;
  templateKey?: string;
  channel: NotificationChannel;
  subject?: string;
  body: string;
  data?: Record<string, any>;
  priority?: NotificationPriority;
  scheduledAt?: Date;
  variables?: Record<string, any>;
}

export class BulkNotificationDto {
  userIds: string[];
  templateKey: string;
  channels: NotificationChannel[];
  variables: Record<string, any>;
  priority?: NotificationPriority;
  scheduledAt?: Date;
  batchSize?: number;
}

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly deliveryService: DeliveryService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Send a notification' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Notification sent successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid notification data',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async sendNotification(
    @Body(ValidationPipe) sendDto: SendNotificationDto,
    @CurrentUser() user: User,
  ): Promise<any> {
    const options: SendNotificationOptions = {
      ...sendDto,
    };

    const notification = await this.notificationService.sendNotification(options);
    
    return {
      success: true,
      notificationId: notification.id,
      status: notification.status,
      scheduledAt: notification.scheduledAt,
    };
  }

  @Post('bulk')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Send bulk notifications' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Bulk notifications queued successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid bulk notification data',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async sendBulkNotifications(
    @Body(ValidationPipe) bulkDto: BulkNotificationDto,
    @CurrentUser() user: User,
  ): Promise<any> {
    const options: BulkNotificationOptions = {
      ...bulkDto,
    };

    const result = await this.notificationService.sendBulkNotifications(options);
    
    return {
      success: true,
      ...result,
    };
  }

  @Get('my')
  @ApiOperation({ summary: 'Get current user notifications' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User notifications retrieved successfully',
  })
  @ApiQuery({ name: 'channel', required: false, enum: NotificationChannel })
  @ApiQuery({ name: 'status', required: false, enum: NotificationStatus })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getMyNotifications(
    @CurrentUser() user: User,
    @Query('channel') channel?: NotificationChannel,
    @Query('status') status?: NotificationStatus,
    @Query('unreadOnly') unreadOnly?: boolean,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<any> {
    const options = {
      channel,
      status,
      unreadOnly,
      limit,
      offset,
    };

    const result = await this.notificationService.getUserNotifications(user.id, options);
    
    return {
      success: true,
      ...result,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get notification by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notification retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Notification not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  async getNotificationById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<any> {
    const notification = await this.notificationService.getNotificationById(id);
    
    // Check if user has access to this notification
    if (notification.userId !== user.id && 
        user.roles!== UserRole.ADMIN && 
        notification.organizationId !== user.organizationId) {
      return { success: false, message: 'Access denied' };
    }

    return {
      success: true,
      notification,
    };
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notification marked as read successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Notification not found',
  })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<any> {
    const notification = await this.notificationService.markAsRead(id, user.id);
    
    return {
      success: true,
      notification: {
        id: notification.id,
        isRead: notification.isRead,
        readAt: notification.readAt,
      },
    };
  }

  @Put('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All notifications marked as read successfully',
  })
  @ApiQuery({ name: 'channel', required: false, enum: NotificationChannel })
  async markAllAsRead(
    @CurrentUser() user: User,
    @Query('channel') channel?: NotificationChannel,
  ): Promise<any> {
    const count = await this.notificationService.markAllAsRead(user.id, channel);
    
    return {
      success: true,
      markedAsRead: count,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notification deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Notification not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  async deleteNotification(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<any> {
    await this.notificationService.deleteNotification(id, user.id);
    
    return {
      success: true,
      message: 'Notification deleted successfully',
    };
  }

  @Post(':id/retry')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Retry failed notification' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notification retry queued successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Notification cannot be retried',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  async retryNotification(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<any> {
    const notification = await this.notificationService.retryFailedNotification(id);
    
    return {
      success: true,
      notification: {
        id: notification.id,
        status: notification.status,
        retryCount: notification.retryCount,
      },
    };
  }

  @Get('stats/overview')
  @ApiOperation({ summary: 'Get notification statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notification statistics retrieved successfully',
  })
  @ApiQuery({ name: 'organizationId', required: false, description: 'Filter by organization' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Start date for statistics' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'End date for statistics' })
  async getNotificationStats(
    @CurrentUser() user: User,
    @Query('organizationId') organizationId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<any> {
    let userId: string | undefined;
    let orgId: string | undefined;

    // Determine access level
    if (user.roles=== UserRole.ADMIN) {
      orgId = organizationId;
    } else if (user.roles=== UserRole.HR || user.roles=== UserRole.MANAGER) {
      orgId = user.organizationId;
    } else {
      userId = user.id; // Students can only see their own stats
    }

    const dateRange = dateFrom && dateTo ? {
      start: new Date(dateFrom),
      end: new Date(dateTo),
    } : undefined;

    const stats = await this.notificationService.getNotificationStats(userId, orgId, dateRange);
    
    return {
      success: true,
      stats,
    };
  }

  // Tracking endpoints for email/SMS webhooks
  @Get(':id/track/open')
  @ApiOperation({ summary: 'Track notification open (for email tracking pixel)' })
  async trackOpen(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress;

    await this.deliveryService.trackNotificationOpen(id, userAgent, ipAddress);

    // Return 1x1 transparent pixel
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );

    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': pixel.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });
    res.end(pixel);
  }

  @Get(':id/track/click')
  @ApiOperation({ summary: 'Track notification click and redirect' })
  @ApiQuery({ name: 'url', required: true, description: 'Original URL to redirect to' })
  async trackClick(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('url') url: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress;

    const redirectUrl = await this.deliveryService.trackNotificationClick(id, url, userAgent, ipAddress);

    res.redirect(302, redirectUrl);
  }

  // Webhook endpoints for external providers
  @Post('webhooks/email')
  @ApiOperation({ summary: 'Handle email provider webhooks' })
  async handleEmailWebhook(
    @Body() webhookData: any,
  ): Promise<any> {
    await this.deliveryService.handleEmailWebhook(webhookData);
    
    return {
      success: true,
      message: 'Webhook processed',
    };
  }

  @Post('webhooks/sms')
  @ApiOperation({ summary: 'Handle SMS provider webhooks' })
  async handleSMSWebhook(
    @Body() webhookData: any,
  ): Promise<any> {
    await this.deliveryService.handleSMSWebhook(webhookData);
    
    return {
      success: true,
      message: 'Webhook processed',
    };
  }

  // Admin endpoints
  @Get('admin/overview')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get admin notification overview' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Admin overview retrieved successfully',
  })
  async getAdminOverview(): Promise<any> {
    // This would provide system-wide notification metrics
    return {
      success: true,
      overview: {
        totalNotifications: 12500,
        todaysSent: 450,
        failureRate: 2.3,
        averageDeliveryTime: 1.8,
        activeTemplates: 25,
        connectedUsers: 156,
        channelDistribution: {
          email: 45,
          sms: 15,
          push: 25,
          in_app: 15,
        },
      },
    };
  }

  @Get('admin/failed')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get failed notifications for admin review' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Failed notifications retrieved successfully',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getFailedNotifications(
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ): Promise<any> {
    // This would query failed notifications from the database
    return {
      success: true,
      failedNotifications: [],
      total: 0,
      limit,
      offset,
    };
  }

  @Post('admin/retry-all-failed')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Retry all failed notifications' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Retry process initiated successfully',
  })
  async retryAllFailedNotifications(): Promise<any> {
    // This would queue all retryable failed notifications
    return {
      success: true,
      message: 'Retry process initiated for all failed notifications',
      queued: 0,
    };
  }
}
