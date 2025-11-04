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
import { SkillCategory } from './skill-category.entity';
import { UserSkill } from './user-skill.entity';

@Entity('skills')
@Index(['name'])
@Index(['categoryId', 'isVerified'])
@Index(['isVerified', 'popularityScore'])
export class Skill {
  @ApiProperty({ description: 'Skill ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Skill name' })
  @Column({ length: 100, unique: true })
  name: string;

  @ApiProperty({ description: 'Skill category ID' })
  @Column({ name: 'categoryId', nullable: true })
  categoryId?: string;

  @ApiProperty({ description: 'Skill description' })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ description: 'Alternative names/aliases' })
  @Column({ type: 'text', array: true, default: [] })
  aliases: string[];

  @ApiProperty({ description: 'Whether skill is verified/official' })
  @Column({ name: 'isVerified', default: false })
  isVerified: boolean;

  @ApiProperty({ description: 'Whether skill is active' })
  @Column({ name: 'isActive', default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Skill icon or image URL' })
  @Column({ name: 'iconUrl', nullable: true })
  iconUrl?: string;

  @ApiProperty({ description: 'Skill color for display' })
  @Column({ nullable: true })
  color?: string;

  @ApiProperty({ description: 'Skill popularity score (0-100)' })
  @Column({ name: 'popularityScore', default: 0 })
  popularityScore: number;

  @ApiProperty({ description: 'Skill trending score (0-100)' })
  @Column({ name: 'trendingScore', default: 0 })
  trendingScore: number;

  @ApiProperty({ description: 'Number of users with this skill' })
  @Column({ name: 'userCount', default: 0 })
  userCount: number;

  @ApiProperty({ description: 'Skill metadata and additional information' })
  @Column({ type: 'jsonb', default: {} })
  metadata: {
    officialWebsite?: string;
    documentation?: string;
    learningResources?: Array<{
      title: string;
      url: string;
      type: 'course' | 'tutorial' | 'documentation' | 'book';
      provider?: string;
    }>;
    relatedSkills?: string[];
    industryDemand?: Record<string, number>; // industry -> demand score
    salaryImpact?: {
      averageIncrease: number;
      currency: string;
      region: string;
    };
    certifications?: Array<{
      name: string;
      provider: string;
      url?: string;
      difficulty: 'beginner' | 'intermediate' | 'advanced';
    }>;
    jobTitles?: string[];
    prerequisites?: string[];
    difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    timeToLearn?: {
      beginner: number;
      intermediate: number;
      advanced: number;
    };
  };

  @ApiProperty({ description: 'Skill tags for search and categorization' })
  @Column({ type: 'text', array: true, default: [] })
  tags: string[];

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => SkillCategory, category => category.skills, { nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category?: SkillCategory;

  @OneToMany(() => UserSkill, userSkill => userSkill.skill, {
    cascade: false,
  })
  userSkills: UserSkill[];

  // Virtual properties
  get isPopular(): boolean {
    return this.popularityScore > 70;
  }

  get isTrending(): boolean {
    return this.trendingScore > 80;
  }

  get isInDemand(): boolean {
    return this.userCount > 100 && this.popularityScore > 60;
  }

  get averageProficiencyLevel(): string {
    if (!this.userSkills || this.userSkills.length === 0) {
      return 'beginner';
    }

    const levels = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
    const totalScore = this.userSkills.reduce((sum, us) => sum + levels[us.proficiencyLevel], 0);
    const average = totalScore / this.userSkills.length;

    if (average <= 1.5) return 'beginner';
    if (average <= 2.5) return 'intermediate';
    if (average <= 3.5) return 'advanced';
    return 'expert';
  }

  // Methods
  addAlias(alias: string): void {
    const normalizedAlias = alias.toLowerCase().trim();
    if (!this.aliases.includes(normalizedAlias)) {
      this.aliases.push(normalizedAlias);
    }
  }

  removeAlias(alias: string): void {
    this.aliases = this.aliases.filter(a => a !== alias.toLowerCase().trim());
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

  updatePopularityScore(score: number): void {
    this.popularityScore = Math.max(0, Math.min(100, score));
  }

  updateTrendingScore(score: number): void {
    this.trendingScore = Math.max(0, Math.min(100, score));
  }

  incrementUserCount(): void {
    this.userCount += 1;
  }

  decrementUserCount(): void {
    this.userCount = Math.max(0, this.userCount - 1);
  }

  updateMetadata(metadata: Partial<Skill['metadata']>): void {
    this.metadata = { ...this.metadata, ...metadata };
  }

  addLearningResource(resource: Skill['metadata']['learningResources'][0]): void {
    if (!this.metadata.learningResources) {
      this.metadata.learningResources = [];
    }
    this.metadata.learningResources.push(resource);
  }

  addRelatedSkill(skillId: string): void {
    if (!this.metadata.relatedSkills) {
      this.metadata.relatedSkills = [];
    }
    if (!this.metadata.relatedSkills.includes(skillId)) {
      this.metadata.relatedSkills.push(skillId);
    }
  }

  addCertification(certification: Skill['metadata']['certifications'][0]): void {
    if (!this.metadata.certifications) {
      this.metadata.certifications = [];
    }
    this.metadata.certifications.push(certification);
  }

  updateIndustryDemand(industry: string, demandScore: number): void {
    if (!this.metadata.industryDemand) {
      this.metadata.industryDemand = {};
    }
    this.metadata.industryDemand[industry] = Math.max(0, Math.min(100, demandScore));
  }

  getIndustryDemand(industry: string): number {
    return this.metadata.industryDemand?.[industry] || 0;
  }

  addJobTitle(jobTitle: string): void {
    if (!this.metadata.jobTitles) {
      this.metadata.jobTitles = [];
    }
    if (!this.metadata.jobTitles.includes(jobTitle)) {
      this.metadata.jobTitles.push(jobTitle);
    }
  }

  addPrerequisite(skillId: string): void {
    if (!this.metadata.prerequisites) {
      this.metadata.prerequisites = [];
    }
    if (!this.metadata.prerequisites.includes(skillId)) {
      this.metadata.prerequisites.push(skillId);
    }
  }

  setDifficulty(difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert'): void {
    this.metadata.difficulty = difficulty;
  }

  setTimeToLearn(timeToLearn: Skill['metadata']['timeToLearn']): void {
    this.metadata.timeToLearn = timeToLearn;
  }

  setSalaryImpact(salaryImpact: Skill['metadata']['salaryImpact']): void {
    this.metadata.salaryImpact = salaryImpact;
  }

  matchesQuery(query: string): boolean {
    const lowerQuery = query.toLowerCase();
    return (
      this.name.toLowerCase().includes(lowerQuery) ||
      this.aliases.some(alias => alias.includes(lowerQuery)) ||
      this.tags.some(tag => tag.includes(lowerQuery)) ||
      (this.description && this.description.toLowerCase().includes(lowerQuery))
    );
  }

  calculateRelevanceScore(query: string): number {
    const lowerQuery = query.toLowerCase();
    let score = 0;

    if (this.name.toLowerCase() === lowerQuery) score += 100;
    else if (this.name.toLowerCase().startsWith(lowerQuery)) score += 80;
    else if (this.name.toLowerCase().includes(lowerQuery)) score += 60;

    if (this.aliases.some(alias => alias === lowerQuery)) score += 70;
    else if (this.aliases.some(alias => alias.includes(lowerQuery))) score += 40;

    if (this.tags.some(tag => tag === lowerQuery)) score += 50;
    else if (this.tags.some(tag => tag.includes(lowerQuery))) score += 30;

    if (this.description && this.description.toLowerCase().includes(lowerQuery)) score += 20;

    score += this.popularityScore * 0.1;
    score += this.trendingScore * 0.05;

    return score;
  }

  static createFromName(name: string, categoryId?: string): Partial<Skill> {
    return {
      name: name.trim(),
      categoryId,
      aliases: [],
      tags: [name.toLowerCase().replace(/\s+/g, '-')],
      isVerified: false,
      isActive: true,
      popularityScore: 0,
      trendingScore: 0,
      userCount: 0,
      metadata: {},
    };
  }

  static getPopularSkills(): string[] {
    return [
      'JavaScript',
      'Python',
      'Java',
      'React',
      'Node.js',
      'SQL',
      'Git',
      'HTML/CSS',
      'AWS',
      'Docker',
      'TypeScript',
      'MongoDB',
      'PostgreSQL',
      'Kubernetes',
      'Machine Learning',
      'Data Analysis',
      'Project Management',
      'Agile/Scrum',
      'Communication',
      'Leadership',
    ];
  }

  static getTrendingSkills(): string[] {
    return [
      'Artificial Intelligence',
      'Machine Learning',
      'Blockchain',
      'Kubernetes',
      'GraphQL',
      'Rust',
      'Go',
      'Next.js',
      'Svelte',
      'Deno',
      'WebAssembly',
      'Edge Computing',
      'Serverless',
      'DevOps',
      'Cybersecurity',
    ];
  }

  exportForRecommendation(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      category: this.category?.name,
      popularityScore: this.popularityScore,
      trendingScore: this.trendingScore,
      difficulty: this.metadata.difficulty,
      timeToLearn: this.metadata.timeToLearn,
      relatedSkills: this.metadata.relatedSkills,
      jobTitles: this.metadata.jobTitles,
      industryDemand: this.metadata.industryDemand,
    };
  }
}
