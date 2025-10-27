import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../entities/user.entity';
import { Skill } from './skill.entity';

export enum SkillProficiency {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

@Entity('user_skills')
@Unique(['userId', 'skillId'])
@Index(['userId', 'proficiencyLevel'])
@Index(['skillId', 'isFeatured'])
@Index(['verifiedAt'])
export class UserSkill {
  @ApiProperty({ description: 'User skill ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'User ID' })
  @Column({ name: 'userId' })
  userId: string;

  @ApiProperty({ description: 'Skill ID' })
  @Column({ name: 'skillId' })
  skillId: string;

  @ApiProperty({ enum: SkillProficiency, description: 'Proficiency level' })
  @Column({
    name: 'proficiencyLevel',
    type: 'enum',
    enum: SkillProficiency,
    default: SkillProficiency.BEGINNER,
  })
  proficiencyLevel: SkillProficiency;

  @ApiProperty({ description: 'Years of experience with this skill' })
  @Column({ name: 'yearsExperience', nullable: true })
  yearsExperience?: number;

  @ApiProperty({ description: 'Whether skill is featured on profile' })
  @Column({ name: 'isFeatured', default: false })
  isFeatured: boolean;

  @ApiProperty({ description: 'Self-assessed confidence level (1-10)' })
  @Column({ name: 'confidenceLevel', nullable: true })
  confidenceLevel?: number;

  @ApiProperty({ description: 'How the skill was acquired' })
  @Column({ name: 'acquisitionMethod', nullable: true })
  acquisitionMethod?: 'self_taught' | 'formal_education' | 'online_course' | 'bootcamp' | 'work_experience' | 'certification';

  @ApiProperty({ description: 'Skill verification details' })
  @Column({ name: 'verificationData', type: 'jsonb', default: {} })
  verificationData: {
    method?: 'course_completion' | 'certification' | 'peer_review' | 'project_demonstration' | 'assessment';
    source?: string;
    score?: number;
    assessmentDate?: Date;
    validUntil?: Date;
    verifierNotes?: string;
  };

  @ApiProperty({ description: 'User ID who verified this skill' })
  @Column({ name: 'verifiedBy', nullable: true })
  verifiedBy?: string;

  @ApiProperty({ description: 'Skill verification timestamp' })
  @Column({ name: 'verifiedAt', type: 'timestamp', nullable: true })
  verifiedAt?: Date;

  @ApiProperty({ description: 'Evidence/proof of skill' })
  @Column({ type: 'jsonb', default: [] })
  evidence: Array<{
    type: 'project' | 'certificate' | 'work_sample' | 'testimonial' | 'assessment_result';
    title: string;
    description?: string;
    url?: string;
    fileUrl?: string;
    date: Date;
    metadata?: Record<string, any>;
  }>;

  @ApiProperty({ description: 'Skill usage in projects/work' })
  @Column({ type: 'jsonb', default: [] })
  usage: Array<{
    context: 'work' | 'project' | 'education' | 'hobby';
    title: string;
    description: string;
    startDate: Date;
    endDate?: Date;
    intensity: 'low' | 'medium' | 'high';
  }>;

  @ApiProperty({ description: 'Learning progress and goals' })
  @Column({ name: 'learningData', type: 'jsonb', default: {} })
  learningData: {
    currentGoal?: string;
    targetProficiency?: SkillProficiency;
    targetDate?: Date;
    learningPath?: Array<{
      resource: string;
      type: 'course' | 'book' | 'tutorial' | 'practice';
      status: 'planned' | 'in_progress' | 'completed';
      progress?: number;
    }>;
    practiceHours?: number;
    lastPracticed?: Date;
  };

  @ApiProperty({ description: 'Endorsements from other users' })
  @Column({ type: 'jsonb', default: [] })
  endorsements: Array<{
    endorserId: string;
    endorserName: string;
    relationship: 'colleague' | 'manager' | 'client' | 'peer' | 'mentor';
    comment?: string;
    rating?: number;
    date: Date;
  }>;

  @ApiProperty({ description: 'Skill tags and specializations' })
  @Column({ type: 'simple-array', default: [] })
  tags: string[];

  @ApiProperty({ description: 'Additional notes about the skill' })
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  @ManyToOne(() => Skill, skill => skill.userSkills)
  @JoinColumn({ name: 'skillId' })
  skill: Skill;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'verifiedBy' })
  verifier?: User;

