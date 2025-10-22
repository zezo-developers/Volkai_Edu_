import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiProduces,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../../database/entities/user.entity';
import { PdfExportService } from '../services/pdf-export.service';
import {
  ExportResumeDto,
  ExportResponseDto,
  ResumePreviewDto,
} from '../dto/pdf-export.dto';

@ApiTags('Resume PDF Export')
@Controller('resume/export')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PdfExportController {
  constructor(
    private readonly pdfExportService: PdfExportService,
  ) {}

  @Post(':id/pdf')
  @ApiOperation({ summary: 'Export resume to PDF' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resume exported to PDF successfully',
    type: ExportResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Resume not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  @ApiParam({ name: 'id', description: 'Resume ID' })
  async exportToPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) exportDto: ExportResumeDto,
    @CurrentUser() user: User,
  ): Promise<ExportResponseDto> {
    return await this.pdfExportService.exportResumeToPdf(id, exportDto, user);
  }

  @Post(':id/pdf/ats')
  @ApiOperation({ summary: 'Export resume to ATS-optimized PDF' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'ATS-optimized PDF generated successfully',
    type: ExportResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Resume not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  @ApiParam({ name: 'id', description: 'Resume ID' })
  async exportToATSPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<ExportResponseDto> {
    return await this.pdfExportService.generateATSOptimizedPdf(id, user);
  }

  @Get(':id/preview')
  @ApiOperation({ summary: 'Get resume preview data' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resume preview generated successfully',
    type: ResumePreviewDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Resume not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  @ApiParam({ name: 'id', description: 'Resume ID' })
  async getResumePreview(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<ResumePreviewDto> {
    return await this.pdfExportService.generateResumePreview(id, user);
  }

  @Get('download/:filename')
  @ApiOperation({ summary: 'Download generated PDF file' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'PDF file downloaded successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'File not found',
  })
  @ApiProduces('application/pdf')
  @ApiParam({ name: 'filename', description: 'PDF filename' })
  async downloadPdf(
    @Param('filename') filename: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const pdfBuffer = await this.pdfExportService.downloadResumePdf(filename);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
    });

    return new StreamableFile(pdfBuffer);
  }

  @Get(':id/formats')
  @ApiOperation({ summary: 'Get available export formats for resume' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Available export formats retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        formats: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              format: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              features: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
  })
  @ApiParam({ name: 'id', description: 'Resume ID' })
  async getAvailableFormats(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<any> {
    // This would check resume template and user permissions
    return {
      formats: [
        {
          format: 'pdf',
          name: 'PDF Document',
          description: 'Standard PDF format suitable for printing and sharing',
          features: ['High quality', 'Professional formatting', 'Universal compatibility'],
        },
        {
          format: 'pdf-ats',
          name: 'ATS-Optimized PDF',
          description: 'PDF optimized for Applicant Tracking Systems',
          features: ['ATS-friendly', 'Simple formatting', 'Keyword optimized'],
        },
      ],
    };
  }

  @Get(':id/export-history')
  @ApiOperation({ summary: 'Get resume export history' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Export history retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        exports: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              format: { type: 'string' },
              filename: { type: 'string' },
              downloadUrl: { type: 'string' },
              generatedAt: { type: 'string', format: 'date-time' },
              fileSize: { type: 'number' },
              downloadCount: { type: 'number' },
            },
          },
        },
      },
    },
  })
  @ApiParam({ name: 'id', description: 'Resume ID' })
  async getExportHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<any> {
    // This would fetch actual export history from database
    return {
      exports: [
        {
          id: 'export-1',
          format: 'pdf',
          filename: 'John_Doe_Resume_2024-10-21.pdf',
          downloadUrl: '/api/resume/export/download/John_Doe_Resume_2024-10-21.pdf',
          generatedAt: new Date(),
          fileSize: 245760,
          downloadCount: 3,
        },
      ],
    };
  }

  @Post(':id/batch-export')
  @ApiOperation({ summary: 'Export resume in multiple formats' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Batch export completed successfully',
    schema: {
      type: 'object',
      properties: {
        exports: {
          type: 'array',
          items: { $ref: '#/components/schemas/ExportResponseDto' },
        },
      },
    },
  })
  @ApiParam({ name: 'id', description: 'Resume ID' })
  async batchExport(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('formats') formats: string[],
    @CurrentUser() user: User,
  ): Promise<{ exports: ExportResponseDto[] }> {
    const exports: ExportResponseDto[] = [];

    for (const format of formats) {
      if (format === 'pdf') {
        const exportDto: ExportResumeDto = { format: 'pdf' };
        const result = await this.pdfExportService.exportResumeToPdf(id, exportDto, user);
        exports.push(result);
      } else if (format === 'pdf-ats') {
        const result = await this.pdfExportService.generateATSOptimizedPdf(id, user);
        exports.push(result);
      }
    }

    return { exports };
  }

  @Get(':id/export-options')
  @ApiOperation({ summary: 'Get available export options for resume' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Export options retrieved successfully',
  })
  @ApiParam({ name: 'id', description: 'Resume ID' })
  async getExportOptions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<any> {
    // This would analyze the resume and template to provide customization options
    return {
      pdfOptions: {
        formats: ['A4', 'Letter'],
        colorSchemes: ['default', 'monochrome', 'blue', 'green'],
        fontSizes: ['small', 'medium', 'large'],
        margins: ['narrow', 'normal', 'wide'],
        features: {
          atsOptimized: true,
          includePhoto: true,
          watermark: true,
        },
      },
      templateOptions: {
        customizable: true,
        sections: [
          { id: 'personal_info', name: 'Personal Information', required: true },
          { id: 'summary', name: 'Professional Summary', required: false },
          { id: 'experience', name: 'Work Experience', required: true },
          { id: 'education', name: 'Education', required: true },
          { id: 'skills', name: 'Skills', required: false },
          { id: 'projects', name: 'Projects', required: false },
          { id: 'certifications', name: 'Certifications', required: false },
        ],
      },
    };
  }

  @Post(':id/schedule-export')
  @ApiOperation({ summary: 'Schedule automatic resume export' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Export scheduled successfully',
  })
  @ApiParam({ name: 'id', description: 'Resume ID' })
  async scheduleExport(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('schedule') schedule: {
      frequency: 'daily' | 'weekly' | 'monthly';
      format: string;
      email?: boolean;
    },
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; scheduleId: string }> {
    // This would create a scheduled job for automatic exports
    return {
      success: true,
      scheduleId: `schedule-${Date.now()}`,
    };
  }
}
