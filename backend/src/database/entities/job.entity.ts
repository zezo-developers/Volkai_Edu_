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
import { Organization } from './organization.entity';
import { User } from '../entities/user.entity';
import { InterviewSession } from './interview-session.entity';

export enum JobType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  INTERNSHIP = 'internship',
  FREELANCE = 'freelance',
}

export enum WorkMode {
  OFFICE = 'office',
  REMOTE = 'remote',
  HYBRID = 'hybrid',
}

export enum ExperienceLevel {
  ENTRY = 'entry',
  JUNIOR = 'junior',
  MID = 'mid',
  SENIOR = 'senior',
  LEAD = 'lead',
  EXECUTIVE = 'executive',
}

export enum JobStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  PAUSED = 'paused',
  CLOSED = 'closed',
  ARCHIVED = 'archived',
}

@Entity('jobs')
@Index(['organizationId', 'status'])
@Index(['type', 'experienceLevel'])
@Index(['publishedAt'])
export class Job {
  @ApiProperty({ description: 'Job ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Organization ID' })
  @Column({ name: 'organizationId' })
  organizationId: string;

  @ApiProperty({ description: 'Job title' })
  @Column({ length: 255 })
  title: string;

  @ApiProperty({ description: 'Applications' })
  @Column({ length: 255 })
  applications: string;

  @ApiProperty({ description: 'Job URL slug' })
  @Column({ length: 255 })
  slug: string;

  @ApiProperty({ description: 'Job description' })
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({ description: 'Job requirements' })
  @Column({ type: 'text', nullable: true })
  requirements?: string;

  @ApiProperty({ description: 'Job responsibilities' })
  @Column({ type: 'text', nullable: true })
  responsibilities?: string;

  @ApiProperty({ description: 'Job location' })
  @Column({ length: 255, nullable: true })
  location?: string;

  @ApiProperty({ enum: JobType, description: 'Job type' })
  @Column({
    type: 'enum',
    enum: JobType,
    default: JobType.FULL_TIME,
  })
  type: JobType;

  @ApiProperty({ enum: WorkMode, description: 'Work mode' })
  @Column({
    type: 'enum',
    enum: WorkMode,
    default: WorkMode.OFFICE,
  })
  mode: WorkMode;

  @ApiProperty({ enum: ExperienceLevel, description: 'Experience level required' })
  @Column({
    type: 'enum',
    enum: ExperienceLevel,
    nullable: true,
  })
  experienceLevel?: ExperienceLevel;

  @ApiProperty({ description: 'Minimum salary' })
  @Column({ name: 'salaryMin', type: 'decimal', precision: 12, scale: 2, nullable: true })
  salaryMin?: number;

  @ApiProperty({ description: 'Maximum salary' })
  @Column({ name: 'salaryMax', type: 'decimal', precision: 12, scale: 2, nullable: true })
  salaryMax?: number;

  @ApiProperty({ description: 'Salary currency' })
  @Column({ length: 3, default: 'USD' })
  currency: string;

  @ApiProperty({ description: 'Department' })
  @Column({ length: 100, nullable: true })
  department?: string;

  @ApiProperty({ description: 'Job tags' })
  @Column({ type: 'simple-array', default: [] })
  tags: string[];

  @ApiProperty({ description: 'Required skills' })
  @Column({ name: 'skillsRequired', type: 'simple-array', default: [] })
  skillsRequired: string[];

  @ApiProperty({ enum: JobStatus, description: 'Job status' })
  @Column({
    type: 'enum',
    enum: JobStatus,
    default: JobStatus.DRAFT,
  })
  status: JobStatus;

  @ApiProperty({ description: 'Job published date' })
  @Column({ name: 'publishedAt', type: 'timestamp', nullable: true })
  publishedAt?: Date;

  @ApiProperty({ description: 'Job expiry date' })
  @Column({ name: 'expiresAt', type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @ApiProperty({ description: 'Job creator user ID' })
  @Column({ name: 'createdBy' })
  createdBy: string;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @OneToMany(() => InterviewSession, session => session.job)
  interviewSessions: InterviewSession[];

  // Virtual properties
  get isActive(): boolean {
    return this.status === JobStatus.PUBLISHED &&
           (!this.expiresAt || this.expiresAt > new Date());
  }

  get isExpired(): boolean {
    return this.expiresAt ? this.expiresAt < new Date() : false;
  }

  get salaryRange(): string {
    if (!this.salaryMin && !this.salaryMax) return 'Not specified';
    if (this.salaryMin && this.salaryMax) {
      return `${this.currency} ${this.salaryMin.toLocaleString()} - ${this.salaryMax.toLocaleString()}`;
    }
    if (this.salaryMin) return `${this.currency} ${this.salaryMin.toLocaleString()}+`;
    return `Up to ${this.currency} ${this.salaryMax?.toLocaleString()}`;
  }

  // Methods
  publish(): void {
    if (this.status !== JobStatus.DRAFT) {
      throw new Error('Only draft jobs can be published');
    }
    this.status = JobStatus.PUBLISHED;
    this.publishedAt = new Date();
  }

  pause(): void {
    if (this.status !== JobStatus.PUBLISHED) {
      throw new Error('Only published jobs can be paused');
    }
    this.status = JobStatus.PAUSED;
  }

  resume(): void {
    if (this.status !== JobStatus.PAUSED) {
      throw new Error('Only paused jobs can be resumed');
    }
    this.status = JobStatus.PUBLISHED;
  }

  close(): void {
    if (this.status === JobStatus.CLOSED || this.status === JobStatus.ARCHIVED) {
      throw new Error('Job is already closed or archived');
    }
    this.status = JobStatus.CLOSED;
  }

  archive(): void {
    this.status = JobStatus.ARCHIVED;
  }
}
