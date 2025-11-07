import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { JobApplication } from '../../../database/entities/job-application.entity';
import { UserResume } from '../../../database/entities/user-resume.entity';
import { InterviewSession } from '../../../database/entities/interview-session.entity';
import { User } from '../../../database/entities/user.entity';
import { Job } from '../../../database/entities/job.entity';
import { Skill } from '../../../database/entities/skill.entity';

export interface ParsedResumeData {
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    address?: string;
    linkedin?: string;
    website?: string;
  };
  summary?: string;
  experience: Array<{
    company: string;
    position: string;
    startDate: string;
    endDate?: string;
    current: boolean;
    description: string;
    location?: string;
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    startDate: string;
    endDate?: string;
    current: boolean;
    gpa?: number;
  }>;
  skills: Array<{
    name: string;
    category?: string;
    level?: string;
  }>;
  certifications: Array<{
    name: string;
    issuer: string;
    issueDate: string;
    expiryDate?: string;
  }>;
  languages: Array<{
    name: string;
    proficiency: string;
  }>;
}

export interface SkillMatchResult {
  requiredSkills: string[];
  candidateSkills: string[];
  matchedSkills: Array<{
    skill: string;
    confidence: number;
    category?: string;
  }>;
  missingSkills: string[];
  additionalSkills: string[];
  overallScore: number;
  recommendations: string[];
}

@Injectable()
export class IntegrationService {
  private readonly logger = new Logger(IntegrationService.name);

