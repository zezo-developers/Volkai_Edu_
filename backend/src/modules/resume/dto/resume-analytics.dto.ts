import {
  IsNumber,
  IsString,
  IsArray,
  IsObject,
  IsDate,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResumeAnalyticsOverviewDto {
  @ApiProperty({ description: 'Total number of resumes' })
  @IsNumber()
  totalResumes: number;

  @ApiProperty({ description: 'Number of public resumes' })
  @IsNumber()
  publicResumes: number;

  @ApiProperty({ description: 'Number of private resumes' })
  @IsNumber()
  privateResumes: number;

  @ApiProperty({ description: 'Number of shared resumes' })
  @IsNumber()
  sharedResumes: number;

  @ApiProperty({ description: 'Total resume views' })
  @IsNumber()
  totalViews: number;

  @ApiProperty({ description: 'Total resume downloads' })
  @IsNumber()
  totalDownloads: number;

  @ApiProperty({ description: 'Total resume shares' })
  @IsNumber()
  totalShares: number;

  @ApiProperty({ description: 'Average completion rate' })
  @IsNumber()
  averageCompletionRate: number;

  @ApiProperty({ description: 'Average ATS score' })
  @IsNumber()
  averageAtsScore: number;

  @ApiProperty({ description: 'Growth rate percentage' })
  @IsNumber()
  growthRate: number;

  @ApiProperty({ description: 'Engagement rate' })
  @IsNumber()
  engagementRate: number;

  @ApiProperty({ description: 'Conversion rate percentage' })
  @IsNumber()
  conversionRate: number;

  @ApiProperty({ description: 'Top performing templates' })
  @IsArray()
  topTemplates: Array<{
    id: string;
    name: string;
    downloads: number;
    rating: number;
  }>;

  @ApiProperty({ description: 'Recent activity' })
  @IsArray()
  recentActivity: Array<{
    type: string;
    resumeId: string;
    resumeTitle: string;
    userName: string;
    timestamp: Date;
  }>;

  constructor(data: any) {
    this.totalResumes = data.totalResumes;
    this.publicResumes = data.publicResumes;
    this.privateResumes = data.privateResumes;
    this.sharedResumes = data.sharedResumes;
    this.totalViews = data.totalViews;
    this.totalDownloads = data.totalDownloads;
    this.totalShares = data.totalShares;
    this.averageCompletionRate = data.averageCompletionRate;
    this.averageAtsScore = data.averageAtsScore;
    this.growthRate = data.growthRate;
    this.engagementRate = data.engagementRate;
    this.conversionRate = data.conversionRate;
    this.topTemplates = data.topTemplates;
    this.recentActivity = data.recentActivity;
  }
}

export class UserResumeAnalyticsDto {
  @ApiProperty({ description: 'Total number of user resumes' })
  @IsNumber()
  totalResumes: number;

  @ApiProperty({ description: 'Total resume views' })
  @IsNumber()
  totalViews: number;

  @ApiProperty({ description: 'Total resume downloads' })
  @IsNumber()
  totalDownloads: number;

  @ApiProperty({ description: 'Total resume shares' })
  @IsNumber()
  totalShares: number;

  @ApiProperty({ description: 'Average completion rate' })
  @IsNumber()
  averageCompletionRate: number;

  @ApiProperty({ description: 'Number of completed resumes' })
  @IsNumber()
  completedResumes: number;

  @ApiProperty({ description: 'Average ATS score' })
  @IsNumber()
  averageAtsScore: number;

  @ApiPropertyOptional({ description: 'Primary resume details' })
  primaryResume?: {
    id: string;
    title: string;
    views: number;
    completionRate: number;
    atsScore: number;
  };

  @ApiProperty({ description: 'Performance by resume' })
  @IsArray()
  resumePerformance: Array<{
    id: string;
    title: string;
    views: number;
    downloads: number;
    shares: number;
    completionRate: number;
    atsScore: number;
    lastUpdated: Date;
    isPrimary: boolean;
  }>;

  @ApiProperty({ description: 'Skills analysis' })
  @IsObject()
  skillsAnalysis: {
    totalSkills: number;
    verifiedSkills: number;
    featuredSkills: number;
    skillsByCategory: Record<string, number>;
    proficiencyLevels: Record<string, number>;
    averageSkillScore: number;
  };

  @ApiProperty({ description: 'Improvement recommendations' })
  @IsArray()
  recommendations: string[];

  @ApiProperty({ description: 'Activity trend over time' })
  @IsArray()
  activityTrend: Array<{
    month: string;
    resumes: number;
    views: number;
    downloads: number;
  }>;

  constructor(data: any) {
    this.totalResumes = data.totalResumes;
    this.totalViews = data.totalViews;
    this.totalDownloads = data.totalDownloads;
    this.totalShares = data.totalShares;
    this.averageCompletionRate = data.averageCompletionRate;
    this.completedResumes = data.completedResumes;
    this.averageAtsScore = data.averageAtsScore;
    this.primaryResume = data.primaryResume;
    this.resumePerformance = data.resumePerformance;
    this.skillsAnalysis = data.skillsAnalysis;
    this.recommendations = data.recommendations;
    this.activityTrend = data.activityTrend;
  }
}

export class ResumePerformanceDto {
  @ApiProperty({ description: 'Resume ID' })
  @IsString()
  resumeId: string;

  @ApiProperty({ description: 'Total views' })
  @IsNumber()
  totalViews: number;

  @ApiProperty({ description: 'Total downloads' })
  @IsNumber()
  totalDownloads: number;

  @ApiProperty({ description: 'Total shares' })
  @IsNumber()
  totalShares: number;

  @ApiProperty({ description: 'Views this month' })
  @IsNumber()
  viewsThisMonth: number;

  @ApiProperty({ description: 'Downloads this month' })
  @IsNumber()
  downloadsThisMonth: number;

  @ApiProperty({ description: 'Shares this month' })
  @IsNumber()
  sharesThisMonth: number;

  @ApiProperty({ description: 'Engagement rate percentage' })
  @IsNumber()
  engagementRate: number;

  @ApiProperty({ description: 'Conversion rate percentage' })
  @IsNumber()
  conversionRate: number;

  @ApiProperty({ description: 'Completion rate percentage' })
  @IsNumber()
  completionRate: number;

  @ApiProperty({ description: 'ATS compatibility score' })
  @IsNumber()
  atsScore: number;

  @ApiProperty({ description: 'Benchmark comparison data' })
  @IsObject()
  benchmarkData: {
    averageViews: number;
    averageDownloads: number;
    viewsPercentile: number;
    downloadsPercentile: number;
  };

  @ApiProperty({ description: 'Views by date' })
  @IsObject()
  viewsByDate: Record<string, number>;

  @ApiProperty({ description: 'Downloads by date' })
  @IsObject()
  downloadsByDate: Record<string, number>;

  @ApiProperty({ description: 'Shares by date' })
  @IsObject()
  sharesByDate: Record<string, number>;

  @ApiProperty({ description: 'Viewer locations' })
  @IsObject()
  viewerLocations: Record<string, number>;

  @ApiProperty({ description: 'Traffic referrers' })
  @IsObject()
  referrers: Record<string, number>;

  @ApiProperty({ description: 'Device types used' })
  @IsObject()
  deviceTypes: Record<string, number>;

  @ApiProperty({ description: 'Performance improvement recommendations' })
  @IsArray()
  recommendations: string[];

  constructor(data: any) {
    this.resumeId = data.resumeId;
    this.totalViews = data.totalViews;
    this.totalDownloads = data.totalDownloads;
    this.totalShares = data.totalShares;
    this.viewsThisMonth = data.viewsThisMonth;
    this.downloadsThisMonth = data.downloadsThisMonth;
    this.sharesThisMonth = data.sharesThisMonth;
    this.engagementRate = data.engagementRate;
    this.conversionRate = data.conversionRate;
    this.completionRate = data.completionRate;
    this.atsScore = data.atsScore;
    this.benchmarkData = data.benchmarkData;
    this.viewsByDate = data.viewsByDate;
    this.downloadsByDate = data.downloadsByDate;
    this.sharesByDate = data.sharesByDate;
    this.viewerLocations = data.viewerLocations;
    this.referrers = data.referrers;
    this.deviceTypes = data.deviceTypes;
    this.recommendations = data.recommendations;
  }
}

export class ResumeEngagementDto {
  @ApiProperty({ description: 'Total engagement events' })
  @IsNumber()
  totalEngagements: number;

  @ApiProperty({ description: 'Unique viewers' })
  @IsNumber()
  uniqueViewers: number;

  @ApiProperty({ description: 'Average time spent viewing' })
  @IsNumber()
  averageViewTime: number;

  @ApiProperty({ description: 'Bounce rate percentage' })
  @IsNumber()
  bounceRate: number;

  @ApiProperty({ description: 'Return visitor rate' })
  @IsNumber()
  returnVisitorRate: number;

  @ApiProperty({ description: 'Engagement by section' })
  @IsObject()
  sectionEngagement: Record<string, {
    views: number;
    timeSpent: number;
    interactions: number;
  }>;

  @ApiProperty({ description: 'Peak engagement times' })
  @IsArray()
  peakTimes: Array<{
    hour: number;
    day: string;
    engagements: number;
  }>;

  constructor(data: any) {
    this.totalEngagements = data.totalEngagements;
    this.uniqueViewers = data.uniqueViewers;
    this.averageViewTime = data.averageViewTime;
    this.bounceRate = data.bounceRate;
    this.returnVisitorRate = data.returnVisitorRate;
    this.sectionEngagement = data.sectionEngagement;
    this.peakTimes = data.peakTimes;
  }
}

export class SkillAnalyticsDto {
  @ApiProperty({ description: 'Total unique skills' })
  @IsNumber()
  totalSkills: number;

  @ApiProperty({ description: 'Total user-skill associations' })
  @IsNumber()
  totalUserSkills: number;

  @ApiProperty({ description: 'Average skills per user' })
  @IsNumber()
  averageSkillsPerUser: number;

  @ApiProperty({ description: 'Most popular skills' })
  @IsArray()
  skillPopularity: Array<{
    skill: string;
    count: number;
    category?: string;
  }>;

  @ApiProperty({ description: 'Skills grouped by category' })
  @IsObject()
  skillsByCategory: Record<string, number>;

  @ApiProperty({ description: 'Proficiency level distribution' })
  @IsObject()
  proficiencyDistribution: Record<string, number>;

  @ApiProperty({ description: 'Skill verification statistics' })
  @IsObject()
  verificationStats: {
    verifiedCount: number;
    totalCount: number;
    verificationRate: number;
  };

  @ApiProperty({ description: 'Trending skills' })
  @IsArray()
  trendingSkills: Array<{
    skill: string;
    count: number;
    category?: string;
  }>;

  @ApiProperty({ description: 'Identified skill gaps' })
  @IsArray()
  skillGaps: string[];

  @ApiProperty({ description: 'Top skills by market demand' })
  @IsArray()
  topSkillsByDemand: Array<{
    skill: string;
    demand: number;
  }>;

  @ApiProperty({ description: 'Emerging skills' })
  @IsArray()
  emergingSkills: Array<{
    skill: string;
    growth: number;
  }>;

  constructor(data: any) {
    this.totalSkills = data.totalSkills;
    this.totalUserSkills = data.totalUserSkills;
    this.averageSkillsPerUser = data.averageSkillsPerUser;
    this.skillPopularity = data.skillPopularity;
    this.skillsByCategory = data.skillsByCategory;
    this.proficiencyDistribution = data.proficiencyDistribution;
    this.verificationStats = data.verificationStats;
    this.trendingSkills = data.trendingSkills;
    this.skillGaps = data.skillGaps;
    this.topSkillsByDemand = data.topSkillsByDemand;
    this.emergingSkills = data.emergingSkills;
  }
}

export class TemplateAnalyticsDto {
  @ApiProperty({ description: 'Total number of templates' })
  @IsNumber()
  totalTemplates: number;

  @ApiProperty({ description: 'Number of premium templates' })
  @IsNumber()
  premiumTemplates: number;

  @ApiProperty({ description: 'Number of free templates' })
  @IsNumber()
  freeTemplates: number;

  @ApiProperty({ description: 'Total template downloads' })
  @IsNumber()
  totalDownloads: number;

  @ApiProperty({ description: 'Average template rating' })
  @IsNumber()
  averageRating: number;

  @ApiProperty({ description: 'Template performance metrics' })
  @IsArray()
  templatePerformance: Array<{
    id: string;
    name: string;
    category: string;
    downloads: number;
    rating: number;
    ratingCount: number;
    usageCount: number;
    isPremium: boolean;
    atsScore?: number;
  }>;

  @ApiProperty({ description: 'Statistics by category' })
  @IsObject()
  categoryStats: Record<string, {
    count: number;
    downloads: number;
    averageRating: number;
  }>;

  @ApiProperty({ description: 'Template usage trends' })
  @IsArray()
  usageTrends: Array<{
    month: string;
    usage: number;
  }>;

  @ApiProperty({ description: 'Top performing templates' })
  @IsArray()
  topTemplates: Array<{
    id: string;
    name: string;
    category: string;
    downloads: number;
    rating: number;
    usageCount: number;
  }>;

  @ApiProperty({ description: 'Rating distribution' })
  @IsObject()
  ratingDistribution: Record<string, number>;

  @ApiProperty({ description: 'Conversion rates' })
  @IsObject()
  conversionRates: {
    overallConversionRate: number;
    premiumConversionRate: number;
    freeConversionRate: number;
  };

  constructor(data: any) {
    this.totalTemplates = data.totalTemplates;
    this.premiumTemplates = data.premiumTemplates;
    this.freeTemplates = data.freeTemplates;
    this.totalDownloads = data.totalDownloads;
    this.averageRating = data.averageRating;
    this.templatePerformance = data.templatePerformance;
    this.categoryStats = data.categoryStats;
    this.usageTrends = data.usageTrends;
    this.topTemplates = data.topTemplates;
    this.ratingDistribution = data.ratingDistribution;
    this.conversionRates = data.conversionRates;
  }
}
