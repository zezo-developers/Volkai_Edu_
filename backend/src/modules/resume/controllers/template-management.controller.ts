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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User, UserRole } from '../../../database/entities/user.entity';
import { TemplateManagementService } from '../services/template-management.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  SearchTemplatesDto,
  TemplateResponseDto,
  TemplateListResponseDto,
  CloneTemplateDto,
  TemplateStatsDto,
} from '../dto/template-management.dto';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';

@ApiTags('Resume Templates')
@Controller('resume/templates')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TemplateManagementController {
  constructor(
    private readonly templateService: TemplateManagementService,
  ) {}

  @Post()
  // @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Create a new resume template' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Template created successfully',
    type: TemplateResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid template data',
  })
  async createTemplate(
    @Body(ValidationPipe) createDto: CreateTemplateDto,
    @CurrentUser() user: any,
  ): Promise<TemplateResponseDto> {
    const template = await this.templateService.createTemplate(createDto, user);
    return new TemplateResponseDto(template);
  }

  @Get()
  @ApiOperation({ summary: 'Search and list resume templates' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Templates retrieved successfully',
    type: TemplateListResponseDto,
  })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'isPremium', required: false, description: 'Filter by premium status' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  async searchTemplates(
    @Query(ValidationPipe) searchDto: SearchTemplatesDto,
    @CurrentUser() user: any,
  ): Promise<TemplateListResponseDto> {
    return await this.templateService.searchTemplates(searchDto, user);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured templates' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Featured templates retrieved successfully',
    type: [TemplateResponseDto],
  })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of templates to return' })
  async getFeaturedTemplates(
    @Query('limit') limit?: number,
  ): Promise<TemplateResponseDto[]> {
    const templates = await this.templateService.getFeaturedTemplates(limit);
    return templates.map(template => new TemplateResponseDto(template));
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular templates' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Popular templates retrieved successfully',
    type: [TemplateResponseDto],
  })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of templates to return' })
  async getPopularTemplates(
    @Query('limit') limit?: number,
  ): Promise<TemplateResponseDto[]> {
    const templates = await this.templateService.getPopularTemplates(limit);
    return templates.map(template => new TemplateResponseDto(template));
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending templates' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trending templates retrieved successfully',
    type: [TemplateResponseDto],
  })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of templates to return' })
  async getTrendingTemplates(
    @Query('limit') limit?: number,
  ): Promise<TemplateResponseDto[]> {
    const templates = await this.templateService.getTrendingTemplates(limit);
    return templates.map(template => new TemplateResponseDto(template));
  }

  @Get('category/:category')
  @ApiOperation({ summary: 'Get templates by category' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Templates by category retrieved successfully',
    type: [TemplateResponseDto],
  })
  @ApiParam({ name: 'category', description: 'Template category' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of templates to return' })
  async getTemplatesByCategory(
    @Param('category') category: string,
    @Query('limit') limit?: number,
  ): Promise<TemplateResponseDto[]> {
    const templates = await this.templateService.getTemplatesByCategory(category as any, limit);
    return templates.map(template => new TemplateResponseDto(template));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get template by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template retrieved successfully',
    type: TemplateResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Template not found',
  })
  @ApiParam({ name: 'id', description: 'Template ID' })
  async getTemplateById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ): Promise<TemplateResponseDto> {
    const template = await this.templateService.getTemplateById(id, user);
    return new TemplateResponseDto(template);
  }

  @Put(':id')
  // @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Update template' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template updated successfully',
    type: TemplateResponseDto,
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
  async updateTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateDto: UpdateTemplateDto,
    @CurrentUser() user: any,
  ): Promise<TemplateResponseDto> {
    const template = await this.templateService.updateTemplate(id, updateDto, user);
    return new TemplateResponseDto(template);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Delete template' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
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
  ): Promise<void> {
    await this.templateService.deleteTemplate(id, user);
  }

  @Post(':id/clone')
  @ApiOperation({ summary: 'Clone template' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Template cloned successfully',
    type: TemplateResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Template not found',
  })
  @ApiParam({ name: 'id', description: 'Template ID to clone' })
  async cloneTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) cloneDto: CloneTemplateDto,
    @CurrentUser() user: any,
  ): Promise<TemplateResponseDto> {
    const template = await this.templateService.cloneTemplate(id, cloneDto, user);
    return new TemplateResponseDto(template);
  }

  @Post(':id/rate')
  @ApiOperation({ summary: 'Rate template' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template rated successfully',
    type: TemplateResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Template not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid rating value',
  })
  @ApiParam({ name: 'id', description: 'Template ID' })
  async rateTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('rating') rating: number,
    @CurrentUser() user: any,
  ): Promise<TemplateResponseDto> {
    const template = await this.templateService.rateTemplate(id, rating, user);
    return new TemplateResponseDto(template);
  }

  @Get(':id/stats')
  // @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Get template statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template statistics retrieved successfully',
    type: TemplateStatsDto,
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
  async getTemplateStats(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ): Promise<TemplateStatsDto> {
    return await this.templateService.getTemplateStats(id, user);
  }

  @Post(':id/download')
  @ApiOperation({ summary: 'Record template download' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Download recorded successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Template not found',
  })
  @ApiParam({ name: 'id', description: 'Template ID' })
  async recordDownload(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ): Promise<{ success: boolean }> {
    const template = await this.templateService.getTemplateById(id, user);
    template.incrementDownload();
    // This would typically be handled by the service
    return { success: true };
  }

  @Get(':id/preview')
  @ApiOperation({ summary: 'Get template preview data' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template preview retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Template not found',
  })
  @ApiParam({ name: 'id', description: 'Template ID' })
  async getTemplatePreview(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ): Promise<any> {
    const template = await this.templateService.getTemplateById(id, user);
    return template.generatePreview();
  }

  @Get(':id/compatibility')
  @ApiOperation({ summary: 'Get template compatibility information' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template compatibility info retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Template not found',
  })
  @ApiParam({ name: 'id', description: 'Template ID' })
  async getTemplateCompatibility(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ): Promise<any> {
    const template = await this.templateService.getTemplateById(id, user);
    return template.getCompatibilityInfo();
  }
}
