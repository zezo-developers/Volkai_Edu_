import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Course } from '../../../database/entities/course.entity';
import { Module } from '../../../database/entities/module.entity';
import { Lesson } from '../../../database/entities/lesson.entity';
import { Assessment } from '../../../database/entities/assessment.entity';
import { User } from '../../../database/entities/user.entity';
import {
  CreateVersionDto,
  PublishVersionDto,
  VersionResponseDto,
  VersionListResponseDto,
  CompareVersionsDto,
  RestoreVersionDto,
} from '../dto/versioning.dto';
import { v4 as uuid } from 'uuid';


export interface ContentVersion {
  id: string;
  entityType: 'course' | 'module' | 'lesson' | 'assessment';
  entityId: string;
  version: number;
  title: string;
  data: Record<string, any>;
  changeLog: string;
  createdBy: string;
  createdAt: Date;
  isPublished: boolean;
  publishedAt?: Date;
  publishedBy?: string;
  tags: string[];
  metadata: Record<string, any>;
}

@Injectable()
export class VersioningService {
  private readonly logger = new Logger(VersioningService.name);

  constructor(
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(Module)
    private moduleRepository: Repository<Module>,
    @InjectRepository(Lesson)
    private lessonRepository: Repository<Lesson>,
    @InjectRepository(Assessment)
    private assessmentRepository: Repository<Assessment>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private dataSource: DataSource,
    private eventEmitter: EventEmitter2,
  ) {}

  async createVersion(
    entityType: string,
    entityId: string,
    createVersionDto: CreateVersionDto,
    user: User,
  ): Promise<VersionResponseDto> {
    try {
      // Get the current entity data
      const entity = await this.getEntity(entityType, entityId);
      if (!entity) {
        throw new NotFoundException(`${entityType} not found`);
      }

      // Check permissions
      await this.checkPermissions(entity, user, 'create_version');

      // Get the next version number
      const versions = await this.getEntityVersions(entityType, entityId);
      const nextVersion = versions.length > 0 ? Math.max(...versions.map(v => v.version)) + 1 : 1;

      // Create version data
      const versionData = this.extractEntityData(entity);
      
      const version: ContentVersion = {
        id: this.generateVersionId(),
        entityType: entityType as any,
        entityId,
        version: nextVersion,
        title: createVersionDto.title || `Version ${nextVersion}`,
        data: versionData,
        changeLog: createVersionDto.changeLog || '',
        createdBy: user.id,
        createdAt: new Date(),
        isPublished: false,
        tags: createVersionDto.tags || [],
        metadata: createVersionDto.metadata || {},
      };

      // Store version (in a real implementation, this would be in a versions table)
      await this.storeVersion(version);

      // Emit event
      this.eventEmitter.emit('version.created', {
        version,
        entity,
        user,
      });

      this.logger.log(`Created version ${nextVersion} for ${entityType} ${entityId}`);

      return new VersionResponseDto(version);
    } catch (error) {
      this.logger.error(`Failed to create version for ${entityType} ${entityId}`, error);
      throw error;
    }
  }

  async publishVersion(
    versionId: string,
    publishVersionDto: PublishVersionDto,
    user: User,
  ): Promise<VersionResponseDto> {
    try {
      const version = await this.getVersion(versionId);
      if (!version) {
        throw new NotFoundException('Version not found');
      }

      // Get the entity to check permissions
      const entity = await this.getEntity(version.entityType, version.entityId);
      await this.checkPermissions(entity, user, 'publish');

      // Check if there's already a published version
      const publishedVersions = await this.getPublishedVersions(version.entityType, version.entityId);
      
      if (publishedVersions.length > 0 && !publishVersionDto.forcePublish) {
        throw new ForbiddenException('A published version already exists. Use forcePublish to override.');
      }

      // Start transaction
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Unpublish previous versions if force publish
        if (publishVersionDto.forcePublish) {
          await this.unpublishPreviousVersions(version.entityType, version.entityId, queryRunner);
        }

        // Update the entity with version data
        await this.applyVersionToEntity(version, queryRunner);

        // Mark version as published
        version.isPublished = true;
        version.publishedAt = new Date();
        version.publishedBy = user.id;
        await this.updateVersion(version);

        await queryRunner.commitTransaction();

        // Emit events
        this.eventEmitter.emit('version.published', {
          version,
          entity,
          user,
        });

        this.eventEmitter.emit(`${version.entityType}.updated`, entity);

        this.logger.log(`Published version ${version.version} for ${version.entityType} ${version.entityId}`);

        return new VersionResponseDto(version);
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      this.logger.error(`Failed to publish version ${versionId}`, error);
      throw error;
    }
  }