  constructor(
    @InjectRepository(JobApplication)
    private applicationRepository: Repository<JobApplication>,
    @InjectRepository(UserResume)
    private resumeRepository: Repository<UserResume>,
    @InjectRepository(InterviewSession)
    private interviewRepository: Repository<InterviewSession | any>,
    @InjectRepository(Job)
    private jobRepository: Repository<Job>,
    @InjectRepository(Skill)
    private skillRepository: Repository<Skill>,
    private httpService: HttpService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {}

  async parseResumeFromFile(fileUrl: string, applicationId?: string): Promise<ParsedResumeData> {
    try {
      this.logger.log(`Starting resume parsing for file: ${fileUrl}`);

      // Use external resume parsing service or implement internal parsing
      const parsedData = await this.callResumeParsingService(fileUrl);

      // Validate and clean parsed data
      const cleanedData = this.validateAndCleanResumeData(parsedData);

      // If application ID provided, update application with parsed data
      if (applicationId) {
        await this.updateApplicationWithParsedData(applicationId, cleanedData);
      }

      // Emit event
      this.eventEmitter.emit('resume.parsed', {
        fileUrl,
        applicationId,
        parsedData: cleanedData,
      });

      this.logger.log(`Resume parsing completed for file: ${fileUrl}`);

      return cleanedData;
    } catch (error) {
      this.logger.error(`Failed to parse resume from file: ${fileUrl}`, error);
      throw new BadRequestException('Failed to parse resume file');
    }
  }

  async parseResumeFromText(resumeText: string): Promise<ParsedResumeData> {
    try {
      this.logger.log('Starting resume parsing from text');

      // Use NLP/AI service to parse resume text
      const parsedData = await this.parseResumeTextWithAI(resumeText);

      // Validate and clean parsed data
      const cleanedData = this.validateAndCleanResumeData(parsedData);

      this.logger.log('Resume parsing from text completed');

      return cleanedData;
    } catch (error) {
      this.logger.error('Failed to parse resume from text', error);
      throw new BadRequestException('Failed to parse resume text');
    }
  }

  async matchSkillsToJob(
    candidateSkills: string[],
    jobId: string,
  ): Promise<SkillMatchResult> {
    try {
      const job = await this.jobRepository.findOne({
        where: { id: jobId },
      });

      if (!job) {
        throw new NotFoundException('Job not found');
      }

      const requiredSkills = job.skillsRequired || [];
      
      // Get skill entities for better matching
      const skillEntities = await this.skillRepository.find();
      console.log('skillEntities: ', skillEntities)
      const skillMap = new Map(skillEntities.map(skill => [skill.name.toLowerCase(), skill]));
      console.log('skillMap: ', skillMap)
      // Perform skill matching
      const matchResult = await this.performSkillMatching(
        candidateSkills,
        requiredSkills as any,
        skillMap,
      );

      this.logger.log(`Skill matching completed for job: ${jobId}`);

      return matchResult;
    } catch (error) {
      this.logger.error(`Failed to match skills for job: ${jobId}`, error);
      throw error;
    }
  }

  async scheduleInterviewFromApplication(
    applicationId: string,
    interviewData: {
      type: string;
      scheduledAt: Date;
      duration: number;
      interviewers: string[];
      location?: string;
      meetingUrl?: string;
      notes?: string;
    },
    scheduledBy: User,
  ): Promise<InterviewSession> {
    try {
      const application = await this.applicationRepository.findOne({
        where: { id: applicationId },
        relations: ['job', 'candidate'],
      });

      if (!application) {
        throw new NotFoundException('Application not found');
      }

      // Create interview session
      const interview = this.interviewRepository.create({
        jobId: application.jobId,
        candidateId: application.candidateId,
        applicationId: applicationId,
        type: interviewData.type,
        scheduledAt: interviewData.scheduledAt,
        duration: interviewData.duration,
        location: interviewData.location,
        meetingUrl: interviewData.meetingUrl,
        notes: interviewData.notes,
        status: 'scheduled',
        scheduledBy: scheduledBy.id,
        interviewers: interviewData.interviewers,
      });

      const savedInterview = await this.interviewRepository.save(interview);

      // Update application with interview info
      application.scheduleInterview({
        id: savedInterview.id,
        type: interviewData.type,
        scheduledAt: interviewData.scheduledAt,
        interviewers: interviewData.interviewers,
      }, scheduledBy.id);

      await this.applicationRepository.save(application);

      // Send calendar invites and notifications
      await this.sendInterviewInvitations(savedInterview, application);

      // Emit event
      this.eventEmitter.emit('interview.scheduled.from.application', {
        interview: savedInterview,
        application,
        scheduledBy,
      });

      this.logger.log(`Interview scheduled from application: ${applicationId}`);

      return savedInterview;
    } catch (error) {
      this.logger.error(`Failed to schedule interview from application: ${applicationId}`, error);
      throw error;
    }
  }

  async syncResumeWithApplication(
    resumeId: string,
    applicationId: string,
  ): Promise<JobApplication> {
    try {
      console.log('resumeId: ', resumeId);
      console.log('applicationId: ', applicationId);
      const [resume, application] = await Promise.all([
        this.resumeRepository.findOne({ where: { id: resumeId } }),
        this.applicationRepository.findOne({ where: { id: applicationId } }),
      ]);

      if (!resume) {
        throw new NotFoundException('Resume not found');
      }

      if (!application) {
        throw new NotFoundException('Application not found');
      }

      // Update application with resume data
      application.resumeId = resumeId;

      // Extract and update screening data from resume
      const screeningData = this.extractScreeningDataFromResume(resume);
      application.updateScreeningData(screeningData);

      // Calculate auto-screening score
      const autoScore = application.calculateAutoScreeningScore();
      application.screeningData.autoScreeningScore = autoScore;

      const updatedApplication = await this.applicationRepository.save(application);

      // Emit event
      this.eventEmitter.emit('resume.synced.with.application', {
        resume,
        application: updatedApplication,
      });

      this.logger.log(`Resume ${resumeId} synced with application ${applicationId}`);

      return updatedApplication;
    } catch (error) {
      this.logger.error(`Failed to sync resume with application`, error);
      throw error;
    }
  }

  async generateApplicationSummary(applicationId: string): Promise<{
    summary: string;
    strengths: string[];
    concerns: string[];
    recommendation: 'hire' | 'no_hire' | 'interview' | 'needs_review';
    confidence: number;
  }> {
    try {
      const application = await this.applicationRepository.findOne({
        where: { id: applicationId },
        relations: ['job', 'candidate', 'resume'],
      });

      if (!application) {
        throw new NotFoundException('Application not found');
      }

      // Use AI service to generate summary
      const summary = await this.generateAISummary(application);

      this.logger.log(`Application summary generated for: ${applicationId}`);

      return summary;
    } catch (error) {
      this.logger.error(`Failed to generate application summary: ${applicationId}`, error);
      throw error;
    }
  }

  async extractSkillsFromJobDescription(jobDescription: string): Promise<string[]> {
    try {
      // Use NLP/AI to extract skills from job description
      const extractedSkills = await this.extractSkillsWithAI(jobDescription);

      // Validate against known skills database
      const validatedSkills = await this.validateExtractedSkills(extractedSkills);

      this.logger.log(`Extracted ${validatedSkills.length} skills from job description`);

      return validatedSkills;
    } catch (error) {
      this.logger.error('Failed to extract skills from job description', error);
      throw error;
    }
  }

  // Private helper methods
  private async callResumeParsingService(fileUrl: string): Promise<any> {
    try {
      const parsingServiceUrl = this.configService.get('RESUME_PARSING_SERVICE_URL');
      const apiKey = this.configService.get('RESUME_PARSING_API_KEY');

      if (!parsingServiceUrl) {
        // Fallback to basic parsing if no external service configured
        return this.basicResumeParser(fileUrl);
      }

      const response = await this.httpService.axiosRef.post(
        `${parsingServiceUrl}/parse`,
        { fileUrl },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error('Resume parsing service call failed', error);
      // Fallback to basic parsing
      return this.basicResumeParser(fileUrl);
    }
  }

  private async parseResumeTextWithAI(resumeText: string): Promise<any> {
    try {
      const aiServiceUrl = this.configService.get('AI_SERVICE_URL');
      const apiKey = this.configService.get('AI_SERVICE_API_KEY');

      if (!aiServiceUrl) {
        return this.basicTextParser(resumeText);
      }

      const response = await this.httpService.axiosRef.post(
        `${aiServiceUrl}/parse-resume`,
        { text: resumeText },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error('AI resume parsing failed', error);
      return this.basicTextParser(resumeText);
    }
  }

  private validateAndCleanResumeData(rawData: any): ParsedResumeData {
    // Implement data validation and cleaning logic
    const cleanedData: ParsedResumeData = {
      personalInfo: {
        firstName: rawData.personalInfo?.firstName?.trim() || '',
        lastName: rawData.personalInfo?.lastName?.trim() || '',
        email: rawData.personalInfo?.email?.toLowerCase().trim() || '',
        phone: rawData.personalInfo?.phone?.trim(),
        address: rawData.personalInfo?.address?.trim(),
        linkedin: rawData.personalInfo?.linkedin?.trim(),
        website: rawData.personalInfo?.website?.trim(),
      },
      summary: rawData.summary?.trim(),
      experience: (rawData.experience || []).map((exp: any) => ({
        company: exp.company?.trim() || '',
        position: exp.position?.trim() || '',
        startDate: exp.startDate || '',
        endDate: exp.endDate,
        current: exp.current || false,
        description: exp.description?.trim() || '',
        location: exp.location?.trim(),
      })),
      education: (rawData.education || []).map((edu: any) => ({
        institution: edu.institution?.trim() || '',
        degree: edu.degree?.trim() || '',
        field: edu.field?.trim() || '',
        startDate: edu.startDate || '',
        endDate: edu.endDate,
        current: edu.current || false,
        gpa: edu.gpa ? parseFloat(edu.gpa) : undefined,
      })),
      skills: (rawData.skills || []).map((skill: any) => ({
        name: skill.name?.trim() || skill,
        category: skill.category?.trim(),
        level: skill.level?.trim(),
      })),
      certifications: (rawData.certifications || []).map((cert: any) => ({
        name: cert.name?.trim() || '',
        issuer: cert.issuer?.trim() || '',
        issueDate: cert.issueDate || '',
        expiryDate: cert.expiryDate,
      })),
      languages: (rawData.languages || []).map((lang: any) => ({
        name: lang.name?.trim() || '',
        proficiency: lang.proficiency?.trim() || 'conversational',
      })),
    };

    return cleanedData;
  }

  private async updateApplicationWithParsedData(
    applicationId: string,
    parsedData: ParsedResumeData,
  ): Promise<void> {
    const application:any = await this.applicationRepository.findOne({
      where: { id: applicationId },
    });

    if (application) {
      // Update application with parsed resume data
      if (!application.externalName && parsedData.personalInfo.firstName) {
        application.externalName = `${parsedData.personalInfo.firstName} ${parsedData.personalInfo.lastName}`;
      }

      if (!application.externalEmail && parsedData.personalInfo.email) {
        application.externalEmail = parsedData.personalInfo.email;
      }

      // Add parsed data to form data
      application.formData.parsedResumeData = parsedData;

      await this.applicationRepository.save(application);
    }
  }

  private async performSkillMatching(
    candidateSkills: string[],
    requiredSkills:  string,
    skillMap: Map<string, any>,
  ): Promise<SkillMatchResult> {
    const matchedSkills: Array<{ skill: string; confidence: number; category?: string }> = [];
    const missingSkills: string[] = [];
    const additionalSkills: string[] = [];

    console.log('candidateSkills: ', candidateSkills)
    console.log('requiredSkills: ', requiredSkills)

    // Normalize skills for comparison
    const normalizedCandidateSkills = candidateSkills.map(skill => skill.toLowerCase().trim());
    const normalizedRequiredSkills = requiredSkills.split(',').map(skill => skill.toLowerCase().trim());

    // Find matches
    for (const requiredSkill of normalizedRequiredSkills) {
      let bestMatch = null;
      let bestConfidence = 0;

      for (const candidateSkill of normalizedCandidateSkills) {
        const confidence = this.calculateSkillSimilarity(candidateSkill, requiredSkill);
        if (confidence > bestConfidence && confidence > 0.7) { // 70% similarity threshold
          bestMatch = candidateSkill;
          bestConfidence = confidence;
        }
      }

      if (bestMatch) {
        const skillEntity = skillMap.get(requiredSkill);
        matchedSkills.push({
          skill: requiredSkill,
          confidence: bestConfidence,
          category: skillEntity?.category?.name,
        });
      } else {
        missingSkills.push(requiredSkill);
      }
    }

    // Find additional skills
    for (const candidateSkill of normalizedCandidateSkills) {
      if (!normalizedRequiredSkills.includes(candidateSkill)) {
        additionalSkills.push(candidateSkill);
      }
    }

    // Calculate overall score
    const overallScore = requiredSkills.length > 0 
      ? (matchedSkills.length / requiredSkills.length) * 100 
      : 100;

    // Generate recommendations
    const recommendations = this.generateSkillRecommendations(
      matchedSkills,
      missingSkills,
      additionalSkills,
      overallScore,
    );

    return {
      requiredSkills: normalizedRequiredSkills,
      candidateSkills,
      matchedSkills,
      missingSkills,
      additionalSkills,
      overallScore,
      recommendations,
    };
  }

  private calculateSkillSimilarity(skill1: string, skill2: string): number {
    // Simple similarity calculation - could be enhanced with more sophisticated algorithms
    if (skill1 === skill2) return 1.0;
    
    // Check if one skill contains the other
    if (skill1.includes(skill2) || skill2.includes(skill1)) return 0.8;
    
    // Levenshtein distance-based similarity
    const distance = this.levenshteinDistance(skill1, skill2);
    const maxLength = Math.max(skill1.length, skill2.length);
    return 1 - (distance / maxLength);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator,
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  private generateSkillRecommendations(
    matchedSkills: Array<{ skill: string; confidence: number }>,
    missingSkills: string[],
    additionalSkills: string[],
    overallScore: number,
  ): string[] {
    const recommendations: string[] = [];

    if (overallScore >= 80) {
      recommendations.push('Excellent skill match - strong candidate');
    } else if (overallScore >= 60) {
      recommendations.push('Good skill match - consider for interview');
    } else if (overallScore >= 40) {
      recommendations.push('Moderate skill match - review carefully');
    } else {
      recommendations.push('Low skill match - may not meet requirements');
    }

    if (missingSkills.length > 0) {
      recommendations.push(`Missing key skills: ${missingSkills.slice(0, 3).join(', ')}`);
    }

    if (additionalSkills.length > 0) {
      recommendations.push(`Additional valuable skills: ${additionalSkills.slice(0, 3).join(', ')}`);
    }

    return recommendations;
  }

  private async sendInterviewInvitations(
    interview: InterviewSession,
    application: JobApplication,
  ): Promise<void> {
    try {
      // This would integrate with calendar services (Google Calendar, Outlook, etc.)
      // and send email notifications
      
      this.eventEmitter.emit('interview.invitations.send', {
        interview,
        application,
      });

      this.logger.log(`Interview invitations sent for interview: ${interview.id}`);
    } catch (error) {
      this.logger.error(`Failed to send interview invitations`, error);
    }
  }

  private extractScreeningDataFromResume(resume: UserResume): any {
    return {
      skillsFromResume: resume.data.skills?.map(skill => skill.name) || [],
      experienceYears: this.calculateTotalExperience(resume.data.experience || []),
      educationLevel: this.determineEducationLevel(resume.data.education || []),
      certifications: resume.data.certifications?.map(cert => cert.name) || [],
    };
  }

  private calculateTotalExperience(experience: any[]): number {
    return experience.reduce((total, exp) => {
      const start = new Date(exp.startDate);
      const end = exp.current ? new Date() : new Date(exp.endDate);
      const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
      return total + years;
    }, 0);
  }

  private determineEducationLevel(education: any[]): string {
    const degrees = education.map(edu => edu.degree.toLowerCase());
    
    if (degrees.some(degree => degree.includes('phd') || degree.includes('doctorate'))) {
      return 'doctorate';
    }
    if (degrees.some(degree => degree.includes('master') || degree.includes('mba'))) {
      return 'masters';
    }
    if (degrees.some(degree => degree.includes('bachelor'))) {
      return 'bachelors';
    }
    if (degrees.some(degree => degree.includes('associate'))) {
      return 'associates';
    }
    return 'high_school';
  }

  private async generateAISummary(application: JobApplication): Promise<any> {
    // This would use AI service to generate application summary
    // For now, return a basic summary
    return {
      summary: `Application from ${application.candidateName} for ${application.job?.title}`,
      strengths: ['Relevant experience', 'Good skill match'],
      concerns: ['Missing some required skills'],
      recommendation: 'interview' as const,
      confidence: 0.75,
    };
  }

  private async extractSkillsWithAI(jobDescription: string): Promise<string[]> {
    // This would use AI/NLP to extract skills
    // For now, return basic keyword extraction
    const commonSkills = [
      'javascript', 'python', 'java', 'react', 'node.js', 'sql', 'aws',
      'communication', 'leadership', 'teamwork', 'problem solving'
    ];

    const extractedSkills = commonSkills.filter(skill => 
      jobDescription.toLowerCase().includes(skill)
    );

    return extractedSkills;
  }

  private async validateExtractedSkills(extractedSkills: string[]): Promise<string[]> {
    const skillEntities = await this.skillRepository.find();
    const validSkills = new Set(skillEntities.map(skill => skill.name.toLowerCase()));

    return extractedSkills.filter(skill => validSkills.has(skill.toLowerCase()));
  }

  private basicResumeParser(fileUrl: string): any {
    // Basic fallback parser - would need actual implementation
    return {
      personalInfo: { firstName: '', lastName: '', email: '' },
      experience: [],
      education: [],
      skills: [],
      certifications: [],
      languages: [],
    };
  }

  private basicTextParser(resumeText: string): any {
    // Basic text parsing fallback
    return {
      personalInfo: { firstName: '', lastName: '', email: '' },
      experience: [],
      education: [],
      skills: [],
      certifications: [],
      languages: [],
    };
  }
}
