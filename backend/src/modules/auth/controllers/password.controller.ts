import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { AuthenticatedUser } from '../strategies/jwt.strategy';
import { PasswordSecurityService, PasswordStrengthResult } from '../services/password-security.service';
import { AuthService } from '../auth.service';
import { ChangePasswordDto } from '../dto/change-password.dto';

/**
 * Password Security Controller
 * Handles password-related operations including strength analysis,
 * password changes, and security recommendations
 */
@ApiTags('Password Security')
@Controller('auth/password')
@UseGuards(ThrottlerGuard) // Rate limiting for password operations
export class PasswordController {
  constructor(
    private readonly passwordSecurityService: PasswordSecurityService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Analyze password strength
   */
  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Analyze password strength',
    description: 'Analyze the strength of a password and provide security feedback',
  })
  @ApiResponse({
    status: 200,
    description: 'Password analysis completed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        analysis: {
          type: 'object',
          properties: {
            score: { type: 'number', example: 85 },
            strength: { type: 'string', example: 'strong' },
            feedback: { type: 'array', items: { type: 'string' } },
            isAcceptable: { type: 'boolean', example: true },
            estimatedCrackTime: { type: 'string', example: 'Years' },
          },
        },
      },
    },
  })
  async analyzePassword(
    @Body('password') password: string,
    @Body('userId') userId?: string,
  ): Promise<{
    success: boolean;
    analysis: PasswordStrengthResult;
  }> {
    const analysis = await this.passwordSecurityService.analyzePasswordStrength(
      password,
      userId,
    );

    return {
      success: true,
      analysis,
    };
  }

  /**
   * Check if password has been breached
   */
  @Post('breach-check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check password breach status',
    description: 'Check if a password has been found in known data breaches',
  })
  @ApiResponse({
    status: 200,
    description: 'Breach check completed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        isBreached: { type: 'boolean', example: false },
        breachCount: { type: 'number', example: 0 },
        recommendation: { type: 'string' },
      },
    },
  })
  async checkPasswordBreach(
    @Body('password') password: string,
  ): Promise<{
    success: boolean;
    isBreached: boolean;
    breachCount?: number;
    recommendation: string;
  }> {
    const breachResult = await this.passwordSecurityService.checkPasswordBreach(password);

    let recommendation: string;
    if (breachResult.isBreached) {
      recommendation = `This password has been found in ${breachResult.breachCount} data breaches. We strongly recommend choosing a different password.`;
    } else {
      recommendation = 'This password has not been found in known data breaches.';
    }

    return {
      success: true,
      isBreached: breachResult.isBreached,
      breachCount: breachResult.breachCount,
      recommendation,
    };
  }

  /**
   * Generate a secure password
   */
  @Get('generate')
  @ApiOperation({
    summary: 'Generate secure password',
    description: 'Generate a cryptographically secure password with specified length',
  })
  @ApiQuery({ 
    name: 'length', 
    required: false, 
    description: 'Password length (8-128, default: 16)',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Secure password generated',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        password: { type: 'string', example: 'K9$mP2@vX8#nQ5!w' },
        strength: {
          type: 'object',
          properties: {
            score: { type: 'number', example: 95 },
            strength: { type: 'string', example: 'very_strong' },
          },
        },
      },
    },
  })
  async generateSecurePassword(
    @Query('length') length?: number,
  ): Promise<{
    success: boolean;
    password: string;
    strength: Pick<PasswordStrengthResult, 'score' | 'strength'>;
  }> {
    const passwordLength = Math.min(Math.max(length || 16, 8), 128);
    const password = this.passwordSecurityService.generateSecurePassword(passwordLength);
    const analysis = await this.passwordSecurityService.analyzePasswordStrength(password);

    return {
      success: true,
      password,
      strength: {
        score: analysis.score,
        strength: analysis.strength,
      },
    };
  }

  /**
   * Change user password
   */
  @Post('change')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change user password',
    description: 'Change the current user\'s password with enhanced security validation',
  })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Password changed successfully' },
        strengthImprovement: {
          type: 'object',
          properties: {
            oldStrength: { type: 'string', example: 'good' },
            newStrength: { type: 'string', example: 'very_strong' },
            improvement: { type: 'boolean', example: true },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Password validation failed',
  })
  @ApiResponse({
    status: 401,
    description: 'Current password is incorrect',
  })
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{
    success: boolean;
    message: string;
    strengthImprovement?: {
      oldStrength: string;
      newStrength: string;
      improvement: boolean;
    };
  }> {
    const { currentPassword, newPassword, confirmPassword } = changePasswordDto;

    // Verify passwords match
    if (newPassword !== confirmPassword) {
      throw new Error('New password and confirmation do not match');
    }

    // Verify current password
    const currentUser = await this.authService.findUserById(user.id);
    const isCurrentPasswordValid = await this.passwordSecurityService.verifyPassword(
      currentPassword,
      currentUser.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Analyze old password strength (for comparison)
    const oldStrengthAnalysis = await this.passwordSecurityService.analyzePasswordStrength(
      currentPassword,
      user.id,
    );

    // Validate password history
    await this.passwordSecurityService.validatePasswordHistory(user.id, newPassword);

    // Hash new password (this includes strength validation and breach checking)
    const newHashResult = await this.passwordSecurityService.hashPassword(newPassword, user.id);

    // Update password in database
    await this.authService.updateUserPassword(user.id, newHashResult.hash);

    // Analyze new password strength
    const newStrengthAnalysis = await this.passwordSecurityService.analyzePasswordStrength(
      newPassword,
      user.id,
    );

    // Emit password change event for audit logging
    // this.eventEmitter.emit('password.changed', {
    //   userId: user.id,
    //   timestamp: new Date(),
    //   strengthImprovement: newStrengthAnalysis.score > oldStrengthAnalysis.score,
    // });

    return {
      success: true,
      message: 'Password changed successfully',
      strengthImprovement: {
        oldStrength: oldStrengthAnalysis.strength,
        newStrength: newStrengthAnalysis.strength,
        improvement: newStrengthAnalysis.score > oldStrengthAnalysis.score,
      },
    };
  }

  /**
   * Get password security recommendations
   */
  @Get('recommendations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get password security recommendations',
    description: 'Get personalized password security recommendations for the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'Security recommendations retrieved',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        recommendations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', example: 'password_age' },
              severity: { type: 'string', example: 'medium' },
              title: { type: 'string', example: 'Password Age' },
              description: { type: 'string' },
              action: { type: 'string' },
            },
          },
        },
      },
    },
  })
  async getSecurityRecommendations(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{
    success: boolean;
    recommendations: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      title: string;
      description: string;
      action: string;
    }>;
  }> {
    const currentUser = await this.authService.findUserById(user.id);
    const recommendations = [];

    // Check password age
    // if (currentUser.passwordChangedAt) {
    //   const passwordAge = Date.now() - currentUser.passwordChangedAt.getTime();
    //   const passwordAgeMonths = passwordAge / (1000 * 60 * 60 * 24 * 30);

    //   if (passwordAgeMonths > 12) {
    //     recommendations.push({
    //       type: 'password_age',
    //       severity: 'high' as const,
    //       title: 'Password Too Old',
    //       description: `Your password is ${Math.floor(passwordAgeMonths)} months old. Consider changing it for better security.`,
    //       action: 'Change your password using a strong, unique password.',
    //     });
    //   } else if (passwordAgeMonths > 6) {
    //     recommendations.push({
    //       type: 'password_age',
    //       severity: 'medium' as const,
    //       title: 'Consider Password Update',
    //       description: `Your password is ${Math.floor(passwordAgeMonths)} months old. Consider updating it soon.`,
    //       action: 'Plan to change your password in the coming weeks.',
    //     });
    //   }
    // }

    // Check if using old hashing algorithm
    if (this.passwordSecurityService.needsRehash(currentUser.passwordHash)) {
      recommendations.push({
        type: 'algorithm_upgrade',
        severity: 'medium' as const,
        title: 'Password Security Upgrade Available',
        description: 'Your password is using an older security algorithm. Logging in will automatically upgrade it.',
        action: 'Log out and log back in to upgrade your password security.',
      });
    }

    // Check for 2FA (if implemented)
    // if (!currentUser.twoFactorEnabled) {
    //   recommendations.push({
    //     type: 'two_factor',
    //     severity: 'high' as const,
    //     title: 'Enable Two-Factor Authentication',
    //     description: 'Two-factor authentication adds an extra layer of security to your account.',
    //     action: 'Enable 2FA in your account security settings.',
    //   });
    // }

    return {
      success: true,
      recommendations,
    };
  }
}