  async getVersions(
    entityType: string,
    entityId: string,
    user: User,
  ): Promise<VersionListResponseDto> {
    try {
      // Check permissions
      const entity = await this.getEntity(entityType, entityId);
      if (!entity) {
        throw new NotFoundException(`${entityType} not found`);
      }

      await this.checkPermissions(entity, user, 'view_versions');

      const versions = await this.getEntityVersions(entityType, entityId);
      
      // Sort by version number descending
      versions.sort((a, b) => b.version - a.version);

      return new VersionListResponseDto({
        items: versions,
        total: versions.length,
        entityType,
        entityId,
      });
    } catch (error) {
      this.logger.error(`Failed to get versions for ${entityType} ${entityId}`, error);
      throw error;
    }
  }

  async getVersion2(versionId: string): Promise<VersionResponseDto> {
    try {
      const version = await this.getVersionById(versionId);
      if (!version) {
        throw new NotFoundException('Version not found');
      }

      return new VersionResponseDto(version);
    } catch (error) {
      this.logger.error(`Failed to get version ${versionId}`, error);
      throw error;
    }
  }

  async compareVersions(
    compareDto: CompareVersionsDto,
    user: User,
  ): Promise<{
    baseVersion: VersionResponseDto;
    compareVersion: VersionResponseDto;
    differences: Record<string, any>;
  }> {
    try {
      const baseVersion = await this.getVersionById(compareDto.baseVersionId);
      const compareVersion = await this.getVersionById(compareDto.compareVersionId);

      if (!baseVersion || !compareVersion) {
        throw new NotFoundException('One or both versions not found');
      }

      if (baseVersion.entityId !== compareVersion.entityId) {
        throw new ForbiddenException('Cannot compare versions from different entities');
      }

      // Check permissions
      const entity = await this.getEntity(baseVersion.entityType, baseVersion.entityId);
      await this.checkPermissions(entity, user, 'view_versions');

      const differences = this.calculateDifferences(baseVersion.data, compareVersion.data);

      return {
        baseVersion: new VersionResponseDto(baseVersion),
        compareVersion: new VersionResponseDto(compareVersion),
        differences,
      };
    } catch (error) {
      this.logger.error('Failed to compare versions', error);
      throw error;
    }
  }

  async restoreVersion(
    restoreDto: RestoreVersionDto,
    user: User,
  ): Promise<VersionResponseDto> {
    try {
      const version = await this.getVersionById(restoreDto.versionId);
      if (!version) {
        throw new NotFoundException('Version not found');
      }

      // Check permissions
      const entity = await this.getEntity(version.entityType, version.entityId);
      await this.checkPermissions(entity, user, 'restore_version');

      // Create a new version with the restored data
      const newVersionDto: CreateVersionDto = {
        title: `Restored from version ${version.version}`,
        changeLog: `Restored from version ${version.version}: ${version.title}`,
        tags: ['restored'],
        metadata: {
          restoredFrom: version.id,
          restoredFromVersion: version.version,
        },
      };

      // Temporarily update the entity with the version data
      await this.applyVersionDataToEntity(version);

      // Create new version
      const newVersion = await this.createVersion(
        version.entityType,
        version.entityId,
        newVersionDto,
        user,
      );

      // Publish if requested
      if (restoreDto.publishImmediately) {
        await this.publishVersion(newVersion.id, { forcePublish: true }, user);
      }

      this.logger.log(`Restored version ${version.version} for ${version.entityType} ${version.entityId}`);

      return newVersion;
    } catch (error) {
      this.logger.error('Failed to restore version', error);
      throw error;
    }
  }

  async deleteVersion(versionId: string, user: User): Promise<void> {
    try {
      const version = await this.getVersionById(versionId);
      if (!version) {
        throw new NotFoundException('Version not found');
      }

      // Check permissions
      const entity = await this.getEntity(version.entityType, version.entityId);
      await this.checkPermissions(entity, user, 'delete_version');

      // Cannot delete published version
      if (version.isPublished) {
        throw new ForbiddenException('Cannot delete a published version');
      }

      await this.removeVersion(versionId);

      this.eventEmitter.emit('version.deleted', {
        version,
        user,
      });

      this.logger.log(`Deleted version ${version.version} for ${version.entityType} ${version.entityId}`);
    } catch (error) {
      this.logger.error(`Failed to delete version ${versionId}`, error);
      throw error;
    }
  }

