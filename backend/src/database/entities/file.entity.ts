import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Organization } from './organization.entity';

/**
 * File owner type enumeration
 */
export enum FileOwnerType {
  USER = 'user',
  ORGANIZATION = 'organization',
  SYSTEM = 'system',
}

/**
 * File access level enumeration
 */
export enum FileAccessLevel {
  PRIVATE = 'private',
  ORGANIZATION = 'organization',
  PUBLIC = 'public',
  LINK_ONLY = 'link_only',
}

/**
 * Virus scan status enumeration
 */
export enum VirusScanStatus {
  PENDING = 'pending',
  SCANNING = 'scanning',
  CLEAN = 'clean',
  INFECTED = 'infected',
  ERROR = 'error',
}

/**
 * File processing status enumeration
 */
export enum FileProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * File entity for comprehensive file management
 * Supports S3 storage, CDN integration, virus scanning, and access control
 */
@Entity('files')
@Index(['ownerId', 'ownerType'])
@Index(['organizationId'])
@Index(['mimeType'])
@Index(['accessLevel'])
@Index(['virusScanStatus'])
@Index(['createdAt'])
@Index(['expiresAt'])
export class File {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  ownerId?: string;

  @Column({ type: 'uuid', nullable: true })
  organizationId?: string;

  @Column({
    type: 'enum',
    enum: FileOwnerType,
  })
  @Index()
  ownerType: FileOwnerType;

  @Column({ type: 'varchar', length: 255 })
  filename: string;

  @Column({ type: 'varchar', length: 255 })
  originalFilename: string;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  mimeType: string;

  @Column({ type: 'bigint' })
  sizeBytes: number;

  @Column({ type: 'text' })
  storagePath: string;

  @Column({ type: 'text', nullable: true })
  publicUrl?: string;

  @Column({ type: 'text', nullable: true })
  cdnUrl?: string;

  @Column({ type: 'text', nullable: true })
  thumbnailUrl?: string;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @Column({
    type: 'enum',
    enum: VirusScanStatus,
    default: VirusScanStatus.PENDING,
  })
  @Index()
  virusScanStatus: VirusScanStatus;

  @Column({ type: 'text', nullable: true })
  virusScanResult?: string;

  @Column({ type: 'timestamp', nullable: true })
  virusScanAt?: Date;

  @Column({
    type: 'enum',
    enum: FileProcessingStatus,
    default: FileProcessingStatus.PENDING,
  })
  @Index()
  processingStatus: FileProcessingStatus;

  @Column({ type: 'text', nullable: true })
  processingError?: string;

  @Column({
    type: 'enum',
    enum: FileAccessLevel,
    default: FileAccessLevel.PRIVATE,
  })
  @Index()
  accessLevel: FileAccessLevel;

  @Column({ type: 'integer', default: 0 })
  downloadCount: number;

  @Column({ type: 'integer', default: 0 })
  viewCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastAccessedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  checksum?: string;

  @Column({ type: 'boolean', default: false })
  isProcessed: boolean;

  @Column({ type: 'boolean', default: false })
  isArchived: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'ownerId' })
  owner?: User;

  @ManyToOne(() => Organization, { eager: false })
  @JoinColumn({ name: 'organizationId' })
  organization?: Organization;

  // Virtual properties
  get isImage(): boolean {
    return this.mimeType.startsWith('image/');
  }

  get isVideo(): boolean {
    return this.mimeType.startsWith('video/');
  }

  get isAudio(): boolean {
    return this.mimeType.startsWith('audio/');
  }

  get isDocument(): boolean {
    const documentTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
    ];
    return documentTypes.includes(this.mimeType);
  }

  get isArchive(): boolean {
    const archiveTypes = [
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      'application/x-tar',
      'application/gzip',
    ];
    return archiveTypes.includes(this.mimeType);
  }

  get humanReadableSize(): string {
    const bytes = this.sizeBytes;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  get fileExtension(): string {
    return this.originalFilename.split('.').pop()?.toLowerCase() || '';
  }

  get isExpired(): boolean {
    return this.expiresAt ? new Date() > this.expiresAt : false;
  }

  get isVirusClean(): boolean {
    return this.virusScanStatus === VirusScanStatus.CLEAN;
  }

  get isVirusInfected(): boolean {
    return this.virusScanStatus === VirusScanStatus.INFECTED;
  }

  get isProcessingComplete(): boolean {
    return this.processingStatus === FileProcessingStatus.COMPLETED;
  }

  get isPubliclyAccessible(): boolean {
    return this.accessLevel === FileAccessLevel.PUBLIC || 
           this.accessLevel === FileAccessLevel.LINK_ONLY;
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
   * Check if file has specific tag
   */
  hasTag(tag: string): boolean {
    return this.tags.includes(tag.toLowerCase());
  }

  /**
   * Add tag to file
   */
  addTag(tag: string): void {
    const normalizedTag = tag.toLowerCase();
    if (!this.hasTag(normalizedTag)) {
      this.tags = [...this.tags, normalizedTag];
    }
  }

  /**
   * Remove tag from file
   */
  removeTag(tag: string): void {
    this.tags = this.tags.filter(t => t !== tag.toLowerCase());
  }

  /**
   * Check if user can access this file
   */
  canAccess(userId?: string, organizationId?: string): boolean {
    // Public files are accessible to everyone
    if (this.accessLevel === FileAccessLevel.PUBLIC) {
      return true;
    }

    // Link-only files are accessible with direct link
    if (this.accessLevel === FileAccessLevel.LINK_ONLY) {
      return true;
    }

    // Private files are only accessible to owner
    if (this.accessLevel === FileAccessLevel.PRIVATE) {
      return this.ownerId === userId;
    }

    // Organization files are accessible to organization members
    if (this.accessLevel === FileAccessLevel.ORGANIZATION) {
      return this.organizationId === organizationId;
    }

    return false;
  }

  /**
   * Increment download count
   */
  incrementDownloadCount(): void {
    this.downloadCount += 1;
    this.lastAccessedAt = new Date();
  }

  /**
   * Increment view count
   */
  incrementViewCount(): void {
    this.viewCount += 1;
    this.lastAccessedAt = new Date();
  }
}
