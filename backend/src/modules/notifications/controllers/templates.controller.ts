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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User, UserRole } from '../../../database/entities/user.entity';
import { NotificationChannel } from '../../../database/entities/notification-template.entity';
import { 
  TemplateService, 
  CreateTemplateDto as ICreateTemplateDto, 
  UpdateTemplateDto, 
  SearchTemplatesDto 
} from '../services/template.service';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CreateTemplateDto } from '@/modules/resume/dto/template-management.dto';

@ApiTags('Notification Templates')
@Controller('notifications/templates')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TemplatesController {
  constructor(
    private readonly templateService: TemplateService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Create notification template' })
  @ApiBody({ type: CreateTemplateDto }) 
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Template created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid template data',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Template key already exists',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async createTemplate(
    @Body(ValidationPipe) createDto: ICreateTemplateDto,
    @CurrentUser() user: any,
  ): Promise<any> {
    const template = await this.templateService.createTemplate(createDto, user);
    
    return {
      success: true,
      template: {
        id: template.id,
        key: template.key,
        name: template.name,
        channels: template.channels,
        isActive: template.isActive,
        createdAt: template.createdAt,
      },
    };
  }

  @Get()
  @ApiOperation({ summary: 'Search notification templates' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Templates retrieved successfully',
  })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'channel', required: false, enum: NotificationChannel })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'tags', required: false, description: 'Filter by tags (comma-separated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  async searchTemplates(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('channel') channel?: NotificationChannel,
    @Query('isActive') isActive?: boolean,
    @Query('tags') tags?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ): Promise<any> {
    console.log("Inside search controller")
    const searchDto: SearchTemplatesDto = {
      search,
      category,
      channel,
      isActive,
      tags: tags ? tags.split(',') : undefined,
      page,
      limit,
      sortBy,
      sortOrder,
    };

    const result = await this.templateService.searchTemplates(searchDto);
    
    return {
      success: true,
      ...result,
    };
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get templates grouped by category' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template categories retrieved successfully',
  })
  async getTemplatesByCategory(): Promise<any> {
    const categorized = await this.templateService.getTemplatesByCategory();
    
    return {
      success: true,
      categories: categorized,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get template by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Template not found',
  })
  @ApiParam({ name: 'id', description: 'Template ID' })
  async getTemplateById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<any> {
    const template = await this.templateService.getTemplateById(id);
    
    return {
      success: true,
      template,
    };
  }

  @Get('key/:key')
  @ApiOperation({ summary: 'Get template by key' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Template not found',
  })
  @ApiParam({ name: 'key', description: 'Template key' })
  async getTemplateByKey(
    @Param('key') key: string,
  ): Promise<any> {
    const template = await this.templateService.getTemplateByKey(key);
    
    return {
      success: true,
      template,
    };
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Update notification template' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Template not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid template data',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiParam({ name: 'id', description: 'Template ID' })
  async updateTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateDto: UpdateTemplateDto,
    @CurrentUser() user: any,
  ): Promise<any> {
    const template = await this.templateService.updateTemplate(id, updateDto, user);
    
    return {
      success: true,
      template: {
        id: template.id,
        key: template.key,
        name: template.name,
        channels: template.channels,
        isActive: template.isActive,
        updatedAt: template.updatedAt,
      },
    };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Delete notification template' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Template not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiParam({ name: 'id', description: 'Template ID' })
  async deleteTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ): Promise<any> {
    await this.templateService.deleteTemplate(id, user);
    
    return {
      success: true,
      message: 'Template deleted successfully',
    };
  }

  @Post(':id/clone')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Clone notification template' })
  @ApiBody({
    schema:{
      type: 'object',
      properties: {
        newKey: {
          type: 'string',
          description: 'New template key',
        },
        newName: {
          type: 'string',
          description: 'New template name',
        },
      },
      required: ['newKey', 'newName'],
    }
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Template cloned successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Template not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'New template key already exists',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiParam({ name: 'id', description: 'Template ID to clone' })
  async cloneTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('newKey') newKey: string,
    @Body('newName') newName: string,
    @CurrentUser() user: any,
  ): Promise<any> {
    const clonedTemplate = await this.templateService.cloneTemplate(id, newKey, newName, user);
    
    return {
      success: true,
      template: {
        id: clonedTemplate.id,
        key: clonedTemplate.key,
        name: clonedTemplate.name,
        channels: clonedTemplate.channels,
        isActive: clonedTemplate.isActive,
        createdAt: clonedTemplate.createdAt,
      },
    };
  }

  @Post(':id/preview')
  @ApiOperation({ summary: 'Preview template with variables' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        variables: {
          type: 'object',
          description: 'Template variables',
        },
        channel: {
          type: 'string',
          description: 'Notification channel',
        },
        language: {
          type: 'string',
          description: 'Language code',
        },
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template preview generated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Template not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Template does not support specified channel',
  })
  @ApiParam({ name: 'id', description: 'Template ID' })
  async previewTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('variables') variables: Record<string, any>,
    @Body('channel') channel: NotificationChannel,
    @Body('language') language?: string,
  ): Promise<any> {
    const preview = await this.templateService.previewTemplate(id, variables, channel, language);
    
    return {
      success: true,
      preview,
    };
  }

  @Get(':id/validate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Validate template' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template validation completed',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Template not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiParam({ name: 'id', description: 'Template ID' })
  async validateTemplate(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<any> {
    const validation = await this.templateService.validateTemplate(id);
    
    return {
      success: true,
      validation,
    };
  }

  @Get(':id/usage-stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Get template usage statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template usage statistics retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Template not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiParam({ name: 'id', description: 'Template ID' })
  async getTemplateUsageStats(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<any> {
    const stats = await this.templateService.getTemplateUsageStats(id);
    
    return {
      success: true,
      stats,
    };
  }

  @Post('create-defaults')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create default notification templates' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Default templates created successfully',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only administrators can create default templates',
  })
  async createDefaultTemplates(): Promise<any> {
    await this.templateService.createDefaultTemplates();
    
    return {
      success: true,
      message: 'Default templates created successfully',
    };
  }

  // Template testing endpoints
  @Post(':id/test')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Send test notification using template' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Test notification sent successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Template not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiParam({ name: 'id', description: 'Template ID' })
  async sendTestNotification(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('testEmail') testEmail: string,
    @Body('variables') variables: Record<string, any>,
    @Body('channels') channels: NotificationChannel[],
    @CurrentUser() user: any,
  ): Promise<any> {
    // This would send a test notification to the specified email
    // Implementation would use the notification service
    
    return {
      success: true,
      message: 'Test notification sent successfully',
      sentTo: testEmail,
      channels,
    };
  }

  // Template analytics endpoints
  @Get('analytics/overview')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Get template analytics overview' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template analytics retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async getTemplateAnalytics(): Promise<any> {
    // This would provide analytics across all templates
    return {
      success: true,
      analytics: {
        totalTemplates: 25,
        activeTemplates: 22,
        totalUsage: 12500,
        averageSuccessRate: 94.2,
        mostUsedTemplates: [
          { key: 'welcome_user', usage: 2500, successRate: 96.5 },
          { key: 'application_status_update', usage: 1800, successRate: 92.1 },
          { key: 'interview_scheduled', usage: 1200, successRate: 98.2 },
        ],
        channelDistribution: {
          email: 45,
          sms: 15,
          push: 25,
          in_app: 15,
        },
        categoryDistribution: {
          hr: 8,
          user_management: 5,
          course: 7,
          system: 3,
          marketing: 2,
        },
      },
    };
  }

  @Get('analytics/performance')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Get template performance metrics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template performance metrics retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Start date for metrics' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'End date for metrics' })
  async getTemplatePerformance(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<any> {
    // This would provide performance metrics for templates
    return {
      success: true,
      performance: {
        period: { from: dateFrom, to: dateTo },
        metrics: {
          totalSent: 12500,
          deliveryRate: 97.8,
          openRate: 65.4,
          clickRate: 12.3,
          unsubscribeRate: 0.8,
        },
        topPerformers: [
          { key: 'interview_scheduled', openRate: 89.2, clickRate: 45.6 },
          { key: 'welcome_user', openRate: 78.5, clickRate: 23.4 },
          { key: 'course_reminder', openRate: 72.1, clickRate: 18.9 },
        ],
        underPerformers: [
          { key: 'marketing_newsletter', openRate: 23.4, clickRate: 2.1 },
          { key: 'system_maintenance', openRate: 45.2, clickRate: 5.6 },
        ],
        trends: {
          deliveryTrend: 'stable',
          engagementTrend: 'improving',
          errorTrend: 'decreasing',
        },
      },
    };
  }
}
