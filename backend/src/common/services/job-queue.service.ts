import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import  Bull from 'bull';

export interface JobOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
  removeOnComplete?: number;
  removeOnFail?: number;
  timeout?: number;
  repeat?: {
    cron?: string;
    every?: number;
    limit?: number;
  };
}

export interface JobData {
  type: string;
  payload: any;
  userId?: string;
  organizationId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
  completedAt: Date;
}

export interface QueueMetrics {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
  totalProcessed: number;
  throughput: number;
  averageProcessingTime: number;
}

/**
 * Comprehensive Job Queue Service
 * Provides robust background job processing with Redis/Bull integration
 */
@Injectable()
export class JobQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobQueueService.name);
  private readonly queues: Map<string, Bull.Queue> = new Map();
  private readonly processors: Map<string, Function> = new Map();
  private readonly queueMetrics: Map<string, QueueMetrics> = new Map();

  // Predefined queue configurations
  private readonly queueConfigs = {
    email: {
      name: 'email-queue',
      concurrency: 5,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential' as const, delay: 2000 },
        removeOnComplete: 50,
        removeOnFail: 20,
      },
    },
    notifications: {
      name: 'notifications-queue',
      concurrency: 10,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'fixed' as const, delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    },
    fileProcessing: {
      name: 'file-processing-queue',
      concurrency: 2,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential' as const, delay: 5000 },
        removeOnComplete: 10,
        removeOnFail: 10,
        timeout: 300000, // 5 minutes
      },
    },
    analytics: {
      name: 'analytics-queue',
      concurrency: 3,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'fixed' as const, delay: 3000 },
        removeOnComplete: 20,
        removeOnFail: 10,
      },
    },
    reports: {
      name: 'reports-queue',
      concurrency: 1,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential' as const, delay: 10000 },
        removeOnComplete: 5,
        removeOnFail: 5,
        timeout: 600000, // 10 minutes
      },
    },
    cleanup: {
      name: 'cleanup-queue',
      concurrency: 1,
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: 5,
        removeOnFail: 5,
      },
    },
  };

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    await this.initializeQueues();
    this.setupEventListeners();
    this.startMetricsCollection();
  }

  async onModuleDestroy() {
    await this.closeAllQueues();
  }

  /**
   * Add job to queue
   */
  async addJob<T = any>(
    queueName: string,
    jobType: string,
    data: T,
    options: JobOptions = {},
  ): Promise<Bull.Job> {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    const jobData: JobData = {
      type: jobType,
      payload: data,
      createdAt: new Date(),
      ...options,
    };

    const job = await queue.add(jobType, jobData, {
      ...this.queueConfigs[queueName]?.defaultJobOptions,
      ...options,
    });

    this.logger.log(`Job ${job.id} added to queue '${queueName}' with type '${jobType}'`);
    
    // Emit job added event
    this.eventEmitter.emit('job.added', {
      queueName,
      jobId: job.id,
      jobType,
      data: jobData,
    });

    return job;
  }

  /**
   * Add bulk jobs to queue
   */
  async addBulkJobs<T = any>(
    queueName: string,
    jobs: Array<{
      type: string;
      data: T;
      options?: JobOptions;
    }>,
  ): Promise<Bull.Job[]> {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    const bulkJobs = jobs.map(({ type, data, options = {} }) => ({
      name: type,
      data: {
        type,
        payload: data,
        createdAt: new Date(),
        ...options,
      } as JobData,
      opts: {
        ...this.queueConfigs[queueName]?.defaultJobOptions,
        ...options,
      },
    }));

    const addedJobs = await queue.addBulk(bulkJobs);
    
    this.logger.log(`${addedJobs.length} bulk jobs added to queue '${queueName}'`);
    
    return addedJobs;
  }

  /**
   * Schedule recurring job
   */
  async scheduleRecurringJob<T = any>(
    queueName: string,
    jobType: string,
    data: T,
    cronExpression: string,
    options: Omit<JobOptions, 'repeat'> = {},
  ): Promise<Bull.Job> {
    return this.addJob(queueName, jobType, data, {
      ...options,
      repeat: { cron: cronExpression },
    });
  }

  /**
   * Schedule delayed job
   */
  async scheduleDelayedJob<T = any>(
    queueName: string,
    jobType: string,
    data: T,
    delayMs: number,
    options: Omit<JobOptions, 'delay'> = {},
  ): Promise<Bull.Job> {
    return this.addJob(queueName, jobType, data, {
      ...options,
      delay: delayMs,
    });
  }

  /**
   * Register job processor
   */
  registerProcessor(
    queueName: string,
    jobType: string,
    processor?: (job: Bull.Job<JobData>) => Promise<JobResult>,
  ): void {
    const processorKey = `${queueName}:${jobType}`;
    this.processors.set(processorKey, processor);

    const queue = this.getQueue(queueName);
    if (queue) {
      queue.process(jobType, this.queueConfigs[queueName]?.concurrency || 1, async (job) => {
        return this.processJob(job, processor);
      });
    }

    this.logger.log(`Processor registered for ${processorKey}`);
  }

  /**
   * Get job by ID
   */
  async getJob(queueName: string, jobId: string): Promise<Bull.Job | null> {
    const queue = this.getQueue(queueName);
    if (!queue) return null;

    return queue.getJob(jobId);
  }

  /**
   * Get queue metrics
   */
  async getQueueMetrics(queueName: string): Promise<QueueMetrics | null> {
    const queue = this.getQueue(queueName);
    if (!queue) return null;

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed(),
    ]);

    const isPaused = await queue.isPaused();
    
    // Calculate throughput and average processing time
    const recentJobs = await queue.getJobs(['completed'], 0, 99);
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    
    const recentCompletedJobs = recentJobs.filter(
      job => job.finishedOn && job.finishedOn > oneHourAgo
    );
    
    const throughput = recentCompletedJobs.length; // Jobs per hour
    const averageProcessingTime = recentCompletedJobs.length > 0
      ? recentCompletedJobs.reduce((sum, job) => {
          return sum + (job.finishedOn! - job.processedOn!);
        }, 0) / recentCompletedJobs.length
      : 0;

    const metrics: QueueMetrics = {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      paused: isPaused,
      totalProcessed: completed.length + failed.length,
      throughput,
      averageProcessingTime: Math.round(averageProcessingTime),
    };

    this.queueMetrics.set(queueName, metrics);
    return metrics;
  }

  /**
   * Get all queue metrics
   */
  async getAllQueueMetrics(): Promise<Record<string, QueueMetrics>> {
    const allMetrics: Record<string, QueueMetrics> = {};
    
    for (const queueName of this.queues.keys()) {
      const metrics = await this.getQueueMetrics(queueName);
      if (metrics) {
        allMetrics[queueName] = metrics;
      }
    }
    
    return allMetrics;
  }

  /**
   * Pause queue
   */
  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    if (queue) {
      await queue.pause();
      this.logger.log(`Queue '${queueName}' paused`);
    }
  }

  /**
   * Resume queue
   */
  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    if (queue) {
      await queue.resume();
      this.logger.log(`Queue '${queueName}' resumed`);
    }
  }

  /**
   * Clean queue
   */
  async cleanQueue(
    queueName: string,
    grace: number = 0,
    status: any,
    limit: number = 100,
  ): Promise<Bull.Job[]> {
    const queue = this.getQueue(queueName);
    if (!queue) return [];

    const cleanedJobs = await queue.clean(grace, status, limit);
    this.logger.log(`Cleaned ${cleanedJobs.length} ${status} jobs from queue '${queueName}'`);
    
    return cleanedJobs;
  }

  /**
   * Remove job
   */
  async removeJob(queueName: string, jobId: string): Promise<void> {
    const job = await this.getJob(queueName, jobId);
    if (job) {
      await job.remove();
      this.logger.log(`Job ${jobId} removed from queue '${queueName}'`);
    }
  }

  /**
   * Retry failed job
   */
  async retryJob(queueName: string, jobId: string): Promise<void> {
    const job = await this.getJob(queueName, jobId);
    if (job) {
      await job.retry();
      this.logger.log(`Job ${jobId} retried in queue '${queueName}'`);
    }
  }

  /**
   * Get failed jobs
   */
  async getFailedJobs(queueName: string, start = 0, end = 50): Promise<Bull.Job[]> {
    const queue = this.getQueue(queueName);
    if (!queue) return [];

    return queue.getFailed(start, end);
  }

  /**
   * Get job logs
   */
  async getJobLogs(queueName: string, jobId: string): Promise<{ logs: string[]; count: number }> {
    const job:any = await this.getJob(queueName, jobId);
    if (!job) return { logs: [], count: 0 };

    return job.getLog(0, -1);
  }

  // Private helper methods

  private async initializeQueues(): Promise<void> {
    const redisConfig = {
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: this.configService.get<number>('REDIS_DB', 0),
    };

    for (const [queueKey, config] of Object.entries(this.queueConfigs)) {
      const queue = new Bull(config.name, {
        redis: redisConfig,
        defaultJobOptions: config.defaultJobOptions,
        settings: {
          stalledInterval: 30 * 1000,
          maxStalledCount: 1,
        },
      });

      // Setup queue event listeners
      this.setupQueueEventListeners(queue, queueKey);

      this.queues.set(queueKey, queue);
      this.logger.log(`Queue '${queueKey}' initialized`);
    }
  }

  private setupQueueEventListeners(queue: Bull.Queue, queueName: string): void {
    queue.on('completed', (job, result) => {
      this.logger.log(`Job ${job.id} completed in queue '${queueName}'`);
      this.eventEmitter.emit('job.completed', {
        queueName,
        jobId: job.id,
        result,
      });
    });

    queue.on('failed', (job, err) => {
      this.logger.error(`Job ${job.id} failed in queue '${queueName}':`, err);
      this.eventEmitter.emit('job.failed', {
        queueName,
        jobId: job.id,
        error: err.message,
      });
    });

    queue.on('stalled', (job) => {
      this.logger.warn(`Job ${job.id} stalled in queue '${queueName}'`);
      this.eventEmitter.emit('job.stalled', {
        queueName,
        jobId: job.id,
      });
    });

    queue.on('progress', (job, progress) => {
      this.eventEmitter.emit('job.progress', {
        queueName,
        jobId: job.id,
        progress,
      });
    });
  }

  private async processJob(
    job: Bull.Job<JobData>,
    processor: (job: Bull.Job<JobData>) => Promise<JobResult>,
  ): Promise<JobResult> {
    const startTime = Date.now();
    
    try {
      // Add job log
      await job.log(`Processing job ${job.id} of type '${job.data.type}'`);
      
      // Process the job
      const result = await processor(job);
      
      const duration = Date.now() - startTime;
      
      // Add completion log
      await job.log(`Job ${job.id} completed in ${duration}ms`);
      
      return {
        ...result,
        duration,
        completedAt: new Date(),
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Add error log
      await job.log(`Job ${job.id} failed after ${duration}ms: ${error.message}`);
      
      throw error;
    }
  }

  private getQueue(queueName: string): Bull.Queue | undefined {
    return this.queues.get(queueName);
  }

  private setupEventListeners(): void {
    // Listen for application events that should trigger jobs
    this.eventEmitter.on('user.registered', async (payload) => {
      await this.addJob('email', 'welcome-email', {
        userId: payload.id,
        email: payload.email,
        firstName: payload.firstName,
      });
    });

    this.eventEmitter.on('course.completed', async (payload) => {
      await this.addJob('email', 'completion-certificate', {
        userId: payload.userId,
        courseId: payload.courseId,
      });
    });

    this.eventEmitter.on('organization.created', async (payload) => {
      await this.addJob('analytics', 'organization-onboarding-metrics', {
        organizationId: payload.id,
      });
    });
  }

  private startMetricsCollection(): void {
    // Collect metrics every minute
    setInterval(async () => {
      try {
        await this.getAllQueueMetrics();
      } catch (error) {
        this.logger.error('Error collecting queue metrics:', error);
      }
    }, 60000);
  }

  private async closeAllQueues(): Promise<void> {
    const closePromises = Array.from(this.queues.values()).map(queue => queue.close());
    await Promise.all(closePromises);
    this.logger.log('All queues closed');
  }

  /**
   * Health check for job queues
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    queues: Record<string, { status: string; issues: string[] }>;
  }> {
    const queueHealth: Record<string, { status: string; issues: string[] }> = {};
    let overallHealthy = true;

    for (const [queueName, queue] of this.queues.entries()) {
      const issues: string[] = [];
      
      try {
        const isPaused = await queue.isPaused();
        const metrics = await this.getQueueMetrics(queueName);
        
        if (isPaused) {
          issues.push('Queue is paused');
        }
        
        if (metrics && metrics.failed > 10) {
          issues.push(`High number of failed jobs: ${metrics.failed}`);
        }
        
        if (metrics && metrics.active > 50) {
          issues.push(`High number of active jobs: ${metrics.active}`);
        }
        
        queueHealth[queueName] = {
          status: issues.length === 0 ? 'healthy' : 'warning',
          issues,
        };
        
        if (issues.length > 0) {
          overallHealthy = false;
        }
      } catch (error) {
        queueHealth[queueName] = {
          status: 'error',
          issues: [`Queue error: ${error.message}`],
        };
        overallHealthy = false;
      }
    }

    return {
      healthy: overallHealthy,
      queues: queueHealth,
    };
  }
}
