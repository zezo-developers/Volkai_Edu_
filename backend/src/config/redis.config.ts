import { registerAs } from '@nestjs/config';

/**
 * Redis configuration factory
 * Provides type-safe configuration for Redis connection used for caching and queues
 */
export const redisConfig = registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
}));

/**
 * Redis configuration interface for type safety
 */
export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
}
