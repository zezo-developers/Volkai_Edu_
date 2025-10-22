import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from './user.entity';
import { InterviewDifficulty } from './interview-question-bank.entity';
import { InterviewResponse } from './interview-response.entity';

export enum AiInterviewStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum InterviewFormat {
  VOICE_ONLY = 'voice_only',
  VIDEO = 'video',
  TEXT_ONLY = 'text_only',
  MIXED = 'mixed',
}

@Entity('ai_mock_interviews')
@Index(['userId', 'status'])
@Index(['jobRole', 'difficulty'])
@Index(['createdAt'])
export class AiMockInterview {
  @ApiProperty({ description: 'AI Mock Interview ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'User ID' })
  @Column({ name: 'user_id' })
  userId: string;

  @ApiProperty({ description: 'Job role for interview preparation' })
  @Column({ name: 'job_role' })
  jobRole: string;

  @ApiProperty({ description: 'Job description or requirements' })
  @Column({ name: 'job_description', type: 'text', nullable: true })
  jobDescription?: string;

  @ApiProperty({ description: 'Job cancellation Reason' })
  @Column({ name: 'cancellationReason', type: 'text', nullable: true })
  cancellationReason?: string;

  @ApiProperty({ description: 'Job failure Reason' })
  @Column({ name: 'failureReason', type: 'text', nullable: true })
  failureReason?: string;

  @ApiProperty({ description: 'Company name for context' })
  @Column({ name: 'company_name', nullable: true })
  companyName?: string;

  @ApiProperty({ enum: InterviewDifficulty, description: 'Interview difficulty level' })
  @Column({
    type: 'enum',
    enum: InterviewDifficulty,
    default: InterviewDifficulty.MEDIUM,
  })
  difficulty: InterviewDifficulty;

  @ApiProperty({ description: 'Interview duration in minutes' })
  @Column({ name: 'duration_minutes', default: 30 })
  durationMinutes: number;

  @ApiProperty({ enum: InterviewFormat, description: 'Interview format' })
  @Column({
    type: 'enum',
    enum: InterviewFormat,
    default: InterviewFormat.VOICE_ONLY,
  })
  format: InterviewFormat;

  @ApiProperty({ enum: AiInterviewStatus, description: 'Interview status' })
  @Column({
    type: 'enum',
    enum: AiInterviewStatus,
    default: AiInterviewStatus.PENDING,
  })
  status: AiInterviewStatus;

  @ApiProperty({ description: 'Interview start time' })
  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt?: Date;

  @ApiProperty({ description: 'Interview completion time' })
  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt?: Date;

  @ApiProperty({ description: 'Interview configuration' })
  @Column({ type: 'jsonb', default: {} })
  config: {
    questionTypes?: string[];
    focusAreas?: string[];
    enableHints?: boolean;
    enablePause?: boolean;
    recordSession?: boolean;
    realTimeAnalysis?: boolean;
    customInstructions?: string;
  };

  @ApiProperty({ description: 'Interview transcript' })
  @Column({ type: 'jsonb', default: {} })
  transcript: {
    conversations?: Array<{
      speaker: 'ai' | 'user';
      message: string;
      timestamp: Date;
      confidence?: number;
    }>;
    summary?: string;
    keyPoints?: string[];
  };

  @ApiProperty({ description: 'AI-generated feedback' })
  @Column({ name: 'ai_feedback', type: 'jsonb', default: {} })
  aiFeedback: {
    overallScore?: number;
    strengths?: string[];
    improvementAreas?: string[];
    detailedAnalysis?: {
      communication?: number;
      technicalKnowledge?: number;
      problemSolving?: number;
      leadership?: number;
      teamwork?: number;
    };
    recommendations?: string[];
    nextSteps?: string[];
  };

  @ApiProperty({ description: 'Overall interview score (0-100)' })
  @Column({ name: 'overall_score', nullable: true })
  overallScore?: number;

  @ApiProperty({ description: 'Performance metrics' })
  @Column({ name: 'performance_metrics', type: 'jsonb', default: {} })
  performanceMetrics: {
    averageResponseTime?: number;
    totalSpeakingTime?: number;
    pauseCount?: number;
    fillerWordCount?: number;
    confidenceLevel?: number;
    engagementScore?: number;
  };

  @ApiProperty({ description: 'Improvement areas identified' })
  @Column({ name: 'improvement_areas', type: 'simple-array', default: [] })
  improvementAreas: string[];

  @ApiProperty({ description: 'Strengths identified' })
  @Column({ type: 'simple-array', default: [] })
  strengths: string[];

  @ApiProperty({ description: 'Skills assessed during interview' })
  @Column({ name: 'skills_assessed', type: 'simple-array', default: [] })
  skillsAssessed: string[];

  @ApiProperty({ description: 'Skill scores breakdown' })
  @Column({ name: 'skill_scores', type: 'jsonb', default: {} })
  skillScores: Record<string, number>;

  @ApiProperty({ description: 'AI model version used' })
  @Column({ name: 'ai_model_version', nullable: true })
  aiModelVersion?: string;

  @ApiProperty({ description: 'Session recording URLs' })
  @Column({ name: 'recording_urls', type: 'jsonb', default: {} })
  recordingUrls: {
    audio?: string;
    video?: string;
    screen?: string;
  };

  @ApiProperty({ description: 'Interview analytics data' })
  @Column({ type: 'jsonb', default: {} })
  analytics: {
    questionsAsked?: number;
    questionsAnswered?: number;
    averageQuestionScore?: number;
    timeDistribution?: Record<string, number>;
    emotionalAnalysis?: {
      dominant_emotion?: string;
      confidence_trend?: number[];
      stress_indicators?: string[];
    };
  };

  @ApiProperty({ description: 'Follow-up recommendations' })
  @Column({ name: 'follow_up_recommendations', type: 'jsonb', default: {} })
  followUpRecommendations: {
    courses?: Array<{
      title: string;
      description: string;
      url?: string;
      priority: 'high' | 'medium' | 'low';
    }>;
    practice_areas?: string[];
    resources?: Array<{
      title: string;
      type: 'article' | 'video' | 'book' | 'course';
      url: string;
    }>;
  };

  @ApiProperty({ description: 'Interview metadata' })
  @Column({ type: 'jsonb', default: {} })
  metadata: {
    userAgent?: string;
    deviceType?: string;
    browserInfo?: string;
    networkQuality?: string;
    interruptions?: number;
    technicalIssues?: string[];
    failureReason?: string;
    cancellationReason?: string;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => InterviewResponse, response => response.interviewSession)
  responses: InterviewResponse[];

  // Virtual properties
  get duration(): number {
    if (this.startedAt && this.completedAt) {
      return Math.round((this.completedAt.getTime() - this.startedAt.getTime()) / (1000 * 60));
    }
    return 0;
  }

  get isActive(): boolean {
    return this.status === AiInterviewStatus.IN_PROGRESS;
  }

  get isCompleted(): boolean {
    return this.status === AiInterviewStatus.COMPLETED;
  }

  get completionRate(): number {
    const totalQuestions = this.analytics.questionsAsked || 0;
    const answeredQuestions = this.analytics.questionsAnswered || 0;
    return totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;
  }

  get averageScore(): number {
    return this.analytics.averageQuestionScore || this.overallScore || 0;
  }

  // Methods
  start(): void {
    if (this.status !== AiInterviewStatus.PENDING) {
      throw new Error('Interview must be pending to start');
    }
    this.status = AiInterviewStatus.IN_PROGRESS;
    this.startedAt = new Date();
  }

  complete(): void {
    if (this.status !== AiInterviewStatus.IN_PROGRESS) {
      throw new Error('Interview must be in progress to complete');
    }
    this.status = AiInterviewStatus.COMPLETED;
    this.completedAt = new Date();
    this.calculateFinalScore();
  }

  cancel(reason?: string): void {
    if (this.status === AiInterviewStatus.COMPLETED) {
      throw new Error('Cannot cancel completed interview');
    }
    this.status = AiInterviewStatus.CANCELLED;
    if (reason) {
      this.metadata = { ...this.metadata, cancellationReason: reason };
    }
  }

  fail(error: string): void {
    this.status = AiInterviewStatus.FAILED;
    this.metadata = { ...this.metadata, failureReason: error };
  }

  addTranscriptEntry(speaker: 'ai' | 'user', message: string, confidence?: number): void {
    if (!this.transcript.conversations) {
      this.transcript.conversations = [];
    }
    
    this.transcript.conversations.push({
      speaker,
      message,
      timestamp: new Date(),
      confidence,
    });
  }

  updatePerformanceMetrics(metrics: Partial<AiMockInterview['performanceMetrics']>): void {
    this.performanceMetrics = { ...this.performanceMetrics, ...metrics };
  }

  addSkillScore(skill: string, score: number): void {
    this.skillScores[skill] = Math.max(0, Math.min(100, score));
    if (!this.skillsAssessed.includes(skill)) {
      this.skillsAssessed.push(skill);
    }
  }

  calculateFinalScore(): void {
    const skillScores = Object.values(this.skillScores);
    if (skillScores.length > 0) {
      this.overallScore = Math.round(
        skillScores.reduce((sum, score) => sum + score, 0) / skillScores.length
      );
    }

    // Update AI feedback
    this.aiFeedback.overallScore = this.overallScore;
    this.generateFeedback();
  }

  private generateFeedback(): void {
    const score = this.overallScore || 0;
    
    // Generate strengths and improvement areas based on score
    if (score >= 80) {
      this.strengths.push('Excellent communication skills', 'Strong technical knowledge');
    } else if (score >= 60) {
      this.strengths.push('Good problem-solving approach');
      this.improvementAreas.push('Enhance technical depth');
    } else {
      this.improvementAreas.push('Improve communication clarity', 'Strengthen technical foundation');
    }

    // Generate recommendations
    this.aiFeedback.recommendations = this.generateRecommendations();
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const score = this.overallScore || 0;

    if (score < 60) {
      recommendations.push('Practice more technical questions');
      recommendations.push('Work on communication skills');
    } else if (score < 80) {
      recommendations.push('Focus on specific technical areas');
      recommendations.push('Practice behavioral questions');
    } else {
      recommendations.push('Maintain current performance level');
      recommendations.push('Explore advanced topics');
    }

    return recommendations;
  }

  generateReport(): Record<string, any> {
    return {
      interviewId: this.id,
      jobRole: this.jobRole,
      difficulty: this.difficulty,
      duration: this.duration,
      overallScore: this.overallScore,
      completionRate: this.completionRate,
      strengths: this.strengths,
      improvementAreas: this.improvementAreas,
      skillScores: this.skillScores,
      performanceMetrics: this.performanceMetrics,
      feedback: this.aiFeedback,
      recommendations: this.followUpRecommendations,
      createdAt: this.createdAt,
      completedAt: this.completedAt,
    };
  }

  exportTranscript(): string {
    if (!this.transcript.conversations) {
      return 'No transcript available';
    }

    return this.transcript.conversations
      .map(conv => `[${conv.timestamp.toISOString()}] ${conv.speaker.toUpperCase()}: ${conv.message}`)
      .join('\n');
  }

  getInsights(): Record<string, any> {
    return {
      communicationScore: this.skillScores.communication || 0,
      technicalScore: this.skillScores.technical || 0,
      confidenceLevel: this.performanceMetrics.confidenceLevel || 0,
      responseTime: this.performanceMetrics.averageResponseTime || 0,
      engagementScore: this.performanceMetrics.engagementScore || 0,
      improvementPriority: this.improvementAreas.slice(0, 3),
      topStrengths: this.strengths.slice(0, 3),
    };
  }
}
