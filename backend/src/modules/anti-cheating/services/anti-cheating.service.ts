import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Assessment } from '../../../database/entities/assessment.entity';
import { AssessmentAttempt } from '../../../database/entities/assessment-attempt.entity';
import { User } from '../../../database/entities/user.entity';
import { Enrollment } from '../../../database/entities/enrollment.entity';
import {
  ProctorSessionDto,
  SuspiciousActivityDto,
  AntiCheatConfigDto,
  SecurityViolationDto,
  BrowserLockdownDto,
} from '../dto/anti-cheating.dto';

export interface ProctorSession {
  id: string;
  attemptId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'completed' | 'terminated';
  violations: SecurityViolation[];
  browserFingerprint: string;
  ipAddress: string;
  userAgent: string;
  screenResolution: string;
  timezone: string;
  metadata: Record<string, any>;
}

export interface SecurityViolation {
  id: string;
  type: 'tab_switch' | 'window_blur' | 'copy_paste' | 'right_click' | 'dev_tools' | 'fullscreen_exit' | 'suspicious_timing' | 'multiple_sessions' | 'ip_change' | 'browser_change';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  details: Record<string, any>;
  flagged: boolean;
  reviewed: boolean;
  reviewedBy?: string;
  reviewNotes?: string;
}

export interface AntiCheatConfig {
  enableBrowserLockdown: boolean;
  preventTabSwitching: boolean;
  preventCopyPaste: boolean;
  preventRightClick: boolean;
  preventDevTools: boolean;
  requireFullscreen: boolean;
  enableWebcamMonitoring: boolean;
  enableScreenRecording: boolean;
  maxViolationsAllowed: number;
  autoFlagThreshold: number;
  timeAnalysisEnabled: boolean;
  ipRestrictionEnabled: boolean;
  allowedIpRanges: string[];
  sessionTimeout: number;
  questionShuffling: boolean;
  optionShuffling: boolean;
  preventBackNavigation: boolean;
  enableKeystrokeAnalysis: boolean;
}

@Injectable()
export class AntiCheatService {
  private readonly logger = new Logger(AntiCheatService.name);
  private proctorSessions = new Map<string, ProctorSession>();
  private defaultConfig: AntiCheatConfig = {
    enableBrowserLockdown: true,
    preventTabSwitching: true,
    preventCopyPaste: true,
    preventRightClick: true,
    preventDevTools: true,
    requireFullscreen: true,
    enableWebcamMonitoring: false,
    enableScreenRecording: false,
    maxViolationsAllowed: 5,
    autoFlagThreshold: 3,
    timeAnalysisEnabled: true,
    ipRestrictionEnabled: false,
    allowedIpRanges: [],
    sessionTimeout: 3600000, // 1 hour
    questionShuffling: true,
    optionShuffling: true,
    preventBackNavigation: true,
    enableKeystrokeAnalysis: false,
  };

  constructor(
    @InjectRepository(Assessment)
    private assessmentRepository: Repository<Assessment>,
    @InjectRepository(AssessmentAttempt)
    private attemptRepository: Repository<AssessmentAttempt>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    private eventEmitter: EventEmitter2,
  ) {}

  async startProctorSession(
    attemptId: string,
    sessionData: Partial<ProctorSessionDto>,
    user: User,
  ): Promise<ProctorSessionDto> {
    try {
      const attempt = await this.attemptRepository.findOne({
        where: { id: attemptId },
        relations: ['assessment', 'user'],
      });

      if (!attempt) {
        throw new Error('Assessment attempt not found');
      }

      if (attempt.userId !== user.id) {
        throw new ForbiddenException('Access denied to this attempt');
      }

      // Check for existing active sessions
      const existingSessions = Array.from(this.proctorSessions.values())
        .filter(s => s.userId === user.id && s.status === 'active');

      if (existingSessions.length > 0) {
        throw new ForbiddenException('User already has an active proctoring session');
      }

      // Create new proctor session
      const session: ProctorSession = {
        id: this.generateSessionId(),
        attemptId,
        userId: user.id,
        startTime: new Date(),
        status: 'active',
        violations: [],
        browserFingerprint: sessionData.browserFingerprint || '',
        ipAddress: sessionData.ipAddress || '',
        userAgent: sessionData.userAgent || '',
        screenResolution: sessionData.screenResolution || '',
        timezone: sessionData.timezone || '',
        metadata: sessionData.metadata || {},
      };

      this.proctorSessions.set(session.id, session);

      // Set session timeout
      setTimeout(() => {
        this.handleSessionTimeout(session.id);
      }, this.getAssessmentConfig(attempt.assessment).sessionTimeout);

      // Emit event
      this.eventEmitter.emit('proctor.session.started', {
        session,
        attempt,
        user,
      });

      this.logger.log(`Started proctor session ${session.id} for attempt ${attemptId}`);

      return new ProctorSessionDto(session);
    } catch (error) {
      this.logger.error(`Failed to start proctor session for attempt ${attemptId}`, error);
      throw error;
    }
  }

