import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AntiCheatController } from './anti-cheating.controller';
import { AntiCheatService } from './services/anti-cheating.service';
import { Assessment } from '../../database/entities/assessment.entity';
import { AssessmentAttempt } from '../../database/entities/assessment-attempt.entity';
import { User } from '../../database/entities/user.entity';
import { Enrollment } from '../../database/entities/enrollment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Assessment,
      AssessmentAttempt,
      User,
      Enrollment,
    ]),
  ],
  controllers: [AntiCheatController],
  providers: [AntiCheatService],
  exports: [AntiCheatService],
})
export class AntiCheatModule {}
