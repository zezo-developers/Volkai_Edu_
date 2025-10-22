import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsObject,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CertificateStatus,
  CertificateType,
} from '../../../database/entities/certificate.entity';

export class GenerateCertificateDto {
  @ApiProperty({ description: 'Enrollment ID for certificate generation' })
  @IsUUID()
  enrollmentId: string;

  @ApiPropertyOptional({ enum: CertificateType, description: 'Certificate type' })
  @IsOptional()
  @IsEnum(CertificateType)
  type?: CertificateType;

  @ApiPropertyOptional({ description: 'Custom certificate template' })
  @IsOptional()
  @IsString()
  template?: string;

  @ApiPropertyOptional({ description: 'Additional certificate metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class VerifyCertificateDto {
  @ApiPropertyOptional({ description: 'Certificate number' })
  @ValidateIf(o => !o.verificationCode)
  @IsString()
  certificateNumber?: string;

  @ApiPropertyOptional({ description: 'Verification code' })
  @ValidateIf(o => !o.certificateNumber)
  @IsString()
  verificationCode?: string;
}

export class CertificateResponseDto {
  @ApiProperty({ description: 'Certificate ID' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Course ID' })
  courseId: string;

  @ApiProperty({ description: 'Enrollment ID' })
  enrollmentId: string;

  @ApiPropertyOptional({ description: 'Organization ID' })
  organizationId?: string;

  @ApiProperty({ description: 'Certificate number' })
  certificateNumber: string;

  @ApiProperty({ description: 'Verification code' })
  verificationCode: string;

  @ApiProperty({ enum: CertificateType, description: 'Certificate type' })
  type: CertificateType;

  @ApiProperty({ enum: CertificateStatus, description: 'Certificate status' })
  status: CertificateStatus;

  @ApiProperty({ description: 'Issue date' })
  issuedAt: Date;

  @ApiPropertyOptional({ description: 'Expiry date' })
  expiresAt?: Date;

  @ApiPropertyOptional({ description: 'Revocation date' })
  revokedAt?: Date;

  @ApiPropertyOptional({ description: 'Revocation reason' })
  revocationReason?: string;

  @ApiPropertyOptional({ description: 'Certificate template used' })
  template?: string;

  @ApiPropertyOptional({ description: 'PDF file URL' })
  pdfUrl?: string;

  @ApiPropertyOptional({ description: 'PDF file ID' })
  pdfFileId?: string;

  @ApiProperty({ description: 'User details' })
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };

  @ApiProperty({ description: 'Course details' })
  course: {
    id: string;
    title: string;
    description?: string;
    duration?: number;
    difficulty?: string;
  };

  @ApiPropertyOptional({ description: 'Organization details' })
  organization?: {
    id: string;
    name: string;
    logoUrl?: string;
  };

  @ApiProperty({ description: 'Enrollment details' })
  enrollment: {
    id: string;
    completedAt: Date;
    finalScore: number;
    totalTimeSpent: number;
  };

  @ApiPropertyOptional({ description: 'Certificate metadata' })
  metadata?: Record<string, any>;

  constructor(certificate: any) {
    this.id = certificate.id;
    this.userId = certificate.userId;
    this.courseId = certificate.courseId;
    this.enrollmentId = certificate.enrollmentId;
    this.organizationId = certificate.organizationId;
    this.certificateNumber = certificate.certificateNumber;
    this.verificationCode = certificate.verificationCode;
    this.type = certificate.type;
    this.status = certificate.status;
    this.issuedAt = certificate.issuedAt;
    this.expiresAt = certificate.expiresAt;
    this.revokedAt = certificate.revokedAt;
    this.revocationReason = certificate.revocationReason;
    this.template = certificate.template;
    this.pdfUrl = certificate.pdfUrl;
    this.pdfFileId = certificate.pdfFileId;
    this.user = certificate.user;
    this.course = certificate.course;
    this.organization = certificate.organization;
    this.enrollment = certificate.enrollment;
    this.metadata = certificate.metadata;
  }
}

export class CertificateListResponseDto {
  @ApiProperty({ type: [CertificateResponseDto], description: 'List of certificates' })
  items: CertificateResponseDto[];

  @ApiProperty({ description: 'Total number of items' })
  total: number;

  @ApiProperty({ description: 'Current page' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  constructor(data: any) {
    this.items = data.items.map((item: any) => new CertificateResponseDto(item));
    this.total = data.total;
    this.page = data.page;
    this.limit = data.limit;
    this.totalPages = data.totalPages;
  }
}

export class CertificateStatisticsDto {
  @ApiProperty({ description: 'Total certificates issued' })
  totalCertificates: number;

  @ApiProperty({ description: 'Active certificates' })
  activeCertificates: number;

  @ApiProperty({ description: 'Revoked certificates' })
  revokedCertificates: number;

  @ApiProperty({ description: 'Expired certificates' })
  expiredCertificates: number;

  @ApiProperty({ description: 'Certificates issued this month' })
  certificatesThisMonth: number;

  @ApiProperty({ description: 'Certificates issued last month' })
  certificatesLastMonth: number;

  @ApiProperty({ description: 'Growth rate percentage' })
  growthRate: number;

  @ApiProperty({ description: 'Certificate issuance trends over time' })
  issuanceTrends: {
    date: string;
    count: number;
  }[];

  @ApiProperty({ description: 'Certificates by course' })
  certificatesByCourse: {
    courseId: string;
    courseTitle: string;
    count: number;
    percentage: number;
  }[];

  @ApiProperty({ description: 'Certificates by type' })
  certificatesByType: {
    type: CertificateType;
    count: number;
    percentage: number;
  }[];

  @ApiProperty({ description: 'Average time to completion (days)' })
  averageTimeToCompletion: number;

  @ApiProperty({ description: 'Top performing users' })
  topPerformers: {
    userId: string;
    userName: string;
    certificateCount: number;
    averageScore: number;
  }[];

  constructor(data: any) {
    this.totalCertificates = data.totalCertificates;
    this.activeCertificates = data.activeCertificates;
    this.revokedCertificates = data.revokedCertificates;
    this.expiredCertificates = data.expiredCertificates;
    this.certificatesThisMonth = data.certificatesThisMonth;
    this.certificatesLastMonth = data.certificatesLastMonth;
    this.growthRate = data.growthRate;
    this.issuanceTrends = data.issuanceTrends;
    this.certificatesByCourse = data.certificatesByCourse;
    this.certificatesByType = data.certificatesByType;
    this.averageTimeToCompletion = data.averageTimeToCompletion;
    this.topPerformers = data.topPerformers;
  }
}
