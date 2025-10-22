import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { InterviewSession } from './interview-session.entity';
import { InterviewQuestion } from './interview-question.entity';
import { User } from './user.entity';

export enum ResponseStatus {
  PENDING = 'pending',
  ANSWERED = 'answered',
  SKIPPED = 'skipped',
  TIMED_OUT = 'timed_out',
}

@Entity('interview_responses')
@Index(['interviewSessionId', 'questionId'])
@Index(['userId', 'createdAt'])
export class InterviewResponse {
  @ApiProperty({ description: 'Response ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Interview session ID' })
  @Column({ name: 'interview_session_id' })
  interviewSessionId: string;

  @ApiProperty({ description: 'Question ID' })
  @Column({ name: 'question_id' })
  questionId: string;

  @ApiProperty({ description: 'User ID who responded' })
  @Column({ name: 'user_id' })
  userId: string;

  @ApiProperty({ description: 'Question text at time of response' })
  @Column({ name: 'question_text', type: 'text' })
  questionText: string;

  @ApiProperty({ description: 'User response text' })
  @Column({ name: 'user_response', type: 'text', nullable: true })
  userResponse?: string;

  @ApiProperty({ description: 'Audio recording URL' })
  @Column({ name: 'audio_url', nullable: true })
  audioUrl?: string;

  @ApiProperty({ description: 'Video recording URL' })
  @Column({ name: 'video_url', nullable: true })
  videoUrl?: string;

  @ApiProperty({ description: 'Screen recording URL for coding questions' })
  @Column({ name: 'screen_recording_url', nullable: true })
  screenRecordingUrl?: string;

  @ApiProperty({ description: 'Code submission for technical questions' })
  @Column({ name: 'code_submission', type: 'text', nullable: true })
  codeSubmission?: string;

  @ApiProperty({ description: 'Programming language used' })
  @Column({ name: 'programming_language', nullable: true })
  programmingLanguage?: string;

  @ApiProperty({ description: 'Response time in seconds' })
  @Column({ name: 'response_time_seconds', nullable: true })
  responseTimeSeconds?: number;

  @ApiProperty({ description: 'Time spent thinking before answering' })
  @Column({ name: 'thinking_time_seconds', nullable: true })
  thinkingTimeSeconds?: number;

  @ApiProperty({ enum: ResponseStatus, description: 'Response status' })
  @Column({
    type: 'enum',
    enum: ResponseStatus,
    default: ResponseStatus.PENDING,
  })
  status: ResponseStatus;

  @ApiProperty({ description: 'AI-generated score (0-100)' })
  @Column({ name: 'ai_score', nullable: true })
  aiScore?: number;

  @ApiProperty({ description: 'Human interviewer score (0-100)' })
  @Column({ name: 'human_score', nullable: true })
  humanScore?: number;

  @ApiProperty({ description: 'Final score (0-100)' })
  @Column({ name: 'final_score', nullable: true })
  finalScore?: number;

  @ApiProperty({ description: 'AI-generated feedback' })
  @Column({ name: 'ai_feedback', type: 'text', nullable: true })
  aiFeedback?: string;

  @ApiProperty({ description: 'Human interviewer feedback' })
  @Column({ name: 'human_feedback', type: 'text', nullable: true })
  humanFeedback?: string;

  @ApiProperty({ description: 'Detailed evaluation breakdown' })
  @Column({ name: 'evaluation_breakdown', type: 'jsonb', default: {} })
  evaluationBreakdown: {
    technical_accuracy?: number;
    communication?: number;
    problem_solving?: number;
    creativity?: number;
    leadership?: number;
    teamwork?: number;
    [key: string]: number;
  };

  @ApiProperty({ description: 'Speech analysis data' })
  @Column({ name: 'speech_analysis', type: 'jsonb', default: {} })
  speechAnalysis: {
    confidence?: number;
    pace?: number;
    clarity?: number;
    filler_words?: number;
    sentiment?: string;
    keywords?: string[];
  };

  @ApiProperty({ description: 'Behavioral analysis data' })
  @Column({ name: 'behavioral_analysis', type: 'jsonb', default: {} })
  behavioralAnalysis: {
    eye_contact?: number;
    posture?: number;
    gestures?: number;
    facial_expressions?: string[];
    engagement_level?: number;
  };

  @ApiProperty({ description: 'Code analysis for technical questions' })
  @Column({ name: 'code_analysis', type: 'jsonb', default: {} })
  codeAnalysis: {
    syntax_correctness?: number;
    logic_correctness?: number;
    efficiency?: number;
    readability?: number;
    best_practices?: number;
    test_cases_passed?: number;
    total_test_cases?: number;
  };

  @ApiProperty({ description: 'Response metadata' })
  @Column({ type: 'jsonb', default: {} })
  metadata: {
    ip_address?: string;
    user_agent?: string;
    device_type?: string;
    browser?: string;
    location?: string;
    timezone?: string;
    skipReason?: string;
  };

  @ApiProperty({ description: 'Whether response needs review' })
  @Column({ name: 'needs_review', default: false })
  needsReview: boolean;

  @ApiProperty({ description: 'Review notes' })
  @Column({ name: 'review_notes', type: 'text', nullable: true })
  reviewNotes?: string;

  @ApiProperty({ description: 'Reviewed by user ID' })
  @Column({ name: 'reviewed_by', nullable: true })
  reviewedBy?: string;

