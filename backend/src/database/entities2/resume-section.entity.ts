import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { UserResume } from './user-resume.entity';

export enum SectionType {
  PERSONAL_INFO = 'personal_info',
  SUMMARY = 'summary',
  EXPERIENCE = 'experience',
  EDUCATION = 'education',
  SKILLS = 'skills',
  PROJECTS = 'projects',
  CERTIFICATIONS = 'certifications',
  LANGUAGES = 'languages',
  HOBBIES = 'hobbies',
  REFERENCES = 'references',
  CUSTOM = 'custom',
}

@Entity('resume_sections')
@Index(['resumeId', 'orderIndex'])
@Index(['type', 'isVisible'])
export class ResumeSection {
  @ApiProperty({ description: 'Resume section ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Resume ID' })
  @Column({ name: 'resume_id' })
  resumeId: string;

  @ApiProperty({ enum: SectionType, description: 'Section type' })
  @Column({
    type: 'enum',
    enum: SectionType,
  })
  type: SectionType;

  @ApiProperty({ description: 'Section title' })
  @Column({ length: 255, nullable: true })
  title?: string;

  @ApiProperty({ description: 'Section content' })
  @Column({ type: 'jsonb' })
  content: Record<string, any>;

  @ApiProperty({ description: 'Section order index' })
  @Column({ name: 'order_index' })
  orderIndex: number;

  @ApiProperty({ description: 'Whether section is visible' })
  @Column({ name: 'is_visible', default: true })
  isVisible: boolean;

  @ApiProperty({ description: 'Section styling options' })
  @Column({ type: 'jsonb', default: {} })
  styling: {
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
    fontSize?: number;
    fontWeight?: string;
    margin?: Record<string, number>;
    padding?: Record<string, number>;
    alignment?: 'left' | 'center' | 'right' | 'justify';
  };

  @ApiProperty({ description: 'Section configuration' })
  @Column({ type: 'jsonb', default: {} })
  config: {
    showTitle?: boolean;
    showDivider?: boolean;
    collapsible?: boolean;
    maxItems?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    displayFormat?: 'list' | 'grid' | 'timeline' | 'table';
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => UserResume, resume => resume.sections)
  @JoinColumn({ name: 'resume_id' })
  resume: UserResume;

  // Methods
  updateContent(content: Record<string, any>): void {
    this.content = { ...this.content, ...content };
  }

  updateStyling(styling: Partial<ResumeSection['styling']>): void {
    this.styling = { ...this.styling, ...styling };
  }

  updateConfig(config: Partial<ResumeSection['config']>): void {
    this.config = { ...this.config, ...config };
  }

  toggleVisibility(): void {
    this.isVisible = !this.isVisible;
  }

  moveUp(): void {
    if (this.orderIndex > 0) {
      this.orderIndex -= 1;
    }
  }

  moveDown(): void {
    this.orderIndex += 1;
  }

  setOrder(newIndex: number): void {
    this.orderIndex = Math.max(0, newIndex);
  }

