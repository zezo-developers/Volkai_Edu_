import { registerAs } from '@nestjs/config';

/**
 * Email configuration factory
 * Provides type-safe configuration for email service integration
 */
export const emailConfig = registerAs('email', () => ({
  provider: process.env.EMAIL_PROVIDER || 'sendgrid',
  sendgridApiKey: process.env.SENDGRID_API_KEY,
  from: process.env.EMAIL_FROM || 'noreply@volkaihr.com',
  fromName: process.env.EMAIL_FROM_NAME || 'Volkai HR Edu',
}));

/**
 * Email configuration interface for type safety
 */
export interface EmailConfig {
  provider: string;
  sendgridApiKey?: string;
  from: string;
  fromName: string;
}
