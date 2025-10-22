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
import { Organization } from './organization.entity';
import { InterviewQuestion } from './interview-question.entity';

export enum InterviewDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  EXPERT = 'expert',
}

@Entity('interview_question_banks')
@Index(['organizationId', 'isPublic'])
@Index(['category', 'difficulty'])
@Index(['createdBy'])
export class InterviewQuestionBank {
  @ApiProperty({ description: 'Question bank ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Organization ID' })
  @Column({ name: 'org_id', nullable: true })
  organizationId?: string;

  @ApiProperty({ description: 'Question bank name' })
  @Column({ length: 255 })
  name: string;

  @ApiProperty({ description: 'Question bank description' })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ description: 'Question category' })
  @Column({ length: 100, nullable: true })
  category?: string;

  @ApiProperty({ enum: InterviewDifficulty, description: 'Default difficulty level' })
  @Column({
    type: 'enum',
    enum: InterviewDifficulty,
    nullable: true,
  })
  difficulty?: InterviewDifficulty;

  @ApiProperty({ description: 'Question bank tags' })
  @Column({ type: 'simple-array', default: [] })
  tags: string[];

  @ApiProperty({ description: 'Whether bank is publicly available' })
  @Column({ name: 'is_public', default: false })
  isPublic: boolean;

  @ApiProperty({ description: 'Whether bank is active' })
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Question bank icon/image URL' })
  @Column({ name: 'icon_url', nullable: true })
  iconUrl?: string;

  @ApiProperty({ description: 'Question bank color theme' })
  @Column({ nullable: true })
  color?: string;

  @ApiProperty({ description: 'Usage statistics' })
  @Column({ type: 'jsonb', default: {} })
  statistics: {
    totalQuestions?: number;
    totalUsage?: number;
    averageRating?: number;
    lastUsed?: Date;
  };

  @ApiProperty({ description: 'Bank configuration' })
  @Column({ type: 'jsonb', default: {} })
  config: {
    allowRandomSelection?: boolean;
    defaultTimeLimit?: number;
    requireAllQuestions?: boolean;
    shuffleQuestions?: boolean;
  };

  @ApiProperty({ description: 'Bank metadata' })
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @ApiProperty({ description: 'Creator user ID' })
  @Column({ name: 'created_by' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'org_id' })
  organization?: Organization;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @OneToMany(() => InterviewQuestion, question => question.questionBank)
  questions: InterviewQuestion[];

  // Virtual properties
  get questionCount(): number {
    return this.questions?.length || this.statistics.totalQuestions || 0;
  }

  get averageDifficulty(): string {
    if (!this.questions || this.questions.length === 0) {
      return this.difficulty || InterviewDifficulty.MEDIUM;
    }

    const difficultyValues = {
      [InterviewDifficulty.EASY]: 1,
      [InterviewDifficulty.MEDIUM]: 2,
      [InterviewDifficulty.HARD]: 3,
      [InterviewDifficulty.EXPERT]: 4,
    };

    const average = this.questions.reduce((sum, q) => {
      return sum + (difficultyValues[q.difficulty] || 2);
    }, 0) / this.questions.length;

    if (average <= 1.5) return InterviewDifficulty.EASY;
    if (average <= 2.5) return InterviewDifficulty.MEDIUM;
    if (average <= 3.5) return InterviewDifficulty.HARD;
    return InterviewDifficulty.EXPERT;
  }

  get isOwner(): boolean {
    // This would be set by the service based on current user
    return false;
  }

  get canEdit(): boolean {
    return this.isOwner || this.isPublic;
  }

  // Methods
  updateStatistics(): void {
    if (this.questions) {
      this.statistics.totalQuestions = this.questions.length;
      this.statistics.lastUsed = new Date();
    }
  }

  addTag(tag: string): void {
    if (!this.tags.includes(tag.toLowerCase())) {
      this.tags.push(tag.toLowerCase());
    }
  }

  removeTag(tag: string): void {
    this.tags = this.tags.filter(t => t !== tag.toLowerCase());
  }

  incrementUsage(): void {
    this.statistics.totalUsage = (this.statistics.totalUsage || 0) + 1;
    this.statistics.lastUsed = new Date();
  }

  updateRating(newRating: number): void {
    const currentRating = this.statistics.averageRating || 0;
    const currentCount = this.statistics.totalUsage || 0;
    
    if (currentCount === 0) {
      this.statistics.averageRating = newRating;
    } else {
      this.statistics.averageRating = 
        ((currentRating * currentCount) + newRating) / (currentCount + 1);
    }
  }

  getQuestionsByDifficulty(difficulty: InterviewDifficulty): InterviewQuestion[] {
    return this.questions?.filter(q => q.difficulty === difficulty) || [];
  }

  getQuestionsByCategory(category: string): InterviewQuestion[] {
    return this.questions?.filter(q => 
      q.tags?.includes(category.toLowerCase()) ||
      q.questionText.toLowerCase().includes(category.toLowerCase())
    ) || [];
  }

  getRandomQuestions(count: number, difficulty?: InterviewDifficulty): InterviewQuestion[] {
    let availableQuestions = this.questions || [];
    
    if (difficulty) {
      availableQuestions = this.getQuestionsByDifficulty(difficulty);
    }

    if (availableQuestions.length <= count) {
      return availableQuestions;
    }

    const shuffled = [...availableQuestions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  validateConfig(): boolean {
    const config = this.config;
    
    // Validate time limits
    if (config.defaultTimeLimit && config.defaultTimeLimit < 30) {
      return false;
    }

    // Validate question requirements
    if (config.requireAllQuestions && this.questionCount === 0) {
      return false;
    }

    return true;
  }

  clone(newName: string, createdBy: string): Partial<InterviewQuestionBank> {
    return {
      name: newName,
      description: this.description,
      category: this.category,
      difficulty: this.difficulty,
      tags: [...this.tags],
      isPublic: false,
      config: { ...this.config },
      metadata: { 
        ...this.metadata, 
        clonedFrom: this.id,
        clonedAt: new Date() 
      },
      createdBy,
    };
  }
}