  async endProctorSession(sessionId: string, user: User): Promise<void> {
    try {
      const session = this.proctorSessions.get(sessionId);
      if (!session) {
        throw new Error('Proctor session not found');
      }

      if (session.userId !== user.id) {
        throw new ForbiddenException('Access denied to this session');
      }

      session.status = 'completed';
      session.endTime = new Date();

      // Analyze session for final violations
      await this.analyzeSessionCompletion(session);

      // Emit event
      this.eventEmitter.emit('proctor.session.ended', {
        session,
        user,
      });

      this.logger.log(`Ended proctor session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to end proctor session ${sessionId}`, error);
      throw error;
    }
  }

  async recordViolation(
    sessionId: string,
    violationData: Partial<SecurityViolationDto>,
    user: User,
  ): Promise<SecurityViolationDto> {
    try {
      const session = this.proctorSessions.get(sessionId);
      if (!session) {
        throw new Error('Proctor session not found');
      }

      if (session.userId !== user.id) {
        throw new ForbiddenException('Access denied to this session');
      }

      const violation: SecurityViolation = {
        id: this.generateViolationId(),
        type: violationData.type || 'tab_switch',
        severity: violationData.severity || 'medium',
        timestamp: new Date(),
        details: violationData.details || {},
        flagged: false,
        reviewed: false,
      };

      // Determine if violation should be auto-flagged
      const config = await this.getSessionConfig(sessionId);
      violation.flagged = this.shouldAutoFlag(violation, session.violations, config);

      session.violations.push(violation);

      // Check if maximum violations exceeded
      if (session.violations.length >= config.maxViolationsAllowed) {
        await this.terminateSession(sessionId, 'Maximum violations exceeded');
      }

      // Emit event
      this.eventEmitter.emit('proctor.violation.recorded', {
        session,
        violation,
        user,
      });

      this.logger.warn(
        `Recorded ${violation.severity} violation: ${violation.type} in session ${sessionId}`,
      );

      return new SecurityViolationDto(violation);
    } catch (error) {
      this.logger.error(`Failed to record violation for session ${sessionId}`, error);
      throw error;
    }
  }

