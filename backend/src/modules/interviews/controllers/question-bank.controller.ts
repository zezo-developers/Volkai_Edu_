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
import { UserRole } from '../../../database/entities/user.entity';
import { QuestionBankService } from '../services/question-bank.service';
import {
  CreateQuestionBankDto,
  UpdateQuestionBankDto,
  SearchQuestionBanksDto,
  CreateQuestionDto,
  UpdateQuestionDto,
  BulkImportQuestionsDto,
  QuestionBankResponseDto,
  QuestionBankListResponseDto,
  QuestionResponseDto,
  QuestionListResponseDto,
  QuestionBankStatsDto,
  QuestionSelectionDto,
  QuestionSelectionResponseDto,
} from '../dto/question-bank.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@ApiTags('Question Banks')
@Controller('interviews/question-banks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QuestionBankController {
  constructor(private readonly questionBankService: QuestionBankService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR, UserRole.CONTENT_CREATOR)
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Create a new question bank' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Question bank created successfully',
    type: QuestionBankResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiBody({ type: CreateQuestionBankDto })
  async createQuestionBank(
    @Body() createDto: CreateQuestionBankDto,
    @Request() req: any,
  ): Promise<QuestionBankResponseDto> {
    try {
      const questionBank = await this.questionBankService.createQuestionBank(createDto, req.user);
      return new QuestionBankResponseDto(questionBank);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create question bank',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Search question banks' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'difficulty', required: false, enum: ['easy', 'medium', 'hard', 'expert'] })
  @ApiQuery({ name: 'tags', required: false, type: [String] })
  @ApiQuery({ name: 'isPublic', required: false, type: Boolean })
  @ApiQuery({ name: 'createdBy', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Question banks retrieved successfully',
    type: QuestionBankListResponseDto,
  })
  async searchQuestionBanks(
    @Query() searchDto: SearchQuestionBanksDto,
    @Request() req: any,
  ): Promise<QuestionBankListResponseDto> {
    try {
      return await this.questionBankService.searchQuestionBanks(searchDto, req.user);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to search question banks',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get question bank by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Question bank retrieved successfully',
    type: QuestionBankResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Question bank not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  async getQuestionBank(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<QuestionBankResponseDto> {
    try {
      const questionBank = await this.questionBankService.getQuestionBankById(id, req.user);
      return new QuestionBankResponseDto(questionBank);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to retrieve question bank',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR, UserRole.CONTENT_CREATOR)
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Update question bank' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Question bank updated successfully',
    type: QuestionBankResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Question bank not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiBody({ type: UpdateQuestionBankDto })
  async updateQuestionBank(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateQuestionBankDto,
    @Request() req: any,
  ): Promise<QuestionBankResponseDto> {
    try {
      const questionBank = await this.questionBankService.updateQuestionBank(id, updateDto, req.user);
      return new QuestionBankResponseDto(questionBank);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update question bank',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR, UserRole.CONTENT_CREATOR)
  @ApiOperation({ summary: 'Delete question bank' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Question bank deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Question bank not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions or bank is in use',
  })
  async deleteQuestionBank(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    try {
      await this.questionBankService.deleteQuestionBank(id, req.user);
      return { message: 'Question bank deleted successfully' };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to delete question bank',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/clone')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR, UserRole.CONTENT_CREATOR)
  @ApiOperation({ summary: 'Clone question bank' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Question bank cloned successfully',
    type: QuestionBankResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Question bank not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async cloneQuestionBank(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('newName') newName: string,
    @Request() req: any,
  ): Promise<QuestionBankResponseDto> {
    try {
      const clonedBank = await this.questionBankService.cloneQuestionBank(id, newName, req.user);
      return new QuestionBankResponseDto(clonedBank);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to clone question bank',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/questions')
  @ApiOperation({ summary: 'Get questions from question bank' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Questions retrieved successfully',
    type: QuestionListResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Question bank not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  async getQuestionsByBank(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Request() req?: any,
  ): Promise<QuestionListResponseDto> {
    try {
      return await this.questionBankService.getQuestionsByBank(
        id,
        req.user,
        page || 1,
        limit || 50,
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get questions',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/questions')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR, UserRole.CONTENT_CREATOR)
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Add question to question bank' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Question added successfully',
    type: QuestionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid question data',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiBody({ type: CreateQuestionDto })
  async createQuestion(
    @Param('id', ParseUUIDPipe) bankId: string,
    @Body() createDto: CreateQuestionDto,
    @Request() req: any,
  ): Promise<QuestionResponseDto> {
    try {
      const question = await this.questionBankService.createQuestion(bankId, createDto, req.user);
      return new QuestionResponseDto(question);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create question',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/questions/bulk-import')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR, UserRole.CONTENT_CREATOR)
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Bulk import questions to question bank' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Questions imported successfully',
    schema: {
      type: 'object',
      properties: {
        imported: { type: 'number' },
        errors: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid import data',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiBody({ type: BulkImportQuestionsDto })
  async bulkImportQuestions(
    @Param('id', ParseUUIDPipe) bankId: string,
    @Body() importDto: BulkImportQuestionsDto,
    @Request() req: any,
  ): Promise<{ imported: number; errors: string[] }> {
    try {
      return await this.questionBankService.bulkImportQuestions(bankId, importDto, req.user);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to import questions',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('questions/:questionId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR, UserRole.CONTENT_CREATOR)
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Update question' })
  @ApiParam({ name: 'questionId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Question updated successfully',
    type: QuestionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Question not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiBody({ type: UpdateQuestionDto })
  async updateQuestion(
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() updateDto: UpdateQuestionDto,
    @Request() req: any,
  ): Promise<QuestionResponseDto> {
    try {
      const question = await this.questionBankService.updateQuestion(questionId, updateDto, req.user);
      return new QuestionResponseDto(question);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update question',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('questions/:questionId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR, UserRole.CONTENT_CREATOR)
  @ApiOperation({ summary: 'Delete question' })
  @ApiParam({ name: 'questionId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Question deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Question not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions or question is in use',
  })
  async deleteQuestion(
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    try {
      await this.questionBankService.deleteQuestion(questionId, req.user);
      return { message: 'Question deleted successfully' };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to delete question',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('questions/:questionId')
  @ApiOperation({ summary: 'Get question by ID' })
  @ApiParam({ name: 'questionId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Question retrieved successfully',
    type: QuestionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Question not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  async getQuestion(
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Request() req: any,
  ): Promise<QuestionResponseDto> {
    try {
      const question = await this.questionBankService.getQuestionById(questionId, req.user);
      return new QuestionResponseDto(question);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to retrieve question',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/select-questions')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Select questions from question bank for interview' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Questions selected successfully',
    type: QuestionSelectionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Question bank not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  @ApiBody({ type: QuestionSelectionDto })
  async selectQuestions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() selectionDto: QuestionSelectionDto,
    @Request() req: any,
  ): Promise<QuestionSelectionResponseDto> {
    try {
      const questionBank = await this.questionBankService.getQuestionBankById(id, req.user);
      
      // Get questions based on selection criteria
      const questions = await this.questionBankService.getQuestionsByBank(id, req.user, 1, 100);
      
      let selectedQuestions = questions.items;

      // Apply filters
      if (selectionDto.difficulty) {
        selectedQuestions = selectedQuestions.filter(q => q.difficulty === selectionDto.difficulty);
      }

      if (selectionDto.types && selectionDto.types.length > 0) {
        selectedQuestions = selectedQuestions.filter(q => selectionDto.types.includes(q.type));
      }

      if (selectionDto.tags && selectionDto.tags.length > 0) {
        selectedQuestions = selectedQuestions.filter(q => 
          selectionDto.tags.some(tag => q.tags.includes(tag))
        );
      }

      // Randomize if requested
      if (selectionDto.randomize) {
        selectedQuestions = selectedQuestions.sort(() => Math.random() - 0.5);
      }

      // Limit count
      const count = selectionDto.count || selectedQuestions.length;
      selectedQuestions = selectedQuestions.slice(0, count);

      const result = {
        questions: selectedQuestions,
        criteria: {
          questionBankId: id,
          count,
          difficulty: selectionDto.difficulty,
          types: selectionDto.types,
          tags: selectionDto.tags,
          randomized: selectionDto.randomize || false,
        },
        totalAvailable: questions.items.length,
        selectedAt: new Date(),
      };

      return new QuestionSelectionResponseDto(result);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to select questions',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Get question bank statistics' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Question bank statistics retrieved successfully',
    type: QuestionBankStatsDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Question bank not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  async getQuestionBankStats(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<QuestionBankStatsDto> {
    try {
      return await this.questionBankService.getQuestionBankStats(id, req.user);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get question bank statistics',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('public/featured')
  @ApiOperation({ summary: 'Get featured public question banks' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Featured question banks retrieved successfully',
    type: QuestionBankListResponseDto,
  })
  async getFeaturedQuestionBanks(
    @Query('limit') limit?: number,
  ): Promise<QuestionBankListResponseDto> {
    try {
      const searchDto = {
        isPublic: true,
        sortBy: 'statistics.totalUsage',
        sortOrder: 'DESC' as const,
        limit: limit || 10,
      };

      // Use a mock user for public access
      const mockUser = { role: UserRole.STUDENT } as any;
      return await this.questionBankService.searchQuestionBanks(searchDto, mockUser);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get featured question banks',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
