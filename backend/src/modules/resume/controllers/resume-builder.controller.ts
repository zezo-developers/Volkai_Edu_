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
import { ResumeBuilderService } from '../services/resume-builder.service';
import {
  CreateResumeDto,
  UpdateResumeDto,
  SearchResumesDto,
  ResumeResponseDto,
  ResumeListResponseDto,
  UpdateSectionDto,
  ReorderSectionsDto,
  ShareResumeDto,
  ResumeAnalyticsDto,
} from '../dto/resume-builder.dto';

@ApiTags('Resume Builder')
@Controller('resume/builder')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ResumeBuilderController {
  constructor(
    private readonly resumeService: ResumeBuilderService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new resume' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Resume created successfully',
    type: ResumeResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid resume data',
  })
  async createResume(
    @Body(ValidationPipe) createDto: CreateResumeDto,
    @CurrentUser() user: User,
  ): Promise<ResumeResponseDto> {
    const resume = await this.resumeService.createResume(createDto, user);
    return new ResumeResponseDto(resume);
  }

  @Get()
  @ApiOperation({ summary: 'Search and list resumes' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resumes retrieved successfully',
    type: ResumeListResponseDto,
  })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'templateId', required: false, description: 'Filter by template ID' })
  @ApiQuery({ name: 'visibility', required: false, description: 'Filter by visibility' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  async searchResumes(
    @Query(ValidationPipe) searchDto: SearchResumesDto,
    @CurrentUser() user: User,
  ): Promise<ResumeListResponseDto> {
    return await this.resumeService.searchResumes(searchDto, user);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get current user resumes' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User resumes retrieved successfully',
    type: ResumeListResponseDto,
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  async getMyResumes(
    @Query(ValidationPipe) searchDto: SearchResumesDto,
    @CurrentUser() user: User,
  ): Promise<ResumeListResponseDto> {
    const mySearchDto = { ...searchDto, userId: user.id };
    return await this.resumeService.searchResumes(mySearchDto, user);
  }

  @Get('primary')
  @ApiOperation({ summary: 'Get user primary resume' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Primary resume retrieved successfully',
    type: ResumeResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No primary resume found',
  })
  async getPrimaryResume(
    @CurrentUser() user: User,
  ): Promise<ResumeResponseDto> {
    const searchDto = { userId: user.id, isPrimary: true, limit: 1 };
    const result = await this.resumeService.searchResumes(searchDto, user);
    
    if (result.items.length === 0) {
      throw new Error('No primary resume found');
    }
    
    return result.items[0];
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get resume by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resume retrieved successfully',
    type: ResumeResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Resume not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  @ApiParam({ name: 'id', description: 'Resume ID' })
  async getResumeById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<ResumeResponseDto> {
    const resume = await this.resumeService.getResumeById(id, user);
    return new ResumeResponseDto(resume);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update resume' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resume updated successfully',
    type: ResumeResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Resume not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiParam({ name: 'id', description: 'Resume ID' })
  async updateResume(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateDto: UpdateResumeDto,
    @CurrentUser() user: User,
  ): Promise<ResumeResponseDto> {
    const resume = await this.resumeService.updateResume(id, updateDto, user);
    return new ResumeResponseDto(resume);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete resume' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Resume deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Resume not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete primary resume',
  })
  @ApiParam({ name: 'id', description: 'Resume ID' })
  async deleteResume(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.resumeService.deleteResume(id, user);
  }

  @Post(':id/clone')
  @ApiOperation({ summary: 'Clone resume' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Resume cloned successfully',
    type: ResumeResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Resume not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  @ApiParam({ name: 'id', description: 'Resume ID to clone' })
  async cloneResume(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('title') newTitle: string,
    @CurrentUser() user: User,
  ): Promise<ResumeResponseDto> {
    const resume = await this.resumeService.cloneResume(id, newTitle, user);
    return new ResumeResponseDto(resume);
  }

  @Post(':id/share')
  @ApiOperation({ summary: 'Share resume' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resume shared successfully',
    schema: {
      type: 'object',
      properties: {
        shareToken: { type: 'string' },
        shareUrl: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Resume not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only resume owner can share',
  })
  @ApiParam({ name: 'id', description: 'Resume ID' })
  async shareResume(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) shareDto: ShareResumeDto,
    @CurrentUser() user: User,
  ): Promise<{ shareToken: string; shareUrl: string }> {
    return await this.resumeService.shareResume(id, shareDto, user);
  }

  @Delete(':id/share')
  @ApiOperation({ summary: 'Revoke resume share' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Resume share revoked successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Resume not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only resume owner can revoke share',
  })
  @ApiParam({ name: 'id', description: 'Resume ID' })
  async revokeShare(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.resumeService.revokeShare(id, user);
  }

  @Put(':id/primary')
  @ApiOperation({ summary: 'Set resume as primary' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resume set as primary successfully',
    type: ResumeResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Resume not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiParam({ name: 'id', description: 'Resume ID' })
  async setPrimaryResume(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<ResumeResponseDto> {
    const updateDto = { isPrimary: true };
    const resume = await this.resumeService.updateResume(id, updateDto, user);
    return new ResumeResponseDto(resume);
  }

  @Put(':resumeId/sections/:sectionId')
  @ApiOperation({ summary: 'Update resume section' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Section updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Resume or section not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiParam({ name: 'sectionId', description: 'Section ID' })
  async updateSection(
    @Param('resumeId', ParseUUIDPipe) resumeId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body(ValidationPipe) updateDto: UpdateSectionDto,
    @CurrentUser() user: User,
  ): Promise<any> {
    const section = await this.resumeService.updateSection(resumeId, sectionId, updateDto, user);
    return {
      id: section.id,
      type: section.type,
      title: section.title,
      content: section.content,
      orderIndex: section.orderIndex,
      isVisible: section.isVisible,
      styling: section.styling,
      config: section.config,
    };
  }

  @Put(':id/sections/reorder')
  @ApiOperation({ summary: 'Reorder resume sections' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Sections reordered successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Resume not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiParam({ name: 'id', description: 'Resume ID' })
  async reorderSections(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) reorderDto: ReorderSectionsDto,
    @CurrentUser() user: User,
  ): Promise<any[]> {
    const sections = await this.resumeService.reorderSections(id, reorderDto, user);
    return sections.map(section => ({
      id: section.id,
      type: section.type,
      title: section.title,
      orderIndex: section.orderIndex,
      isVisible: section.isVisible,
    }));
  }

  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get resume analytics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resume analytics retrieved successfully',
    type: ResumeAnalyticsDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Resume not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiParam({ name: 'id', description: 'Resume ID' })
  async getResumeAnalytics(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<ResumeAnalyticsDto> {
    return await this.resumeService.getResumeAnalytics(id, user);
  }

  @Post(':id/validate')
  @ApiOperation({ summary: 'Validate resume data' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resume validation completed',
    schema: {
      type: 'object',
      properties: {
        isValid: { type: 'boolean' },
        errors: { type: 'array', items: { type: 'string' } },
        warnings: { type: 'array', items: { type: 'string' } },
        completionPercentage: { type: 'number' },
        atsScore: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Resume not found',
  })
  @ApiParam({ name: 'id', description: 'Resume ID' })
  async validateResume(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<any> {
    const resume = await this.resumeService.getResumeById(id, user);
    const validation = resume.validate();
    
    return {
      isValid: validation.isValid,
      errors: validation.errors,
      warnings: [], // Could be implemented
      completionPercentage: resume.completionPercentage,
      atsScore: resume.estimatedAtsScore,
    };
  }

  @Get(':id/recommendations')
  @ApiOperation({ summary: 'Get resume improvement recommendations' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recommendations retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        recommendations: { type: 'array', items: { type: 'string' } },
        priority: { type: 'string' },
        category: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Resume not found',
  })
  @ApiParam({ name: 'id', description: 'Resume ID' })
  async getRecommendations(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<any> {
    const analytics = await this.resumeService.getResumeAnalytics(id, user);
    
    return {
      recommendations: analytics.recommendations,
      priority: 'medium', // Could be calculated
      category: 'improvement',
    };
  }

  @Post(':id/auto-save')
  @ApiOperation({ summary: 'Auto-save resume changes' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resume auto-saved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Resume not found',
  })
  @ApiParam({ name: 'id', description: 'Resume ID' })
  async autoSaveResume(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateDto: UpdateResumeDto,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; lastSaved: Date }> {
    const autoSaveDto = { ...updateDto, isAutoSave: true };
    const resume = await this.resumeService.updateResume(id, autoSaveDto, user);
    
    return {
      success: true,
      lastSaved: resume.updatedAt,
    };
  }

  @Get('shared/:token')
  @ApiOperation({ summary: 'Get resume by share token (public access)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Shared resume retrieved successfully',
    type: ResumeResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Resume not found or share link expired',
  })
  @ApiParam({ name: 'token', description: 'Share token' })
  async getSharedResume(
    @Param('token') token: string,
  ): Promise<ResumeResponseDto> {
    const resume = await this.resumeService.getResumeByShareToken(token);
    return new ResumeResponseDto(resume);
  }
}
