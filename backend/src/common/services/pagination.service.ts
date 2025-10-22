import { Injectable, BadRequestException } from '@nestjs/common';
import { SelectQueryBuilder, Repository } from 'typeorm';
import { Request } from 'express';

export interface PaginationQuery {
  page?: number;
  limit?: number;
  cursor?: string;
  sort?: string;
  order?: 'ASC' | 'DESC';
  search?: string;
  filters?: Record<string, any>;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    startIndex: number;
    endIndex: number;
  };
  links: {
    first?: string;
    prev?: string;
    next?: string;
    last?: string;
    self: string;
  };
  meta: {
    took: number;
    cached: boolean;
    query: string;
  };
}

export interface CursorPaginationResult<T> {
  data: T[];
  pagination: {
    cursor: string | null;
    nextCursor: string | null;
    prevCursor: string | null;
    limit: number;
    hasMore: boolean;
    hasPrev: boolean;
  };
  links: {
    next?: string;
    prev?: string;
    self: string;
  };
  meta: {
    took: number;
    cached: boolean;
  };
}

export interface PaginationOptions {
  defaultLimit: number;
  maxLimit: number;
  allowCursor: boolean;
  allowSearch: boolean;
  allowSort: boolean;
  defaultSort?: string;
  searchFields?: string[];
  sortableFields?: string[];
  filterableFields?: string[];
}

/**
 * Advanced Pagination Service
 * Provides comprehensive pagination with offset-based and cursor-based pagination,
 * search, filtering, and sorting capabilities
 */
@Injectable()
export class PaginationService {
  private readonly defaultOptions: PaginationOptions = {
    defaultLimit: 20,
    maxLimit: 100,
    allowCursor: true,
    allowSearch: true,
    allowSort: true,
    defaultSort: 'createdAt',
    searchFields: [],
    sortableFields: [],
    filterableFields: [],
  };

  /**
   * Create paginated result using offset-based pagination
   */
  async paginate<T>(
    queryBuilder: SelectQueryBuilder<T>,
    query: PaginationQuery,
    request: Request,
    options: Partial<PaginationOptions> = {},
  ): Promise<PaginationResult<T>> {
    const startTime = Date.now();
    const opts = { ...this.defaultOptions, ...options };
    
    // Validate and normalize query parameters
    const normalizedQuery = this.normalizeQuery(query, opts);
    
    // Apply search if provided
    if (normalizedQuery.search && opts.allowSearch) {
      this.applySearch(queryBuilder, normalizedQuery.search, opts.searchFields || []);
    }
    
    // Apply filters
    if (normalizedQuery.filters) {
      this.applyFilters(queryBuilder, normalizedQuery.filters, opts.filterableFields || []);
    }
    
    // Apply sorting
    if (opts.allowSort) {
      this.applySorting(queryBuilder, normalizedQuery.sort!, normalizedQuery.order!, opts.sortableFields || []);
    }
    
    // Get total count before applying pagination
    const totalCount = await queryBuilder.getCount();
    
    // Apply pagination
    const offset = (normalizedQuery.page! - 1) * normalizedQuery.limit!;
    queryBuilder.skip(offset).take(normalizedQuery.limit);
    
    // Execute query
    const [data] = await Promise.all([
      queryBuilder.getMany(),
    ]);
    
    const took = Date.now() - startTime;
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / normalizedQuery.limit!);
    const hasNext = normalizedQuery.page! < totalPages;
    const hasPrev = normalizedQuery.page! > 1;
    const startIndex = offset + 1;
    const endIndex = Math.min(offset + normalizedQuery.limit!, totalCount);
    
    // Generate links
    const links = this.generatePaginationLinks(request, normalizedQuery, totalPages);
    
