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
import { InterviewQuestionBank, InterviewDifficulty } from './interview-question-bank.entity';
import { InterviewResponse } from './interview-response.entity';

export enum QuestionType {
  BEHAVIORAL = 'behavioral',
  TECHNICAL = 'technical',
  SITUATIONAL = 'situational',
  CODING = 'coding',
  SYSTEM_DESIGN = 'system_design',
  CASE_STUDY = 'case_study',
  GENERAL = 'general',
}

@Entity('interview_questions')
@Index(['questionBankId', 'difficulty'])
@Index(['type', 'difficulty'])
@Index(['tags'])
export class InterviewQuestion {
  @ApiProperty({ description: 'Question ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Question bank ID' })
  @Column({ name: 'bank_id' })
  questionBankId: string;

  @ApiProperty({ description: 'Question text' })
  @Column({ name: 'question_text', type: 'text' })
  questionText: string;

  @ApiProperty({ description: 'Expected answer or guidelines' })
  @Column({ name: 'expected_answer', type: 'text', nullable: true })
  expectedAnswer?: string;

  @ApiProperty({ description: 'Follow-up questions' })
  @Column({ name: 'follow_up_questions', type: 'simple-array', default: [] })
  followUpQuestions: string[];

  @ApiProperty({ description: 'Evaluation criteria' })
  @Column({ name: 'evaluation_criteria', type: 'jsonb', default: {} })
  evaluationCriteria: {
    technical_accuracy?: number;
    communication?: number;
    problem_solving?: number;
    creativity?: number;
    leadership?: number;
    teamwork?: number;
    [key: string]: number;
  };

  @ApiProperty({ description: 'Time limit in minutes' })
  @Column({ name: 'time_limit_minutes', nullable: true })
  timeLimitMinutes?: number;

  @ApiProperty({ enum: InterviewDifficulty, description: 'Question difficulty' })
  @Column({
    type: 'enum',
    enum: InterviewDifficulty,
    default: InterviewDifficulty.MEDIUM,
  })
  difficulty: InterviewDifficulty;

  @ApiProperty({ enum: QuestionType, description: 'Question type' })
  @Column({
    type: 'enum',
    enum: QuestionType,
    default: QuestionType.GENERAL,
  })
  type: QuestionType;

  @ApiProperty({ description: 'Question tags for categorization' })
  @Column({ type: 'simple-array', default: [] })
  tags: string[];

  @ApiProperty({ description: 'Question hints for candidates' })
  @Column({ type: 'simple-array', default: [] })
  hints: string[];

  @ApiProperty({ description: 'Sample answers or examples' })
  @Column({ name: 'sample_answers', type: 'jsonb', default: [] })
  sampleAnswers: Array<{
    answer: string;
    rating: number;
    explanation?: string;
  }>;

  @ApiProperty({ description: 'Question resources and references' })
  @Column({ type: 'jsonb', default: [] })
  resources: Array<{
    title: string;
    url: string;
    type: 'article' | 'video' | 'documentation' | 'book';
  }>;

  @ApiProperty({ description: 'Question statistics' })
  @Column({ type: 'jsonb', default: {} })
  statistics: {
    timesUsed?: number;
    averageScore?: number;
    averageTime?: number;
    successRate?: number;
    lastUsed?: Date;
  };

  @ApiProperty({ description: 'Question configuration' })
  @Column({ type: 'jsonb', default: {} })
  config: {
    allowHints?: boolean;
    showTimer?: boolean;
    requireCodeExecution?: boolean;
    allowNotes?: boolean;
  };

  @ApiProperty({ description: 'Whether question is active' })
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Question order in bank' })
  @Column({ name: 'order_index', nullable: true })
  orderIndex?: number;

