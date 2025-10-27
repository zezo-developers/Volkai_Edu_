import { registerAs } from '@nestjs/config';

/**
 * Database configuration factory
 * Provides type-safe configuration for PostgreSQL database connection
 */
export const databaseConfig = registerAs('database', () => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'volkai_user',
  password: process.env.DB_PASSWORD || 'admin',
  database: process.env.DB_DATABASE || 'volkai_hr_edu_test',
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  logging: process.env.DB_LOGGING === 'true',
}));

/**
 * Database configuration interface for type safety
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize: boolean;
  logging: boolean;
}
