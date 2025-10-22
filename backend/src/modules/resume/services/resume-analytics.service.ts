import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserResume, ResumeVisibility } from '../../../database/entities/user-resume.entity';
import { ResumeTemplate } from '../../../database/entities/resume-template.entity';
import { UserSkill } from '../../../database/entities/user-skill.entity';
import { User, UserRole } from '../../../database/entities/user.entity';
import {
  ResumeAnalyticsOverviewDto,
  ResumePerformanceDto,
  ResumeEngagementDto,
  SkillAnalyticsDto,
  TemplateAnalyticsDto,
  UserResumeAnalyticsDto,
} from '../dto/resume-analytics.dto';

@Injectable()
export class ResumeAnalyticsService {
  private readonly logger = new Logger(ResumeAnalyticsService.name);

  constructor(
    @InjectRepository(UserResume)
    private resumeRepository: Repository<UserResume>,
    @InjectRepository(ResumeTemplate)
    private templateRepository: Repository<ResumeTemplate>,
    @InjectRepository(UserSkill)
    private userSkillRepository: Repository<UserSkill>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getResumeAnalyticsOverview(
    organizationId?: string,
    user?: User,
  ): Promise<ResumeAnalyticsOverviewDto> {
    try {
      // Validate permissions
      if (user && user.roles=== UserRole.STUDENT) {
        throw new ForbiddenException('Students cannot access system analytics');
      }

      const queryBuilder = this.resumeRepository.createQueryBuilder('resume');

      // Apply organization filter
      if (organizationId) {
        queryBuilder
          .leftJoin('resume.user', 'user')
          .where('user.organizationId = :orgId', { orgId: organizationId });
      } else if (user?.organizationId) {
        queryBuilder
          .leftJoin('resume.user', 'user')
          .where('user.organizationId = :orgId', { orgId: user.organizationId });
      }

      const resumes = await queryBuilder.getMany();

      // Calculate overview metrics
      const totalResumes = resumes.length;
      const publicResumes = resumes.filter(r => r.visibility === ResumeVisibility.PUBLIC).length;
      const privateResumes = resumes.filter(r => r.visibility === ResumeVisibility.PRIVATE).length;
      const sharedResumes = resumes.filter(r => r.shareToken).length;

      const totalViews = resumes.reduce((sum, r) => sum + r.viewCount, 0);
      const totalDownloads = resumes.reduce((sum, r) => sum + r.downloadCount, 0);
      const totalShares = resumes.reduce((sum, r) => sum + r.shareCount, 0);

      const averageCompletionRate = resumes.length > 0
        ? resumes.reduce((sum, r) => sum + r.completionPercentage, 0) / resumes.length
        : 0;

      const averageAtsScore = resumes.length > 0
        ? resumes.reduce((sum, r) => sum + (r.estimatedAtsScore || 0), 0) / resumes.length
        : 0;

      // Calculate growth metrics
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      
      const recentResumes = resumes.filter(r => r.createdAt > lastMonth);
      const growthRate = totalResumes > 0 
        ? (recentResumes.length / totalResumes) * 100 
        : 0;

      const analytics = {
        totalResumes,
        publicResumes,
        privateResumes,
        sharedResumes,
        totalViews,
        totalDownloads,
        totalShares,
        averageCompletionRate,
        averageAtsScore,
        growthRate,
        engagementRate: totalResumes > 0 ? (totalViews / totalResumes) : 0,
        conversionRate: totalViews > 0 ? (totalDownloads / totalViews) * 100 : 0,
        topTemplates: await this.getTopTemplates(5),
        recentActivity: await this.getRecentActivity(10),
      };

      return new ResumeAnalyticsOverviewDto(analytics);
    } catch (error) {
      this.logger.error('Failed to get resume analytics overview', error);
      throw error;
    }
  }

  async getUserResumeAnalytics(
    userId: string,
    user: User,
  ): Promise<UserResumeAnalyticsDto> {
    try {
      // Validate permissions
      if (userId !== user.id && user.roles!== UserRole.ADMIN) {
        throw new ForbiddenException('Cannot access other user analytics');
      }

      const resumes = await this.resumeRepository.find({
        where: { userId },
        relations: ['template'],
        order: { createdAt: 'DESC' },
      });

      const totalResumes = resumes.length;
      const primaryResume = resumes.find(r => r.isPrimary);

      // Calculate engagement metrics
      const totalViews = resumes.reduce((sum, r) => sum + r.viewCount, 0);
      const totalDownloads = resumes.reduce((sum, r) => sum + r.downloadCount, 0);
      const totalShares = resumes.reduce((sum, r) => sum + r.shareCount, 0);

      // Calculate completion metrics
      const averageCompletionRate = resumes.length > 0
        ? resumes.reduce((sum, r) => sum + r.completionPercentage, 0) / resumes.length
        : 0;

      const completedResumes = resumes.filter(r => r.completionPercentage >= 80).length;

      // Calculate ATS scores
      const averageAtsScore = resumes.length > 0
        ? resumes.reduce((sum, r) => sum + (r.estimatedAtsScore || 0), 0) / resumes.length
        : 0;

      // Performance by resume
      const resumePerformance = resumes.map(resume => ({
        id: resume.id,
        title: resume.title,
        views: resume.viewCount,
        downloads: resume.downloadCount,
        shares: resume.shareCount,
        completionRate: resume.completionPercentage,
        atsScore: resume.estimatedAtsScore,
        lastUpdated: resume.updatedAt,
        isPrimary: resume.isPrimary,
      }));

      // Skills analysis
      const skillsAnalysis = await this.analyzeUserSkills(userId);

      // Recommendations
      const recommendations = await this.generateUserRecommendations(resumes, skillsAnalysis);

      const analytics = {
        totalResumes,
        totalViews,
        totalDownloads,
        totalShares,
        averageCompletionRate,
        completedResumes,
        averageAtsScore,
        primaryResume: primaryResume ? {
          id: primaryResume.id,
          title: primaryResume.title,
          views: primaryResume.viewCount,
          completionRate: primaryResume.completionPercentage,
          atsScore: primaryResume.estimatedAtsScore,
        } : null,
        resumePerformance,
        skillsAnalysis,
        recommendations,
        activityTrend: this.calculateActivityTrend(resumes),
      };

      return new UserResumeAnalyticsDto(analytics);
    } catch (error) {
      this.logger.error(`Failed to get user resume analytics for ${userId}`, error);
      throw error;
    }
  }

  async getResumePerformanceMetrics(
    resumeId: string,
    user: User,
  ): Promise<ResumePerformanceDto> {
    try {
      const resume = await this.resumeRepository.findOne({
        where: { id: resumeId },
        relations: ['user', 'template'],
      });

      if (!resume) {
        throw new Error('Resume not found');
      }

      // Validate permissions
      if (resume.userId !== user.id && user.roles!== UserRole.ADMIN) {
        throw new ForbiddenException('Cannot access resume performance metrics');
      }

      // Calculate performance metrics
      const viewsThisMonth = this.getViewsInPeriod(resume, 30);
      const downloadsThisMonth = this.getDownloadsInPeriod(resume, 30);
      const sharesThisMonth = this.getSharesInPeriod(resume, 30);

      const engagementRate = resume.viewCount > 0 
        ? ((resume.downloadCount + resume.shareCount) / resume.viewCount) * 100 
        : 0;

      const conversionRate = resume.viewCount > 0 
        ? (resume.downloadCount / resume.viewCount) * 100 
        : 0;

      // Compare with similar resumes
      const benchmarkData = await this.getBenchmarkData(resume);

      const performance = {
        resumeId: resume.id,
        totalViews: resume.viewCount,
        totalDownloads: resume.downloadCount,
        totalShares: resume.shareCount,
        viewsThisMonth,
        downloadsThisMonth,
        sharesThisMonth,
        engagementRate,
        conversionRate,
        completionRate: resume.completionPercentage,
        atsScore: resume.estimatedAtsScore,
        benchmarkData,
        viewsByDate: resume.analytics.viewsByDate || {},
        downloadsByDate: resume.analytics.downloadsByDate || {},
        sharesByDate: resume.analytics.sharesByDate || {},
        viewerLocations: resume.analytics.viewerLocations || {},
        referrers: resume.analytics.referrers || {},
        deviceTypes: resume.analytics.deviceTypes || {},
        recommendations: this.generatePerformanceRecommendations(resume),
      };

      return new ResumePerformanceDto(performance);
    } catch (error) {
      this.logger.error(`Failed to get resume performance metrics for ${resumeId}`, error);
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

      const queryBuilder = this.userSkillRepository
        .createQueryBuilder('userSkill')
        .leftJoinAndSelect('userSkill.skill', 'skill')
        .leftJoinAndSelect('skill.category', 'category')
        .leftJoinAndSelect('userSkill.user', 'user');

      // Apply organization filter
      if (organizationId) {
        queryBuilder.where('user.organizationId = :orgId', { orgId: organizationId });
      } else if (user?.organizationId) {
        queryBuilder.where('user.organizationId = :orgId', { orgId: user.organizationId });
      }

      const userSkills = await queryBuilder.getMany();

      // Analyze skills data
      const skillPopularity = this.calculateSkillPopularity(userSkills);
      const skillsByCategory = this.groupSkillsByCategory(userSkills);
      const proficiencyDistribution = this.calculateProficiencyDistribution(userSkills);
      const verificationStats = this.calculateVerificationStats(userSkills);
      const trendingSkills = this.identifyTrendingSkills(userSkills);
      const skillGaps = await this.identifySkillGaps(userSkills);

      const analytics = {
        totalSkills: new Set(userSkills.map(us => us.skillId)).size,
        totalUserSkills: userSkills.length,
        averageSkillsPerUser: await this.calculateAverageSkillsPerUser(organizationId || user?.organizationId),
        skillPopularity,
        skillsByCategory,
        proficiencyDistribution,
        verificationStats,
        trendingSkills,
        skillGaps,
        topSkillsByDemand: await this.getTopSkillsByDemand(10),
        emergingSkills: await this.getEmergingSkills(10),
      };

      return new SkillAnalyticsDto(analytics);
    } catch (error) {
      this.logger.error('Failed to get skill analytics', error);
      throw error;
    }
  }

  async getTemplateAnalytics(user?: User): Promise<TemplateAnalyticsDto> {
    try {
      // Validate permissions
      if (user && user.roles=== UserRole.STUDENT) {
        throw new ForbiddenException('Students cannot access template analytics');
      }

      const templates = await this.templateRepository.find({
        where: { isActive: true },
        relations: ['creator', 'userResumes'],
      });

      // Calculate template metrics
      const totalTemplates = templates.length;
      const premiumTemplates = templates.filter(t => t.isPremium).length;
      const freeTemplates = totalTemplates - premiumTemplates;

      const totalDownloads = templates.reduce((sum, t) => sum + t.downloadCount, 0);
      const averageRating = templates.length > 0
        ? templates.reduce((sum, t) => sum + t.rating, 0) / templates.length
        : 0;

      // Template performance
      const templatePerformance = templates.map(template => ({
        id: template.id,
        name: template.name,
        category: template.category,
        downloads: template.downloadCount,
        rating: template.rating,
        ratingCount: template.ratingCount,
        usageCount: template.userResumes?.length || 0,
        isPremium: template.isPremium,
        atsScore: template.atsScore,
      }));

      // Category analysis
      const categoryStats = this.analyzeTemplatesByCategory(templates);

      // Usage trends
      const usageTrends = this.calculateTemplateUsageTrends(templates);

      const analytics = {
        totalTemplates,
        premiumTemplates,
        freeTemplates,
        totalDownloads,
        averageRating,
        templatePerformance,
        categoryStats,
        usageTrends,
        topTemplates: templatePerformance
          .sort((a, b) => b.downloads - a.downloads)
          .slice(0, 10),
        ratingDistribution: this.calculateRatingDistribution(templates),
        conversionRates: this.calculateTemplateConversionRates(templates),
      };

      return new TemplateAnalyticsDto(analytics);
    } catch (error) {
      this.logger.error('Failed to get template analytics', error);
      throw error;
    }
  }

  // Private helper methods
  private async getTopTemplates(limit: number): Promise<any[]> {
    const templates = await this.templateRepository.find({
      where: { isActive: true },
      order: { downloadCount: 'DESC' },
      take: limit,
    });

    return templates.map(template => ({
      id: template.id,
      name: template.name,
      downloads: template.downloadCount,
      rating: template.rating,
    }));
  }

  private async getRecentActivity(limit: number): Promise<any[]> {
    const recentResumes = await this.resumeRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['user'],
    });

