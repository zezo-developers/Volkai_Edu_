import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InterviewQuestionBank, InterviewDifficulty } from '../../../database/entities/interview-question-bank.entity';
import { InterviewQuestion, QuestionType } from '../../../database/entities/interview-question.entity';
import { User, UserRole } from '../../../database/entities/user.entity';
import { Organization } from '../../../database/entities/organization.entity';
import {
  CreateQuestionBankDto,
  UpdateQuestionBankDto,
  SearchQuestionBanksDto,
  CreateQuestionDto,
  UpdateQuestionDto,
  QuestionBankResponseDto,
  QuestionBankListResponseDto,
  QuestionResponseDto,
  QuestionListResponseDto,
  BulkImportQuestionsDto,
  QuestionBankStatsDto,
} from '../dto/question-bank.dto';

@Injectable()
export class QuestionBankService {
  private readonly logger = new Logger(QuestionBankService.name);

  constructor(
    @InjectRepository(InterviewQuestionBank)
    private questionBankRepository: Repository<InterviewQuestionBank>,
    @InjectRepository(InterviewQuestion)
    private questionRepository: Repository<InterviewQuestion>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    private dataSource: DataSource,
    private eventEmitter: EventEmitter2,
  ) {}

  async createQuestionBank(
    createDto: CreateQuestionBankDto,
    user: User,
  ): Promise<InterviewQuestionBank> {
    try {
      // Validate permissions
      if (user.roles=== UserRole.STUDENT) {
        throw new ForbiddenException('Students cannot create question banks');
      }

      // Validate organization if specified
      if (createDto.organizationId && createDto.organizationId !== user.organizationId) {
        throw new ForbiddenException('Cannot create question bank for different organization');
      }

      const questionBank = this.questionBankRepository.create({
        organizationId: createDto.organizationId || user.organizationId,
        name: createDto.name,
        description: createDto.description,
        category: createDto.category,
        difficulty: createDto.difficulty,
        tags: createDto.tags || [],
        isPublic: createDto.isPublic || false,
        iconUrl: createDto.iconUrl,
        color: createDto.color,
        config: {
          allowRandomSelection: createDto.allowRandomSelection ?? true,
          defaultTimeLimit: createDto.defaultTimeLimit,
          requireAllQuestions: createDto.requireAllQuestions ?? false,
          shuffleQuestions: createDto.shuffleQuestions ?? true,
        },
        statistics: {
          totalQuestions: 0,
          totalUsage: 0,
          averageRating: 0,
        },
        createdBy: user.id,
      });

      const savedBank = await this.questionBankRepository.save(questionBank);

      // Emit event
      this.eventEmitter.emit('question.bank.created', {
        questionBank: savedBank,
        user,
      });

      this.logger.log(`Question bank created: ${savedBank.id}`);

      return savedBank;
    } catch (error) {
      this.logger.error('Failed to create question bank', error);
      throw error;
    }
  }

  async getQuestionBankById(id: string, user: User): Promise<InterviewQuestionBank> {
    try {
      const questionBank = await this.questionBankRepository.findOne({
        where: { id },
        relations: ['creator', 'organization', 'questions'],
      });

      if (!questionBank) {
        throw new NotFoundException('Question bank not found');
      }

      // Check permissions
      await this.validateViewPermissions(questionBank, user);

      return questionBank;
    } catch (error) {
      this.logger.error(`Failed to get question bank ${id}`, error);
      throw error;
    }
  }

