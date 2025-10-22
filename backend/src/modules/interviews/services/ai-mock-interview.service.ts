import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AiMockInterview, AiInterviewStatus, InterviewFormat } from '../../../database/entities/ai-mock-interview.entity';
import { InterviewQuestion, QuestionType } from '../../../database/entities/interview-question.entity';
import { InterviewQuestionBank, InterviewDifficulty } from '../../../database/entities/interview-question-bank.entity';
import { User } from '../../../database/entities/user.entity';
import {
  CreateAiMockInterviewDto,
  UpdateAiMockInterviewDto,
  StartAiInterviewDto,
  SubmitAiResponseDto,
  AiMockInterviewResponseDto,
  AiMockInterviewListResponseDto,
  AiInterviewAnalyticsDto,
} from '../dto/ai-mock-interview.dto';
import { firstValueFrom } from 'rxjs';

interface AIServiceResponse {
  questions: Array<{
    text: string;
    type: QuestionType;
    difficulty: InterviewDifficulty;
    expectedAnswer?: string;
    followUpQuestions?: string[];
  }>;
  sessionId: string;
}

interface SpeechAnalysisResult {
  confidence: number;
  pace: number;
  clarity: number;
  fillerWords: number;
  sentiment: string;
  keywords: string[];
}

interface AIFeedbackResponse {
  overallScore: number;
  strengths: string[];
  improvementAreas: string[];
  detailedAnalysis: {
    communication: number;
    technicalKnowledge: number;
    problemSolving: number;
    leadership: number;
    teamwork: number;
  };
  recommendations: string[];
}

@Injectable()
export class AiMockInterviewService {
  private readonly logger = new Logger(AiMockInterviewService.name);
  private readonly aiServiceUrl: string;
  private readonly speechServiceUrl: string;

  constructor(
    @InjectRepository(AiMockInterview)
    private aiMockInterviewRepository: Repository<AiMockInterview>,
    @InjectRepository(InterviewQuestion)
    private interviewQuestionRepository: Repository<InterviewQuestion>,
    @InjectRepository(InterviewQuestionBank)
    private questionBankRepository: Repository<InterviewQuestionBank>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private eventEmitter: EventEmitter2,
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.aiServiceUrl = this.configService.get('AI_SERVICE_URL', 'http://localhost:8000');
    this.speechServiceUrl = this.configService.get('SPEECH_SERVICE_URL', 'http://localhost:8001');
  }

  async createAiMockInterview(
    createDto: CreateAiMockInterviewDto,
    user: User,
  ): Promise<AiMockInterview> {
    try {
      // Validate user has access
      if (createDto.userId && createDto.userId !== user.id && user.roles!== 'admin') {
        throw new BadRequestException('Cannot create interview for another user');
      }

      const aiInterview = this.aiMockInterviewRepository.create({
        userId: createDto.userId || user.id,
        jobRole: createDto.jobRole,
        jobDescription: createDto.jobDescription,
        companyName: createDto.companyName,
        difficulty: createDto.difficulty || InterviewDifficulty.MEDIUM,
        durationMinutes: createDto.durationMinutes || 30,
        format: createDto.format || InterviewFormat.VOICE_ONLY,
        config: {
          questionTypes: createDto.questionTypes || ['behavioral', 'technical'],
          focusAreas: createDto.focusAreas || [],
          enableHints: createDto.enableHints ?? true,
          enablePause: createDto.enablePause ?? true,
          recordSession: createDto.recordSession ?? true,
          realTimeAnalysis: createDto.realTimeAnalysis ?? true,
          customInstructions: createDto.customInstructions,
        },
        metadata: {
          userAgent: createDto.userAgent,
          deviceType: createDto.deviceType,
          browserInfo: createDto.browserInfo,
        },
      });

      const savedInterview = await this.aiMockInterviewRepository.save(aiInterview);

      // Generate AI questions based on job role and requirements
      await this.generateAiQuestions(savedInterview);

      // Emit event
      this.eventEmitter.emit('ai.interview.created', {
        interview: savedInterview,
        user,
      });

      this.logger.log(`AI Mock Interview created: ${savedInterview.id}`);

      return savedInterview;
    } catch (error) {
      this.logger.error('Failed to create AI mock interview', error);
      throw error;
    }
  }

