import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Response,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
  UsePipes,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { UserRole } from '../../database/entities/user.entity';
import { CertificateService } from './services/certificate.service';
import {
  GenerateCertificateDto,
  VerifyCertificateDto,
  CertificateResponseDto,
  CertificateListResponseDto,
  CertificateStatisticsDto,
} from './dto/certificate.dto';
import { Response as ExpressResponse } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@ApiTags('Certificates')
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificateService: CertificateService) {}

  @Post('generate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR, UserRole.CONTENT_CREATOR)
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Generate certificate for course completion' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Certificate generated successfully',
    type: CertificateResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid certificate data or course not completed',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiBody({ type: GenerateCertificateDto })
  @ApiBearerAuth()
  async generateCertificate(
    @Body() generateCertificateDto: GenerateCertificateDto,
    @Request() req: any,
  ): Promise<CertificateResponseDto> {
    try {
      const certificate = await this.certificateService.generateCertificate(
        generateCertificateDto.enrollmentId as any,
        req.user,
      );
      return new CertificateResponseDto(certificate);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to generate certificate',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get certificate by ID' })
  @ApiParam({
    name: 'id',
    description: 'Certificate ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Certificate retrieved successfully',
    type: CertificateResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Certificate not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  async getCertificate(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<CertificateResponseDto> {
    try {
      const certificate = await this.certificateService.getCertificateById(
        id,
        req.user,
      );
      return new CertificateResponseDto(certificate);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to retrieve certificate',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user certificates' })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'courseId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'revoked', 'expired'] })
  @ApiQuery({ name: 'type', required: false, enum: ['completion', 'achievement', 'participation'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Certificates retrieved successfully',
    type: CertificateListResponseDto,
  })
  @ApiBearerAuth()
  async getUserCertificates(
    @Query('userId') userId?: string,
    @Query('courseId') courseId?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Request() req?: any,
  ): Promise<CertificateListResponseDto> {
    try {
      const targetUserId = userId || req.user.id;
      const result:any = await this.certificateService.getUserCertificates(
        targetUserId,
        {
          courseId,
          status,
          type,
          page: page || 1,
          limit: limit || 20,
        } as any,
      );
      return result;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to retrieve certificates',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('verify')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Verify certificate authenticity' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Certificate verification result',
    schema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean' },
        certificate: { $ref: '#/components/schemas/CertificateResponseDto' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid verification data',
  })
  @ApiBody({ type: VerifyCertificateDto })
  async verifyCertificate(
    @Body() verifyCertificateDto: VerifyCertificateDto,
  ): Promise<{
    valid: boolean;
    certificate?: CertificateResponseDto;
    message: string;
  }> {
    try {
      const result:any = await this.certificateService.verifyCertificate(
        verifyCertificateDto.certificateNumber ||
          verifyCertificateDto.verificationCode,
      );

      return {
        valid: result.valid,
        certificate: result.certificate
          ? new CertificateResponseDto(result.certificate)
          : undefined,
        message: result.message,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to verify certificate',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download certificate PDF' })
  @ApiParam({
    name: 'id',
    description: 'Certificate ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Certificate PDF file',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Certificate not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  async downloadCertificate(
    @Param('id', ParseUUIDPipe) id: string,
    @Response() res: ExpressResponse,
    @Request() req: any,
  ): Promise<void> {
    try {
      const { buffer, filename } = await this.certificateService.downloadCertificate(
        id,
        req.user,
      );

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length,
      });

      res.send(buffer);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to download certificate',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id/revoke')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Revoke certificate' })
  @ApiParam({
    name: 'id',
    description: 'Certificate ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Certificate revoked successfully',
    type: CertificateResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Certificate not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiBearerAuth()
  async revokeCertificate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @Request() req: any,
  ): Promise<CertificateResponseDto> {
    try {
      const certificate = await this.certificateService.revokeCertificate(
        id,
        reason,
        req.user,
      );
      return new CertificateResponseDto(certificate);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to revoke certificate',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('statistics/overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Get certificate statistics' })
  @ApiQuery({ name: 'courseId', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Certificate statistics retrieved successfully',
    type: CertificateStatisticsDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiBearerAuth()
  async getCertificateStatistics(
    @Query('courseId') courseId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Request() req?: any,
  ): Promise<CertificateStatisticsDto> {
    try {
      const statistics = await this.certificateService.getCertificateStatistics(
        req.user,
        {
          courseId,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
        },
      );
      return new CertificateStatisticsDto(statistics);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to retrieve certificate statistics',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('public/verify/:code')
  @ApiOperation({ summary: 'Public certificate verification by code' })
  @ApiParam({
    name: 'code',
    description: 'Certificate verification code',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Certificate verification result',
    schema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean' },
        certificate: { $ref: '#/components/schemas/CertificateResponseDto' },
        message: { type: 'string' },
      },
    },
  })
  async publicVerifyCertificate(
    @Param('code') code: string,
  ): Promise<{
    valid: boolean;
    certificate?: CertificateResponseDto;
    message: string;
  }> {
    try {
      const result:any = await this.certificateService.verifyCertificate(code);

      return {
        valid: result.valid,
        certificate: result.certificate
          ? new CertificateResponseDto(result.certificate)
          : undefined,
        message: result.message,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to verify certificate',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
