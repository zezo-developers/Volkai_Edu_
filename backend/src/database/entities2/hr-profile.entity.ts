import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../entities/user.entity';

export enum EmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  INTERN = 'intern',
  CONSULTANT = 'consultant',
}

@Entity('hr_profiles')
@Index(['employeeId'])
@Index(['department'])
@Index(['managerId'])
export class HRProfile {
  @ApiProperty({ description: 'HR Profile ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'User ID' })
  @Column({ name: 'user_id', unique: true })
  userId: string;

  @ApiProperty({ description: 'Employee ID' })
  @Column({ name: 'employee_id', length: 50, nullable: true })
  employeeId?: string;

  @ApiProperty({ description: 'Department' })
  @Column({ length: 100, nullable: true })
  department?: string;

  @ApiProperty({ description: 'Job position/title' })
  @Column({ length: 255, nullable: true })
  position?: string;

  @ApiProperty({ description: 'Manager user ID' })
  @Column({ name: 'manager_id', nullable: true })
  managerId?: string;

  @ApiProperty({ description: 'Hire date' })
  @Column({ name: 'hire_date', type: 'date', nullable: true })
  hireDate?: Date;

  @ApiProperty({ enum: EmploymentType, description: 'Employment type' })
  @Column({
    name: 'employment_type',
    type: 'enum',
    enum: EmploymentType,
    nullable: true,
  })
  employmentType?: EmploymentType;

  @ApiProperty({ description: 'Base salary' })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  salary?: number;

  @ApiProperty({ description: 'Salary currency' })
  @Column({ length: 3, default: 'USD' })
  currency: string;

  @ApiProperty({ description: 'Employee benefits' })
  @Column({ type: 'jsonb', default: {} })
  benefits: {
    healthInsurance?: {
      provider: string;
      plan: string;
      coverage: 'individual' | 'family';
      employerContribution: number;
    };
    retirement?: {
      plan: '401k' | 'pension' | 'other';
      employerMatch: number;
      vestingSchedule?: string;
    };
    timeOff?: {
      vacationDays: number;
      sickDays: number;
      personalDays: number;
      holidays: number;
    };
    other?: Array<{
      name: string;
      description: string;
      value?: string;
    }>;
  };

  @ApiProperty({ description: 'Emergency contact information' })
  @Column({ name: 'emergency_contact', type: 'jsonb', nullable: true })
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
    address?: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
  };

  @ApiProperty({ description: 'Employee documents' })
  @Column({ type: 'jsonb', default: {} })
  documents: {
    contracts?: Array<{
      id: string;
      name: string;
      type: 'employment' | 'nda' | 'offer_letter' | 'amendment';
      url: string;
      signedDate?: Date;
      expiryDate?: Date;
      status: 'pending' | 'signed' | 'expired';
    }>;
    certifications?: Array<{
      id: string;
      name: string;
      issuer: string;
      issueDate: Date;
      expiryDate?: Date;
      url?: string;
      verified: boolean;
    }>;
    reviews?: Array<{
      id: string;
      period: string;
      reviewDate: Date;
      reviewer: string;
      rating: number;
      url?: string;
      status: 'draft' | 'completed' | 'acknowledged';
    }>;
    other?: Array<{
      id: string;
      name: string;
      type: string;
      url: string;
      uploadDate: Date;
      category: 'personal' | 'legal' | 'training' | 'other';
    }>;
  };

  @ApiProperty({ description: 'Performance tracking data' })
  @Column({ name: 'performance_data', type: 'jsonb', default: {} })
  performanceData: {
    currentGoals?: Array<{
      id: string;
      title: string;
      description: string;
      category: 'individual' | 'team' | 'company';
      priority: 'low' | 'medium' | 'high';
      dueDate?: Date;
      progress: number; // 0-100
      status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
    }>;
    reviews?: Array<{
      id: string;
      period: string;
      type: 'annual' | 'quarterly' | 'monthly' | 'project';
      overallRating: number;
      competencies?: Record<string, number>;
      achievements?: string[];
      areasForImprovement?: string[];
      goals?: string[];
      reviewDate: Date;
      nextReviewDate?: Date;
    }>;
    feedback?: Array<{
      id: string;
      from: string;
      fromName: string;
      type: '360' | 'peer' | 'manager' | 'self';
      rating?: number;
      comments: string;
      date: Date;
      anonymous: boolean;
    }>;
    metrics?: {
      productivity?: number;
      quality?: number;
      collaboration?: number;
      innovation?: number;
      leadership?: number;
      lastUpdated?: Date;
    };
  };

  @ApiProperty({ description: 'Work schedule and preferences' })
  @Column({ name: 'work_schedule', type: 'jsonb', default: {} })
  workSchedule: {
    workingHours?: {
      monday?: { start: string; end: string; };
      tuesday?: { start: string; end: string; };
      wednesday?: { start: string; end: string; };
      thursday?: { start: string; end: string; };
      friday?: { start: string; end: string; };
      saturday?: { start: string; end: string; };
      sunday?: { start: string; end: string; };
    };
    timezone?: string;
    workLocation?: 'office' | 'remote' | 'hybrid';
    preferredWorkDays?: string[];
    flexibleHours?: boolean;
  };

  @ApiProperty({ description: 'Training and development' })
  @Column({ name: 'training_data', type: 'jsonb', default: {} })
  trainingData: {
    completedTraining?: Array<{
      id: string;
      name: string;
      provider: string;
      completionDate: Date;
      certificateUrl?: string;
      expiryDate?: Date;
      category: string;
    }>;
    plannedTraining?: Array<{
      id: string;
      name: string;
      provider: string;
      scheduledDate?: Date;
      priority: 'low' | 'medium' | 'high';
      status: 'planned' | 'enrolled' | 'in_progress' | 'completed';
    }>;
    skillDevelopment?: Array<{
      skill: string;
      currentLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
      targetLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
      deadline?: Date;
      resources?: string[];
    }>;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  // @OneToOne(() => User, user => user.hrProfile)
  // @JoinColumn({ name: 'user_id' })
  // user: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'manager_id' })
  manager?: User;

  @OneToMany(() => HRProfile, profile => profile.manager)
  directReports: HRProfile[];

  // Virtual properties
  get yearsOfService(): number {
    if (!this.hireDate) return 0;
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.hireDate.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365));
  }

