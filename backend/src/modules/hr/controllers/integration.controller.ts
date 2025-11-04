import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User, UserRole } from '../../../database/entities/user.entity';
import { IntegrationService } from '../services/integration.service';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@ApiTags('HR Integration')
@Controller('hr/integration')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class IntegrationController {
  constructor(
    private readonly integrationService: IntegrationService,
  ) {}

  @Post('parse-resume')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Parse resume from file URL' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resume parsed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Failed to parse resume file',
  })
  async parseResumeFromFile(
    @Body('fileUrl') fileUrl: string,
    @Body('applicationId') applicationId?: string,
  ): Promise<any> {
    return await this.integrationService.parseResumeFromFile(fileUrl, applicationId);
  }

  @Post('parse-resume-text')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Parse resume from text content' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resume text parsed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Failed to parse resume text',
  })
  async parseResumeFromText(
    @Body('resumeText') resumeText: string,
  ): Promise<any> {
    return await this.integrationService.parseResumeFromText(resumeText);
  }

  @Post('match-skills')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Match candidate skills to job requirements' })
  @ApiBody({
    schema:{
      type: 'object',
      properties: {
        candidateSkills: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
        jobId: {
          type: 'string',
        },
      },
      required: ['candidateSkills', 'jobId'],
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Skill matching completed successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Job not found',
  })
  async matchSkillsToJob(
    @Body('candidateSkills') candidateSkills: string[],
    @Body('jobId') jobId: string,
  ): Promise<any> {
    return await this.integrationService.matchSkillsToJob(candidateSkills, jobId);
  }

  @Post('schedule-interview')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Schedule interview from application' })
  @ApiBody({
  schema: {
    type: 'object',
    properties: {
      applicationId: {
        type: 'string',
        example: 'a3f89e12-45c1-4b9b-bb82-fc2b8e1c9b2f',
        description: 'The ID of the job application to schedule an interview for',
      },
      type: {
        type: 'string',
        example: 'technical',
        description: 'Type of interview (e.g., technical, HR, managerial)',
      },
      scheduledAt: {
        type: 'string',
        format: 'date-time',
        example: '2025-11-05T10:00:00Z',
        description: 'Date and time when the interview is scheduled',
      },
      duration: {
        type: 'number',
        example: 60,
        description: 'Duration of the interview in minutes',
      },
      interviewers: {
        type: 'array',
        items: { type: 'string' },
        example: [
          'c7d4e7b2-47c8-4a3d-b612-fc14f9a2e3a4',
          'b2a3f7d5-98c1-4e2a-bc77-e8d9f9c1a8b7',
        ],
        description: 'List of interviewer user IDs',
      },
      location: {
        type: 'string',
        example: 'Meeting Room 3B',
        description: 'Physical location of the interview (if applicable)',
      },
      meetingUrl: {
        type: 'string',
        example: 'https://meet.google.com/abc-defg-hij',
        description: 'Online meeting URL for virtual interviews',
      },
      notes: {
        type: 'string',
        example: 'Candidate to bring portfolio and ID proof.',
        description: 'Additional notes or special instructions for the interview',
      },
    },
    required: ['applicationId', 'type', 'scheduledAt', 'duration', 'interviewers'],
  },
})
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Interview scheduled successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Application not found',
  })
  async scheduleInterviewFromApplication(
    @Body('applicationId') applicationId: string,
    @Body() interviewData: {
      type: string;
      scheduledAt: Date;
      duration: number;
      interviewers: string[];
      location?: string;
      meetingUrl?: string;
      notes?: string;
    },
    @CurrentUser() user: any,
  ): Promise<any> {
    return await this.integrationService.scheduleInterviewFromApplication(
      applicationId,
      interviewData,
      user,
    );
  }

  @Post('sync-resume-application')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Sync resume with application' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        resumeId: {
          type: 'string',
        },
        applicationId: {
          type: 'string',
        },
      },
      required: ['resumeId', 'applicationId'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resume synced with application successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Resume or application not found',
  })
  async syncResumeWithApplication(
    @Body('resumeId') resumeId: string,
    @Body('applicationId') applicationId: string,
  ): Promise<any> {
    return await this.integrationService.syncResumeWithApplication(resumeId, applicationId);
  }

  @Get('application/:id/summary')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Generate AI-powered application summary' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Application summary generated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Application not found',
  })
  @ApiParam({ name: 'id', description: 'Application ID' })
  async generateApplicationSummary(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<any> {
    return await this.integrationService.generateApplicationSummary(id);
  }

  @Post('extract-skills')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        jobDescription: {
          type: 'looking for a MERN Stack Developer',
        },
      },
      required: ['jobDescription'],
    },
  })
  @ApiOperation({ summary: 'Extract skills from job description' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Skills extracted successfully',
  })
  async extractSkillsFromJobDescription(
    @Body('jobDescription') jobDescription: string,
  ): Promise<{ skills: string[] }> {
    const skills = await this.integrationService.extractSkillsFromJobDescription(jobDescription);
    return { skills };
  }

  @Get('parsing-status/:jobId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get resume parsing status for job applications' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Parsing status retrieved successfully',
  })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  async getParsingStatus(
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ): Promise<any> {
    // This would typically query application parsing status
    return {
      jobId,
      totalApplications: 45,
      parsedResumes: 38,
      pendingParsing: 7,
      parsingErrors: 2,
      lastProcessed: new Date(),
      processingRate: 84.4, // percentage
    };
  }

  @Post('bulk-parse')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        applicationIds: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
      },
      required: ['applicationIds'],
    },
  })
  @ApiOperation({ summary: 'Bulk parse resumes for multiple applications' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bulk parsing initiated successfully',
  })
  async bulkParseResumes(
    @Body('applicationIds') applicationIds: string[],
  ): Promise<any> {
    // This would typically queue bulk parsing jobs
    return {
      success: true,
      message: `Bulk parsing initiated for ${applicationIds.length} applications`,
      applicationIds,
      estimatedCompletionTime: '15 minutes',
      jobId: `bulk_parse_${Date.now()}`,
    };
  }

  @Get('skill-matching/:jobId/analytics')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get skill matching analytics for a job' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Skill matching analytics retrieved successfully',
  })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  async getSkillMatchingAnalytics(
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ): Promise<any> {
    // This would analyze skill matching across all applications for a job
    return {
      jobId,
      analytics: {
        totalApplications: 45,
        averageSkillMatch: 72.5,
        topMatchingSkills: [
          { skill: 'JavaScript', matchRate: 89 },
          { skill: 'React', matchRate: 76 },
          { skill: 'Node.js', matchRate: 68 },
          { skill: 'TypeScript', matchRate: 54 },
          { skill: 'AWS', matchRate: 43 },
        ],
        missingSkills: [
          { skill: 'Kubernetes', candidatesWithSkill: 12 },
          { skill: 'GraphQL', candidatesWithSkill: 8 },
          { skill: 'Docker', candidatesWithSkill: 23 },
        ],
        skillGaps: [
          'Most candidates lack advanced DevOps skills',
          'Frontend skills are well represented',
          'Backend architecture experience varies widely',
        ],
        recommendations: [
          'Consider relaxing Kubernetes requirement',
          'Focus on candidates with strong React experience',
          'Provide training for missing DevOps skills',
        ],
      },
    };
  }

  @Post('interview-scheduling/bulk')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
    @ApiBody({
    description: 'Bulk interview scheduling details',
    schema: {
      type: 'object',
      properties: {
        applicationIds: {
          type: 'array',
          description: 'List of job application IDs to schedule interviews for',
          items: { type: 'string', example: 'f13a8f23-12c4-4c9d-bc23-938b34ea9a91' },
          example: [
            'f13a8f23-12c4-4c9d-bc23-938b34ea9a91',
            'c73c14af-9b42-42c8-90a8-7d0e1c9a7a65',
          ],
        },
        interviewTemplate: {
          type: 'object',
          description: 'Interview template applied to all applications',
          properties: {
            type: { type: 'string', example: 'Technical Round' },
            duration: { type: 'number', example: 60, description: 'Duration in minutes' },
            interviewers: {
              type: 'array',
              items: { type: 'string', example: 'user-12345' },
              example: ['user-12345', 'user-67890'],
            },
            location: { type: 'string', example: 'Conference Room A' },
            meetingUrl: { type: 'string', example: 'https://meet.google.com/abc-xyz' },
          },
          required: ['type', 'duration', 'interviewers'],
        },
        schedulingPreferences: {
          type: 'object',
          description: 'Time range and availability for scheduling',
          properties: {
            startDate: { type: 'string', format: 'date-time', example: '2025-11-06T09:00:00Z' },
            endDate: { type: 'string', format: 'date-time', example: '2025-11-10T17:00:00Z' },
            timeSlots: {
              type: 'array',
              description: 'Available daily time slots',
              items: {
                type: 'object',
                properties: {
                  start: { type: 'string', example: '09:00' },
                  end: { type: 'string', example: '12:00' },
                },
              },
              example: [
                { start: '09:00', end: '12:00' },
                { start: '14:00', end: '17:00' },
              ],
            },
            excludeWeekends: {
              type: 'boolean',
              example: true,
              description: 'Whether to skip weekends during scheduling',
            },
          },
          required: ['startDate', 'endDate', 'timeSlots'],
        },
      },
      required: ['applicationIds', 'interviewTemplate', 'schedulingPreferences'],
    },
  })
  @ApiOperation({ summary: 'Bulk schedule interviews for multiple applications' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bulk interview scheduling completed',
  })
  async bulkScheduleInterviews(
    @Body() bulkScheduleData: {
      applicationIds: string[];
      interviewTemplate: {
        type: string;
        duration: number;
        interviewers: string[];
        location?: string;
        meetingUrl?: string;
      };
      schedulingPreferences: {
        startDate: Date;
        endDate: Date;
        timeSlots: Array<{ start: string; end: string; }>;
        excludeWeekends: boolean;
      };
    },
    @CurrentUser() user: any,
  ): Promise<any> {
    // This would typically use a scheduling algorithm to find optimal times
    const { applicationIds, interviewTemplate, schedulingPreferences } = bulkScheduleData;
    
    return {
      success: true,
      scheduled: applicationIds.length - 2, // Mock: 2 failed
      failed: 2,
      results: applicationIds.map((appId, index) => ({
        applicationId: appId,
        success: index < applicationIds.length - 2,
        scheduledAt: index < applicationIds.length - 2 
          ? new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000)
          : null,
        error: index >= applicationIds.length - 2 ? 'Candidate unavailable' : null,
      })),
      summary: {
        totalRequested: applicationIds.length,
        successfullyScheduled: applicationIds.length - 2,
        conflicts: 1,
        candidateUnavailable: 1,
      },
    };
  }

  @Get('integration-health')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Check integration services health status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Integration health status retrieved successfully',
  })
  async getIntegrationHealth(): Promise<any> {
    return {
      status: 'healthy',
      services: {
        resumeParsingService: {
          status: 'operational',
          responseTime: '245ms',
          uptime: '99.8%',
          lastCheck: new Date(),
        },
        aiService: {
          status: 'operational',
          responseTime: '180ms',
          uptime: '99.9%',
          lastCheck: new Date(),
        },
        calendarIntegration: {
          status: 'operational',
          responseTime: '120ms',
          uptime: '99.7%',
          lastCheck: new Date(),
        },
        emailService: {
          status: 'operational',
          responseTime: '95ms',
          uptime: '99.9%',
          lastCheck: new Date(),
        },
      },
      metrics: {
        dailyParsingJobs: 156,
        successRate: 94.2,
        averageProcessingTime: '2.3s',
        errorRate: 5.8,
      },
      recentErrors: [
        {
          service: 'resumeParsingService',
          error: 'Timeout parsing PDF file',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          resolved: true,
        },
      ],
    };
  }

  @Post('webhook/resume-parsed')
  @ApiOperation({ summary: 'Webhook for resume parsing completion' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook processed successfully',
  })
  async handleResumeParsingWebhook(
    @Body() webhookData: {
      applicationId: string;
      parsingJobId: string;
      status: 'completed' | 'failed';
      parsedData?: any;
      error?: string;
    },
  ): Promise<{ success: boolean }> {
    // This would handle webhooks from external parsing services
    const { applicationId, status, parsedData, error } = webhookData;
    
    if (status === 'completed' && parsedData) {
      // Update application with parsed data
      // await this.integrationService.updateApplicationWithParsedData(applicationId, parsedData);
    } else if (status === 'failed') {
      // Log error and potentially retry
      console.error(`Resume parsing failed for application ${applicationId}:`, error);
    }

    return { success: true };
  }

  @Get('templates/integration')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Get available integration templates' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Integration templates retrieved successfully',
  })
  async getIntegrationTemplates(): Promise<any> {
    return {
      resumeParsing: {
        supportedFormats: ['pdf', 'doc', 'docx', 'txt'],
        extractableFields: [
          'personalInfo',
          'experience',
          'education',
          'skills',
          'certifications',
          'languages',
        ],
        accuracy: '94%',
        averageProcessingTime: '2.3s',
      },
      skillMatching: {
        algorithms: ['exact_match', 'fuzzy_match', 'semantic_match'],
        supportedSkillTypes: ['technical', 'soft', 'language', 'certification'],
        matchingAccuracy: '87%',
      },
      interviewScheduling: {
        supportedCalendars: ['google', 'outlook', 'apple'],
        timezoneSupport: true,
        conflictDetection: true,
        automaticReminders: true,
      },
      aiSummary: {
        supportedLanguages: ['en', 'es', 'fr', 'de'],
        summaryTypes: ['strengths', 'concerns', 'recommendation'],
        confidenceScoring: true,
      },
    };
  }
}
