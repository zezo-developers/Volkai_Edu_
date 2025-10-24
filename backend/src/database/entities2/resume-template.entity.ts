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
import { User } from '../entities/user.entity';
import { UserResume } from './user-resume.entity';

export enum TemplateCategory {
  MODERN = 'modern',
  CLASSIC = 'classic',
  CREATIVE = 'creative',
  MINIMAL = 'minimal',
  PROFESSIONAL = 'professional',
  ACADEMIC = 'academic',
}

@Entity('resume_templates')
@Index(['category', 'isActive'])
@Index(['isPremium', 'rating'])
@Index(['downloadCount'])
export class ResumeTemplate {
  @ApiProperty({ description: 'Resume template ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Template name' })
  @Column({ length: 255 })
  name: string;

  @ApiProperty({ description: 'Template description' })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ enum: TemplateCategory, description: 'Template category' })
  @Column({
    type: 'enum',
    enum: TemplateCategory,
    nullable: true,
  })
  category?: TemplateCategory;

  @ApiProperty({ description: 'Preview image URL' })
  @Column({ name: 'preview_image_url', nullable: true })
  previewImageUrl?: string;

  @ApiProperty({ description: 'Template data structure' })
  @Column({ name: 'template_data', type: 'jsonb' })
  templateData: {
    layout: {
      type: 'single-column' | 'two-column' | 'three-column';
      sections: Array<{
        id: string;
        type: string;
        position: { x: number; y: number; width: number; height: number };
        style: Record<string, any>;
      }>;
    };
    styles: {
      fonts: {
        primary: string;
        secondary: string;
        sizes: Record<string, number>;
      };
      colors: {
        primary: string;
        secondary: string;
        accent: string;
        text: string;
        background: string;
      };
      spacing: {
        margins: Record<string, number>;
        padding: Record<string, number>;
      };
    };
    components: Record<string, {
      template: string;
      styles: Record<string, any>;
      validation?: Record<string, any>;
    }>;
    metadata: {
      version: string;
      compatibility: string[];
      features: string[];
    };
  };

  @ApiProperty({ description: 'Whether template is premium' })
  @Column({ name: 'is_premium', default: false })
  isPremium: boolean;

  @ApiProperty({ description: 'Whether template is active' })
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Number of downloads' })
  @Column({ name: 'download_count', default: 0 })
  downloadCount: number;

  @ApiProperty({ description: 'Template rating (0-5)' })
  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @ApiProperty({ description: 'Number of ratings' })
  @Column({ name: 'rating_count', default: 0 })
  ratingCount: number;

  @ApiProperty({ description: 'Template tags' })
  @Column({ type: 'simple-array', default: [] })
  tags: string[];

  @ApiProperty({ description: 'Template features' })
  @Column({ type: 'simple-array', default: [] })
  features: string[];

  @ApiProperty({ description: 'Template difficulty level' })
  @Column({ name: 'difficulty_level', default: 'beginner' })
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';

  @ApiProperty({ description: 'Estimated completion time in minutes' })
  @Column({ name: 'completion_time', nullable: true })
  completionTime?: number;

  @ApiProperty({ description: 'Template customization options' })
  @Column({ name: 'customization_options', type: 'jsonb', default: {} })
  customizationOptions: {
    colors: boolean;
    fonts: boolean;
    layout: boolean;
    sections: boolean;
    spacing: boolean;
  };

  @ApiProperty({ description: 'ATS compatibility score' })
  @Column({ name: 'ats_score', nullable: true })
  atsScore?: number;

  @ApiProperty({ description: 'Template creator user ID' })
  @Column({ name: 'created_by' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @OneToMany(() => UserResume, resume => resume.template)
  userResumes: UserResume[];

  // Virtual properties
  get isPopular(): boolean {
    return this.downloadCount > 100 && this.rating > 4.0;
  }

  get isTrending(): boolean {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    return this.updatedAt > lastMonth && this.downloadCount > 50;
  }

  get averageRating(): number {
    return this.ratingCount > 0 ? this.rating : 0;
  }

  // Methods
  incrementDownload(): void {
    this.downloadCount += 1;
  }

  addRating(rating: number): void {
    const totalRating = this.rating * this.ratingCount;
    this.ratingCount += 1;
    this.rating = (totalRating + rating) / this.ratingCount;
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

  addFeature(feature: string): void {
    if (!this.features.includes(feature)) {
      this.features.push(feature);
    }
  }

  updateCustomizationOptions(options: Partial<ResumeTemplate['customizationOptions']>): void {
    this.customizationOptions = { ...this.customizationOptions, ...options };
  }

  validateTemplateData(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate layout
    if (!this.templateData.layout) {
      errors.push('Template layout is required');
    } else {
      if (!this.templateData.layout.type) {
        errors.push('Layout type is required');
      }
      if (!this.templateData.layout.sections || this.templateData.layout.sections.length === 0) {
        errors.push('At least one section is required');
      }
    }

    // Validate styles
    if (!this.templateData.styles) {
      errors.push('Template styles are required');
    } else {
      if (!this.templateData.styles.fonts?.primary) {
        errors.push('Primary font is required');
      }
      if (!this.templateData.styles.colors?.primary) {
        errors.push('Primary color is required');
      }
    }

    // Validate components
    if (!this.templateData.components) {
      errors.push('Template components are required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  clone(newName: string, createdBy: string): Partial<ResumeTemplate> {
    return {
      name: newName,
      description: this.description,
      category: this.category,
      templateData: JSON.parse(JSON.stringify(this.templateData)),
      isPremium: false,
      tags: [...this.tags],
      features: [...this.features],
      difficultyLevel: this.difficultyLevel,
      completionTime: this.completionTime,
      customizationOptions: { ...this.customizationOptions },
      createdBy,
    };
  }

  generatePreview(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      category: this.category,
      previewImageUrl: this.previewImageUrl,
      isPremium: this.isPremium,
      rating: this.rating,
      downloadCount: this.downloadCount,
      tags: this.tags,
      features: this.features,
      difficultyLevel: this.difficultyLevel,
      atsScore: this.atsScore,
      customizationOptions: this.customizationOptions,
    };
  }

  getCompatibilityInfo(): Record<string, any> {
    return {
      atsScore: this.atsScore,
      compatibility: this.templateData.metadata?.compatibility || [],
      features: this.templateData.metadata?.features || [],
      version: this.templateData.metadata?.version || '1.0.0',
    };
  }

  calculateAtsScore(): number {
    let score = 100;

    // Deduct points for complex layouts
    if (this.templateData.layout.type === 'three-column') {
      score -= 20;
    } else if (this.templateData.layout.type === 'two-column') {
      score -= 10;
    }

    // Deduct points for creative elements
    if (this.category === TemplateCategory.CREATIVE) {
      score -= 15;
    }

    // Add points for standard sections
    const standardSections = ['personal_info', 'summary', 'experience', 'education', 'skills'];
    const templateSections = this.templateData.layout.sections.map(s => s.type);
    const hasStandardSections = standardSections.filter(s => templateSections.includes(s)).length;
    score += (hasStandardSections / standardSections.length) * 20;

    return Math.max(0, Math.min(100, score));
  }

  updateAtsScore(): void {
    this.atsScore = this.calculateAtsScore();
  }
}
