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
import { ResumeTemplate } from './resume-template.entity';
import { ResumeSection } from './resume-section.entity';

export enum ResumeVisibility {
  PRIVATE = 'private',
  PUBLIC = 'public',
  ORG_ONLY = 'org_only',
  LINK_ONLY = 'link_only',
}

@Entity('user_resumes')
@Index(['userId', 'isPrimary'])
@Index(['visibility', 'createdAt'])
@Index(['templateId'])
export class UserResume {
  @ApiProperty({ description: 'User resume ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'User ID' })
  @Column({ name: 'user_id' })
  userId: string;

  @ApiProperty({ description: 'Template ID' })
  @Column({ name: 'template_id', nullable: true })
  templateId?: string;

  @ApiProperty({ description: 'Resume title' })
  @Column({ length: 255 })
  title: string;

  @ApiProperty({ description: 'Whether this is the primary resume' })
  @Column({ name: 'is_primary', default: false })
  isPrimary: boolean;

  @ApiProperty({ enum: ResumeVisibility, description: 'Resume visibility' })
  @Column({
    type: 'enum',
    enum: ResumeVisibility,
    default: ResumeVisibility.PRIVATE,
  })
  visibility: ResumeVisibility;

  @ApiProperty({ description: 'Resume data structure' })
  @Column({ type: 'jsonb' })
  data: {
    personalInfo: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
      website?: string;
      linkedin?: string;
      github?: string;
      portfolio?: string;
      profileImage?: string;
    };
    summary?: string;
    experience: Array<{
      id: string;
      company: string;
      position: string;
      startDate: string;
      endDate?: string;
      current: boolean;
      location?: string;
      description: string;
      achievements?: string[];
      technologies?: string[];
    }>;
    education: Array<{
      id: string;
      institution: string;
      degree: string;
      field: string;
      startDate: string;
      endDate?: string;
      current: boolean;
      gpa?: number;
      honors?: string[];
      coursework?: string[];
    }>;
    skills: Array<{
      id: string;
      name: string;
      category: string;
      level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
      yearsExperience?: number;
      verified?: boolean;
    }>;
    projects: Array<{
      id: string;
      name: string;
      description: string;
      startDate: string;
      endDate?: string;
      url?: string;
      repository?: string;
      technologies: string[];
      achievements?: string[];
    }>;
    certifications: Array<{
      id: string;
      name: string;
      issuer: string;
      issueDate: string;
      expiryDate?: string;
      credentialId?: string;
      url?: string;
    }>;
    languages: Array<{
      id: string;
      name: string;
      proficiency: 'basic' | 'conversational' | 'fluent' | 'native';
    }>;
    hobbies?: string[];
    references: Array<{
      id: string;
      name: string;
      position: string;
      company: string;
      email: string;
      phone?: string;
      relationship: string;
    }>;
    customSections?: Array<{
      id: string;
      title: string;
      content: string;
      type: 'text' | 'list' | 'table';
    }>;
  };

  @ApiProperty({ description: 'Generated PDF URL' })
  @Column({ name: 'pdf_url', nullable: true })
  pdfUrl?: string;

  @ApiProperty({ description: 'Last PDF generation timestamp' })
  @Column({ name: 'last_generated_at', type: 'timestamp', nullable: true })
  lastGeneratedAt?: Date;

  @ApiProperty({ description: 'Resume view count' })
  @Column({ name: 'view_count', default: 0 })
  viewCount: number;

  @ApiProperty({ description: 'Resume download count' })
  @Column({ name: 'download_count', default: 0 })
  downloadCount: number;

  @ApiProperty({ description: 'Resume share count' })
  @Column({ name: 'share_count', default: 0 })
  shareCount: number;

  @ApiProperty({ description: 'Resume analytics data' })
  @Column({ type: 'jsonb', default: {} })
  analytics: {
    viewsByDate?: Record<string, number>;
    downloadsByDate?: Record<string, number>;
    sharesByDate?: Record<string, number>;
    viewerLocations?: Record<string, number>;
    referrers?: Record<string, number>;
    deviceTypes?: Record<string, number>;
  };

  @ApiProperty({ description: 'Resume customization settings' })
  @Column({ type: 'jsonb', default: {} })
  customization: {
    theme?: {
      primaryColor?: string;
      secondaryColor?: string;
      accentColor?: string;
      fontFamily?: string;
      fontSize?: number;
    };
    layout?: {
      margins?: Record<string, number>;
      spacing?: number;
      sectionOrder?: string[];
    };
    visibility?: {
      showProfileImage?: boolean;
      showReferences?: boolean;
      showHobbies?: boolean;
    };
  };

  @ApiProperty({ description: 'Resume metadata' })
  @Column({ type: 'jsonb', default: {} })
  metadata: {
    version?: string;
    lastEditedSection?: string;
    autoSaveEnabled?: boolean;
    completionPercentage?: number;
    atsScore?: number;
    keywords?: string[];
    targetJobTitles?: string[];
    clonedFrom?: string;
    clonedAt?: Date;
  };

  @ApiProperty({ description: 'Public sharing token' })
  @Column({ name: 'share_token', nullable: true })
  shareToken?: string;

  @ApiProperty({ description: 'Share token expiry date' })
  @Column({ name: 'share_expires_at', type: 'timestamp', nullable: true })
  shareExpiresAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, user => user.resumes)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => ResumeTemplate, template => template.userResumes, { nullable: true })
  @JoinColumn({ name: 'template_id' })
  template?: ResumeTemplate;

  @OneToMany(() => ResumeSection, section => section.resume)
  sections: ResumeSection[];

  // Virtual properties
  get isPubliclyAccessible(): boolean | any {
    return this.visibility === ResumeVisibility.PUBLIC || 
           (this.visibility === ResumeVisibility.LINK_ONLY && this.shareToken);
  }

  get isShareLinkValid(): boolean {
    return this.shareToken && (!this.shareExpiresAt || this.shareExpiresAt > new Date());
  }

  get completionPercentage(): number {
    if (this.metadata.completionPercentage) {
      return this.metadata.completionPercentage;
    }
    return this.calculateCompletionPercentage();
  }

  get estimatedAtsScore(): number {
    if (this.metadata.atsScore) {
      return this.metadata.atsScore;
    }
    return this.calculateAtsScore();
  }

  // Methods
  incrementView(): void {
    this.viewCount += 1;
    this.updateAnalytics('view');
  }

  incrementDownload(): void {
    this.downloadCount += 1;
    this.updateAnalytics('download');
  }

  incrementShare(): void {
    this.shareCount += 1;
    this.updateAnalytics('share');
  }

  private updateAnalytics(type: 'view' | 'download' | 'share'): void {
    const today = new Date().toISOString().split('T')[0];
    const analyticsKey = `${type}sByDate`;
    
    if (!this.analytics[analyticsKey]) {
      this.analytics[analyticsKey] = {};
    }
    
    this.analytics[analyticsKey][today] = (this.analytics[analyticsKey][today] || 0) + 1;
  }

  generateShareToken(expiryDays?: number): string {
    this.shareToken = `resume_${this.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (expiryDays) {
      this.shareExpiresAt = new Date();
      this.shareExpiresAt.setDate(this.shareExpiresAt.getDate() + expiryDays);
    }
    
    return this.shareToken;
  }

  revokeShareToken(): void {
    this.shareToken = null;
    this.shareExpiresAt = null;
  }

  makePrimary(): void {
    this.isPrimary = true;
  }

  updateCustomization(customization: Partial<UserResume['customization']>): void {
    this.customization = { ...this.customization, ...customization };
  }

  updateMetadata(metadata: Partial<UserResume['metadata']>): void {
    this.metadata = { ...this.metadata, ...metadata };
  }

  addSkill(skill: UserResume['data']['skills'][0]): void {
    if (!this.data.skills.find(s => s.name.toLowerCase() === skill.name.toLowerCase())) {
      this.data.skills.push(skill);
      this.updateCompletionPercentage();
    }
  }

  removeSkill(skillId: string): void {
    this.data.skills = this.data.skills.filter(s => s.id !== skillId);
    this.updateCompletionPercentage();
  }

  addExperience(experience: UserResume['data']['experience'][0]): void {
    this.data.experience.push(experience);
    this.updateCompletionPercentage();
  }

  updateExperience(experienceId: string, updates: Partial<UserResume['data']['experience'][0]>): void {
    const index = this.data.experience.findIndex(e => e.id === experienceId);
    if (index !== -1) {
      this.data.experience[index] = { ...this.data.experience[index], ...updates };
      this.updateCompletionPercentage();
    }
  }

  removeExperience(experienceId: string): void {
    this.data.experience = this.data.experience.filter(e => e.id !== experienceId);
    this.updateCompletionPercentage();
  }

  addEducation(education: UserResume['data']['education'][0]): void {
    this.data.education.push(education);
    this.updateCompletionPercentage();
  }

  addProject(project: UserResume['data']['projects'][0]): void {
    this.data.projects.push(project);
    this.updateCompletionPercentage();
  }

  addCertification(certification: UserResume['data']['certifications'][0]): void {
    this.data.certifications.push(certification);
    this.updateCompletionPercentage();
  }

  private calculateCompletionPercentage(): number {
    let score = 0;
    const maxScore = 100;

    // Personal info (20 points)
    if (this.data.personalInfo.firstName && this.data.personalInfo.lastName) score += 10;
    if (this.data.personalInfo.email) score += 5;
    if (this.data.personalInfo.phone) score += 5;

    // Summary (10 points)
    if (this.data.summary && this.data.summary.length > 50) score += 10;

    // Experience (25 points)
    if (this.data.experience.length > 0) score += 15;
    if (this.data.experience.length > 2) score += 10;

    // Education (15 points)
    if (this.data.education.length > 0) score += 15;

    // Skills (15 points)
    if (this.data.skills.length > 0) score += 10;
    if (this.data.skills.length > 5) score += 5;

    // Projects (10 points)
    if (this.data.projects.length > 0) score += 10;

    // Certifications (5 points)
    if (this.data.certifications.length > 0) score += 5;

    return Math.min(score, maxScore);
  }

  private calculateAtsScore(): number {
    let score = 100;

    // Deduct for missing essential sections
    if (!this.data.personalInfo.firstName || !this.data.personalInfo.lastName) score -= 20;
    if (!this.data.personalInfo.email) score -= 15;
    if (!this.data.summary || this.data.summary.length < 50) score -= 10;
    if (this.data.experience.length === 0) score -= 25;
    if (this.data.education.length === 0) score -= 15;
    if (this.data.skills.length === 0) score -= 15;

    // Add points for good practices
    if (this.data.skills.length > 10) score += 5;
    if (this.data.experience.some(e => e.achievements && e.achievements.length > 0)) score += 5;
    if (this.data.projects.length > 0) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  updateCompletionPercentage(): void {
    this.metadata.completionPercentage = this.calculateCompletionPercentage();
  }

  updateAtsScore(): void {
    this.metadata.atsScore = this.calculateAtsScore();
  }

  clone(newTitle: string): Partial<UserResume> {
    return {
      userId: this.userId,
      templateId: this.templateId,
      title: newTitle,
      isPrimary: false,
      visibility: ResumeVisibility.PRIVATE,
      data: JSON.parse(JSON.stringify(this.data)),
      customization: JSON.parse(JSON.stringify(this.customization)),
      metadata: {
        ...this.metadata,
        clonedFrom: this.id,
        clonedAt: new Date(),
      },
    };
  }

  exportForATS(): Record<string, any> {
    return {
      personalInfo: this.data.personalInfo,
      summary: this.data.summary,
      experience: this.data.experience.map(exp => ({
        company: exp.company,
        position: exp.position,
        startDate: exp.startDate,
        endDate: exp.endDate,
        description: exp.description,
        achievements: exp.achievements,
      })),
      education: this.data.education.map(edu => ({
        institution: edu.institution,
        degree: edu.degree,
        field: edu.field,
        startDate: edu.startDate,
        endDate: edu.endDate,
      })),
      skills: this.data.skills.map(skill => ({
        name: skill.name,
        category: skill.category,
        level: skill.level,
      })),
      certifications: this.data.certifications,
    };
  }

  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate personal info
    if (!this.data.personalInfo.firstName) {
      errors.push('First name is required');
    }
    if (!this.data.personalInfo.lastName) {
      errors.push('Last name is required');
    }
    if (!this.data.personalInfo.email) {
      errors.push('Email is required');
    }

    // Validate email format
    if (this.data.personalInfo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.data.personalInfo.email)) {
      errors.push('Invalid email format');
    }

    // Validate experience dates
    this.data.experience.forEach((exp, index) => {
      if (exp.startDate && exp.endDate && new Date(exp.startDate) > new Date(exp.endDate)) {
        errors.push(`Experience ${index + 1}: Start date cannot be after end date`);
      }
    });

    // Validate education dates
    this.data.education.forEach((edu, index) => {
      if (edu.startDate && edu.endDate && new Date(edu.startDate) > new Date(edu.endDate)) {
        errors.push(`Education ${index + 1}: Start date cannot be after end date`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