  @ApiProperty({ description: 'Review date' })
  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => InterviewSession, session => session.responses)
  @JoinColumn({ name: 'interview_session_id' })
  interviewSession: InterviewSession;

  @ManyToOne(() => InterviewQuestion, question => question.responses)
  @JoinColumn({ name: 'question_id' })
  question: InterviewQuestion;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer?: User;

  // Virtual properties
  get hasAudio(): boolean {
    return !!this.audioUrl;
  }

  get hasVideo(): boolean {
    return !!this.videoUrl;
  }

  get hasCode(): boolean {
    return !!this.codeSubmission;
  }

  get isCompleted(): boolean {
    return this.status === ResponseStatus.ANSWERED || 
           this.status === ResponseStatus.SKIPPED || 
           this.status === ResponseStatus.TIMED_OUT;
  }

  get overallScore(): number {
    if (this.finalScore !== null && this.finalScore !== undefined) {
      return this.finalScore;
    }
    if (this.humanScore !== null && this.humanScore !== undefined) {
      return this.humanScore;
    }
    return this.aiScore || 0;
  }

  get responseQuality(): 'excellent' | 'good' | 'average' | 'poor' {
    const score = this.overallScore;
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'average';
    return 'poor';
  }

  get communicationScore(): number {
    const speech = this.speechAnalysis;
    if (!speech.confidence) return 0;
    
    return Math.round(
      (speech.confidence * 0.4) +
      (speech.pace * 0.3) +
      (speech.clarity * 0.3)
    );
  }

  // Methods
  startResponse(): void {
    if (this.status !== ResponseStatus.PENDING) {
      throw new Error('Response has already been started');
    }
    this.status = ResponseStatus.ANSWERED;
  }

  submitResponse(response: string, timeSpent: number): void {
    this.userResponse = response;
    this.responseTimeSeconds = timeSpent;
    this.status = ResponseStatus.ANSWERED;
  }

  submitCode(code: string, language: string, timeSpent: number): void {
    this.codeSubmission = code;
    this.programmingLanguage = language;
    this.responseTimeSeconds = timeSpent;
    this.status = ResponseStatus.ANSWERED;
  }

  skip(reason?: string): void {
    this.status = ResponseStatus.SKIPPED;
    if (reason) {
      this.metadata = { ...this.metadata, skipReason: reason };
    }
  }

  timeout(): void {
    this.status = ResponseStatus.TIMED_OUT;
  }

  setAIScore(score: number, feedback?: string): void {
    this.aiScore = Math.max(0, Math.min(100, score));
    if (feedback) {
      this.aiFeedback = feedback;
    }
  }

  setHumanScore(score: number, feedback?: string, reviewerId?: string): void {
    this.humanScore = Math.max(0, Math.min(100, score));
    if (feedback) {
      this.humanFeedback = feedback;
    }
    if (reviewerId) {
      this.reviewedBy = reviewerId;
      this.reviewedAt = new Date();
    }
  }

  calculateFinalScore(): void {
    if (this.humanScore !== null && this.humanScore !== undefined) {
      // Human score takes precedence
      this.finalScore = this.humanScore;
    } else if (this.aiScore !== null && this.aiScore !== undefined) {
      this.finalScore = this.aiScore;
    } else {
      // Calculate from evaluation breakdown
      const breakdown = this.evaluationBreakdown;
      const scores = Object.values(breakdown).filter(score => typeof score === 'number');
      if (scores.length > 0) {
        this.finalScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
      }
    }
  }

  addEvaluationScore(criterion: string, score: number): void {
    this.evaluationBreakdown[criterion] = Math.max(0, Math.min(100, score));
    this.calculateFinalScore();
  }

  updateSpeechAnalysis(analysis: Partial<InterviewResponse['speechAnalysis']>): void {
    this.speechAnalysis = { ...this.speechAnalysis, ...analysis };
  }

  updateBehavioralAnalysis(analysis: Partial<InterviewResponse['behavioralAnalysis']>): void {
    this.behavioralAnalysis = { ...this.behavioralAnalysis, ...analysis };
  }

  updateCodeAnalysis(analysis: Partial<InterviewResponse['codeAnalysis']>): void {
    this.codeAnalysis = { ...this.codeAnalysis, ...analysis };
  }

  flagForReview(reason: string): void {
    this.needsReview = true;
    this.reviewNotes = reason;
  }

  completeReview(reviewerId: string, notes?: string): void {
    this.needsReview = false;
    this.reviewedBy = reviewerId;
    this.reviewedAt = new Date();
    if (notes) {
      this.reviewNotes = notes;
    }
  }

  getDetailedFeedback(): string {
    const feedback: string[] = [];
    
    if (this.aiFeedback) {
      feedback.push(`AI Analysis: ${this.aiFeedback}`);
    }
    
    if (this.humanFeedback) {
      feedback.push(`Interviewer Feedback: ${this.humanFeedback}`);
    }

    // Add breakdown feedback
    const breakdown = this.evaluationBreakdown;
    if (Object.keys(breakdown).length > 0) {
      feedback.push('Evaluation Breakdown:');
      Object.entries(breakdown).forEach(([criterion, score]) => {
        feedback.push(`- ${criterion.replace(/_/g, ' ')}: ${score}/100`);
      });
    }

    return feedback.join('\n\n');
  }

  exportForAnalysis(): Record<string, any> {
    return {
      questionId: this.questionId,
      questionText: this.questionText,
      response: this.userResponse,
      responseTime: this.responseTimeSeconds,
      score: this.overallScore,
      evaluationBreakdown: this.evaluationBreakdown,
      speechAnalysis: this.speechAnalysis,
      behavioralAnalysis: this.behavioralAnalysis,
      codeAnalysis: this.codeAnalysis,
      status: this.status,
      createdAt: this.createdAt,
    };
  }
}