  get isVerified(): boolean {
    return !!this.verifiedAt;
  }

  get proficiencyScore(): number {
    const scores = {
      [SkillProficiency.BEGINNER]: 25,
      [SkillProficiency.INTERMEDIATE]: 50,
      [SkillProficiency.ADVANCED]: 75,
      [SkillProficiency.EXPERT]: 100,
    };
    return scores[this.proficiencyLevel];
  }

  get endorsementCount(): number {
    return this.endorsements.length;
  }

  get averageEndorsementRating(): number {
    if (this.endorsements.length === 0) return 0;
    const ratingsWithValues = this.endorsements.filter(e => e.rating);
    if (ratingsWithValues.length === 0) return 0;
    const sum = ratingsWithValues.reduce((acc, e) => acc + e.rating, 0);
    return sum / ratingsWithValues.length;
  }

  get isStale(): boolean {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return this.updatedAt < sixMonthsAgo;
  }

  get needsUpdate(): boolean {
    return this.isStale || (this.learningData.lastPracticed &&
           this.learningData.lastPracticed < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  }

  updateProficiency(level: SkillProficiency, yearsExperience?: number): void {
    this.proficiencyLevel = level;
    if (yearsExperience !== undefined) {
      this.yearsExperience = yearsExperience;
    }
    this.updatedAt = new Date();
  }

  setConfidenceLevel(level: number): void {
    this.confidenceLevel = Math.max(1, Math.min(10, level));
  }

  addEvidence(evidence: UserSkill['evidence'][0]): void {
    this.evidence.push(evidence);
  }

  removeEvidence(index: number): void {
    if (index >= 0 && index < this.evidence.length) {
      this.evidence.splice(index, 1);
    }
  }

  addUsage(usage: UserSkill['usage'][0]): void {
    this.usage.push(usage);
  }

  addEndorsement(endorsement: UserSkill['endorsements'][0]): void {
    const existingIndex = this.endorsements.findIndex(e => e.endorserId === endorsement.endorserId);
    if (existingIndex >= 0) {
      this.endorsements[existingIndex] = endorsement;
    } else {
      this.endorsements.push(endorsement);
    }
  }

  removeEndorsement(endorserId: string): void {
    this.endorsements = this.endorsements.filter(e => e.endorserId !== endorserId);
  }

  verify(verifierId: string, verificationData?: Partial<UserSkill['verificationData']>): void {
    this.verifiedBy = verifierId;
    this.verifiedAt = new Date();
    if (verificationData) {
      this.verificationData = { ...this.verificationData, ...verificationData };
    }
  }

  unverify(): void {
    this.verifiedBy = null;
    this.verifiedAt = null;
    this.verificationData = {};
  }

  setFeatured(featured: boolean): void {
    this.isFeatured = featured;
  }

  addTag(tag: string): void {
    const normalizedTag = tag.toLowerCase().trim();
    if (!this.tags.includes(normalizedTag)) {
      this.tags.push(normalizedTag);
    }
  }

  removeTag(tag: string): void {
    this.tags = this.tags.filter(t => t !== tag.toLowerCase().trim());
  }

  updateLearningGoal(goal: string, targetProficiency?: SkillProficiency, targetDate?: Date): void {
    this.learningData.currentGoal = goal;
    if (targetProficiency) {
      this.learningData.targetProficiency = targetProficiency;
    }
    if (targetDate) {
      this.learningData.targetDate = targetDate;
    }
  }

  addLearningResource(resource: UserSkill['learningData']['learningPath'][0]): void {
    if (!this.learningData.learningPath) {
      this.learningData.learningPath = [];
    }
    this.learningData.learningPath.push(resource);
  }

  updateLearningProgress(resourceIndex: number, progress: number): void {
    if (this.learningData.learningPath &&
        resourceIndex >= 0 &&
        resourceIndex < this.learningData.learningPath.length) {
      this.learningData.learningPath[resourceIndex].progress = Math.max(0, Math.min(100, progress));

      if (progress >= 100) {
        this.learningData.learningPath[resourceIndex].status = 'completed';
      } else if (progress > 0) {
        this.learningData.learningPath[resourceIndex].status = 'in_progress';
      }
    }
  }

  recordPractice(hours: number): void {
    this.learningData.practiceHours = (this.learningData.practiceHours || 0) + hours;
    this.learningData.lastPracticed = new Date();
  }

  calculateSkillScore(): number {
    let score = this.proficiencyScore;
    if (this.yearsExperience) score += Math.min(this.yearsExperience * 2, 20);
    if (this.isVerified) score += 10;
    score += Math.min(this.endorsementCount * 2, 15);
    if (this.confidenceLevel) score += this.confidenceLevel;
    score += Math.min(this.evidence.length * 3, 15);
    const recentUsage = this.usage.filter(u => {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return (u.endDate || new Date()) > threeMonthsAgo;
    });
    score += Math.min(recentUsage.length * 5, 20);
    return Math.min(score, 150);
  }

  getRecommendations(): string[] {
    const recommendations: string[] = [];
    if (!this.isVerified && this.proficiencyLevel !== SkillProficiency.BEGINNER)
      recommendations.push('Consider getting this skill verified through a certification or peer review');
    if (this.endorsementCount < 3)
      recommendations.push('Ask colleagues or peers to endorse this skill');
    if (this.evidence.length === 0)
      recommendations.push('Add evidence of your work with this skill (projects, certificates, etc.)');
    if (this.needsUpdate)
      recommendations.push('Update your skill information and recent usage');
    if (!this.learningData.currentGoal && this.proficiencyLevel !== SkillProficiency.EXPERT)
      recommendations.push('Set a learning goal to advance this skill further');
    return recommendations;
  }

  exportForResume(): Record<string, any> {
    return {
      name: this.skill?.name,
      proficiencyLevel: this.proficiencyLevel,
      yearsExperience: this.yearsExperience,
      isVerified: this.isVerified,
      isFeatured: this.isFeatured,
      endorsementCount: this.endorsementCount,
      tags: this.tags,
    };
  }

  exportForProfile(): Record<string, any> {
    return {
      ...this.exportForResume(),
      confidenceLevel: this.confidenceLevel,
      averageEndorsementRating: this.averageEndorsementRating,
      evidenceCount: this.evidence.length,
      skillScore: this.calculateSkillScore(),
      lastUpdated: this.updatedAt,
      recommendations: this.getRecommendations(),
    };
  }

  static suggestProficiencyLevel(yearsExperience: number): SkillProficiency {
    if (yearsExperience < 1) return SkillProficiency.BEGINNER;
    if (yearsExperience < 3) return SkillProficiency.INTERMEDIATE;
    if (yearsExperience < 7) return SkillProficiency.ADVANCED;
    return SkillProficiency.EXPERT;
  }

  static getDefaultLearningPath(skillName: string): UserSkill['learningData']['learningPath'] {
    return [
      { resource: `${skillName} Fundamentals`, type: 'course', status: 'planned', progress: 0 },
      { resource: `${skillName} Best Practices`, type: 'tutorial', status: 'planned', progress: 0 },
      { resource: `Advanced ${skillName}`, type: 'course', status: 'planned', progress: 0 },
    ];
  }
}
