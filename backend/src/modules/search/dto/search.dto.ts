import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CourseStatus,
  CourseDifficulty,
  CourseAccessType,
} from '../../../database/entities/course.entity';

export class SearchCoursesDto {
  @ApiPropertyOptional({ description: 'Search query' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ enum: CourseDifficulty, description: 'Filter by difficulty' })
  @IsOptional()
  @IsEnum(CourseDifficulty)
  difficulty?: CourseDifficulty;

  @ApiPropertyOptional({ enum: CourseStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  @ApiPropertyOptional({ enum: CourseAccessType, description: 'Filter by access type' })
  @IsOptional()
  @IsEnum(CourseAccessType)
  accessType?: CourseAccessType;

  @ApiPropertyOptional({ description: 'Filter by instructor ID' })
  @IsOptional()
  @IsUUID()
  instructorId?: string;

  @ApiPropertyOptional({ description: 'Filter by tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Minimum price' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum price' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort field' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], description: 'Sort order' })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}

export class SearchContentDto {
  @ApiProperty({ description: 'Search query' })
  @IsString()
  query: string;

  @ApiPropertyOptional({ description: 'Content types to search', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  types?: string[];

  @ApiPropertyOptional({ description: 'Filter by course ID' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({ description: 'Filter by module ID' })
  @IsOptional()
  @IsUUID()
  moduleId?: string;

  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class SearchSuggestionsRequestDto {
  @ApiProperty({ description: 'Query for suggestions' })
  @IsString()
  query: string;

  @ApiPropertyOptional({ description: 'Maximum number of suggestions', minimum: 1, maximum: 20, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20)
  limit?: number = 10;
}

export class IndexDocumentDto {
  @ApiProperty({ description: 'Document ID' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Document type' })
  @IsEnum(['course', 'module', 'lesson', 'assessment'])
  type: 'course' | 'module' | 'lesson' | 'assessment';

  @ApiPropertyOptional({ description: 'Force reindex even if document exists' })
  @IsOptional()
  @IsString()
  force?: boolean;
}

export class SearchResultItemDto {
  @ApiProperty({ description: 'Document ID' })
  id: string;

  @ApiProperty({ description: 'Document type' })
  type: string;

  @ApiProperty({ description: 'Document title' })
  title: string;

  @ApiPropertyOptional({ description: 'Document description' })
  description?: string;

  @ApiPropertyOptional({ description: 'Document URL or slug' })
  url?: string;

  @ApiPropertyOptional({ description: 'Thumbnail URL' })
  thumbnailUrl?: string;

  @ApiProperty({ description: 'Search relevance score' })
  score: number;

  @ApiPropertyOptional({ description: 'Highlighted text snippets' })
  highlights?: Record<string, string[]>;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: Record<string, any>;

  constructor(data: any) {
    this.id = data.id;
    this.type = data.type || 'course';
    this.title = data.title;
    this.description = data.description || data.shortDescription;
    this.url = data.slug;
    this.thumbnailUrl = data.thumbnailUrl;
    this.score = data.score;
    this.highlights = data.highlights;
    this.metadata = data.metadata;
  }
}

export class SearchAggregationDto {
  @ApiProperty({ description: 'Aggregation key' })
  key: string;

  @ApiProperty({ description: 'Document count' })
  count: number;

  @ApiPropertyOptional({ description: 'Percentage of total' })
  percentage?: number;

  constructor(data: any) {
    this.key = data.key;
    this.count = data.count;
    this.percentage = data.percentage;
  }
}

export class SearchResultsDto {
  @ApiProperty({ type: [SearchResultItemDto], description: 'Search results' })
  items: SearchResultItemDto[];

  @ApiProperty({ description: 'Total number of results' })
  total: number;

  @ApiProperty({ description: 'Current page' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  @ApiPropertyOptional({ description: 'Search aggregations' })
  aggregations?: Record<string, SearchAggregationDto[]>;

  @ApiPropertyOptional({ description: 'Search execution time in milliseconds' })
  executionTime?: number;

  constructor(data: any) {
    this.items = data.items.map((item: any) => new SearchResultItemDto(item));
    this.total = data.total;
    this.page = data.page;
    this.limit = data.limit;
    this.totalPages = data.totalPages;
    this.aggregations = data.aggregations;
    this.executionTime = data.executionTime;
  }
}

export class SearchSuggestionDto {
  @ApiProperty({ description: 'Suggestion text' })
  text: string;

  @ApiPropertyOptional({ description: 'Suggestion type' })
  type?: string;

  @ApiPropertyOptional({ description: 'Suggestion score' })
  score?: number;

  constructor(data: any) {
    this.text = data.text || data;
    this.type = data.type;
    this.score = data.score;
  }
}

export class SearchCoursePreviewDto {
  @ApiProperty({ description: 'Course ID' })
  id: string;

  @ApiProperty({ description: 'Course title' })
  title: string;

  @ApiPropertyOptional({ description: 'Course description' })
  description?: string;

  @ApiPropertyOptional({ description: 'Course thumbnail URL' })
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: 'Course rating' })
  rating?: number;

  @ApiPropertyOptional({ description: 'Course price' })
  price?: number;

  @ApiPropertyOptional({ description: 'Course difficulty' })
  difficulty?: string;

  constructor(data: any) {
    this.id = data.id;
    this.title = data.title;
    this.description = data.description;
    this.thumbnailUrl = data.thumbnailUrl;
    this.rating = data.rating;
    this.price = data.price;
    this.difficulty = data.difficulty;
  }
}

export class SearchSuggestionsDto {
  @ApiProperty({ type: [SearchSuggestionDto], description: 'Search suggestions' })
  suggestions: SearchSuggestionDto[];

  @ApiProperty({ type: [SearchCoursePreviewDto], description: 'Course previews' })
  courses: SearchCoursePreviewDto[];

  @ApiPropertyOptional({ description: 'Popular searches', type: [String] })
  popularSearches?: string[];

  constructor(data: any) {
    this.suggestions = (data.suggestions || []).map((suggestion: any) => new SearchSuggestionDto(suggestion));
    this.courses = (data.courses || []).map((course: any) => new SearchCoursePreviewDto(course));
    this.popularSearches = data.popularSearches;
  }
}

export class SearchAnalyticsDto {
  @ApiProperty({ description: 'Total searches' })
  totalSearches: number;

  @ApiProperty({ description: 'Unique searchers' })
  uniqueSearchers: number;

  @ApiProperty({ description: 'Average results per search' })
  averageResultsPerSearch: number;

  @ApiProperty({ description: 'Most popular search terms' })
  popularTerms: {
    term: string;
    count: number;
    clickThroughRate: number;
  }[];

  @ApiProperty({ description: 'Search trends over time' })
  searchTrends: {
    date: string;
    searches: number;
    uniqueUsers: number;
  }[];

  @ApiProperty({ description: 'Zero result searches' })
  zeroResultSearches: {
    term: string;
    count: number;
  }[];

  @ApiProperty({ description: 'Search performance metrics' })
  performance: {
    averageResponseTime: number;
    slowQueries: {
      query: string;
      responseTime: number;
      timestamp: Date;
    }[];
  };

  constructor(data: any) {
    this.totalSearches = data.totalSearches;
    this.uniqueSearchers = data.uniqueSearchers;
    this.averageResultsPerSearch = data.averageResultsPerSearch;
    this.popularTerms = data.popularTerms;
    this.searchTrends = data.searchTrends;
    this.zeroResultSearches = data.zeroResultSearches;
    this.performance = data.performance;
  }
}
