import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Course } from './course.entity';
import { Module } from './module.entity';
import { Lesson } from './lesson.entity';
import { AssessmentAttempt } from './assessment-attempt.entity';

/**
 * Assessment type enumeration
 */
export enum AssessmentType {
  QUIZ = 'quiz',
  ASSIGNMENT = 'assignment',
  EXAM = 'exam',
  PROJECT = 'project',
  SURVEY = 'survey',
  PRACTICE = 'practice',
}

/**
 * Assessment status enumeration
 */
export enum AssessmentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

/**
 * Question type enumeration
 */
export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  SHORT_ANSWER = 'short_answer',
  LONG_ANSWER = 'long_answer',
  FILL_IN_BLANK = 'fill_in_blank',
  MATCHING = 'matching',
  ORDERING = 'ordering',
  FILE_UPLOAD = 'file_upload',
  CODE = 'code',
}

/**
 * Assessment entity for Learning Management System
 * Represents quizzes, exams, assignments, and other assessments
 */
@Entity('assessments')
@Index(['courseId'])
@Index(['moduleId'])
@Index(['lessonId'])
@Index(['type'])
@Index(['status'])
@Index(['isPublished'])
@Index(['createdAt'])
export class Assessment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  courseId: string;

  @Column({ type: 'uuid', nullable: true })
  moduleId?: string;

  @Column({ type: 'uuid', nullable: true })
  lessonId?: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  slug?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: true })
  instructions?: string;

  @Column({
    type: 'enum',
    enum: AssessmentType,
    default: AssessmentType.QUIZ,
  })
  @Index()
  type: AssessmentType;

  @Column({
    type: 'enum',
    enum: AssessmentStatus,
    default: AssessmentStatus.DRAFT,
  })
  @Index()
  status: AssessmentStatus;

  @Column({ type: 'boolean', default: false })
  @Index()
  isPublished: boolean;

  @Column({ type: 'boolean', default: false })
  isRequired: boolean;

  @Column({ type: 'boolean', default: true })
  isGraded: boolean;

  @Column({ type: 'integer', default: 100 })
  totalPoints: number;

  @Column({ type: 'integer', default: 70 })
  passingScore: number;

  @Column({ type: 'integer', nullable: true })
  timeLimit?: number; // in minutes

  @Column({ type: 'integer', default: 1 })
  maxAttempts: number;

  @Column({ type: 'integer', default: 0 })
  questionCount: number;

  @Column({ type: 'boolean', default: false })
  allowRetake: boolean;

  @Column({ type: 'boolean', default: true })
  showResults: boolean;

  @Column({ type: 'boolean', default: false })
  showCorrectAnswers: boolean;

  @Column({ type: 'boolean', default: true })
  randomizeQuestions: boolean;

  @Column({ type: 'boolean', default: false })
  randomizeOptions: boolean;

  @Column({ type: 'boolean', default: false })
  requireProctoring: boolean;

  @Column({ type: 'boolean', default: false })
  preventBacktracking: boolean;

  @Column({ type: 'boolean', default: false })
  oneQuestionAtTime: boolean;

  @Column({ type: 'integer', default: 0 })
  totalQuestions: number;

  @Column({ type: 'integer', default: 0 })
  totalAttempts: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  averageScore: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  highestScore: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  lowestScore: number;

  @Column({ type: 'integer', default: 0 })
  passCount: number;

  @Column({ type: 'integer', default: 0 })
  failCount: number;

  @Column({ type: 'timestamp', nullable: true })
  availableFrom?: Date;

  @Column({ type: 'timestamp', nullable: true })
  availableUntil?: Date;

  @Column({ type: 'jsonb', default: '[]' })
  questions: Array<{
    id: string;
    type: QuestionType;
    question: string;
    options?: string[];
    correctAnswer?: string | string[];
    points: number;
    explanation?: string;
    metadata?: Record<string, unknown>;
  }>;

  @Column({ type: 'jsonb', default: '{}' })
  settings: Record<string, unknown>;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @Column({ type: 'integer', default: 1 })
  version: number;

  @Column({ type: 'boolean', default: false })
  isArchived: boolean;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Course, { eager: false })
  @JoinColumn({ name: 'courseId' })
  course?: Course;

  @ManyToOne(() => Module, { eager: false })
  @JoinColumn({ name: 'moduleId' })
  module?: Module;

  @ManyToOne(() => Lesson, { eager: false })
  @JoinColumn({ name: 'lessonId' })
  lesson?: Lesson;

  @OneToMany(() => AssessmentAttempt, attempt => attempt.assessment)
  attempts?: AssessmentAttempt[];

  // Virtual properties
  get isActive(): boolean {
    return this.status === AssessmentStatus.PUBLISHED && this.isPublished;
  }

  get isAvailable(): boolean {
    const now = new Date();
    
    if (this.availableFrom && now < this.availableFrom) {
      return false;
    }
    
    if (this.availableUntil && now > this.availableUntil) {
      return false;
    }
    
    return this.isActive;
  }

  get passRate(): number {
    return this.totalAttempts > 0 
      ? Math.round((this.passCount / this.totalAttempts) * 100) 
      : 0;
  }

  get failRate(): number {
    return this.totalAttempts > 0 
      ? Math.round((this.failCount / this.totalAttempts) * 100) 
      : 0;
  }

  get timeLimitFormatted(): string {
    if (!this.timeLimit) return 'No time limit';
    
    const hours = Math.floor(this.timeLimit / 60);
    const minutes = this.timeLimit % 60;
    
    if (hours === 0) return `${minutes} minutes`;
    if (minutes === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minutes`;
  }

  get difficulty(): 'easy' | 'medium' | 'hard' {
    if (this.passRate >= 80) return 'easy';
    if (this.passRate >= 60) return 'medium';
    return 'hard';
  }

  /**
   * Check if user can take this assessment
   */
  canTake(userAttempts = 0): boolean {
    if (!this.isAvailable) return false;
    
    if (this.maxAttempts > 0 && userAttempts >= this.maxAttempts) {
      return false;
    }
    
    return true;
  }

  /**
   * Add question to assessment
   */
  addQuestion(question: {
    type: QuestionType;
    question: string;
    options?: string[];
    correctAnswer?: string | string[];
    points: number;
    explanation?: string;
    metadata?: Record<string, unknown>;
  }): void {
    const questionId = `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.questions = [
      ...this.questions,
      {
        id: questionId,
        ...question,
      },
    ];
    
    this.updateStatistics();
  }

  /**
   * Update question in assessment
   */
  updateQuestion(questionId: string, updates: Partial<{
    type: QuestionType;
    question: string;
    options?: string[];
    correctAnswer?: string | string[];
    points: number;
    explanation?: string;
    metadata?: Record<string, unknown>;
  }>): void {
    this.questions = this.questions.map(q => 
      q.id === questionId ? { ...q, ...updates } : q
    );
    
    this.updateStatistics();
  }

  /**
   * Remove question from assessment
   */
  removeQuestion(questionId: string): void {
    this.questions = this.questions.filter(q => q.id !== questionId);
    this.updateStatistics();
  }

  /**
   * Get question by ID
   */
  getQuestion(questionId: string) {
    return this.questions.find(q => q.id === questionId);
  }

  /**
   * Get randomized questions
   */
  getRandomizedQuestions() {
    if (!this.randomizeQuestions) {
      return this.questions;
    }
    
    return [...this.questions].sort(() => Math.random() - 0.5);
  }

  /**
   * Update assessment statistics
   */
  updateStatistics(): void {
    this.totalQuestions = this.questions.length;
    this.totalPoints = this.questions.reduce((sum, q) => sum + q.points, 0);
  }

  /**
   * Record attempt statistics
   */
  recordAttempt(score: number, passed: boolean): void {
    this.totalAttempts += 1;
    
    if (passed) {
      this.passCount += 1;
    } else {
      this.failCount += 1;
    }
    
    // Update score statistics
    if (this.totalAttempts === 1) {
      this.averageScore = score;
      this.highestScore = score;
      this.lowestScore = score;
    } else {
      this.averageScore = Math.round(
        ((this.averageScore * (this.totalAttempts - 1)) + score) / this.totalAttempts * 100
      ) / 100;
      this.highestScore = Math.max(this.highestScore, score);
      this.lowestScore = Math.min(this.lowestScore, score);
    }
  }

  /**
   * Calculate score for responses
   */
  calculateScore(responses: Record<string, string | string[]>): {
    score: number;
    totalPoints: number;
    correctAnswers: number;
    totalQuestions: number;
    passed: boolean;
  } {
    let earnedPoints = 0;
    let correctAnswers = 0;
    
    for (const question of this.questions) {
      const userAnswer = responses[question.id];
      
      if (this.isAnswerCorrect(question, userAnswer)) {
        earnedPoints += question.points;
        correctAnswers += 1;
      }
    }
    
    const score = this.totalPoints > 0 ? (earnedPoints / this.totalPoints) * 100 : 0;
    const passed = score >= this.passingScore;
    
    return {
      score: Math.round(score * 100) / 100,
      totalPoints: this.totalPoints,
      correctAnswers,
      totalQuestions: this.questions.length,
      passed,
    };
  }

  /**
   * Check if answer is correct
   */
  private isAnswerCorrect(
    question: { type: QuestionType; correctAnswer?: string | string[] },
    userAnswer: string | string[]
  ): boolean {
    if (!question.correctAnswer || !userAnswer) return false;
    
    switch (question.type) {
      case QuestionType.MULTIPLE_CHOICE:
      case QuestionType.TRUE_FALSE:
      case QuestionType.SHORT_ANSWER:
        return String(question.correctAnswer).toLowerCase() === String(userAnswer).toLowerCase();
      
      case QuestionType.MATCHING:
      case QuestionType.ORDERING:
        if (Array.isArray(question.correctAnswer) && Array.isArray(userAnswer)) {
          return JSON.stringify(question.correctAnswer.sort()) === JSON.stringify(userAnswer.sort());
        }
        return false;
      
      case QuestionType.FILL_IN_BLANK:
        if (Array.isArray(question.correctAnswer)) {
          return question.correctAnswer.some(answer => 
            String(answer).toLowerCase() === String(userAnswer).toLowerCase()
          );
        }
        return String(question.correctAnswer).toLowerCase() === String(userAnswer).toLowerCase();
      
      default:
        return false;
    }
  }

  /**
   * Get metadata value by key
   */
  getMetadata<T = unknown>(key: string, defaultValue?: T): T {
    return (this.metadata[key] as T) ?? defaultValue;
  }

  /**
   * Set metadata value
   */
  setMetadata(key: string, value: unknown): void {
    this.metadata = {
      ...this.metadata,
      [key]: value,
    };
  }

  /**
   * Get setting value by key
   */
  getSetting<T = unknown>(key: string, defaultValue?: T): T {
    return (this.settings[key] as T) ?? defaultValue;
  }

  /**
   * Set setting value
   */
  setSetting(key: string, value: unknown): void {
    this.settings = {
      ...this.settings,
      [key]: value,
    };
  }

  /**
   * Clone assessment
   */
  clone(): Partial<Assessment> {
    return {
      title: `${this.title} (Copy)`,
      description: this.description,
      instructions: this.instructions,
      type: this.type,
      isRequired: this.isRequired,
      isGraded: this.isGraded,
      totalPoints: this.totalPoints,
      passingScore: this.passingScore,
      timeLimit: this.timeLimit,
      maxAttempts: this.maxAttempts,
      allowRetake: this.allowRetake,
      showResults: this.showResults,
      showCorrectAnswers: this.showCorrectAnswers,
      randomizeQuestions: this.randomizeQuestions,
      randomizeOptions: this.randomizeOptions,
      requireProctoring: this.requireProctoring,
      preventBacktracking: this.preventBacktracking,
      oneQuestionAtTime: this.oneQuestionAtTime,
      questions: JSON.parse(JSON.stringify(this.questions)), // Deep clone
      settings: JSON.parse(JSON.stringify(this.settings)),
      metadata: JSON.parse(JSON.stringify(this.metadata)),
    };
  }
}
