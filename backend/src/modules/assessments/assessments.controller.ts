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
import { AssessmentService } from './services/assessment.service';
import {
  CreateAssessmentDto,
  UpdateAssessmentDto,
  SearchAssessmentsDto,
  StartAssessmentAttemptDto,
  SubmitAssessmentAttemptDto,
  AddQuestionDto,
  UpdateQuestionDto,
  AssessmentResponseDto,
  AssessmentAttemptResponseDto,
  AssessmentListResponseDto,
} from './dto/assessment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@ApiTags('Assessments')
@Controller('assessments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AssessmentsController {
  constructor(private readonly assessmentService: AssessmentService) {}

 @Post()
// @UseGuards(RolesGuard)
@UsePipes(new ValidationPipe({ transform: true }))
@ApiOperation({ summary: 'Create a new assessment' })
@ApiResponse({
  status: HttpStatus.CREATED,
  description: 'Assessment created successfully',
  type: AssessmentResponseDto,
})
@ApiResponse({
  status: HttpStatus.BAD_REQUEST,
  description: 'Invalid input data',
})
@ApiResponse({
  status: HttpStatus.FORBIDDEN,
  description: 'Insufficient permissions',
})
@ApiBody({
  description: 'Create Assessment Payload',
  type: CreateAssessmentDto,
  examples: {
    example1: {
      summary: 'Basic JavaScript Quiz',
      description: 'Example payload for creating a quiz assessment',
      value: {
        title: 'JavaScript Fundamentals Quiz',
        description: 'A short quiz to test basic understanding of JavaScript concepts.',
        type: 'QUIZ',
        courseId: 'c8f51a3d-9b13-4fd1-8e2c-23b1cb1de8f1',
        moduleId: 'a21d7b69-19fa-4d29-9b3e-56ce9e02b7a4',
        lessonId: 'b2e19c4c-7d82-47f1-91d0-97a4b29a1eab',
        questions: [
          {
            text: 'What is the output of typeof null in JavaScript?',
            options: [
              { text: '"object"', isCorrect: true },
              { text: '"null"', isCorrect: false },
              { text: '"undefined"', isCorrect: false },
              { text: '"number"', isCorrect: false }
            ],
            explanation: 'In JavaScript, typeof null returns "object" due to a legacy bug.'
          },
          {
            text: 'Which of the following is NOT a JavaScript data type?',
            options: [
              { text: 'String', isCorrect: false },
              { text: 'Boolean', isCorrect: false },
              { text: 'Float', isCorrect: true },
              { text: 'Object', isCorrect: false }
            ],
            explanation: 'JavaScript uses "Number" for all numeric types; "Float" is not a separate type.'
          }
        ],
        timeLimit: 30,
        maxAttempts: 3,
        passingScore: 70,
        shuffleQuestions: true,
        shuffleOptions: true,
        showResults: true,
        allowReview: false,
        instructions: 'You have 30 minutes to complete this quiz. Read each question carefully.',
        metadata: {
          difficulty: 'beginner',
          tags: ['javascript', 'fundamentals', 'quiz']
        }
      }
    }
  }
})
  async createAssessment(
    @Body() createAssessmentDto: any,
    @Request() req: any,
  ): Promise<AssessmentResponseDto> {
    try {
      const assessment = await this.assessmentService.createAssessment(
        createAssessmentDto,
        req.user,
      );
      return new AssessmentResponseDto(assessment);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create assessment',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get assessment by ID' })
  @ApiParam({
    name: 'id',
    description: 'Assessment ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Assessment retrieved successfully',
    type: AssessmentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Assessment not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  async getAssessment(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<AssessmentResponseDto> {
    try {
      const assessment = await this.assessmentService.getAssessmentById(
        id,
        req.user,
      );
      return new AssessmentResponseDto(assessment);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to retrieve assessment',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Search and list assessments' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'courseId', required: false, type: String })
  @ApiQuery({ name: 'moduleId', required: false, type: String })
  @ApiQuery({ name: 'lessonId', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, enum: ['quiz', 'assignment', 'exam'] })
  @ApiQuery({ name: 'status', required: false, enum: ['draft', 'published', 'archived'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Assessments retrieved successfully',
    type: AssessmentListResponseDto,
  })
  async searchAssessments(
    @Query() searchDto: any,
    @Request() req: any,
  ): Promise<AssessmentListResponseDto> {
    try {
      const result:any = await this.assessmentService.searchAssessments(
        searchDto,
        req.user,
      );
      return result;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to search assessments',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  // @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR, UserRole.CONTENT_CREATOR)
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Update assessment' })
  @ApiParam({
    name: 'id',
    description: 'Assessment ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Assessment updated successfully',
    type: AssessmentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Assessment not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiBody({ type: UpdateAssessmentDto })
  async updateAssessment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAssessmentDto: UpdateAssessmentDto,
    @Request() req: any,
  ): Promise<AssessmentResponseDto> {
    try {
      const assessment = await this.assessmentService.updateAssessment(
        id,
        updateAssessmentDto,
        req.user,
      );
      return new AssessmentResponseDto(assessment);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update assessment',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  //@UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR, UserRole.CONTENT_CREATOR)
  @ApiOperation({ summary: 'Delete assessment' })
  @ApiParam({
    name: 'id',
    description: 'Assessment ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Assessment deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Assessment not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async deleteAssessment(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    try {
      await this.assessmentService.deleteAssessment(id, req.user);
      return { message: 'Assessment deleted successfully' };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to delete assessment',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/publish')
  //@UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR, UserRole.CONTENT_CREATOR)
  @ApiOperation({ summary: 'Publish assessment' })
  @ApiParam({
    name: 'id',
    description: 'Assessment ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Assessment published successfully',
    type: AssessmentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Assessment not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async publishAssessment(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<AssessmentResponseDto> {
    try {
      const assessment = await this.assessmentService.publishAssessment(
        id,
        req.user,
      );
      return new AssessmentResponseDto(assessment);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to publish assessment',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/questions')
  //@UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR, UserRole.CONTENT_CREATOR)
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Add question to assessment' })
  @ApiParam({
    name: 'id',
    description: 'Assessment ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Question added successfully',
    type: AssessmentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Assessment not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiBody({ type: AddQuestionDto })
  async addQuestion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() addQuestionDto: AddQuestionDto,
    @Request() req: any,
  ): Promise<AssessmentResponseDto> {
    try {
      const assessment = await this.assessmentService.addQuestion(
        id,
      addQuestionDto as any,
        req.user,
      );
      return new AssessmentResponseDto(assessment);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to add question',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id/questions/:questionIndex')
  //@UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR, UserRole.CONTENT_CREATOR)
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Update question in assessment' })
  @ApiParam({
    name: 'id',
    description: 'Assessment ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'questionIndex',
    description: 'Question index',
    type: 'number',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Question updated successfully',
    type: AssessmentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Assessment or question not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiBody({ type: UpdateQuestionDto })
  async updateQuestion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('questionIndex') questionIndex: number,
    @Body() updateQuestionDto: UpdateQuestionDto,
    @Request() req: any,
  ): Promise<AssessmentResponseDto> {
    try {
      const assessment = await this.assessmentService.updateQuestion(
        id,
        questionIndex.toString(),
        updateQuestionDto as any,
        req.user,
      );
      return new AssessmentResponseDto(assessment);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update question',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id/questions/:questionIndex')
  //@UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR, UserRole.CONTENT_CREATOR)
  @ApiOperation({ summary: 'Remove question from assessment' })
  @ApiParam({
    name: 'id',
    description: 'Assessment ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'questionIndex',
    description: 'Question index',
    type: 'number',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Question removed successfully',
    type: AssessmentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Assessment or question not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async removeQuestion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('questionIndex') questionIndex: number,
    @Request() req: any,
  ): Promise<AssessmentResponseDto> {
    try {
      const assessment = await this.assessmentService.removeQuestion(
        id,
        questionIndex.toString(),
        req.user,
      );
      return new AssessmentResponseDto(assessment);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to remove question',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/attempts')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Start assessment attempt' })
  @ApiParam({
    name: 'id',
    description: 'Assessment ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Assessment attempt started successfully',
    type: AssessmentAttemptResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Assessment not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied or attempt limit exceeded',
  })
  @ApiBody({ type: StartAssessmentAttemptDto })
  async startAssessmentAttempt(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() startAttemptDto: StartAssessmentAttemptDto,
    @Request() req: any,
  ): Promise<AssessmentAttemptResponseDto> {
    try {
      const attempt = await this.assessmentService.startAssessmentAttempt(
        id,
        req.user.id,
        startAttemptDto as any,
      );
      return new AssessmentAttemptResponseDto(attempt);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to start assessment attempt',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('attempts/:attemptId/submit')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Submit assessment attempt' })
  @ApiParam({
    name: 'attemptId',
    description: 'Assessment attempt ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Assessment attempt submitted successfully',
    type: AssessmentAttemptResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Assessment attempt not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied or attempt already submitted',
  })
  @ApiBody({ type: SubmitAssessmentAttemptDto })
  async submitAssessmentAttempt(
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @Body() submitAttemptDto: SubmitAssessmentAttemptDto,
    @Request() req: any,
  ): Promise<AssessmentAttemptResponseDto> {
    try {
      const attempt = await this.assessmentService.submitAssessmentAttempt(
        attemptId,
        req.user.id,
        submitAttemptDto as any,
      );
      return new AssessmentAttemptResponseDto(attempt);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to submit assessment attempt',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('attempts/:attemptId')
  @ApiOperation({ summary: 'Get assessment attempt by ID' })
  @ApiParam({
    name: 'attemptId',
    description: 'Assessment attempt ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Assessment attempt retrieved successfully',
    type: AssessmentAttemptResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Assessment attempt not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  async getAssessmentAttempt(
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @Request() req: any,
  ): Promise<AssessmentAttemptResponseDto> {
    try {
      const attempt = await this.assessmentService.getAssessmentAttempt(
        attemptId,
        req.user,
      );
      return new AssessmentAttemptResponseDto(attempt);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to retrieve assessment attempt',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/attempts')
  @ApiOperation({ summary: 'Get user assessment attempts' })
  @ApiParam({
    name: 'id',
    description: 'Assessment ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Assessment attempts retrieved successfully',
    type: [AssessmentAttemptResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Assessment not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  async getUserAssessmentAttempts(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('userId') userId?: string,
    @Request() req?: any,
  ): Promise<AssessmentAttemptResponseDto[]> {
    try {
      const targetUserId = userId || req.user.id;
      const attempts = await this.assessmentService.getUserAssessmentAttempts(
        id,
        targetUserId,
      );
      return attempts.map(attempt => new AssessmentAttemptResponseDto(attempt));
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to retrieve assessment attempts',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('attempts/:attemptId/flag')
  //@UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Flag assessment attempt for review' })
  @ApiParam({
    name: 'attemptId',
    description: 'Assessment attempt ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Assessment attempt flagged successfully',
    type: AssessmentAttemptResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Assessment attempt not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async flagAttemptForReview(
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @Body('reason') reason: string,
    @Request() req: any,
  ): Promise<AssessmentAttemptResponseDto> {
    try {
      const attempt = await this.assessmentService.flagAttemptForReview(
        attemptId,
        reason,
        req.user,
      );
      return new AssessmentAttemptResponseDto(attempt);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to flag assessment attempt',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
