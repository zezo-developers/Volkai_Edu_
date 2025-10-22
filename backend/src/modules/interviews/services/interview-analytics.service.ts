import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InterviewSession, InterviewStatus, InterviewType } from '../../../database/entities/interview-session.entity';
import { InterviewResponse, ResponseStatus } from '../../../database/entities/interview-response.entity';
import { AiMockInterview, AiInterviewStatus } from '../../../database/entities/ai-mock-interview.entity';
import { InterviewQuestion } from '../../../database/entities/interview-question.entity';
import { User, UserRole } from '../../../database/entities/user.entity';
import {
  InterviewAnalyticsDto,
  InterviewPerformanceDto,
  InterviewTrendsDto,
  SkillAnalyticsDto,
  CandidateAnalyticsDto,
  InterviewerAnalyticsDto,
} from '../dto/interview-analytics.dto';

@Injectable()
export class InterviewAnalyticsService {
  private readonly logger = new Logger(InterviewAnalyticsService.name);

  constructor(
    @InjectRepository(InterviewSession)
    private interviewSessionRepository: Repository<InterviewSession>,
    @InjectRepository(InterviewResponse)
    private interviewResponseRepository: Repository<InterviewResponse>,
    @InjectRepository(AiMockInterview)
    private aiMockInterviewRepository: Repository<AiMockInterview>,
    @InjectRepository(InterviewQuestion)
    private interviewQuestionRepository: Repository<InterviewQuestion>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getInterviewAnalytics(
    organizationId?: string,
    startDate?: Date,
    endDate?: Date,
    user?: User,
  ): Promise<InterviewAnalyticsDto> {
    try {
      // Validate permissions
      if (user && user.roles=== UserRole.STUDENT) {
        throw new ForbiddenException('Students cannot access interview analytics');
      }

      const queryBuilder = this.interviewSessionRepository
        .createQueryBuilder('session')
        .leftJoinAndSelect('session.candidate', 'candidate')
        .leftJoinAndSelect('session.interviewer', 'interviewer')
        .leftJoinAndSelect('session.job', 'job');

      // Apply organization filter
      if (organizationId) {
        queryBuilder.andWhere('session.organizationId = :orgId', { orgId: organizationId });
      } else if (user?.organizationId) {
        queryBuilder.andWhere('session.organizationId = :orgId', { orgId: user.organizationId });
      }

      // Apply date filters
      if (startDate) {
        queryBuilder.andWhere('session.createdAt >= :startDate', { startDate });
      }
      if (endDate) {
        queryBuilder.andWhere('session.createdAt <= :endDate', { endDate });
      }

      const sessions = await queryBuilder.getMany();

      // Calculate analytics
      const analytics = await this.calculateInterviewAnalytics(sessions);

      return new InterviewAnalyticsDto(analytics);
    } catch (error) {
      this.logger.error('Failed to get interview analytics', error);
      throw error;
    }
  }

  async getCandidateAnalytics(
    candidateId: string,
    user: User,
    startDate?: Date,
    endDate?: Date,
  ): Promise<CandidateAnalyticsDto> {
    try {
      // Validate permissions
      if (user.roles=== UserRole.STUDENT && user.id !== candidateId) {
        throw new ForbiddenException('Cannot access other candidate analytics');
      }

      // Get interview sessions
      const sessionQuery = this.interviewSessionRepository
        .createQueryBuilder('session')
        .leftJoinAndSelect('session.interviewer', 'interviewer')
        .leftJoinAndSelect('session.job', 'job')
        .leftJoinAndSelect('session.responses', 'responses')
        .where('session.candidateId = :candidateId', { candidateId });

      if (startDate) {
        sessionQuery.andWhere('session.createdAt >= :startDate', { startDate });
      }
      if (endDate) {
        sessionQuery.andWhere('session.createdAt <= :endDate', { endDate });
      }

      const sessions = await sessionQuery.getMany();

      // Get AI mock interviews
      const aiInterviewQuery = this.aiMockInterviewRepository
        .createQueryBuilder('ai')
        .where('ai.userId = :candidateId', { candidateId });

      if (startDate) {
        aiInterviewQuery.andWhere('ai.createdAt >= :startDate', { startDate });
      }
      if (endDate) {
        aiInterviewQuery.andWhere('ai.createdAt <= :endDate', { endDate });
      }

      const aiInterviews = await aiInterviewQuery.getMany();

      // Calculate candidate analytics
      const analytics = await this.calculateCandidateAnalytics(sessions, aiInterviews);

      return new CandidateAnalyticsDto(analytics);
    } catch (error) {
      this.logger.error(`Failed to get candidate analytics for ${candidateId}`, error);
      throw error;
    }
  }

  async getInterviewerAnalytics(
    interviewerId: string,
    user: User,
    startDate?: Date,
    endDate?: Date,
  ): Promise<InterviewerAnalyticsDto> {
    try {
      // Validate permissions
      if (user.roles=== UserRole.STUDENT) {
        throw new ForbiddenException('Students cannot access interviewer analytics');
      }

      if (user.id !== interviewerId && user.roles!== UserRole.ADMIN) {
        throw new ForbiddenException('Cannot access other interviewer analytics');
      }

      const queryBuilder = this.interviewSessionRepository
        .createQueryBuilder('session')
        .leftJoinAndSelect('session.candidate', 'candidate')
        .leftJoinAndSelect('session.job', 'job')
        .leftJoinAndSelect('session.responses', 'responses')
        .where('session.interviewerId = :interviewerId', { interviewerId });

      if (startDate) {
        queryBuilder.andWhere('session.createdAt >= :startDate', { startDate });
      }
      if (endDate) {
        queryBuilder.andWhere('session.createdAt <= :endDate', { endDate });
      }

      const sessions = await queryBuilder.getMany();

      // Calculate interviewer analytics
      const analytics = await this.calculateInterviewerAnalytics(sessions);

      return new InterviewerAnalyticsDto(analytics);
    } catch (error) {
      this.logger.error(`Failed to get interviewer analytics for ${interviewerId}`, error);
      throw error;
    }
  }

  async getInterviewTrends(
    organizationId?: string,
    period: 'week' | 'month' | 'quarter' | 'year' = 'month',
    user?: User,
  ): Promise<InterviewTrendsDto> {
    try {
      // Validate permissions
      if (user && user.roles=== UserRole.STUDENT) {
        throw new ForbiddenException('Students cannot access interview trends');
      }

      const endDate = new Date();
      const startDate = this.calculateStartDate(endDate, period);

      const queryBuilder = this.interviewSessionRepository
        .createQueryBuilder('session')
        .where('session.createdAt >= :startDate', { startDate })
        .andWhere('session.createdAt <= :endDate', { endDate });

      if (organizationId) {
        queryBuilder.andWhere('session.organizationId = :orgId', { orgId: organizationId });
      } else if (user?.organizationId) {
        queryBuilder.andWhere('session.organizationId = :orgId', { orgId: user.organizationId });
      }

      const sessions = await queryBuilder.getMany();

      // Calculate trends
      const trends = await this.calculateInterviewTrends(sessions, period);

      return new InterviewTrendsDto(trends);
    } catch (error) {
      this.logger.error('Failed to get interview trends', error);
      throw error;
    }
  }

  async getSkillAnalytics(
    organizationId?: string,
    user?: User,
  ): Promise<SkillAnalyticsDto> {
    try {
      // Validate permissions
      if (user && user.roles=== UserRole.STUDENT) {
        throw new ForbiddenException('Students cannot access skill analytics');
      }

      // Get responses with skill evaluations
      const queryBuilder = this.interviewResponseRepository
        .createQueryBuilder('response')
        .leftJoinAndSelect('response.interviewSession', 'session')
        .leftJoinAndSelect('response.question', 'question')
        .where('response.status = :status', { status: ResponseStatus.ANSWERED });

      if (organizationId) {
        queryBuilder.andWhere('session.organizationId = :orgId', { orgId: organizationId });
      } else if (user?.organizationId) {
        queryBuilder.andWhere('session.organizationId = :orgId', { orgId: user.organizationId });
      }

      const responses = await queryBuilder.getMany();

      // Get AI interview skill data
      const aiQueryBuilder = this.aiMockInterviewRepository
        .createQueryBuilder('ai')
        .where('ai.status = :status', { status: AiInterviewStatus.COMPLETED });

      const aiInterviews = await aiQueryBuilder.getMany();

      // Calculate skill analytics
      const analytics = await this.calculateSkillAnalytics(responses, aiInterviews);

      return new SkillAnalyticsDto(analytics);
    } catch (error) {
      this.logger.error('Failed to get skill analytics', error);
      throw error;
    }
  }

  async getPerformanceMetrics(
    organizationId?: string,
    user?: User,
  ): Promise<InterviewPerformanceDto> {
    try {
      // Validate permissions
      if (user && user.roles=== UserRole.STUDENT) {
        throw new ForbiddenException('Students cannot access performance metrics');
      }

      const queryBuilder = this.interviewSessionRepository
        .createQueryBuilder('session')
        .leftJoinAndSelect('session.responses', 'responses');

      if (organizationId) {
        queryBuilder.where('session.organizationId = :orgId', { orgId: organizationId });
      } else if (user?.organizationId) {
        queryBuilder.where('session.organizationId = :orgId', { orgId: user.organizationId });
      }

      const sessions = await queryBuilder.getMany();

      // Calculate performance metrics
      const performance = await this.calculatePerformanceMetrics(sessions);

      return new InterviewPerformanceDto(performance);
    } catch (error) {
      this.logger.error('Failed to get performance metrics', error);
      throw error;
    }
  }

  // Private calculation methods
  private async calculateInterviewAnalytics(sessions: InterviewSession[]): Promise<any> {
    const totalInterviews = sessions.length;
    const completedInterviews = sessions.filter(s => s.status === InterviewStatus.COMPLETED).length;
    const cancelledInterviews = sessions.filter(s => s.status === InterviewStatus.CANCELLED).length;
    const noShowInterviews = sessions.filter(s => s.status === InterviewStatus.NO_SHOW).length;

    const completionRate = totalInterviews > 0 ? (completedInterviews / totalInterviews) * 100 : 0;

    // Calculate average scores
    const sessionsWithScores = sessions.filter(s => s.score !== null && s.score !== undefined);
    const averageScore = sessionsWithScores.length > 0 
      ? sessionsWithScores.reduce((sum, s) => sum + s.score, 0) / sessionsWithScores.length 
      : 0;

    // Calculate average duration
    const completedSessions = sessions.filter(s => s.status === InterviewStatus.COMPLETED && s.actualDuration > 0);
    const averageDuration = completedSessions.length > 0
      ? completedSessions.reduce((sum, s) => sum + s.actualDuration, 0) / completedSessions.length
      : 0;

    // Group by type
    const byType = sessions.reduce((acc, session) => {
      acc[session.type] = (acc[session.type] || 0) + 1;
      return acc;
    }, {} as Record<InterviewType, number>);

    // Group by status
    const byStatus = sessions.reduce((acc, session) => {
      acc[session.status] = (acc[session.status] || 0) + 1;
      return acc;
    }, {} as Record<InterviewStatus, number>);

    return {
      totalInterviews,
      completedInterviews,
      cancelledInterviews,
      noShowInterviews,
      completionRate,
      averageScore,
      averageDuration,
      byType,
      byStatus,
    };
  }

  private async calculateCandidateAnalytics(
    sessions: InterviewSession[],
    aiInterviews: AiMockInterview[],
  ): Promise<any> {
    const totalInterviews = sessions.length;
    const totalAiInterviews = aiInterviews.length;
    const completedInterviews = sessions.filter(s => s.status === InterviewStatus.COMPLETED).length;
    const completedAiInterviews = aiInterviews.filter(ai => ai.status === AiInterviewStatus.COMPLETED).length;

    // Calculate scores
    const sessionsWithScores = sessions.filter(s => s.score !== null);
    const aiInterviewsWithScores = aiInterviews.filter(ai => ai.overallScore !== null);

    const averageInterviewScore = sessionsWithScores.length > 0
      ? sessionsWithScores.reduce((sum, s) => sum + s.score, 0) / sessionsWithScores.length
      : 0;

    const averageAiScore = aiInterviewsWithScores.length > 0
      ? aiInterviewsWithScores.reduce((sum, ai) => sum + ai.overallScore, 0) / aiInterviewsWithScores.length
      : 0;

    // Calculate improvement trend
    const sortedSessions = sessions
      .filter(s => s.score !== null)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const improvementTrend = this.calculateImprovementTrend(sortedSessions.map(s => s.score));

    // Skill analysis from AI interviews
    const skillScores = aiInterviews.reduce((acc, ai) => {
      Object.entries(ai.skillScores).forEach(([skill, score]) => {
        if (!acc[skill]) acc[skill] = [];
        acc[skill].push(score);
      });
      return acc;
    }, {} as Record<string, number[]>);

    const averageSkillScores = Object.entries(skillScores).reduce((acc, [skill, scores]) => {
      acc[skill] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalInterviews,
      totalAiInterviews,
      completedInterviews,
      completedAiInterviews,
      averageInterviewScore,
      averageAiScore,
      improvementTrend,
      averageSkillScores,
      recentPerformance: this.getRecentPerformance(sessions, aiInterviews),
      strengthsAndWeaknesses: this.analyzeStrengthsAndWeaknesses(aiInterviews),
    };
  }

  private async calculateInterviewerAnalytics(sessions: InterviewSession[]): Promise<any> {
    const totalInterviews = sessions.length;
    const completedInterviews = sessions.filter(s => s.status === InterviewStatus.COMPLETED).length;
    const averageScore = this.calculateAverageScore(sessions);
    const averageDuration = this.calculateAverageDuration(sessions);

    // Calculate interviewer effectiveness
    const candidateScores = sessions
      .filter(s => s.score !== null)
      .map(s => s.score);

    const effectiveness = {
      consistency: this.calculateConsistency(candidateScores),
      averageRating: averageScore,
      interviewsPerMonth: this.calculateInterviewsPerMonth(sessions),
    };

    return {
      totalInterviews,
      completedInterviews,
      averageScore,
      averageDuration,
      effectiveness,
      interviewsByType: this.groupByType(sessions),
      monthlyActivity: this.calculateMonthlyActivity(sessions),
    };
  }

  private async calculateInterviewTrends(
    sessions: InterviewSession[],
    period: string,
  ): Promise<any> {
    const groupedData = this.groupSessionsByPeriod(sessions, period);
    
    const trends = Object.entries(groupedData).map(([periodKey, periodSessions]) => ({
      period: periodKey,
      totalInterviews: periodSessions.length,
      completedInterviews: periodSessions.filter(s => s.status === InterviewStatus.COMPLETED).length,
      averageScore: this.calculateAverageScore(periodSessions),
      averageDuration: this.calculateAverageDuration(periodSessions),
    }));

    return {
      period,
      trends,
      totalGrowth: this.calculateGrowthRate(trends),
      scoreImprovement: this.calculateScoreImprovement(trends),
    };
  }

  private async calculateSkillAnalytics(
    responses: InterviewResponse[],
    aiInterviews: AiMockInterview[],
  ): Promise<any> {
    // Analyze skills from evaluation breakdowns
    const skillData = responses.reduce((acc, response) => {
      Object.entries(response.evaluationBreakdown).forEach(([skill, score]) => {
        if (!acc[skill]) acc[skill] = [];
        acc[skill].push(score);
      });
      return acc;
    }, {} as Record<string, number[]>);

    // Add AI interview skill data
    aiInterviews.forEach(ai => {
      Object.entries(ai.skillScores).forEach(([skill, score]) => {
        if (!skillData[skill]) skillData[skill] = [];
        skillData[skill].push(score);
      });
    });

    const skillAnalytics = Object.entries(skillData).map(([skill, scores]) => ({
      skill,
      averageScore: scores.reduce((sum, score) => sum + score, 0) / scores.length,
      assessmentCount: scores.length,
      improvement: this.calculateSkillImprovement(scores),
      distribution: this.calculateScoreDistribution(scores),
    }));

    return {
      skillAnalytics,
      topSkills: skillAnalytics
        .sort((a, b) => b.averageScore - a.averageScore)
        .slice(0, 5),
      improvementOpportunities: skillAnalytics
        .filter(s => s.averageScore < 70)
        .sort((a, b) => a.averageScore - b.averageScore)
        .slice(0, 5),
    };
  }

  private async calculatePerformanceMetrics(sessions: InterviewSession[]): Promise<any> {
    const completedSessions = sessions.filter(s => s.status === InterviewStatus.COMPLETED);
    
    return {
      totalSessions: sessions.length,
      completedSessions: completedSessions.length,
      completionRate: sessions.length > 0 ? (completedSessions.length / sessions.length) * 100 : 0,
      averageScore: this.calculateAverageScore(completedSessions),
      averageDuration: this.calculateAverageDuration(completedSessions),
      scoreDistribution: this.calculateScoreDistribution(
        completedSessions.filter(s => s.score !== null).map(s => s.score)
      ),
      performanceTrends: this.calculatePerformanceTrends(completedSessions),
    };
  }

  // Helper methods
  private calculateStartDate(endDate: Date, period: string): Date {
    const start = new Date(endDate);
    switch (period) {
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(start.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
    }
    return start;
  }

  private calculateAverageScore(sessions: InterviewSession[]): number {
    const sessionsWithScores = sessions.filter(s => s.score !== null && s.score !== undefined);
    return sessionsWithScores.length > 0
      ? sessionsWithScores.reduce((sum, s) => sum + s.score, 0) / sessionsWithScores.length
      : 0;
  }

  private calculateAverageDuration(sessions: InterviewSession[]): number {
    const completedSessions = sessions.filter(s => s.actualDuration > 0);
    return completedSessions.length > 0
      ? completedSessions.reduce((sum, s) => sum + s.actualDuration, 0) / completedSessions.length
      : 0;
  }

  private calculateImprovementTrend(scores: number[]): number {
    if (scores.length < 2) return 0;
    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length;
    
    return secondAvg - firstAvg;
  }

  private calculateConsistency(scores: number[]): number {
    if (scores.length < 2) return 100;
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);
    return Math.max(0, 100 - (standardDeviation / mean) * 100);
  }

  private groupByType(sessions: InterviewSession[]): Record<InterviewType, number> {
    return sessions.reduce((acc, session) => {
      acc[session.type] = (acc[session.type] || 0) + 1;
      return acc;
    }, {} as Record<InterviewType, number>);
  }

  private groupSessionsByPeriod(sessions: InterviewSession[], period: string): Record<string, InterviewSession[]> {
    return sessions.reduce((acc, session) => {
      const key = this.getPeriodKey(session.createdAt, period);
      if (!acc[key]) acc[key] = [];
      acc[key].push(session);
      return acc;
    }, {} as Record<string, InterviewSession[]>);
  }

  private getPeriodKey(date: Date, period: string): string {
    switch (period) {
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return weekStart.toISOString().split('T')[0];
      case 'month':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      case 'quarter':
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        return `${date.getFullYear()}-Q${quarter}`;
      case 'year':
        return date.getFullYear().toString();
      default:
        return date.toISOString().split('T')[0];
    }
  }

  private calculateGrowthRate(trends: any[]): number {
    if (trends.length < 2) return 0;
    const firstPeriod = trends[0].totalInterviews;
    const lastPeriod = trends[trends.length - 1].totalInterviews;
    return firstPeriod > 0 ? ((lastPeriod - firstPeriod) / firstPeriod) * 100 : 0;
  }

  private calculateScoreImprovement(trends: any[]): number {
    if (trends.length < 2) return 0;
    const firstScore = trends[0].averageScore;
    const lastScore = trends[trends.length - 1].averageScore;
    return lastScore - firstScore;
  }

  private calculateScoreDistribution(scores: number[]): Record<string, number> {
    const distribution = {
      'excellent': 0, // 90-100
      'good': 0,      // 75-89
      'average': 0,   // 60-74
      'poor': 0,      // 0-59
    };

    scores.forEach(score => {
      if (score >= 90) distribution.excellent++;
      else if (score >= 75) distribution.good++;
      else if (score >= 60) distribution.average++;
      else distribution.poor++;
    });

    return distribution;
  }

  private calculateSkillImprovement(scores: number[]): number {
    return this.calculateImprovementTrend(scores);
  }

  private calculateInterviewsPerMonth(sessions: InterviewSession[]): number {
    if (sessions.length === 0) return 0;
    const monthsSpan = this.getMonthsSpan(sessions);
    return sessions.length / Math.max(monthsSpan, 1);
  }

  private getMonthsSpan(sessions: InterviewSession[]): number {
    if (sessions.length === 0) return 1;
    const dates = sessions.map(s => s.createdAt.getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    return Math.max(1, (maxDate - minDate) / (1000 * 60 * 60 * 24 * 30));
  }

  private calculateMonthlyActivity(sessions: InterviewSession[]): any[] {
    const monthlyData = this.groupSessionsByPeriod(sessions, 'month');
    return Object.entries(monthlyData).map(([month, monthSessions]) => ({
      month,
      interviews: monthSessions.length,
      completed: monthSessions.filter(s => s.status === InterviewStatus.COMPLETED).length,
      averageScore: this.calculateAverageScore(monthSessions),
    }));
  }

  private getRecentPerformance(sessions: InterviewSession[], aiInterviews: AiMockInterview[]): any {
    const recentSessions = sessions
      .filter(s => s.createdAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) // Last 30 days
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5);

    const recentAi = aiInterviews
      .filter(ai => ai.createdAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5);

    return {
      recentInterviews: recentSessions.length,
      recentAiInterviews: recentAi.length,
      recentAverageScore: this.calculateAverageScore(recentSessions),
      recentAiAverageScore: recentAi.length > 0
        ? recentAi.reduce((sum, ai) => sum + (ai.overallScore || 0), 0) / recentAi.length
        : 0,
    };
  }

  private analyzeStrengthsAndWeaknesses(aiInterviews: AiMockInterview[]): any {
    const allStrengths: string[] = [];
    const allWeaknesses: string[] = [];

    aiInterviews.forEach(ai => {
      allStrengths.push(...(ai.strengths || []));
      allWeaknesses.push(...(ai.improvementAreas || []));
    });

    const strengthCounts = this.countOccurrences(allStrengths);
    const weaknessCounts = this.countOccurrences(allWeaknesses);

    return {
      topStrengths: Object.entries(strengthCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([strength, count]) => ({ strength, count })),
      topWeaknesses: Object.entries(weaknessCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([weakness, count]) => ({ weakness, count })),
    };
  }

  private countOccurrences(items: string[]): Record<string, number> {
    return items.reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculatePerformanceTrends(sessions: InterviewSession[]): any[] {
    const monthlyData = this.groupSessionsByPeriod(sessions, 'month');
    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, monthSessions]) => ({
        period: month,
        averageScore: this.calculateAverageScore(monthSessions),
        sessionCount: monthSessions.length,
      }));
  }
}
