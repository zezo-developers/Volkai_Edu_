import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { 
  Certificate, 
  CertificateStatus, 
  CertificateType 
} from '@database/entities/certificate.entity';
import { Enrollment } from '@database/entities/enrollment.entity';
import { Course } from '@database/entities/course.entity';
import { User } from '@/database/entities/user.entity';
import { Organization } from '@database/entities/organization.entity';
import { FileManagerService } from '@modules/files/services/file-manager.service';
import { AuthenticatedUser } from '@modules/auth/strategies/jwt.strategy';

/**
 * Certificate generation request interface
 */
export interface CertificateGenerationRequest {
  enrollmentId: string;
  type?: CertificateType;
  templateId?: string;
  customData?: Record<string, unknown>;
}

/**
 * Certificate verification result interface
 */
export interface CertificateVerificationResult {
  isValid: boolean;
  certificate?: Certificate;
  errors?: string[];
  verificationData?: {
    issueDate: Date;
    recipientName: string;
    courseName: string;
    organizationName: string;
    certificateNumber: string;
  };
}

/**
 * Certificate template interface
 */
export interface CertificateTemplate {
  id: string;
  name: string;
  type: CertificateType;
  layout: {
    width: number;
    height: number;
    orientation: 'portrait' | 'landscape';
  };
  elements: Array<{
    type: 'text' | 'image' | 'signature' | 'qr_code';
    content: string;
    position: { x: number; y: number };
    style?: Record<string, unknown>;
  }>;
  styles: Record<string, unknown>;
}

/**
 * Certificate Service
 * Handles certificate generation, verification, and management
 */
@Injectable()
export class CertificateService {
  private readonly logger = new Logger(CertificateService.name);
  private readonly templatesPath: string;
  private readonly outputPath: string;

