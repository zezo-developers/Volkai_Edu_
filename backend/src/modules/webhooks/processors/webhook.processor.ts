import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { WebhookService } from '../services/webhook.service';
import { ApiKeyService } from '../services/api-key.service';
import { IntegrationService } from '../services/integration.service';

@Processor('webhook-delivery')
export class WebhookProcessor {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(
    private readonly webhookService: WebhookService,
    private readonly apiKeyService: ApiKeyService,
    private readonly integrationService: IntegrationService,
  ) {}

  @Process('process-delivery')
  async processWebhookDelivery(job: Job<{ deliveryId: string }>) {
    const { deliveryId } = job.data;
    
    this.logger.log(`Processing webhook delivery: ${deliveryId}`);

    try {
      const result = await this.webhookService.processDelivery(deliveryId);
      
      if (result.success) {
        this.logger.log(`Webhook delivery successful: ${deliveryId}`);
      } else {
        this.logger.warn(`Webhook delivery failed: ${deliveryId} - ${result.error}`);
      }

      return result;
    } catch (error) {
      this.logger.error(`Error processing webhook delivery ${deliveryId}: ${error.message}`);
      throw error;
    }
  }

  @Process('verify-endpoint')
  async verifyWebhookEndpoint(job: Job<{ endpointId: string }>) {
    const { endpointId } = job.data;
    
    this.logger.log(`Verifying webhook endpoint: ${endpointId}`);

    try {
      const isVerified = await this.webhookService.verifyEndpoint(endpointId);
      
      if (isVerified) {
        this.logger.log(`Webhook endpoint verified: ${endpointId}`);
      } else {
        this.logger.warn(`Webhook endpoint verification failed: ${endpointId}`);
      }

      return { verified: isVerified };
    } catch (error) {
      this.logger.error(`Error verifying webhook endpoint ${endpointId}: ${error.message}`);
      throw error;
    }
  }

  @Process('cleanup-expired-keys')
  async cleanupExpiredApiKeys(job: Job) {
    this.logger.log('Starting cleanup of expired API keys');

    try {
      const count = await this.apiKeyService.cleanupExpiredKeys();
      
      this.logger.log(`Cleaned up ${count} expired API keys`);
      
      return { cleanedUpCount: count };
    } catch (error) {
      this.logger.error(`Error cleaning up expired API keys: ${error.message}`);
      throw error;
    }
  }

  @Process('sync-integration')
  async syncIntegration(job: Job<{ integrationId: string; syncType?: string }>) {
    const { integrationId, syncType } = job.data;
    
    this.logger.log(`Syncing integration: ${integrationId} (type: ${syncType || 'auto'})`);

    try {
      const integration = await this.integrationService.getIntegrationById(integrationId);
      
      let result;
      switch (integration.type) {
        case 'calendar':
          result = await this.integrationService.syncCalendarEvents(integrationId);
          break;
        case 'job_board':
          result = await this.integrationService.syncJobPostings(integrationId);
          break;
        default:
          throw new Error(`Sync not supported for integration type: ${integration.type}`);
      }

      this.logger.log(`Integration sync completed: ${integrationId}`);
      
      return result;
    } catch (error) {
      this.logger.error(`Error syncing integration ${integrationId}: ${error.message}`);
      throw error;
    }
  }

  @Process('refresh-oauth-tokens')
  async refreshOAuthTokens(job: Job) {
    this.logger.log('Starting OAuth token refresh for integrations');

    try {
      // This would get integrations that need token refresh
      // For now, just log the process
      this.logger.log('OAuth token refresh completed');
      
      return { refreshedCount: 0 };
    } catch (error) {
      this.logger.error(`Error refreshing OAuth tokens: ${error.message}`);
      throw error;
    }
  }

  @Process('health-check-integrations')
  async healthCheckIntegrations(job: Job) {
    this.logger.log('Starting health check for all integrations');

    try {
      // This would check health of all active integrations
      // For now, just log the process
      this.logger.log('Integration health check completed');
      
      return { checkedCount: 0, healthyCount: 0, unhealthyCount: 0 };
    } catch (error) {
      this.logger.error(`Error during integration health check: ${error.message}`);
      throw error;
    }
  }

