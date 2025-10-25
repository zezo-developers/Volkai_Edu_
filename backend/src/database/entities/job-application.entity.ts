import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Job } from './job.entity';
import { User } from '../entities/user.entity';
import { UserResume } from './user-resume.entity';

export enum ApplicationStatus {
  APPLIED = 'applied',
  SCREENING = 'screening',
  INTERVIEWING = 'interviewing',
  OFFERED = 'offered',
  HIRED = 'hired',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
}

export enum ApplicationStage {
  SCREENING = 'screening',
  PHONE_SCREEN = 'phone_screen',
  TECHNICAL = 'technical',
  ONSITE = 'onsite',
  FINAL = 'final',
  OFFER = 'offer',
  HIRED = 'hired',
}

export enum ApplicationSource {
  DIRECT = 'direct',
  REFERRAL = 'referral',
  LINKEDIN = 'linkedin',
  JOB_BOARD = 'job_board',
  CAREER_PAGE = 'career_page',
  OTHER = 'other',
}

@Entity('job_applications')
@Index(['jobId', 'status'])
@Index(['candidateId', 'appliedAt'])
@Index(['assignedTo', 'status'])
@Index(['stage', 'lastActivityAt'])
export class JobApplication {
  @ApiProperty({ description: 'Application ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Job ID' })
  @Column({ name: 'jobId' })
  jobId: string;

  @ApiProperty({ description: 'Candidate user ID' })
  @Column({ name: 'candidateId', nullable: true })
  candidateId?: string;

  @ApiProperty({ description: 'External candidate email (for non-registered users)' })
  @Column({ name: 'externalEmail', length: 255, nullable: true })
  externalEmail?: string;

  @ApiProperty({ description: 'External candidate name (for non-registered users)' })
  @Column({ name: 'externalName', length: 255, nullable: true })
  externalName?: string;

  @ApiProperty({ description: 'Parsed resume data' })
  @Column({ name: 'parsedResumeData', length: 255, nullable: true })
  parsedResumeData?: string;

  @ApiProperty({ description: 'Resume ID' })
  @Column({ name: 'resumeId', nullable: true })
  resumeId?: string;

  @ApiProperty({ description: 'Cover letter' })
  @Column({ name: 'coverLetter', type: 'text', nullable: true })
  coverLetter?: string;

  @ApiProperty({ enum: ApplicationStatus, description: 'Application status' })
  @Column({
    type: 'enum',
    enum: ApplicationStatus,
    default: ApplicationStatus.APPLIED,
  })
  status: ApplicationStatus;

  @ApiProperty({ enum: ApplicationStage, description: 'Application stage' })
  @Column({
    type: 'enum',
    enum: ApplicationStage,
    default: ApplicationStage.SCREENING,
  })
  stage: ApplicationStage;

  @ApiProperty({ enum: ApplicationSource, description: 'Application source' })
  @Column({
    type: 'enum',
    enum: ApplicationSource,
    default: ApplicationSource.DIRECT,
  })
  source: ApplicationSource;

  @ApiProperty({ description: 'Internal notes' })
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @ApiProperty({ description: 'Application rating (1-5)' })
  @Column({ nullable: true })
  rating?: number;

  @ApiProperty({ description: 'Assigned recruiter/HR user ID' })
  @Column({ name: 'assignedTo', nullable: true })
  assignedTo?: string;

