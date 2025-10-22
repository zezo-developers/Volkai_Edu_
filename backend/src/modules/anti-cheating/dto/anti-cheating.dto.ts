import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsUUID,
  IsObject,
  IsNumber,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ViolationType {
  TAB_SWITCH = 'tab_switch',
  WINDOW_BLUR = 'window_blur',
  COPY_PASTE = 'copy_paste',
  RIGHT_CLICK = 'right_click',
  DEV_TOOLS = 'dev_tools',
  FULLSCREEN_EXIT = 'fullscreen_exit',
  SUSPICIOUS_TIMING = 'suspicious_timing',
  MULTIPLE_SESSIONS = 'multiple_sessions',
  IP_CHANGE = 'ip_change',
  BROWSER_CHANGE = 'browser_change',
}

export enum ViolationSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export class StartProctorSessionDto {
  @ApiProperty({ description: 'Assessment attempt ID' })
  @IsUUID()
  attemptId: string;

  @ApiProperty({ description: 'Browser fingerprint' })
  @IsString()
  browserFingerprint: string;

  @ApiProperty({ description: 'Client IP address' })
  @IsString()
  ipAddress: string;

  @ApiProperty({ description: 'User agent string' })
  @IsString()
  userAgent: string;

  @ApiProperty({ description: 'Screen resolution (e.g., "1920x1080")' })
  @IsString()
  screenResolution: string;

  @ApiProperty({ description: 'Client timezone' })
  @IsString()
  timezone: string;