  get isManager(): boolean {
    return this.directReports && this.directReports.length > 0;
  }

  get currentPerformanceRating(): number | null {
    if (!this.performanceData.reviews || this.performanceData.reviews.length === 0) {
      return null;
    }
    
    const latestReview = this.performanceData.reviews
      .sort((a, b) => new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime())[0];
    
    return latestReview.overallRating;
  }

  get nextReviewDate(): Date | null {
    if (!this.performanceData.reviews || this.performanceData.reviews.length === 0) {
      return null;
    }
    
    const latestReview = this.performanceData.reviews
      .sort((a, b) => new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime())[0];
    
    return latestReview.nextReviewDate || null;
  }

  get activeGoalsCount(): number {
    if (!this.performanceData.currentGoals) return 0;
    return this.performanceData.currentGoals.filter(
      goal => goal.status === 'in_progress' || goal.status === 'not_started'
    ).length;
  }

  // Methods
  updateSalary(newSalary: number, effectiveDate: Date, reason?: string): void {
    const oldSalary = this.salary;
    this.salary = newSalary;
    
    // Add to performance data for tracking
    if (!this.performanceData.reviews) {
      this.performanceData.reviews = [];
    }
    
    // This would typically be tracked in a separate salary history table
    this.addPerformanceNote(`Salary updated from ${oldSalary} to ${newSalary}. Reason: ${reason || 'Not specified'}`);
  }

  promote(newPosition: string, newDepartment?: string, effectiveDate?: Date): void {
    const oldPosition = this.position;
    const oldDepartment = this.department;
    
    this.position = newPosition;
    if (newDepartment) {
      this.department = newDepartment;
    }
    
    this.addPerformanceNote(
      `Promoted from ${oldPosition} to ${newPosition}${newDepartment && newDepartment !== oldDepartment ? ` in ${newDepartment}` : ''}`
    );
  }

  assignManager(managerId: string): void {
    this.managerId = managerId;
  }

