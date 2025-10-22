import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { FileManagerService } from './file-manager.service';
import { S3Service } from './s3.service';
import { VirusScannerService } from './virus-scanner.service';
import { ImageProcessorService } from './image-processor.service';
import { File, FileAccessLevel, FileOwnerType, VirusScanStatus, FileProcessingStatus } from '@database/entities/file.entity';
import { AuthenticatedUser } from '@modules/auth/strategies/jwt.strategy';

describe('FileManagerService', () => {
  let service: FileManagerService;
  let fileRepository: Repository<File>;
  let s3Service: S3Service;
  let virusScannerService: VirusScannerService;
  let imageProcessorService: ImageProcessorService;
  let eventEmitter: EventEmitter2;
  let configService: ConfigService;

  const mockUser: AuthenticatedUser = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    currentOrganizationId: 'org-1',
    permissions: ['files:read', 'files:write', 'files:delete'],
  } as AuthenticatedUser;

  const mockFile: File = {
    id: 'file-1',
    ownerId: 'user-1',
    organizationId: 'org-1',
    ownerType: FileOwnerType.USER,
    filename: 'test-document.pdf',
    originalFilename: 'Test Document.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1048576,
    storagePath: 'organizations/org-1/2023-10-21/file.pdf',
    accessLevel: FileAccessLevel.PRIVATE,
    virusScanStatus: VirusScanStatus.CLEAN,
    processingStatus: FileProcessingStatus.COMPLETED,
    downloadCount: 0,
    viewCount: 0,
    tags: ['test'],
    isProcessed: true,
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    canAccess: jest.fn().mockReturnValue(true),
    incrementDownloadCount: jest.fn(),
    incrementViewCount: jest.fn(),
  } as any;

  const mockFileRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockS3Service = {
    generatePresignedUploadUrl: jest.fn(),
    generatePresignedDownloadUrl: jest.fn(),
    fileExists: jest.fn(),
    getFileMetadata: jest.fn(),
    deleteFile: jest.fn(),
  };

  const mockVirusScannerService = {
    shouldScanFileType: jest.fn(),
  };

  const mockImageProcessorService = {
    canProcessImage: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileManagerService,
        {
          provide: getRepositoryToken(File),
          useValue: mockFileRepository,
        },
        {
          provide: S3Service,
          useValue: mockS3Service,
        },
        {
          provide: VirusScannerService,
          useValue: mockVirusScannerService,
        },
        {
          provide: ImageProcessorService,
          useValue: mockImageProcessorService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<FileManagerService>(FileManagerService);
    fileRepository = module.get<Repository<File>>(getRepositoryToken(File));
    s3Service = module.get<S3Service>(S3Service);
    virusScannerService = module.get<VirusScannerService>(VirusScannerService);
    imageProcessorService = module.get<ImageProcessorService>(ImageProcessorService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    configService = module.get<ConfigService>(ConfigService);

    // Reset mocks
    jest.clearAllMocks();

    // Setup default mock returns
    mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
      const config = {
        DEFAULT_STORAGE_LIMIT: 10 * 1024 * 1024 * 1024, // 10GB
        MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
        ALLOWED_MIME_TYPES: '',
      };
      return config[key] || defaultValue;
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateUploadUrl', () => {
    it('should generate upload URL successfully', async () => {
      const uploadRequest = {
        filename: 'test.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1048576,
        accessLevel: FileAccessLevel.PRIVATE,
        description: 'Test file',
        tags: ['test'],
      };

      const mockPresignedResponse = {
        uploadUrl: 'https://s3.amazonaws.com/bucket/upload-url',
        downloadUrl: 'https://cdn.example.com/download-url',
        storagePath: 'organizations/org-1/2023-10-21/file.pdf',
        expiresAt: new Date(),
      };

      // Mock storage quota check
      mockFileRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ totalSize: '1000000' }),
      });

      mockFileRepository.create.mockReturnValue(mockFile);
      mockFileRepository.save.mockResolvedValue(mockFile);
      mockS3Service.generatePresignedUploadUrl.mockResolvedValue(mockPresignedResponse);
      mockFileRepository.update.mockResolvedValue({});

      const result = await service.generateUploadUrl(uploadRequest, mockUser);

      expect(result).toHaveProperty('fileId');
      expect(result).toHaveProperty('uploadUrl');
      expect(result).toHaveProperty('downloadUrl');
      expect(result).toHaveProperty('storagePath');
      expect(result).toHaveProperty('expiresAt');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('file.uploadInitiated', expect.any(Object));
    });

    it('should throw BadRequestException for file too large', async () => {
      const uploadRequest = {
        filename: 'large-file.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 200 * 1024 * 1024, // 200MB (exceeds 100MB limit)
        accessLevel: FileAccessLevel.PRIVATE,
      };

      await expect(service.generateUploadUrl(uploadRequest, mockUser)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for storage quota exceeded', async () => {
      const uploadRequest = {
        filename: 'test.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1048576,
        accessLevel: FileAccessLevel.PRIVATE,
      };

      // Mock storage quota exceeded
      mockFileRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ totalSize: '10737418240' }), // 10GB (at limit)
      });

      await expect(service.generateUploadUrl(uploadRequest, mockUser)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getFileById', () => {
    it('should return file when user has access', async () => {
      mockFileRepository.findOne.mockResolvedValue(mockFile);
      mockFileRepository.update.mockResolvedValue({});

      const result = await service.getFileById('file-1', mockUser);

      expect(result).toEqual(mockFile);
      expect(mockFileRepository.update).toHaveBeenCalledWith('file-1', {
        viewCount: 1,
        lastAccessedAt: expect.any(Date),
      });
    });

    it('should throw NotFoundException when file not found', async () => {
      mockFileRepository.findOne.mockResolvedValue(null);

      await expect(service.getFileById('non-existent', mockUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user has no access', async () => {
      const restrictedFile = { ...mockFile, canAccess: jest.fn().mockReturnValue(false) };
      mockFileRepository.findOne.mockResolvedValue(restrictedFile);

      await expect(service.getFileById('file-1', mockUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('generateDownloadUrl', () => {
    it('should generate download URL for private file', async () => {
      const mockDownloadUrl = 'https://s3.amazonaws.com/bucket/download-url';
      
      mockFileRepository.findOne.mockResolvedValue(mockFile);
      mockFileRepository.update.mockResolvedValue({});
      mockS3Service.generatePresignedDownloadUrl.mockResolvedValue(mockDownloadUrl);

      const result = await service.generateDownloadUrl('file-1', mockUser);

      expect(result).toBe(mockDownloadUrl);
      expect(mockFileRepository.update).toHaveBeenCalledWith('file-1', {
        downloadCount: 1,
        lastAccessedAt: expect.any(Date),
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('file.downloaded', expect.any(Object));
    });

    it('should return public URL for public files', async () => {
      const publicFile = { 
        ...mockFile, 
        accessLevel: FileAccessLevel.PUBLIC,
        publicUrl: 'https://cdn.example.com/public-file.pdf'
      };
      
      mockFileRepository.findOne.mockResolvedValue(publicFile);
      mockFileRepository.update.mockResolvedValue({});

      const result = await service.generateDownloadUrl('file-1', mockUser);

      expect(result).toBe(publicFile.publicUrl);
    });

    it('should throw ForbiddenException for infected files', async () => {
      const infectedFile = { ...mockFile, virusScanStatus: VirusScanStatus.INFECTED };
      mockFileRepository.findOne.mockResolvedValue(infectedFile);

      await expect(service.generateDownloadUrl('file-1', mockUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateFile', () => {
    it('should update file metadata successfully', async () => {
      const updates = {
        filename: 'updated-file.pdf',
        description: 'Updated description',
        tags: ['updated', 'test'],
        accessLevel: FileAccessLevel.ORGANIZATION,
      };

      mockFileRepository.findOne.mockResolvedValueOnce(mockFile) // getFileById call
                                 .mockResolvedValueOnce({ ...mockFile, ...updates }); // final return
      mockFileRepository.update.mockResolvedValue({});

      const result = await service.updateFile('file-1', updates, mockUser);

      expect(mockFileRepository.update).toHaveBeenCalledWith('file-1', expect.objectContaining({
        filename: 'updated-file.pdf',
        description: 'Updated description',
        tags: ['updated', 'test'],
        accessLevel: FileAccessLevel.ORGANIZATION,
        updatedAt: expect.any(Date),
      }));
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('file.updated', expect.any(Object));
    });

    it('should throw ForbiddenException when user cannot modify file', async () => {
      const otherUserFile = { ...mockFile, ownerId: 'other-user' };
      const userWithoutPermissions = { ...mockUser, permissions: ['files:read'] };
      
      mockFileRepository.findOne.mockResolvedValue(otherUserFile);

      await expect(service.updateFile('file-1', {}, userWithoutPermissions)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      mockFileRepository.findOne.mockResolvedValue(mockFile);
      mockS3Service.deleteFile.mockResolvedValue(undefined);
      mockFileRepository.remove.mockResolvedValue(mockFile);

      await service.deleteFile('file-1', mockUser);

      expect(mockS3Service.deleteFile).toHaveBeenCalledWith(mockFile.storagePath);
      expect(mockFileRepository.remove).toHaveBeenCalledWith(mockFile);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('file.deleted', expect.any(Object));
    });

    it('should throw ForbiddenException when user cannot delete file', async () => {
      const otherUserFile = { ...mockFile, ownerId: 'other-user' };
      const userWithoutPermissions = { ...mockUser, permissions: ['files:read'] };
      
      mockFileRepository.findOne.mockResolvedValue(otherUserFile);

      await expect(service.deleteFile('file-1', userWithoutPermissions)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('searchFiles', () => {
    it('should search files with filters', async () => {
      const filters = {
        filename: 'test',
        mimeType: 'application/pdf',
        tags: ['test'],
        page: 1,
        limit: 20,
      };

      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockFile]),
      };

      mockFileRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.searchFiles(filters, mockUser);

      expect(result).toEqual({
        files: [mockFile],
        total: 1,
        page: 1,
        limit: 20,
      });
    });
  });

  describe('getFileStatistics', () => {
    it('should return file statistics for organization', async () => {
      const mockFiles = [
        { ...mockFile, mimeType: 'application/pdf', sizeBytes: 1000000 },
        { ...mockFile, mimeType: 'image/jpeg', sizeBytes: 500000 },
      ];

      mockFileRepository.find.mockResolvedValue(mockFiles);

      const result = await service.getFileStatistics('org-1');

      expect(result).toHaveProperty('totalFiles', 2);
      expect(result).toHaveProperty('totalSize', 1500000);
      expect(result).toHaveProperty('filesByType');
      expect(result).toHaveProperty('filesByAccessLevel');
      expect(result).toHaveProperty('virusScanStats');
      expect(result).toHaveProperty('processingStats');
      expect(result).toHaveProperty('storageUsage');
    });
  });

  describe('processUploadedFile', () => {
    it('should process uploaded file successfully', async () => {
      mockFileRepository.findOne.mockResolvedValue(mockFile);
      mockFileRepository.update.mockResolvedValue({});
      mockS3Service.fileExists.mockResolvedValue(true);
      mockS3Service.getFileMetadata.mockResolvedValue({
        contentType: 'application/pdf',
        contentLength: 1048576,
        lastModified: new Date(),
        metadata: {},
      });
      mockVirusScannerService.shouldScanFileType.mockReturnValue(false);
      mockImageProcessorService.canProcessImage.mockReturnValue(false);

      const result = await service.processUploadedFile('file-1');

      expect(mockFileRepository.update).toHaveBeenCalledWith('file-1', {
        processingStatus: FileProcessingStatus.PROCESSING,
      });
      expect(mockFileRepository.update).toHaveBeenCalledWith('file-1', {
        processingStatus: FileProcessingStatus.COMPLETED,
        isProcessed: true,
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('file.processed', expect.any(Object));
    });

    it('should throw NotFoundException when file not found', async () => {
      mockFileRepository.findOne.mockResolvedValue(null);

      await expect(service.processUploadedFile('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