    return {
      data,
      pagination: {
        page: normalizedQuery.page!,
        limit: normalizedQuery.limit!,
        totalCount,
        totalPages,
        hasNext,
        hasPrev,
        startIndex,
        endIndex,
      },
      links,
      meta: {
        took,
        cached: false, // Would be set by caching layer
        query: queryBuilder.getQuery(),
      },
    };
  }

  /**
   * Create cursor-based paginated result
   */
  async paginateWithCursor<T>(
    queryBuilder: SelectQueryBuilder<T>,
    query: PaginationQuery,
    request: Request,
    cursorField: string = 'id',
    options: Partial<PaginationOptions> = {},
  ): Promise<CursorPaginationResult<T>> {
    const startTime = Date.now();
    const opts = { ...this.defaultOptions, ...options };
    
    if (!opts.allowCursor) {
      throw new BadRequestException('Cursor-based pagination is not allowed');
    }
    
    // Validate and normalize query parameters
    const normalizedQuery = this.normalizeQuery(query, opts);
    
    // Apply search if provided
    if (normalizedQuery.search && opts.allowSearch) {
      this.applySearch(queryBuilder, normalizedQuery.search, opts.searchFields || []);
    }
    
    // Apply filters
    if (normalizedQuery.filters) {
      this.applyFilters(queryBuilder, normalizedQuery.filters, opts.filterableFields || []);
    }
    
    // Apply cursor condition
    if (normalizedQuery.cursor) {
      const decodedCursor = this.decodeCursor(normalizedQuery.cursor);
      queryBuilder.andWhere(`${queryBuilder.alias}.${cursorField} > :cursor`, { 
        cursor: decodedCursor 
      });
    }
    
    // Apply sorting (always sort by cursor field for consistency)
    queryBuilder.orderBy(`${queryBuilder.alias}.${cursorField}`, 'ASC');
    
    // Fetch one extra item to determine if there are more results
    queryBuilder.take(normalizedQuery.limit! + 1);
    
    // Execute query
    const data = await queryBuilder.getMany();
    
    const took = Date.now() - startTime;
    
    // Check if there are more results
    const hasMore = data.length > normalizedQuery.limit!;
    if (hasMore) {
      data.pop(); // Remove the extra item
    }
    
    // Generate cursors
    const nextCursor = hasMore && data.length > 0 
      ? this.encodeCursor((data[data.length - 1] as any)[cursorField])
      : null;
    
    const prevCursor = normalizedQuery.cursor || null;
    
    // Generate links
    const links = this.generateCursorPaginationLinks(request, normalizedQuery, nextCursor, prevCursor);
    
    return {
      data,
      pagination: {
        cursor: normalizedQuery.cursor || null,
        nextCursor,
        prevCursor,
        limit: normalizedQuery.limit!,
        hasMore,
        hasPrev: !!normalizedQuery.cursor,
      },
      links,
      meta: {
        took,
        cached: false,
      },
    };
  }

  /**
   * Create paginated result from repository with advanced options
   */
  async paginateRepository<T>(
    repository: Repository<T>,
    query: PaginationQuery,
    request: Request,
    options: Partial<PaginationOptions> & {
      relations?: string[];
      select?: (keyof T)[];
      where?: any;
    } = {},
  ): Promise<PaginationResult<T>> {
    const queryBuilder = repository.createQueryBuilder('entity');
    
    // Apply relations
    if (options.relations) {
      options.relations.forEach(relation => {
        queryBuilder.leftJoinAndSelect(`entity.${relation}`, relation);
      });
    }
    
    // Apply select
    if (options.select) {
      const selectFields = options.select.map(field => `entity.${String(field)}`);
      queryBuilder.select(selectFields);
    }
    
    // Apply where conditions
    if (options.where) {
      queryBuilder.where(options.where);
    }
    
    return this.paginate(queryBuilder, query, request, options);
  }

  /**
   * Create search-optimized pagination
   */
  async searchPaginate<T>(
    queryBuilder: SelectQueryBuilder<T>,
    searchTerm: string,
    searchFields: string[],
    query: PaginationQuery,
    request: Request,
    options: Partial<PaginationOptions> = {},
  ): Promise<PaginationResult<T> & { searchMeta: { term: string; fields: string[] } }> {
    // Apply advanced search
    this.applyAdvancedSearch(queryBuilder, searchTerm, searchFields);
    
    const result = await this.paginate(queryBuilder, query, request, options);
    
    return {
      ...result,
      searchMeta: {
        term: searchTerm,
        fields: searchFields,
      },
    };
  }

  /**
   * Create aggregated pagination with grouping
   */
  async aggregatePaginate<T>(
    queryBuilder: SelectQueryBuilder<T>,
    groupBy: string[],
    aggregations: Record<string, 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX'>,
    query: PaginationQuery,
    request: Request,
    options: Partial<PaginationOptions> = {},
  ): Promise<PaginationResult<any>> {
    // Apply grouping
    groupBy.forEach(field => {
      queryBuilder.addGroupBy(`${queryBuilder.alias}.${field}`);
    });
    
    // Apply aggregations
    Object.entries(aggregations).forEach(([field, func]) => {
      queryBuilder.addSelect(`${func}(${queryBuilder.alias}.${field})`, `${field}_${func.toLowerCase()}`);
    });
    
    return this.paginate(queryBuilder, query, request, options);
  }

  // Private helper methods

  private normalizeQuery(query: PaginationQuery, options: PaginationOptions): Required<PaginationQuery> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(options.maxLimit, Math.max(1, query.limit || options.defaultLimit));
    const sort = query.sort || options.defaultSort || 'id';
    const order = query.order || 'ASC';
    
    return {
      page,
      limit,
      cursor: query.cursor || '',
      sort,
      order,
      search: query.search || '',
      filters: query.filters || {},
    };
  }

  private applySearch(queryBuilder: SelectQueryBuilder<any>, searchTerm: string, searchFields: string[]): void {
    if (!searchTerm || searchFields.length === 0) return;
    
    const searchConditions = searchFields.map((field, index) => {
      const paramName = `search_${index}`;
      queryBuilder.setParameter(paramName, `%${searchTerm}%`);
      return `${queryBuilder.alias}.${field} ILIKE :${paramName}`;
    });
    
    queryBuilder.andWhere(`(${searchConditions.join(' OR ')})`);
  }

  private applyAdvancedSearch(queryBuilder: SelectQueryBuilder<any>, searchTerm: string, searchFields: string[]): void {
    if (!searchTerm || searchFields.length === 0) return;
    
    // Split search term into words for more flexible matching
    const searchWords = searchTerm.split(/\s+/).filter(word => word.length > 0);
    
    if (searchWords.length === 0) return;
    
    const searchConditions: string[] = [];
    
    searchWords.forEach((word, wordIndex) => {
      const wordConditions = searchFields.map((field, fieldIndex) => {
        const paramName = `search_${wordIndex}_${fieldIndex}`;
        queryBuilder.setParameter(paramName, `%${word}%`);
        return `${queryBuilder.alias}.${field} ILIKE :${paramName}`;
      });
      
      searchConditions.push(`(${wordConditions.join(' OR ')})`);
    });
    
    queryBuilder.andWhere(searchConditions.join(' AND '));
  }

  private applyFilters(queryBuilder: SelectQueryBuilder<any>, filters: Record<string, any>, filterableFields: string[]): void {
    Object.entries(filters).forEach(([field, value]) => {
      if (!filterableFields.includes(field) || value === undefined || value === null) {
        return;
      }
      
      const paramName = `filter_${field}`;
      
      if (Array.isArray(value)) {
        queryBuilder.andWhere(`${queryBuilder.alias}.${field} IN (:...${paramName})`, { [paramName]: value });
      } else if (typeof value === 'string' && value.includes('*')) {
        // Wildcard search
        const likeValue = value.replace(/\*/g, '%');
        queryBuilder.andWhere(`${queryBuilder.alias}.${field} ILIKE :${paramName}`, { [paramName]: likeValue });
      } else if (typeof value === 'object' && value.operator) {
        // Range or comparison filters
        this.applyComparisonFilter(queryBuilder, field, value, paramName);
      } else {
        queryBuilder.andWhere(`${queryBuilder.alias}.${field} = :${paramName}`, { [paramName]: value });
      }
    });
  }

  private applyComparisonFilter(queryBuilder: SelectQueryBuilder<any>, field: string, filter: any, paramName: string): void {
    const { operator, value } = filter;
    
    switch (operator) {
      case 'gt':
        queryBuilder.andWhere(`${queryBuilder.alias}.${field} > :${paramName}`, { [paramName]: value });
        break;
      case 'gte':
        queryBuilder.andWhere(`${queryBuilder.alias}.${field} >= :${paramName}`, { [paramName]: value });
        break;
      case 'lt':
        queryBuilder.andWhere(`${queryBuilder.alias}.${field} < :${paramName}`, { [paramName]: value });
        break;
      case 'lte':
        queryBuilder.andWhere(`${queryBuilder.alias}.${field} <= :${paramName}`, { [paramName]: value });
        break;
      case 'between':
        queryBuilder.andWhere(`${queryBuilder.alias}.${field} BETWEEN :${paramName}_start AND :${paramName}_end`, {
          [`${paramName}_start`]: value[0],
          [`${paramName}_end`]: value[1],
        });
        break;
      case 'in':
        queryBuilder.andWhere(`${queryBuilder.alias}.${field} IN (:...${paramName})`, { [paramName]: value });
        break;
      case 'not':
        queryBuilder.andWhere(`${queryBuilder.alias}.${field} != :${paramName}`, { [paramName]: value });
        break;
    }
  }

  private applySorting(queryBuilder: SelectQueryBuilder<any>, sort: string, order: 'ASC' | 'DESC', sortableFields: string[]): void {
    // Allow sorting by multiple fields
    const sortFields = sort.split(',').map(field => field.trim());
    
    sortFields.forEach((field, index) => {
      if (sortableFields.length === 0 || sortableFields.includes(field)) {
        const sortOrder = order || 'ASC';
        if (index === 0) {
          queryBuilder.orderBy(`${queryBuilder.alias}.${field}`, sortOrder);
        } else {
          queryBuilder.addOrderBy(`${queryBuilder.alias}.${field}`, sortOrder);
        }
      }
    });
  }

  private generatePaginationLinks(
    request: Request,
    query: Required<PaginationQuery>,
    totalPages: number,
  ): PaginationResult<any>['links'] {
    const baseUrl = `${request.protocol}://${request.get('host')}${request.path}`;
    const params = new URLSearchParams(request.query as any);
    
    const links: PaginationResult<any>['links'] = {
      self: `${baseUrl}?${params.toString()}`,
    };
    
    // First page
    if (query.page > 1) {
      params.set('page', '1');
      links.first = `${baseUrl}?${params.toString()}`;
    }
    
    // Previous page
    if (query.page > 1) {
      params.set('page', (query.page - 1).toString());
      links.prev = `${baseUrl}?${params.toString()}`;
    }
    
    // Next page
    if (query.page < totalPages) {
      params.set('page', (query.page + 1).toString());
      links.next = `${baseUrl}?${params.toString()}`;
    }
    
    // Last page
    if (query.page < totalPages) {
      params.set('page', totalPages.toString());
      links.last = `${baseUrl}?${params.toString()}`;
    }
    
    return links;
  }

  private generateCursorPaginationLinks(
    request: Request,
    query: Required<PaginationQuery>,
    nextCursor: string | null,
    prevCursor: string | null,
  ): CursorPaginationResult<any>['links'] {
    const baseUrl = `${request.protocol}://${request.get('host')}${request.path}`;
    const params = new URLSearchParams(request.query as any);
    
    const links: CursorPaginationResult<any>['links'] = {
      self: `${baseUrl}?${params.toString()}`,
    };
    
    // Next page
    if (nextCursor) {
      params.set('cursor', nextCursor);
      links.next = `${baseUrl}?${params.toString()}`;
    }
    
    // Previous page
    if (prevCursor) {
      params.set('cursor', prevCursor);
      links.prev = `${baseUrl}?${params.toString()}`;
    }
    
    return links;
  }

  private encodeCursor(value: any): string {
    return Buffer.from(JSON.stringify(value)).toString('base64');
  }

  private decodeCursor(cursor: string): any {
    try {
      return JSON.parse(Buffer.from(cursor, 'base64').toString());
    } catch (error) {
      throw new BadRequestException('Invalid cursor format');
    }
  }

  /**
   * Extract pagination query from request
   */
  extractPaginationQuery(request: Request): PaginationQuery {
    const query = request.query;
    
    return {
      page: query.page ? parseInt(query.page as string, 10) : undefined,
      limit: query.limit ? parseInt(query.limit as string, 10) : undefined,
      cursor: query.cursor as string,
      sort: query.sort as string,
      order: (query.order as 'ASC' | 'DESC') || 'ASC',
      search: query.search as string,
      filters: this.extractFilters(query),
    };
  }

  private extractFilters(query: any): Record<string, any> {
    const filters: Record<string, any> = {};
    
    Object.entries(query).forEach(([key, value]) => {
      if (key.startsWith('filter_')) {
        const filterKey = key.replace('filter_', '');
        filters[filterKey] = value;
      }
    });
    
    return filters;
  }

  /**
   * Create pagination metadata for response headers
   */
  createPaginationHeaders(pagination: PaginationResult<any>['pagination']): Record<string, string> {
    return {
      'X-Total-Count': pagination.totalCount.toString(),
      'X-Total-Pages': pagination.totalPages.toString(),
      'X-Current-Page': pagination.page.toString(),
      'X-Per-Page': pagination.limit.toString(),
      'X-Has-Next': pagination.hasNext.toString(),
      'X-Has-Prev': pagination.hasPrev.toString(),
    };
  }

  /**
   * Validate pagination parameters
   */
  validatePaginationQuery(query: PaginationQuery, options: Partial<PaginationOptions> = {}): void {
    const opts = { ...this.defaultOptions, ...options };
    
    if (query.page && (query.page < 1 || !Number.isInteger(query.page))) {
      throw new BadRequestException('Page must be a positive integer');
    }
    
    if (query.limit && (query.limit < 1 || query.limit > opts.maxLimit || !Number.isInteger(query.limit))) {
      throw new BadRequestException(`Limit must be between 1 and ${opts.maxLimit}`);
    }
    
    if (query.order && !['ASC', 'DESC'].includes(query.order)) {
      throw new BadRequestException('Order must be ASC or DESC');
    }
    
    if (query.sort && opts.sortableFields && opts.sortableFields.length > 0) {
      const sortFields = query.sort.split(',').map(field => field.trim());
      const invalidFields = sortFields.filter(field => !opts.sortableFields!.includes(field));
      
      if (invalidFields.length > 0) {
        throw new BadRequestException(`Invalid sort fields: ${invalidFields.join(', ')}`);
      }
    }
  }
}
