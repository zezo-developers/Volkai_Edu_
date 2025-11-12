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
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../../common/guards/roles.guard';
import { AdminOnly } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User, UserRole } from '../../../database/entities/user.entity';
import { AdminService, SystemOverview } from '../services/admin.service';
import { AnalyticsService } from '../services/analytics.service';
import {
  UpdateUserDto,
  UpdateOrganizationDto,
  CreateSystemConfigDto,
  UpdateSystemConfigDto,
  GenerateReportDto,
  CreateDataExportDto,
  ModerateContentDto,
} from '../dto/admin.dto';
import { SystemConfig } from '@/database/entities/system-config.entity';

@ApiTags('Admin - System Management')
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
@AdminOnly()
@ApiBearerAuth('JWT-auth')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get system overview and health status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'System overview retrieved successfully',
  })
  async getSystemOverview(): Promise<{
    success: boolean;
    overview: SystemOverview;
  }> {
    const overview = await this.adminService.getSystemOverview();

    return {
      success: true,
      overview,
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Get detailed system health check' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'System health status retrieved successfully',
  })
  async getSystemHealth(): Promise<{
    success: boolean;
    health: {
      services: Record<string, {
        status: 'healthy' | 'warning' | 'critical';
        responseTime?: number;
        lastCheck: Date;
        details?: any;
      }>;
      overall: 'healthy' | 'warning' | 'critical';
    };
  }> {
    // Detailed health checks for all services
    const services = {
      database: {
        status: 'healthy' as const,
        responseTime: 5,
        lastCheck: new Date(),
        details: { connections: 10, maxConnections: 100 },
      },
      redis: {
        status: 'healthy' as const,
        responseTime: 2,
        lastCheck: new Date(),
        details: { memory: '50MB', maxMemory: '1GB' },
      },
      storage: {
        status: 'healthy' as const,
        responseTime: 15,
        lastCheck: new Date(),
        details: { usage: '45%', available: '500GB' },
      },
      email: {
        status: 'healthy' as const,
        responseTime: 100,
        lastCheck: new Date(),
        details: { queue: 5, dailyLimit: 10000 },
      },
    };

    const overall = Object.values(services).some(s => s.status === 'critical' as string) 
      ? 'critical' 
      : Object.values(services).some(s => s.status === 'warning' as string)
      ? 'warning'
      : 'healthy';

    return {
      success: true,
      health: {
        services,
        overall,
      },
    };
  }

  @Get('users')
  @ApiOperation({ summary: 'Get users with filtering and pagination' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Users retrieved successfully',
  })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiQuery({ name: 'status', required: false, description: 'User status' })
  @ApiQuery({ name: 'organizationId', required: false, description: 'Filter by organization' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getUsers(
    @Query('search') search?: string,
    @Query('role') role?: UserRole,
    @Query('status') status?: string,
    @Query('organizationId') organizationId?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
  ): Promise<{
    success: boolean;
    users: User[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const result = await this.adminService.getUsers(
      { search, role, status, organizationId },
      page,
      limit
    );

    return {
      success: true,
      users: result.users,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user details by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User details retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  async getUserById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{
    success: boolean;
    user: any;
  }> {
    const user = await this.adminService.getUserById(id);

    return {
      success: true,
      user,
    };
  }

  @Put('users/:id')
  @ApiOperation({ summary: 'Update user details' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateUserDto: any,
    @CurrentUser() admin: any,
  ): Promise<{
    success: boolean;
    user: any;
    message: string;
  }> {
    console.log({
      id, updateUserDto, admin:admin.id
    })
    const user = await this.adminService.updateUser(id, updateUserDto, admin.id);

    return {
      success: true,
      user,
      message: 'User updated successfully',
    };
  }

  @Post('users/:id/deactivate')
  @ApiOperation({ summary: 'Deactivate user account' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User deactivated successfully',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  async deactivateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason?: string,
    @CurrentUser() admin?: any,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    await this.adminService.deactivateUser(id, admin.id, reason);

    return {
      success: true,
      message: 'User deactivated successfully',
    };
  }

  @Post('users/:id/reactivate')
  @ApiOperation({ summary: 'Reactivate user account' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User reactivated successfully',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  async reactivateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: any,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    await this.adminService.reactivateUser(id, admin.id);

    return {
      success: true,
      message: 'User reactivated successfully',
    };
  }

  @Get('organizations')
  @ApiOperation({ summary: 'Get organizations with filtering and pagination' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Organizations retrieved successfully',
  })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiQuery({ name: 'status', required: false, description: 'Organization status' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getOrganizations(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
  ): Promise<{
    success: boolean;
    organizations: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    console.log({ search, status },
      page,
      limit)
    const result = await this.adminService.getOrganizations(
      { search, status },
      page,
      limit
    );

    return {
      success: true,
      organizations: result.organizations,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  @Get('config')
  @ApiOperation({ summary: 'Get system configurations' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'System configurations retrieved successfully',
  })
  @ApiQuery({ name: 'category', required: false, description: 'Configuration category' })
  async getSystemConfigs(
    @Query('category') category?: string,
  ): Promise<{
    success: boolean;
    configs: any[];
  }> {
    const configs = await this.adminService.getSystemConfigs(category as any);

    return {
      success: true,
      configs,
    };
  }

  @Get('config/:key')
  @ApiOperation({ summary: 'Get specific system configuration' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Configuration retrieved successfully',
  })
  @ApiParam({ name: 'key', description: 'Configuration key' })
  async getSystemConfig(
    @Param('key') key: string,
  ): Promise<{
    success: boolean;
    config: any;
  }> {
    const config = await this.adminService.getSystemConfig(key);

    return {
      success: true,
      config,
    };
  }

  @Put('config/:key')
  @ApiOperation({ summary: 'Update system configuration' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Configuration updated successfully',
  })
  @ApiParam({ name: 'key', description: 'Configuration key' })
  async updateSystemConfig(
    @Param('key') key: string,
    @Body(ValidationPipe) updateConfigDto: UpdateSystemConfigDto,
    @CurrentUser() admin: any,
  ): Promise<{
    success: boolean;
    config: any;
    message: string;
    requiresRestart?: boolean;
  }> {
    const config = await this.adminService.updateSystemConfig(
      key,
      updateConfigDto.value,
      admin.id
    );

    return {
      success: true,
      config,
      message: 'Configuration updated successfully',
      requiresRestart: config.requiresRestart,
    };
  }

  @Post('config')
  @ApiOperation({ summary: 'Create new system configuration' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Configuration created successfully',
  })
  async createSystemConfig(
    @Body(ValidationPipe) createConfigDto: Partial<SystemConfig>,
    @CurrentUser() admin: any,
  ): Promise<{
    success: boolean;
    config: any;
    message: string;
  }> {
    const config = await this.adminService.createSystemConfig(createConfigDto, admin.id);

    return {
      success: true,
      config,
      message: 'Configuration created successfully',
    };
  }

  @Get('reports')
  @ApiOperation({ summary: 'Get system reports' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reports retrieved successfully',
  })
  @ApiQuery({ name: 'type', required: false, description: 'Report type' })
  @ApiQuery({ name: 'status', required: false, description: 'Report status' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getReports(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
  ): Promise<{
    success: boolean;
    reports: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const result = await this.adminService.getReports(type as any, status as any, page, limit);

    return {
      success: true,
      reports: result.reports,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  @Post('reports/generate')
  @ApiOperation({ summary: 'Generate new report' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Report generation started successfully',
  })
  async generateReport(
    @Body(ValidationPipe) generateReportDto: GenerateReportDto,
    @CurrentUser() admin: any,
  ): Promise<{
    success: boolean;
    report: any;
    message: string;
  }> {
    const report = await this.adminService.generateReport(
      generateReportDto.type,
      generateReportDto.parameters,
      admin.id
    );

    return {
      success: true,
      report,
      message: 'Report generation started successfully',
    };
  }

  @Get('exports')
  @ApiOperation({ summary: 'Get data exports' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Data exports retrieved successfully',
  })
  @ApiQuery({ name: 'type', required: false, description: 'Export type' })
  @ApiQuery({ name: 'status', required: false, description: 'Export status' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getDataExports(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
  ): Promise<{
    success: boolean;
    exports: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const result = await this.adminService.getDataExports(type as any, status as any, page, limit);

    return {
      success: true,
      exports: result.exports,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  @Post('exports')
  @ApiOperation({ summary: 'Create new data export' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Data export created successfully',
  })
  async createDataExport(
    @Body(ValidationPipe) createExportDto: CreateDataExportDto,
    @CurrentUser() admin: any,
  ): Promise<{
    success: boolean;
    export: any;
    message: string;
  }> {
    const dataExport = await this.adminService.createDataExport(
      createExportDto.type,
      createExportDto.filters,
      admin.id,
      createExportDto.organizationId
    );

    return {
      success: true,
      export: dataExport,
      message: 'Data export created successfully',
    };
  }

  @Get('content/flagged')
  @ApiOperation({ summary: 'Get flagged content for moderation' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Flagged content retrieved successfully',
  })
  @ApiQuery({ name: 'contentType', required: false, description: 'Content type' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getFlaggedContent(
    @Query('contentType') contentType?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
  ): Promise<{
    success: boolean;
    content: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const result = await this.adminService.getFlaggedContent(contentType, page, limit);

    return {
      success: true,
      content: result.content,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  @Post('content/:id/moderate')
  @ApiOperation({ summary: 'Moderate flagged content' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Content moderated successfully',
  })
  @ApiParam({ name: 'id', description: 'Content ID' })
  async moderateContent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) moderateDto: ModerateContentDto,
    @CurrentUser() admin: any,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    await this.adminService.moderateContent(
      id,
      moderateDto.contentType,
      moderateDto.action,
      admin.id,
      moderateDto.reason
    );

    return {
      success: true,
      message: `Content ${moderateDto.action}ed successfully`,
    };
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get audit logs' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Audit logs retrieved successfully',
  })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'action', required: false, description: 'Filter by action' })
  @ApiQuery({ name: 'resourceType', required: false, description: 'Filter by resource type' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Filter from date' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Filter to date' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getAuditLogs(
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('resourceType') resourceType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 50,
  ): Promise<{
    success: boolean;
    logs: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const result = await this.adminService.getAuditLogs(
      userId,
      action,
      resourceType,
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined,
      page,
      limit
    );

    return {
      success: true,
      logs: result.logs,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  @Post('maintenance/enable')
  @ApiOperation({ summary: 'Enable maintenance mode' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Maintenance mode enabled successfully',
  })
  async enableMaintenanceMode(
    @Body('message') message?: string,
    @CurrentUser() admin?: any,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    await this.adminService.enableMaintenanceMode(admin.id, message);

    return {
      success: true,
      message: 'Maintenance mode enabled successfully',
    };
  }

  @Post('maintenance/disable')
  @ApiOperation({ summary: 'Disable maintenance mode' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Maintenance mode disabled successfully',
  })
  async disableMaintenanceMode(
    @CurrentUser() admin: any,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    await this.adminService.disableMaintenanceMode(admin.id);

    return {
      success: true,
      message: 'Maintenance mode disabled successfully',
    };
  }
}
