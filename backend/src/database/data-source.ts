import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

// Load environment variables
config();

const configService = new ConfigService();

/**
 * TypeORM data source configuration
 * Used for migrations and CLI operations
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: configService.get<string>('DB_HOST', 'localhost'),
  port: configService.get<number>('DB_PORT', 5432),
  username: configService.get<string>('DB_USERNAME', 'volkai_user'),
  password: configService.get<string>('DB_PASSWORD', 'admin'),
  database: configService.get<string>('DB_DATABASE', 'volkai_hr_edu_dev'),
  entities: [__dirname + '/entities/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false, // Always false for production safety
  logging: configService.get<boolean>('DB_LOGGING', false),
  ssl: configService.get<string>('NODE_ENV') === 'production' 
    ? { rejectUnauthorized: false } 
    : false,
});