  private async getEntity(entityType: string, entityId: string): Promise<any> {
    switch (entityType) {
      case 'course':
        return this.courseRepository.findOne({ where: { id: entityId } });
      case 'module':
        return this.moduleRepository.findOne({ where: { id: entityId } });
      case 'lesson':
        return this.lessonRepository.findOne({ where: { id: entityId } });
      case 'assessment':
        return this.assessmentRepository.findOne({ where: { id: entityId } });
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }
  }

  private async checkPermissions(entity: any, user: User, action: string): Promise<void> {
    // Basic permission check - in a real implementation, this would be more sophisticated
    const isOwner = entity.createdBy === user.id;
    const isAdmin = user.roles === 'admin';
    const isInstructor = user.roles === 'instructor';
    const isContentCreator = user.roles === 'content_creator';

    if (!isOwner && !isAdmin && !isInstructor && !isContentCreator) {
      throw new ForbiddenException(`Insufficient permissions to ${action}`);
    }
  }

  private extractEntityData(entity: any): Record<string, any> {
    // Extract relevant data from entity, excluding metadata fields
    const { id, createdAt, updatedAt, createdBy, ...data } = entity;
    return data;
  }

  private generateVersionId(): string {
    // return `version_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return uuid();
  }

  private async storeVersion(version: ContentVersion): Promise<void> {
    // In a real implementation, this would store in a versions table
    // For now, we'll use a simple in-memory store or file system
    // This is a placeholder implementation
    const key = `version_${version.id}`;
    // Store version data (implementation depends on your storage strategy)
  }

  public async getVersion(versionId: string): Promise<ContentVersion | null> {
    // Retrieve version from storage
    // This is a placeholder implementation
    return null;
  }

  private async getVersionById(versionId: string): Promise<ContentVersion | null> {
    return this.getVersion(versionId);
  }

  private async getEntityVersions(entityType: string, entityId: string): Promise<ContentVersion[]> {
    // Retrieve all versions for an entity
    // This is a placeholder implementation
    return [];
  }

  private async getPublishedVersions(entityType: string, entityId: string): Promise<ContentVersion[]> {
    const versions = await this.getEntityVersions(entityType, entityId);
    return versions.filter(v => v.isPublished);
  }

  private async updateVersion(version: ContentVersion): Promise<void> {
    // Update version in storage
    // This is a placeholder implementation
  }

  private async removeVersion(versionId: string): Promise<void> {
    // Remove version from storage
    // This is a placeholder implementation
  }

  private async applyVersionToEntity(version: ContentVersion, queryRunner?: any): Promise<void> {
    // Apply version data to the actual entity
    const repository = this.getRepositoryForEntityType(version.entityType);
    
    await repository.update(version.entityId, {
      ...version.data,
      updatedAt: new Date(),
    });
  }

  private async applyVersionDataToEntity(version: ContentVersion): Promise<void> {
    await this.applyVersionToEntity(version);
  }

  private async unpublishPreviousVersions(
    entityType: string,
    entityId: string,
    queryRunner?: any,
  ): Promise<void> {
    const publishedVersions = await this.getPublishedVersions(entityType, entityId);
    
    for (const version of publishedVersions) {
      version.isPublished = false;
      await this.updateVersion(version);
    }
  }

  private getRepositoryForEntityType(entityType: string): Repository<any> {
    switch (entityType) {
      case 'course':
        return this.courseRepository;
      case 'module':
        return this.moduleRepository;
      case 'lesson':
        return this.lessonRepository;
      case 'assessment':
        return this.assessmentRepository;
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }
  }

  private calculateDifferences(baseData: Record<string, any>, compareData: Record<string, any>): Record<string, any> {
    const differences: Record<string, any> = {};
    
    // Get all keys from both objects
    const allKeys = new Set([...Object.keys(baseData), ...Object.keys(compareData)]);
    
    for (const key of allKeys) {
      const baseValue = baseData[key];
      const compareValue = compareData[key];
      
      if (JSON.stringify(baseValue) !== JSON.stringify(compareValue)) {
        differences[key] = {
          base: baseValue,
          compare: compareValue,
          type: this.getDifferenceType(baseValue, compareValue),
        };
      }
    }
    
    return differences;
  }

  private getDifferenceType(baseValue: any, compareValue: any): string {
    if (baseValue === undefined && compareValue !== undefined) return 'added';
    if (baseValue !== undefined && compareValue === undefined) return 'removed';
    return 'modified';
  }
}