  @ApiProperty({ description: 'Question metadata' })
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => InterviewQuestionBank, bank => bank.questions)
  @JoinColumn({ name: 'bank_id' })
  questionBank: InterviewQuestionBank;

  @OneToMany(() => InterviewResponse, response => response.question)
  responses: InterviewResponse[];

  // Virtual properties
  get difficultyScore(): number {
    const scores = {
      [InterviewDifficulty.EASY]: 1,
      [InterviewDifficulty.MEDIUM]: 2,
      [InterviewDifficulty.HARD]: 3,
      [InterviewDifficulty.EXPERT]: 4,
    };
    return scores[this.difficulty] || 2;
  }

  get averageResponseTime(): number {
    return this.statistics.averageTime || 0;
  }

  get usageCount(): number {
    return this.statistics.timesUsed || 0;
  }

  get successRate(): number {
    return this.statistics.successRate || 0;
  }

  get isPopular(): boolean {
    return this.usageCount > 10 && this.successRate > 0.7;
  }

  get needsImprovement(): boolean {
    return this.usageCount > 5 && this.successRate < 0.3;
  }

  // Methods
  updateStatistics(responseTime: number, score: number): void {
    const stats = this.statistics;
    const currentCount = stats.timesUsed || 0;
    
    // Update usage count
    stats.timesUsed = currentCount + 1;
    
    // Update average score
    if (currentCount === 0) {
      stats.averageScore = score;
      stats.averageTime = responseTime;
    } else {
      stats.averageScore = ((stats.averageScore * currentCount) + score) / (currentCount + 1);
      stats.averageTime = ((stats.averageTime * currentCount) + responseTime) / (currentCount + 1);
    }
    
    // Update success rate (considering score > 70 as success)
    const successCount = currentCount * (stats.successRate || 0) + (score > 70 ? 1 : 0);
    stats.successRate = successCount / (currentCount + 1);
    
    stats.lastUsed = new Date();
    this.statistics = stats;
  }

  addTag(tag: string): void {
    const normalizedTag = tag.toLowerCase().trim();
    if (!this.tags.includes(normalizedTag)) {
      this.tags.push(normalizedTag);
    }
  }

  removeTag(tag: string): void {
    this.tags = this.tags.filter(t => t !== tag.toLowerCase().trim());
  }

  addHint(hint: string): void {
    if (!this.hints.includes(hint)) {
      this.hints.push(hint);
    }
  }

  addSampleAnswer(answer: string, rating: number, explanation?: string): void {
    this.sampleAnswers.push({
      answer,
      rating,
      explanation,
    });
  }

  addResource(title: string, url: string, type: 'article' | 'video' | 'documentation' | 'book'): void {
    this.resources.push({
      title,
      url,
      type,
    });
  }

  getEvaluationScore(responses: Record<string, number>): number {
    const criteria = this.evaluationCriteria;
    const criteriaKeys = Object.keys(criteria);
    
    if (criteriaKeys.length === 0) {
      return 0;
    }

    let totalScore = 0;
    let totalWeight = 0;

    criteriaKeys.forEach(key => {
      const weight = criteria[key];
      const score = responses[key] || 0;
      totalScore += score * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  isRelevantFor(skills: string[], jobRole?: string): boolean {
    const questionTags = this.tags.map(t => t.toLowerCase());
    const skillsLower = skills.map(s => s.toLowerCase());
    
    // Check if any skills match question tags
    const skillMatch = skillsLower.some(skill => 
      questionTags.some(tag => tag.includes(skill) || skill.includes(tag))
    );

    // Check if job role matches question type or tags
    let roleMatch = true;
    if (jobRole) {
      const roleLower = jobRole.toLowerCase();
      roleMatch = questionTags.some(tag => 
        tag.includes(roleLower) || roleLower.includes(tag)
      ) || this.type.toString().toLowerCase().includes(roleLower);
    }

    return skillMatch || roleMatch;
  }

  clone(): Partial<InterviewQuestion> {
    return {
      questionText: this.questionText,
      expectedAnswer: this.expectedAnswer,
      followUpQuestions: [...this.followUpQuestions],
      evaluationCriteria: { ...this.evaluationCriteria },
      timeLimitMinutes: this.timeLimitMinutes,
      difficulty: this.difficulty,
      type: this.type,
      tags: [...this.tags],
      hints: [...this.hints],
      sampleAnswers: [...this.sampleAnswers],
      resources: [...this.resources],
      config: { ...this.config },
      metadata: {
        ...this.metadata,
        clonedFrom: this.id,
        clonedAt: new Date(),
      },
    };
  }

  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.questionText || this.questionText.trim().length < 10) {
      errors.push('Question text must be at least 10 characters long');
    }

    if (this.timeLimitMinutes && this.timeLimitMinutes < 1) {
      errors.push('Time limit must be at least 1 minute');
    }

    if (this.sampleAnswers.some(sa => sa.rating < 0 || sa.rating > 100)) {
      errors.push('Sample answer ratings must be between 0 and 100');
    }

    const criteriaValues = Object.values(this.evaluationCriteria);
    if (criteriaValues.some(v => v < 0 || v > 10)) {
      errors.push('Evaluation criteria weights must be between 0 and 10');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