  @ApiPropertyOptional({ description: 'Additional session metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class RecordViolationDto {
  @ApiProperty({ enum: ViolationType, description: 'Type of violation' })
  @IsEnum(ViolationType)
  type: ViolationType;

  @ApiProperty({ enum: ViolationSeverity, description: 'Severity of violation' })
  @IsEnum(ViolationSeverity)
  severity: ViolationSeverity;

  @ApiPropertyOptional({ description: 'Additional violation details' })
  @IsOptional()
  @IsObject()
  details?: Record<string, any>;
}

export class ValidateBrowserDto {
  @ApiProperty({ description: 'User agent string' })
  @IsString()
  userAgent: string;

  @ApiProperty({ description: 'Screen resolution' })
  @IsString()
  screenResolution: string;

  @ApiProperty({ description: 'Timezone' })
  @IsString()
  timezone: string;

  @ApiProperty({ description: 'Browser plugins', type: [String] })
  @IsArray()
  @IsString({ each: true })
  plugins: string[];

  @ApiProperty({ description: 'Browser languages', type: [String] })
  @IsArray()
  @IsString({ each: true })
  languages: string[];

  @ApiPropertyOptional({ description: 'Expected browser fingerprint' })
  @IsOptional()
  @IsString()
  expectedFingerprint?: string;
}

export class QuestionTimingDto {
  @ApiProperty({ description: 'Question index' })
  @IsNumber()
  @Min(0)
  questionIndex: number;

  @ApiProperty({ description: 'Time spent on question in milliseconds' })
  @IsNumber()
  @Min(0)
  timeSpent: number;
}

export class AnalyzeTimingDto {
  @ApiProperty({ description: 'Assessment attempt ID' })
  @IsUUID()
  attemptId: string;

  @ApiProperty({ type: [QuestionTimingDto], description: 'Question timing data' })
  @IsArray()
  questionTimings: QuestionTimingDto[];
}

export class ProctorSessionDto {
  @ApiProperty({ description: 'Session ID' })
  id: string;

  @ApiProperty({ description: 'Assessment attempt ID' })
  attemptId: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Session start time' })
  startTime: Date;

  @ApiPropertyOptional({ description: 'Session end time' })
  endTime?: Date;

  @ApiProperty({ description: 'Session status' })
  status: 'active' | 'completed' | 'terminated';

  @ApiProperty({ description: 'Number of violations' })
  violationCount: number;

  @ApiProperty({ description: 'Browser fingerprint' })
  browserFingerprint: string;

  @ApiProperty({ description: 'IP address' })
  ipAddress: string;

  @ApiProperty({ description: 'User agent' })
  userAgent: string;

  @ApiProperty({ description: 'Screen resolution' })
  screenResolution: string;

  @ApiProperty({ description: 'Timezone' })
  timezone: string;

  @ApiPropertyOptional({ description: 'Session metadata' })
  metadata?: Record<string, any>;

  constructor(session: any) {
    this.id = session.id;
    this.attemptId = session.attemptId;
    this.userId = session.userId;
    this.startTime = session.startTime;
    this.endTime = session.endTime;
    this.status = session.status;
    this.violationCount = session.violations?.length || 0;
    this.browserFingerprint = session.browserFingerprint;
    this.ipAddress = session.ipAddress;
    this.userAgent = session.userAgent;
    this.screenResolution = session.screenResolution;
    this.timezone = session.timezone;
    this.metadata = session.metadata;
  }
}

export class SecurityViolationDto {
  @ApiProperty({ description: 'Violation ID' })
  id: string;

  @ApiProperty({ enum: ViolationType, description: 'Violation type' })
  type: ViolationType;

  @ApiProperty({ enum: ViolationSeverity, description: 'Violation severity' })
  severity: ViolationSeverity;

  @ApiProperty({ description: 'Violation timestamp' })
  timestamp: Date;

  @ApiPropertyOptional({ description: 'Violation details' })
  details?: Record<string, any>;

  @ApiProperty({ description: 'Whether violation is flagged for review' })
  flagged: boolean;

  @ApiProperty({ description: 'Whether violation has been reviewed' })
  reviewed: boolean;

  @ApiPropertyOptional({ description: 'Reviewed by user ID' })
  reviewedBy?: string;

  @ApiPropertyOptional({ description: 'Review notes' })
  reviewNotes?: string;

  constructor(violation: any) {
    this.id = violation.id;
    this.type = violation.type;
    this.severity = violation.severity;
    this.timestamp = violation.timestamp;
    this.details = violation.details;
    this.flagged = violation.flagged;
    this.reviewed = violation.reviewed;
    this.reviewedBy = violation.reviewedBy;
    this.reviewNotes = violation.reviewNotes;
  }
}

export class SuspiciousActivityDto {
  @ApiProperty({ description: 'Proctor session ID' })
  sessionId: string;

  @ApiProperty({ description: 'Assessment attempt ID' })
  attemptId: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Number of violations' })
  violationCount: number;

  @ApiProperty({ enum: ViolationSeverity, description: 'Highest violation severity' })
  highestSeverity: ViolationSeverity;

  @ApiProperty({ description: 'Activity timestamp' })
  timestamp: Date;

  @ApiProperty({ description: 'Session status' })
  status: string;

  @ApiProperty({ type: [SecurityViolationDto], description: 'Flagged violations' })
  violations: SecurityViolationDto[];

  constructor(data: any) {
    this.sessionId = data.sessionId;
    this.attemptId = data.attemptId;
    this.userId = data.userId;
    this.violationCount = data.violationCount;
    this.highestSeverity = data.highestSeverity;
    this.timestamp = data.timestamp;
    this.status = data.status;
    this.violations = data.violations.map((v: any) => new SecurityViolationDto(v));
  }
}

export class BrowserLockdownDto {
  @ApiProperty({ description: 'Enable browser lockdown' })
  enableLockdown: boolean;

  @ApiProperty({ description: 'Prevent tab switching' })
  preventTabSwitching: boolean;

  @ApiProperty({ description: 'Prevent copy/paste operations' })
  preventCopyPaste: boolean;

  @ApiProperty({ description: 'Prevent right-click context menu' })
  preventRightClick: boolean;

  @ApiProperty({ description: 'Prevent developer tools access' })
  preventDevTools: boolean;

  @ApiProperty({ description: 'Require fullscreen mode' })
  requireFullscreen: boolean;

  @ApiProperty({ description: 'Prevent back navigation' })
  preventBackNavigation: boolean;

  @ApiProperty({ description: 'Allowed domains', type: [String] })
  allowedDomains: string[];

  @ApiProperty({ description: 'Blocked keystrokes', type: [String] })
  blockedKeystrokes: string[];

  @ApiProperty({ description: 'Warning message to display' })
  warningMessage: string;

  constructor(config: any) {
    this.enableLockdown = config.enableLockdown;
    this.preventTabSwitching = config.preventTabSwitching;
    this.preventCopyPaste = config.preventCopyPaste;
    this.preventRightClick = config.preventRightClick;
    this.preventDevTools = config.preventDevTools;
    this.requireFullscreen = config.requireFullscreen;
    this.preventBackNavigation = config.preventBackNavigation;
    this.allowedDomains = config.allowedDomains;
    this.blockedKeystrokes = config.blockedKeystrokes;
    this.warningMessage = config.warningMessage;
  }
}

export class AntiCheatConfigDto {
  @ApiProperty({ description: 'Enable browser lockdown' })
  @IsBoolean()
  enableBrowserLockdown: boolean;

  @ApiProperty({ description: 'Prevent tab switching' })
  @IsBoolean()
  preventTabSwitching: boolean;

  @ApiProperty({ description: 'Prevent copy/paste operations' })
  @IsBoolean()
  preventCopyPaste: boolean;

  @ApiProperty({ description: 'Prevent right-click' })
  @IsBoolean()
  preventRightClick: boolean;

  @ApiProperty({ description: 'Prevent developer tools' })
  @IsBoolean()
  preventDevTools: boolean;

  @ApiProperty({ description: 'Require fullscreen mode' })
  @IsBoolean()
  requireFullscreen: boolean;

  @ApiProperty({ description: 'Enable webcam monitoring' })
  @IsBoolean()
  enableWebcamMonitoring: boolean;

  @ApiProperty({ description: 'Enable screen recording' })
  @IsBoolean()
  enableScreenRecording: boolean;

  @ApiProperty({ description: 'Maximum violations allowed' })
  @IsNumber()
  @Min(1)
  @Max(20)
  maxViolationsAllowed: number;

  @ApiProperty({ description: 'Auto-flag threshold' })
  @IsNumber()
  @Min(1)
  @Max(10)
  autoFlagThreshold: number;

  @ApiProperty({ description: 'Enable time analysis' })
  @IsBoolean()
  timeAnalysisEnabled: boolean;

  @ApiProperty({ description: 'Enable IP restriction' })
  @IsBoolean()
  ipRestrictionEnabled: boolean;

  @ApiPropertyOptional({ description: 'Allowed IP ranges', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedIpRanges?: string[];

  @ApiProperty({ description: 'Session timeout in milliseconds' })
  @IsNumber()
  @Min(300000) // 5 minutes minimum
  @Max(14400000) // 4 hours maximum
  sessionTimeout: number;

  @ApiProperty({ description: 'Enable question shuffling' })
  @IsBoolean()
  questionShuffling: boolean;

  @ApiProperty({ description: 'Enable option shuffling' })
  @IsBoolean()
  optionShuffling: boolean;

  @ApiProperty({ description: 'Prevent back navigation' })
  @IsBoolean()
  preventBackNavigation: boolean;

  @ApiProperty({ description: 'Enable keystroke analysis' })
  @IsBoolean()
  enableKeystrokeAnalysis: boolean;
}

export class TimingAnalysisResultDto {
  @ApiProperty({ description: 'Whether timing is suspicious' })
  suspicious: boolean;

  @ApiProperty({ description: 'Reasons for suspicion', type: [String] })
  reasons: string[];

  @ApiProperty({ description: 'Average time per question in milliseconds' })
  averageTime: number;

  @ApiProperty({ description: 'Fastest question time in milliseconds' })
  fastestTime: number;

  @ApiProperty({ description: 'Slowest question time in milliseconds' })
  slowestTime: number;

  @ApiProperty({ description: 'Time variance coefficient' })
  timeVariance: number;

  constructor(data: any) {
    this.suspicious = data.suspicious;
    this.reasons = data.reasons;
    this.averageTime = data.averageTime;
    this.fastestTime = data.fastestTime;
    this.slowestTime = data.slowestTime;
    this.timeVariance = data.timeVariance;
  }
}

export class BrowserValidationResultDto {
  @ApiProperty({ description: 'Whether browser environment is valid' })
  valid: boolean;

  @ApiProperty({ description: 'Validation warnings', type: [String] })
  warnings: string[];

  @ApiProperty({ description: 'Risk score (0-100)' })
  riskScore: number;

  @ApiProperty({ description: 'Recommended actions', type: [String] })
  recommendedActions: string[];

  constructor(data: any) {
    this.valid = data.valid;
    this.warnings = data.warnings;
    this.riskScore = data.riskScore || 0;
    this.recommendedActions = data.recommendedActions || [];
  }
}

export class AntiCheatStatsDto {
  @ApiProperty({ description: 'Total proctored sessions' })
  totalSessions: number;

  @ApiProperty({ description: 'Active sessions' })
  activeSessions: number;

  @ApiProperty({ description: 'Flagged sessions' })
  flaggedSessions: number;

  @ApiProperty({ description: 'Total violations recorded' })
  totalViolations: number;

  @ApiProperty({ description: 'Violations by type' })
  violationsByType: Record<string, number>;

  @ApiProperty({ description: 'Sessions flagged this week' })
  weeklyFlagged: number;

  @ApiProperty({ description: 'Most common violation type' })
  mostCommonViolation: string;

  @ApiProperty({ description: 'Average violations per session' })
  averageViolationsPerSession: number;

  constructor(data: any) {
    this.totalSessions = data.totalSessions;
    this.activeSessions = data.activeSessions;
    this.flaggedSessions = data.flaggedSessions;
    this.totalViolations = data.totalViolations;
    this.violationsByType = data.violationsByType;
    this.weeklyFlagged = data.weeklyFlagged;
    this.mostCommonViolation = data.mostCommonViolation;
    this.averageViolationsPerSession = data.averageViolationsPerSession;
  }
}