  addGoal(goal: HRProfile['performanceData']['currentGoals'][0]): void {
    if (!this.performanceData.currentGoals) {
      this.performanceData.currentGoals = [];
    }
    
    this.performanceData.currentGoals.push({
      ...goal,
      id: `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    });
  }

  updateGoalProgress(goalId: string, progress: number, status?: string): void {
    if (!this.performanceData.currentGoals) return;
    
    const goal = this.performanceData.currentGoals.find(g => g.id === goalId);
    if (goal) {
      goal.progress = Math.max(0, Math.min(100, progress));
      if (status) {
        goal.status = status as any;
      }
      
      // Auto-complete if 100% progress
      if (progress >= 100 && goal.status !== 'completed') {
        goal.status = 'completed';
      }
    }
  }

  addPerformanceReview(review: HRProfile['performanceData']['reviews'][0]): void {
    if (!this.performanceData.reviews) {
      this.performanceData.reviews = [];
    }
    
    this.performanceData.reviews.push({
      ...review,
      id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    });
  }

  addFeedback(feedback: HRProfile['performanceData']['feedback'][0]): void {
    if (!this.performanceData.feedback) {
      this.performanceData.feedback = [];
    }
    
    this.performanceData.feedback.push({
      ...feedback,
      id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      date: new Date(),
    });
  }

  addDocument(document: {
    name: string;
    type: string;
    url: string;
    category: 'contracts' | 'certifications' | 'reviews' | 'other';
  }): void {
    const doc = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      uploadDate: new Date(),
      ...document,
    };

    if (!this.documents[document.category]) {
      this.documents[document.category] = [];
    }

    (this.documents[document.category] as any[]).push(doc);
  }

  addTraining(training: {
    name: string;
    provider: string;
    category: string;
    type: 'completed' | 'planned';
    completionDate?: Date;
    scheduledDate?: Date;
    certificateUrl?: string;
  }): void {
    const trainingRecord = {
      id: `training_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...training,
    };

    if (training.type === 'completed') {
      if (!this.trainingData.completedTraining) {
        this.trainingData.completedTraining = [];
      }
      this.trainingData.completedTraining.push({
        ...trainingRecord,
        completionDate: training.completionDate || new Date(),
      });
    } else {
      if (!this.trainingData.plannedTraining) {
        this.trainingData.plannedTraining = [];
      }
      this.trainingData.plannedTraining.push({
        ...trainingRecord,
        scheduledDate: training.scheduledDate,
        priority: 'medium',
        status: 'planned',
      });
    }
  }

  updateWorkSchedule(schedule: Partial<HRProfile['workSchedule']>): void {
    this.workSchedule = { ...this.workSchedule, ...schedule };
  }

  calculatePerformanceScore(): number {
    if (!this.performanceData.metrics) return 0;
    
    const metrics = this.performanceData.metrics;
    const scores = [
      metrics.productivity || 0,
      metrics.quality || 0,
      metrics.collaboration || 0,
      metrics.innovation || 0,
      metrics.leadership || 0,
    ].filter(score => score > 0);
    
    return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
  }

  getUpcomingReviewDate(): Date | null {
    if (!this.performanceData.reviews || this.performanceData.reviews.length === 0) {
      // If no reviews, schedule first review 90 days after hire date
      if (this.hireDate) {
        const reviewDate = new Date(this.hireDate);
        reviewDate.setDate(reviewDate.getDate() + 90);
        return reviewDate;
      }
      return null;
    }
    
    return this.nextReviewDate;
  }

  private addPerformanceNote(note: string): void {
    this.addFeedback({
      from: 'system',
      fromName: 'System',
      type: 'manager',
      comments: note,
      anonymous: false,
    } as any);
  }

  // Static helper methods
  static getDefaultBenefits(): HRProfile['benefits'] {
    return {
      healthInsurance: {
        provider: '',
        plan: '',
        coverage: 'individual',
        employerContribution: 0,
      },
      retirement: {
        plan: '401k',
        employerMatch: 0,
      },
      timeOff: {
        vacationDays: 15,
        sickDays: 10,
        personalDays: 3,
        holidays: 10,
      },
      other: [],
    };
  }

  static getDefaultWorkSchedule(): HRProfile['workSchedule'] {
    return {
      workingHours: {
        monday: { start: '09:00', end: '17:00' },
        tuesday: { start: '09:00', end: '17:00' },
        wednesday: { start: '09:00', end: '17:00' },
        thursday: { start: '09:00', end: '17:00' },
        friday: { start: '09:00', end: '17:00' },
      },
      timezone: 'UTC',
      workLocation: 'office',
      flexibleHours: false,
    };
  }
}
