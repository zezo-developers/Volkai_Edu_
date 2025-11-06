import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
  UsePipes,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { UserRole } from '../../database/entities/user.entity';
import { AntiCheatService } from './services/anti-cheating.service';
import {
  StartProctorSessionDto,
  RecordViolationDto,
  ValidateBrowserDto,
  AnalyzeTimingDto,
  ProctorSessionDto,
  SecurityViolationDto,
  SuspiciousActivityDto,
  BrowserLockdownDto,
  AntiCheatConfigDto,
  TimingAnalysisResultDto,
  BrowserValidationResultDto,
  AntiCheatStatsDto,
} from './dto/anti-cheating.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@ApiTags('Anti-Cheating')
@Controller('anti-cheating')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AntiCheatController {
  constructor(private readonly antiCheatService: AntiCheatService) {}

  @Post('sessions/start')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Start a proctored assessment session' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Proctor session started successfully',
    type: ProctorSessionDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid session data or attempt not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User already has an active session or access denied',
  })
  @ApiBody({ type: StartProctorSessionDto })
  async startProctorSession(
    @Body() startSessionDto: StartProctorSessionDto,
    @Request() req: any,
  ): Promise<ProctorSessionDto> {
    try {
      return await this.antiCheatService.startProctorSession(
        startSessionDto.attemptId,
        startSessionDto,
        req.user,
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to start proctor session',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('sessions/:sessionId/end')
  @ApiOperation({ summary: 'End a proctored assessment session' })
  @ApiParam({ name: 'sessionId', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Proctor session ended successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied to this session',
  })
  async endProctorSession(
    @Param('sessionId') sessionId: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    try {
      await this.antiCheatService.endProctorSession(sessionId, req.user);
      return { message: 'Proctor session ended successfully' };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to end proctor session',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('sessions/:sessionId/violations')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Record a security violation' })
  @ApiParam({ name: 'sessionId', type: 'string' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Violation recorded successfully',
    type: SecurityViolationDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied to this session',
  })
  @ApiBody({ type: RecordViolationDto })
  async recordViolation(
    @Param('sessionId') sessionId: string,
    @Body() violationDto: RecordViolationDto,
    @Request() req: any,
  ): Promise<SecurityViolationDto> {
    try {
      return await this.antiCheatService.recordViolation(
        sessionId,
        violationDto,
        req.user,
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to record violation',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('assessments/:assessmentId/lockdown-config')
  @ApiOperation({ summary: 'Get browser lockdown configuration for assessment' })
  @ApiParam({ name: 'assessmentId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Browser lockdown configuration retrieved successfully',
    type: BrowserLockdownDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Assessment not found',
  })
  async getBrowserLockdownConfig(
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
  ): Promise<BrowserLockdownDto> {
    try {
      return await this.antiCheatService.getBrowserLockdownConfig(assessmentId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get lockdown configuration',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('validate-browser')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Validate browser environment for assessment' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Browser validation completed',
    type: BrowserValidationResultDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid browser data',
  })
  @ApiBody({ type: ValidateBrowserDto })
  async validateBrowser(
    @Body() validateDto: ValidateBrowserDto,
  ): Promise<BrowserValidationResultDto> {
    try {
      const result = await this.antiCheatService.validateBrowserEnvironment(
        {
          userAgent: validateDto.userAgent,
          screenResolution: validateDto.screenResolution,
          timezone: validateDto.timezone,
          plugins: validateDto.plugins,
          languages: validateDto.languages,
        },
        validateDto.expectedFingerprint,
      );

      return new BrowserValidationResultDto({
        ...result,
        riskScore: result.valid ? 0 : result.warnings.length * 25,
        recommendedActions: result.valid ? [] : ['Use a supported browser', 'Disable browser extensions'],
      });
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to validate browser',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('analyze-timing')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Analyze question timing for suspicious patterns' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Timing analysis completed',
    type: TimingAnalysisResultDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Assessment attempt not found',
  })
  @ApiBody({ type: AnalyzeTimingDto })
  async analyzeQuestionTiming(
    @Body() analyzeDto: AnalyzeTimingDto,
    @Request() req: any,
  ): Promise<TimingAnalysisResultDto> {
    try {
      const result = await this.antiCheatService.analyzeQuestionTiming(
        analyzeDto.attemptId,
        analyzeDto.questionTimings,
      );

      const timings = analyzeDto.questionTimings.map(q => q.timeSpent);
      const avgTime = timings.reduce((sum, time) => sum + time, 0) / timings.length;
      const minTime = Math.min(...timings);
      const maxTime = Math.max(...timings);
      const variance = timings.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / timings.length;

      return new TimingAnalysisResultDto({
        ...result,
        averageTime: avgTime,
        fastestTime: minTime,
        slowestTime: maxTime,
        timeVariance: Math.sqrt(variance) / avgTime,
      });
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to analyze timing',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('suspicious-activity')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Get suspicious activity reports' })
  @ApiQuery({ name: 'assessmentId', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Suspicious activity retrieved successfully',
    type: [SuspiciousActivityDto],
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async getSuspiciousActivity(
    @Query('assessmentId') assessmentId?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<SuspiciousActivityDto[]> {
    try {
      return await this.antiCheatService.getSuspiciousActivity(
        assessmentId,
        userId,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined,
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get suspicious activity',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('statistics')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Get anti-cheating statistics' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Anti-cheating statistics retrieved successfully',
    type: AntiCheatStatsDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async getAntiCheatStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<AntiCheatStatsDto> {
    try {
      // Mock statistics for now - in a real implementation, this would query the database
      const stats = {
        totalSessions: 1250,
        activeSessions: 15,
        flaggedSessions: 89,
        totalViolations: 456,
        violationsByType: {
          tab_switch: 125,
          copy_paste: 89,
          dev_tools: 67,
          fullscreen_exit: 45,
          window_blur: 78,
          right_click: 32,
          suspicious_timing: 20,
        },
        weeklyFlagged: 23,
        mostCommonViolation: 'tab_switch',
        averageViolationsPerSession: 3.6,
      };

      return new AntiCheatStatsDto(stats);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get anti-cheating statistics',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('sessions/:sessionId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Get proctor session details' })
  @ApiParam({ name: 'sessionId', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session details retrieved successfully',
    type: ProctorSessionDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async getProctorSession(
    @Param('sessionId') sessionId: string,
  ): Promise<ProctorSessionDto> {
    try {
      // In a real implementation, this would retrieve from the service
      // For now, return a mock session
      const mockSession = {
        id: sessionId,
        attemptId: 'attempt-123',
        userId: 'user-456',
        startTime: new Date(Date.now() - 3600000), // 1 hour ago
        endTime: new Date(),
        status: 'completed',
        violations: [
          {
            id: 'violation-1',
            type: 'tab_switch',
            severity: 'medium',
            timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
            flagged: true,
          },
        ],
        browserFingerprint: 'fp_123456',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0...',
        screenResolution: '1920x1080',
        timezone: 'America/New_York',
        metadata: {},
      };

      return new ProctorSessionDto(mockSession);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get proctor session',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('violations/:violationId/review')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Review and update a security violation' })
  @ApiParam({ name: 'violationId', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Violation reviewed successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Violation not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async reviewViolation(
    @Param('violationId') violationId: string,
    @Body('reviewNotes') reviewNotes: string,
    @Body('flagged') flagged: boolean,
    @Request() req: any,
  ): Promise<{ message: string }> {
    try {
      // In a real implementation, this would update the violation in the database
      // For now, just return success
      return { message: 'Violation reviewed successfully' };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to review violation',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
