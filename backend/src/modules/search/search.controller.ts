import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  ValidationPipe,
  UsePipes,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';

import { UserRole } from '../../database/entities/user.entity';
import { SearchService } from './services/search.service';
import {
  SearchCoursesDto,
  SearchContentDto,
  SearchSuggestionsRequestDto,
  IndexDocumentDto,
  SearchResultsDto,
  SearchSuggestionsDto,
  SearchAnalyticsDto,
} from './dto/search.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('courses')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Search courses' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'difficulty', required: false, enum: ['beginner', 'intermediate', 'advanced', 'expert'] })
  @ApiQuery({ name: 'status', required: false, enum: ['draft', 'published', 'archived'] })
  @ApiQuery({ name: 'accessType', required: false, enum: ['public', 'private', 'restricted'] })
  @ApiQuery({ name: 'instructorId', required: false, type: String })
  @ApiQuery({ name: 'tags', required: false, type: [String] })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Courses search results',
    type: SearchResultsDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid search parameters',
  })
  @ApiBearerAuth()
  async searchCourses(
    @Query() searchDto: SearchCoursesDto,
    @Request() req: any,
  ): Promise<SearchResultsDto> {
    try {
      const startTime = Date.now();
      const results = await this.searchService.searchCourses(searchDto, req.user);
      const executionTime = Date.now() - startTime;
      
      return new SearchResultsDto({
        ...results,
        executionTime,
      });
    } catch (error) {
      throw new HttpException(
        error.message || 'Search operation failed',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('content')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Search all content (courses, modules, lessons, assessments)' })
  @ApiQuery({ name: 'query', required: true, type: String })
  @ApiQuery({ name: 'types', required: false, type: [String] })
  @ApiQuery({ name: 'courseId', required: false, type: String })
  @ApiQuery({ name: 'moduleId', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Content search results',
    type: SearchResultsDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid search parameters',
  })
  @ApiBearerAuth()
  async searchContent(
    @Query() searchDto: SearchContentDto,
    @Request() req: any,
  ): Promise<SearchResultsDto> {
    try {
      const startTime = Date.now();
      const results = await this.searchService.searchContent(
        searchDto.query,
        searchDto,
        req.user,
      );
      const executionTime = Date.now() - startTime;

      return new SearchResultsDto({
        ...results,
        executionTime,
      });
    } catch (error) {
      throw new HttpException(
        error.message || 'Content search operation failed',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('suggestions')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Get search suggestions and autocomplete' })
  @ApiQuery({ name: 'query', required: true, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Search suggestions',
    type: SearchSuggestionsDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid suggestion request',
  })
  @ApiBearerAuth()
  async getSuggestions(
    @Query() suggestionsDto: SearchSuggestionsRequestDto,
    @Request() req: any,
  ): Promise<SearchSuggestionsDto> {
    try {
      const results = await this.searchService.getSuggestions(
        suggestionsDto.query,
        req.user,
      );
      return new SearchSuggestionsDto(results);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get suggestions',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('public/courses')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Public course search (no authentication required)' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'difficulty', required: false, enum: ['beginner', 'intermediate', 'advanced', 'expert'] })
  @ApiQuery({ name: 'tags', required: false, type: [String] })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Public courses search results',
    type: SearchResultsDto,
  })
  async searchPublicCourses(
    @Query() searchDto: SearchCoursesDto,
  ): Promise<SearchResultsDto> {
    try {
      // Force public access settings for unauthenticated users
      const publicSearchDto = {
        ...searchDto,
        status: 'published',
        accessType: 'public',
      };

      const startTime = Date.now();
      const results = await this.searchService.searchCourses(publicSearchDto, null);
      const executionTime = Date.now() - startTime;

      return new SearchResultsDto({
        ...results,
        executionTime,
      });
    } catch (error) {
      throw new HttpException(
        error.message || 'Public search operation failed',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('public/suggestions')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Public search suggestions (no authentication required)' })
  @ApiQuery({ name: 'query', required: true, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Public search suggestions',
    type: SearchSuggestionsDto,
  })
  async getPublicSuggestions(
    @Query() suggestionsDto: SearchSuggestionsRequestDto,
  ): Promise<SearchSuggestionsDto> {
    try {
      const results = await this.searchService.getSuggestions(
        suggestionsDto.query,
        null, // No user for public suggestions
      );
      return new SearchSuggestionsDto(results);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get public suggestions',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('index')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CONTENT_CREATOR)
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Index a specific document' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Document indexed successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        documentId: { type: 'string' },
        type: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Document not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiBody({ type: IndexDocumentDto })
  @ApiBearerAuth()
  async indexDocument(
    @Body() indexDto: IndexDocumentDto,
    @Request() req: any,
  ): Promise<{ message: string; documentId: string; type: string }> {
    try {
      switch (indexDto.type) {
        case 'course':
          const course = await this.searchService['courseRepository'].findOne({
            where: { id: indexDto.id },
            relations: ['instructor'],
          });
          if (!course) {
            throw new HttpException('Course not found', HttpStatus.NOT_FOUND);
          }
          await this.searchService.indexCourse(course);
          break;

        case 'module':
          const module = await this.searchService['moduleRepository'].findOne({
            where: { id: indexDto.id },
          });
          if (!module) {
            throw new HttpException('Module not found', HttpStatus.NOT_FOUND);
          }
          await this.searchService.indexModule(module);
          break;

        case 'lesson':
          const lesson = await this.searchService['lessonRepository'].findOne({
            where: { id: indexDto.id },
          });
          if (!lesson) {
            throw new HttpException('Lesson not found', HttpStatus.NOT_FOUND);
          }
          await this.searchService.indexLesson(lesson);
          break;

        case 'assessment':
          const assessment = await this.searchService['assessmentRepository'].findOne({
            where: { id: indexDto.id },
          });
          if (!assessment) {
            throw new HttpException('Assessment not found', HttpStatus.NOT_FOUND);
          }
          await this.searchService.indexAssessment(assessment);
          break;

        default:
          throw new HttpException('Invalid document type', HttpStatus.BAD_REQUEST);
      }

      return {
        message: `${indexDto.type} indexed successfully`,
        documentId: indexDto.id,
        type: indexDto.type,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to index document',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('reindex')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reindex all documents' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reindex operation started',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        status: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiBearerAuth()
  async reindexAll(
    @Request() req: any,
  ): Promise<{ message: string; status: string }> {
    try {
      // Start reindex operation asynchronously
      this.searchService.reindexAll().catch(error => {
        console.error('Reindex operation failed:', error);
      });

      return {
        message: 'Reindex operation started successfully',
        status: 'in_progress',
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to start reindex operation',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Get search analytics' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Search analytics data',
    type: SearchAnalyticsDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiBearerAuth()
  async getSearchAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Request() req?: any,
  ): Promise<SearchAnalyticsDto> {
    try {
      // This would typically integrate with analytics service
      // For now, return mock data
      const analytics = {
        totalSearches: 1250,
        uniqueSearchers: 450,
        averageResultsPerSearch: 8.5,
        popularTerms: [
          { term: 'javascript', count: 125, clickThroughRate: 0.75 },
          { term: 'react', count: 98, clickThroughRate: 0.82 },
          { term: 'python', count: 87, clickThroughRate: 0.68 },
        ],
        searchTrends: [
          { date: '2024-01-01', searches: 45, uniqueUsers: 23 },
          { date: '2024-01-02', searches: 52, uniqueUsers: 28 },
        ],
        zeroResultSearches: [
          { term: 'advanced quantum computing', count: 5 },
          { term: 'blockchain development 2024', count: 3 },
        ],
        performance: {
          averageResponseTime: 125,
          slowQueries: [
            {
              query: 'complex search with many filters',
              responseTime: 850,
              timestamp: new Date(),
            },
          ],
        },
      };

      return new SearchAnalyticsDto(analytics);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to retrieve search analytics',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
