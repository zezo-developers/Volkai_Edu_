import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../entities/user.entity';
import { Organization } from './organization.entity';

export enum EventType {
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_REGISTRATION = 'user_registration',
  USER_PROFILE_UPDATE = 'user_profile_update',
  USER_PASSWORD_CHANGE = 'user_password_change',
  COURSE_VIEW = 'course_view',
  COURSE_ENROLLMENT = 'course_enrollment',
  COURSE_COMPLETION = 'course_completion',
  LESSON_START = 'lesson_start',
  LESSON_COMPLETE = 'lesson_complete',
  ASSESSMENT_START = 'assessment_start',
  ASSESSMENT_SUBMIT = 'assessment_submit',
  ASSESSMENT_COMPLETE = 'assessment_complete',
  INTERVIEW_SCHEDULE = 'interview_schedule',
  INTERVIEW_START = 'interview_start',
  INTERVIEW_COMPLETE = 'interview_complete',
  AI_INTERVIEW_START = 'ai_interview_start',
  AI_INTERVIEW_COMPLETE = 'ai_interview_complete',
  RESUME_CREATE = 'resume_create',
  RESUME_UPDATE = 'resume_update',
  RESUME_DOWNLOAD = 'resume_download',
  RESUME_SHARE = 'resume_share',
  JOB_VIEW = 'job_view',
  JOB_APPLICATION = 'job_application',
  JOB_BOOKMARK = 'job_bookmark',
  SUBSCRIPTION_CREATE = 'subscription_create',
  SUBSCRIPTION_UPGRADE = 'subscription_upgrade',
  SUBSCRIPTION_CANCEL = 'subscription_cancel',
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',
  API_REQUEST = 'api_request',
  ERROR_OCCURRED = 'error_occurred',
  FEATURE_USAGE = 'feature_usage',
  EXPORT_DATA = 'export_data',
  LOGIN_FAILED = 'login_failed',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  PERMISSION_DENIED = 'permission_denied',
  CONTENT_CREATE = 'content_create',
  CONTENT_UPDATE = 'content_update',
  CONTENT_DELETE = 'content_delete',
  CONTENT_MODERATE = 'content_moderate',
}

export enum EventCategory {
  USER = 'user',
  LEARNING = 'learning',
  ASSESSMENT = 'assessment',
  INTERVIEW = 'interview',
  RESUME = 'resume',
  JOB = 'job',
  BILLING = 'billing',
  SYSTEM = 'system',
  SECURITY = 'security',
  CONTENT = 'content',
}

