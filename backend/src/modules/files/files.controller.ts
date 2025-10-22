import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { FileManagerService } from './services/file-manager.service';
import { UploadRequestDto } from './dto/upload-request.dto';
import { FileSearchDto } from './dto/file-search.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@modules/auth/guards/permissions.guard';
import { RequirePermissions } from '@modules/auth/decorators/permissions.decorator';
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '@modules/auth/strategies/jwt.strategy';
import { File } from '@database/entities/file.entity';

/**
 * Files Controller
 * Handles file management operations including upload, download, search, and metadata management
 * Implements comprehensive security and access control
 */
@ApiTags('Files')
@Controller('files')
@UseGuards(JwtAuthGuard, PermissionsGuard, ThrottlerGuard)
@ApiBearerAuth('JWT-auth')
export class FilesController {
  constructor(private readonly fileManagerService: FileManagerService) {}

  /**
   * Generate presigned URL for file upload
   */
  @Post('presign')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('files:write')
  @ApiOperation({
    summary: 'Generate presigned upload URL',
    description: 'Generate a secure presigned URL for direct file upload to S3 storage',
  })
  @ApiResponse({
    status: 201,
    description: 'Presigned URL generated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        statusCode: { type: 'number', example: 201 },
        message: { type: 'string', example: 'Upload URL generated successfully' },
        data: {
          type: 'object',
          properties: {
            fileId: { type: 'string', example: 'uuid' },
            uploadUrl: { type: 'string', example: 'https://s3.amazonaws.com/bucket/...' },
            downloadUrl: { type: 'string', example: 'https://cdn.example.com/...' },
            storagePath: { type: 'string', example: 'organizations/uuid/2023-10-21/file.pdf' },
            expiresAt: { type: 'string', example: '2023-10-21T12:00:00.000Z' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid upload request (file too large, invalid MIME type, etc.)',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions or storage quota exceeded',
  })
  async generateUploadUrl(
    @Body() uploadRequest: UploadRequestDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<{
    fileId: string;
    uploadUrl: string;
    downloadUrl: string;
    storagePath: string;
    expiresAt: Date;
  }> {
    return this.fileManagerService.generateUploadUrl(uploadRequest, currentUser);
  }

  /**
   * Process uploaded file
   */
  @Post(':fileId/process')
  @RequirePermissions('files:write')
  @ApiOperation({
    summary: 'Process uploaded file',
    description: 'Trigger post-upload processing including virus scanning and image optimization',
  })
  @ApiResponse({
    status: 200,
    description: 'File processing initiated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'File processing completed successfully' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid' },
            filename: { type: 'string', example: 'document.pdf' },
            mimeType: { type: 'string', example: 'application/pdf' },
            sizeBytes: { type: 'number', example: 1048576 },
            virusScanStatus: { type: 'string', example: 'clean' },
            processingStatus: { type: 'string', example: 'completed' },
            isProcessed: { type: 'boolean', example: true },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'File not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  async processUploadedFile(
    @Param('fileId', ParseUUIDPipe) fileId: string,
  ): Promise<File> {
    return this.fileManagerService.processUploadedFile(fileId);
  }

  /**
   * Search files with filters and pagination
   */
  @Get()
  @RequirePermissions('files:read')
  @ApiOperation({
    summary: 'Search files',
    description: 'Search and filter files with pagination support and comprehensive filtering options',
  })
  @ApiResponse({
    status: 200,
    description: 'Files retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Files retrieved successfully' },
        data: {
          type: 'object',
          properties: {
            files: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'uuid' },
                  filename: { type: 'string', example: 'document.pdf' },
                  originalFilename: { type: 'string', example: 'My Document.pdf' },
                  mimeType: { type: 'string', example: 'application/pdf' },
                  sizeBytes: { type: 'number', example: 1048576 },
                  accessLevel: { type: 'string', example: 'private' },
                  virusScanStatus: { type: 'string', example: 'clean' },
                  processingStatus: { type: 'string', example: 'completed' },
                  downloadCount: { type: 'number', example: 5 },
                  viewCount: { type: 'number', example: 12 },
                  tags: { type: 'array', items: { type: 'string' }, example: ['project', 'important'] },
                  createdAt: { type: 'string', example: '2023-10-21T10:00:00.000Z' },
                },
              },
            },
            total: { type: 'number', example: 150 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 20 },
          },
        },
      },
    },
  })
  async searchFiles(
    @Query() searchDto: FileSearchDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<{
    files: File[];
    total: number;
    page: number;
    limit: number;
  }> {
    const filters = {
      ...searchDto,
      dateFrom: searchDto.dateFrom ? new Date(searchDto.dateFrom) : undefined,
      dateTo: searchDto.dateTo ? new Date(searchDto.dateTo) : undefined,
    };

    return this.fileManagerService.searchFiles(filters, currentUser);
  }

  /**
   * Get file by ID
   */
  @Get(':fileId')
  @RequirePermissions('files:read')
  @ApiOperation({
    summary: 'Get file details',
    description: 'Get detailed information about a specific file including metadata and access permissions',
  })
  @ApiResponse({
    status: 200,
    description: 'File details retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'File details retrieved successfully' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid' },
            filename: { type: 'string', example: 'document.pdf' },
            originalFilename: { type: 'string', example: 'My Document.pdf' },
            mimeType: { type: 'string', example: 'application/pdf' },
            sizeBytes: { type: 'number', example: 1048576 },
            humanReadableSize: { type: 'string', example: '1 MB' },
            accessLevel: { type: 'string', example: 'private' },
            description: { type: 'string', example: 'Important project document' },
            tags: { type: 'array', items: { type: 'string' }, example: ['project', 'important'] },
            virusScanStatus: { type: 'string', example: 'clean' },
            processingStatus: { type: 'string', example: 'completed' },
            downloadCount: { type: 'number', example: 5 },
            viewCount: { type: 'number', example: 12 },
            createdAt: { type: 'string', example: '2023-10-21T10:00:00.000Z' },
            updatedAt: { type: 'string', example: '2023-10-21T10:00:00.000Z' },
            owner: {
              type: 'object',
              properties: {
                id: { type: 'string', example: 'uuid' },
                firstName: { type: 'string', example: 'John' },
                lastName: { type: 'string', example: 'Doe' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'File not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied to this file',
  })
  async getFileById(
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<File> {
    return this.fileManagerService.getFileById(fileId, currentUser);
  }

  /**
   * Generate download URL for file
   */
  @Post(':fileId/download')
  @RequirePermissions('files:read')
  @ApiOperation({
    summary: 'Generate download URL',
    description: 'Generate a secure download URL for the specified file',
  })
  @ApiQuery({
    name: 'expiresIn',
    required: false,
    description: 'URL expiration time in seconds (default: 3600)',
    example: 3600,
  })
  @ApiResponse({
    status: 200,
    description: 'Download URL generated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Download URL generated successfully' },
        data: {
          type: 'object',
          properties: {
            downloadUrl: { type: 'string', example: 'https://s3.amazonaws.com/bucket/...' },
            expiresAt: { type: 'string', example: '2023-10-21T12:00:00.000Z' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'File not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied or file is infected',
  })
  async generateDownloadUrl(
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @Query('expiresIn') expiresIn?: string,
    @CurrentUser() currentUser?: AuthenticatedUser,
  ): Promise<{ downloadUrl: string; expiresAt: Date }> {
    const expirationSeconds = expiresIn ? parseInt(expiresIn, 10) : 3600;
    const downloadUrl = await this.fileManagerService.generateDownloadUrl(
      fileId,
      currentUser,
      expirationSeconds,
    );

    return {
      downloadUrl,
      expiresAt: new Date(Date.now() + expirationSeconds * 1000),
    };
  }

  /**
   * Update file metadata
   */
  @Patch(':fileId')
  @RequirePermissions('files:write')
  @ApiOperation({
    summary: 'Update file metadata',
    description: 'Update file metadata such as filename, description, tags, and access level',
  })
  @ApiResponse({
    status: 200,
    description: 'File updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'File updated successfully' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid' },
            filename: { type: 'string', example: 'updated-document.pdf' },
            description: { type: 'string', example: 'Updated description' },
            tags: { type: 'array', items: { type: 'string' }, example: ['updated', 'important'] },
            accessLevel: { type: 'string', example: 'organization' },
            updatedAt: { type: 'string', example: '2023-10-21T11:00:00.000Z' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'File not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions to modify this file',
  })
  async updateFile(
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @Body() updateDto: UpdateFileDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<File> {
    return this.fileManagerService.updateFile(fileId, updateDto, currentUser);
  }

  /**
   * Delete file
   */
  @Delete(':fileId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('files:delete')
  @ApiOperation({
    summary: 'Delete file',
    description: 'Permanently delete file from storage and database',
  })
  @ApiResponse({
    status: 200,
    description: 'File deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'File deleted successfully' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'File not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions to delete this file',
  })
  async deleteFile(
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<{ message: string }> {
    await this.fileManagerService.deleteFile(fileId, currentUser);
    return { message: 'File deleted successfully' };
  }

  /**
   * Get file statistics for organization
   */
  @Get('statistics/organization')
  @RequirePermissions('files:read')
  @ApiOperation({
    summary: 'Get file statistics',
    description: 'Get comprehensive file statistics for the current organization',
  })
  @ApiResponse({
    status: 200,
    description: 'File statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'File statistics retrieved successfully' },
        data: {
          type: 'object',
          properties: {
            totalFiles: { type: 'number', example: 1250 },
            totalSize: { type: 'number', example: 5368709120 },
            filesByType: {
              type: 'object',
              properties: {
                image: { type: 'number', example: 450 },
                document: { type: 'number', example: 300 },
                video: { type: 'number', example: 50 },
              },
            },
            filesByAccessLevel: {
              type: 'object',
              properties: {
                private: { type: 'number', example: 800 },
                organization: { type: 'number', example: 400 },
                public: { type: 'number', example: 50 },
              },
            },
            virusScanStats: {
              type: 'object',
              properties: {
                clean: { type: 'number', example: 1240 },
                pending: { type: 'number', example: 8 },
                infected: { type: 'number', example: 2 },
              },
            },
            storageUsage: {
              type: 'object',
              properties: {
                used: { type: 'number', example: 5368709120 },
                limit: { type: 'number', example: 10737418240 },
                percentage: { type: 'number', example: 50 },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  async getFileStatistics(
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<{
    totalFiles: number;
    totalSize: number;
    filesByType: Record<string, number>;
    filesByAccessLevel: Record<string, number>;
    virusScanStats: Record<string, number>;
    processingStats: Record<string, number>;
    storageUsage: {
      used: number;
      limit: number;
      percentage: number;
    };
  }> {
    if (!currentUser.currentOrganizationId) {
      throw new Error('Organization context required');
    }

    return this.fileManagerService.getFileStatistics(currentUser.currentOrganizationId);
  }
}
