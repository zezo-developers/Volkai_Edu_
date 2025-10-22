import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User, UserStatus } from '@database/entities/user.entity';
import { Organization } from '@database/entities/organization.entity';
import { OrganizationMembership } from '@database/entities/organization-membership.entity';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let organizationRepository: Repository<Organization>;
  let membershipRepository: Repository<OrganizationMembership>;
  let jwtService: JwtService;
  let configService: ConfigService;
  let eventEmitter: EventEmitter2;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    passwordHash: 'hashedPassword',
    firstName: 'John',
    lastName: 'Doe',
    status: UserStatus.ACTIVE,
    emailVerified: true,
    deletedAt: null,
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockOrganizationRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockMembershipRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Organization),
          useValue: mockOrganizationRepository,
        },
        {
          provide: getRepositoryToken(OrganizationMembership),
          useValue: mockMembershipRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    organizationRepository = module.get<Repository<Organization>>(getRepositoryToken(Organization));
    membershipRepository = module.get<Repository<OrganizationMembership>>(getRepositoryToken(OrganizationMembership));
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockResolvedValue('mock-token');
      mockConfigService.get.mockReturnValue(12);

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('user.registered', expect.any(Object));
    });

    it('should throw ConflictException if user already exists', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'SecurePass123!',
      };

      const bcrypt = require('bcrypt');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue({});
      mockJwtService.signAsync.mockResolvedValue('mock-token');
      mockMembershipRepository.findOne.mockResolvedValue(null);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('user.login', expect.any(Object));
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for unverified email', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'SecurePass123!',
      };

      const unverifiedUser = { ...mockUser, emailVerified: false };
      mockUserRepository.findOne.mockResolvedValue(unverifiedUser);

      const bcrypt = require('bcrypt');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const refreshTokenDto = { refreshToken: 'valid-refresh-token' };
      const payload = { sub: 'user-1', email: 'test@example.com' };

      mockJwtService.verify.mockReturnValue(payload);
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        refreshTokenHash: 'hashed-refresh-token',
      });

      const bcrypt = require('bcrypt');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
      mockJwtService.signAsync.mockResolvedValue('new-token');

      const result = await service.refreshToken(refreshTokenDto);

      expect(result).toHaveProperty('access');
      expect(result).toHaveProperty('refresh');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      const refreshTokenDto = { refreshToken: 'invalid-refresh-token' };

      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      const userId = 'user-1';

      mockUserRepository.update.mockResolvedValue({});

      await service.logout(userId);

      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, {
        refreshTokenHash: null,
      });
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const userId = 'user-1';

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getProfile(userId);

      expect(result).toBeDefined();
      expect(result.id).toBe(userId);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const userId = 'non-existent-user';

      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.getProfile(userId)).rejects.toThrow(UnauthorizedException);
    });
  });
});
