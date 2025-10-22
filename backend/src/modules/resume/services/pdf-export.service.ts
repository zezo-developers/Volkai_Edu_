import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { UserResume } from '../../../database/entities/user-resume.entity';
import { ResumeTemplate } from '../../../database/entities/resume-template.entity';
import { User } from '../../../database/entities/user.entity';
import {
  ExportResumeDto,
  PdfOptionsDto,
  ExportResponseDto,
  ResumePreviewDto,
} from '../dto/pdf-export.dto';

export interface PdfGenerationOptions {
  format: 'A4' | 'Letter';
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  fontSize: {
    heading: number;
    subheading: number;
    body: number;
    small: number;
  };
  colors: {
    primary: string;
    secondary: string;
    text: string;
    accent: string;
  };
  fonts: {
    primary: string;
    secondary: string;
  };
  atsOptimized: boolean;
  includePhoto: boolean;
  watermark?: string;
}

@Injectable()
export class PdfExportService {
  private readonly logger = new Logger(PdfExportService.name);
  private readonly uploadsPath: string;
  private readonly baseUrl: string;

  constructor(
    @InjectRepository(UserResume)
    private resumeRepository: Repository<UserResume>,
    @InjectRepository(ResumeTemplate)
    private templateRepository: Repository<ResumeTemplate>,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    this.uploadsPath = this.configService.get('UPLOADS_PATH', './uploads/resumes');
    this.baseUrl = this.configService.get('BASE_URL', 'http://localhost:3000');
    
    // Ensure uploads directory exists
    if (!fs.existsSync(this.uploadsPath)) {
      fs.mkdirSync(this.uploadsPath, { recursive: true });
    }
  }

  async exportResumeToPdf(
    resumeId: string,
    exportDto: ExportResumeDto,
    user: User,
  ): Promise<ExportResponseDto> {
    try {
      // Get resume with all related data
      const resume = await this.resumeRepository.findOne({
        where: { id: resumeId },
        relations: ['user', 'template', 'sections'],
      });

      if (!resume) {
        throw new NotFoundException('Resume not found');
      }

      // Check permissions
      if (resume.userId !== user.id && user.roles!== 'admin') {
        throw new NotFoundException('Resume not found');
      }

      // Merge export options with defaults
      const options = this.mergeWithDefaults(exportDto.options, resume.template);

      // Generate PDF
      const pdfBuffer = await this.generatePdfBuffer(resume, options);

      // Save PDF file
      const filename = this.generateFilename(resume, exportDto.format);
      const filepath = path.join(this.uploadsPath, filename);
      
      fs.writeFileSync(filepath, pdfBuffer);

      // Update resume with PDF URL
      const pdfUrl = `${this.baseUrl}/api/resume/download/${filename}`;
      resume.pdfUrl = pdfUrl;
      resume.lastGeneratedAt = new Date();
      await this.resumeRepository.save(resume);

      // Increment download count
      resume.incrementDownload();
      await this.resumeRepository.save(resume);

      // Emit event
      this.eventEmitter.emit('resume.pdf.generated', {
        resume,
        filename,
        options,
        user,
      });

      this.logger.log(`PDF generated for resume ${resumeId}: ${filename}`);

      return new ExportResponseDto({
        success: true,
        filename,
        downloadUrl: pdfUrl,
        fileSize: pdfBuffer.length,
        format: exportDto.format,
        generatedAt: new Date(),
      });
    } catch (error) {
      this.logger.error(`Failed to export resume ${resumeId} to PDF`, error);
      throw error;
    }
  }

  async generateResumePreview(
    resumeId: string,
    user: User,
  ): Promise<ResumePreviewDto> {
    try {
      const resume = await this.resumeRepository.findOne({
        where: { id: resumeId },
        relations: ['user', 'template', 'sections'],
      });

      if (!resume) {
        throw new NotFoundException('Resume not found');
      }

      // Check permissions
      if (resume.userId !== user.id && user.roles!== 'admin') {
        throw new NotFoundException('Resume not found');
      }

      // Generate preview data
      const previewData = await this.generatePreviewData(resume);

      return new ResumePreviewDto(previewData);
    } catch (error) {
      this.logger.error(`Failed to generate preview for resume ${resumeId}`, error);
      throw error;
    }
  }

  async downloadResumePdf(filename: string): Promise<Buffer> {
    try {
      const filepath = path.join(this.uploadsPath, filename);
      
      if (!fs.existsSync(filepath)) {
        throw new NotFoundException('File not found');
      }

      return fs.readFileSync(filepath);
    } catch (error) {
      this.logger.error(`Failed to download PDF ${filename}`, error);
      throw error;
    }
  }