@Entity('analytics_events')
@Index(['eventType', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['organizationId', 'createdAt'])
@Index(['category', 'createdAt'])
@Index(['sessionId'])
@Index(['ipAddress'])
export class AnalyticsEvent {
  @ApiProperty({ description: 'Event ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ enum: EventType, description: 'Type of event' })
  @Column({
    type: 'enum',
    enum: EventType,
  })
  eventType: EventType;

  @ApiProperty({ enum: EventCategory, description: 'Event category', nullable:true })
  @Column({
    type: 'enum',
    enum: EventCategory,
  })
  category: EventCategory;

  @ApiProperty({ description: 'User ID (nullable for anonymous events)' })
  @Column({ name: 'userId', nullable: true })
  userId?: string;

  @ApiProperty({ description: 'Organization ID (nullable for system events)' })
  @Column({ name: 'organizationId', nullable: true })
  organizationId?: string;

  @ApiProperty({ description: 'Session ID for tracking user sessions' })
  @Column({ name: 'sessionId', nullable: true })
  sessionId?: string;

  @ApiProperty({ description: 'IP address of the user' })
  @Column({ name: 'ipAddress', nullable: true })
  ipAddress?: string;

  @ApiProperty({ description: 'User agent string' })
  @Column({ name: 'userAgent', type: 'text', nullable: true })
  userAgent?: string;

  @ApiProperty({ description: 'Referrer URL' })
  @Column({ type: 'text', nullable: true })
  referrer?: string;

  @ApiProperty({ description: 'Event properties and metadata' })
  @Column({ type: 'jsonb', default: {} })
  properties: {
    duration?: number;
    success?: boolean;
    errorCode?: string;
    errorMessage?: string;
    resourceId?: string;
    resourceType?: string;
    resourceName?: string;
    userRole?: string;
    userPlan?: string;
    userTier?: string;
    device?: string;
    browser?: string;
    os?: string;
    screenResolution?: string;
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
    responseTime?: number;
    loadTime?: number;
    renderTime?: number;
    revenue?: number;
    conversionValue?: number;
    [key: string]: any;
  };

  @ApiProperty({ description: 'Additional context data' })
  @Column({ type: 'jsonb', default: {} })
  context: {
    page?: {
      url: string;
      title: string;
      path: string;
      search: string;
    };
    campaign?: {
      source: string;
      medium: string;
      name: string;
      term?: string;
      content?: string;
    };
    experiments?: Array<{
      id: string;
      variant: string;
    }>;
    features?: Record<string, boolean>;
    [key: string]: any;
  };

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'organizationId' })
  organization?: Organization;

  get isUserEvent(): boolean {
    return this.category === EventCategory.USER;
  }

  get isLearningEvent(): boolean {
    return [
      EventCategory.LEARNING,
      EventCategory.ASSESSMENT,
    ].includes(this.category);
  }

  get isBusinessEvent(): boolean {
    return [
      EventCategory.JOB,
      EventCategory.BILLING,
      EventCategory.INTERVIEW,
      EventCategory.RESUME,
    ].includes(this.category);
  }

  get isSystemEvent(): boolean {
    return [
      EventCategory.SYSTEM,
      EventCategory.SECURITY,
    ].includes(this.category);
  }

  get hasError(): boolean {
    return !!this.properties.errorCode || this.properties.success === false;
  }

  get duration(): number | null {
    return this.properties.duration || null;
  }

  get isConversion(): boolean {
    return [
      EventType.USER_REGISTRATION,
      EventType.COURSE_ENROLLMENT,
      EventType.SUBSCRIPTION_CREATE,
      EventType.JOB_APPLICATION,
    ].includes(this.eventType);
  }

  addProperty(key: string, value: any): void {
    this.properties[key] = value;
  }

  addContext(key: string, value: any): void {
    this.context[key] = value;
  }

  setDuration(startTime: Date, endTime: Date = new Date()): void {
    this.properties.duration = endTime.getTime() - startTime.getTime();
  }

  setError(errorCode: string, errorMessage?: string): void {
    this.properties.success = false;
    this.properties.errorCode = errorCode;
    if (errorMessage) {
      this.properties.errorMessage = errorMessage;
    }
  }

  setSuccess(): void {
    this.properties.success = true;
  }

  setRevenue(amount: number, currency: string = 'USD'): void {
    this.properties.revenue = amount;
    this.properties.currency = currency;
  }

  setUserContext(user: User): void {
    this.userId = user.id;
    this.properties.userRole = user.roles?.[0];
  }

  setPageContext(url: string, title?: string): void {
    const urlObj = new URL(url);
    this.context.page = {
      url,
      title: title || '',
      path: urlObj.pathname,
      search: urlObj.search,
    };
  }

  setCampaignContext(source: string, medium: string, campaign: string): void {
    this.context.campaign = {
      source,
      medium,
      name: campaign,
    };
  }

  addExperiment(experimentId: string, variant: string): void {
    if (!this.context.experiments) {
      this.context.experiments = [];
    }
    this.context.experiments.push({
      id: experimentId,
      variant,
    });
  }

  setFeatureFlag(feature: string, enabled: boolean): void {
    if (!this.context.features) {
      this.context.features = {};
    }
    this.context.features[feature] = enabled;
  }

  static createUserEvent(
    eventType: EventType,
    userId: string,
    properties?: Record<string, any>
  ): Partial<AnalyticsEvent> {
    return {
      eventType,
      category: EventCategory.USER,
      userId,
      properties: properties || {},
      context: {},
    };
  }

  static createLearningEvent(
    eventType: EventType,
    userId: string,
    resourceId: string,
    resourceType: string,
    properties?: Record<string, any>
  ): Partial<AnalyticsEvent> {
    return {
      eventType,
      category: EventCategory.LEARNING,
      userId,
      properties: {
        resourceId,
        resourceType,
        ...properties,
      },
      context: {},
    };
  }

  static createSystemEvent(
    eventType: EventType,
    properties?: Record<string, any>
  ): Partial<AnalyticsEvent> {
    return {
      eventType,
      category: EventCategory.SYSTEM,
      properties: properties || {},
      context: {},
    };
  }

  static createSecurityEvent(
    eventType: EventType,
    ipAddress: string,
    userAgent?: string,
    properties?: Record<string, any>
  ): Partial<AnalyticsEvent> {
    return {
      eventType,
      category: EventCategory.SECURITY,
      ipAddress,
      userAgent,
      properties: properties || {},
      context: {},
    };
  }

  static createBillingEvent(
    eventType: EventType,
    userId: string,
    organizationId: string,
    properties?: Record<string, any>
  ): Partial<AnalyticsEvent> {
    return {
      eventType,
      category: EventCategory.BILLING,
      userId,
      organizationId,
      properties: properties || {},
      context: {},
    };
  }

  static pageView(
    userId: string,
    url: string,
    title?: string,
    referrer?: string
  ): Partial<AnalyticsEvent> {
    const event = this.createUserEvent(EventType.COURSE_VIEW, userId);
    event.referrer = referrer;
    if (event.context) {
      event.context.page = {
        url,
        title: title || '',
        path: new URL(url).pathname,
        search: new URL(url).search,
      };
    }
    return event;
  }

  static apiRequest(
    method: string,
    endpoint: string,
    statusCode: number,
    responseTime: number,
    userId?: string
  ): Partial<AnalyticsEvent> {
    return this.createSystemEvent(EventType.API_REQUEST, {
      method,
      endpoint,
      statusCode,
      responseTime,
      success: statusCode < 400,
      userId,
    });
  }

  static error(
    errorCode: string,
    errorMessage: string,
    userId?: string,
    context?: Record<string, any>
  ): Partial<AnalyticsEvent> {
    return {
      eventType: EventType.ERROR_OCCURRED,
      category: EventCategory.SYSTEM,
      userId,
      properties: {
        errorCode,
        errorMessage,
        success: false,
      },
      context: context || {},
    };
  }
}
