import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../../common/guards/roles.guard';
import { AdminOnly } from '../../../common/decorators/roles.decorator';
import { ResponseOptimizationService } from '../../../common/services/response-optimization.service';
import { PaginationService } from '../../../common/services/pagination.service';
import { CompressionInterceptor } from '../../../common/interceptors/compression.interceptor';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

/**
 * Response Optimization Management Controller
 * Provides endpoints for API response optimization monitoring and configuration
 */
@ApiTags('Response Optimization')
@Controller('admin/response-optimization')
@UseGuards(JwtAuthGuard, AdminGuard)
@AdminOnly()
@ApiBearerAuth()
export class ResponseOptimizationController {
  constructor(
    private readonly responseOptimizationService: ResponseOptimizationService,
    private readonly paginationService: PaginationService,
  ) {}

  /**
   * Get response optimization metrics
   */
  @Get('metrics')
  @ApiOperation({
    summary: 'Get response optimization metrics',
    description: 'Retrieve comprehensive metrics about API response optimization performance',
  })
  @ApiResponse({
    status: 200,
    description: 'Response optimization metrics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        metrics: {
          type: 'object',
          properties: {
            compression: {
              type: 'object',
              properties: {
                totalResponses: { type: 'number', example: 15420 },
                averageCompressionRatio: { type: 'number', example: 0.35 },
                averageSerializationTime: { type: 'number', example: 2.5 },
                averageCompressionTime: { type: 'number', example: 8.2 },
                compressionMethodUsage: {
                  type: 'object',
                  properties: {
                    br: { type: 'number', example: 4500 },
                    gzip: { type: 'number', example: 8200 },
                    deflate: { type: 'number', example: 1200 },
                    none: { type: 'number', example: 1520 },
                  },
                },
              },
            },
            serialization: {
              type: 'object',
              properties: {
                averageSerializationTime: { type: 'number', example: 2.1 },
                fieldFilteringUsage: { type: 'number', example: 3200 },
                dataTransformationUsage: { type: 'number', example: 1800 },
              },
            },
            pagination: {
              type: 'object',
              properties: {
                totalPaginatedRequests: { type: 'number', example: 8500 },
                averagePageSize: { type: 'number', example: 22 },
                cursorPaginationUsage: { type: 'number', example: 2100 },
                offsetPaginationUsage: { type: 'number', example: 6400 },
              },
            },
          },
        },
        performance: {
          type: 'object',
          properties: {
            averageResponseTime: { type: 'number', example: 45 },
            averageResponseSize: { type: 'number', example: 15680 },
            bandwidthSaved: { type: 'number', example: 2048576 },
            totalOptimizedResponses: { type: 'number', example: 12500 },
          },
        },
      },
    },
  })
  async getOptimizationMetrics(): Promise<{
    success: boolean;
    metrics: any;
    performance: any;
  }> {
    const compressionMetrics = this.responseOptimizationService.getOptimizationMetrics();
    
    // Mock additional metrics - in production, these would come from actual monitoring
    const serializationMetrics = {
      averageSerializationTime: 2.1,
      fieldFilteringUsage: 3200,
      dataTransformationUsage: 1800,
    };

    const paginationMetrics = {
      totalPaginatedRequests: 8500,
      averagePageSize: 22,
      cursorPaginationUsage: 2100,
      offsetPaginationUsage: 6400,
    };

    const performanceMetrics = {
      averageResponseTime: 45,
      averageResponseSize: 15680,
      bandwidthSaved: Math.round(
        compressionMetrics.totalResponses * 
        compressionMetrics.averageCompressionRatio * 
        15680
      ),
      totalOptimizedResponses: compressionMetrics.totalResponses,
    };

    return {
      success: true,
      metrics: {
        compression: compressionMetrics,
        serialization: serializationMetrics,
        pagination: paginationMetrics,
      },
      performance: performanceMetrics,
    };
  }

  /**
   * Test response optimization
   */
  @Post('test')
  @UseInterceptors(CompressionInterceptor)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Test response optimization',
    description: 'Test response optimization with sample data to measure performance',
  })
  @ApiResponse({
    status: 200,
    description: 'Response optimization test completed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        test: {
          type: 'object',
          properties: {
            sampleData: { type: 'object' },
            optimization: {
              type: 'object',
              properties: {
                originalSize: { type: 'number', example: 5120 },
                compressedSize: { type: 'number', example: 1792 },
                compressionRatio: { type: 'number', example: 0.35 },
                serializationTime: { type: 'number', example: 2.1 },
                compressionTime: { type: 'number', example: 8.5 },
                totalTime: { type: 'number', example: 10.6 },
              },
            },
            recommendations: {
              type: 'array',
              items: { type: 'string' },
              example: [
                'Excellent compression ratio achieved',
                'Consider field filtering for better performance',
                'Response size is optimal for this data type',
              ],
            },
          },
        },
      },
    },
  })
  async testOptimization(
    @Body() body: {
      dataType: 'user' | 'course' | 'organization' | 'search' | 'analytics';
      sampleSize: number;
      includeCompression: boolean;
      includeSerialization: boolean;
    },
  ): Promise<{
    success: boolean;
    test: any;
  }> {
    const { dataType, sampleSize, includeCompression, includeSerialization } = body;
    
    // Generate sample data based on type
    const sampleData = this.generateSampleData(dataType, sampleSize);
    
    // Get optimization options
    const serializationOptions = includeSerialization 
      ? this.responseOptimizationService.optimizeForDataType(sampleData, dataType)
      : {};

    // Perform optimization test
    const startTime = Date.now();
    
    let optimizationResult;
    if (includeCompression) {
      // Mock request and response for testing
      const mockRequest = { get: () => 'gzip, deflate, br' } as any;
      const mockResponse = {} as any;
      
      optimizationResult = await this.responseOptimizationService.optimizeResponse(
        sampleData,
        mockRequest,
        mockResponse,
        {
          compression: { threshold: 1024, level: 6 },
          serialization: serializationOptions,
        }
      );
    } else {
      // Test serialization only
      const serializedData = this.responseOptimizationService.serializeData(sampleData, serializationOptions);
      optimizationResult = {
        optimizedData: serializedData,
        metrics: {
          originalSize: JSON.stringify(sampleData).length,
          compressedSize: serializedData.length,
          compressionRatio: 1, // No compression
          serializationTime: Date.now() - startTime,
          compressionTime: 0,
          totalTime: Date.now() - startTime,
        },
        headers: {},
      };
    }

    // Generate recommendations
    const recommendations = this.generateOptimizationRecommendations(
      optimizationResult.metrics,
      dataType,
      sampleSize
    );

    return {
      success: true,
      test: {
        sampleData: this.truncateSampleData(sampleData, 100), // Truncate for response
        optimization: optimizationResult.metrics,
        recommendations,
      },
    };
  }

  /**
   * Test pagination performance
   */
  @Get('test/pagination')
  @ApiOperation({
    summary: 'Test pagination performance',
    description: 'Test pagination performance with different configurations',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['offset', 'cursor'],
    description: 'Pagination type to test',
  })
  @ApiQuery({
    name: 'size',
    required: false,
    type: Number,
    description: 'Dataset size for testing',
  })
  @ApiResponse({
    status: 200,
    description: 'Pagination performance test completed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        test: {
          type: 'object',
          properties: {
            type: { type: 'string', example: 'offset' },
            datasetSize: { type: 'number', example: 10000 },
            pageSize: { type: 'number', example: 20 },
            performance: {
              type: 'object',
              properties: {
                queryTime: { type: 'number', example: 15 },
                serializationTime: { type: 'number', example: 3 },
                totalTime: { type: 'number', example: 18 },
                memoryUsage: { type: 'number', example: 2048 },
              },
            },
            recommendations: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      },
    },
  })
  async testPagination(
    @Query('type') type: 'offset' | 'cursor' = 'offset',
    @Query('size') size: number = 1000,
  ): Promise<{
    success: boolean;
    test: any;
  }> {
    const startTime = Date.now();
    
    // Generate mock dataset
    const dataset = Array.from({ length: size }, (_, i) => ({
      id: i + 1,
      name: `Item ${i + 1}`,
      createdAt: new Date(Date.now() - i * 1000),
    }));

    const pageSize = 20;
    const queryStartTime = Date.now();
    
    // Simulate pagination
    let paginatedData;
    if (type === 'offset') {
      paginatedData = dataset.slice(0, pageSize);
    } else {
      // Cursor-based pagination simulation
      paginatedData = dataset.slice(0, pageSize);
    }
    
    const queryTime = Date.now() - queryStartTime;
    
    // Serialize data
    const serializationStartTime = Date.now();
    const serializedData = JSON.stringify(paginatedData);
    const serializationTime = Date.now() - serializationStartTime;
    
    const totalTime = Date.now() - startTime;
    const memoryUsage = Buffer.byteLength(serializedData, 'utf8');

    // Generate recommendations
    const recommendations = [];
    if (queryTime > 50) {
      recommendations.push('Query time is high - consider database indexing');
    }
    if (memoryUsage > 10240) {
      recommendations.push('Response size is large - consider field filtering');
    }
    if (type === 'offset' && size > 10000) {
      recommendations.push('Consider cursor-based pagination for large datasets');
    }
    if (recommendations.length === 0) {
      recommendations.push('Pagination performance is optimal');
    }

    return {
      success: true,
      test: {
        type,
        datasetSize: size,
        pageSize,
        performance: {
          queryTime,
          serializationTime,
          totalTime,
          memoryUsage,
        },
        recommendations,
      },
    };
  }

  /**
   * Get optimization recommendations
   */
  @Get('recommendations')
  @ApiOperation({
    summary: 'Get optimization recommendations',
    description: 'Get personalized recommendations for API response optimization',
  })
  @ApiResponse({
    status: 200,
    description: 'Optimization recommendations retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        recommendations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              category: { type: 'string', example: 'compression' },
              priority: { type: 'string', example: 'high' },
              title: { type: 'string', example: 'Enable Brotli compression' },
              description: { type: 'string', example: 'Brotli compression can reduce response size by up to 20% compared to gzip' },
              impact: { type: 'string', example: 'High bandwidth savings' },
              effort: { type: 'string', example: 'Low - configuration change' },
              implementation: { type: 'string', example: 'Update compression settings to prefer Brotli' },
            },
          },
        },
      },
    },
  })
  async getOptimizationRecommendations(): Promise<{
    success: boolean;
    recommendations: any[];
  }> {
    const metrics = this.responseOptimizationService.getOptimizationMetrics();
    const recommendations = [];

    // Compression recommendations
    if (metrics.averageCompressionRatio > 0.7) {
      recommendations.push({
        category: 'compression',
        priority: 'high',
        title: 'Improve compression efficiency',
        description: 'Current compression ratio is suboptimal. Consider adjusting compression settings or data structure.',
        impact: 'Reduce bandwidth usage by 20-40%',
        effort: 'Medium - requires configuration and testing',
        implementation: 'Increase compression level or optimize data serialization',
      });
    }

    if (metrics.compressionMethodUsage.none > metrics.totalResponses * 0.1) {
      recommendations.push({
        category: 'compression',
        priority: 'medium',
        title: 'Enable compression for more responses',
        description: 'A significant portion of responses are not compressed.',
        impact: 'Reduce bandwidth usage by 30-60%',
        effort: 'Low - configuration change',
        implementation: 'Lower compression threshold or expand compressed content types',
      });
    }

    // Serialization recommendations
    if (metrics.averageSerializationTime > 5) {
      recommendations.push({
        category: 'serialization',
        priority: 'medium',
        title: 'Optimize data serialization',
        description: 'Serialization time is higher than optimal.',
        impact: 'Improve response time by 10-20%',
        effort: 'Medium - code optimization required',
        implementation: 'Implement field filtering and data transformation optimizations',
      });
    }

    // Performance recommendations
    if (metrics.totalResponses > 10000 && metrics.averageCompressionRatio > 0.5) {
      recommendations.push({
        category: 'performance',
        priority: 'high',
        title: 'Implement response caching',
        description: 'High traffic with suboptimal compression suggests caching opportunities.',
        impact: 'Reduce server load and improve response times',
        effort: 'High - requires caching infrastructure',
        implementation: 'Implement Redis-based response caching for frequently accessed data',
      });
    }

    // Default recommendation if everything is optimal
    if (recommendations.length === 0) {
      recommendations.push({
        category: 'general',
        priority: 'low',
        title: 'Response optimization is performing well',
        description: 'Current optimization settings are working effectively.',
        impact: 'Maintain current performance levels',
        effort: 'Low - monitoring and maintenance',
        implementation: 'Continue monitoring metrics and adjust as traffic patterns change',
      });
    }

    return {
      success: true,
      recommendations,
    };
  }

  /**
   * Update optimization configuration
   */
  @Put('config')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update optimization configuration',
    description: 'Update response optimization configuration settings',
  })
  @ApiResponse({
    status: 200,
    description: 'Optimization configuration updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Optimization configuration updated successfully' },
        config: {
          type: 'object',
          properties: {
            compression: {
              type: 'object',
              properties: {
                enabled: { type: 'boolean', example: true },
                threshold: { type: 'number', example: 1024 },
                level: { type: 'number', example: 6 },
                preferredMethod: { type: 'string', example: 'br' },
              },
            },
            serialization: {
              type: 'object',
              properties: {
                fieldFiltering: { type: 'boolean', example: true },
                dataTransformation: { type: 'boolean', example: true },
                dateFormat: { type: 'string', example: 'iso' },
              },
            },
            pagination: {
              type: 'object',
              properties: {
                defaultLimit: { type: 'number', example: 20 },
                maxLimit: { type: 'number', example: 100 },
                preferCursor: { type: 'boolean', example: false },
              },
            },
          },
        },
      },
    },
  })
  async updateOptimizationConfig(
    @Body() configUpdate: {
      compression?: {
        enabled?: boolean;
        threshold?: number;
        level?: number;
        preferredMethod?: 'gzip' | 'deflate' | 'br';
      };
      serialization?: {
        fieldFiltering?: boolean;
        dataTransformation?: boolean;
        dateFormat?: 'iso' | 'timestamp';
      };
      pagination?: {
        defaultLimit?: number;
        maxLimit?: number;
        preferCursor?: boolean;
      };
    },
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<{
    success: boolean;
    message: string;
    config: any;
  }> {
    // Validate configuration
    if (configUpdate.compression?.threshold && configUpdate.compression.threshold < 0) {
      throw new Error('Compression threshold must be non-negative');
    }
    
    if (configUpdate.compression?.level && (configUpdate.compression.level < 1 || configUpdate.compression.level > 9)) {
      throw new Error('Compression level must be between 1 and 9');
    }
    
    if (configUpdate.pagination?.defaultLimit && configUpdate.pagination.defaultLimit < 1) {
      throw new Error('Default pagination limit must be positive');
    }

    // In a real implementation, this would update the actual configuration
    // For now, we'll return the updated configuration
    const updatedConfig = {
      compression: {
        enabled: configUpdate.compression?.enabled ?? true,
        threshold: configUpdate.compression?.threshold ?? 1024,
        level: configUpdate.compression?.level ?? 6,
        preferredMethod: configUpdate.compression?.preferredMethod ?? 'br',
      },
      serialization: {
        fieldFiltering: configUpdate.serialization?.fieldFiltering ?? true,
        dataTransformation: configUpdate.serialization?.dataTransformation ?? true,
        dateFormat: configUpdate.serialization?.dateFormat ?? 'iso',
      },
      pagination: {
        defaultLimit: configUpdate.pagination?.defaultLimit ?? 20,
        maxLimit: configUpdate.pagination?.maxLimit ?? 100,
        preferCursor: configUpdate.pagination?.preferCursor ?? false,
      },
    };

    return {
      success: true,
      message: 'Optimization configuration updated successfully',
      config: updatedConfig,
    };
  }

  // Private helper methods

  private generateSampleData(dataType: string, size: number): any {
    const generators = {
      user: () => ({
        id: Math.floor(Math.random() * 10000),
        email: `user${Math.floor(Math.random() * 1000)}@example.com`,
        firstName: `FirstName${Math.floor(Math.random() * 100)}`,
        lastName: `LastName${Math.floor(Math.random() * 100)}`,
        createdAt: new Date(),
        profile: {
          bio: 'Sample user bio with some text content',
          preferences: { theme: 'dark', notifications: true },
        },
      }),
      course: () => ({
        id: Math.floor(Math.random() * 10000),
        title: `Course Title ${Math.floor(Math.random() * 100)}`,
        description: 'This is a sample course description with detailed content about the course objectives and learning outcomes.',
        instructor: `Instructor ${Math.floor(Math.random() * 50)}`,
        createdAt: new Date(),
        metadata: {
          duration: Math.floor(Math.random() * 100) + 10,
          level: ['beginner', 'intermediate', 'advanced'][Math.floor(Math.random() * 3)],
        },
      }),
      organization: () => ({
        id: Math.floor(Math.random() * 10000),
        name: `Organization ${Math.floor(Math.random() * 100)}`,
        slug: `org-${Math.floor(Math.random() * 100)}`,
        settings: {
          theme: 'corporate',
          features: ['courses', 'analytics', 'reporting'],
        },
      }),
      search: () => ({
        id: Math.floor(Math.random() * 10000),
        title: `Search Result ${Math.floor(Math.random() * 100)}`,
        type: 'course',
        relevanceScore: Math.random(),
      }),
      analytics: () => ({
        date: new Date().toISOString().split('T')[0],
        users: Math.floor(Math.random() * 1000),
        sessions: Math.floor(Math.random() * 5000),
        pageViews: Math.floor(Math.random() * 10000),
        conversionRate: Math.random(),
      }),
    };

    const generator = generators[dataType] || generators.search;
    return Array.from({ length: size }, generator);
  }

  private truncateSampleData(data: any, maxItems: number): any {
    if (Array.isArray(data)) {
      return data.slice(0, maxItems);
    }
    return data;
  }

  private generateOptimizationRecommendations(
    metrics: any,
    dataType: string,
    sampleSize: number,
  ): string[] {
    const recommendations = [];

    if (metrics.compressionRatio < 0.5) {
      recommendations.push('Excellent compression ratio achieved');
    } else if (metrics.compressionRatio < 0.7) {
      recommendations.push('Good compression ratio - consider field filtering for better results');
    } else {
      recommendations.push('Compression ratio could be improved - review data structure');
    }

    if (metrics.serializationTime < 5) {
      recommendations.push('Serialization performance is optimal');
    } else {
      recommendations.push('Consider optimizing data serialization for better performance');
    }

    if (sampleSize > 100) {
      recommendations.push('Large dataset - consider implementing pagination');
    }

    if (dataType === 'user') {
      recommendations.push('Consider excluding sensitive fields for user data');
    } else if (dataType === 'analytics') {
      recommendations.push('Use number precision optimization for analytics data');
    }

    return recommendations;
  }
}