  async searchQuestionBanks(
    searchDto: SearchQuestionBanksDto,
    user: User,
  ): Promise<QuestionBankListResponseDto> {
    try {
      const queryBuilder = this.questionBankRepository
        .createQueryBuilder('bank')
        .leftJoinAndSelect('bank.creator', 'creator')
        .leftJoinAndSelect('bank.organization', 'organization')
        .leftJoin('bank.questions', 'questions')
        .addSelect('COUNT(questions.id)', 'questionCount')
        .groupBy('bank.id, creator.id, organization.id');

      // Apply access control
      if (user.roles=== UserRole.STUDENT) {
        queryBuilder.where('bank.isPublic = :isPublic', { isPublic: true });
      } else {
        queryBuilder.where(
          '(bank.isPublic = :isPublic OR bank.organizationId = :orgId OR bank.createdBy = :userId)',
          { isPublic: true, orgId: user.organizationId, userId: user.id }
        );
      }

      // Apply filters
      if (searchDto.search) {
        queryBuilder.andWhere(
          '(bank.name ILIKE :search OR bank.description ILIKE :search OR bank.category ILIKE :search)',
          { search: `%${searchDto.search}%` }
        );
      }

      if (searchDto.category) {
        queryBuilder.andWhere('bank.category = :category', { category: searchDto.category });
      }

      if (searchDto.difficulty) {
        queryBuilder.andWhere('bank.difficulty = :difficulty', { difficulty: searchDto.difficulty });
      }

      if (searchDto.tags && searchDto.tags.length > 0) {
        queryBuilder.andWhere('bank.tags && :tags', { tags: searchDto.tags });
      }

      if (searchDto.isPublic !== undefined) {
        queryBuilder.andWhere('bank.isPublic = :isPublic', { isPublic: searchDto.isPublic });
      }

      if (searchDto.createdBy) {
        queryBuilder.andWhere('bank.createdBy = :createdBy', { createdBy: searchDto.createdBy });
      }

      // Apply sorting
      const sortBy = searchDto.sortBy || 'createdAt';
      const sortOrder = searchDto.sortOrder || 'DESC';
      queryBuilder.orderBy(`bank.${sortBy}`, sortOrder);

      // Apply pagination
      const page = searchDto.page || 1;
      const limit = searchDto.limit || 20;
      queryBuilder.skip((page - 1) * limit).take(limit);

      const [banks, total] = await queryBuilder.getManyAndCount();

      return new QuestionBankListResponseDto({
        items: banks,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      this.logger.error('Failed to search question banks', error);
      throw error;
    }
  }

  async updateQuestionBank(
    id: string,
    updateDto: UpdateQuestionBankDto,
    user: User,
  ): Promise<InterviewQuestionBank> {
    try {
      const questionBank = await this.getQuestionBankById(id, user);

      // Check permissions
      await this.validateUpdatePermissions(questionBank, user);

      // Update fields
      Object.assign(questionBank, {
        ...updateDto,
        updatedAt: new Date(),
      });

      // Update configuration
      if (updateDto.allowRandomSelection !== undefined ||
          updateDto.defaultTimeLimit !== undefined ||
          updateDto.requireAllQuestions !== undefined ||
          updateDto.shuffleQuestions !== undefined) {
        questionBank.config = {
          ...questionBank.config,
          allowRandomSelection: updateDto.allowRandomSelection ?? questionBank.config.allowRandomSelection,
          defaultTimeLimit: updateDto.defaultTimeLimit ?? questionBank.config.defaultTimeLimit,
          requireAllQuestions: updateDto.requireAllQuestions ?? questionBank.config.requireAllQuestions,
          shuffleQuestions: updateDto.shuffleQuestions ?? questionBank.config.shuffleQuestions,
        };
      }

      const updatedBank = await this.questionBankRepository.save(questionBank);

      // Emit event
      this.eventEmitter.emit('question.bank.updated', {
        questionBank: updatedBank,
        user,
      });

      this.logger.log(`Question bank updated: ${id}`);

      return updatedBank;
    } catch (error) {
      this.logger.error(`Failed to update question bank ${id}`, error);
      throw error;
    }
  }

  async deleteQuestionBank(id: string, user: User): Promise<void> {
    try {
      const questionBank = await this.getQuestionBankById(id, user);

      // Check permissions
      await this.validateDeletePermissions(questionBank, user);

      // Check if bank is being used
      if (questionBank.statistics.totalUsage > 0) {
        throw new BadRequestException('Cannot delete question bank that has been used in interviews');
      }

      await this.questionBankRepository.remove(questionBank);

      // Emit event
      this.eventEmitter.emit('question.bank.deleted', {
        questionBankId: id,
        user,
      });

      this.logger.log(`Question bank deleted: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete question bank ${id}`, error);
      throw error;
    }
  }

  async cloneQuestionBank(
    id: string,
    newName: string,
    user: User,
  ): Promise<InterviewQuestionBank> {
    try {
      const originalBank = await this.getQuestionBankById(id, user);

      // Create cloned bank
      const clonedBankData = originalBank.clone(newName, user.id);
      const clonedBank = this.questionBankRepository.create(clonedBankData);
      const savedBank = await this.questionBankRepository.save(clonedBank);

      // Clone questions
      if (originalBank.questions && originalBank.questions.length > 0) {
        const clonedQuestions = originalBank.questions.map(question => {
          const clonedQuestionData = question.clone();
          return this.questionRepository.create({
            ...clonedQuestionData,
            questionBankId: savedBank.id,
          });
        });

        await this.questionRepository.save(clonedQuestions);
        savedBank.updateStatistics();
        await this.questionBankRepository.save(savedBank);
      }

      // Emit event
      this.eventEmitter.emit('question.bank.cloned', {
        originalBank,
        clonedBank: savedBank,
        user,
      });

      this.logger.log(`Question bank cloned: ${id} -> ${savedBank.id}`);

      return savedBank;
    } catch (error) {
      this.logger.error(`Failed to clone question bank ${id}`, error);
      throw error;
    }
  }

  async createQuestion(
    bankId: string,
    createDto: CreateQuestionDto,
    user: User,
  ): Promise<InterviewQuestion> {
    try {
      const questionBank = await this.getQuestionBankById(bankId, user);

      // Check permissions
      await this.validateUpdatePermissions(questionBank, user);

      // Validate question data
      const validationResult = this.validateQuestionData(createDto);
      if (!validationResult.isValid) {
        throw new BadRequestException(validationResult.errors.join(', '));
      }

      const question = this.questionRepository.create({
        questionBankId: bankId,
        questionText: createDto.questionText,
        expectedAnswer: createDto.expectedAnswer,
        followUpQuestions: createDto.followUpQuestions || [],
        evaluationCriteria: createDto.evaluationCriteria || {},
        timeLimitMinutes: createDto.timeLimitMinutes,
        difficulty: createDto.difficulty || InterviewDifficulty.MEDIUM,
        type: createDto.type || QuestionType.GENERAL,
        tags: createDto.tags || [],
        hints: createDto.hints || [],
        sampleAnswers: createDto.sampleAnswers || [],
        resources: createDto.resources || [],
        config: createDto.config || {},
        orderIndex: createDto.orderIndex,
      });

      const savedQuestion = await this.questionRepository.save(question);

      // Update bank statistics
      questionBank.updateStatistics();
      await this.questionBankRepository.save(questionBank);

      // Emit event
      this.eventEmitter.emit('question.created', {
        question: savedQuestion,
        questionBank,
        user,
      });

      this.logger.log(`Question created: ${savedQuestion.id} in bank ${bankId}`);

      return savedQuestion;
    } catch (error) {
      this.logger.error(`Failed to create question in bank ${bankId}`, error);
      throw error;
    }
  }

  async getQuestionById(id: string, user: User): Promise<InterviewQuestion> {
    try {
      const question = await this.questionRepository.findOne({
        where: { id },
        relations: ['questionBank'],
      });

      if (!question) {
        throw new NotFoundException('Question not found');
      }

      // Check permissions through question bank
      await this.validateViewPermissions(question.questionBank, user);

      return question;
    } catch (error) {
      this.logger.error(`Failed to get question ${id}`, error);
      throw error;
    }
  }

  async getQuestionsByBank(
    bankId: string,
    user: User,
    page: number = 1,
    limit: number = 50,
  ): Promise<QuestionListResponseDto> {
    try {
      const questionBank = await this.getQuestionBankById(bankId, user);

      const [questions, total] = await this.questionRepository.findAndCount({
        where: { questionBankId: bankId },
        order: { orderIndex: 'ASC', createdAt: 'ASC' },
        skip: (page - 1) * limit,
        take: limit,
      });

      return new QuestionListResponseDto({
        items: questions,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        questionBank,
      });
    } catch (error) {
      this.logger.error(`Failed to get questions for bank ${bankId}`, error);
      throw error;
    }
  }

  async updateQuestion(
    id: string,
    updateDto: UpdateQuestionDto,
    user: User,
  ): Promise<InterviewQuestion> {
    try {
      const question = await this.getQuestionById(id, user);

      // Check permissions
      await this.validateUpdatePermissions(question.questionBank, user);

      // Validate updated data
      if (Object.keys(updateDto).length > 0) {
        const validationResult = this.validateQuestionData(updateDto);
        if (!validationResult.isValid) {
          throw new BadRequestException(validationResult.errors.join(', '));
        }
      }

      // Update fields
      Object.assign(question, {
        ...updateDto,
        updatedAt: new Date(),
      });

      const updatedQuestion = await this.questionRepository.save(question);

      // Emit event
      this.eventEmitter.emit('question.updated', {
        question: updatedQuestion,
        user,
      });

      this.logger.log(`Question updated: ${id}`);

      return updatedQuestion;
    } catch (error) {
      this.logger.error(`Failed to update question ${id}`, error);
      throw error;
    }
  }

  async deleteQuestion(id: string, user: User): Promise<void> {
    try {
      const question = await this.getQuestionById(id, user);

      // Check permissions
      await this.validateUpdatePermissions(question.questionBank, user);

      // Check if question is being used
      if (question.statistics.timesUsed > 0) {
        throw new BadRequestException('Cannot delete question that has been used in interviews');
      }

      await this.questionRepository.remove(question);

      // Update bank statistics
      question.questionBank.updateStatistics();
      await this.questionBankRepository.save(question.questionBank);

      // Emit event
      this.eventEmitter.emit('question.deleted', {
        questionId: id,
        questionBank: question.questionBank,
        user,
      });

      this.logger.log(`Question deleted: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete question ${id}`, error);
      throw error;
    }
  }

  async bulkImportQuestions(
    bankId: string,
    importDto: BulkImportQuestionsDto,
    user: User,
  ): Promise<{ imported: number; errors: string[] }> {
    try {
      const questionBank = await this.getQuestionBankById(bankId, user);

      // Check permissions
      await this.validateUpdatePermissions(questionBank, user);

      const errors: string[] = [];
      let imported = 0;

      // Use transaction for bulk import
      await this.dataSource.transaction(async manager => {
        for (let i = 0; i < importDto.questions.length; i++) {
          try {
            const questionData = importDto.questions[i];

            // Validate question data
            const validationResult = this.validateQuestionData(questionData);
            if (!validationResult.isValid) {
              errors.push(`Question ${i + 1}: ${validationResult.errors.join(', ')}`);
              continue;
            }

            const question = manager.create(InterviewQuestion, {
              questionBankId: bankId,
              ...questionData,
              orderIndex: questionData.orderIndex || i,
            });

            await manager.save(question);
            imported++;
          } catch (error) {
            errors.push(`Question ${i + 1}: ${error.message}`);
          }
        }

        // Update bank statistics
        questionBank.updateStatistics();
        await manager.save(questionBank);
      });

      // Emit event
      this.eventEmitter.emit('questions.bulk.imported', {
        questionBank,
        imported,
        errors: errors.length,
        user,
      });

      this.logger.log(`Bulk import completed for bank ${bankId}: ${imported} imported, ${errors.length} errors`);

      return { imported, errors };
    } catch (error) {
      this.logger.error(`Failed to bulk import questions to bank ${bankId}`, error);
      throw error;
    }
  }

  async getQuestionBankStats(
    bankId: string,
    user: User,
  ): Promise<QuestionBankStatsDto> {
    try {
      const questionBank = await this.getQuestionBankById(bankId, user);

      // Get detailed statistics
      const questionStats = await this.questionRepository
        .createQueryBuilder('question')
        .select([
          'COUNT(*) as total_questions',
          'AVG(question.statistics->\'averageScore\') as avg_score',
          'SUM((question.statistics->\'timesUsed\')::int) as total_usage',
          'question.difficulty',
          'question.type',
        ])
        .where('question.questionBankId = :bankId', { bankId })
        .groupBy('question.difficulty, question.type')
        .getRawMany();

      const stats = {
        totalQuestions: questionBank.questionCount,
        totalUsage: questionBank.statistics.totalUsage || 0,
        averageRating: questionBank.statistics.averageRating || 0,
        lastUsed: questionBank.statistics.lastUsed,
        questionsByDifficulty: this.groupStatsByDifficulty(questionStats),
        questionsByType: this.groupStatsByType(questionStats),
        averageScore: this.calculateAverageScore(questionStats),
        popularQuestions: await this.getPopularQuestions(bankId, 5),
        recentActivity: await this.getRecentActivity(bankId),
      };

      return new QuestionBankStatsDto(stats);
    } catch (error) {
      this.logger.error(`Failed to get stats for question bank ${bankId}`, error);
      throw error;
    }
  }

  // Private helper methods
  private async validateViewPermissions(questionBank: InterviewQuestionBank, user: User): Promise<void> {
    const isPublic = questionBank.isPublic;
    const isOwner = questionBank.createdBy === user.id;
    const isOrgMember = questionBank.organizationId === user.organizationId;
    const isAdmin = user.roles=== UserRole.ADMIN;

    if (!isPublic && !isOwner && !isOrgMember && !isAdmin) {
      throw new ForbiddenException('Insufficient permissions to view question bank');
    }
  }

  private async validateUpdatePermissions(questionBank: InterviewQuestionBank, user: User): Promise<void> {
    const isOwner = questionBank.createdBy === user.id;
    const isOrgAdmin = questionBank.organizationId === user.organizationId && 
                      [UserRole.ADMIN, UserRole.INSTRUCTOR].includes(user.roles as any);
    const isSystemAdmin = user.roles=== UserRole.ADMIN;

    if (!isOwner && !isOrgAdmin && !isSystemAdmin) {
      throw new ForbiddenException('Insufficient permissions to modify question bank');
    }
  }

  private async validateDeletePermissions(questionBank: InterviewQuestionBank, user: User): Promise<void> {
    const isOwner = questionBank.createdBy === user.id;
    const isSystemAdmin = user.roles=== UserRole.ADMIN;

    if (!isOwner && !isSystemAdmin) {
      throw new ForbiddenException('Only the creator or system admin can delete question bank');
    }
  }

  private validateQuestionData(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.questionText || data.questionText.trim().length < 10) {
      errors.push('Question text must be at least 10 characters long');
    }

    if (data.timeLimitMinutes && data.timeLimitMinutes < 1) {
      errors.push('Time limit must be at least 1 minute');
    }

    if (data.sampleAnswers && data.sampleAnswers.some((sa: any) => sa.rating < 0 || sa.rating > 100)) {
      errors.push('Sample answer ratings must be between 0 and 100');
    }

    if (data.evaluationCriteria) {
      const criteriaValues = Object.values(data.evaluationCriteria);
      if (criteriaValues.some((v: any) => typeof v === 'number' && (v < 0 || v > 10))) {
        errors.push('Evaluation criteria weights must be between 0 and 10');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private groupStatsByDifficulty(stats: any[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    stats.forEach(stat => {
      grouped[stat.difficulty] = parseInt(stat.total_questions);
    });
    return grouped;
  }

  private groupStatsByType(stats: any[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    stats.forEach(stat => {
      grouped[stat.type] = parseInt(stat.total_questions);
    });
    return grouped;
  }

  private calculateAverageScore(stats: any[]): number {
    if (stats.length === 0) return 0;
    const totalScore = stats.reduce((sum, stat) => sum + (parseFloat(stat.avg_score) || 0), 0);
    return totalScore / stats.length;
  }

  private async getPopularQuestions(bankId: string, limit: number): Promise<any[]> {
    return await this.questionRepository
      .createQueryBuilder('question')
      .where('question.questionBankId = :bankId', { bankId })
      .orderBy('(question.statistics->\'timesUsed\')::int', 'DESC')
      .limit(limit)
      .getMany();
  }

  private async getRecentActivity(bankId: string): Promise<any[]> {
    // This would typically query an activity log table
    // For now, return recent questions
    return await this.questionRepository
      .createQueryBuilder('question')
      .where('question.questionBankId = :bankId', { bankId })
      .orderBy('question.updatedAt', 'DESC')
      .limit(10)
      .getMany();
  }
}
