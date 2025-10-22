import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

// Controllers
import { InterviewSessionController } from './controllers/interview-session.controller';
import { AiMockInterviewController } from './controllers/ai-mock-interview.controller';
import { QuestionBankController } from './controllers/question-bank.controller';

// Services
import { InterviewSessionService } from './services/interview-session.service';
import { AiMockInterviewService } from './services/ai-mock-interview.service';
import { QuestionBankService } from './services/question-bank.service';
import { InterviewAnalyticsService } from './services/interview-analytics.service';

// Entities
import { InterviewSession } from '../../database/entities/interview-session.entity';
import { InterviewQuestionBank } from '../../database/entities/interview-question-bank.entity';
import { InterviewQuestion } from '../../database/entities/interview-question.entity';
import { InterviewResponse } from '../../database/entities/interview-response.entity';
import { AiMockInterview } from '../../database/entities/ai-mock-interview.entity';
import { Job } from '../../database/entities/job.entity';
import { User } from '../../database/entities/user.entity';
import { Organization } from '../../database/entities/organization.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InterviewSession,
      InterviewQuestionBank,
      InterviewQuestion,
      InterviewResponse,
      AiMockInterview,
      Job,
      User,
      Organization,
    ]),
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    ConfigModule,
  ],
  controllers: [
    InterviewSessionController,
    AiMockInterviewController,
    QuestionBankController,
  ],
  providers: [
    InterviewSessionService,
    AiMockInterviewService,
    QuestionBankService,
    InterviewAnalyticsService,
  ],
  exports: [
    InterviewSessionService,
    AiMockInterviewService,
    QuestionBankService,
    InterviewAnalyticsService,
  ],
})
export class InterviewsModule {}
