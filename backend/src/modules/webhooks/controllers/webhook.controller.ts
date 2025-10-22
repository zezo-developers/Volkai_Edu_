import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Role } from '../../../database/entities/user.entity';
import { WebhookService } from '../services/webhook.service';
import { 
  CreateWebhookEndpointDto,
  UpdateWebhookEndpointDto,
  TestWebhookDto,
  WebhookStatsQueryDto,
} from '../dto/webhook.dto';
// import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';

@ApiTags('Webhooks')
@Controller('webhooks')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('endpoints')
  @ApiOperation({ summary: 'Create webhook endpoint' })
  @ApiResponse({ status: 201, description: 'Webhook endpoint created successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN)
  async createEndpoint(
    @Body() createDto: CreateWebhookEndpointDto,
    @CurrentUser() user: any
  ) {
    const endpoint = await this.webhookService.createEndpoint(
      createDto.name,
      createDto.url,
      createDto.events,
      user.id,
      createDto.organizationId,
      createDto.config
    );

    return {
      success: true,
      data: endpoint,
      message: 'Webhook endpoint created successfully',
    };
  }

  @Get('endpoints')
  @ApiOperation({ summary: 'List webhook endpoints' })
  @ApiResponse({ status: 200, description: 'Webhook endpoints retrieved successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN, Role.ORGANIZATION_MEMBER)
  async getEndpoints(
    @Query('organizationId') organizationId?: string,
    @CurrentUser() user?: any
  ) {
    let endpoints;

    if (user.role === Role.ADMIN) {
      // Admin can see all endpoints
      endpoints = organizationId 
        ? await this.webhookService.getEndpointsByOrganization(organizationId)
        : await this.webhookService.getEndpointsByOrganization(null); // System endpoints
    } else {
      // Users can only see their organization's endpoints
      const orgId = organizationId || user.organizationId;
      endpoints = await this.webhookService.getEndpointsByOrganization(orgId);
    }

    return {
      success: true,
      data: endpoints,
      message: 'Webhook endpoints retrieved successfully',
    };
  }

  @Get('endpoints/:id')
  @ApiOperation({ summary: 'Get webhook endpoint details' })
  @ApiResponse({ status: 200, description: 'Webhook endpoint retrieved successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN, Role.ORGANIZATION_MEMBER)
  async getEndpoint(@Param('id') id: string) {
    const endpoint = await this.webhookService.getEndpointById(id);

    return {
      success: true,
      data: endpoint,
      message: 'Webhook endpoint retrieved successfully',
    };
  }

  @Patch('endpoints/:id')
  @ApiOperation({ summary: 'Update webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook endpoint updated successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN)
  async updateEndpoint(
    @Param('id') id: string,
    @Body() updateDto: UpdateWebhookEndpointDto
  ) {
    const endpoint = await this.webhookService.updateEndpoint(id, updateDto as any);

    return {
      success: true,
      data: endpoint,
      message: 'Webhook endpoint updated successfully',
    };
  }

  @Delete('endpoints/:id')
  @ApiOperation({ summary: 'Delete webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook endpoint deleted successfully' })
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ADMIN)
  async deleteEndpoint(@Param('id') id: string) {
    await this.webhookService.deleteEndpoint(id);

    return {
      success: true,
      message: 'Webhook endpoint deleted successfully',
    };
  }

  @Post('endpoints/:id/verify')
  @ApiOperation({ summary: 'Verify webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook endpoint verification initiated' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN)
  async verifyEndpoint(@Param('id') id: string) {
    const isVerified = await this.webhookService.verifyEndpoint(id);

    return {
      success: true,
      data: { verified: isVerified },
      message: isVerified 
        ? 'Webhook endpoint verified successfully'
        : 'Webhook endpoint verification failed',
    };
  }

  @Post('endpoints/:id/test')
  @ApiOperation({ summary: 'Test webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook test completed' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN)
  async testEndpoint(
    @Param('id') id: string,
    @Body() testDto: TestWebhookDto
  ) {
    const endpoint = await this.webhookService.getEndpointById(id);
    
    // Create a test webhook payload
    const testPayload = {
      event: testDto.event,
      data: testDto.testData || { test: true, timestamp: new Date() },
      context: {
        source: 'webhook_test',
        userId: testDto.userId,
      },
      metadata: {
        test: true,
        triggeredBy: 'manual_test',
      },
    };

    await this.webhookService.triggerEvent(testDto.event, testPayload);

    return {
      success: true,
      message: 'Webhook test initiated successfully',
    };
  }

  @Get('deliveries')
  @ApiOperation({ summary: 'List webhook deliveries' })
  @ApiResponse({ status: 200, description: 'Webhook deliveries retrieved successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN, Role.ORGANIZATION_MEMBER)
  async getDeliveries(
    @Query('endpointId') endpointId?: string,
    @Query('status') status?: string,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
    @CurrentUser() user?: any
  ) {
    // Implementation would filter deliveries based on user permissions
    // For now, return a placeholder response
    return {
      success: true,
      data: {
        deliveries: [],
        total: 0,
        limit: Number(limit),
        offset: Number(offset),
      },
      message: 'Webhook deliveries retrieved successfully',
    };
  }

  @Get('deliveries/:id')
  @ApiOperation({ summary: 'Get webhook delivery details' })
  @ApiResponse({ status: 200, description: 'Webhook delivery retrieved successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN, Role.ORGANIZATION_MEMBER)
  async getDelivery(@Param('id') id: string) {
    // Implementation would get delivery details
    // For now, return a placeholder response
    return {
      success: true,
      data: { id },
      message: 'Webhook delivery retrieved successfully',
    };
  }

  @Post('deliveries/:id/retry')
  @ApiOperation({ summary: 'Retry webhook delivery' })
  @ApiResponse({ status: 200, description: 'Webhook delivery retry initiated' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN)
  async retryDelivery(@Param('id') id: string) {
    const result = await this.webhookService.processDelivery(id);

    return {
      success: true,
      data: result,
      message: 'Webhook delivery retry completed',
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get webhook statistics' })
  @ApiResponse({ status: 200, description: 'Webhook statistics retrieved successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN)
  async getStats(
    @Query() queryDto: WebhookStatsQueryDto,
    @CurrentUser() user: any
  ) {
    if (queryDto.endpointId) {
      const stats = await this.webhookService.getEndpointStats(
        queryDto.endpointId,
        queryDto.days
      );
      return {
        success: true,
        data: stats,
        message: 'Endpoint statistics retrieved successfully',
      };
    } else {
      const stats = await this.webhookService.getSystemStats();
      return {
        success: true,
        data: stats,
        message: 'System statistics retrieved successfully',
      };
    }
  }

  @Get('events')
  @ApiOperation({ summary: 'List available webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook events retrieved successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER, Role.ORGANIZATION_ADMIN, Role.ORGANIZATION_MEMBER)
  async getAvailableEvents() {
    // Return list of available webhook events
    const events = [
      {
        event: 'user.created',
        description: 'Triggered when a new user is created',
        category: 'User Management',
      },
      {
        event: 'user.updated',
        description: 'Triggered when a user is updated',
        category: 'User Management',
      },
      {
        event: 'user.deleted',
        description: 'Triggered when a user is deleted',
        category: 'User Management',
      },
      {
        event: 'organization.created',
        description: 'Triggered when a new organization is created',
        category: 'Organization Management',
      },
      {
        event: 'course.created',
        description: 'Triggered when a new course is created',
        category: 'Learning Management',
      },
      {
        event: 'course.published',
        description: 'Triggered when a course is published',
        category: 'Learning Management',
      },
      {
        event: 'enrollment.created',
        description: 'Triggered when a user enrolls in a course',
        category: 'Learning Management',
      },
      {
        event: 'enrollment.completed',
        description: 'Triggered when a user completes a course',
        category: 'Learning Management',
      },
      {
        event: 'assessment.completed',
        description: 'Triggered when an assessment is completed',
        category: 'Assessment',
      },
      {
        event: 'interview.scheduled',
        description: 'Triggered when an interview is scheduled',
        category: 'Interview Management',
      },
      {
        event: 'interview.completed',
        description: 'Triggered when an interview is completed',
        category: 'Interview Management',
      },
      {
        event: 'job.created',
        description: 'Triggered when a new job is posted',
        category: 'HR/ATS',
      },
      {
        event: 'application.submitted',
        description: 'Triggered when a job application is submitted',
        category: 'HR/ATS',
      },
      {
        event: 'subscription.created',
        description: 'Triggered when a new subscription is created',
        category: 'Billing',
      },
      {
        event: 'payment.succeeded',
        description: 'Triggered when a payment succeeds',
        category: 'Billing',
      },
      {
        event: 'payment.failed',
        description: 'Triggered when a payment fails',
        category: 'Billing',
      },
      {
        event: 'certificate.issued',
        description: 'Triggered when a certificate is issued',
        category: 'Certification',
      },
    ];

    return {
      success: true,
      data: events,
      message: 'Available webhook events retrieved successfully',
    };
  }

  @Get('logs')
  @ApiOperation({ summary: 'Get webhook logs' })
  @ApiResponse({ status: 200, description: 'Webhook logs retrieved successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER)
  async getLogs(
    @Query('endpointId') endpointId?: string,
    @Query('level') level?: string,
    @Query('limit') limit = 100,
    @Query('offset') offset = 0
  ) {
    // Implementation would retrieve webhook logs
    // For now, return a placeholder response
    return {
      success: true,
      data: {
        logs: [],
        total: 0,
        limit: Number(limit),
        offset: Number(offset),
      },
      message: 'Webhook logs retrieved successfully',
    };
  }
}