  constructor(
    @InjectRepository(Certificate)
    private readonly certificateRepository: Repository<Certificate>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    private readonly fileManagerService: FileManagerService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {
    this.templatesPath = this.configService.get<string>('CERTIFICATE_TEMPLATES_PATH', './templates/certificates');
    this.outputPath = this.configService.get<string>('CERTIFICATE_OUTPUT_PATH', './tmp/certificates');
    
    // Ensure directories exist
    this.ensureDirectoriesExist();
  }

  /**
   * Generate certificate for enrollment
   */
  async generateCertificate(
    request: CertificateGenerationRequest,
    currentUser: AuthenticatedUser,
  ): Promise<Certificate> {
    this.logger.log(`Generating certificate for enrollment: ${request.enrollmentId}`);

    try {
      // Get enrollment with related data
      const enrollment = await this.enrollmentRepository.findOne({
        where: { id: request.enrollmentId },
        relations: ['course', 'user', 'course.organization'],
      });

      if (!enrollment) {
        throw new NotFoundException(`Enrollment not found: ${request.enrollmentId}`);
      }

      // Verify user can generate certificate
      if (!this.canUserGenerateCertificate(enrollment, currentUser)) {
        throw new ForbiddenException('Insufficient permissions to generate certificate');
      }
      console.log('enrollment', enrollment.course.passingScore)
      // Check if enrollment is eligible for certificate
      if (!enrollment.isEligibleForCertificate(enrollment.course.passingScore)) {
        throw new BadRequestException('Enrollment is not eligible for certificate');
      }

      // Check if certificate already exists
      const existingCertificate = await this.certificateRepository.findOne({
        where: { enrollmentId: request.enrollmentId },
      });

      if (existingCertificate && existingCertificate.isValid) {
        throw new BadRequestException('Certificate already exists for this enrollment');
      }

      // Generate certificate number and verification code
      const certificateNumber = Certificate.generateCertificateNumber(
        enrollment.course.organizationId,
        enrollment.courseId,
      );
      const verificationCode = Certificate.generateVerificationCode();

      // Determine certificate type
      const certificateType = request.type || this.determineCertificateType(enrollment);

      // Create certificate record
      const certificate = this.certificateRepository.create({
        userId: enrollment.userId,
        courseId: enrollment.courseId,
        enrollmentId: request.enrollmentId,
        organizationId: enrollment.course.organizationId,
        certificateNumber,
        verificationCode,
        title: this.generateCertificateTitle(enrollment.course, certificateType),
        description: this.generateCertificateDescription(enrollment.course, certificateType),
        type: certificateType,
        status: CertificateStatus.PENDING,
        finalScore: enrollment.finalScore,
        passingScore: enrollment.course.passingScore,
        grade: this.calculateGrade(enrollment.finalScore),
        issuedAt: new Date(),
        templateId: request.templateId || 'default',
        templateData: {
          ...request.customData,
          recipientName: `${enrollment.user.firstName} ${enrollment.user.lastName}`,
          courseName: enrollment.course.title,
          organizationName: enrollment.course.organization.name,
          completionDate: enrollment.completedAt,
          instructorName: 'Course Instructor', // Would be populated from course instructor
          certificateNumber,
          verificationCode,
          finalScore: enrollment.finalScore,
          grade: this.calculateGrade(enrollment.finalScore),
        },
        isPublic: true,
      });

      const savedCertificate = await this.certificateRepository.save(certificate);

      // Generate PDF certificate
      const pdfBuffer = await this.generateCertificatePDF(savedCertificate);

      // Upload PDF to file storage
      const uploadResult = await this.fileManagerService.uploadFile(pdfBuffer, {
        filename: `certificate_${certificateNumber}.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: pdfBuffer.length,
        organizationId: enrollment.course.organizationId,
        userId: enrollment.userId,
        isPublic: true,
      });

      // Update certificate with file information
      savedCertificate.setCertificateFile(uploadResult.storagePath, uploadResult.publicUrl);
      savedCertificate.issue();

      const finalCertificate = await this.certificateRepository.save(savedCertificate);

      // Update enrollment
      enrollment.recordCertificateIssuance();
      await this.enrollmentRepository.save(enrollment);

      // Emit certificate generated event
      this.eventEmitter.emit('certificate.generated', {
        certificateId: finalCertificate.id,
        enrollmentId: request.enrollmentId,
        userId: enrollment.userId,
        courseId: enrollment.courseId,
        certificateNumber,
        type: certificateType,
      });

      this.logger.log(`Certificate generated successfully: ${finalCertificate.id}`);
      return finalCertificate;
    } catch (error) {
      this.logger.error(`Failed to generate certificate for enrollment ${request.enrollmentId}:`, error);
      throw error;
    }
  }

  /**
   * Verify certificate by verification code
   */
  async verifyCertificate(verificationCode: string): Promise<CertificateVerificationResult> {
    try {
      const certificate = await this.certificateRepository.findOne({
        where: { verificationCode },
        relations: ['user', 'course', 'organization'],
      });

      if (!certificate) {
        return {
          isValid: false,
          errors: ['Certificate not found'],
        };
      }

      // Validate certificate integrity
      const validation = certificate.validateIntegrity();
      
      if (!validation.isValid) {
        return {
          isValid: false,
          certificate,
          errors: validation.errors,
        };
      }

      // Increment verification count
      certificate.incrementVerificationCount();
      await this.certificateRepository.save(certificate);

      // Emit certificate verified event
      this.eventEmitter.emit('certificate.verified', {
        certificateId: certificate.id,
        verificationCode,
        verifiedAt: new Date(),
      });

      return {
        isValid: true,
        certificate,
        verificationData: {
          issueDate: certificate.issuedAt,
          recipientName: `${certificate.user.firstName} ${certificate.user.lastName}`,
          courseName: certificate.course.title,
          organizationName: certificate.organization.name,
          certificateNumber: certificate.certificateNumber,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to verify certificate ${verificationCode}:`, error);
      return {
        isValid: false,
        errors: ['Verification failed'],
      };
    }
  }

  /**
   * Get certificate by ID
   */
  async getCertificateById(
    certificateId: string,
    currentUser: AuthenticatedUser,
  ): Promise<Certificate> {
    const certificate = await this.certificateRepository.findOne({
      where: { id: certificateId },
      relations: ['user', 'course', 'organization', 'enrollment'],
    });

    if (!certificate) {
      throw new NotFoundException(`Certificate not found: ${certificateId}`);
    }

    // Check access permissions
    if (!this.canUserAccessCertificate(certificate, currentUser)) {
      throw new ForbiddenException('Access denied to this certificate');
    }

    // Increment view count
    certificate.incrementViewCount();
    await this.certificateRepository.save(certificate);

    return certificate;
  }

  /**
   * Get user's certificates
   */
  async getUserCertificates(
    currentUser: AuthenticatedUser,
    filters?: {
      courseId?: string;
      type?: CertificateType;
      status?: CertificateStatus;
      page?: number;
      limit?: number;
    },
  ): Promise<{
    certificates: Certificate[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      courseId,
      type,
      status,
      page = 1,
      limit = 20,
    } = filters || {};

    const queryBuilder = this.certificateRepository
      .createQueryBuilder('certificate')
      .leftJoinAndSelect('certificate.course', 'course')
      .leftJoinAndSelect('certificate.organization', 'organization')
      .where('certificate.userId = :userId', { userId: currentUser.id });

    // Apply filters
    if (courseId) {
      queryBuilder.andWhere('certificate.courseId = :courseId', { courseId });
    }

    if (type) {
      queryBuilder.andWhere('certificate.type = :type', { type });
    }

    if (status) {
      queryBuilder.andWhere('certificate.status = :status', { status });
    }

    queryBuilder.andWhere('certificate.isArchived = false');
    queryBuilder.orderBy('certificate.issuedAt', 'DESC');

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const offset = (page - 1) * limit;
    const certificates = await queryBuilder.skip(offset).take(limit).getMany();

    return {
      certificates,
      total,
      page,
      limit,
    };
  }

  /**
   * Download certificate PDF
   */
  async downloadCertificate(
    certificateId: string,
    currentUser: AuthenticatedUser,
  ): Promise<any> {
    const certificate = await this.getCertificateById(certificateId, currentUser);

    if (!certificate.certificateFileId) {
      throw new BadRequestException('Certificate PDF not available');
    }

    // Generate download URL
    const downloadUrl = await this.fileManagerService.generateDownloadUrl(
      certificate.certificateFileId,
      currentUser,
      3600, // 1 hour expiry
    );

    // Increment download count
    certificate.incrementDownloadCount();
    await this.certificateRepository.save(certificate);

    // Emit certificate downloaded event
    this.eventEmitter.emit('certificate.downloaded', {
      certificateId,
      userId: currentUser.id,
      downloadedAt: new Date(),
    });

    return downloadUrl;
  }

  /**
   * Revoke certificate
   */
  async revokeCertificate(
    certificateId: string,
    reason: string,
    currentUser: AuthenticatedUser,
  ): Promise<Certificate> {
    const certificate = await this.getCertificateById(certificateId, currentUser);

    // Check permissions
    if (!this.canUserManageCertificate(certificate, currentUser)) {
      throw new ForbiddenException('Insufficient permissions to revoke certificate');
    }

    certificate.revoke(reason, currentUser.id);
    const savedCertificate = await this.certificateRepository.save(certificate);

    // Emit certificate revoked event
    this.eventEmitter.emit('certificate.revoked', {
      certificateId,
      reason,
      revokedBy: currentUser.id,
      revokedAt: new Date(),
    });

    return savedCertificate;
  }

  /**
   * Get certificate statistics
   */
  async getCertificateStatistics(
    organizationId: string,
    currentUser: AuthenticatedUser |any ,
  ): Promise<{
    totalCertificates: number;
    issuedCertificates: number;
    revokedCertificates: number;
    certificatesByType: Record<string, number>;
    certificatesByMonth: Record<string, number>;
    verificationCount: number;
    downloadCount: number;
  }> {
    // Verify access
    if (!currentUser.permissions?.includes('certificates:read') &&
        currentUser.currentOrganizationId !== organizationId) {
      throw new ForbiddenException('Access denied to certificate statistics');
    }

    const certificates = await this.certificateRepository.find({
      where: { organizationId, isArchived: false },
    });

    const totalCertificates = certificates.length;
    const issuedCertificates = certificates.filter(c => c.isIssued).length;
    const revokedCertificates = certificates.filter(c => c.isRevoked).length;

    const certificatesByType = certificates.reduce((acc, cert) => {
      acc[cert.type] = (acc[cert.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const certificatesByMonth = certificates.reduce((acc, cert) => {
      const month = cert.issuedAt.toISOString().substring(0, 7); // YYYY-MM
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const verificationCount = certificates.reduce((sum, c) => sum + c.verificationCount, 0);
    const downloadCount = certificates.reduce((sum, c) => sum + c.downloadCount, 0);

    return {
      totalCertificates,
      issuedCertificates,
      revokedCertificates,
      certificatesByType,
      certificatesByMonth,
      verificationCount,
      downloadCount,
    };
  }

  // Private helper methods

  /**
   * Generate certificate PDF
   */
  private async generateCertificatePDF(certificate: Certificate): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          layout: 'landscape',
          size: 'A4',
        });

        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });

        // Certificate design
        const templateData = certificate.getTemplateData();
        
        // Background
        doc.rect(0, 0, doc.page.width, doc.page.height)
           .fill('#f8f9fa');

        // Border
        doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60)
           .stroke('#007bff', 3);

        // Header
        doc.fontSize(36)
           .fillColor('#007bff')
           .text('CERTIFICATE OF COMPLETION', 0, 100, { align: 'center' });

        // Recipient name
        doc.fontSize(28)
           .fillColor('#333333')
           .text('This is to certify that', 0, 180, { align: 'center' });

        doc.fontSize(32)
           .fillColor('#007bff')
           .text(templateData.recipientName as string, 0, 220, { align: 'center' });

        // Course completion text
        doc.fontSize(20)
           .fillColor('#333333')
           .text('has successfully completed the course', 0, 280, { align: 'center' });

        doc.fontSize(24)
           .fillColor('#007bff')
           .text(templateData.courseName as string, 0, 320, { align: 'center' });

        // Score and grade
        if (templateData.finalScore) {
          doc.fontSize(16)
             .fillColor('#333333')
             .text(`Final Score: ${templateData.finalScore}% | Grade: ${templateData.grade}`, 0, 380, { align: 'center' });
        }

        // Issue date
        doc.fontSize(14)
           .fillColor('#666666')
           .text(`Issued on: ${new Date(templateData.issuedAt as Date).toLocaleDateString()}`, 0, 420, { align: 'center' });

        // Organization name
        doc.fontSize(16)
           .fillColor('#333333')
           .text(templateData.organizationName as string, 0, 460, { align: 'center' });

        // Certificate number and verification
        doc.fontSize(10)
           .fillColor('#999999')
           .text(`Certificate Number: ${certificate.certificateNumber}`, 50, doc.page.height - 80)
           .text(`Verification Code: ${certificate.verificationCode}`, 50, doc.page.height - 65)
           .text(`Verify at: ${this.getVerificationUrl(certificate.verificationCode)}`, 50, doc.page.height - 50);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Determine certificate type based on enrollment
   */
  private determineCertificateType(enrollment: Enrollment): CertificateType {
    if (enrollment.finalScore && enrollment.finalScore >= 90) {
      return CertificateType.EXCELLENCE;
    }
    
    if (enrollment.isCompleted) {
      return CertificateType.COMPLETION;
    }
    
    return CertificateType.PARTICIPATION;
  }

  /**
   * Generate certificate title
   */
  private generateCertificateTitle(course: Course, type: CertificateType): string {
    const typeText = {
      [CertificateType.COMPLETION]: 'Certificate of Completion',
      [CertificateType.ACHIEVEMENT]: 'Certificate of Achievement',
      [CertificateType.PARTICIPATION]: 'Certificate of Participation',
      [CertificateType.EXCELLENCE]: 'Certificate of Excellence',
    };

    return `${typeText[type]} - ${course.title}`;
  }

  /**
   * Generate certificate description
   */
  private generateCertificateDescription(course: Course, type: CertificateType): string {
    return `This certificate is awarded for ${type} of the course "${course.title}".`;
  }

  /**
   * Calculate grade from score
   */
  private calculateGrade(score?: number): string {
    if (!score) return 'Pass';
    
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Get verification URL
   */
  private getVerificationUrl(verificationCode: string): string {
    const baseUrl = this.configService.get<string>('APP_BASE_URL', 'https://app.volkaihr.com');
    return `${baseUrl}/certificates/verify/${verificationCode}`;
  }

  /**
   * Check if user can generate certificate
   */
  private canUserGenerateCertificate(enrollment: Enrollment, user: AuthenticatedUser): boolean {
    return enrollment.userId === user.id ||
           enrollment.course.instructorId === user.id ||
           user.permissions?.includes('certificates:manage');
  }

  /**
   * Check if user can access certificate
   */
  private canUserAccessCertificate(certificate: Certificate, user: AuthenticatedUser): boolean {
    return certificate.userId === user.id ||
           certificate.course?.instructorId === user.id ||
           user.permissions?.includes('certificates:read') ||
           (certificate.isPublic && certificate.isValid);
  }

  /**
   * Check if user can manage certificate
   */
  private canUserManageCertificate(certificate: Certificate, user: AuthenticatedUser): boolean {
    return certificate.course?.instructorId === user.id ||
           user.permissions?.includes('certificates:manage');
  }

  /**
   * Ensure required directories exist
   */
  private ensureDirectoriesExist(): void {
    const dirs = [this.templatesPath, this.outputPath];
    
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }
}
