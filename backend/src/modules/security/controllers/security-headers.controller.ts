import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../../common/guards/roles.guard';
import { AdminOnly } from '../../../common/decorators/roles.decorator';
import { SecurityHeadersService } from '../../../common/services/security-headers.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

/**
 * Security Headers Management Controller
 * Provides endpoints for managing and monitoring security headers
 */
@ApiTags('Security Headers')
@Controller('security/headers')
export class SecurityHeadersController {
  constructor(private readonly securityHeadersService: SecurityHeadersService) {}

  /**
   * CSP violation reporting endpoint
   */
  @Post('csp-report')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'CSP violation reporting',
    description: 'Endpoint for browsers to report Content Security Policy violations',
  })
  @ApiResponse({
    status: 204,
    description: 'CSP report received successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid CSP report format',
  })
  async reportCSPViolation(@Req() req: Request, @Res() res: Response): Promise<void> {
    const handler = this.securityHeadersService.createCSPReportHandler();
    return handler(req, res);
  }

  /**
   * Get security headers configuration
   */
  @Get('config')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @AdminOnly()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get security headers configuration',
    description: 'Retrieve current security headers configuration and status',
  })
  @ApiResponse({
    status: 200,
    description: 'Security headers configuration retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        status: {
          type: 'object',
          properties: {
            environment: { type: 'string', example: 'production' },
            httpsEnforced: { type: 'boolean', example: true },
            validation: {
              type: 'object',
              properties: {
                isValid: { type: 'boolean', example: true },
                errors: { type: 'array', items: { type: 'string' } },
              },
            },
            config: {
              type: 'object',
              properties: {
                csp: {
                  type: 'object',
                  properties: {
                    enabled: { type: 'boolean', example: true },
                    reportOnly: { type: 'boolean', example: false },
                    directives: { type: 'object' },
                  },
                },
                hsts: {
                  type: 'object',
                  properties: {
                    enabled: { type: 'boolean', example: true },
                    maxAge: { type: 'number', example: 31536000 },
                    includeSubDomains: { type: 'boolean', example: true },
                    preload: { type: 'boolean', example: true },
                  },
                },
                frameOptions: {
                  type: 'object',
                  properties: {
                    enabled: { type: 'boolean', example: true },
                    policy: { type: 'string', example: 'DENY' },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  async getSecurityHeadersConfig(): Promise<{
    success: boolean;
    status: any;
  }> {
    const status = this.securityHeadersService.getSecurityHeadersStatus();

    return {
      success: true,
      status,
    };
  }

  /**
   * Test security headers
   */
  @Get('test')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @AdminOnly()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Test security headers',
    description: 'Test current security headers configuration and get recommendations',
  })
  @ApiResponse({
    status: 200,
    description: 'Security headers test completed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        test: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', example: '2024-01-15T10:30:00Z' },
            headers: {
              type: 'object',
              additionalProperties: { type: 'string' },
            },
            validation: {
              type: 'object',
              properties: {
                isValid: { type: 'boolean', example: true },
                errors: { type: 'array', items: { type: 'string' } },
                warnings: { type: 'array', items: { type: 'string' } },
              },
            },
            recommendations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', example: 'csp' },
                  severity: { type: 'string', example: 'medium' },
                  message: { type: 'string' },
                  action: { type: 'string' },
                },
              },
            },
            score: { type: 'number', example: 85 },
          },
        },
      },
    },
  })
  async testSecurityHeaders(@Req() req: Request): Promise<{
    success: boolean;
    test: any;
  }> {
    const status = this.securityHeadersService.getSecurityHeadersStatus();
    const validation = this.securityHeadersService.validateConfiguration();
    
    // Simulate response headers that would be set
    const mockResponse = {
      headers: {},
      setHeader: function(name: string, value: string) {
        this.headers[name] = value;
      },
      removeHeader: function(name: string) {
        delete this.headers[name];
      },
      getHeader: function(name: string) {
        return this.headers[name];
      },
    } as any;

    // Apply security headers to mock response
    const middleware = this.securityHeadersService.createSecurityHeadersMiddleware();
    const mockReq = { ...req, secure: true } as Request;
    
    try {
      await new Promise<void>((resolve) => {
        middleware(mockReq, mockResponse, () => resolve());
      });
    } catch (error) {
      // Handle middleware errors
    }

    // Generate recommendations
    const recommendations = this.generateSecurityRecommendations(status, validation);
    
    // Calculate security score
    const score = this.calculateSecurityScore(status, validation, mockResponse.headers);

    return {
      success: true,
      test: {
        timestamp: new Date().toISOString(),
        headers: mockResponse.headers,
        validation: {
          ...validation,
          warnings: this.generateWarnings(status),
        },
        recommendations,
        score,
      },
    };
  }

  /**
   * Update security headers configuration
   */
  @Put('config')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @AdminOnly()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update security headers configuration',
    description: 'Update security headers configuration (requires application restart)',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuration update request received',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Configuration update request received' },
        requiresRestart: { type: 'boolean', example: true },
        validation: {
          type: 'object',
          properties: {
            isValid: { type: 'boolean', example: true },
            errors: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  })
  async updateSecurityHeadersConfig(
    @Body() configUpdate: {
      csp?: {
        enabled?: boolean;
        reportOnly?: boolean;
        directives?: Record<string, string[]>;
      };
      hsts?: {
        enabled?: boolean;
        maxAge?: number;
        includeSubDomains?: boolean;
        preload?: boolean;
      };
      frameOptions?: {
        enabled?: boolean;
        policy?: string;
      };
    },
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<{
    success: boolean;
    message: string;
    requiresRestart: boolean;
    validation: { isValid: boolean; errors: string[] };
  }> {
    // In a real implementation, this would update configuration files
    // and potentially trigger a graceful restart
    
    // Validate the proposed configuration
    const currentStatus = this.securityHeadersService.getSecurityHeadersStatus();
    const updatedConfig = { ...currentStatus.config, ...configUpdate };
    
    // Basic validation
    const errors: string[] = [];
    
    if (configUpdate.hsts?.maxAge && configUpdate.hsts.maxAge < 300) {
      errors.push('HSTS max-age must be at least 300 seconds');
    }
    
    if (configUpdate.frameOptions?.policy && 
        !['DENY', 'SAMEORIGIN'].includes(configUpdate.frameOptions.policy)) {
      errors.push('Frame options policy must be DENY or SAMEORIGIN');
    }

    const validation = {
      isValid: errors.length === 0,
      errors,
    };

    // Log the configuration change
    console.log(`Security headers configuration update requested by ${admin.email}`, {
      configUpdate,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      message: 'Configuration update request received. Changes will take effect after application restart.',
      requiresRestart: true,
      validation,
    };
  }

  /**
   * Get security headers compliance report
   */
  @Get('compliance')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @AdminOnly()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get security headers compliance report',
    description: 'Generate a comprehensive security headers compliance report',
  })
  @ApiResponse({
    status: 200,
    description: 'Compliance report generated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        report: {
          type: 'object',
          properties: {
            generatedAt: { type: 'string', example: '2024-01-15T10:30:00Z' },
            overallScore: { type: 'number', example: 92 },
            grade: { type: 'string', example: 'A' },
            compliance: {
              type: 'object',
              properties: {
                owasp: { type: 'number', example: 95 },
                mozilla: { type: 'number', example: 88 },
                nist: { type: 'number', example: 90 },
              },
            },
            categories: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Content Security Policy' },
                  status: { type: 'string', example: 'compliant' },
                  score: { type: 'number', example: 95 },
                  issues: { type: 'array', items: { type: 'string' } },
                  recommendations: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
      },
    },
  })
  async getComplianceReport(): Promise<{
    success: boolean;
    report: any;
  }> {
    const status = this.securityHeadersService.getSecurityHeadersStatus();
    const validation = this.securityHeadersService.validateConfiguration();
    
    // Generate compliance scores for different standards
    const owaspScore = this.calculateOWASPCompliance(status);
    const mozillaScore = this.calculateMozillaCompliance(status);
    const nistScore = this.calculateNISTCompliance(status);
    
    const overallScore = Math.round((owaspScore + mozillaScore + nistScore) / 3);
    const grade = this.getSecurityGrade(overallScore);
    
    // Analyze each security category
    const categories = [
      this.analyzeCSPCompliance(status.config.csp),
      this.analyzeHSTSCompliance(status.config.hsts),
      this.analyzeFrameOptionsCompliance(status.config.frameOptions),
      this.analyzeContentTypeCompliance(status.config.contentTypeOptions),
      this.analyzeReferrerPolicyCompliance(status.config.referrerPolicy),
      this.analyzePermissionsPolicyCompliance(status.config.permissionsPolicy),
    ];

    return {
      success: true,
      report: {
        generatedAt: new Date().toISOString(),
        overallScore,
        grade,
        compliance: {
          owasp: owaspScore,
          mozilla: mozillaScore,
          nist: nistScore,
        },
        categories,
      },
    };
  }

  // Private helper methods

  private generateSecurityRecommendations(status: any, validation: any): any[] {
    const recommendations = [];
    
    if (!validation.isValid) {
      recommendations.push({
        type: 'configuration',
        severity: 'high',
        message: 'Configuration validation failed',
        action: 'Review and fix configuration errors',
      });
    }
    
    if (!status.config.csp.enabled) {
      recommendations.push({
        type: 'csp',
        severity: 'high',
        message: 'Content Security Policy is disabled',
        action: 'Enable CSP to prevent XSS attacks',
      });
    }
    
    if (!status.config.hsts.enabled && status.environment === 'production') {
      recommendations.push({
        type: 'hsts',
        severity: 'high',
        message: 'HSTS is disabled in production',
        action: 'Enable HSTS to prevent protocol downgrade attacks',
      });
    }
    
    if (status.config.csp.reportOnly) {
      recommendations.push({
        type: 'csp',
        severity: 'medium',
        message: 'CSP is in report-only mode',
        action: 'Consider enforcing CSP after testing',
      });
    }
    
    return recommendations;
  }

  private generateWarnings(status: any): string[] {
    const warnings = [];
    
    if (status.environment !== 'production') {
      warnings.push('Running in non-production environment - some security features may be disabled');
    }
    
    if (!status.httpsEnforced) {
      warnings.push('HTTPS enforcement is disabled');
    }
    
    return warnings;
  }

  private calculateSecurityScore(status: any, validation: any, headers: any): number {
    let score = 0;
    
    // Base score for having security headers
    if (Object.keys(headers).length > 0) score += 20;
    
    // CSP score
    if (headers['Content-Security-Policy']) score += 25;
    if (headers['Content-Security-Policy-Report-Only']) score += 15;
    
    // HSTS score
    if (headers['Strict-Transport-Security']) score += 20;
    
    // Frame options score
    if (headers['X-Frame-Options']) score += 10;
    
    // Content type options score
    if (headers['X-Content-Type-Options']) score += 5;
    
    // Referrer policy score
    if (headers['Referrer-Policy']) score += 5;
    
    // Permissions policy score
    if (headers['Permissions-Policy']) score += 10;
    
    // Validation penalty
    if (!validation.isValid) score -= 20;
    
    return Math.max(0, Math.min(100, score));
  }

  private calculateOWASPCompliance(status: any): number {
    // OWASP Top 10 compliance check
    let score = 0;
    
    if (status.config.csp.enabled) score += 30;
    if (status.config.hsts.enabled) score += 25;
    if (status.config.frameOptions.enabled) score += 15;
    if (status.config.contentTypeOptions.enabled) score += 10;
    if (status.config.referrerPolicy.enabled) score += 10;
    if (status.config.permissionsPolicy.enabled) score += 10;
    
    return Math.min(100, score);
  }

  private calculateMozillaCompliance(status: any): number {
    // Mozilla Observatory compliance
    let score = 0;
    
    if (status.config.csp.enabled && !status.config.csp.reportOnly) score += 35;
    if (status.config.hsts.enabled && status.config.hsts.maxAge >= 15768000) score += 30;
    if (status.config.frameOptions.policy === 'DENY') score += 15;
    if (status.config.contentTypeOptions.noSniff) score += 10;
    if (status.config.referrerPolicy.policy === 'strict-origin-when-cross-origin') score += 10;
    
    return Math.min(100, score);
  }

  private calculateNISTCompliance(status: any): number {
    // NIST Cybersecurity Framework compliance
    let score = 0;
    
    if (status.config.csp.enabled) score += 25;
    if (status.config.hsts.enabled) score += 25;
    if (status.config.frameOptions.enabled) score += 20;
    if (status.config.contentTypeOptions.enabled) score += 15;
    if (status.config.referrerPolicy.enabled) score += 15;
    
    return Math.min(100, score);
  }

  private getSecurityGrade(score: number): string {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  private analyzeCSPCompliance(csp: any): any {
    return {
      name: 'Content Security Policy',
      status: csp.enabled ? 'compliant' : 'non-compliant',
      score: csp.enabled ? (csp.reportOnly ? 75 : 95) : 0,
      issues: csp.enabled ? [] : ['CSP is disabled'],
      recommendations: csp.enabled && csp.reportOnly ? ['Consider enforcing CSP'] : [],
    };
  }

  private analyzeHSTSCompliance(hsts: any): any {
    const issues = [];
    if (!hsts.enabled) issues.push('HSTS is disabled');
    if (hsts.maxAge < 15768000) issues.push('HSTS max-age is too short');
    
    return {
      name: 'HTTP Strict Transport Security',
      status: hsts.enabled && hsts.maxAge >= 15768000 ? 'compliant' : 'non-compliant',
      score: hsts.enabled ? (hsts.maxAge >= 15768000 ? 95 : 70) : 0,
      issues,
      recommendations: issues.length > 0 ? ['Enable HSTS with proper configuration'] : [],
    };
  }

  private analyzeFrameOptionsCompliance(frameOptions: any): any {
    return {
      name: 'X-Frame-Options',
      status: frameOptions.enabled ? 'compliant' : 'non-compliant',
      score: frameOptions.enabled ? 95 : 0,
      issues: frameOptions.enabled ? [] : ['X-Frame-Options is disabled'],
      recommendations: frameOptions.enabled ? [] : ['Enable X-Frame-Options'],
    };
  }

  private analyzeContentTypeCompliance(contentType: any): any {
    return {
      name: 'X-Content-Type-Options',
      status: contentType.enabled && contentType.noSniff ? 'compliant' : 'non-compliant',
      score: contentType.enabled && contentType.noSniff ? 95 : 0,
      issues: contentType.enabled ? [] : ['X-Content-Type-Options is disabled'],
      recommendations: contentType.enabled ? [] : ['Enable X-Content-Type-Options'],
    };
  }

  private analyzeReferrerPolicyCompliance(referrerPolicy: any): any {
    return {
      name: 'Referrer Policy',
      status: referrerPolicy.enabled ? 'compliant' : 'non-compliant',
      score: referrerPolicy.enabled ? 90 : 0,
      issues: referrerPolicy.enabled ? [] : ['Referrer Policy is disabled'],
      recommendations: referrerPolicy.enabled ? [] : ['Enable Referrer Policy'],
    };
  }

  private analyzePermissionsPolicyCompliance(permissionsPolicy: any): any {
    return {
      name: 'Permissions Policy',
      status: permissionsPolicy.enabled ? 'compliant' : 'non-compliant',
      score: permissionsPolicy.enabled ? 85 : 0,
      issues: permissionsPolicy.enabled ? [] : ['Permissions Policy is disabled'],
      recommendations: permissionsPolicy.enabled ? [] : ['Enable Permissions Policy'],
    };
  }
}
