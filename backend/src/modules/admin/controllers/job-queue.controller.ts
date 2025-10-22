import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../../common/guards/roles.guard';
import { AdminOnly } from '../../../common/decorators/roles.decorator';
import { JobQueueService } from '../../../common/services/job-queue.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

/**
 * Job Queue Management Controller
 * Provides endpoints for managing background job queues and monitoring
 */
@ApiTags('Job Queue Management')
@Controller('admin/job-queue')
@UseGuards(JwtAuthGuard, AdminGuard)
@AdminOnly()
@ApiBearerAuth()
export class JobQueueController {
  constructor(private readonly jobQueueService: JobQueueService) {}

  /**
   * Get all queue metrics
   */
  @Get('metrics')
  @ApiOperation({
    summary: 'Get job queue metrics',
    description: 'Retrieve comprehensive metrics for all job queues',
  })
  @ApiResponse({
    status: 200,
    description: 'Queue metrics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        metrics: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              waiting: { type: 'number', example: 15 },
              active: { type: 'number', example: 3 },
              completed: { type: 'number', example: 1250 },
              failed: { type: 'number', example: 25 },
              delayed: { type: 'number', example: 5 },
              paused: { type: 'boolean', example: false },
              totalProcessed: { type: 'number', example: 1275 },
              throughput: { type: 'number', example: 45 },
              averageProcessingTime: { type: 'number', example: 2500 },
            },
          },
        },
        summary: {
          type: 'object',
          properties: {
            totalQueues: { type: 'number', example: 6 },
            totalJobs: { type: 'number', example: 1298 },
            totalActive: { type: 'number', example: 8 },
            totalFailed: { type: 'number', example: 45 },
            overallThroughput: { type: 'number', example: 180 },
          },
        },
      },
    },
  })
  async getQueueMetrics(): Promise<{
    success: boolean;
    metrics: any;
    summary: any;
  }> {
    const allMetrics = await this.jobQueueService.getAllQueueMetrics();
    
    // Calculate summary statistics
    const summary = {
      totalQueues: Object.keys(allMetrics).length,
      totalJobs: Object.values(allMetrics).reduce((sum, metrics) => sum + metrics.waiting + metrics.active + metrics.completed + metrics.failed, 0),
      totalActive: Object.values(allMetrics).reduce((sum, metrics) => sum + metrics.active, 0),
      totalFailed: Object.values(allMetrics).reduce((sum, metrics) => sum + metrics.failed, 0),
      overallThroughput: Object.values(allMetrics).reduce((sum, metrics) => sum + metrics.throughput, 0),
    };

    return {
      success: true,
      metrics: allMetrics,
      summary,
    };
  }

  /**
   * Get specific queue metrics
   */
  @Get('metrics/:queueName')
  @ApiOperation({
    summary: 'Get specific queue metrics',
    description: 'Retrieve detailed metrics for a specific job queue',
  })
  @ApiResponse({
    status: 200,
    description: 'Queue metrics retrieved successfully',
  })
  async getSpecificQueueMetrics(
    @Param('queueName') queueName: string,
  ): Promise<{
    success: boolean;
    queueName: string;
    metrics: any;
  }> {
    const metrics = await this.jobQueueService.getQueueMetrics(queueName);
    
    if (!metrics) {
      return {
        success: false,
        queueName,
        metrics: null,
      };
    }

    return {
      success: true,
      queueName,
      metrics,
    };
  }

  /**
   * Add job to queue
   */
  @Post('jobs')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add job to queue',
    description: 'Add a new job to a specific queue',
  })
  @ApiResponse({
    status: 201,
    description: 'Job added successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        job: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '12345' },
            queueName: { type: 'string', example: 'email' },
            jobType: { type: 'string', example: 'welcome-email' },
            status: { type: 'string', example: 'waiting' },
            createdAt: { type: 'string', example: '2024-01-15T10:30:00Z' },
          },
        },
      },
    },
  })
  async addJob(
    @Body() body: {
      queueName: string;
      jobType: string;
      data: any;
      options?: {
        priority?: number;
        delay?: number;
        attempts?: number;
      };
    },
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<{
    success: boolean;
    job: any;
  }> {
    const { queueName, jobType, data, options = {} } = body;
    
    const job = await this.jobQueueService.addJob(queueName, jobType, data, options);

    return {
      success: true,
      job: {
        id: job.id,
        queueName,
        jobType,
        status: await job.getState(),
        createdAt: new Date(job.timestamp),
        priority: job.opts.priority,
        delay: job.opts.delay,
      },
    };
  }

  /**
   * Add bulk jobs to queue
   */
  @Post('jobs/bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add bulk jobs to queue',
    description: 'Add multiple jobs to a queue at once',
  })
  @ApiResponse({
    status: 201,
    description: 'Bulk jobs added successfully',
  })
  async addBulkJobs(
    @Body() body: {
      queueName: string;
      jobs: Array<{
        type: string;
        data: any;
        options?: any;
      }>;
    },
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<{
    success: boolean;
    addedJobs: number;
    jobs: any[];
  }> {
    const { queueName, jobs } = body;
    
    const addedJobs = await this.jobQueueService.addBulkJobs(queueName, jobs);

    return {
      success: true,
      addedJobs: addedJobs.length,
      jobs: addedJobs.map(job => ({
        id: job.id,
        type: job.name,
        status: 'waiting',
        createdAt: new Date(job.timestamp),
      })),
    };
  }

  /**
   * Schedule recurring job
   */
  @Post('jobs/schedule')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Schedule recurring job',
    description: 'Schedule a job to run on a recurring basis using cron expression',
  })
  @ApiResponse({
    status: 201,
    description: 'Recurring job scheduled successfully',
  })
  async scheduleRecurringJob(
    @Body() body: {
      queueName: string;
      jobType: string;
      data: any;
      cronExpression: string;
      options?: any;
    },
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<{
    success: boolean;
    job: any;
  }> {
    const { queueName, jobType, data, cronExpression, options = {} } = body;
    
    const job = await this.jobQueueService.scheduleRecurringJob(
      queueName,
      jobType,
      data,
      cronExpression,
      options
    );

    return {
      success: true,
      job: {
        id: job.id,
        queueName,
        jobType,
        cronExpression,
        status: await job.getState(),
        // nextRun: job.opts.repeat?.cron,
      },
    };
  }

  /**
   * Get job details
   */
  @Get('jobs/:queueName/:jobId')
  @ApiOperation({
    summary: 'Get job details',
    description: 'Retrieve detailed information about a specific job',
  })
  @ApiResponse({
    status: 200,
    description: 'Job details retrieved successfully',
  })
  async getJobDetails(
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
  ): Promise<{
    success: boolean;
    job: any;
  }> {
    const job = await this.jobQueueService.getJob(queueName, jobId);
    
    if (!job) {
      return {
        success: false,
        job: null,
      };
    }

    const jobDetails = {
      id: job.id,
      name: job.name,
      data: job.data,
      opts: job.opts,
      progress: job.progress(),
      state: await job.getState(),
      createdAt: new Date(job.timestamp),
      processedOn: job.processedOn ? new Date(job.processedOn) : null,
      finishedOn: job.finishedOn ? new Date(job.finishedOn) : null,
      failedReason: job.failedReason,
      returnvalue: job.returnvalue,
      attemptsMade: job.attemptsMade,
    };

    return {
      success: true,
      job: jobDetails,
    };
  }

  /**
   * Get job logs
   */
  @Get('jobs/:queueName/:jobId/logs')
  @ApiOperation({
    summary: 'Get job logs',
    description: 'Retrieve logs for a specific job',
  })
  @ApiResponse({
    status: 200,
    description: 'Job logs retrieved successfully',
  })
  async getJobLogs(
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
  ): Promise<{
    success: boolean;
    logs: string[];
    count: number;
  }> {
    const { logs, count } = await this.jobQueueService.getJobLogs(queueName, jobId);

    return {
      success: true,
      logs,
      count,
    };
  }

  /**
   * Get failed jobs
   */
  @Get('failed/:queueName')
  @ApiOperation({
    summary: 'Get failed jobs',
    description: 'Retrieve list of failed jobs for a specific queue',
  })
  @ApiQuery({
    name: 'start',
    required: false,
    type: Number,
    description: 'Start index for pagination',
  })
  @ApiQuery({
    name: 'end',
    required: false,
    type: Number,
    description: 'End index for pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Failed jobs retrieved successfully',
  })
  async getFailedJobs(
    @Param('queueName') queueName: string,
    @Query('start') start: number = 0,
    @Query('end') end: number = 50,
  ): Promise<{
    success: boolean;
    failedJobs: any[];
    total: number;
  }> {
    const failedJobs = await this.jobQueueService.getFailedJobs(queueName, start, end);
    
    const jobDetails = await Promise.all(
      failedJobs.map(async (job) => ({
        id: job.id,
        name: job.name,
        data: job.data,
        failedReason: job.failedReason,
        failedAt: job.finishedOn ? new Date(job.finishedOn) : null,
        attemptsMade: job.attemptsMade,
        maxAttempts: job.opts.attempts,
      }))
    );

    return {
      success: true,
      failedJobs: jobDetails,
      total: failedJobs.length,
    };
  }

  /**
   * Retry failed job
   */
  @Post('jobs/:queueName/:jobId/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Retry failed job',
    description: 'Retry a failed job',
  })
  @ApiResponse({
    status: 200,
    description: 'Job retry initiated successfully',
  })
  async retryJob(
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    await this.jobQueueService.retryJob(queueName, jobId);

    return {
      success: true,
      message: `Job ${jobId} retry initiated`,
    };
  }

  /**
   * Remove job
   */
  @Delete('jobs/:queueName/:jobId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove job',
    description: 'Remove a job from the queue',
  })
  @ApiResponse({
    status: 200,
    description: 'Job removed successfully',
  })
  async removeJob(
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    await this.jobQueueService.removeJob(queueName, jobId);

    return {
      success: true,
      message: `Job ${jobId} removed successfully`,
    };
  }

  /**
   * Pause queue
   */
  @Post('queues/:queueName/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Pause queue',
    description: 'Pause job processing for a specific queue',
  })
  @ApiResponse({
    status: 200,
    description: 'Queue paused successfully',
  })
  async pauseQueue(
    @Param('queueName') queueName: string,
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    await this.jobQueueService.pauseQueue(queueName);

    return {
      success: true,
      message: `Queue '${queueName}' paused successfully`,
    };
  }

  /**
   * Resume queue
   */
  @Post('queues/:queueName/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resume queue',
    description: 'Resume job processing for a specific queue',
  })
  @ApiResponse({
    status: 200,
    description: 'Queue resumed successfully',
  })
  async resumeQueue(
    @Param('queueName') queueName: string,
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    await this.jobQueueService.resumeQueue(queueName);

    return {
      success: true,
      message: `Queue '${queueName}' resumed successfully`,
    };
  }

  /**
   * Clean queue
   */
  @Post('queues/:queueName/clean')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Clean queue',
    description: 'Clean completed, failed, or other job states from a queue',
  })
  @ApiResponse({
    status: 200,
    description: 'Queue cleaned successfully',
  })
  async cleanQueue(
    @Param('queueName') queueName: string,
    @Body() body: {
      grace?: number;
      status?: 'completed' | 'failed' | 'active' | 'waiting';
      limit?: number;
    },
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<{
    success: boolean;
    message: string;
    cleanedJobs: number;
  }> {
    const { grace = 0, status = 'completed', limit = 100 } = body;
    
    const cleanedJobs = await this.jobQueueService.cleanQueue(queueName, grace, status, limit);

    return {
      success: true,
      message: `Cleaned ${cleanedJobs.length} ${status} jobs from queue '${queueName}'`,
      cleanedJobs: cleanedJobs.length,
    };
  }

  /**
   * Get queue health status
   */
  @Get('health')
  @ApiOperation({
    summary: 'Get queue health status',
    description: 'Get overall health status of all job queues',
  })
  @ApiResponse({
    status: 200,
    description: 'Queue health status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        healthy: { type: 'boolean', example: true },
        queues: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              status: { type: 'string', example: 'healthy' },
              issues: { type: 'array', items: { type: 'string' } },
            },
          },
        },
        summary: {
          type: 'object',
          properties: {
            totalQueues: { type: 'number', example: 6 },
            healthyQueues: { type: 'number', example: 5 },
            warningQueues: { type: 'number', example: 1 },
            errorQueues: { type: 'number', example: 0 },
          },
        },
      },
    },
  })
  async getQueueHealth(): Promise<{
    success: boolean;
    healthy: boolean;
    queues: any;
    summary: any;
  }> {
    const healthCheck = await this.jobQueueService.healthCheck();
    
    // Calculate summary
    const queueStatuses = Object.values(healthCheck.queues);
    const summary = {
      totalQueues: queueStatuses.length,
      healthyQueues: queueStatuses.filter((q: any) => q.status === 'healthy').length,
      warningQueues: queueStatuses.filter((q: any) => q.status === 'warning').length,
      errorQueues: queueStatuses.filter((q: any) => q.status === 'error').length,
    };

    return {
      success: true,
      healthy: healthCheck.healthy,
      queues: healthCheck.queues,
      summary,
    };
  }

  /**
   * Get queue statistics
   */
  @Get('statistics')
  @ApiOperation({
    summary: 'Get queue statistics',
    description: 'Get comprehensive statistics about job queue performance',
  })
  @ApiResponse({
    status: 200,
    description: 'Queue statistics retrieved successfully',
  })
  async getQueueStatistics(): Promise<{
    success: boolean;
    statistics: any;
  }> {
    const allMetrics = await this.jobQueueService.getAllQueueMetrics();
    
    // Calculate comprehensive statistics
    const statistics = {
      overview: {
        totalQueues: Object.keys(allMetrics).length,
        totalJobsProcessed: Object.values(allMetrics).reduce((sum, m) => sum + m.totalProcessed, 0),
        totalActiveJobs: Object.values(allMetrics).reduce((sum, m) => sum + m.active, 0),
        totalFailedJobs: Object.values(allMetrics).reduce((sum, m) => sum + m.failed, 0),
        overallThroughput: Object.values(allMetrics).reduce((sum, m) => sum + m.throughput, 0),
      },
      performance: {
        averageProcessingTime: this.calculateAverageProcessingTime(allMetrics),
        fastestQueue: this.getFastestQueue(allMetrics),
        slowestQueue: this.getSlowestQueue(allMetrics),
        mostActiveQueue: this.getMostActiveQueue(allMetrics),
      },
      trends: {
        hourlyThroughput: this.generateHourlyThroughput(),
        dailyJobCounts: this.generateDailyJobCounts(),
        errorRates: this.calculateErrorRates(allMetrics),
      },
      recommendations: this.generateRecommendations(allMetrics),
    };

    return {
      success: true,
      statistics,
    };
  }

  // Private helper methods

  private calculateAverageProcessingTime(allMetrics: any): number {
    const metrics = Object.values(allMetrics) as any[];
    const totalTime = metrics.reduce((sum, m) => sum + m.averageProcessingTime, 0);
    return metrics.length > 0 ? Math.round(totalTime / metrics.length) : 0;
  }

  private getFastestQueue(allMetrics: any): { name: string; time: number } {
    let fastest = { name: '', time: Infinity };
    
    Object.entries(allMetrics).forEach(([name, metrics]: [string, any]) => {
      if (metrics.averageProcessingTime < fastest.time) {
        fastest = { name, time: metrics.averageProcessingTime };
      }
    });
    
    return fastest.time === Infinity ? { name: 'N/A', time: 0 } : fastest;
  }

  private getSlowestQueue(allMetrics: any): { name: string; time: number } {
    let slowest = { name: '', time: 0 };
    
    Object.entries(allMetrics).forEach(([name, metrics]: [string, any]) => {
      if (metrics.averageProcessingTime > slowest.time) {
        slowest = { name, time: metrics.averageProcessingTime };
      }
    });
    
    return slowest;
  }

  private getMostActiveQueue(allMetrics: any): { name: string; active: number } {
    let mostActive = { name: '', active: 0 };
    
    Object.entries(allMetrics).forEach(([name, metrics]: [string, any]) => {
      if (metrics.active > mostActive.active) {
        mostActive = { name, active: metrics.active };
      }
    });
    
    return mostActive;
  }

  private generateHourlyThroughput(): number[] {
    // Mock hourly throughput data for the last 24 hours
    return Array.from({ length: 24 }, () => Math.floor(Math.random() * 50) + 10);
  }

  private generateDailyJobCounts(): number[] {
    // Mock daily job counts for the last 7 days
    return Array.from({ length: 7 }, () => Math.floor(Math.random() * 1000) + 500);
  }

  private calculateErrorRates(allMetrics: any): Record<string, number> {
    const errorRates: Record<string, number> = {};
    
    Object.entries(allMetrics).forEach(([name, metrics]: [string, any]) => {
      const totalJobs = metrics.completed + metrics.failed;
      errorRates[name] = totalJobs > 0 ? (metrics.failed / totalJobs) * 100 : 0;
    });
    
    return errorRates;
  }

  private generateRecommendations(allMetrics: any): string[] {
    const recommendations: string[] = [];
    
    Object.entries(allMetrics).forEach(([name, metrics]: [string, any]) => {
      if (metrics.failed > 10) {
        recommendations.push(`Queue '${name}' has high failure rate - investigate error patterns`);
      }
      
      if (metrics.averageProcessingTime > 10000) {
        recommendations.push(`Queue '${name}' has slow processing times - consider optimization`);
      }
      
      if (metrics.waiting > 100) {
        recommendations.push(`Queue '${name}' has many waiting jobs - consider increasing concurrency`);
      }
    });
    
    if (recommendations.length === 0) {
      recommendations.push('All queues are performing within normal parameters');
    }
    
    return recommendations;
  }
}
