import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { WebhookService } from '../services/webhook.service';
import * as crypto from 'crypto';

@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  constructor(private webhookService: WebhookService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Get webhook endpoint ID from route params
    const endpointId = request.params.id || request.params.endpointId;
    if (!endpointId) {
      // If no endpoint ID, skip signature verification
      return true;
    }

    try {
      // Get webhook endpoint configuration
      const endpoint = await this.webhookService.getEndpointById(endpointId);
      
      // Check if signature verification is enabled
      if (!endpoint.config.secret) {
        // No secret configured, skip verification
        return true;
      }

      // Extract signature from headers
      const signatureHeader = endpoint.config.signatureHeader || 'X-Webhook-Signature';
      const signature = request.get(signatureHeader);
      
      if (!signature) {
        throw new UnauthorizedException('Webhook signature is required');
      }

      // Get request body (should be raw)
      const payload = request.rawBody || JSON.stringify(request.body);
      
      // Verify signature
      const isValid = this.verifySignature(
        payload,
        signature,
        endpoint.config.secret,
        endpoint.config.signatureAlgorithm || 'sha256'
      );

      if (!isValid) {
        throw new UnauthorizedException('Invalid webhook signature');
      }

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      // If endpoint not found or other error, allow request to proceed
      // (will be handled by the controller)
      return true;
    }
  }

  private verifySignature(
    payload: string,
    signature: string,
    secret: string,
    algorithm: string = 'sha256'
  ): boolean {
    try {
      // Generate expected signature
      const expectedSignature = crypto
        .createHmac(algorithm, secret)
        .update(payload, 'utf8')
        .digest('hex');

      // Extract signature value (remove algorithm prefix if present)
      const receivedSignature = signature.includes('=') 
        ? signature.split('=')[1] 
        : signature;

      // Compare signatures using timing-safe comparison
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(receivedSignature, 'hex')
      );
    } catch (error) {
      return false;
    }
  }
}