  async getSuspiciousActivity(
    assessmentId?: string,
    userId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<SuspiciousActivityDto[]> {
    try {
      const activities: SuspiciousActivityDto[] = [];

      // Filter sessions based on criteria
      const sessions = Array.from(this.proctorSessions.values()).filter(session => {
        if (assessmentId && !session.attemptId.includes(assessmentId)) return false;
        if (userId && session.userId !== userId) return false;
        if (startDate && session.startTime < startDate) return false;
        if (endDate && session.startTime > endDate) return false;
        return true;
      });

      for (const session of sessions) {
        const flaggedViolations = session.violations.filter(v => v.flagged);
        
        if (flaggedViolations.length > 0) {
          activities.push(new SuspiciousActivityDto({
            sessionId: session.id,
            attemptId: session.attemptId,
            userId: session.userId,
            violationCount: flaggedViolations.length,
            highestSeverity: this.getHighestSeverity(flaggedViolations),
            timestamp: session.startTime,
            status: session.status,
            violations: flaggedViolations,
          }));
        }
      }

      // Sort by severity and violation count
      activities.sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const aSeverity = severityOrder[a.highestSeverity];
        const bSeverity = severityOrder[b.highestSeverity];
        
        if (aSeverity !== bSeverity) {
          return bSeverity - aSeverity;
        }
        
        return b.violationCount - a.violationCount;
      });

      return activities;
    } catch (error) {
      this.logger.error('Failed to get suspicious activity', error);
      throw error;
    }
  }

  async getBrowserLockdownConfig(assessmentId: string): Promise<BrowserLockdownDto> {
    try {
      const assessment = await this.assessmentRepository.findOne({
        where: { id: assessmentId },
      });

      if (!assessment) {
        throw new Error('Assessment not found');
      }

      const config = this.getAssessmentConfig(assessment);

      return new BrowserLockdownDto({
        enableLockdown: config.enableBrowserLockdown,
        preventTabSwitching: config.preventTabSwitching,
        preventCopyPaste: config.preventCopyPaste,
        preventRightClick: config.preventRightClick,
        preventDevTools: config.preventDevTools,
        requireFullscreen: config.requireFullscreen,
        preventBackNavigation: config.preventBackNavigation,
        allowedDomains: ['localhost', 'your-lms-domain.com'],
        blockedKeystrokes: ['Ctrl+C', 'Ctrl+V', 'Ctrl+A', 'F12', 'Ctrl+Shift+I'],
        warningMessage: 'This assessment is being monitored. Any suspicious activity will be recorded.',
      });
    } catch (error) {
      this.logger.error(`Failed to get browser lockdown config for assessment ${assessmentId}`, error);
      throw error;
    }
  }

  async analyzeQuestionTiming(
    attemptId: string,
    questionTimings: { questionIndex: number; timeSpent: number }[],
  ): Promise<{ suspicious: boolean; reasons: string[] }> {
    try {
      const attempt = await this.attemptRepository.findOne({
        where: { id: attemptId },
        relations: ['assessment'],
      });

      if (!attempt) {
        throw new Error('Assessment attempt not found');
      }

      const reasons: string[] = [];
      let suspicious = false;

      // Analyze timing patterns
      const avgTime = questionTimings.reduce((sum, q) => sum + q.timeSpent, 0) / questionTimings.length;
      
      for (const timing of questionTimings) {
        // Too fast (less than 10% of average)
        if (timing.timeSpent < avgTime * 0.1 && timing.timeSpent < 5000) {
          reasons.push(`Question ${timing.questionIndex + 1} answered too quickly (${timing.timeSpent}ms)`);
          suspicious = true;
        }

        // Suspiciously consistent timing
        const variance = Math.abs(timing.timeSpent - avgTime) / avgTime;
        if (variance < 0.05 && questionTimings.length > 5) {
          reasons.push(`Suspiciously consistent timing pattern detected`);
          suspicious = true;
        }
      }

      // Check for copy-paste patterns (very fast followed by normal)
      for (let i = 0; i < questionTimings.length - 1; i++) {
        const current = questionTimings[i];
        const next = questionTimings[i + 1];
        
        if (current.timeSpent < 2000 && next.timeSpent > avgTime * 1.5) {
          reasons.push(`Possible copy-paste pattern detected between questions ${current.questionIndex + 1} and ${next.questionIndex + 1}`);
          suspicious = true;
        }
      }

      return { suspicious, reasons };
    } catch (error) {
      this.logger.error(`Failed to analyze question timing for attempt ${attemptId}`, error);
      throw error;
    }
  }

  async validateBrowserEnvironment(
    sessionData: {
      userAgent: string;
      screenResolution: string;
      timezone: string;
      plugins: string[];
      languages: string[];
    },
    expectedFingerprint?: string,
  ): Promise<{ valid: boolean; warnings: string[] }> {
    const warnings: string[] = [];
    let valid = true;

    // Check for suspicious user agents
    const suspiciousAgents = ['headless', 'phantom', 'selenium', 'webdriver'];
    if (suspiciousAgents.some(agent => sessionData.userAgent.toLowerCase().includes(agent))) {
      warnings.push('Suspicious user agent detected');
      valid = false;
    }

    // Check for automation tools
    if (sessionData.plugins.some(plugin => plugin.includes('webdriver') || plugin.includes('automation'))) {
      warnings.push('Browser automation tools detected');
      valid = false;
    }

    // Validate screen resolution (too small might indicate mobile or automation)
    const [width, height] = sessionData.screenResolution.split('x').map(Number);
    if (width < 800 || height < 600) {
      warnings.push('Screen resolution too small for assessment');
      valid = false;
    }

    // Check timezone consistency
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (sessionData.timezone !== browserTimezone) {
      warnings.push('Timezone mismatch detected');
    }

    return { valid, warnings };
  }

  private async terminateSession(sessionId: string, reason: string): Promise<void> {
    const session = this.proctorSessions.get(sessionId);
    if (!session) return;

    session.status = 'terminated';
    session.endTime = new Date();
    session.metadata.terminationReason = reason;

    // Flag the attempt for review
    await this.attemptRepository.update(session.attemptId, {
      flaggedForReview: true,
    });

    this.eventEmitter.emit('proctor.session.terminated', {
      session,
      reason,
    });

    this.logger.warn(`Terminated proctor session ${sessionId}: ${reason}`);
  }

  private async handleSessionTimeout(sessionId: string): Promise<void> {
    const session = this.proctorSessions.get(sessionId);
    if (!session || session.status !== 'active') return;

    await this.terminateSession(sessionId, 'Session timeout');
  }

  private async analyzeSessionCompletion(session: ProctorSession): Promise<void> {
    // Perform final analysis on the completed session
    const violationsByType = this.groupViolationsByType(session.violations);
    
    // Check for patterns that might indicate cheating
    if (violationsByType['tab_switch']?.length > 5) {
      session.violations.push({
        id: this.generateViolationId(),
        type: 'suspicious_timing',
        severity: 'high',
        timestamp: new Date(),
        details: { reason: 'Excessive tab switching detected' },
        flagged: true,
        reviewed: false,
      });
    }
  }

  private shouldAutoFlag(
    violation: SecurityViolation,
    existingViolations: SecurityViolation[],
    config: AntiCheatConfig,
  ): boolean {
    // Auto-flag critical violations
    if (violation.severity === 'critical') return true;

    // Auto-flag if threshold exceeded
    const recentViolations = existingViolations.filter(
      v => Date.now() - v.timestamp.getTime() < 300000 // 5 minutes
    );

    return recentViolations.length >= config.autoFlagThreshold;
  }

  private getAssessmentConfig(assessment: Assessment): AntiCheatConfig {
    // In a real implementation, this would be stored in the assessment metadata
    return {
      ...this.defaultConfig,
      ...(assessment.metadata?.antiCheatConfig && typeof assessment.metadata.antiCheatConfig === 'object'
        ? assessment.metadata.antiCheatConfig
        : {}),
    };}

  private async getSessionConfig(sessionId: string): Promise<AntiCheatConfig> {
    const session = this.proctorSessions.get(sessionId);
    if (!session) return this.defaultConfig;

    const attempt = await this.attemptRepository.findOne({
      where: { id: session.attemptId },
      relations: ['assessment'],
    });

    return attempt ? this.getAssessmentConfig(attempt.assessment) : this.defaultConfig;
  }

  private getHighestSeverity(violations: SecurityViolation[]): 'low' | 'medium' | 'high' | 'critical' {
    const severityOrder = ['low', 'medium', 'high', 'critical'];
    return violations.reduce((highest, violation) => {
      return severityOrder.indexOf(violation.severity) > severityOrder.indexOf(highest)
        ? violation.severity
        : highest;
    }, 'low' as any);
  }

  private groupViolationsByType(violations: SecurityViolation[]): Record<string, SecurityViolation[]> {
    return violations.reduce((groups, violation) => {
      if (!groups[violation.type]) {
        groups[violation.type] = [];
      }
      groups[violation.type].push(violation);
      return groups;
    }, {} as Record<string, SecurityViolation[]>);
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateViolationId(): string {
    return `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
