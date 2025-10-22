import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { User, UserStatus } from '@database/entities/user.entity';
import { OrganizationMembership, MembershipStatus } from '@database/entities/organization-membership.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthenticatedUser } from '@modules/auth/strategies/jwt.strategy';

/**
 * Users Service
 * Handles user profile management, organization membership, and user operations
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(OrganizationMembership)
    private readonly membershipRepository: Repository<OrganizationMembership>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Get users in the current organization
   * Supports filtering and pagination
   */
  async getUsers(
    currentUser: AuthenticatedUser,
    query: {
      q?: string;
      role?: string;
      status?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<any> {
    if (!currentUser.currentOrganizationId) {
      throw new ForbiddenException('No organization context');
    }

    const { q, role, status, page = 1, limit = 20 } = query;
    const offset = (page - 1) * limit;

    // Build query for organization members
    const queryBuilder = this.membershipRepository
      .createQueryBuilder('membership')
      .leftJoinAndSelect('membership.user', 'user')
      .leftJoinAndSelect('membership.organization', 'organization')
      .where('membership.organizationId = :orgId', { orgId: currentUser.currentOrganizationId })
      .andWhere('membership.status = :membershipStatus', { membershipStatus: MembershipStatus.ACTIVE })
      .andWhere('user.status = :userStatus', { userStatus: UserStatus.ACTIVE })
      .andWhere('user.deletedAt IS NULL');

    // Apply filters
    if (q) {
      queryBuilder.andWhere(
        '(LOWER(user.firstName) LIKE LOWER(:search) OR LOWER(user.lastName) LIKE LOWER(:search) OR LOWER(user.email) LIKE LOWER(:search))',
        { search: `%${q}%` },
      );
    }

    if (role) {
      queryBuilder.andWhere('membership.role = :role', { role });
    }

    if (status) {
      queryBuilder.andWhere('user.status = :status', { status });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Get paginated results
    const memberships = await queryBuilder
      .orderBy('user.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany();

    // Transform results
    const users = memberships.map(membership => ({
      ...membership.user,
      membership: {
        ...membership,
        user: undefined, // Remove circular reference
      },
    }));

    return {
      users,
      total,
      page,
      limit,
    };
  }

  /**
   * Get user by ID (within organization context)
   */
  async getUserById(
    userId: string,
    currentUser: AuthenticatedUser,
  ): Promise<any> {
    if (!currentUser.currentOrganizationId) {
      throw new ForbiddenException('No organization context');
    }

    const membership = await this.membershipRepository.findOne({
      where: {
        userId,
        organizationId: currentUser.currentOrganizationId,
        status: MembershipStatus.ACTIVE,
      },
      relations: ['user', 'organization'],
    });

    if (!membership || !membership.user) {
      throw new NotFoundException('User not found in organization');
    }

    if (membership.user.status !== UserStatus.ACTIVE || membership.user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    return {
      ...membership.user,
      membership: {
        ...membership,
        user: undefined, // Remove circular reference
      },
    };
  }

  /**
   * Update user profile
   * Users can update their own profile, admins can update any user in their org
   */
  async updateUser(
    userId: string,
    updateUserDto: UpdateUserDto,
    currentUser: AuthenticatedUser,
  ): Promise<User> {
    // Check if user can update this profile
    if (userId !== currentUser.id && !currentUser.currentMembership?.canManageUsers) {
      throw new ForbiddenException('Insufficient permissions to update this user');
    }

    // Get user to update
    const user = await this.getUserById(userId, currentUser);

    // Check for phone number conflicts
    if (updateUserDto.phone && updateUserDto.phone !== user.phone) {
      const existingUser = await this.userRepository.findOne({
        where: { phone: updateUserDto.phone },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException('Phone number already in use');
      }
    }

    // Update user
    const updatedUser = await this.userRepository.save({
      ...user,
      ...updateUserDto,
      updatedAt: new Date(),
    });

    // Emit user updated event
    this.eventEmitter.emit('user.updated', {
      userId: updatedUser.id,
      updatedBy: currentUser.id,
      organizationId: currentUser.currentOrganizationId,
      changes: updateUserDto,
    });

    this.logger.log(`User updated: ${updatedUser.id} by ${currentUser.id}`);

    return this.sanitizeUser(updatedUser);
  }

  /**
   * Upload user avatar
   */
  async uploadAvatar(
    userId: string,
    avatarUrl: string,
    currentUser: AuthenticatedUser,
  ): Promise<{ avatarUrl: string }> {
    // Check if user can update this profile
    if (userId !== currentUser.id && !currentUser.currentMembership?.canManageUsers) {
      throw new ForbiddenException('Insufficient permissions to update this user');
    }

    // Update user avatar
    await this.userRepository.update(userId, {
      avatarUrl,
      updatedAt: new Date(),
    });

    // Emit avatar updated event
    this.eventEmitter.emit('user.avatarUpdated', {
      userId,
      avatarUrl,
      updatedBy: currentUser.id,
      organizationId: currentUser.currentOrganizationId,
    });

    this.logger.log(`Avatar updated for user: ${userId} by ${currentUser.id}`);

    return { avatarUrl };
  }

  /**
   * Deactivate user (soft delete)
   * Only admins can deactivate users
   */
  async deactivateUser(
    userId: string,
    currentUser: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    if (!currentUser.currentMembership?.canManageUsers) {
      throw new ForbiddenException('Insufficient permissions to deactivate users');
    }

    // Cannot deactivate yourself
    if (userId === currentUser.id) {
      throw new ForbiddenException('Cannot deactivate your own account');
    }

    // Get user to deactivate
    const user = await this.getUserById(userId, currentUser);

    // Cannot deactivate organization owner
    if (user.membership.role === 'owner') {
      throw new ForbiddenException('Cannot deactivate organization owner');
    }

    // Deactivate user
    await this.userRepository.update(userId, {
      status: UserStatus.INACTIVE,
      updatedAt: new Date(),
    });

    // Deactivate organization membership
    await this.membershipRepository.update(
      { userId, organizationId: currentUser.currentOrganizationId },
      { status: MembershipStatus.INACTIVE },
    );

    // Emit user deactivated event
    this.eventEmitter.emit('user.deactivated', {
      userId,
      deactivatedBy: currentUser.id,
      organizationId: currentUser.currentOrganizationId,
    });

    this.logger.log(`User deactivated: ${userId} by ${currentUser.id}`);

    return { success: true };
  }

  /**
   * Reactivate user
   * Only admins can reactivate users
   */
  async reactivateUser(
    userId: string,
    currentUser: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    if (!currentUser.currentMembership?.canManageUsers) {
      throw new ForbiddenException('Insufficient permissions to reactivate users');
    }

    // Find inactive membership
    const membership = await this.membershipRepository.findOne({
      where: {
        userId,
        organizationId: currentUser.currentOrganizationId,
        status: MembershipStatus.INACTIVE,
      },
      relations: ['user'],
    });

    if (!membership || !membership.user) {
      throw new NotFoundException('Inactive user not found in organization');
    }

    // Reactivate user
    await this.userRepository.update(userId, {
      status: UserStatus.ACTIVE,
      updatedAt: new Date(),
    });

    // Reactivate organization membership
    await this.membershipRepository.update(membership.id, {
      status: MembershipStatus.ACTIVE,
    });

    // Emit user reactivated event
    this.eventEmitter.emit('user.reactivated', {
      userId,
      reactivatedBy: currentUser.id,
      organizationId: currentUser.currentOrganizationId,
    });

    this.logger.log(`User reactivated: ${userId} by ${currentUser.id}`);

    return { success: true };
  }

  /**
   * Get user's organization memberships
   */
  async getUserMemberships(userId: string): Promise<OrganizationMembership[]> {
    return this.membershipRepository.find({
      where: { userId, status: MembershipStatus.ACTIVE },
      relations: ['organization'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Remove sensitive fields from user object
   */
  private sanitizeUser(user: User): User {
    const { passwordHash, refreshTokenHash, emailVerificationToken, passwordResetToken, ...sanitizedUser } = user;
    return sanitizedUser as User;
  }
}
