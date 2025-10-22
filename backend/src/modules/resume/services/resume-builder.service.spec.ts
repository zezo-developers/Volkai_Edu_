import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ResumeBuilderService } from './resume-builder.service';
import { UserResume, ResumeVisibility } from '../../../database/entities/user-resume.entity';
import { ResumeSection } from '../../../database/entities/resume-section.entity';
import { ResumeTemplate } from '../../../database/entities/resume-template.entity';
import { User, UserRole } from '../../../database/entities/user.entity';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

describe('ResumeBuilderService', () => {
  let service: ResumeBuilderService;
  let resumeRepository: Repository<UserResume>;
  let sectionRepository: Repository<ResumeSection>;
  let templateRepository: Repository<ResumeTemplate>;
  let userRepository: Repository<User>;
  let dataSource: DataSource;
  let eventEmitter: EventEmitter2;

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.STUDENT,
    organizationId: 'org-1',
  } as User;

  const mockTemplate: ResumeTemplate = {
    id: 'template-1',
    name: 'Modern Template',
    isActive: true,
    templateData: {
      layout: { type: 'single-column', sections: [] },
      styles: { fonts: { primary: 'Arial' }, colors: { primary: '#000' } },
      components: {},
      metadata: { version: '1.0.0' },
    },
    incrementDownload: jest.fn(),
  } as any;

  const mockResume: UserResume = {
    id: 'resume-1',
    userId: 'user-1',
    templateId: 'template-1',
    title: 'My Resume',
    isPrimary: false,
    visibility: ResumeVisibility.PRIVATE,
    data: {
      personalInfo: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'test@example.com',
      },
      experience: [],
      education: [],
      skills: [],
      projects: [],
      certifications: [],
      languages: [],
      references: [],
    },
    viewCount: 0,
    downloadCount: 0,
    shareCount: 0,
    analytics: {},
    customization: {},
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    updateCompletionPercentage: jest.fn(),
    updateAtsScore: jest.fn(),
    incrementView: jest.fn(),
    incrementDownload: jest.fn(),
    incrementShare: jest.fn(),
    generateShareToken: jest.fn().mockReturnValue('share-token'),
    revokeShareToken: jest.fn(),
    makePrimary: jest.fn(),
    validate: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
    clone: jest.fn().mockReturnValue({}),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumeBuilderService,
        {
          provide: getRepositoryToken(UserResume),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue({
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
            }),
          },
        },
        {
          provide: getRepositoryToken(ResumeSection),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ResumeTemplate),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ResumeBuilderService>(ResumeBuilderService);
    resumeRepository = module.get<Repository<UserResume>>(getRepositoryToken(UserResume));
    sectionRepository = module.get<Repository<ResumeSection>>(getRepositoryToken(ResumeSection));
    templateRepository = module.get<Repository<ResumeTemplate>>(getRepositoryToken(ResumeTemplate));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    dataSource = module.get<DataSource>(DataSource);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createResume', () => {
    it('should create a new resume successfully', async () => {
      const createDto = {
        title: 'My New Resume',
        templateId: 'template-1',
        isPrimary: false,
        visibility: ResumeVisibility.PRIVATE,
      };

      jest.spyOn(templateRepository, 'findOne').mockResolvedValue(mockTemplate);
      jest.spyOn(resumeRepository, 'create').mockReturnValue(mockResume);
      jest.spyOn(resumeRepository, 'save').mockResolvedValue(mockResume);
      jest.spyOn(sectionRepository, 'create').mockReturnValue([]);
      jest.spyOn(sectionRepository, 'save').mockResolvedValue([]);

      const result = await service.createResume(createDto, mockUser);

      expect(result).toBeDefined();
      expect(resumeRepository.create).toHaveBeenCalled();
      expect(resumeRepository.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('resume.created', expect.any(Object));
    });

    it('should throw NotFoundException for invalid template', async () => {
      const createDto = {
        title: 'My New Resume',
        templateId: 'invalid-template',
      };

      jest.spyOn(templateRepository, 'findOne').mockResolvedValue(null);

      await expect(service.createResume(createDto, mockUser)).rejects.toThrow(NotFoundException);
    });

    it('should unset other primary resumes when creating primary resume', async () => {
      const createDto = {
        title: 'My Primary Resume',
        isPrimary: true,
      };

      jest.spyOn(resumeRepository, 'update').mockResolvedValue({ affected: 1 } as any);
      jest.spyOn(resumeRepository, 'create').mockReturnValue(mockResume);
      jest.spyOn(resumeRepository, 'save').mockResolvedValue(mockResume);
      jest.spyOn(sectionRepository, 'create').mockReturnValue([]);
      jest.spyOn(sectionRepository, 'save').mockResolvedValue([]);

      await service.createResume(createDto, mockUser);

      expect(resumeRepository.update).toHaveBeenCalledWith(
        { userId: mockUser.id, isPrimary: true },
        { isPrimary: false }
      );
    });
  });

  describe('getResumeById', () => {
    it('should return resume for owner', async () => {
      jest.spyOn(resumeRepository, 'findOne').mockResolvedValue(mockResume);

      const result = await service.getResumeById('resume-1', mockUser);

      expect(result).toBe(mockResume);
      expect(resumeRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'resume-1' },
        relations: ['user', 'template', 'sections'],
      });
    });

    it('should throw NotFoundException for non-existent resume', async () => {
      jest.spyOn(resumeRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getResumeById('non-existent', mockUser)).rejects.toThrow(NotFoundException);
    });

    it('should increment view count for non-owner', async () => {
      const publicResume = { ...mockResume, userId: 'other-user', visibility: ResumeVisibility.PUBLIC };
      jest.spyOn(resumeRepository, 'findOne').mockResolvedValue(publicResume);
      jest.spyOn(resumeRepository, 'save').mockResolvedValue(publicResume);

      await service.getResumeById('resume-1', mockUser);

      expect(publicResume.incrementView).toHaveBeenCalled();
      expect(resumeRepository.save).toHaveBeenCalled();
    });
  });

  describe('updateResume', () => {
    it('should update resume successfully', async () => {
      const updateDto = {
        title: 'Updated Resume Title',
        data: { personalInfo: { firstName: 'Jane' } },
      };

      jest.spyOn(service, 'getResumeById').mockResolvedValue(mockResume);
      jest.spyOn(resumeRepository, 'save').mockResolvedValue({ ...mockResume, ...updateDto });

      const result = await service.updateResume('resume-1', updateDto, mockUser);

      expect(result).toBeDefined();
      expect(mockResume.updateCompletionPercentage).toHaveBeenCalled();
      expect(mockResume.updateAtsScore).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('resume.updated', expect.any(Object));
    });

    it('should throw ForbiddenException for non-owner', async () => {
      const otherUserResume = { ...mockResume, userId: 'other-user' };
      jest.spyOn(service, 'getResumeById').mockResolvedValue(otherUserResume);

      await expect(service.updateResume('resume-1', {}, mockUser)).rejects.toThrow(ForbiddenException);
    });

    it('should handle primary resume setting', async () => {
      const updateDto = { isPrimary: true };
      
      jest.spyOn(service, 'getResumeById').mockResolvedValue(mockResume);
      jest.spyOn(resumeRepository, 'update').mockResolvedValue({ affected: 1 } as any);
      jest.spyOn(resumeRepository, 'save').mockResolvedValue(mockResume);

      await service.updateResume('resume-1', updateDto, mockUser);

      expect(resumeRepository.update).toHaveBeenCalledWith(
        { userId: mockResume.userId, isPrimary: true },
        { isPrimary: false }
      );
    });
  });

  describe('deleteResume', () => {
    it('should delete resume successfully', async () => {
      jest.spyOn(service, 'getResumeById').mockResolvedValue(mockResume);
      jest.spyOn(resumeRepository, 'count').mockResolvedValue(2);
      jest.spyOn(resumeRepository, 'remove').mockResolvedValue(mockResume);

      await service.deleteResume('resume-1', mockUser);

      expect(resumeRepository.remove).toHaveBeenCalledWith(mockResume);
      expect(eventEmitter.emit).toHaveBeenCalledWith('resume.deleted', expect.any(Object));
    });

    it('should throw BadRequestException when deleting primary resume with other resumes', async () => {
      const primaryResume = { ...mockResume, isPrimary: true };
      jest.spyOn(service, 'getResumeById').mockResolvedValue(primaryResume);
      jest.spyOn(resumeRepository, 'count').mockResolvedValue(2);

      await expect(service.deleteResume('resume-1', mockUser)).rejects.toThrow(BadRequestException);
    });

    it('should allow deleting primary resume if it is the only resume', async () => {
      const primaryResume = { ...mockResume, isPrimary: true };
      jest.spyOn(service, 'getResumeById').mockResolvedValue(primaryResume);
      jest.spyOn(resumeRepository, 'count').mockResolvedValue(0);
      jest.spyOn(resumeRepository, 'remove').mockResolvedValue(primaryResume);

      await service.deleteResume('resume-1', mockUser);

      expect(resumeRepository.remove).toHaveBeenCalledWith(primaryResume);
    });
  });

  describe('cloneResume', () => {
    it('should clone resume successfully', async () => {
      const clonedData = { title: 'Cloned Resume', userId: mockUser.id };
      
      jest.spyOn(service, 'getResumeById').mockResolvedValue(mockResume);
      jest.spyOn(mockResume, 'clone').mockReturnValue(clonedData);
      jest.spyOn(resumeRepository, 'create').mockReturnValue(clonedData as any);
      jest.spyOn(resumeRepository, 'save').mockResolvedValue(clonedData as any);
      jest.spyOn(sectionRepository, 'save').mockResolvedValue([]);

      const result = await service.cloneResume('resume-1', 'Cloned Resume', mockUser);

      expect(result).toBeDefined();
      expect(mockResume.clone).toHaveBeenCalledWith('Cloned Resume');
      expect(eventEmitter.emit).toHaveBeenCalledWith('resume.cloned', expect.any(Object));
    });
  });

  describe('shareResume', () => {
    it('should share resume successfully', async () => {
      const shareDto = { expiryDays: 30, visibility: ResumeVisibility.LINK_ONLY };
      
      jest.spyOn(service, 'getResumeById').mockResolvedValue(mockResume);
      jest.spyOn(resumeRepository, 'save').mockResolvedValue(mockResume);

      const result = await service.shareResume('resume-1', shareDto, mockUser);

      expect(result).toHaveProperty('shareToken');
      expect(result).toHaveProperty('shareUrl');
      expect(mockResume.generateShareToken).toHaveBeenCalledWith(30);
      expect(eventEmitter.emit).toHaveBeenCalledWith('resume.shared', expect.any(Object));
    });

    it('should throw ForbiddenException for non-owner', async () => {
      const otherUserResume = { ...mockResume, userId: 'other-user' };
      jest.spyOn(service, 'getResumeById').mockResolvedValue(otherUserResume);

      await expect(service.shareResume('resume-1', {}, mockUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('searchResumes', () => {
    it('should search resumes with filters', async () => {
      const searchDto = {
        search: 'developer',
        userId: mockUser.id,
        page: 1,
        limit: 10,
      };

      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockResume], 1]),
      };

      jest.spyOn(resumeRepository, 'createQueryBuilder').mockReturnValue(queryBuilder as any);

      const result = await service.searchResumes(searchDto, mockUser);

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result.items).toHaveLength(1);
      expect(queryBuilder.where).toHaveBeenCalled();
      expect(queryBuilder.getManyAndCount).toHaveBeenCalled();
    });

    it('should apply access control for non-admin users', async () => {
      const searchDto = { page: 1, limit: 10 };
      
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      jest.spyOn(resumeRepository, 'createQueryBuilder').mockReturnValue(queryBuilder as any);

      await service.searchResumes(searchDto, mockUser);

      expect(queryBuilder.where).toHaveBeenCalledWith(
        '(resume.userId = :userId OR resume.visibility = :publicVisibility)',
        expect.any(Object)
      );
    });
  });

  describe('getResumeAnalytics', () => {
    it('should return analytics for resume owner', async () => {
      jest.spyOn(service, 'getResumeById').mockResolvedValue(mockResume);

      const result = await service.getResumeAnalytics('resume-1', mockUser);

      expect(result).toHaveProperty('viewCount');
      expect(result).toHaveProperty('downloadCount');
      expect(result).toHaveProperty('completionPercentage');
      expect(result).toHaveProperty('recommendations');
    });

    it('should throw ForbiddenException for non-owner', async () => {
      const otherUserResume = { ...mockResume, userId: 'other-user' };
      jest.spyOn(service, 'getResumeById').mockResolvedValue(otherUserResume);

      await expect(service.getResumeAnalytics('resume-1', mockUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('auto-save functionality', () => {
    it('should handle auto-save updates', async () => {
      const updateDto = { 
        title: 'Auto-saved Title',
        isAutoSave: true,
      };

      jest.spyOn(service, 'getResumeById').mockResolvedValue(mockResume);
      jest.spyOn(resumeRepository, 'save').mockResolvedValue(mockResume);

      const result = await service.updateResume('resume-1', updateDto, mockUser);

      expect(result).toBeDefined();
      expect(eventEmitter.emit).toHaveBeenCalledWith('resume.updated', 
        expect.objectContaining({ isAutoSave: true })
      );
    });
  });

  describe('section management', () => {
    const mockSection = {
      id: 'section-1',
      resumeId: 'resume-1',
      type: 'experience',
      content: {},
      orderIndex: 0,
      isVisible: true,
    };

    it('should update section successfully', async () => {
      const updateDto = { content: { newData: 'test' } };
      
      jest.spyOn(service, 'getResumeById').mockResolvedValue(mockResume);
      jest.spyOn(sectionRepository, 'findOne').mockResolvedValue(mockSection as any);
      jest.spyOn(sectionRepository, 'save').mockResolvedValue({ ...mockSection, ...updateDto } as any);
      jest.spyOn(resumeRepository, 'save').mockResolvedValue(mockResume);

      const result = await service.updateSection('resume-1', 'section-1', updateDto, mockUser);

      expect(result).toBeDefined();
      expect(sectionRepository.save).toHaveBeenCalled();
      expect(mockResume.updateCompletionPercentage).toHaveBeenCalled();
    });

    it('should reorder sections successfully', async () => {
      const reorderDto = { sectionIds: ['section-2', 'section-1', 'section-3'] };
      
      jest.spyOn(service, 'getResumeById').mockResolvedValue(mockResume);
      jest.spyOn(dataSource, 'transaction').mockImplementation(async (callback) => {
        return await callback({
          update: jest.fn().mockResolvedValue({ affected: 1 }),
        });
      });
      jest.spyOn(sectionRepository, 'find').mockResolvedValue([mockSection] as any);

      const result = await service.reorderSections('resume-1', reorderDto, mockUser);

      expect(result).toBeDefined();
      expect(dataSource.transaction).toHaveBeenCalled();
    });
  });
});