  async generateATSOptimizedPdf(
    resumeId: string,
    user: User,
  ): Promise<ExportResponseDto> {
    try {
      const exportDto: ExportResumeDto = {
        format: 'pdf',
        options: {
          atsOptimized: true,
          includePhoto: false,
          format: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
          colors: {
            primary: '#000000',
            secondary: '#333333',
            text: '#000000',
            accent: '#666666',
          },
        },
      };

      return await this.exportResumeToPdf(resumeId, exportDto, user);
    } catch (error) {
      this.logger.error(`Failed to generate ATS optimized PDF for resume ${resumeId}`, error);
      throw error;
    }
  }

  // Private methods for PDF generation
  private async generatePdfBuffer(
    resume: UserResume,
    options: PdfGenerationOptions,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: options.format,
          margins: options.margins,
          info: {
            Title: `${resume.data.personalInfo.firstName} ${resume.data.personalInfo.lastName} - Resume`,
            Author: `${resume.data.personalInfo.firstName} ${resume.data.personalInfo.lastName}`,
            Subject: 'Professional Resume',
            Creator: 'VolkaiEdu Resume Builder',
          },
        });

        const chunks: Buffer[] = [];
        
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Generate PDF content
        this.generatePdfContent(doc, resume, options);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private generatePdfContent(
    doc: any,
    resume: UserResume,
    options: PdfGenerationOptions,
  ): void {
    let yPosition = doc.page.margins.top;

    // Add watermark if specified
    if (options.watermark) {
      this.addWatermark(doc, options.watermark);
    }

    // Header section with personal info
    yPosition = this.addPersonalInfoSection(doc, resume, options, yPosition);

    // Professional summary
    if (resume.data.summary) {
      yPosition = this.addSummarySection(doc, resume, options, yPosition);
    }

    // Experience section
    if (resume.data.experience.length > 0) {
      yPosition = this.addExperienceSection(doc, resume, options, yPosition);
    }

    // Education section
    if (resume.data.education.length > 0) {
      yPosition = this.addEducationSection(doc, resume, options, yPosition);
    }

    // Skills section
    if (resume.data.skills.length > 0) {
      yPosition = this.addSkillsSection(doc, resume, options, yPosition);
    }

    // Projects section
    if (resume.data.projects.length > 0) {
      yPosition = this.addProjectsSection(doc, resume, options, yPosition);
    }

    // Certifications section
    if (resume.data.certifications.length > 0) {
      yPosition = this.addCertificationsSection(doc, resume, options, yPosition);
    }

    // Languages section
    if (resume.data.languages.length > 0) {
      yPosition = this.addLanguagesSection(doc, resume, options, yPosition);
    }

    // References section (if not ATS optimized)
    if (!options.atsOptimized && resume.data.references.length > 0) {
      yPosition = this.addReferencesSection(doc, resume, options, yPosition);
    }
  }

  private addPersonalInfoSection(
    doc: any,
    resume: UserResume,
    options: PdfGenerationOptions,
    yPosition: number,
  ): number {
    const { personalInfo } = resume.data;
    
    // Name
    doc.fontSize(options.fontSize.heading)
       .fillColor(options.colors.primary)
       .text(`${personalInfo.firstName} ${personalInfo.lastName}`, {
         align: 'center',
       });

    yPosition += 40;

    // Contact information
    const contactInfo = [
      personalInfo.email,
      personalInfo.phone,
      personalInfo.address && `${personalInfo.address}, ${personalInfo.city}, ${personalInfo.state} ${personalInfo.zipCode}`,
      personalInfo.linkedin,
      personalInfo.website,
    ].filter(Boolean);

    doc.fontSize(options.fontSize.body)
       .fillColor(options.colors.text)
       .text(contactInfo.join(' | '), {
         align: 'center',
       });

    return yPosition + 30;
  }

  private addSummarySection(
    doc: any,
    resume: UserResume,
    options: PdfGenerationOptions,
    yPosition: number,
  ): number {
    yPosition = this.addSectionHeader(doc, 'Professional Summary', options, yPosition);
    
    doc.fontSize(options.fontSize.body)
       .fillColor(options.colors.text)
       .text(resume.data.summary, {
         align: 'justify',
       });

    return yPosition + 30;
  }

  private addExperienceSection(
    doc: any,
    resume: UserResume,
    options: PdfGenerationOptions,
    yPosition: number,
  ): number {
    yPosition = this.addSectionHeader(doc, 'Work Experience', options, yPosition);

    for (const experience of resume.data.experience) {
      // Check if we need a new page
      if (yPosition > doc.page.height - 150) {
        doc.addPage();
        yPosition = doc.page.margins.top;
      }

      // Job title and company
      doc.fontSize(options.fontSize.subheading)
         .fillColor(options.colors.primary)
         .text(`${experience.position} at ${experience.company}`, {
           continued: false,
         });

      yPosition += 20;

      // Date range
      const dateRange = experience.current 
        ? `${experience.startDate} - Present`
        : `${experience.startDate} - ${experience.endDate}`;

      doc.fontSize(options.fontSize.small)
         .fillColor(options.colors.secondary)
         .text(dateRange);

      yPosition += 15;

      // Description
      doc.fontSize(options.fontSize.body)
         .fillColor(options.colors.text)
         .text(experience.description, {
           align: 'justify',
         });

      yPosition += 20;

      // Achievements
      if (experience.achievements && experience.achievements.length > 0) {
        for (const achievement of experience.achievements) {
          doc.text(`• ${achievement}`, {
            indent: 20,
          });
          yPosition += 15;
        }
      }

      yPosition += 15;
    }

    return yPosition;
  }

  private addEducationSection(
    doc: any,
    resume: UserResume,
    options: PdfGenerationOptions,
    yPosition: number,
  ): number {
    yPosition = this.addSectionHeader(doc, 'Education', options, yPosition);

    for (const education of resume.data.education) {
      // Degree and institution
      doc.fontSize(options.fontSize.subheading)
         .fillColor(options.colors.primary)
         .text(`${education.degree} in ${education.field}`);

      yPosition += 20;

      // Institution and date
      const dateRange = education.current 
        ? `${education.startDate} - Present`
        : `${education.startDate} - ${education.endDate}`;

      doc.fontSize(options.fontSize.body)
         .fillColor(options.colors.text)
         .text(`${education.institution} | ${dateRange}`);

      yPosition += 15;

      // GPA if available
      if (education.gpa) {
        doc.fontSize(options.fontSize.small)
           .fillColor(options.colors.secondary)
           .text(`GPA: ${education.gpa}`);
        yPosition += 15;
      }

      yPosition += 10;
    }

    return yPosition;
  }

  private addSkillsSection(
    doc: any,
    resume: UserResume,
    options: PdfGenerationOptions,
    yPosition: number,
  ): number {
    yPosition = this.addSectionHeader(doc, 'Skills', options, yPosition);

    // Group skills by category
    const skillsByCategory = resume.data.skills.reduce((acc, skill) => {
      if (!acc[skill.category]) {
        acc[skill.category] = [];
      }
      acc[skill.category].push(skill.name);
      return acc;
    }, {} as Record<string, string[]>);

    for (const [category, skills] of Object.entries(skillsByCategory)) {
      doc.fontSize(options.fontSize.subheading)
         .fillColor(options.colors.primary)
         .text(`${category}:`);

      yPosition += 20;

      doc.fontSize(options.fontSize.body)
         .fillColor(options.colors.text)
         .text(skills.join(', '), {
           indent: 20,
         });

      yPosition += 25;
    }

    return yPosition;
  }

  private addProjectsSection(
    doc: any,
    resume: UserResume,
    options: PdfGenerationOptions,
    yPosition: number,
  ): number {
    yPosition = this.addSectionHeader(doc, 'Projects', options, yPosition);

    for (const project of resume.data.projects) {
      // Project name
      doc.fontSize(options.fontSize.subheading)
         .fillColor(options.colors.primary)
         .text(project.name);

      yPosition += 20;

      // Date range
      const dateRange = project.endDate 
        ? `${project.startDate} - ${project.endDate}`
        : project.startDate;

      doc.fontSize(options.fontSize.small)
         .fillColor(options.colors.secondary)
         .text(dateRange);

      yPosition += 15;

      // Description
      doc.fontSize(options.fontSize.body)
         .fillColor(options.colors.text)
         .text(project.description);

      yPosition += 15;

      // Technologies
      if (project.technologies.length > 0) {
        doc.fontSize(options.fontSize.small)
           .fillColor(options.colors.secondary)
           .text(`Technologies: ${project.technologies.join(', ')}`);
        yPosition += 15;
      }

      yPosition += 10;
    }

    return yPosition;
  }

  private addCertificationsSection(
    doc: any,
    resume: UserResume,
    options: PdfGenerationOptions,
    yPosition: number,
  ): number {
    yPosition = this.addSectionHeader(doc, 'Certifications', options, yPosition);

    for (const cert of resume.data.certifications) {
      doc.fontSize(options.fontSize.body)
         .fillColor(options.colors.text)
         .text(`${cert.name} - ${cert.issuer} (${cert.issueDate})`);

      yPosition += 18;
    }

    return yPosition;
  }

  private addLanguagesSection(
    doc: any,
    resume: UserResume,
    options: PdfGenerationOptions,
    yPosition: number,
  ): number {
    yPosition = this.addSectionHeader(doc, 'Languages', options, yPosition);

    const languageList = resume.data.languages
      .map(lang => `${lang.name} (${lang.proficiency})`)
      .join(', ');

    doc.fontSize(options.fontSize.body)
       .fillColor(options.colors.text)
       .text(languageList);

    return yPosition + 25;
  }

  private addReferencesSection(
    doc: any,
    resume: UserResume,
    options: PdfGenerationOptions,
    yPosition: number,
  ): number {
    yPosition = this.addSectionHeader(doc, 'References', options, yPosition);

    if (resume.data.references.length === 0) {
      doc.fontSize(options.fontSize.body)
         .fillColor(options.colors.text)
         .text('Available upon request');
      return yPosition + 20;
    }

    for (const reference of resume.data.references) {
      doc.fontSize(options.fontSize.subheading)
         .fillColor(options.colors.primary)
         .text(reference.name);

      yPosition += 20;

      doc.fontSize(options.fontSize.body)
         .fillColor(options.colors.text)
         .text(`${reference.position} at ${reference.company}`)
         .text(`${reference.email} | ${reference.phone}`);

      yPosition += 30;
    }

    return yPosition;
  }

  private addSectionHeader(
    doc: any,
    title: string,
    options: PdfGenerationOptions,
    yPosition: number,
  ): number {
    doc.fontSize(options.fontSize.heading)
       .fillColor(options.colors.primary)
       .text(title);

    // Add underline
    doc.moveTo(doc.page.margins.left, yPosition + 25)
       .lineTo(doc.page.width - doc.page.margins.right, yPosition + 25)
       .strokeColor(options.colors.accent)
       .stroke();

    return yPosition + 40;
  }

  private addWatermark(doc:any, watermark: string): void {
    doc.fontSize(60)
       .fillColor('#F0F0F0')
       .text(watermark, {
         align: 'center',
         valign: 'center',
         rotate: 45,
       });
  }

  private mergeWithDefaults(
    options?: Partial<PdfGenerationOptions>,
    template?: ResumeTemplate,
  ): PdfGenerationOptions {
    const defaults: PdfGenerationOptions = {
      format: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      fontSize: {
        heading: 16,
        subheading: 12,
        body: 10,
        small: 9,
      },
      colors: {
        primary: '#2563EB',
        secondary: '#64748B',
        text: '#1F2937',
        accent: '#E5E7EB',
      },
      fonts: {
        primary: 'Helvetica',
        secondary: 'Helvetica',
      },
      atsOptimized: false,
      includePhoto: false,
    };

    // Apply template styles if available
    if (template?.templateData?.styles) {
      const templateStyles = template.templateData.styles;
      defaults.colors = { ...defaults.colors, ...templateStyles.colors };
      if (templateStyles.fonts?.primary) {
        defaults.fonts.primary = templateStyles.fonts.primary;
      }
    }

    return { ...defaults, ...options };
  }

  private generateFilename(resume: UserResume, format: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const name = `${resume.data.personalInfo.firstName}_${resume.data.personalInfo.lastName}`;
    return `${name}_Resume_${timestamp}.${format}`;
  }

  private async generatePreviewData(resume: UserResume): Promise<any> {
    return {
      id: resume.id,
      title: resume.title,
      personalInfo: resume.data.personalInfo,
      sections: resume.sections?.map(section => ({
        type: section.type,
        title: section.getDisplayTitle(),
        isVisible: section.isVisible,
        orderIndex: section.orderIndex,
      })) || [],
      completionPercentage: resume.completionPercentage,
      atsScore: resume.estimatedAtsScore,
      lastUpdated: resume.updatedAt,
      template: resume.template ? {
        id: resume.template.id,
        name: resume.template.name,
        category: resume.template.category,
        previewImageUrl: resume.template.previewImageUrl,
      } : null,
    };
  }
}
