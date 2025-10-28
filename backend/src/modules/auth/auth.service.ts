import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PasswordSecurityService } from './services/password-security.service';
import { Role, User, UserStatus } from '@/database/entities/user.entity';
import { Organization, OrganizationStatus } from '@database/entities/organization.entity';
import { OrganizationMembership, MembershipRole, MembershipStatus } from '@database/entities/organization-membership.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { JwtPayload } from './strategies/jwt.strategy';

/**
 * Authentication response interface
 */
export interface AuthResponse {
  user: Omit<User, 'passwordHash' | 'refreshTokenHash'>;
  tokens: {
    access: string;
    refresh: string;
  };
  organization?: Organization;
}

/**
 * Authentication Service
 * Handles user registration, login, token management, and password operations
 * Implements comprehensive security measures and audit logging
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(OrganizationMembership)
    private readonly membershipRepository: Repository<OrganizationMembership>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly passwordSecurityService: PasswordSecurityService,
  ) {}

  /**
   * Register a new user with optional organization creation
   */
  async register(registerDto: RegisterDto): Promise<any> {
    const { email, password, firstName, lastName, orgName, inviteToken } = registerDto;
    console.log('Register DTO:', registerDto);
    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });
    console.log('Existing User:', existingUser);

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // // Hash password with enhanced security
    const hashResult = await this.passwordSecurityService.hashPassword(password);
    const passwordHash = hashResult.hash;

    // // Generate email verification token
    const emailVerificationToken = uuidv4();
    const emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // // Create user
    const user = this.userRepository.create({
      email,
      passwordHash,
      firstName,
      lastName,
      emailVerificationToken,
      emailVerificationExpiresAt,
      status: UserStatus.ACTIVE,
      roles: Role.USER as string,
    }) ;

    const savedUser:any = await this.userRepository.save(user);
    console.log('Saved User:', savedUser);

    let organization: Organization | undefined;
    let membership: OrganizationMembership | undefined;

    // // // Handle organization creation or invitation
    if (inviteToken) {
      // Join existing organization via invitation
      membership = await this.handleInvitationAcceptance(savedUser.id, savedUser.invitationToken);
      organization = membership.organization;
    } else if (orgName) {
      // Create new organization
      organization = await this.createOrganization(orgName, savedUser.id);
      membership = await this.createMembership(savedUser.id, organization.id, MembershipRole.OWNER);
    }

    // // // Generate tokens
    const tokens = await this.generateTokens(savedUser);
    console.log('Tokens:', tokens);

    // // // Update user with refresh token hash
    await this.updateRefreshTokenHash(savedUser.id, tokens.refresh);

    // Emit user registration event
    this.eventEmitter.emit('user.registered', {
      userId: savedUser.id,
      email: savedUser.email,
      organizationId: organization?.id,
    });

    this.logger.log(`User registered successfully: ${email}`);

    return {
      mes:'Registration endpoint is under maintenance.',
      user: this.sanitizeUser(savedUser),
      tokens,
      organization,
    };
  }

  /**
   * Authenticate user and return tokens
   */
  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password } = loginDto;

    // Find user with password hash
    const user = await this.userRepository.findOne({
      where: { email, status: UserStatus.ACTIVE, deletedAt: null },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password using enhanced security service
    const isPasswordValid = await this.passwordSecurityService.verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if password needs rehashing (algorithm upgrade)
    if (this.passwordSecurityService.needsRehash(user.passwordHash)) {
      try {
        const newHashResult = await this.passwordSecurityService.hashPassword(password, user.id);
        await this.userRepository.update(user.id, { 
          passwordHash: newHashResult.hash 
        });
        this.logger.log(`Password rehashed for user ${user.id} with improved algorithm`);
      } catch (error) {
        this.logger.warn(`Failed to rehash password for user ${user.id}`, error);
        // Continue with login even if rehashing fails
      }
    }

    // Check if email is verified
    if (!user.emailVerified) {
      throw new UnauthorizedException('Please verify your email before logging in');
    }

    // Update last login
    await this.userRepository.update(user.id, {
      lastLoginAt: new Date(),
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Update refresh token hash
    await this.updateRefreshTokenHash(user.id, tokens.refresh);

    // Get user's primary organization
    const membership = await this.membershipRepository.findOne({
      where: { userId: user.id, status: MembershipStatus.ACTIVE },
      relations: ['organization'],
    });

    // Emit login event
    this.eventEmitter.emit('user.login', {
      userId: user.id,
      email: user.email,
      organizationId: membership?.organizationId,
    });

    this.logger.log(`User logged in successfully: ${email}`);

    return {
      user: this.sanitizeUser(user),
      tokens,
      organization: membership?.organization,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<{ access: string; refresh: string }> {
    const { refreshToken } = refreshTokenDto;
    console.log("secret: ", this.configService.get<string>('jwt.refreshSecret'))
    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      console.log("Payload: ", payload)

      // Find user and verify refresh token hash
      const user = await this.userRepository.findOne({
        where: { id: payload.sub, status: UserStatus.ACTIVE, deletedAt: null },
      });

      if (!user || !user.refreshTokenHash) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Verify refresh token hash
      const isRefreshTokenValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
      if (!isRefreshTokenValid) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      // Update refresh token hash
      await this.updateRefreshTokenHash(user.id, tokens.refresh);

      this.logger.log(`Token refreshed for user: ${user.email}`);

      return tokens;
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Logout user by clearing refresh token
   */
  async logout(userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      refreshTokenHash: null,
    });

    this.logger.log(`User logged out: ${userId}`);
  }

  /**
   * Send password reset email
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void> {
    const { email } = forgotPasswordDto;

    const user = await this.userRepository.findOne({
      where: { email, status: UserStatus.ACTIVE, deletedAt: null },
    });

    if (!user) {
      // Don't reveal if email exists for security
      return;
    }

    // Generate password reset token
    const passwordResetToken = uuidv4();
    const passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.userRepository.update(user.id, {
      passwordResetToken,
      passwordResetExpiresAt,
    });

    // Emit password reset event
    this.eventEmitter.emit('user.passwordResetRequested', {
      userId: user.id,
      email: user.email,
      token: passwordResetToken,
    });

    this.logger.log(`Password reset requested for user: ${email}`);
  }

  /**
   * Reset user password using reset token
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const { token, newPassword } = resetPasswordDto;

    const user = await this.userRepository.findOne({
      where: {
        passwordResetToken: token,
        status: UserStatus.ACTIVE,
        deletedAt: null,
      },
    });

    console.log('User found : ', user)

    if (!user || !user.hasValidPasswordResetToken(token)) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const passwordHash = await this.hashPassword(newPassword);

    // Update password and clear reset token
    await this.userRepository.update(user.id, {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
      refreshTokenHash: null, // Invalidate all sessions
    });

    // Emit password reset event
    this.eventEmitter.emit('user.passwordReset', {
      userId: user.id,
      email: user.email,
    });

    this.logger.log(`Password reset completed for user: ${user.email}`);
  }

  async findUserById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id, status: UserStatus.ACTIVE, deletedAt: null },
    });
    return user;
  }

  /**
   * Verify user email using verification token
   */
  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<void> {
    const { token } = verifyEmailDto;

    const user = await this.userRepository.findOne({
      where: {
        emailVerificationToken: token,
        status: UserStatus.ACTIVE,
        deletedAt: null,
      },
    });

    if (!user || !user.hasValidEmailVerificationToken(token)) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Mark email as verified and clear token
    await this.userRepository.update(user.id, {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpiresAt: null,
    });

    // Emit email verification event
    this.eventEmitter.emit('user.emailVerified', {
      userId: user.id,
      email: user.email,
    });

    this.logger.log(`Email verified for user: ${user.email}`);
  }

  /**
   * Get current user profile
   */
  async getProfile(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId, status: UserStatus.ACTIVE, deletedAt: null },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.sanitizeUser(user);
  }

  /**
   * Resend email verification
   */
  async resendEmailVerification(email: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { email, status: UserStatus.ACTIVE, deletedAt: null },
    });

    if (!user || user.emailVerified) {
      // Don't reveal if email exists or is already verified for security
      return;
    }

    // Generate new verification token
    const emailVerificationToken = uuidv4();
    const emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.userRepository.update(user.id, {
      emailVerificationToken,
      emailVerificationExpiresAt,
    });

    // Emit email verification event
    this.eventEmitter.emit('user.emailVerificationRequested', {
      userId: user.id,
      email: user.email,
      token: emailVerificationToken,
    });

    this.logger.log(`Email verification resent for user: ${email}`);
  }

  /**
   * Get active sessions for user
   * Note: This is a simplified implementation. In production, you'd store session info in Redis
   */
  async getActiveSessions(userId: string): Promise<any[]> {
    // This is a placeholder implementation
    // In a real application, you would store session information in Redis
    // and track session IDs, creation times, IP addresses, etc.
    
    const user = await this.userRepository.findOne({
      where: { id: userId, status: UserStatus.ACTIVE, deletedAt: null },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Return mock session data - replace with actual Redis-based session tracking
    return [
      {
        sessionId: 'current_session',
        createdAt: user.lastLoginAt || new Date(),
        lastUsed: new Date(),
        ipAddress: '127.0.0.1',
        userAgent: 'Unknown',
        isCurrent: true,
      },
    ];
  }

  /**
   * Revoke specific session
   * Note: This is a simplified implementation. In production, you'd remove session from Redis
   */
  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId, status: UserStatus.ACTIVE, deletedAt: null },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // In a real implementation, you would:
    // 1. Remove the session from Redis
    // 2. Add the session ID to a blacklist
    // 3. Validate session IDs against the blacklist in JWT strategy

    if (sessionId === 'current_session') {
      // For now, just clear the refresh token to invalidate current session
      await this.userRepository.update(userId, {
        refreshTokenHash: null,
      });
    }

    this.logger.log(`Session revoked: ${sessionId} for user: ${userId}`);
  }

  // Private helper methods

  /**
   * Hash password using bcrypt
   */
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = Number(this.configService.get('BCRYPT_ROUNDS')) || 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Generate JWT access and refresh tokens
   */
  private async generateTokens(user: User): Promise<{ access: string; refresh: string }> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      // iat: Math.floor(Date.now() / 1000),
      // exp: Math.floor(Date.now() / 1000) + 15 * 60, // 15 minutes
    };

    const [access, refresh] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: this.configService.get<string>('jwt.expiresIn'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
      }),
    ]);

    return { access, refresh };
  }

  /**
   * Update user's refresh token hash
   */
  private async updateRefreshTokenHash(userId: string, refreshToken: string): Promise<void> {
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.userRepository.update(userId, { refreshTokenHash });
  }

  /**
   * Create new organization
   */
  private async createOrganization(name: string, createdBy: string): Promise<Organization> {
    const slug = this.generateSlug(name);
    
    const organization = this.organizationRepository.create({
      name,
      slug,
      status: OrganizationStatus.TRIAL,
      createdBy,
    });

    return this.organizationRepository.save(organization);
  }

  /**
   * Create organization membership
   */
  private async createMembership(
    userId: string,
    organizationId: string,
    role: MembershipRole,
  ): Promise<OrganizationMembership> {
    const membership = this.membershipRepository.create({
      userId,
      organizationId,
      role,
      status: MembershipStatus.ACTIVE,
      joinedAt: new Date(),
    });

    return this.membershipRepository.save(membership);
  }

  /**
   * Handle invitation acceptance
   */
  private async handleInvitationAcceptance(
    userId: string,
    inviteToken: string,
  ): Promise<OrganizationMembership> {
    console.log({ inviteToken , userId})
    const membership = await this.membershipRepository.findOne({
      where: { invitationToken: inviteToken, status: MembershipStatus.INVITED },
      relations: ['organization'],
    });

    console.log("Membership: ", membership )

    if (!membership || !membership.hasValidInvitationToken(inviteToken)) {
      throw new HttpException('Invalid or expired invitation token', HttpStatus.BAD_REQUEST);
    }

    // Update membership
    membership.userId = userId;
    membership.acceptInvitation();

    return this.membershipRepository.save(membership);
  }

  /**
   * Generate URL-friendly slug from name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 100);
  }

  async updateUserPassword (userId: string, newPassword: string): Promise<void> {
    const hashedPassword = await this.hashPassword(newPassword);
    await this.userRepository.update(userId, { passwordHash: hashedPassword });
  }

  /**
   * Remove sensitive fields from user object
   */
  private sanitizeUser(user: User): any {
    const { passwordHash, refreshTokenHash, ...sanitizedUser } = user;
    return sanitizedUser;
  }
}