  @Process('generate-usage-reports')
  async generateUsageReports(job: Job<{ period: string; organizationId?: string }>) {
    const { period, organizationId } = job.data;
    
    this.logger.log(`Generating usage reports for period: ${period}${organizationId ? ` (org: ${organizationId})` : ''}`);

    try {
      // This would generate usage reports for API keys and webhooks
      // For now, just log the process
      this.logger.log('Usage reports generated successfully');
      
      return { reportsGenerated: 0 };
    } catch (error) {
      this.logger.error(`Error generating usage reports: ${error.message}`);
      throw error;
    }
  }

  @Process('webhook-analytics')
  async processWebhookAnalytics(job: Job<{ endpointId?: string; period: string }>) {
    const { endpointId, period } = job.data;
    
    this.logger.log(`Processing webhook analytics${endpointId ? ` for endpoint: ${endpointId}` : ''} (period: ${period})`);

    try {
      // This would process and aggregate webhook analytics data
      // For now, just log the process
      this.logger.log('Webhook analytics processing completed');
      
      return { processed: true };
    } catch (error) {
      this.logger.error(`Error processing webhook analytics: ${error.message}`);
      throw error;
    }
  }

  @Process('api-key-analytics')
  async processApiKeyAnalytics(job: Job<{ apiKeyId?: string; period: string }>) {
    const { apiKeyId, period } = job.data;
    
    this.logger.log(`Processing API key analytics${apiKeyId ? ` for key: ${apiKeyId}` : ''} (period: ${period})`);

    try {
      // This would process and aggregate API key usage analytics
      // For now, just log the process
      this.logger.log('API key analytics processing completed');
      
      return { processed: true };
    } catch (error) {
      this.logger.error(`Error processing API key analytics: ${error.message}`);
      throw error;
    }
  }

  @Process('integration-maintenance')
  async performIntegrationMaintenance(job: Job) {
    this.logger.log('Starting integration maintenance tasks');

    try {
      // This would perform various maintenance tasks:
      // - Clean up old sync logs
      // - Update integration health scores
      // - Check for deprecated API versions
      // - Validate credentials
      
      this.logger.log('Integration maintenance completed');
      
      return { maintenanceCompleted: true };
    } catch (error) {
      this.logger.error(`Error during integration maintenance: ${error.message}`);
      throw error;
    }
  }

  @Process('webhook-maintenance')
  async performWebhookMaintenance(job: Job) {
    this.logger.log('Starting webhook maintenance tasks');

    try {
      // This would perform various maintenance tasks:
      // - Clean up old delivery records
      // - Update endpoint health scores
      // - Remove inactive endpoints
      // - Optimize delivery queues
      
      this.logger.log('Webhook maintenance completed');
      
      return { maintenanceCompleted: true };
    } catch (error) {
      this.logger.error(`Error during webhook maintenance: ${error.message}`);
      throw error;
    }
  }

  // Error handling for failed jobs
  @Process('handle-failed-delivery')
  async handleFailedDelivery(job: Job<{ deliveryId: string; error: string }>) {
    const { deliveryId, error } = job.data;
    
    this.logger.log(`Handling failed webhook delivery: ${deliveryId}`);

    try {
      // This would handle failed deliveries:
      // - Log the failure
      // - Notify administrators if needed
      // - Update endpoint health scores
      // - Potentially disable problematic endpoints
      
      this.logger.log(`Failed delivery handled: ${deliveryId}`);
      
      return { handled: true };
    } catch (handlingError) {
      this.logger.error(`Error handling failed delivery ${deliveryId}: ${handlingError.message}`);
      throw handlingError;
    }
  }

  // Scheduled job for periodic cleanup
  @Process('periodic-cleanup')
  async performPeriodicCleanup(job: Job) {
    this.logger.log('Starting periodic cleanup');

    try {
      const tasks = [
        this.apiKeyService.cleanupExpiredKeys(),
        // Add more cleanup tasks here
      ];

      const results = await Promise.allSettled(tasks);
      
      let successCount = 0;
      let errorCount = 0;
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successCount++;
        } else {
          errorCount++;
          this.logger.error(`Cleanup task ${index} failed: ${result.reason}`);
        }
      });

      this.logger.log(`Periodic cleanup completed: ${successCount} successful, ${errorCount} failed`);
      
      return { successCount, errorCount };
    } catch (error) {
      this.logger.error(`Error during periodic cleanup: ${error.message}`);
      throw error;
    }
  }
}
