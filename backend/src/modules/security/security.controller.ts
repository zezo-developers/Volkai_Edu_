import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Ip,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/roles.guard';
import { AdminOnly, Roles } from '../../common/decorators/roles.decorator';
import { SecurityService } from './security.service';
import { RateLimitingService } from './rate-limiting.service';
import { Role } from '@/database/entities/user.entity';

@ApiTags('Security')
@Controller('security')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class SecurityController {
  constructor(
    private readonly securityService: SecurityService,
    private readonly rateLimitingService: RateLimitingService,
  ) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get security metrics' })
  @ApiResponse({ status: 200, description: 'Security metrics retrieved successfully' })
  @AdminOnly()
  async getSecurityMetrics() {
    const metrics = await this.securityService.getSecurityMetrics();

    return {
      success: true,
      data: metrics,
      message: 'Security metrics retrieved successfully',
    };
  }

  @Get('threats')
  @ApiOperation({ summary: 'Get security threats' })
  @ApiResponse({ status: 200, description: 'Security threats retrieved successfully' })
  @AdminOnly()
  async getThreats(@Query('resolved') resolved?: boolean) {
    const threats = this.securityService.getThreats(resolved);

    return {
      success: true,
      data: threats,
      message: 'Security threats retrieved successfully',
    };
  }

  @Post('threats/resolve')
  @ApiOperation({ summary: 'Resolve security threats' })
  @ApiResponse({ status: 200, description: 'Security threats resolved successfully' })
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN)
  async resolveThreats(@Body('threatIds') threatIds: string[]) {
    await this.securityService.resolveThreats(threatIds);

    return {
      success: true,
      message: 'Security threats resolved successfully',
    };
  }

  @Get('blocked-ips')
  @ApiOperation({ summary: 'Get blocked IP addresses' })
  @ApiResponse({ status: 200, description: 'Blocked IPs retrieved successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER)
  async getBlockedIps() {
    const blockedIps = this.rateLimitingService.getBlockedIps();

    return {
      success: true,
      data: blockedIps,
      message: 'Blocked IP addresses retrieved successfully',
    };
  }

  @Post('block-ip')
  @ApiOperation({ summary: 'Block IP address' })
  @ApiResponse({ status: 200, description: 'IP address blocked successfully' })
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN)
  async blockIp(
    @Body('ip') ip: string,
    @Body('reason') reason: string,
    @Body('durationMinutes') durationMinutes: number = 60
  ) {
    this.rateLimitingService.blockIp(ip, reason, durationMinutes * 60 * 1000);

    return {
      success: true,
      message: `IP address ${ip} blocked successfully`,
    };
  }

  @Post('unblock-ip/:ip')
  @ApiOperation({ summary: 'Unblock IP address' })
  @ApiResponse({ status: 200, description: 'IP address unblocked successfully' })
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN)
  async unblockIp(@Param('ip') ip: string) {
    this.rateLimitingService.unblockIp(ip);

    return {
      success: true,
      message: `IP address ${ip} unblocked successfully`,
    };
  }

  @Get('whitelist')
  @ApiOperation({ summary: 'Get whitelisted IP addresses' })
  @ApiResponse({ status: 200, description: 'Whitelist retrieved successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER)
  async getWhitelist() {
    // This would return the whitelist from the rate limiting service
    return {
      success: true,
      data: [], // Placeholder
      message: 'Whitelist retrieved successfully',
    };
  }

  @Post('whitelist')
  @ApiOperation({ summary: 'Add IP to whitelist' })
  @ApiResponse({ status: 200, description: 'IP added to whitelist successfully' })
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN)
  async addToWhitelist(@Body('ip') ip: string) {
    this.rateLimitingService.addToWhitelist(ip);

    return {
      success: true,
      message: `IP address ${ip} added to whitelist successfully`,
    };
  }

  @Post('validate-password')
  @ApiOperation({ summary: 'Validate password strength' })
  @ApiResponse({ status: 200, description: 'Password validation completed' })
  @HttpCode(HttpStatus.OK)
  async validatePassword(@Body('password') password: string) {
    const validation = await this.securityService.validatePasswordStrength(password);

    return {
      success: true,
      data: validation,
      message: 'Password validation completed',
    };
  }

  @Get('ddos-metrics')
  @ApiOperation({ summary: 'Get DDoS protection metrics' })
  @ApiResponse({ status: 200, description: 'DDoS metrics retrieved successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER)
  async getDDoSMetrics() {
    const metrics = this.rateLimitingService.getDDoSMetrics();

    return {
      success: true,
      data: metrics,
      message: 'DDoS protection metrics retrieved successfully',
    };
  }

  @Post('detect-bot')
  @ApiOperation({ summary: 'Detect if request is from a bot' })
  @ApiResponse({ status: 200, description: 'Bot detection completed' })
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN, Role.DEVELOPER)
  async detectBot(
    @Headers('user-agent') userAgent: string,
    @Ip() ip: string
  ) {
    const botInfo = this.rateLimitingService.detectBot(userAgent, ip);

    return {
      success: true,
      data: botInfo,
      message: 'Bot detection completed',
    };
  }

  @Get('headers')
  @ApiOperation({ summary: 'Get recommended security headers' })
  @ApiResponse({ status: 200, description: 'Security headers retrieved successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER)
  async getSecurityHeaders() {
    const headers = this.securityService.getSecurityHeaders();

    return {
      success: true,
      data: headers,
      message: 'Security headers retrieved successfully',
    };
  }

  @Post('sanitize')
  @ApiOperation({ summary: 'Sanitize input data' })
  @ApiResponse({ status: 200, description: 'Input sanitization completed' })
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN, Role.DEVELOPER)
  async sanitizeInput(@Body('input') input: string, @Body('type') type: 'text' | 'html' = 'text') {
    let sanitized: string;
    
    if (type === 'html') {
      sanitized = this.securityService.sanitizeHtml(input);
    } else {
      sanitized = this.securityService.sanitizeInput(input);
    }

    return {
      success: true,
      data: { original: input, sanitized },
      message: 'Input sanitization completed',
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Get security system health' })
  @ApiResponse({ status: 200, description: 'Security health retrieved successfully' })
  @Roles(Role.ADMIN, Role.DEVELOPER)
  async getSecurityHealth() {
    const metrics = await this.securityService.getSecurityMetrics();
    const ddosMetrics = this.rateLimitingService.getDDoSMetrics();
    
    const health = {
      status: 'healthy',
      threats: {
        total: metrics.totalThreats,
        unresolved: this.securityService.getThreats(false).length,
      },
      ddos: {
        suspiciousIps: ddosMetrics.suspiciousIps,
        blockedRequests: ddosMetrics.blockedRequests,
      },
      lastUpdated: new Date(),
    };

    return {
      success: true,
      data: health,
      message: 'Security system health retrieved successfully',
    };
  }
}
