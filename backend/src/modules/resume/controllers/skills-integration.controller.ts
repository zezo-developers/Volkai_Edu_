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
import { SkillsIntegrationService } from '../services/skills-integration.service';
import {
  CreateSkillDto,
  UpdateSkillDto,
  CreateUserSkillDto,
  UpdateUserSkillDto,
  SearchSkillsDto,
  SkillResponseDto,
  SkillListResponseDto,
  UserSkillResponseDto,
  UserSkillListResponseDto,
  SkillRecommendationDto,
  SkillVerificationDto,
  EndorseSkillDto,
} from '../dto/skills-integration.dto';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@ApiTags('Skills Integration')
@Controller('resume/skills')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SkillsIntegrationController {
  constructor(
    private readonly skillsService: SkillsIntegrationService,
  ) {}

  // Skill Category Management
  @Get('categories')
  @ApiOperation({ summary: 'Get all skill categories' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Skill categories retrieved successfully',
  })
  async getSkillCategories(): Promise<any[]> {
    const categories = await this.skillsService.getSkillCategories();
    return categories.map(category => ({
      id: category.id,
      name: category.name,
      description: category.description,
      icon: category.icon,
      color: category.color,
      displayOrder: category.displayOrder,
      skillCount: category.skillCount,
      isPopular: category.isPopular,
      isTrending: category.isTrending,
    }));
  }

  @Post('categories')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Create a new skill category' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Skill category created successfully',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async createSkillCategory(
    @Body('name') name: string,
    @Body('description') description?: string,
    @CurrentUser() user?: User,
  ): Promise<any> {
    const category = await this.skillsService.createSkillCategory(name, description, user);
    return {
      id: category.id,
      name: category.name,
      description: category.description,
      displayOrder: category.displayOrder,
    };
  }

  // Skill Management
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Create a new skill' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Skill created successfully',
    type: SkillResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Skill already exists',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async createSkill(
    @Body(ValidationPipe) createDto: CreateSkillDto,
    @CurrentUser() user: User,
  ): Promise<SkillResponseDto> {
    const skill = await this.skillsService.createSkill(createDto, user);
    return new SkillResponseDto(skill);
  }

  @Get()
  @ApiOperation({ summary: 'Search and list skills' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Skills retrieved successfully',
    type: SkillListResponseDto,
  })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiQuery({ name: 'categoryId', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'isVerified', required: false, description: 'Filter by verified status' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  async searchSkills(
    @Query(ValidationPipe) searchDto: SearchSkillsDto,
  ): Promise<SkillListResponseDto> {
    return await this.skillsService.searchSkills(searchDto);
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular skills' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Popular skills retrieved successfully',
    type: [SkillResponseDto],
  })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of skills to return' })
  async getPopularSkills(
    @Query('limit') limit?: number,
  ): Promise<SkillResponseDto[]> {
    const skills = await this.skillsService.getPopularSkills(limit);
    return skills.map(skill => new SkillResponseDto(skill));
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending skills' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trending skills retrieved successfully',
    type: [SkillResponseDto],
  })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of skills to return' })
  async getTrendingSkills(
    @Query('limit') limit?: number,
  ): Promise<SkillResponseDto[]> {
    const skills = await this.skillsService.getTrendingSkills(limit);
    return skills.map(skill => new SkillResponseDto(skill));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get skill by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Skill retrieved successfully',
    type: SkillResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Skill not found',
  })
  @ApiParam({ name: 'id', description: 'Skill ID' })
  async getSkillById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SkillResponseDto> {
    const skill = await this.skillsService.getSkillById(id);
    return new SkillResponseDto(skill);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Update skill' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Skill updated successfully',
    type: SkillResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Skill not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiParam({ name: 'id', description: 'Skill ID' })
  async updateSkill(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateDto: UpdateSkillDto,
    @CurrentUser() user: User,
  ): Promise<SkillResponseDto> {
    const skill = await this.skillsService.updateSkill(id, updateDto, user);
    return new SkillResponseDto(skill);
  }

  // User Skill Management
  @Post('user-skills')
  @ApiOperation({ summary: 'Add skill to user profile' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User skill added successfully',
    type: UserSkillResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'User already has this skill',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Skill not found',
  })
  async addUserSkill(
    @Body(ValidationPipe) createDto: CreateUserSkillDto,
    @CurrentUser() user: User,
  ): Promise<UserSkillResponseDto> {
    const userSkill = await this.skillsService.addUserSkill(createDto, user);
    return new UserSkillResponseDto(userSkill);
  }

  @Get('user-skills/my')
  @ApiOperation({ summary: 'Get current user skills' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User skills retrieved successfully',
    type: UserSkillListResponseDto,
  })
  @ApiQuery({ name: 'featured', required: false, description: 'Filter by featured status' })
  async getMySkills(
    @Query('featured') featured?: boolean,
    @CurrentUser() user?: User,
  ): Promise<UserSkillListResponseDto> {
    return await this.skillsService.getUserSkills(user.id, user, featured);
  }

  @Get('user-skills/user/:userId')
  @ApiOperation({ summary: 'Get user skills by user ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User skills retrieved successfully',
    type: UserSkillListResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Cannot access other user skills',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'featured', required: false, description: 'Filter by featured status' })
  async getUserSkills(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('featured') featured?: boolean,
    @CurrentUser() user?: User,
  ): Promise<UserSkillListResponseDto> {
    return await this.skillsService.getUserSkills(userId, user, featured);
  }

  @Put('user-skills/:id')
  @ApiOperation({ summary: 'Update user skill' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User skill updated successfully',
    type: UserSkillResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User skill not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Cannot update other user skills',
  })
  @ApiParam({ name: 'id', description: 'User skill ID' })
  async updateUserSkill(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateDto: UpdateUserSkillDto,
    @CurrentUser() user: User,
  ): Promise<UserSkillResponseDto> {
    const userSkill = await this.skillsService.updateUserSkill(id, updateDto, user);
    return new UserSkillResponseDto(userSkill);
  }

  @Delete('user-skills/:id')
  @ApiOperation({ summary: 'Remove user skill' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'User skill removed successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User skill not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Cannot remove other user skills',
  })
  @ApiParam({ name: 'id', description: 'User skill ID' })
  async removeUserSkill(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.skillsService.removeUserSkill(id, user);
  }

  // Skill Verification
  @Post('user-skills/:id/verify')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Verify user skill' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User skill verified successfully',
    type: UserSkillResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User skill not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions to verify skills',
  })
  @ApiParam({ name: 'id', description: 'User skill ID' })
  async verifyUserSkill(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) verificationDto: SkillVerificationDto,
    @CurrentUser() user: User,
  ): Promise<UserSkillResponseDto> {
    const userSkill = await this.skillsService.verifyUserSkill(id, verificationDto, user);
    return new UserSkillResponseDto(userSkill);
  }

  // Skill Endorsements
  @Post('user-skills/:id/endorse')
  @ApiOperation({ summary: 'Endorse user skill' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User skill endorsed successfully',
    type: UserSkillResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User skill not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot endorse your own skills',
  })
  @ApiParam({ name: 'id', description: 'User skill ID' })
  async endorseUserSkill(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) endorseDto: EndorseSkillDto,
    @CurrentUser() user: User,
  ): Promise<UserSkillResponseDto> {
    const userSkill = await this.skillsService.endorseUserSkill(id, endorseDto, user);
    return new UserSkillResponseDto(userSkill);
  }

  @Delete('user-skills/:id/endorse')
  @ApiOperation({ summary: 'Remove skill endorsement' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Endorsement removed successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User skill not found',
  })
  @ApiParam({ name: 'id', description: 'User skill ID' })
  async removeEndorsement(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    const userSkill = await this.skillsService.updateUserSkill(
      id,
      { endorsements: [] }, // This would need proper implementation
      user,
    );
  }

  // Skill Recommendations
  @Get('recommendations/my')
  @ApiOperation({ summary: 'Get skill recommendations for current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Skill recommendations retrieved successfully',
    type: [SkillRecommendationDto],
  })
  async getMySkillRecommendations(
    @CurrentUser() user: User,
  ): Promise<SkillRecommendationDto[]> {
    return await this.skillsService.getSkillRecommendations(user.id, user);
  }

  @Get('recommendations/user/:userId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get skill recommendations for specific user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Skill recommendations retrieved successfully',
    type: [SkillRecommendationDto],
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Cannot access other user recommendations',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async getUserSkillRecommendations(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: User,
  ): Promise<SkillRecommendationDto[]> {
    return await this.skillsService.getSkillRecommendations(userId, user);
  }

  // Skill Sync with LMS
  @Post('sync/course-completion')
  @ApiOperation({ summary: 'Sync skills from course completion' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Skills synced successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid course or skill data',
  })
  async syncSkillsFromCourseCompletion(
    @Body('courseId') courseId: string,
    @Body('skillIds') skillIds: string[],
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; syncedSkills: number }> {
    await this.skillsService.syncSkillsFromCourseCompletion(user.id, courseId, skillIds);
    
    return {
      success: true,
      syncedSkills: skillIds.length,
    };
  }

  // Skill Analytics
  @Get('analytics/overview')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Get skill analytics overview' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Skill analytics retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiQuery({ name: 'organizationId', required: false, description: 'Filter by organization' })
  async getSkillAnalytics(
    @Query('organizationId') organizationId?: string,
    @CurrentUser() user?: User,
  ): Promise<any> {
    return await this.skillsService.getSkillAnalytics(organizationId, user);
  }

  @Get('user-skills/:id/recommendations')
  @ApiOperation({ summary: 'Get recommendations for improving a specific skill' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Skill improvement recommendations retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User skill not found',
  })
  @ApiParam({ name: 'id', description: 'User skill ID' })
  async getSkillImprovementRecommendations(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<string[]> {
    // This would get the user skill and generate recommendations
    // For now, return mock recommendations
    return [
      'Complete an advanced course in this skill',
      'Work on a project that uses this skill extensively',
      'Get certified in this skill',
      'Find a mentor who is expert in this skill',
      'Practice this skill regularly',
    ];
  }

  @Post('user-skills/:id/practice')
  @ApiOperation({ summary: 'Record skill practice session' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Practice session recorded successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User skill not found',
  })
  @ApiParam({ name: 'id', description: 'User skill ID' })
  async recordPracticeSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('hours') hours: number,
    @Body('description') description?: string,
    @CurrentUser() user?: User,
  ): Promise<{ success: boolean; totalPracticeHours: number }> {
    // This would update the user skill with practice data
    // For now, return mock response
    return {
      success: true,
      totalPracticeHours: hours + 50, // Mock total
    };
  }
}
