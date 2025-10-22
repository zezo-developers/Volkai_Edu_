import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InterviewType, InterviewStatus } from '../../../database/entities/interview-session.entity';

export class InterviewAnalyticsDto {
  @ApiProperty({ description: 'Total number of interviews' })
  totalInterviews: number;

  @ApiProperty({ description: 'Number of completed interviews' })
  completedInterviews: number;

  @ApiProperty({ description: 'Number of cancelled interviews' })
  cancelledInterviews: number;

  @ApiProperty({ description: 'Number of no-show interviews' })
  noShowInterviews: number;

  @ApiProperty({ description: 'Interview completion rate percentage' })
  completionRate: number;

  @ApiProperty({ description: 'Average interview score' })
  averageScore: number;

  @ApiProperty({ description: 'Average interview duration in minutes' })
  averageDuration: number;

  @ApiProperty({ description: 'Interviews by type' })
  byType: Record<InterviewType, number>;

  @ApiProperty({ description: 'Interviews by status' })
  byStatus: Record<InterviewStatus, number>;

  constructor(data: any) {
    this.totalInterviews = data.totalInterviews;
    this.completedInterviews = data.completedInterviews;
    this.cancelledInterviews = data.cancelledInterviews;
    this.noShowInterviews = data.noShowInterviews;
    this.completionRate = data.completionRate;
    this.averageScore = data.averageScore;
    this.averageDuration = data.averageDuration;
    this.byType = data.byType;
    this.byStatus = data.byStatus;
  }
}

export class CandidateAnalyticsDto {
  @ApiProperty({ description: 'Total interviews attended' })
  totalInterviews: number;

  @ApiProperty({ description: 'Total AI mock interviews' })
  totalAiInterviews: number;

  @ApiProperty({ description: 'Completed interviews' })
  completedInterviews: number;

  @ApiProperty({ description: 'Completed AI interviews' })
  completedAiInterviews: number;

  @ApiProperty({ description: 'Average interview score' })
  averageInterviewScore: number;

  @ApiProperty({ description: 'Average AI interview score' })
  averageAiScore: number;

  @ApiProperty({ description: 'Score improvement trend' })
  improvementTrend: number;

  @ApiProperty({ description: 'Average skill scores' })
  averageSkillScores: Record<string, number>;

  @ApiProperty({ description: 'Recent performance metrics' })
  recentPerformance: {
    recentInterviews: number;
    recentAiInterviews: number;
    recentAverageScore: number;
    recentAiAverageScore: number;
  };

  @ApiProperty({ description: 'Strengths and weaknesses analysis' })
  strengthsAndWeaknesses: {
    topStrengths: Array<{ strength: string; count: number }>;
    topWeaknesses: Array<{ weakness: string; count: number }>;
  };

  constructor(data: any) {
    this.totalInterviews = data.totalInterviews;
    this.totalAiInterviews = data.totalAiInterviews;
    this.completedInterviews = data.completedInterviews;
    this.completedAiInterviews = data.completedAiInterviews;
    this.averageInterviewScore = data.averageInterviewScore;
    this.averageAiScore = data.averageAiScore;
    this.improvementTrend = data.improvementTrend;
    this.averageSkillScores = data.averageSkillScores;
    this.recentPerformance = data.recentPerformance;
    this.strengthsAndWeaknesses = data.strengthsAndWeaknesses;
  }
}

export class InterviewerAnalyticsDto {
  @ApiProperty({ description: 'Total interviews conducted' })
  totalInterviews: number;

  @ApiProperty({ description: 'Completed interviews' })
  completedInterviews: number;

  @ApiProperty({ description: 'Average score given' })
  averageScore: number;

  @ApiProperty({ description: 'Average interview duration' })
  averageDuration: number;

  @ApiProperty({ description: 'Interviewer effectiveness metrics' })
  effectiveness: {
    consistency: number;
    averageRating: number;
    interviewsPerMonth: number;
  };

  @ApiProperty({ description: 'Interviews by type' })
  interviewsByType: Record<InterviewType, number>;

  @ApiProperty({ description: 'Monthly activity' })
  monthlyActivity: Array<{
    month: string;
    interviews: number;
    completed: number;
    averageScore: number;
  }>;

  constructor(data: any) {
    this.totalInterviews = data.totalInterviews;
    this.completedInterviews = data.completedInterviews;
    this.averageScore = data.averageScore;
    this.averageDuration = data.averageDuration;
    this.effectiveness = data.effectiveness;
    this.interviewsByType = data.interviewsByType;
    this.monthlyActivity = data.monthlyActivity;
  }
}

export class InterviewTrendsDto {
  @ApiProperty({ description: 'Time period for trends' })
  period: string;

  @ApiProperty({ description: 'Trend data by period' })
  trends: Array<{
    period: string;
    totalInterviews: number;
    completedInterviews: number;
    averageScore: number;
    averageDuration: number;
  }>;

  @ApiProperty({ description: 'Total growth rate percentage' })
  totalGrowth: number;

  @ApiProperty({ description: 'Score improvement over time' })
  scoreImprovement: number;

  constructor(data: any) {
    this.period = data.period;
    this.trends = data.trends;
    this.totalGrowth = data.totalGrowth;
    this.scoreImprovement = data.scoreImprovement;
  }
}

export class SkillAnalyticsDto {
  @ApiProperty({ description: 'Skill analytics data' })
  skillAnalytics: Array<{
    skill: string;
    averageScore: number;
    assessmentCount: number;
    improvement: number;
    distribution: Record<string, number>;
  }>;

  @ApiProperty({ description: 'Top performing skills' })
  topSkills: Array<{
    skill: string;
    averageScore: number;
    assessmentCount: number;
  }>;

  @ApiProperty({ description: 'Skills needing improvement' })
  improvementOpportunities: Array<{
    skill: string;
    averageScore: number;
    assessmentCount: number;
  }>;

  constructor(data: any) {
    this.skillAnalytics = data.skillAnalytics;
    this.topSkills = data.topSkills;
    this.improvementOpportunities = data.improvementOpportunities;
  }
}

export class InterviewPerformanceDto {
  @ApiProperty({ description: 'Total interview sessions' })
  totalSessions: number;

  @ApiProperty({ description: 'Completed sessions' })
  completedSessions: number;

  @ApiProperty({ description: 'Completion rate percentage' })
  completionRate: number;

  @ApiProperty({ description: 'Average score across all interviews' })
  averageScore: number;

  @ApiProperty({ description: 'Average duration in minutes' })
  averageDuration: number;

  @ApiProperty({ description: 'Score distribution' })
  scoreDistribution: Record<string, number>;

  @ApiProperty({ description: 'Performance trends over time' })
  performanceTrends: Array<{
    period: string;
    averageScore: number;
    sessionCount: number;
  }>;

  constructor(data: any) {
    this.totalSessions = data.totalSessions;
    this.completedSessions = data.completedSessions;
    this.completionRate = data.completionRate;
    this.averageScore = data.averageScore;
    this.averageDuration = data.averageDuration;
    this.scoreDistribution = data.scoreDistribution;
    this.performanceTrends = data.performanceTrends;
  }
}