  @ApiProperty({ description: 'Application submitted date' })
  @Column({ name: 'appliedAt', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  appliedAt: Date;

  @ApiProperty({ description: 'Last activity timestamp' })
  @Column({ name: 'lastActivityAt', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastActivityAt: Date;

  @ApiProperty({ description: 'Application form data' })
  @Column({ name: 'formData', type: 'jsonb', default: {} })
  formData: {
    customFields?: Record<string, any>;
    questionnaire?: Array<{
      question: string;
      answer: string;
      type: 'text' | 'boolean' | 'choice' | 'file';
    }>;
    attachments?: Array<{
      name: string;
      url: string;
      type: string;
      size: number;
    }>;
  };

  @ApiProperty({ description: 'Application timeline and history' })
  @Column({ type: 'jsonb', default: [] })
  timeline: Array<{
    id: string;
    action: string;
    description: string;
    performedBy: string;
    performedByName: string;
    timestamp: Date;
    metadata?: Record<string, any>;
  }>;

  @ApiProperty({ description: 'Screening results and scores' })
  @Column({ name: 'screeningData', type: 'jsonb', default: {} })
  screeningData: {
    autoScreeningScore?: number;
    skillsMatch?: {
      required: string[];
      matched: string[];
      missing: string[];
      score: number;
    };
    experienceMatch?: {
      required: string;
      candidate: string;
      score: number;
    };
    salaryExpectation?: {
      min?: number;
      max?: number;
      currency: string;
      negotiable: boolean;
    };
    availability?: {
      startDate?: Date;
      noticePeriod?: string;
      relocate?: boolean;
    };
  };

  @ApiProperty({ description: 'Communication history' })
  @Column({ type: 'jsonb', default: [] })
  communications: Array<{
    id: string;
    type: 'email' | 'phone' | 'message' | 'meeting';
    direction: 'inbound' | 'outbound';
    subject?: string;
    content: string;
    sentBy: string;
    sentByName: string;
    timestamp: Date;
    attachments?: Array<{
      name: string;
      url: string;
    }>;
  }>;

  @ApiProperty({ description: 'Interview scheduling data' })
  @Column({ name: 'interviewData', type: 'jsonb', default: {} })
  interviewData: {
    scheduledInterviews?: Array<{
      id: string;
      type: string;
      scheduledAt: Date;
      status: string;
      interviewers: string[];
    }>;
    feedback?: Array<{
      interviewId: string;
      interviewer: string;
      rating: number;
      feedback: string;
      recommendation: 'hire' | 'no_hire' | 'maybe';
    }>;
  };

  @ApiProperty({ description: 'Rejection or withdrawal details' })
  @Column({ name: 'rejectionData', type: 'jsonb', nullable: true })
  rejectionData?: {
    reason: string;
    feedback?: string;
    rejectedBy: string;
    rejectedAt: Date;
    sendFeedback: boolean;
  };

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Job, job => job.applications)
  @JoinColumn({ name: 'jobId' })
  job: Job;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'candidateId' })
  candidate?: User;

  @ManyToOne(() => UserResume, { nullable: true })
  @JoinColumn({ name: 'resumeId' })
  resume?: UserResume;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assignedTo' })
  assignee?: User;

  // Virtual properties
  get candidateName(): string {
    if (this.candidate) return this.candidate.fullName;
    return this.externalName || 'Unknown Candidate';
  }

  get candidateEmail(): string {
    if (this.candidate) return this.candidate.email;
    return this.externalEmail || '';
  }

  get isExternal(): boolean {
    return !this.candidateId && !!this.externalEmail;
  }

  get daysSinceApplied(): number {
    const now = new Date();
    return Math.ceil(Math.abs(now.getTime() - this.appliedAt.getTime()) / (1000 * 60 * 60 * 24));
  }

  get daysSinceLastActivity(): number {
    const now = new Date();
    return Math.ceil(Math.abs(now.getTime() - this.lastActivityAt.getTime()) / (1000 * 60 * 60 * 24));
  }

  get isStale(): boolean {
    return this.daysSinceLastActivity > 7 &&
      this.status !== ApplicationStatus.HIRED &&
      this.status !== ApplicationStatus.REJECTED;
  }

  // Methods
  updateStatus(newStatus: ApplicationStatus, performedBy: string, notes?: string): void {
    const oldStatus = this.status;
    this.status = newStatus;
    this.lastActivityAt = new Date();
    this.addTimelineEntry({
      action: 'status_changed',
      description: `Status changed from ${oldStatus} to ${newStatus}`,
      performedBy,
      metadata: { oldStatus, newStatus, notes },
    });
    this.updateStageFromStatus(newStatus);
  }

  updateStage(newStage: ApplicationStage, performedBy: string, notes?: string): void {
    const oldStage = this.stage;
    this.stage = newStage;
    this.lastActivityAt = new Date();
    this.addTimelineEntry({
      action: 'stage_changed',
      description: `Stage changed from ${oldStage} to ${newStage}`,
      performedBy,
      metadata: { oldStage, newStage, notes },
    });
  }

  addTimelineEntry(entry: Omit<JobApplication['timeline'][0], 'id' | 'timestamp' | 'performedByName'>): void {
    const timelineEntry = {
      id: `timeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      performedByName: 'System',
      ...entry,
    };
    this.timeline.push(timelineEntry);
  }

  addCommunication(communication: Omit<JobApplication['communications'][0], 'id' | 'timestamp'>): void {
    const comm = {
      id: `comm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...communication,
    };
    this.communications.push(comm);
    this.lastActivityAt = new Date();
  }

  assignTo(userId: string, performedBy: string): void {
    const oldAssignee = this.assignedTo;
    this.assignedTo = userId;
    this.lastActivityAt = new Date();
    this.addTimelineEntry({
      action: 'assigned',
      description: oldAssignee ? 'Reassigned to new recruiter' : 'Assigned to recruiter',
      performedBy,
      metadata: { oldAssignee, newAssignee: userId },
    });
  }

  rate(rating: number, performedBy: string, notes?: string): void {
    if (rating < 1 || rating > 5) throw new Error('Rating must be between 1 and 5');
    const oldRating = this.rating;
    this.rating = rating;
    this.lastActivityAt = new Date();
    this.addTimelineEntry({
      action: 'rated',
      description: `Application rated ${rating}/5`,
      performedBy,
      metadata: { oldRating, newRating: rating, notes },
    });
  }

  reject(reason: string, feedback?: string, performedBy?: string, sendFeedback: boolean = false): void {
    this.status = ApplicationStatus.REJECTED;
    this.rejectionData = {
      reason,
      feedback,
      rejectedBy: performedBy || 'system',
      rejectedAt: new Date(),
      sendFeedback,
    };
    this.lastActivityAt = new Date();
    this.addTimelineEntry({
      action: 'rejected',
      description: `Application rejected: ${reason}`,
      performedBy: performedBy || 'system',
      metadata: { reason, feedback, sendFeedback },
    });
  }

  withdraw(reason?: string): void {
    this.status = ApplicationStatus.WITHDRAWN;
    this.lastActivityAt = new Date();
    this.addTimelineEntry({
      action: 'withdrawn',
      description: `Application withdrawn${reason ? `: ${reason}` : ''}`,
      performedBy: this.candidateId || 'candidate',
      metadata: { reason },
    });
  }

  scheduleInterview(interviewData: {
    id: string;
    type: string;
    scheduledAt: Date;
    interviewers: string[];
  }, performedBy: string): void {
    if (!this.interviewData.scheduledInterviews) this.interviewData.scheduledInterviews = [];
    this.interviewData.scheduledInterviews.push({ ...interviewData, status: 'scheduled' });
    this.updateStatus(ApplicationStatus.INTERVIEWING, performedBy);
    this.addTimelineEntry({
      action: 'interview_scheduled',
      description: `${interviewData.type} interview scheduled for ${interviewData.scheduledAt.toLocaleString()}`,
      performedBy,
      metadata: interviewData,
    });
  }

  addInterviewFeedback(feedback: JobApplication['interviewData']['feedback'][0], performedBy: string): void {
    if (!this.interviewData.feedback) this.interviewData.feedback = [];
    this.interviewData.feedback.push(feedback);
    this.lastActivityAt = new Date();
    this.addTimelineEntry({
      action: 'interview_feedback',
      description: `Interview feedback received from ${feedback.interviewer}`,
      performedBy,
      metadata: feedback,
    });
  }

  updateScreeningData(data: Partial<JobApplication['screeningData']>): void {
    this.screeningData = { ...this.screeningData, ...data };
    this.lastActivityAt = new Date();
  }

  calculateAutoScreeningScore(): number {
    let score = 0;
    let maxScore = 0;
    if (this.screeningData.skillsMatch) { score += this.screeningData.skillsMatch.score * 0.4; maxScore += 40; }
    if (this.screeningData.experienceMatch) { score += this.screeningData.experienceMatch.score * 0.3; maxScore += 30; }
    if (this.resume?.estimatedAtsScore) { score += (this.resume.estimatedAtsScore / 100) * 20; maxScore += 20; }
    let completenessScore = 0;
    if (this.coverLetter) completenessScore += 5;
    if (this.formData.questionnaire?.length > 0) completenessScore += 3;
    if (this.formData.attachments?.length > 0) completenessScore += 2;
    score += completenessScore; maxScore += 10;
    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  }

  private updateStageFromStatus(status: ApplicationStatus): void {
    switch (status) {
      case ApplicationStatus.APPLIED: this.stage = ApplicationStage.SCREENING; break;
      case ApplicationStatus.SCREENING: this.stage = ApplicationStage.PHONE_SCREEN; break;
      case ApplicationStatus.INTERVIEWING:
        if (this.stage === ApplicationStage.SCREENING || this.stage === ApplicationStage.PHONE_SCREEN)
          this.stage = ApplicationStage.TECHNICAL;
        break;
      case ApplicationStatus.OFFERED: this.stage = ApplicationStage.OFFER; break;
      case ApplicationStatus.HIRED: this.stage = ApplicationStage.HIRED; break;
    }
  }

  static getStatusFlow(): Record<ApplicationStatus, ApplicationStatus[]> {
    return {
      [ApplicationStatus.APPLIED]: [ApplicationStatus.SCREENING, ApplicationStatus.REJECTED],
      [ApplicationStatus.SCREENING]: [ApplicationStatus.INTERVIEWING, ApplicationStatus.REJECTED],
      [ApplicationStatus.INTERVIEWING]: [ApplicationStatus.OFFERED, ApplicationStatus.REJECTED],
      [ApplicationStatus.OFFERED]: [ApplicationStatus.HIRED, ApplicationStatus.REJECTED],
      [ApplicationStatus.HIRED]: [],
      [ApplicationStatus.REJECTED]: [],
      [ApplicationStatus.WITHDRAWN]: [],
    };
  }

  static getStageFlow(): Record<ApplicationStage, ApplicationStage[]> {
    return {
      [ApplicationStage.SCREENING]: [ApplicationStage.PHONE_SCREEN],
      [ApplicationStage.PHONE_SCREEN]: [ApplicationStage.TECHNICAL],
      [ApplicationStage.TECHNICAL]: [ApplicationStage.ONSITE],
      [ApplicationStage.ONSITE]: [ApplicationStage.FINAL],
      [ApplicationStage.FINAL]: [ApplicationStage.OFFER],
      [ApplicationStage.OFFER]: [ApplicationStage.HIRED],
      [ApplicationStage.HIRED]: [],
    };
  }

  canTransitionTo(newStatus: ApplicationStatus): boolean {
    return JobApplication.getStatusFlow()[this.status].includes(newStatus);
  }

  canAdvanceToStage(newStage: ApplicationStage): boolean {
    return JobApplication.getStageFlow()[this.stage].includes(newStage);
  }
}