  async getAiMockInterviewById(id: string, user: User): Promise<AiMockInterview> {
    try {
      const interview = await this.aiMockInterviewRepository.findOne({
        where: { id },
        relations: ['user'],
      });

      if (!interview) {
        throw new NotFoundException('AI Mock Interview not found');
      }

      // Check permissions
      if (interview.userId !== user.id && user.roles!== 'admin') {
        throw new BadRequestException('Access denied to this interview');
      }

      return interview;
    } catch (error) {
      this.logger.error(`Failed to get AI mock interview ${id}`, error);
      throw error;
    }
  }

  async getUserAiInterviews(
    userId: string,
    user: User,
    page: number = 1,
    limit: number = 20,
  ): Promise<AiMockInterviewListResponseDto> {
    try {
      // Check permissions
      if (userId !== user.id && user.roles!== 'admin') {
        throw new BadRequestException('Access denied');
      }

      const [interviews, total] = await this.aiMockInterviewRepository.findAndCount({
        where: { userId },
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
        relations: ['user'],
      });

      return new AiMockInterviewListResponseDto({
        items: interviews,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      this.logger.error(`Failed to get AI interviews for user ${userId}`, error);
      throw error;
    }
  }

  async startAiInterview(
    id: string,
    startDto: StartAiInterviewDto,
    user: User,
  ): Promise<AiMockInterview> {
    try {
      const interview:any = await this.getAiMockInterviewById(id, user);

      if (interview.status !== AiInterviewStatus.PENDING) {
        throw new BadRequestException('Interview has already been started or completed');
      }

      // Start the interview
      interview.start();

      // Update metadata with session info
      interview.metadata = {
        ...interview.metadata,
        networkQuality: startDto.networkQuality,
        startLocation: startDto.location,
        sessionStartTime: new Date(),
      };

      const updatedInterview = await this.aiMockInterviewRepository.save(interview);

      // Initialize AI session
      await this.initializeAiSession(updatedInterview);

      // Emit event
      this.eventEmitter.emit('ai.interview.started', {
        interview: updatedInterview,
        user,
      });

      this.logger.log(`AI Mock Interview started: ${id}`);

      return updatedInterview;
    } catch (error) {
      this.logger.error(`Failed to start AI mock interview ${id}`, error);
      throw error;
    }
  }

  async submitAiResponse(
    id: string,
    responseDto: SubmitAiResponseDto,
    user: User,
  ): Promise<{ feedback: string; score: number; nextQuestion?: string }> {
    try {
      const interview = await this.getAiMockInterviewById(id, user);

      if (interview.status !== AiInterviewStatus.IN_PROGRESS) {
        throw new BadRequestException('Interview is not in progress');
      }

      // Add response to transcript
      interview.addTranscriptEntry('user', responseDto.response);

      // Analyze response with AI
      const analysis = await this.analyzeResponse(
        responseDto.response,
        responseDto.questionText,
        interview.jobRole,
        interview.difficulty,
      );

      // Process audio if provided
      let speechAnalysis: SpeechAnalysisResult | undefined;
      if (responseDto.audioUrl) {
        speechAnalysis = await this.analyzeSpeech(responseDto.audioUrl);
        interview.updatePerformanceMetrics({
          confidenceLevel: speechAnalysis.confidence,
          fillerWordCount: (interview.performanceMetrics.fillerWordCount || 0) + speechAnalysis.fillerWords,
        });
      }

      // Update analytics
      interview.analytics = {
        ...interview.analytics,
        questionsAnswered: (interview.analytics.questionsAnswered || 0) + 1,
        averageQuestionScore: this.calculateAverageScore(interview.analytics.averageQuestionScore, analysis.score),
      };

      // Add skill score
      if (responseDto.skillCategory) {
        interview.addSkillScore(responseDto.skillCategory, analysis.score);
      }

      // Generate next question or complete interview
      let nextQuestion: string | undefined;
      const questionsAnswered = interview.analytics.questionsAnswered || 0;
      const maxQuestions = this.calculateMaxQuestions(interview.durationMinutes);

      if (questionsAnswered < maxQuestions) {
        nextQuestion = await this.generateNextQuestion(interview, responseDto.response);
        interview.addTranscriptEntry('ai', nextQuestion);
      } else {
        // Complete interview
        await this.completeAiInterview(interview);
      }

      await this.aiMockInterviewRepository.save(interview);

      return {
        feedback: analysis.feedback,
        score: analysis.score,
        nextQuestion,
      };
    } catch (error) {
      this.logger.error(`Failed to submit AI response for interview ${id}`, error);
      throw error;
    }
  }

  async completeAiInterview(interview: AiMockInterview): Promise<AiMockInterview> {
    try {
      // Complete the interview
      interview.complete();

      // Generate comprehensive feedback
      const comprehensiveFeedback = await this.generateComprehensiveFeedback(interview);
      interview.aiFeedback = comprehensiveFeedback;

      // Generate follow-up recommendations
      interview.followUpRecommendations = await this.generateRecommendations(interview);

      const completedInterview = await this.aiMockInterviewRepository.save(interview);

      // Emit event
      this.eventEmitter.emit('ai.interview.completed', {
        interview: completedInterview,
      });

      this.logger.log(`AI Mock Interview completed: ${interview.id}`);

      return completedInterview;
    } catch (error) {
      this.logger.error(`Failed to complete AI interview ${interview.id}`, error);
      throw error;
    }
  }

  async cancelAiInterview(id: string, reason: string, user: User): Promise<AiMockInterview> {
    try {
      const interview = await this.getAiMockInterviewById(id, user);

      interview.cancel(reason);
      const updatedInterview = await this.aiMockInterviewRepository.save(interview);

      // Emit event
      this.eventEmitter.emit('ai.interview.cancelled', {
        interview: updatedInterview,
        user,
        reason,
      });

      this.logger.log(`AI Mock Interview cancelled: ${id}`);

      return updatedInterview;
    } catch (error) {
      this.logger.error(`Failed to cancel AI interview ${id}`, error);
      throw error;
    }
  }

  async getAiInterviewAnalytics(
    userId: string,
    user: User,
    startDate?: Date,
    endDate?: Date,
  ): Promise<AiInterviewAnalyticsDto> {
    try {
      // Check permissions
      if (userId !== user.id && user.roles!== 'admin') {
        throw new BadRequestException('Access denied');
      }

      const queryBuilder = this.aiMockInterviewRepository
        .createQueryBuilder('interview')
        .where('interview.userId = :userId', { userId })
        .andWhere('interview.status = :status', { status: AiInterviewStatus.COMPLETED });

      if (startDate) {
        queryBuilder.andWhere('interview.createdAt >= :startDate', { startDate });
      }

      if (endDate) {
        queryBuilder.andWhere('interview.createdAt <= :endDate', { endDate });
      }

      const interviews = await queryBuilder.getMany();

      // Calculate analytics
      const analytics = this.calculateInterviewAnalytics(interviews);

      return new AiInterviewAnalyticsDto(analytics);
    } catch (error) {
      this.logger.error(`Failed to get AI interview analytics for user ${userId}`, error);
      throw error;
    }
  }

  // Private helper methods
  private async generateAiQuestions(interview: AiMockInterview): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<AIServiceResponse>(`${this.aiServiceUrl}/generate-questions`, {
          jobRole: interview.jobRole,
          jobDescription: interview.jobDescription,
          difficulty: interview.difficulty,
          questionTypes: interview.config.questionTypes,
          focusAreas: interview.config.focusAreas,
          duration: interview.durationMinutes,
        })
      );

      interview.aiModelVersion = response.data.sessionId;
      interview.analytics = {
        ...interview.analytics,
        questionsAsked: response.data.questions.length,
      };

      await this.aiMockInterviewRepository.save(interview);
    } catch (error) {
      this.logger.error('Failed to generate AI questions', error);
      // Fallback to predefined questions
      await this.generateFallbackQuestions(interview);
    }
  }

  private async generateFallbackQuestions(interview: AiMockInterview): Promise<void> {
    // Generate basic questions based on job role and difficulty
    const questionBank = await this.questionBankRepository.findOne({
      where: { isPublic: true, difficulty: interview.difficulty },
      relations: ['questions'],
    });

    if (questionBank && questionBank.questions.length > 0) {
      const selectedQuestions = questionBank.getRandomQuestions(5, interview.difficulty);
      interview.analytics = {
        ...interview.analytics,
        questionsAsked: selectedQuestions.length,
      };
    }
  }

  private async initializeAiSession(interview: AiMockInterview): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl}/initialize-session`, {
          interviewId: interview.id,
          jobRole: interview.jobRole,
          difficulty: interview.difficulty,
          format: interview.format,
          config: interview.config,
        })
      );
    } catch (error) {
      this.logger.error('Failed to initialize AI session', error);
    }
  }

  private async analyzeResponse(
    response: string,
    questionText: string,
    jobRole: string,
    difficulty: InterviewDifficulty,
  ): Promise<{ score: number; feedback: string }> {
    try {
      const analysisResponse = await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl}/analyze-response`, {
          response,
          questionText,
          jobRole,
          difficulty,
        })
      );

      return {
        score: analysisResponse.data.score,
        feedback: analysisResponse.data.feedback,
      };
    } catch (error) {
      this.logger.error('Failed to analyze response with AI', error);
      // Fallback scoring
      return {
        score: this.calculateFallbackScore(response),
        feedback: 'Thank you for your response. Please continue with the next question.',
      };
    }
  }

  private async analyzeSpeech(audioUrl: string): Promise<SpeechAnalysisResult> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.speechServiceUrl}/analyze`, {
          audioUrl,
        })
      );

      return response.data;
    } catch (error) {
      this.logger.error('Failed to analyze speech', error);
      return {
        confidence: 70,
        pace: 75,
        clarity: 80,
        fillerWords: 2,
        sentiment: 'neutral',
        keywords: [],
      };
    }
  }

  private async generateNextQuestion(
    interview: AiMockInterview,
    previousResponse: string,
  ): Promise<string> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl}/next-question`, {
          interviewId: interview.id,
          previousResponse,
          context: interview.transcript,
        })
      );

      return response.data.question;
    } catch (error) {
      this.logger.error('Failed to generate next question', error);
      return this.getFallbackQuestion(interview.jobRole);
    }
  }

  private async generateComprehensiveFeedback(interview: AiMockInterview): Promise<AIFeedbackResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl}/comprehensive-feedback`, {
          interviewId: interview.id,
          transcript: interview.transcript,
          skillScores: interview.skillScores,
          performanceMetrics: interview.performanceMetrics,
        })
      );

      return response.data;
    } catch (error) {
      this.logger.error('Failed to generate comprehensive feedback', error);
      return this.generateFallbackFeedback(interview);
    }
  }

  private async generateRecommendations(interview: AiMockInterview): Promise<any> {
    const recommendations = {
      courses: [],
      practice_areas: interview.improvementAreas,
      resources: [],
    };

    // Generate recommendations based on improvement areas
    if (interview.improvementAreas.includes('communication')) {
      recommendations.courses.push({
        title: 'Effective Communication Skills',
        description: 'Improve your verbal and non-verbal communication',
        priority: 'high' as const,
      });
    }

    if (interview.improvementAreas.includes('technical')) {
      recommendations.courses.push({
        title: `Advanced ${interview.jobRole} Skills`,
        description: `Deepen your technical knowledge in ${interview.jobRole}`,
        priority: 'high' as const,
      });
    }

    return recommendations;
  }

  private calculateAverageScore(currentAverage?: number, newScore?: number): number {
    if (!currentAverage) return newScore || 0;
    if (!newScore) return currentAverage;
    return (currentAverage + newScore) / 2;
  }

  private calculateMaxQuestions(durationMinutes: number): number {
    // Estimate 5-7 minutes per question
    return Math.floor(durationMinutes / 6);
  }

  private calculateFallbackScore(response: string): number {
    // Simple scoring based on response length and keywords
    const wordCount = response.split(' ').length;
    let score = Math.min(wordCount * 2, 80); // Base score from word count

    // Bonus for professional keywords
    const professionalKeywords = ['experience', 'skills', 'project', 'team', 'challenge', 'solution'];
    const keywordMatches = professionalKeywords.filter(keyword => 
      response.toLowerCase().includes(keyword)
    ).length;
    
    score += keywordMatches * 5;
    
    return Math.min(score, 100);
  }

  private getFallbackQuestion(jobRole: string): string {
    const fallbackQuestions = [
      `Tell me about a challenging project you worked on in your ${jobRole} role.`,
      `How do you stay updated with the latest trends in ${jobRole}?`,
      `Describe a time when you had to work with a difficult team member.`,
      `What motivates you in your professional career?`,
      `How do you handle tight deadlines and pressure?`,
    ];

    return fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];
  }

  private generateFallbackFeedback(interview: AiMockInterview): AIFeedbackResponse {
    const overallScore = interview.overallScore || 75;
    
    return {
      overallScore,
      strengths: overallScore >= 80 ? 
        ['Good communication skills', 'Relevant experience'] :
        ['Shows enthusiasm', 'Willing to learn'],
      improvementAreas: overallScore < 70 ? 
        ['Technical depth', 'Communication clarity'] :
        ['Specific examples', 'Confidence'],
      detailedAnalysis: {
        communication: overallScore,
        technicalKnowledge: overallScore - 10,
        problemSolving: overallScore + 5,
        leadership: overallScore - 5,
        teamwork: overallScore,
      },
      recommendations: [
        'Practice more technical questions',
        'Prepare specific examples from your experience',
      ],
    };
  }

  private calculateInterviewAnalytics(interviews: AiMockInterview[]): any {
    const totalInterviews = interviews.length;
    const averageScore = interviews.reduce((sum, i) => sum + (i.overallScore || 0), 0) / totalInterviews;
    const averageDuration = interviews.reduce((sum, i) => sum + i.duration, 0) / totalInterviews;

    const skillScores: Record<string, number[]> = {};
    interviews.forEach(interview => {
      Object.entries(interview.skillScores).forEach(([skill, score]) => {
        if (!skillScores[skill]) skillScores[skill] = [];
        skillScores[skill].push(score);
      });
    });

    const averageSkillScores: Record<string, number> = {};
    Object.entries(skillScores).forEach(([skill, scores]) => {
      averageSkillScores[skill] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    });

    return {
      totalInterviews,
      averageScore,
      averageDuration,
      averageSkillScores,
      improvementTrend: this.calculateImprovementTrend(interviews),
      completionRate: 100, // All interviews in this query are completed
    };
  }

  private calculateImprovementTrend(interviews: AiMockInterview[]): number {
    if (interviews.length < 2) return 0;
    
    const sortedInterviews = interviews.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const firstScore = sortedInterviews[0].overallScore || 0;
    const lastScore = sortedInterviews[sortedInterviews.length - 1].overallScore || 0;
    
    return lastScore - firstScore;
  }
}
