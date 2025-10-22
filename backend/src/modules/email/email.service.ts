import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Email template interface
 */
export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

/**
 * Email options interface
 */
export interface EmailOptions {
  to: string | string[];
  subject: string;
  template?: string;
  context?: Record<string, any>;
  html?: string;
  text?: string;
  from?: string;
  fromName?: string;
}

/**
 * Email Service
 * Handles email sending with template support using SendGrid
 * Implements comprehensive error handling and logging
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly templatesCache = new Map<string, Handlebars.TemplateDelegate>();

  constructor(private readonly configService: ConfigService) {
    // Initialize SendGrid
    const apiKey = this.configService.get<string>('email.sendgridApiKey');
    if (apiKey) {
      sgMail.setApiKey(apiKey);
      this.logger.log('SendGrid initialized successfully');
    } else {
      this.logger.warn('SendGrid API key not configured - email functionality disabled');
    }
  }

  /**
   * Send email with template or direct content
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const {
        to,
        subject,
        template,
        context = {},
        html,
        text,
        from,
        fromName,
      } = options;

      let emailHtml = html;
      let emailText = text;

      // Use template if specified
      if (template) {
        const templateContent = await this.renderTemplate(template, context);
        emailHtml = templateContent.html;
        emailText = templateContent.text || this.stripHtml(templateContent.html);
      }

      // Prepare email data
      const emailData = {
        to: Array.isArray(to) ? to : [to],
        from: {
          email: from || this.configService.get<string>('email.from'),
          name: fromName || this.configService.get<string>('email.fromName'),
        },
        subject,
        html: emailHtml,
        text: emailText,
      };

      // Send email via SendGrid
      await sgMail.send(emailData);

      this.logger.log(`Email sent successfully to: ${Array.isArray(to) ? to.join(', ') : to}`);
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(
    email: string,
    firstName: string,
    verificationToken?: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const verificationUrl = verificationToken
      ? `${frontendUrl}/verify-email?token=${verificationToken}`
      : null;

    await this.sendEmail({
      to: email,
      subject: 'Welcome to Volkai HR Edu!',
      template: 'welcome',
      context: {
        firstName,
        verificationUrl,
        frontendUrl,
      },
    });
  }

  /**
   * Send email verification email
   */
  async sendEmailVerification(
    email: string,
    firstName: string,
    verificationToken: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

    await this.sendEmail({
      to: email,
      subject: 'Verify Your Email Address',
      template: 'email-verification',
      context: {
        firstName,
        verificationUrl,
        frontendUrl,
      },
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(
    email: string,
    firstName: string,
    resetToken: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    await this.sendEmail({
      to: email,
      subject: 'Reset Your Password',
      template: 'password-reset',
      context: {
        firstName,
        resetUrl,
        frontendUrl,
      },
    });
  }

  /**
   * Send organization invitation email
   */
  async sendOrganizationInvitation(
    email: string,
    organizationName: string,
    inviterName: string,
    role: string,
    invitationToken: string,
    message?: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const invitationUrl = `${frontendUrl}/accept-invitation?token=${invitationToken}`;

    await this.sendEmail({
      to: email,
      subject: `Invitation to join ${organizationName}`,
      template: 'organization-invitation',
      context: {
        organizationName,
        inviterName,
        role,
        invitationUrl,
        message,
        frontendUrl,
      },
    });
  }

  /**
   * Send interview scheduled notification
   */
  async sendInterviewScheduled(
    email: string,
    candidateName: string,
    interviewerName: string,
    jobTitle: string,
    scheduledAt: Date,
    meetingUrl?: string,
  ): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `Interview Scheduled - ${jobTitle}`,
      template: 'interview-scheduled',
      context: {
        candidateName,
        interviewerName,
        jobTitle,
        scheduledAt: scheduledAt.toLocaleString(),
        meetingUrl,
      },
    });
  }

  /**
   * Send course enrollment confirmation
   */
  async sendCourseEnrollment(
    email: string,
    studentName: string,
    courseTitle: string,
    courseUrl: string,
  ): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `Enrolled in ${courseTitle}`,
      template: 'course-enrollment',
      context: {
        studentName,
        courseTitle,
        courseUrl,
      },
    });
  }

  /**
   * Send certificate earned notification
   */
  async sendCertificateEarned(
    email: string,
    studentName: string,
    courseTitle: string,
    certificateUrl: string,
  ): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `Certificate Earned - ${courseTitle}`,
      template: 'certificate-earned',
      context: {
        studentName,
        courseTitle,
        certificateUrl,
      },
    });
  }

  /**
   * Render email template with context
   */
  private async renderTemplate(
    templateName: string,
    context: Record<string, any>,
  ): Promise<EmailTemplate> {
    try {
      // Check cache first
      let template = this.templatesCache.get(templateName);

      if (!template) {
        // Load template from file
        const templatePath = path.join(
          __dirname,
          '..',
          '..',
          '..',
          'templates',
          'email',
          `${templateName}.hbs`,
        );

        if (!fs.existsSync(templatePath)) {
          throw new Error(`Email template not found: ${templateName}`);
        }

        const templateContent = fs.readFileSync(templatePath, 'utf8');
        template = Handlebars.compile(templateContent);

        // Cache compiled template
        this.templatesCache.set(templateName, template);
      }

      // Render template with context
      const html = template(context);

      // Extract subject from template (if present in frontmatter)
      const subjectMatch = html.match(/<!--\s*subject:\s*(.+?)\s*-->/);
      const subject = subjectMatch ? subjectMatch[1] : 'Volkai HR Edu Notification';

      // Remove frontmatter from HTML
      const cleanHtml = html.replace(/<!--\s*subject:\s*.+?\s*-->/, '').trim();

      return {
        subject,
        html: cleanHtml,
        text: this.stripHtml(cleanHtml),
      };
    } catch (error) {
      this.logger.error(`Failed to render email template ${templateName}:`, error);
      throw error;
    }
  }

  /**
   * Strip HTML tags to create plain text version
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration(): Promise<boolean> {
    try {
      const testEmail = this.configService.get<string>('email.from');
      
      await this.sendEmail({
        to: testEmail,
        subject: 'Email Configuration Test',
        html: '<p>This is a test email to verify email configuration.</p>',
        text: 'This is a test email to verify email configuration.',
      });

      return true;
    } catch (error) {
      this.logger.error('Email configuration test failed:', error);
      return false;
    }
  }
}
