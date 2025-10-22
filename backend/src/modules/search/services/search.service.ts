import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '@elastic/elasticsearch';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Course } from '../../../database/entities/course.entity';
import { Module } from '../../../database/entities/module.entity';
import { Lesson } from '../../../database/entities/lesson.entity';
import { Assessment } from '../../../database/entities/assessment.entity';
import { User } from '../../../database/entities/user.entity';
import {
  SearchCoursesDto,
  SearchResultsDto,
  SearchSuggestionsDto,
  IndexDocumentDto,
} from '../dto/search.dto';
import { IndicesCreateRequest } from '@elastic/elasticsearch/lib/api/types';

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private elasticsearchClient: Client;
  private readonly indexPrefix: string;

  constructor(
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(Module)
    private moduleRepository: Repository<Module>,
    @InjectRepository(Lesson)
    private lessonRepository: Repository<Lesson>,
    @InjectRepository(Assessment)
    private assessmentRepository: Repository<Assessment>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    this.indexPrefix = this.configService.get('ELASTICSEARCH_INDEX_PREFIX', 'lms');
    this.elasticsearchClient = new Client({
      node: this.configService.get('ELASTICSEARCH_URL', 'http://localhost:9200'),
      auth: {
        username: this.configService.get('ELASTICSEARCH_USERNAME'),
        password: this.configService.get('ELASTICSEARCH_PASSWORD'),
      },
    });
  }

  async onModuleInit() {
    try {
      await this.initializeIndices();
      this.setupEventListeners();
      this.logger.log('Search service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize search service', error);
    }
  }

  private async initializeIndices() {
    const indices = [
      { name: `${this.indexPrefix}_courses`, mapping: this.getCourseMapping() },
      { name: `${this.indexPrefix}_modules`, mapping: this.getModuleMapping() },
      { name: `${this.indexPrefix}_lessons`, mapping: this.getLessonMapping() },
      { name: `${this.indexPrefix}_assessments`, mapping: this.getAssessmentMapping() },
    ];

    for (const index of indices) {
      try {
        const exists = await this.elasticsearchClient.indices.exists({
          index: index.name,
        });

        if (!exists) {
          await this.elasticsearchClient.indices.create({
            index: index.name,
            body: {
              mappings: index.mapping,
              settings: {
                analysis: {
                  analyzer: {
                    content_analyzer: {
                      type: 'custom',
                      tokenizer: 'standard',
                      filter: ['lowercase', 'stop', 'stemmer'],
                    },
                  },
                },
              },
            }  as IndicesCreateRequest['body'],
          });
          this.logger.log(`Created Elasticsearch index: ${index.name}`);
        }
      } catch (error) {
        this.logger.error(`Failed to create index ${index.name}`, error);
      }
    }
  }

  private setupEventListeners() {
    // Course events
    this.eventEmitter.on('course.created', (course) => this.indexCourse(course));
    this.eventEmitter.on('course.updated', (course) => this.indexCourse(course));
    this.eventEmitter.on('course.deleted', (courseId) => this.deleteCourse(courseId));

    // Module events
    this.eventEmitter.on('module.created', (module) => this.indexModule(module));
    this.eventEmitter.on('module.updated', (module) => this.indexModule(module));
    this.eventEmitter.on('module.deleted', (moduleId) => this.deleteModule(moduleId));

    // Lesson events
    this.eventEmitter.on('lesson.created', (lesson) => this.indexLesson(lesson));
    this.eventEmitter.on('lesson.updated', (lesson) => this.indexLesson(lesson));
    this.eventEmitter.on('lesson.deleted', (lessonId) => this.deleteLesson(lessonId));

    // Assessment events
    this.eventEmitter.on('assessment.created', (assessment) => this.indexAssessment(assessment));
    this.eventEmitter.on('assessment.updated', (assessment) => this.indexAssessment(assessment));
    this.eventEmitter.on('assessment.deleted', (assessmentId) => this.deleteAssessment(assessmentId));
  }

  async searchCourses(searchDto: any, user: User): Promise<SearchResultsDto> {
    try {
      const query = this.buildCourseSearchQuery(searchDto, user);
      
      const response = await this.elasticsearchClient.search({
        index: `${this.indexPrefix}_courses`,
        body: {
          query,
          sort: this.buildSortOptions(searchDto.sortBy, searchDto.sortOrder),
          from: (searchDto.page - 1) * searchDto.limit,
          size: searchDto.limit,
          highlight: {
            fields: {
              title: {},
              description: {},
              shortDescription: {},
              'tags.keyword': {},
            },
          },
          aggs: {
            categories: {
              terms: { field: 'category.keyword' },
            },
            difficulties: {
              terms: { field: 'difficulty.keyword' },
            },
            instructors: {
              terms: { field: 'instructor.name.keyword' },
            },
            price_ranges: {
              range: {
                field: 'price',
                ranges: [
                  { key: 'free', to: 1 },
                  { key: 'low', from: 1, to: 50 },
                  { key: 'medium', from: 50, to: 200 },
                  { key: 'high', from: 200 },
                ],
              },
            },
          },
        } as any,
      });

      return this.formatSearchResults(response, searchDto);
    } catch (error) {
      this.logger.error('Course search failed', error);
      throw new Error('Search operation failed');
    }
  }

  async searchContent(query: string, filters: any = {}, user: User): Promise<SearchResultsDto> {
    try {
      const searchQuery = {
        bool: {
          must: [
            {
              multi_match: {
                query,
                fields: ['title^3', 'description^2', 'content', 'tags'],
                type: 'best_fields',
                fuzziness: 'AUTO',
              },
            },
          ],
          filter: this.buildAccessFilters(user, filters),
        },
      };

      const indices = [
        `${this.indexPrefix}_courses`,
        `${this.indexPrefix}_modules`,
        `${this.indexPrefix}_lessons`,
        `${this.indexPrefix}_assessments`,
      ];
const response = await this.elasticsearchClient.search<any>({
  index: indices,
  body: {
    query: searchQuery,
    sort: [{ _score: { order: 'desc' } }],
    from: (filters.page - 1 || 0) * (filters.limit || 20),
    size: filters.limit || 20,
    highlight: {
      fields: {
        title: {},
        description: {},
        content: {},
      },
    },
  } as any,
});


      return this.formatSearchResults(response, filters);
    } catch (error) {
      this.logger.error('Content search failed', error);
      throw new Error('Content search operation failed');
    }
  }

  async getSuggestions(query: string, user: User): Promise<SearchSuggestionsDto> {
    try {
      const response = await this.elasticsearchClient.search({
        index: `${this.indexPrefix}_courses`,
        body: {
          suggest: {
            course_suggest: {
              prefix: query,
              completion: {
                field: 'suggest',
                size: 10,
              },
            },
            title_suggest: {
              text: query,
              term: {
                field: 'title',
                size: 5,
              },
            },
          },
          query: {
            bool: {
              must: [
                {
                  multi_match: {
                    query,
                    fields: ['title^3', 'tags^2'],
                    type: 'phrase_prefix',
                  },
                },
              ],
              filter: this.buildAccessFilters(user),
            },
          },
          size: 5,
        } as any,
      });

      return this.formatSuggestions(response);
    } catch (error) {
      this.logger.error('Suggestions search failed', error);
      return { suggestions: [], courses: [] };
    }
  }

  async indexCourse(course: any): Promise<void> {
    try {
      const document = {
        id: course.id,
        title: course.title,
        description: course.description,
        shortDescription: course.shortDescription,
        slug: course.slug,
        status: course.status,
        difficulty: course.difficulty,
        duration: course.duration,
        price: course.price,
        currency: course.currency,
        accessType: course.accessType,
        category: course.category,
        tags: course.tags || [],
        learningObjectives: course.learningObjectives || [],
        prerequisites: course.prerequisites || [],
        language: course.language,
        rating: course.rating,
        enrollmentCount: course.enrollmentCount,
        completionCount: course.completionCount,
        instructor: {
          id: course.createdBy,
          name: `${course.instructor?.firstName || ''} ${course.instructor?.lastName || ''}`.trim(),
        },
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
        suggest: {
          input: [
            course.title,
            ...(course.tags || []),
            course.category,
          ].filter(Boolean),
          weight: this.calculateCourseWeight(course),
        },
      };

      await this.elasticsearchClient.index({
        index: `${this.indexPrefix}_courses`,
        id: course.id,
        body: document as any,
      });

      this.logger.debug(`Indexed course: ${course.title}`);
    } catch (error) {
      this.logger.error(`Failed to index course ${course.id}`, error);
    }
  }

  async indexModule(module: any): Promise<void> {
    try {
      const document = {
        id: module.id,
        title: module.title,
        description: module.description,
        slug: module.slug,
        status: module.status,
        courseId: module.courseId,
        sortOrder: module.sortOrder,
        duration: module.duration,
        createdAt: module.createdAt,
        updatedAt: module.updatedAt,
      };

      await this.elasticsearchClient.index({
        index: `${this.indexPrefix}_modules`,
        id: module.id,
        body: document as any,
      });

      this.logger.debug(`Indexed module: ${module.title}`);
    } catch (error) {
      this.logger.error(`Failed to index module ${module.id}`, error);
    }
  }

  async indexLesson(lesson: any): Promise<void> {
    try {
      const document = {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        slug: lesson.slug,
        type: lesson.type,
        status: lesson.status,
        content: lesson.content,
        moduleId: lesson.moduleId,
        sortOrder: lesson.sortOrder,
        duration: lesson.duration,
        isFreePreview: lesson.isFreePreview,
        createdAt: lesson.createdAt,
        updatedAt: lesson.updatedAt,
      };

      await this.elasticsearchClient.index({
        index: `${this.indexPrefix}_lessons`,
        id: lesson.id,
        body: document as any,
      });

      this.logger.debug(`Indexed lesson: ${lesson.title}`);
    } catch (error) {
      this.logger.error(`Failed to index lesson ${lesson.id}`, error);
    }
  }

  async indexAssessment(assessment: Assessment): Promise<void> {
    try {
      const document = {
        id: assessment.id,
        title: assessment.title,
        description: assessment.description,
        type: assessment.type,
        status: assessment.status,
        courseId: assessment.courseId,
        moduleId: assessment.moduleId,
        lessonId: assessment.lessonId,
        questionCount: assessment.questionCount,
        totalPoints: assessment.totalPoints,
        timeLimit: assessment.timeLimit,
        createdAt: assessment.createdAt,
        updatedAt: assessment.updatedAt,
      };

      await this.elasticsearchClient.index({
        index: `${this.indexPrefix}_assessments`,
        id: assessment.id,
        body: document as any,
      });

      this.logger.debug(`Indexed assessment: ${assessment.title}`);
    } catch (error) {
      this.logger.error(`Failed to index assessment ${assessment.id}`, error);
    }
  }

  async deleteCourse(courseId: string): Promise<void> {
    try {
      await this.elasticsearchClient.delete({
        index: `${this.indexPrefix}_courses`,
        id: courseId,
      });
      this.logger.debug(`Deleted course from index: ${courseId}`);
    } catch (error) {
      this.logger.error(`Failed to delete course ${courseId} from index`, error);
    }
  }

  async deleteModule(moduleId: string): Promise<void> {
    try {
      await this.elasticsearchClient.delete({
        index: `${this.indexPrefix}_modules`,
        id: moduleId,
      });
      this.logger.debug(`Deleted module from index: ${moduleId}`);
    } catch (error) {
      this.logger.error(`Failed to delete module ${moduleId} from index`, error);
    }
  }

  async deleteLesson(lessonId: string): Promise<void> {
    try {
      await this.elasticsearchClient.delete({
        index: `${this.indexPrefix}_lessons`,
        id: lessonId,
      });
      this.logger.debug(`Deleted lesson from index: ${lessonId}`);
    } catch (error) {
      this.logger.error(`Failed to delete lesson ${lessonId} from index`, error);
    }
  }

  async deleteAssessment(assessmentId: string): Promise<void> {
    try {
      await this.elasticsearchClient.delete({
        index: `${this.indexPrefix}_assessments`,
        id: assessmentId,
      });
      this.logger.debug(`Deleted assessment from index: ${assessmentId}`);
    } catch (error) {
      this.logger.error(`Failed to delete assessment ${assessmentId} from index`, error);
    }
  }

  async reindexAll(): Promise<void> {
    this.logger.log('Starting full reindex...');

    try {
      // Reindex courses
      const courses = await this.courseRepository.find({
        relations: ['instructor'],
      });
      for (const course of courses) {
        await this.indexCourse(course);
      }

      // Reindex modules
      const modules = await this.moduleRepository.find();
      for (const module of modules) {
        await this.indexModule(module);
      }

      // Reindex lessons
      const lessons = await this.lessonRepository.find();
      for (const lesson of lessons) {
        await this.indexLesson(lesson);
      }

      // Reindex assessments
      const assessments = await this.assessmentRepository.find();
      for (const assessment of assessments) {
        await this.indexAssessment(assessment);
      }

      this.logger.log('Full reindex completed successfully');
    } catch (error) {
      this.logger.error('Full reindex failed', error);
      throw error;
    }
  }

  private buildCourseSearchQuery(searchDto: SearchCoursesDto, user: User) {
    const must = [];
    const filter = [];

    // Text search
    if (searchDto.search) {
      must.push({
        multi_match: {
          query: searchDto.search,
          fields: ['title^3', 'description^2', 'shortDescription^2', 'tags^2', 'category'],
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      });
    }

    // Filters
    if (searchDto.category) {
      filter.push({ term: { 'category.keyword': searchDto.category } });
    }

    if (searchDto.difficulty) {
      filter.push({ term: { 'difficulty.keyword': searchDto.difficulty } });
    }

    if (searchDto.status) {
      filter.push({ term: { 'status.keyword': searchDto.status } });
    }

    if (searchDto.accessType) {
      filter.push({ term: { 'accessType.keyword': searchDto.accessType } });
    }

    if (searchDto.instructorId) {
      filter.push({ term: { 'instructor.id': searchDto.instructorId } });
    }

    if (searchDto.tags && searchDto.tags.length > 0) {
      filter.push({ terms: { 'tags.keyword': searchDto.tags } });
    }

    // Price range
    if (searchDto.minPrice !== undefined || searchDto.maxPrice !== undefined) {
      const priceRange: any = {};
      if (searchDto.minPrice !== undefined) priceRange.gte = searchDto.minPrice;
      if (searchDto.maxPrice !== undefined) priceRange.lte = searchDto.maxPrice;
      filter.push({ range: { price: priceRange } });
    }

    // Access control
    filter.push(...this.buildAccessFilters(user));

    return {
      bool: {
        must: must.length > 0 ? must : [{ match_all: {} }],
        filter,
      },
    };
  }

  private buildAccessFilters(user: User, additionalFilters: any = []) {
    const filters = [...additionalFilters];

    // Only show published content to regular users
    if (!user || !['admin', 'instructor', 'content_creator'].includes(user.roles)) {
      filters.push({ term: { 'status.keyword': 'published' } });
    }

    return filters;
  }

  private buildSortOptions(sortBy?: string, sortOrder: 'ASC' | 'DESC' = 'DESC') {
    const order = sortOrder.toLowerCase();

    switch (sortBy) {
      case 'title':
        return [{ 'title.keyword': { order } }];
      case 'createdAt':
        return [{ createdAt: { order } }];
      case 'updatedAt':
        return [{ updatedAt: { order } }];
      case 'rating':
        return [{ rating: { order } }];
      case 'enrollmentCount':
        return [{ enrollmentCount: { order } }];
      case 'price':
        return [{ price: { order } }];
      default:
        return [{ _score: { order: 'desc' } }, { createdAt: { order: 'desc' } }];
    }
  }

  private formatSearchResults(response: any, searchDto: any): SearchResultsDto {
    const hits = response.body?.hits || response.hits;
    const aggregations = response.body?.aggregations || response.aggregations;

    return {
      items: hits.hits.map((hit: any) => ({
        ...hit._source,
        score: hit._score,
        highlights: hit.highlight,
      })),
      total: hits.total?.value || hits.total,
      page: searchDto.page || 1,
      limit: searchDto.limit || 20,
      totalPages: Math.ceil((hits.total?.value || hits.total) / (searchDto.limit || 20)),
      aggregations: this.formatAggregations(aggregations),
    };
  }

  private formatSuggestions(response: any): SearchSuggestionsDto {
    const suggest = response.body?.suggest || response.suggest;
    const hits = response.body?.hits || response.hits;

    const suggestions = [];
    
    if (suggest.course_suggest?.[0]?.options) {
      suggestions.push(...suggest.course_suggest[0].options.map((option: any) => option.text));
    }

    if (suggest.title_suggest?.[0]?.options) {
      suggestions.push(...suggest.title_suggest[0].options.map((option: any) => option.text));
    }

    return {
      suggestions: [...new Set(suggestions)].slice(0, 10),
      courses: hits.hits.slice(0, 5).map((hit: any) => ({
        id: hit._source.id,
        title: hit._source.title,
        description: hit._source.shortDescription || hit._source.description,
        thumbnailUrl: hit._source.thumbnailUrl,
      })),
    };
  }

  private formatAggregations(aggregations: any) {
    if (!aggregations) return {};

    const formatted: any = {};

    Object.keys(aggregations).forEach(key => {
      if (aggregations[key].buckets) {
        formatted[key] = aggregations[key].buckets.map((bucket: any) => ({
          key: bucket.key,
          count: bucket.doc_count,
        }));
      }
    });

    return formatted;
  }

  private calculateCourseWeight(course: any): number {
    let weight = 1;
    
    // Boost based on enrollment count
    if (course.enrollmentCount > 100) weight += 3;
    else if (course.enrollmentCount > 50) weight += 2;
    else if (course.enrollmentCount > 10) weight += 1;

    // Boost based on rating
    if (course.rating >= 4.5) weight += 2;
    else if (course.rating >= 4.0) weight += 1;

    // Boost published courses
    if (course.status === 'published') weight += 1;

    return weight;
  }

  private getCourseMapping() {
    return {
      properties: {
        id: { type: 'keyword' },
        title: {
          type: 'text',
          analyzer: 'content_analyzer',
          fields: { keyword: { type: 'keyword' } },
        },
        description: { type: 'text', analyzer: 'content_analyzer' },
        shortDescription: { type: 'text', analyzer: 'content_analyzer' },
        slug: { type: 'keyword' },
        status: { type: 'keyword' },
        difficulty: { type: 'keyword' },
        duration: { type: 'integer' },
        price: { type: 'float' },
        currency: { type: 'keyword' },
        accessType: { type: 'keyword' },
        category: {
          type: 'text',
          fields: { keyword: { type: 'keyword' } },
        },
        tags: {
          type: 'text',
          fields: { keyword: { type: 'keyword' } },
        },
        learningObjectives: { type: 'text' },
        prerequisites: { type: 'text' },
        language: { type: 'keyword' },
        rating: { type: 'float' },
        enrollmentCount: { type: 'integer' },
        completionCount: { type: 'integer' },
        instructor: {
          properties: {
            id: { type: 'keyword' },
            name: {
              type: 'text',
              fields: { keyword: { type: 'keyword' } },
            },
          },
        },
        createdAt: { type: 'date' },
        updatedAt: { type: 'date' },
        suggest: {
          type: 'completion',
          analyzer: 'simple',
          preserve_separators: true,
          preserve_position_increments: true,
          max_input_length: 50,
        },
      },
    };
  }

  private getModuleMapping() {
    return {
      properties: {
        id: { type: 'keyword' },
        title: {
          type: 'text',
          analyzer: 'content_analyzer',
          fields: { keyword: { type: 'keyword' } },
        },
        description: { type: 'text', analyzer: 'content_analyzer' },
        slug: { type: 'keyword' },
        status: { type: 'keyword' },
        courseId: { type: 'keyword' },
        sortOrder: { type: 'integer' },
        duration: { type: 'integer' },
        createdAt: { type: 'date' },
        updatedAt: { type: 'date' },
      },
    };
  }

  private getLessonMapping() {
    return {
      properties: {
        id: { type: 'keyword' },
        title: {
          type: 'text',
          analyzer: 'content_analyzer',
          fields: { keyword: { type: 'keyword' } },
        },
        description: { type: 'text', analyzer: 'content_analyzer' },
        slug: { type: 'keyword' },
        type: { type: 'keyword' },
        status: { type: 'keyword' },
        content: { type: 'text', analyzer: 'content_analyzer' },
        moduleId: { type: 'keyword' },
        sortOrder: { type: 'integer' },
        duration: { type: 'integer' },
        isFreePreview: { type: 'boolean' },
        createdAt: { type: 'date' },
        updatedAt: { type: 'date' },
      },
    };
  }

  private getAssessmentMapping() {
    return {
      properties: {
        id: { type: 'keyword' },
        title: {
          type: 'text',
          analyzer: 'content_analyzer',
          fields: { keyword: { type: 'keyword' } },
        },
        description: { type: 'text', analyzer: 'content_analyzer' },
        type: { type: 'keyword' },
        status: { type: 'keyword' },
        courseId: { type: 'keyword' },
        moduleId: { type: 'keyword' },
        lessonId: { type: 'keyword' },
        questionCount: { type: 'integer' },
        totalPoints: { type: 'integer' },
        timeLimit: { type: 'integer' },
        createdAt: { type: 'date' },
        updatedAt: { type: 'date' },
      },
    };
  }
}
