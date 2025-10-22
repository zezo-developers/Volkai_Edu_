import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobQueueService, JobData, JobResult } from '../services/job-queue.service';
import * as Bull from 'bull';

export interface EmailJobData {
  to: string | string[];
  subject: string;
  template: string;
  data: Record<string, any>;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

/**
 * Email Job Processor
 * Handles all email-related background jobs
 */
@Injectable()
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly jobQueueService: JobQueueService,
    private readonly configService: ConfigService,
  ) {
    this.registerProcessors();
  }

  private registerProcessors(): void {
    // Welcome email for new users
    this.jobQueueService.registerProcessor('email', 'welcome-email', this.processWelcomeEmail.bind(this));
    
    // Password reset emails
    this.jobQueueService.registerProcessor('email', 'password-reset', this.processPasswordReset.bind(this));
    
    // Course completion certificates
    this.jobQueueService.registerProcessor('email', 'completion-certificate', this.processCompletionCertificate.bind(this));
    
    // Course enrollment confirmations
    this.jobQueueService.registerProcessor('email', 'enrollment-confirmation', this.processEnrollmentConfirmation.bind(this));
    
    // Weekly digest emails
    this.jobQueueService.registerProcessor('email', 'weekly-digest', this.processWeeklyDigest.bind(this));
    
    // Organization invitations
    this.jobQueueService.registerProcessor('email', 'organization-invitation', this.processOrganizationInvitation.bind(this));
    
    // Course reminders
    this.jobQueueService.registerProcessor('email', 'course-reminder', this.processCourseReminder.bind(this));
    
    // System notifications
    this.jobQueueService.registerProcessor('email', 'system-notification', this.processSystemNotification.bind(this));
  }

  /**
   * Process welcome email for new users
   */
  private async processWelcomeEmail(job: Bull.Job<JobData>): Promise<JobResult> {
    const startTime = Date.now();
    
    try {
      const { userId, email, firstName } = job.data.payload;
      
      await job.progress(10);
      await job.log('Preparing welcome email template');

      const emailData: EmailJobData = {
        to: email,
        subject: 'Welcome to Volkai HR Edu!',
        template: 'welcome',
        data: {
          firstName,
          userId,
          loginUrl: `${this.configService.get('FRONTEND_URL')}/login`,
          supportEmail: this.configService.get('SUPPORT_EMAIL', 'support@volkai.com'),
        },
      };

      await job.progress(50);
      await job.log('Sending welcome email');

      const result = await this.sendEmail(emailData);

      await job.progress(100);
      await job.log('Welcome email sent successfully');

      return {
        success: true,
        data: { messageId: result.messageId, recipient: email },
        duration: Date.now() - startTime,
        completedAt: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to process welcome email:', error);
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        completedAt: new Date(),
      };
    }
  }

  /**
   * Process password reset email
   */
  private async processPasswordReset(job: Bull.Job<JobData>): Promise<JobResult> {
    const startTime = Date.now();
    
    try {
      const { email, firstName, resetToken, expiresAt } = job.data.payload;
      
      await job.progress(20);
      
      const emailData: EmailJobData = {
        to: email,
        subject: 'Password Reset Request - Volkai HR Edu',
        template: 'password-reset',
        data: {
          firstName,
          resetUrl: `${this.configService.get('FRONTEND_URL')}/reset-password?token=${resetToken}`,
          expiresAt: new Date(expiresAt).toLocaleString(),
          supportEmail: this.configService.get('SUPPORT_EMAIL'),
        },
      };

      await job.progress(70);
      const result = await this.sendEmail(emailData);

      await job.progress(100);

      return {
        success: true,
        data: { messageId: result.messageId },
        duration: Date.now() - startTime,
        completedAt: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to process password reset email:', error);
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        completedAt: new Date(),
      };
    }
  }

  /**
   * Process course completion certificate email
   */
  private async processCompletionCertificate(job: Bull.Job<JobData>): Promise<JobResult> {
    const startTime = Date.now();
    
    try {
      const { userId, courseId, certificateId } = job.data.payload;
      
      await job.progress(10);
      await job.log('Fetching user and course data');

      // Mock data - in real implementation, fetch from database
      const userData = { email: 'user@example.com', firstName: 'John' };
      const courseData = { title: 'Advanced JavaScript', instructor: 'Jane Doe' };
      
      await job.progress(30);
      await job.log('Generating certificate PDF');

      // Generate certificate PDF (mock)
      const certificatePdf = await this.generateCertificatePdf(userData, courseData, certificateId);
      
      await job.progress(70);

      const emailData: EmailJobData = {
        to: userData.email,
        subject: `Congratulations! Course Completion Certificate - ${courseData.title}`,
        template: 'completion-certificate',
        data: {
          firstName: userData.firstName,
          courseTitle: courseData.title,
          instructor: courseData.instructor,
          completionDate: new Date().toLocaleDateString(),
          certificateId,
        },
        attachments: [{
          filename: `certificate-${certificateId}.pdf`,
          content: certificatePdf,
          contentType: 'application/pdf',
        }],
      };

      const result = await this.sendEmail(emailData);

      await job.progress(100);
      await job.log('Certificate email sent successfully');

      return {
        success: true,
        data: { messageId: result.messageId, certificateId },
        duration: Date.now() - startTime,
        completedAt: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to process completion certificate:', error);
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        completedAt: new Date(),
      };
    }
  }

  /**
   * Process enrollment confirmation email
   */
  private async processEnrollmentConfirmation(job: Bull.Job<JobData>): Promise<JobResult> {
    const startTime = Date.now();
    
    try {
      const { userId, courseId, enrollmentId } = job.data.payload;
      
      await job.progress(20);

      // Mock data
      const userData = { email: 'user@example.com', firstName: 'John' };
      const courseData = { 
        title: 'Advanced JavaScript', 
        instructor: 'Jane Doe',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        duration: '6 weeks',
      };

      const emailData: EmailJobData = {
        to: userData.email,
        subject: `Enrollment Confirmed - ${courseData.title}`,
        template: 'enrollment-confirmation',
        data: {
          firstName: userData.firstName,
          courseTitle: courseData.title,
          instructor: courseData.instructor,
          startDate: courseData.startDate.toLocaleDateString(),
          duration: courseData.duration,
          courseUrl: `${this.configService.get('FRONTEND_URL')}/courses/${courseId}`,
          enrollmentId,
        },
      };

      await job.progress(80);
      const result = await this.sendEmail(emailData);

      await job.progress(100);

      return {
        success: true,
        data: { messageId: result.messageId },
        duration: Date.now() - startTime,
        completedAt: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to process enrollment confirmation:', error);
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        completedAt: new Date(),
      };
    }
  }

  /**
   * Process weekly digest email
   */
  private async processWeeklyDigest(job: Bull.Job<JobData>): Promise<JobResult> {
    const startTime = Date.now();
    
    try {
      const { userId } = job.data.payload;
      
      await job.progress(10);
      await job.log('Gathering weekly activity data');

      // Mock weekly digest data
      const digestData = {
        coursesCompleted: 2,
        lessonsWatched: 15,
        timeSpent: '8 hours 30 minutes',
        achievements: ['JavaScript Expert', 'Quick Learner'],
        recommendedCourses: [
          { title: 'React Fundamentals', instructor: 'John Smith' },
          { title: 'Node.js Mastery', instructor: 'Sarah Johnson' },
        ],
        upcomingDeadlines: [
          { course: 'Advanced JavaScript', assignment: 'Final Project', dueDate: '2024-01-20' },
        ],
      };

      const userData = { email: 'user@example.com', firstName: 'John' };

      await job.progress(50);

      const emailData: EmailJobData = {
        to: userData.email,
        subject: 'Your Weekly Learning Digest - Volkai HR Edu',
        template: 'weekly-digest',
        data: {
          firstName: userData.firstName,
          weekOf: new Date().toLocaleDateString(),
          ...digestData,
          dashboardUrl: `${this.configService.get('FRONTEND_URL')}/dashboard`,
        },
      };

      await job.progress(80);
      const result = await this.sendEmail(emailData);

      await job.progress(100);

      return {
        success: true,
        data: { messageId: result.messageId },
        duration: Date.now() - startTime,
        completedAt: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to process weekly digest:', error);
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        completedAt: new Date(),
      };
    }
  }

  /**
   * Process organization invitation email
   */
  private async processOrganizationInvitation(job: Bull.Job<JobData>): Promise<JobResult> {
    const startTime = Date.now();
    
    try {
      const { email, organizationName, inviterName, inviteToken } = job.data.payload;
      
      await job.progress(30);

      const emailData: EmailJobData = {
        to: email,
        subject: `Invitation to join ${organizationName} - Volkai HR Edu`,
        template: 'organization-invitation',
        data: {
          organizationName,
          inviterName,
          acceptUrl: `${this.configService.get('FRONTEND_URL')}/invite/accept?token=${inviteToken}`,
          declineUrl: `${this.configService.get('FRONTEND_URL')}/invite/decline?token=${inviteToken}`,
          expiresIn: '7 days',
        },
      };

      await job.progress(80);
      const result = await this.sendEmail(emailData);

      await job.progress(100);

      return {
        success: true,
        data: { messageId: result.messageId },
        duration: Date.now() - startTime,
        completedAt: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to process organization invitation:', error);
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        completedAt: new Date(),
      };
    }
  }

  /**
   * Process course reminder email
   */
  private async processCourseReminder(job: Bull.Job<JobData>): Promise<JobResult> {
    const startTime = Date.now();
    
    try {
      const { userId, courseId, reminderType } = job.data.payload;
      
      await job.progress(20);

      const userData = { email: 'user@example.com', firstName: 'John' };
      const courseData = { title: 'Advanced JavaScript', nextLesson: 'Async/Await Patterns' };

      let subject: string;
      let templateData: any;

      switch (reminderType) {
        case 'lesson-due':
          subject = `Don't forget your lesson - ${courseData.title}`;
          templateData = {
            reminderType: 'lesson',
            courseTitle: courseData.title,
            nextLesson: courseData.nextLesson,
            continueUrl: `${this.configService.get('FRONTEND_URL')}/courses/${courseId}/continue`,
          };
          break;
        
        case 'course-deadline':
          subject = `Course deadline approaching - ${courseData.title}`;
          templateData = {
            reminderType: 'deadline',
            courseTitle: courseData.title,
            daysLeft: 3,
            courseUrl: `${this.configService.get('FRONTEND_URL')}/courses/${courseId}`,
          };
          break;
        
        default:
          subject = `Course update - ${courseData.title}`;
          templateData = {
            reminderType: 'general',
            courseTitle: courseData.title,
          };
      }

      const emailData: EmailJobData = {
        to: userData.email,
        subject,
        template: 'course-reminder',
        data: {
          firstName: userData.firstName,
          ...templateData,
        },
      };

      await job.progress(80);
      const result = await this.sendEmail(emailData);

      await job.progress(100);

      return {
        success: true,
        data: { messageId: result.messageId, reminderType },
        duration: Date.now() - startTime,
        completedAt: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to process course reminder:', error);
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        completedAt: new Date(),
      };
    }
  }

  /**
   * Process system notification email
   */
  private async processSystemNotification(job: Bull.Job<JobData>): Promise<JobResult> {
    const startTime = Date.now();
    
    try {
      const { recipients, notificationType, data } = job.data.payload;
      
      await job.progress(20);

      let subject: string;
      let template: string;

      switch (notificationType) {
        case 'maintenance':
          subject = 'Scheduled Maintenance - Volkai HR Edu';
          template = 'system-maintenance';
          break;
        case 'feature-announcement':
          subject = 'New Features Available - Volkai HR Edu';
          template = 'feature-announcement';
          break;
        case 'security-alert':
          subject = 'Important Security Update - Volkai HR Edu';
          template = 'security-alert';
          break;
        default:
          subject = 'System Notification - Volkai HR Edu';
          template = 'system-notification';
      }

      const emailData: EmailJobData = {
        to: recipients,
        subject,
        template,
        data: {
          notificationType,
          ...data,
          supportEmail: this.configService.get('SUPPORT_EMAIL'),
        },
      };

      await job.progress(80);
      const result = await this.sendEmail(emailData);

      await job.progress(100);

      return {
        success: true,
        data: { messageId: result.messageId, recipientCount: Array.isArray(recipients) ? recipients.length : 1 },
        duration: Date.now() - startTime,
        completedAt: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to process system notification:', error);
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        completedAt: new Date(),
      };
    }
  }

  // Private helper methods

  private async sendEmail(emailData: EmailJobData): Promise<{ messageId: string }> {
    // Mock email sending - in real implementation, use a service like SendGrid, AWS SES, etc.
    this.logger.log(`Sending email to ${emailData.to}: ${emailData.subject}`);
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Simulate occasional failures for testing
    if (Math.random() < 0.05) { // 5% failure rate
      throw new Error('Email service temporarily unavailable');
    }
    
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.logger.log(`Email sent successfully with message ID: ${messageId}`);
    
    return { messageId };
  }

  private async generateCertificatePdf(
    userData: any,
    courseData: any,
    certificateId: string,
  ): Promise<Buffer> {
    // Mock PDF generation - in real implementation, use a library like PDFKit or Puppeteer
    this.logger.log(`Generating certificate PDF for ${userData.firstName} - ${courseData.title}`);
    
    // Simulate PDF generation delay
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
    
    // Return mock PDF content
    const pdfContent = `Certificate of Completion
    
This certifies that ${userData.firstName} has successfully completed the course:
${courseData.title}

Instructor: ${courseData.instructor}
Completion Date: ${new Date().toLocaleDateString()}
Certificate ID: ${certificateId}

Volkai HR Edu Platform`;
    
    return Buffer.from(pdfContent, 'utf8');
  }
}
