import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';

import { AppModule } from '../src/app.module';
import { User, UserRole } from '../src/database/entities/user.entity';
import { Course, CourseStatus, CourseDifficulty, CourseAccessType } from '../src/database/entities/course.entity';
import { Assessment, AssessmentType, AssessmentStatus, QuestionType } from '../src/database/entities/assessment.entity';
import { Enrollment, EnrollmentStatus } from '../src/database/entities/enrollment.entity';

describe('LMS Integration Tests (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let courseRepository: Repository<Course>;
  let assessmentRepository: Repository<Assessment>;
  let enrollmentRepository: Repository<Enrollment>;
  let jwtService: JwtService;

  let instructorToken: string;
  let studentToken: string;
  let adminToken: string;

  let instructor: User;
  let student: User;
  let admin: User;
  let course: Course;
  let assessment: Assessment;
  let enrollment: Enrollment;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [__dirname + '/../src/**/*.entity{.ts,.js}'],
          synchronize: true,
          logging: false,
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    courseRepository = moduleFixture.get<Repository<Course>>(getRepositoryToken(Course));
    assessmentRepository = moduleFixture.get<Repository<Assessment>>(getRepositoryToken(Assessment));
    enrollmentRepository = moduleFixture.get<Repository<Enrollment>>(getRepositoryToken(Enrollment));
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Create test users
    instructor = await userRepository.save({
      email: 'instructor@test.com',
      firstName: 'John',
      lastName: 'Instructor',
      role: UserRole.INSTRUCTOR,
      password: 'hashedpassword',
      isEmailVerified: true,
    });

    student = await userRepository.save({
      email: 'student@test.com',
      firstName: 'Jane',
      lastName: 'Student',
      role: UserRole.STUDENT,
      password: 'hashedpassword',
      isEmailVerified: true,
    });

    admin = await userRepository.save({
      email: 'admin@test.com',
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      password: 'hashedpassword',
      isEmailVerified: true,
    });

    // Generate JWT tokens
    instructorToken = jwtService.sign({ sub: instructor.id, email: instructor.email, role: instructor.role });
    studentToken = jwtService.sign({ sub: student.id, email: student.email, role: student.role });
    adminToken = jwtService.sign({ sub: admin.id, email: admin.email, role: admin.role });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Course Management Flow', () => {
    it('should create a course as instructor', async () => {
      const createCourseDto = {
        title: 'Test Course',
        description: 'A comprehensive test course',
        difficulty: CourseDifficulty.BEGINNER,
        accessType: CourseAccessType.PUBLIC,
        price: 99.99,
        currency: 'USD',
        category: 'Programming',
        tags: ['javascript', 'testing'],
        learningObjectives: [
          'Learn testing fundamentals',
          'Master integration testing',
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/api/courses')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send(createCourseDto)
        .expect(201);

      expect(response.body).toMatchObject({
        title: createCourseDto.title,
        description: createCourseDto.description,
        difficulty: createCourseDto.difficulty,
        accessType: createCourseDto.accessType,
        status: CourseStatus.DRAFT,
        slug: 'test-course',
      });

      course = response.body;
    });

    it('should not allow student to create course', async () => {
      const createCourseDto = {
        title: 'Unauthorized Course',
        difficulty: CourseDifficulty.BEGINNER,
        accessType: CourseAccessType.PUBLIC,
      };

      await request(app.getHttpServer())
        .post('/api/courses')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(createCourseDto)
        .expect(403);
    });

    it('should get course by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/courses/${course.id}`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .expect(200);

      expect(response.body.id).toBe(course.id);
      expect(response.body.title).toBe(course.title);
    });

    it('should search courses', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/courses?search=test&page=1&limit=10')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.total).toBe(1);
      expect(response.body.page).toBe(1);
    });

    it('should update course', async () => {
      const updateDto = {
        title: 'Updated Test Course',
        description: 'Updated description',
      };

      const response = await request(app.getHttpServer())
        .put(`/api/courses/${course.id}`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.title).toBe(updateDto.title);
      expect(response.body.description).toBe(updateDto.description);
    });
  });

  describe('Assessment Management Flow', () => {
    it('should create assessment for course', async () => {
      const createAssessmentDto = {
        title: 'Test Quiz',
        description: 'A test quiz for the course',
        type: AssessmentType.QUIZ,
        courseId: course.id,
        questions: [
          {
            text: 'What is 2 + 2?',
            type: QuestionType.MULTIPLE_CHOICE,
            points: 10,
            options: [
              { text: '3', isCorrect: false },
              { text: '4', isCorrect: true },
              { text: '5', isCorrect: false },
            ],
          },
          {
            text: 'JavaScript is a programming language',
            type: QuestionType.TRUE_FALSE,
            points: 5,
            correctAnswer: 'true',
          },
        ],
        timeLimit: 30,
        maxAttempts: 3,
        passingScore: 70,
      };

      const response = await request(app.getHttpServer())
        .post('/api/assessments')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send(createAssessmentDto)
        .expect(201);

      expect(response.body).toMatchObject({
        title: createAssessmentDto.title,
        type: createAssessmentDto.type,
        courseId: course.id,
        questionCount: 2,
        totalPoints: 15,
        status: AssessmentStatus.DRAFT,
      });

      assessment = response.body;
    });

    it('should publish assessment', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/assessments/${assessment.id}/publish`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .expect(200);

      expect(response.body.status).toBe(AssessmentStatus.PUBLISHED);
    });

    it('should get assessment by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/assessments/${assessment.id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.id).toBe(assessment.id);
      expect(response.body.questions).toHaveLength(2);
    });
  });

  describe('Enrollment and Progress Flow', () => {
    it('should enroll student in course', async () => {
      const enrollDto = {
        courseId: course.id,
      };

      const response = await request(app.getHttpServer())
        .post('/api/enrollments')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(enrollDto)
        .expect(201);

      expect(response.body).toMatchObject({
        userId: student.id,
        courseId: course.id,
        status: EnrollmentStatus.ACTIVE,
        progressPercentage: 0,
      });

      enrollment = response.body;
    });

    it('should get user enrollments', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/enrollments')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].courseId).toBe(course.id);
    });

    it('should get enrollment progress', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/enrollments/${enrollment.id}/progress`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.enrollment.id).toBe(enrollment.id);
      expect(response.body.lessonProgress).toBeDefined();
      expect(response.body.statistics).toBeDefined();
    });
  });

  describe('Assessment Attempt Flow', () => {
    let attemptId: string;

    it('should start assessment attempt', async () => {
      const startAttemptDto = {
        enrollmentId: enrollment.id,
      };

      const response = await request(app.getHttpServer())
        .post(`/api/assessments/${assessment.id}/attempts`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(startAttemptDto)
        .expect(201);

      expect(response.body).toMatchObject({
        assessmentId: assessment.id,
        userId: student.id,
        enrollmentId: enrollment.id,
        status: 'in_progress',
      });

      attemptId = response.body.id;
    });

    it('should submit assessment attempt', async () => {
      const submitDto = {
        answers: [
          {
            questionIndex: 0,
            answer: 1, // Correct answer (4)
            timeSpent: 10000,
          },
          {
            questionIndex: 1,
            answer: 'true', // Correct answer
            timeSpent: 5000,
          },
        ],
        totalTimeSpent: 15000,
      };

      const response = await request(app.getHttpServer())
        .put(`/api/assessments/attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(submitDto)
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'submitted',
        score: 15, // Full score
        scorePercentage: 100,
        passed: true,
      });
    });

    it('should get assessment attempt', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/assessments/attempts/${attemptId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.id).toBe(attemptId);
      expect(response.body.status).toBe('submitted');
      expect(response.body.passed).toBe(true);
    });

    it('should get user assessment attempts', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/assessments/${assessment.id}/attempts`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe(attemptId);
    });
  });

  describe('Certificate Generation Flow', () => {
    it('should generate certificate after course completion', async () => {
      // First, mark enrollment as completed
      await enrollmentRepository.update(enrollment.id, {
        status: EnrollmentStatus.COMPLETED,
        completedAt: new Date(),
        progressPercentage: 100,
      });

      const generateDto = {
        enrollmentId: enrollment.id,
        type: 'completion',
      };

      const response = await request(app.getHttpServer())
        .post('/api/certificates/generate')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send(generateDto)
        .expect(201);

      expect(response.body).toMatchObject({
        userId: student.id,
        courseId: course.id,
        enrollmentId: enrollment.id,
        type: 'completion',
        status: 'active',
      });

      expect(response.body.certificateNumber).toBeDefined();
      expect(response.body.verificationCode).toBeDefined();
    });

    it('should verify certificate', async () => {
      // Get the certificate first
      const certificatesResponse = await request(app.getHttpServer())
        .get('/api/certificates')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      const certificate = certificatesResponse.body.items[0];

      const verifyDto = {
        certificateNumber: certificate.certificateNumber,
      };

      const response = await request(app.getHttpServer())
        .post('/api/certificates/verify')
        .send(verifyDto)
        .expect(200);

      expect(response.body.valid).toBe(true);
      expect(response.body.certificate).toBeDefined();
      expect(response.body.certificate.id).toBe(certificate.id);
    });
  });

  describe('Search Integration', () => {
    it('should search courses', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/search/courses?search=test&page=1&limit=10')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.items).toBeDefined();
      expect(response.body.total).toBeGreaterThanOrEqual(0);
      expect(response.body.executionTime).toBeDefined();
    });

    it('should get search suggestions', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/search/suggestions?query=test')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.suggestions).toBeDefined();
      expect(response.body.courses).toBeDefined();
    });
  });

  describe('Anti-Cheating System', () => {
    it('should get browser lockdown config', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/anti-cheating/assessments/${assessment.id}/lockdown-config`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        enableLockdown: expect.any(Boolean),
        preventTabSwitching: expect.any(Boolean),
        preventCopyPaste: expect.any(Boolean),
        warningMessage: expect.any(String),
      });
    });

    it('should validate browser environment', async () => {
      const validateDto = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        screenResolution: '1920x1080',
        timezone: 'America/New_York',
        plugins: ['Chrome PDF Plugin'],
        languages: ['en-US', 'en'],
      };

      const response = await request(app.getHttpServer())
        .post('/api/anti-cheating/validate-browser')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(validateDto)
        .expect(200);

      expect(response.body.valid).toBeDefined();
      expect(response.body.warnings).toBeDefined();
      expect(response.body.riskScore).toBeDefined();
    });
  });

  describe('Analytics and Statistics', () => {
    it('should get course statistics as instructor', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/courses/${course.id}/statistics`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        courseId: course.id,
        totalEnrollments: expect.any(Number),
        completionRate: expect.any(Number),
      });
    });

    it('should get course progress analytics', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/enrollments/course/${course.id}/analytics`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        courseId: course.id,
        totalEnrollments: expect.any(Number),
        averageProgress: expect.any(Number),
      });
    });

    it('should not allow student to access analytics', async () => {
      await request(app.getHttpServer())
        .get(`/api/enrollments/course/${course.id}/analytics`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });
  });

  describe('Error Handling', () => {
    it('should handle not found course', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/courses/nonexistent-id')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    it('should handle invalid assessment attempt', async () => {
      await request(app.getHttpServer())
        .post('/api/assessments/nonexistent-id/attempts')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ enrollmentId: enrollment.id })
        .expect(404);
    });

    it('should handle unauthorized access', async () => {
      await request(app.getHttpServer())
        .post('/api/courses')
        .send({ title: 'Test' })
        .expect(401);
    });

    it('should handle validation errors', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/courses')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ title: '' }) // Invalid empty title
        .expect(400);

      expect(response.body.message).toBeDefined();
    });
  });
});
