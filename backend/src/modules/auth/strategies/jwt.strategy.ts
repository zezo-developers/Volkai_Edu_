import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from '@database/entities/user.entity';
import { OrganizationMembership, MembershipStatus } from '@database/entities/organization-membership.entity';

/**
 * JWT payload interface
 */
export interface JwtPayload {
  sub: string; // User ID
  email: string;
  iat: number;
  exp: number;
}

/**
 * Authenticated user interface with organization context
 */
export interface AuthenticatedUser extends User {
  currentOrganizationId?: string;
  currentMembership?: OrganizationMembership;
  permissions?: string[];
}

/**
 * JWT Strategy for validating JWT tokens
 * Implements Passport JWT strategy with user validation and organization context
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(OrganizationMembership)
    private readonly membershipRepository: Repository<OrganizationMembership>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret'),
    });
  }

  /**
   * Validate JWT payload and return authenticated user
   * Called automatically by Passport when JWT is valid
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const { sub: userId, email } = payload;

    // Find user with active status
    const user = await this.userRepository.findOne({
      where: {
        id: userId,
        email,
        status: UserStatus.ACTIVE,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Check if user is verified
    if (!user.emailVerified) {
      throw new UnauthorizedException('Email not verified');
    }

    // Get user's active organization memberships
    const memberships = await this.membershipRepository.find({
      where: {
        userId: user.id,
        status: MembershipStatus.ACTIVE,
      },
      relations: ['organization'],
    });

    // Set current organization (first active membership or null)
    const currentMembership = memberships[0] || null;
    const authenticatedUser: any = {
      ...user,
      currentOrganizationId: currentMembership?.organizationId,
      currentMembership,
      permissions: currentMembership ? this.getUserPermissions(currentMembership) : [],
    };

    return authenticatedUser;
  }

  /**
   * Get user permissions based on their role in the current organization
   */
  private getUserPermissions(membership: OrganizationMembership): string[] {
    // This will be expanded when we implement the full RBAC system
    const basePermissions = ['read:profile', 'update:profile'];
    
    // Add role-based permissions (simplified for now)
    switch (membership.role) {
      case 'owner':
        return [
          ...basePermissions,
          'manage:organization',
          'manage:users',
          'manage:billing',
          'manage:content',
          'manage:jobs',
          'conduct:interviews',
          'view:analytics',
        ];
      case 'admin':
        return [
          ...basePermissions,
          'manage:users',
          'manage:content',
          'manage:jobs',
          'conduct:interviews',
          'view:analytics',
        ];
      case 'manager':
        return [
          ...basePermissions,
          'manage:content',
          'manage:jobs',
          'conduct:interviews',
          'view:team_analytics',
        ];
      case 'hr':
        return [
          ...basePermissions,
          'manage:users',
          'manage:jobs',
          'conduct:interviews',
          'view:hr_analytics',
        ];
      case 'interviewer':
        return [
          ...basePermissions,
          'conduct:interviews',
          'view:interview_analytics',
        ];
      case 'learner':
        return [
          ...basePermissions,
          'enroll:courses',
          'take:assessments',
          'apply:jobs',
        ];
      default:
        return basePermissions;
    }
  }
}
