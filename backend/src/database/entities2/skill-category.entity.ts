import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Skill } from './skill.entity';

@Entity('skill_categories')
@Index(['name'])
export class SkillCategory {
  @ApiProperty({ description: 'Skill category ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Category name' })
  @Column({ length: 100, unique: true })
  name: string;

  @ApiProperty({ description: 'Category description' })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ description: 'Category icon' })
  @Column({ length: 50, nullable: true })
  icon?: string;

  @ApiProperty({ description: 'Category color' })
  @Column({ nullable: true })
  color?: string;

  @ApiProperty({ description: 'Category order for display' })
  @Column({ name: 'display_order', default: 0 })
  displayOrder: number;

  @ApiProperty({ description: 'Whether category is active' })
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Category metadata' })
  @Column({ type: 'jsonb', default: {} })
  metadata: {
    popularityScore?: number;
    trendingScore?: number;
    industryRelevance?: string[];
    relatedCategories?: string[];
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @OneToMany(() => Skill, skill => skill.category)
  skills: Skill[];

  // Virtual properties
  get skillCount(): number {
    return this.skills?.length || 0;
  }

  get isPopular(): boolean {
    return (this.metadata.popularityScore || 0) > 70;
  }

  get isTrending(): boolean {
    return (this.metadata.trendingScore || 0) > 80;
  }

  // Methods
  updateMetadata(metadata: Partial<SkillCategory['metadata']>): void {
    this.metadata = { ...this.metadata, ...metadata };
  }

  addRelatedCategory(categoryId: string): void {
    if (!this.metadata.relatedCategories) {
      this.metadata.relatedCategories = [];
    }
    if (!this.metadata.relatedCategories.includes(categoryId)) {
      this.metadata.relatedCategories.push(categoryId);
    }
  }

  removeRelatedCategory(categoryId: string): void {
    if (this.metadata.relatedCategories) {
      this.metadata.relatedCategories = this.metadata.relatedCategories.filter(id => id !== categoryId);
    }
  }

  updatePopularityScore(score: number): void {
    this.metadata.popularityScore = Math.max(0, Math.min(100, score));
  }

  updateTrendingScore(score: number): void {
    this.metadata.trendingScore = Math.max(0, Math.min(100, score));
  }

  addIndustryRelevance(industry: string): void {
    if (!this.metadata.industryRelevance) {
      this.metadata.industryRelevance = [];
    }
    if (!this.metadata.industryRelevance.includes(industry)) {
      this.metadata.industryRelevance.push(industry);
    }
  }

  static getDefaultCategories(): Partial<SkillCategory>[] {
    return [
      {
        name: 'Programming Languages',
        description: 'Programming and scripting languages',
        icon: 'code',
        color: '#3B82F6',
        displayOrder: 1,
        metadata: {
          industryRelevance: ['Technology', 'Software Development', 'Data Science'],
        },
      },
      {
        name: 'Web Development',
        description: 'Frontend and backend web technologies',
        icon: 'globe',
        color: '#10B981',
        displayOrder: 2,
        metadata: {
          industryRelevance: ['Technology', 'E-commerce', 'Digital Marketing'],
        },
      },
      {
        name: 'Database Technologies',
        description: 'Database management and query languages',
        icon: 'database',
        color: '#F59E0B',
        displayOrder: 3,
        metadata: {
          industryRelevance: ['Technology', 'Finance', 'Healthcare'],
        },
      },
      {
        name: 'Cloud Platforms',
        description: 'Cloud computing and deployment platforms',
        icon: 'cloud',
        color: '#8B5CF6',
        displayOrder: 4,
        metadata: {
          industryRelevance: ['Technology', 'Enterprise', 'Startups'],
        },
      },
      {
        name: 'Data Science & Analytics',
        description: 'Data analysis, machine learning, and statistics',
        icon: 'chart-bar',
        color: '#EF4444',
        displayOrder: 5,
        metadata: {
          industryRelevance: ['Technology', 'Finance', 'Research', 'Healthcare'],
        },
      },
      {
        name: 'Design & Creative',
        description: 'Design tools and creative software',
        icon: 'palette',
        color: '#EC4899',
        displayOrder: 6,
        metadata: {
          industryRelevance: ['Design', 'Marketing', 'Media', 'Gaming'],
        },
      },
      {
        name: 'Project Management',
        description: 'Project management methodologies and tools',
        icon: 'clipboard-list',
        color: '#6B7280',
        displayOrder: 7,
        metadata: {
          industryRelevance: ['Management', 'Consulting', 'Technology', 'Construction'],
        },
      },
      {
        name: 'Communication & Languages',
        description: 'Language skills and communication tools',
        icon: 'chat',
        color: '#14B8A6',
        displayOrder: 8,
        metadata: {
          industryRelevance: ['International Business', 'Customer Service', 'Education'],
        },
      },
      {
        name: 'Business & Finance',
        description: 'Business analysis and financial tools',
        icon: 'briefcase',
        color: '#059669',
        displayOrder: 9,
        metadata: {
          industryRelevance: ['Finance', 'Consulting', 'Business Development'],
        },
      },
      {
        name: 'Soft Skills',
        description: 'Interpersonal and professional skills',
        icon: 'users',
        color: '#7C3AED',
        displayOrder: 10,
        metadata: {
          industryRelevance: ['All Industries'],
        },
      },
    ];
  }
}