  getDisplayTitle(): string {
    if (this.title) {
      return this.title;
    }

    // Default titles for standard sections
    const defaultTitles: Record<SectionType, string> = {
      [SectionType.PERSONAL_INFO]: 'Personal Information',
      [SectionType.SUMMARY]: 'Professional Summary',
      [SectionType.EXPERIENCE]: 'Work Experience',
      [SectionType.EDUCATION]: 'Education',
      [SectionType.SKILLS]: 'Skills',
      [SectionType.PROJECTS]: 'Projects',
      [SectionType.CERTIFICATIONS]: 'Certifications',
      [SectionType.LANGUAGES]: 'Languages',
      [SectionType.HOBBIES]: 'Hobbies & Interests',
      [SectionType.REFERENCES]: 'References',
      [SectionType.CUSTOM]: 'Custom Section',
    };

    return defaultTitles[this.type] || 'Section';
  }

  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate based on section type
    switch (this.type) {
      case SectionType.PERSONAL_INFO:
        if (!this.content.firstName) errors.push('First name is required');
        if (!this.content.lastName) errors.push('Last name is required');
        if (!this.content.email) errors.push('Email is required');
        break;

      case SectionType.EXPERIENCE:
        if (Array.isArray(this.content.items)) {
          this.content.items.forEach((item: any, index: number) => {
            if (!item.company) errors.push(`Experience ${index + 1}: Company is required`);
            if (!item.position) errors.push(`Experience ${index + 1}: Position is required`);
            if (!item.startDate) errors.push(`Experience ${index + 1}: Start date is required`);
          });
        }
        break;

      case SectionType.EDUCATION:
        if (Array.isArray(this.content.items)) {
          this.content.items.forEach((item: any, index: number) => {
            if (!item.institution) errors.push(`Education ${index + 1}: Institution is required`);
            if (!item.degree) errors.push(`Education ${index + 1}: Degree is required`);
          });
        }
        break;

      case SectionType.SKILLS:
        if (Array.isArray(this.content.items)) {
          this.content.items.forEach((item: any, index: number) => {
            if (!item.name) errors.push(`Skill ${index + 1}: Name is required`);
          });
        }
        break;

      case SectionType.CUSTOM:
        if (!this.title) errors.push('Custom section title is required');
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  clone(): Partial<ResumeSection> {
    return {
      type: this.type,
      title: this.title,
      content: JSON.parse(JSON.stringify(this.content)),
      orderIndex: this.orderIndex,
      isVisible: this.isVisible,
      styling: JSON.parse(JSON.stringify(this.styling)),
      config: JSON.parse(JSON.stringify(this.config)),
    };
  }

  exportForPDF(): Record<string, any> {
    return {
      type: this.type,
      title: this.getDisplayTitle(),
      content: this.content,
      isVisible: this.isVisible,
      styling: this.styling,
      config: this.config,
      orderIndex: this.orderIndex,
    };
  }

  // Static helper methods
  static getDefaultContent(type: SectionType): Record<string, any> {
    switch (type) {
      case SectionType.PERSONAL_INFO:
        return {
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          country: '',
          website: '',
          linkedin: '',
          github: '',
        };

      case SectionType.SUMMARY:
        return {
          text: '',
        };

      case SectionType.EXPERIENCE:
        return {
          items: [],
        };

      case SectionType.EDUCATION:
        return {
          items: [],
        };

      case SectionType.SKILLS:
        return {
          items: [],
          categories: [],
        };

      case SectionType.PROJECTS:
        return {
          items: [],
        };

      case SectionType.CERTIFICATIONS:
        return {
          items: [],
        };

      case SectionType.LANGUAGES:
        return {
          items: [],
        };

      case SectionType.HOBBIES:
        return {
          items: [],
        };

      case SectionType.REFERENCES:
        return {
          items: [],
          showOnRequest: true,
        };

      case SectionType.CUSTOM:
        return {
          text: '',
          items: [],
        };

      default:
        return {};
    }
  }

  static getDefaultStyling(): ResumeSection['styling'] {
    return {
      fontSize: 12,
      fontWeight: 'normal',
      alignment: 'left',
      margin: { top: 10, bottom: 10, left: 0, right: 0 },
      padding: { top: 5, bottom: 5, left: 0, right: 0 },
    };
  }

  static getDefaultConfig(type: SectionType): ResumeSection['config'] {
    const baseConfig = {
      showTitle: true,
      showDivider: true,
      collapsible: false,
    };

    switch (type) {
      case SectionType.EXPERIENCE:
      case SectionType.EDUCATION:
      case SectionType.PROJECTS:
        return {
          ...baseConfig,
          displayFormat: 'timeline' as const,
          sortBy: 'startDate',
          sortOrder: 'desc' as const,
        };

      case SectionType.SKILLS:
        return {
          ...baseConfig,
          displayFormat: 'grid' as const,
          maxItems: 20,
        };

      case SectionType.CERTIFICATIONS:
        return {
          ...baseConfig,
          displayFormat: 'list' as const,
          sortBy: 'issueDate',
          sortOrder: 'desc' as const,
        };

      default:
        return baseConfig;
    }
  }
}
