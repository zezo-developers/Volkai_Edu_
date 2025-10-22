import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import { Organization, OrganizationStatus } from '@database/entities/organization.entity';
import { OrganizationMembership, MembershipRole, MembershipStatus } from '@database/entities/organization-membership.entity';
import { User, UserStatus } from '@database/entities/user.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { AuthenticatedUser } from '@modules/auth/strategies/jwt.strategy';

/**
 * Organizations Service
 * Handles organization management, member invitations, and multi-tenancy operations
 * Implements comprehensive RBAC and audit logging
 */
@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(OrganizationMembership)
    private readonly membershipRepository: Repository<OrganizationMembership>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Get user's organizations
   */
  async getUserOrganizations(userId: string): Promise<Organization[]> {
    const memberships = await this.membershipRepository.find({
      where: { userId, status: MembershipStatus.ACTIVE },
      relations: ['organization'],
      order: { createdAt: 'DESC' },
    });

    return memberships.map(membership => membership.organization);
  }

  /**
   * Create new organization
   */
  async createOrganization(
    createOrganizationDto: CreateOrganizationDto,
    currentUser: AuthenticatedUser,
  ): Promise<Organization> {
    const { name, domain, website, industry, size } = createOrganizationDto;

    // Generate unique slug
    const slug = await this.generateUniqueSlug(name);

    // Check domain uniqueness if provided
    if (domain) {
      const existingOrg = await this.organizationRepository.findOne({
        where: { domain },
      });

      if (existingOrg) {
        throw new ConflictException('Domain already in use by another organization');
      }
    }

    // Create organization
    const organization = this.organizationRepository.create({
      name,
      slug,
      domain,
      website,
      industry,
      size,
      status: OrganizationStatus.TRIAL,
      createdBy: currentUser.id,
    });

    const savedOrganization = await this.organizationRepository.save(organization);

    // Create owner membership
    const membership = this.membershipRepository.create({
      userId: currentUser.id,
      organizationId: savedOrganization.id,
      role: MembershipRole.OWNER,
      status: MembershipStatus.ACTIVE,
      joinedAt: new Date(),
    });

    await this.membershipRepository.save(membership);

    // Emit organization created event
    this.eventEmitter.emit('organization.created', {
      organizationId: savedOrganization.id,
      createdBy: currentUser.id,
      name: savedOrganization.name,
    });

    this.logger.log(`Organization created: ${savedOrganization.id} by ${currentUser.id}`);

    return savedOrganization;
  }

  /**
   * Get organization details with member count and usage stats
   */
  async getOrganizationById(
    organizationId: string,
    currentUser: AuthenticatedUser,
  ): Promise<any> {
    // Verify user has access to this organization
    const membership = await this.membershipRepository.findOne({
      where: {
        userId: currentUser.id,
        organizationId,
        status: MembershipStatus.ACTIVE,
      },
    });

    if (!membership) {
      throw new ForbiddenException('Access denied to this organization');
    }

    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
      relations: ['creator'],
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Get member count
    const memberCount = await this.membershipRepository.count({
      where: { organizationId, status: MembershipStatus.ACTIVE },
    });

    // TODO: Implement usage stats when other modules are ready
    const usage = {
      users: memberCount,
      courses: 0,
      jobs: 0,
      storage: 0,
    };

    return {
      ...organization,
      memberCount,
      usage,
    };
  }

  /**
   * Update organization
   */
  async updateOrganization(
    organizationId: string,
    updateOrganizationDto: UpdateOrganizationDto,
    currentUser: AuthenticatedUser,
  ): Promise<Organization> {
    // Check if user can manage organization
    const membership = await this.membershipRepository.findOne({
      where: {
        userId: currentUser.id,
        organizationId,
        status: MembershipStatus.ACTIVE,
      },
    });

    if (!membership || !membership.isAdmin) {
      throw new ForbiddenException('Insufficient permissions to update organization');
    }

    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check domain uniqueness if being updated
    if (updateOrganizationDto.domain && updateOrganizationDto.domain !== organization.domain) {
      const existingOrg = await this.organizationRepository.findOne({
        where: { domain: updateOrganizationDto.domain },
      });

      if (existingOrg) {
        throw new ConflictException('Domain already in use by another organization');
      }
    }

    // Update organization
    const updatedOrganization = await this.organizationRepository.save({
      ...organization,
      ...updateOrganizationDto,
      updatedAt: new Date(),
    });

    // Emit organization updated event
    this.eventEmitter.emit('organization.updated', {
      organizationId,
      updatedBy: currentUser.id,
      changes: updateOrganizationDto,
    });

    this.logger.log(`Organization updated: ${organizationId} by ${currentUser.id}`);

    return updatedOrganization;
  }

  /**
   * Delete organization (soft delete)
   */
  async deleteOrganization(
    organizationId: string,
    currentUser: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    // Only organization owner can delete
    const membership = await this.membershipRepository.findOne({
      where: {
        userId: currentUser.id,
        organizationId,
        role: MembershipRole.OWNER,
        status: MembershipStatus.ACTIVE,
      },
    });

    if (!membership) {
      throw new ForbiddenException('Only organization owner can delete the organization');
    }

    // Update organization status instead of hard delete
    await this.organizationRepository.update(organizationId, {
      status: OrganizationStatus.CANCELLED,
      updatedAt: new Date(),
    });

    // Deactivate all memberships
    await this.membershipRepository.update(
      { organizationId },
      { status: MembershipStatus.REMOVED },
    );

    // Emit organization deleted event
    this.eventEmitter.emit('organization.deleted', {
      organizationId,
      deletedBy: currentUser.id,
    });

    this.logger.log(`Organization deleted: ${organizationId} by ${currentUser.id}`);

    return { success: true };
  }

  /**
   * Get organization members
   */
  async getOrganizationMembers(
    organizationId: string,
    currentUser: AuthenticatedUser,
    query: {
      role?: string;
      status?: string;
      q?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{
    members: Array<OrganizationMembership & { user: User }>;
    total: number;
    page: number;
    limit: number;
  }> {
    // Verify user has access to this organization
    const userMembership = await this.membershipRepository.findOne({
      where: {
        userId: currentUser.id,
        organizationId,
        status: MembershipStatus.ACTIVE,
      },
    });

    if (!userMembership) {
      throw new ForbiddenException('Access denied to this organization');
    }

    const { role, status, q, page = 1, limit = 20 } = query;
    const offset = (page - 1) * limit;

    // Build query
    const queryBuilder = this.membershipRepository
      .createQueryBuilder('membership')
      .leftJoinAndSelect('membership.user', 'user')
      .where('membership.organizationId = :organizationId', { organizationId })
      .andWhere('user.deletedAt IS NULL');

    // Apply filters
    if (role) {
      queryBuilder.andWhere('membership.role = :role', { role });
    }

    if (status) {
      queryBuilder.andWhere('membership.status = :status', { status });
    } else {
      // Default to active members
      queryBuilder.andWhere('membership.status = :defaultStatus', {
        defaultStatus: MembershipStatus.ACTIVE,
      });
    }

    if (q) {
      queryBuilder.andWhere(
        '(LOWER(user.firstName) LIKE LOWER(:search) OR LOWER(user.lastName) LIKE LOWER(:search) OR LOWER(user.email) LIKE LOWER(:search))',
        { search: `%${q}%` },
      );
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Get paginated results
    const members = await queryBuilder
      .orderBy('membership.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany();

    return {
      members,
      total,
      page,
      limit,
    };
  }

  /**
   * Invite member to organization
   */
  async inviteMember(
    organizationId: string,
    inviteMemberDto: InviteMemberDto,
    currentUser: AuthenticatedUser,
  ): Promise<{ invitation: OrganizationMembership }> {
    const { email, role, message } = inviteMemberDto;

    // Check if user can manage members
    const membership = await this.membershipRepository.findOne({
      where: {
        userId: currentUser.id,
        organizationId,
        status: MembershipStatus.ACTIVE,
      },
    });

    if (!membership || !membership.canManageUsers) {
      throw new ForbiddenException('Insufficient permissions to invite members');
    }

    // Cannot invite as owner
    if (role === MembershipRole.OWNER) {
      throw new BadRequestException('Cannot invite user as owner');
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email, status: UserStatus.ACTIVE, deletedAt: null },
    });

    // Check if user is already a member
    if (existingUser) {
      const existingMembership = await this.membershipRepository.findOne({
        where: { userId: existingUser.id, organizationId },
      });

      if (existingMembership && existingMembership.status !== MembershipStatus.REMOVED) {
        throw new ConflictException('User is already a member of this organization');
      }
    }

    // Generate invitation token
    const invitationToken = uuidv4();
    const invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create invitation membership
    const invitation = this.membershipRepository.create({
      userId: existingUser?.id, // Will be null for new users
      organizationId,
      role,
      status: MembershipStatus.INVITED,
      invitedBy: currentUser.id,
      invitedAt: new Date(),
      invitationToken,
      invitationExpiresAt,
    });

    const savedInvitation = await this.membershipRepository.save(invitation);

    // Emit member invited event
    this.eventEmitter.emit('member.invited', {
      organizationId,
      email,
      role,
      invitedBy: currentUser.id,
      invitationToken,
      message,
      existingUser: !!existingUser,
    });

    this.logger.log(`Member invited: ${email} to ${organizationId} by ${currentUser.id}`);

    return { invitation: savedInvitation };
  }

  /**
   * Update member role or status
   */
  async updateMember(
    organizationId: string,
    userId: string,
    updateMemberDto: UpdateMemberDto,
    currentUser: AuthenticatedUser,
  ): Promise<OrganizationMembership> {
    // Check if user can manage members
    const currentMembership = await this.membershipRepository.findOne({
      where: {
        userId: currentUser.id,
        organizationId,
        status: MembershipStatus.ACTIVE,
      },
    });

    if (!currentMembership || !currentMembership.canManageUsers) {
      throw new ForbiddenException('Insufficient permissions to update members');
    }

    // Get member to update
    const membership = await this.membershipRepository.findOne({
      where: { userId, organizationId },
      relations: ['user'],
    });

    if (!membership) {
      throw new NotFoundException('Member not found in organization');
    }

    // Cannot update owner role
    if (membership.role === MembershipRole.OWNER) {
      throw new ForbiddenException('Cannot update organization owner');
    }

    // Cannot assign owner role
    if (updateMemberDto.role === MembershipRole.OWNER) {
      throw new BadRequestException('Cannot assign owner role');
    }

    // Update membership
    const updatedMembership = await this.membershipRepository.save({
      ...membership,
      ...updateMemberDto,
      status: updateMemberDto.status === 'active' ? MembershipStatus.ACTIVE : MembershipStatus.INACTIVE,
    });

    // Emit member updated event
    this.eventEmitter.emit('member.updated', {
      organizationId,
      userId,
      updatedBy: currentUser.id,
      changes: updateMemberDto,
    });

    this.logger.log(`Member updated: ${userId} in ${organizationId} by ${currentUser.id}`);

    return updatedMembership;
  }

  /**
   * Remove member from organization
   */
  async removeMember(
    organizationId: string,
    userId: string,
    currentUser: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    // Check if user can manage members
    const currentMembership = await this.membershipRepository.findOne({
      where: {
        userId: currentUser.id,
        organizationId,
        status: MembershipStatus.ACTIVE,
      },
    });

    if (!currentMembership || !currentMembership.canManageUsers) {
      throw new ForbiddenException('Insufficient permissions to remove members');
    }

    // Cannot remove self
    if (userId === currentUser.id) {
      throw new ForbiddenException('Cannot remove yourself from organization');
    }

    // Get member to remove
    const membership = await this.membershipRepository.findOne({
      where: { userId, organizationId },
    });

    if (!membership) {
      throw new NotFoundException('Member not found in organization');
    }

    // Cannot remove owner
    if (membership.role === MembershipRole.OWNER) {
      throw new ForbiddenException('Cannot remove organization owner');
    }

    // Update membership status
    await this.membershipRepository.update(membership.id, {
      status: MembershipStatus.REMOVED,
    });

    // Emit member removed event
    this.eventEmitter.emit('member.removed', {
      organizationId,
      userId,
      removedBy: currentUser.id,
    });

    this.logger.log(`Member removed: ${userId} from ${organizationId} by ${currentUser.id}`);

    return { success: true };
  }

  /**
   * Get organization settings
   */
  async getOrganizationSettings(
    organizationId: string,
    currentUser: AuthenticatedUser,
  ): Promise<Record<string, unknown>> {
    // Verify user has access to this organization
    const membership = await this.membershipRepository.findOne({
      where: {
        userId: currentUser.id,
        organizationId,
        status: MembershipStatus.ACTIVE,
      },
    });

    if (!membership) {
      throw new ForbiddenException('Access denied to this organization');
    }

    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization.settings || {};
  }

  /**
   * Update organization settings
   */
  async updateOrganizationSettings(
    organizationId: string,
    settings: Record<string, unknown>,
    currentUser: AuthenticatedUser,
  ): Promise<Record<string, unknown>> {
    // Check if user can manage organization
    const membership = await this.membershipRepository.findOne({
      where: {
        userId: currentUser.id,
        organizationId,
        status: MembershipStatus.ACTIVE,
      },
    });

    if (!membership || !membership.isAdmin) {
      throw new ForbiddenException('Insufficient permissions to update organization settings');
    }

    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Merge settings
    const updatedSettings = {
      ...organization.settings,
      ...settings,
    };

    await this.organizationRepository.update(organizationId, {
      settings: updatedSettings,
      updatedAt: new Date(),
    });

    // Emit settings updated event
    this.eventEmitter.emit('organization.settingsUpdated', {
      organizationId,
      updatedBy: currentUser.id,
      settings: updatedSettings,
    });

    this.logger.log(`Organization settings updated: ${organizationId} by ${currentUser.id}`);

    return updatedSettings;
  }

  // Private helper methods

  /**
   * Switch organization context for user
   */
  async switchOrganizationContext(
    organizationId: string,
    currentUser: AuthenticatedUser,
  ): Promise<{
    organizationId: string;
    organizationName: string;
    role: string;
    permissions: string[];
  }> {
    // Verify user has access to this organization
    const membership = await this.membershipRepository.findOne({
      where: {
        userId: currentUser.id,
        organizationId,
        status: MembershipStatus.ACTIVE,
      },
      relations: ['organization'],
    });

    if (!membership || !membership.organization) {
      throw new ForbiddenException('Access denied to this organization');
    }

    // Get user permissions for this organization
    const permissions = this.getUserPermissions(membership);

    // Emit organization switch event
    this.eventEmitter.emit('user.organizationSwitched', {
      userId: currentUser.id,
      fromOrganizationId: currentUser.currentOrganizationId,
      toOrganizationId: organizationId,
    });

    this.logger.log(`User ${currentUser.id} switched to organization: ${organizationId}`);

    return {
      organizationId,
      organizationName: membership.organization.name,
      role: membership.role,
      permissions,
    };
  }

  /**
   * Get organization audit logs
   */
  async getOrganizationAuditLogs(
    organizationId: string,
    currentUser: AuthenticatedUser,
    filters: {
      action?: string;
      actorId?: string;
      resourceType?: string;
      dateFrom?: Date;
      dateTo?: Date;
      page?: number;
      limit?: number;
    },
  ): Promise<{
    logs: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    // Verify user has access to this organization
    const membership = await this.membershipRepository.findOne({
      where: {
        userId: currentUser.id,
        organizationId,
        status: MembershipStatus.ACTIVE,
      },
    });

    if (!membership) {
      throw new ForbiddenException('Access denied to this organization');
    }

    // For now, return mock audit logs
    // In a real implementation, you would use the AuditService
    const { page = 1, limit = 50 } = filters;
    
    // Mock audit logs data
    const mockLogs = [
      {
        id: 'audit-1',
        action: 'user.create',
        resourceType: 'user',
        resourceId: 'user-123',
        actorName: 'John Doe',
        createdAt: new Date().toISOString(),
        metadata: { email: 'john@example.com' },
      },
      {
        id: 'audit-2',
        action: 'organization.update',
        resourceType: 'organization',
        resourceId: organizationId,
        actorName: 'Jane Smith',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        metadata: { field: 'name' },
      },
    ];

    return {
      logs: mockLogs,
      total: mockLogs.length,
      page,
      limit,
    };
  }

  // Private helper methods

  /**
   * Get user permissions based on their role
   */
  private getUserPermissions(membership: OrganizationMembership): string[] {
    const basePermissions = ['read:profile', 'update:profile'];
    
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

  /**
   * Generate unique slug for organization
   */
  private async generateUniqueSlug(name: string): Promise<string> {
    let baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 100);

    let slug = baseSlug;
    let counter = 1;

    while (await this.organizationRepository.findOne({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }
}