    return recentResumes.map(resume => ({
      type: 'resume_created',
      resumeId: resume.id,
      resumeTitle: resume.title,
      userName: resume.user.fullName,
      timestamp: resume.createdAt,
    }));
  }

  private async analyzeUserSkills(userId: string): Promise<any> {
    const userSkills = await this.userSkillRepository.find({
      where: { userId },
      relations: ['skill', 'skill.category'],
    });

    const totalSkills = userSkills.length;
    const verifiedSkills = userSkills.filter(us => us.isVerified).length;
    const featuredSkills = userSkills.filter(us => us.isFeatured).length;

    const skillsByCategory = userSkills.reduce((acc, us) => {
      const category = us.skill.category?.name || 'Other';
      if (!acc[category]) acc[category] = 0;
      acc[category]++;
      return acc;
    }, {} as Record<string, number>);

    const proficiencyLevels = userSkills.reduce((acc, us) => {
      if (!acc[us.proficiencyLevel]) acc[us.proficiencyLevel] = 0;
      acc[us.proficiencyLevel]++;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalSkills,
      verifiedSkills,
      featuredSkills,
      skillsByCategory,
      proficiencyLevels,
      averageSkillScore: userSkills.length > 0
        ? userSkills.reduce((sum, us) => sum + us.calculateSkillScore(), 0) / userSkills.length
        : 0,
    };
  }

  private async generateUserRecommendations(
    resumes: UserResume[],
    skillsAnalysis: any,
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Resume completion recommendations
    const incompleteResumes = resumes.filter(r => r.completionPercentage < 80);
    if (incompleteResumes.length > 0) {
      recommendations.push(`Complete ${incompleteResumes.length} resume(s) to improve visibility`);
    }

    // ATS optimization recommendations
    const lowAtsResumes = resumes.filter(r => (r.estimatedAtsScore || 0) < 70);
    if (lowAtsResumes.length > 0) {
      recommendations.push(`Optimize ${lowAtsResumes.length} resume(s) for ATS compatibility`);
    }

    // Skills recommendations
    if (skillsAnalysis.verifiedSkills < skillsAnalysis.totalSkills * 0.5) {
      recommendations.push('Verify more skills to increase credibility');
    }

    if (skillsAnalysis.totalSkills < 10) {
      recommendations.push('Add more skills to showcase your expertise');
    }

    // Engagement recommendations
    const totalViews = resumes.reduce((sum, r) => sum + r.viewCount, 0);
    if (totalViews < 50 && resumes.length > 0) {
      recommendations.push('Share your resume to increase visibility');
    }

    return recommendations;
  }

  private calculateActivityTrend(resumes: UserResume[]): any[] {
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return {
        month: date.toISOString().slice(0, 7),
        resumes: 0,
        views: 0,
        downloads: 0,
      };
    }).reverse();

    resumes.forEach(resume => {
      const monthKey = resume.createdAt.toISOString().slice(0, 7);
      const monthData = last6Months.find(m => m.month === monthKey);
      if (monthData) {
        monthData.resumes++;
        monthData.views += resume.viewCount;
        monthData.downloads += resume.downloadCount;
      }
    });

    return last6Months;
  }

  private getViewsInPeriod(resume: UserResume, days: number): number {
    // This would typically query a separate analytics table
    // For now, return a portion of total views
    return Math.floor(resume.viewCount * 0.3);
  }

  private getDownloadsInPeriod(resume: UserResume, days: number): number {
    // This would typically query a separate analytics table
    return Math.floor(resume.downloadCount * 0.3);
  }

  private getSharesInPeriod(resume: UserResume, days: number): number {
    // This would typically query a separate analytics table
    return Math.floor(resume.shareCount * 0.3);
  }

  private async getBenchmarkData(resume: UserResume): Promise<any> {
    // Calculate benchmark data against similar resumes
    const similarResumes = await this.resumeRepository.find({
      where: { templateId: resume.templateId },
    });

    const avgViews = similarResumes.length > 0
      ? similarResumes.reduce((sum, r) => sum + r.viewCount, 0) / similarResumes.length
      : 0;

    const avgDownloads = similarResumes.length > 0
      ? similarResumes.reduce((sum, r) => sum + r.downloadCount, 0) / similarResumes.length
      : 0;

    return {
      averageViews: avgViews,
      averageDownloads: avgDownloads,
      viewsPercentile: this.calculatePercentile(resume.viewCount, similarResumes.map(r => r.viewCount)),
      downloadsPercentile: this.calculatePercentile(resume.downloadCount, similarResumes.map(r => r.downloadCount)),
    };
  }

  private calculatePercentile(value: number, dataset: number[]): number {
    const sorted = dataset.sort((a, b) => a - b);
    const index = sorted.findIndex(v => v >= value);
    return index >= 0 ? (index / sorted.length) * 100 : 100;
  }

  private generatePerformanceRecommendations(resume: UserResume): string[] {
    const recommendations: string[] = [];

    if (resume.viewCount < 10) {
      recommendations.push('Share your resume on professional networks to increase visibility');
    }

    if (resume.completionPercentage < 80) {
      recommendations.push('Complete missing sections to improve your resume');
    }

    if ((resume.estimatedAtsScore || 0) < 70) {
      recommendations.push('Optimize for ATS by adding relevant keywords');
    }

    if (resume.downloadCount === 0 && resume.viewCount > 5) {
      recommendations.push('Consider updating your resume content to improve engagement');
    }

    return recommendations;
  }

  private calculateSkillPopularity(userSkills: UserSkill[]): any[] {
    const skillCounts = userSkills.reduce((acc, us) => {
      const skillName = us.skill.name;
      if (!acc[skillName]) {
        acc[skillName] = { count: 0, skill: us.skill };
      }
      acc[skillName].count++;
      return acc;
    }, {} as Record<string, { count: number; skill: any }>);

    return Object.values(skillCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
      .map(item => ({
        skill: item.skill.name,
        count: item.count,
        category: item.skill.category?.name,
      }));
  }

  private groupSkillsByCategory(userSkills: UserSkill[]): Record<string, number> {
    return userSkills.reduce((acc, us) => {
      const category = us.skill.category?.name || 'Other';
      if (!acc[category]) acc[category] = 0;
      acc[category]++;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculateProficiencyDistribution(userSkills: UserSkill[]): Record<string, number> {
    return userSkills.reduce((acc, us) => {
      if (!acc[us.proficiencyLevel]) acc[us.proficiencyLevel] = 0;
      acc[us.proficiencyLevel]++;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculateVerificationStats(userSkills: UserSkill[]): any {
    const verified = userSkills.filter(us => us.isVerified).length;
    const total = userSkills.length;
    
    return {
      verifiedCount: verified,
      totalCount: total,
      verificationRate: total > 0 ? (verified / total) * 100 : 0,
    };
  }

  private identifyTrendingSkills(userSkills: UserSkill[]): any[] {
    // This would typically analyze recent skill additions
    // For now, return skills added in the last month
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const recentSkills = userSkills.filter(us => us.createdAt > lastMonth);
    return this.calculateSkillPopularity(recentSkills).slice(0, 10);
  }

  private async identifySkillGaps(userSkills: UserSkill[]): Promise<string[]> {
    // This would analyze job market data to identify missing skills
    // For now, return common skills that are missing
    const userSkillNames = new Set(userSkills.map(us => us.skill.name));
    const commonSkills = ['JavaScript', 'Python', 'Communication', 'Leadership', 'Project Management'];
    
    return commonSkills.filter(skill => !userSkillNames.has(skill));
  }

  private async calculateAverageSkillsPerUser(organizationId?: string): Promise<number> {
    const queryBuilder = this.userSkillRepository
      .createQueryBuilder('userSkill')
      .select('COUNT(userSkill.id)', 'skillCount')
      .addSelect('userSkill.userId', 'userId')
      .groupBy('userSkill.userId');

    if (organizationId) {
      queryBuilder
        .leftJoin('userSkill.user', 'user')
        .where('user.organizationId = :orgId', { orgId: organizationId });
    }

    const results = await queryBuilder.getRawMany();
    
    if (results.length === 0) return 0;
    
    const totalSkills = results.reduce((sum, result) => sum + parseInt(result.skillCount), 0);
    return totalSkills / results.length;
  }

  private async getTopSkillsByDemand(limit: number): Promise<any[]> {
    // This would integrate with job market APIs
    // For now, return mock data
    return [
      { skill: 'JavaScript', demand: 95 },
      { skill: 'Python', demand: 92 },
      { skill: 'React', demand: 88 },
      { skill: 'Node.js', demand: 85 },
      { skill: 'AWS', demand: 82 },
    ].slice(0, limit);
  }

  private async getEmergingSkills(limit: number): Promise<any[]> {
    // This would analyze trending skills data
    return [
      { skill: 'Rust', growth: 150 },
      { skill: 'Svelte', growth: 120 },
      { skill: 'Deno', growth: 110 },
      { skill: 'WebAssembly', growth: 105 },
      { skill: 'Edge Computing', growth: 100 },
    ].slice(0, limit);
  }

  private analyzeTemplatesByCategory(templates: ResumeTemplate[]): Record<string, any> {
    return templates.reduce((acc, template) => {
      const category = template.category || 'Other';
      if (!acc[category]) {
        acc[category] = {
          count: 0,
          downloads: 0,
          averageRating: 0,
        };
      }
      acc[category].count++;
      acc[category].downloads += template.downloadCount;
      acc[category].averageRating += template.rating;
      return acc;
    }, {} as Record<string, any>);
  }

  private calculateTemplateUsageTrends(templates: ResumeTemplate[]): any[] {
    // This would analyze usage over time
    // For now, return mock trend data
    return [
      { month: '2024-01', usage: 150 },
      { month: '2024-02', usage: 180 },
      { month: '2024-03', usage: 220 },
    ];
  }

  private calculateRatingDistribution(templates: ResumeTemplate[]): Record<string, number> {
    return templates.reduce((acc, template) => {
      const rating = Math.floor(template.rating);
      const key = `${rating}-star`;
      if (!acc[key]) acc[key] = 0;
      acc[key]++;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculateTemplateConversionRates(templates: ResumeTemplate[]): any {
    // This would calculate conversion from view to usage
    const totalViews = templates.reduce((sum, t) => sum + (t.userResumes?.length || 0) * 10, 0); // Mock views
    const totalUsage = templates.reduce((sum, t) => sum + (t.userResumes?.length || 0), 0);
    
    return {
      overallConversionRate: totalViews > 0 ? (totalUsage / totalViews) * 100 : 0,
      premiumConversionRate: 15.5, // Mock data
      freeConversionRate: 8.2, // Mock data
    };
  }
}
