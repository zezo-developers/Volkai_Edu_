import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsUUID,
  IsNumber,
  IsObject,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { SkillProficiency } from '../../../database/entities/user-skill.entity';

export class CreateSkillDto {
  @ApiProperty({ description: 'Skill name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Skill category ID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Skill description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Alternative names/aliases', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  aliases?: string[];

  @ApiPropertyOptional({ description: 'Skill tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Skill metadata' })
  @IsOptional()
  @IsObject()
  metadata?: {
    officialWebsite?: string;
    documentation?: string;
    learningResources?: Array<{
      title: string;
      url: string;
      type: 'course' | 'tutorial' | 'documentation' | 'book';
      provider?: string;
    }>;
    relatedSkills?: string[];
    industryDemand?: Record<string, number>;
    salaryImpact?: {
      averageIncrease: number;
      currency: string;
      region: string;
    };
    certifications?: Array<{
      name: string;
      provider: string;
      url?: string;
      difficulty: 'beginner' | 'intermediate' | 'advanced';
    }>;
    jobTitles?: string[];
    prerequisites?: string[];
    difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    timeToLearn?: {
      beginner: number;
      intermediate: number;
      advanced: number;
    };
  };
}

export class UpdateSkillDto extends PartialType(CreateSkillDto) {
  @ApiPropertyOptional({ description: 'Whether skill is verified' })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @ApiPropertyOptional({ description: 'Whether skill is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Skill popularity score' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  popularityScore?: number;

  @ApiPropertyOptional({ description: 'Skill trending score' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  trendingScore?: number;
}

export class SearchSkillsDto {
  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by category ID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Filter by verified status' })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiPropertyOptional({ description: 'Sort field' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], description: 'Sort order' })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}

export class CreateUserSkillDto {
  @ApiPropertyOptional({ description: 'User ID (admin only)' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({ description: 'Skill ID' })
  @IsUUID()
  skillId: string;

  @ApiPropertyOptional({ enum: SkillProficiency, description: 'Proficiency level' })
  @IsOptional()
  @IsEnum(SkillProficiency)
  proficiencyLevel?: SkillProficiency;

  @ApiPropertyOptional({ description: 'Years of experience' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  yearsExperience?: number;

  @ApiPropertyOptional({ description: 'Confidence level (1-10)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  confidenceLevel?: number;

  @ApiPropertyOptional({ description: 'How the skill was acquired' })
  @IsOptional()
  @IsEnum(['self_taught', 'formal_education', 'online_course', 'bootcamp', 'work_experience', 'certification'])
  acquisitionMethod?: 'self_taught' | 'formal_education' | 'online_course' | 'bootcamp' | 'work_experience' | 'certification';

  @ApiPropertyOptional({ description: 'Whether skill is featured on profile' })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: 'Skill tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateUserSkillDto extends PartialType(CreateUserSkillDto) {}

export class SkillVerificationDto {
  @ApiPropertyOptional({ description: 'Verification data' })
  @IsOptional()
  @IsObject()
  verificationData?: {
    method?: 'course_completion' | 'certification' | 'peer_review' | 'project_demonstration' | 'assessment';
    source?: string;
    score?: number;
    assessmentDate?: Date;
    validUntil?: Date;
    verifierNotes?: string;
  };
}

export class EndorseSkillDto {
  @ApiProperty({ description: 'Relationship to the skill owner' })
  @IsEnum(['colleague', 'manager', 'client', 'peer', 'mentor'])
  relationship: 'colleague' | 'manager' | 'client' | 'peer' | 'mentor';

  @ApiPropertyOptional({ description: 'Endorsement comment' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ description: 'Rating (1-5)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;
}

export class SkillResponseDto {
  @ApiProperty({ description: 'Skill ID' })
  id: string;

  @ApiProperty({ description: 'Skill name' })
  name: string;

  @ApiPropertyOptional({ description: 'Skill category ID' })
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Skill description' })
  description?: string;

  @ApiProperty({ description: 'Alternative names/aliases', type: [String] })
  aliases: string[];

  @ApiProperty({ description: 'Whether skill is verified' })
  isVerified: boolean;

  @ApiProperty({ description: 'Whether skill is active' })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Skill icon or image URL' })
  iconUrl?: string;

  @ApiPropertyOptional({ description: 'Skill color for display' })
  color?: string;

  @ApiProperty({ description: 'Skill popularity score' })
  popularityScore: number;

  @ApiProperty({ description: 'Skill trending score' })
  trendingScore: number;

  @ApiProperty({ description: 'Number of users with this skill' })
  userCount: number;

  @ApiProperty({ description: 'Skill metadata' })
  metadata: Record<string, any>;

  @ApiProperty({ description: 'Skill tags', type: [String] })
  tags: string[];

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Skill category details' })
  category?: {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
  };

  @ApiPropertyOptional({ description: 'Virtual properties' })
  virtualProperties?: {
    isPopular: boolean;
    isTrending: boolean;
    isInDemand: boolean;
    averageProficiencyLevel: string;
  };

  constructor(skill: any) {
    this.id = skill.id;
    this.name = skill.name;
    this.categoryId = skill.categoryId;
    this.description = skill.description;
    this.aliases = skill.aliases || [];
    this.isVerified = skill.isVerified;
    this.isActive = skill.isActive;
    this.iconUrl = skill.iconUrl;
    this.color = skill.color;
    this.popularityScore = skill.popularityScore;
    this.trendingScore = skill.trendingScore;
    this.userCount = skill.userCount;
    this.metadata = skill.metadata || {};
    this.tags = skill.tags || [];
    this.createdAt = skill.createdAt;
    this.updatedAt = skill.updatedAt;

    if (skill.category) {
      this.category = {
        id: skill.category.id,
        name: skill.category.name,
        description: skill.category.description,
        icon: skill.category.icon,
        color: skill.category.color,
      };
    }

    this.virtualProperties = {
      isPopular: skill.isPopular || false,
      isTrending: skill.isTrending || false,
      isInDemand: skill.isInDemand || false,
      averageProficiencyLevel: skill.averageProficiencyLevel || 'beginner',
    };
  }
}

export class SkillListResponseDto {
  @ApiProperty({ type: [SkillResponseDto], description: 'List of skills' })
  items: SkillResponseDto[];

  @ApiProperty({ description: 'Total number of items' })
  total: number;

  @ApiProperty({ description: 'Current page' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  constructor(data: any) {
    this.items = data.items.map((item: any) => new SkillResponseDto(item));
    this.total = data.total;
    this.page = data.page;
    this.limit = data.limit;
    this.totalPages = data.totalPages;
  }
}

export class UserSkillResponseDto {
  @ApiProperty({ description: 'User skill ID' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Skill ID' })
  skillId: string;

  @ApiProperty({ enum: SkillProficiency, description: 'Proficiency level' })
  proficiencyLevel: SkillProficiency;

  @ApiPropertyOptional({ description: 'Years of experience' })
  yearsExperience?: number;

  @ApiProperty({ description: 'Whether skill is featured' })
  isFeatured: boolean;

  @ApiPropertyOptional({ description: 'Confidence level' })
  confidenceLevel?: number;

  @ApiPropertyOptional({ description: 'Acquisition method' })
  acquisitionMethod?: string;

  @ApiProperty({ description: 'Verification data' })
  verificationData: Record<string, any>;

  @ApiPropertyOptional({ description: 'Verified by user ID' })
  verifiedBy?: string;

  @ApiPropertyOptional({ description: 'Verification timestamp' })
  verifiedAt?: Date;

  @ApiProperty({ description: 'Evidence/proof of skill' })
  evidence: Array<{
    type: string;
    title: string;
    description?: string;
    url?: string;
    date: Date;
  }>;

  @ApiProperty({ description: 'Skill usage history' })
  usage: Array<{
    context: string;
    title: string;
    description: string;
    startDate: Date;
    endDate?: Date;
    intensity: string;
  }>;

  @ApiProperty({ description: 'Learning progress and goals' })
  learningData: Record<string, any>;

  @ApiProperty({ description: 'Endorsements from other users' })
  endorsements: Array<{
    endorserId: string;
    endorserName: string;
    relationship: string;
    comment?: string;
    rating?: number;
    date: Date;
  }>;

  @ApiProperty({ description: 'Skill tags', type: [String] })
  tags: string[];

  @ApiPropertyOptional({ description: 'Additional notes' })
  notes?: string;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Skill details' })
  skill?: SkillResponseDto;

  @ApiPropertyOptional({ description: 'Virtual properties' })
  virtualProperties?: {
    isVerified: boolean;
    proficiencyScore: number;
    endorsementCount: number;
    averageEndorsementRating: number;
    isStale: boolean;
    needsUpdate: boolean;
  };

  constructor(userSkill: any) {
    this.id = userSkill.id;
    this.userId = userSkill.userId;
    this.skillId = userSkill.skillId;
    this.proficiencyLevel = userSkill.proficiencyLevel;
    this.yearsExperience = userSkill.yearsExperience;
    this.isFeatured = userSkill.isFeatured;
    this.confidenceLevel = userSkill.confidenceLevel;
    this.acquisitionMethod = userSkill.acquisitionMethod;
    this.verificationData = userSkill.verificationData || {};
    this.verifiedBy = userSkill.verifiedBy;
    this.verifiedAt = userSkill.verifiedAt;
    this.evidence = userSkill.evidence || [];
    this.usage = userSkill.usage || [];
    this.learningData = userSkill.learningData || {};
    this.endorsements = userSkill.endorsements || [];
    this.tags = userSkill.tags || [];
    this.notes = userSkill.notes;
    this.createdAt = userSkill.createdAt;
    this.updatedAt = userSkill.updatedAt;

    if (userSkill.skill) {
      this.skill = new SkillResponseDto(userSkill.skill);
    }

    this.virtualProperties = {
      isVerified: userSkill.isVerified || false,
      proficiencyScore: userSkill.proficiencyScore || 0,
      endorsementCount: userSkill.endorsementCount || 0,
      averageEndorsementRating: userSkill.averageEndorsementRating || 0,
      isStale: userSkill.isStale || false,
      needsUpdate: userSkill.needsUpdate || false,
    };
  }
}

export class UserSkillListResponseDto {
  @ApiProperty({ type: [UserSkillResponseDto], description: 'List of user skills' })
  items: UserSkillResponseDto[];

  @ApiProperty({ description: 'Total number of items' })
  total: number;

  @ApiProperty({ description: 'Current page' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  constructor(data: any) {
    this.items = data.items.map((item: any) => new UserSkillResponseDto(item));
    this.total = data.total;
    this.page = data.page;
    this.limit = data.limit;
    this.totalPages = data.totalPages;
  }
}

export class SkillRecommendationDto {
  @ApiProperty({ description: 'Recommended skill' })
  skill: SkillResponseDto;

  @ApiProperty({ description: 'Reason for recommendation' })
  reason: string;

  @ApiProperty({ description: 'Recommendation priority' })
  priority: 'high' | 'medium' | 'low';

  @ApiProperty({ description: 'Estimated learning time in hours' })
  estimatedLearningTime: number;

  @ApiPropertyOptional({ description: 'Related skills already possessed' })
  relatedSkills?: string[];

  @ApiPropertyOptional({ description: 'Job opportunities this skill opens' })
  jobOpportunities?: string[];

  constructor(data: any) {
    this.skill = new SkillResponseDto(data.skill);
    this.reason = data.reason;
    this.priority = data.priority;
    this.estimatedLearningTime = data.estimatedLearningTime;
    this.relatedSkills = data.relatedSkills;
    this.jobOpportunities = data.jobOpportunities;
  }
}
