// import { INestApplication } from '@nestjs/common';
// import  request from 'supertest';

// describe('Volkai HR Edu API (E2E)', () => {
//   let app: INestApplication;
//   let testUser: any;
//   let testOrganization: any;
//   let testCourse: any;
//   let testJob: any;

//   beforeAll(async () => {
//     app = await global.e2eTestUtils.createE2ETestApp();
    
//     // Register test user and create test data
//     testUser = await global.e2eTestUtils.registerTestUser(app, {
//       email: 'e2e-test@example.com',
//       password: 'E2ETestPassword123!',
//       firstName: 'E2E',
//       lastName: 'Test',
//     });

//     // Create test organization
//     testOrganization = await global.e2eTestUtils.createTestOrganization(
//       app,
//       testUser.tokens.accessToken,
//       {
//         name: 'E2E Test Organization',
//         description: 'Organization for E2E testing',
//       }
//     );
//   });

//   afterAll(async () => {
//     await app.close();
//   });

//   describe('Health Check', () => {
//     it('should return health status', async () => {
//       const response = await global.e2eTestUtils.testEndpoint(
//         app,
//         'get',
//         '/health',
//         {
//           expectedStatus: 200,
//           expectedFields: ['status', 'info', 'error', 'details'],
//         }
//       );

//       expect(response.body.status).toBe('ok');
//     });
//   });

//   describe('Authentication Flow', () => {
//     it('should complete full authentication flow', async () => {
//       // 1. Register new user
//       const newUser = await global.e2eTestUtils.registerTestUser(app, {
//         email: 'auth-flow-test@example.com',
//         password: 'AuthFlowTest123!',
//       });

//       expect(newUser.user).toBeDefined();
//       expect(newUser.tokens.accessToken).toBeDefined();
//       expect(newUser.tokens.refreshToken).toBeDefined();

//       // 2. Get user profile
//       const profileResponse = await global.e2eTestUtils.testEndpoint(
//         app,
//         'get',
//         '/auth/me',
//         {
//           token: newUser.tokens.accessToken,
//           expectedFields: ['success', 'data'],
//         }
//       );

//       expect(profileResponse.body.data.user.email).toBe('auth-flow-test@example.com');

//       // 3. Refresh tokens
//       const refreshResponse = await request(app.getHttpServer())
//         .post('/auth/refresh')
//         .send({ refreshToken: newUser.tokens.refreshToken })
//         .expect(200);

//       expect(refreshResponse.body.data.tokens.accessToken).toBeDefined();
//       expect(refreshResponse.body.data.tokens.refreshToken).toBeDefined();

//       // 4. Logout
//       await global.e2eTestUtils.testEndpoint(
//         app,
//         'post',
//         '/auth/logout',
//         {
//           token: newUser.tokens.accessToken,
//           expectedStatus: 200,
//         }
//       );

//       // 5. Login again
//       const loginResult = await global.e2eTestUtils.loginTestUser(
//         app,
//         'auth-flow-test@example.com',
//         'AuthFlowTest123!'
//       );

//       expect(loginResult.tokens.accessToken).toBeDefined();
//     });
//   });

//   describe('LMS Workflow', () => {
//     it('should complete full LMS workflow', async () => {
//       // 1. Create course
//       testCourse = await global.e2eTestUtils.createTestCourse(
//         app,
//         testUser.tokens.accessToken,
//         {
//           title: 'E2E Test Course',
//           description: 'Course for E2E testing',
//           category: 'technology',
//           difficultyLevel: 'beginner',
//         }
//       );

//       expect(testCourse.id).toBeDefined();
//       expect(testCourse.title).toBe('E2E Test Course');

//       // 2. Create module
//       const moduleResponse = await request(app.getHttpServer())
//         .post(`/courses/${testCourse.id}/modules`)
//         .set('Authorization', `Bearer ${testUser.tokens.accessToken}`)
//         .send({
//           title: 'Test Module',
//           description: 'Module for testing',
//           orderIndex: 1,
//         })
//         .expect(201);

//       const testModule = moduleResponse.body.data;

//       // 3. Create lesson
//       const lessonResponse = await request(app.getHttpServer())
//         .post(`/modules/${testModule.id}/lessons`)
//         .set('Authorization', `Bearer ${testUser.tokens.accessToken}`)
//         .send({
//           title: 'Test Lesson',
//           content: { type: 'text', data: 'This is a test lesson' },
//           orderIndex: 1,
//         })
//         .expect(201);

//       const testLesson = lessonResponse.body.data;

//       // 4. Enroll in course
//       const enrollmentResponse = await request(app.getHttpServer())
//         .post('/enrollments')
//         .set('Authorization', `Bearer ${testUser.tokens.accessToken}`)
//         .send({ courseId: testCourse.id })
//         .expect(201);

//       expect(enrollmentResponse.body.data.courseId).toBe(testCourse.id);

//       // 5. Complete lesson
//       await request(app.getHttpServer())
//         .post(`/enrollments/${enrollmentResponse.body.data.id}/complete-lesson`)
//         .set('Authorization', `Bearer ${testUser.tokens.accessToken}`)
//         .send({ lessonId: testLesson.id })
//         .expect(200);

//       // 6. Check progress
//       const progressResponse = await request(app.getHttpServer())
//         .get(`/enrollments/${enrollmentResponse.body.data.id}/progress`)
//         .set('Authorization', `Bearer ${testUser.tokens.accessToken}`)
//         .expect(200);

//       expect(progressResponse.body.data.progressPercentage).toBeGreaterThan(0);
//     });
//   });

//   describe('HR/ATS Workflow', () => {
//     it('should complete full HR workflow', async () => {
//       // 1. Create job posting
//       testJob = await global.e2eTestUtils.createTestJob(
//         app,
//         testUser.tokens.accessToken,
//         {
//           title: 'E2E Test Job',
//           description: 'Job for E2E testing',
//           jobType: 'full-time',
//           location: 'Remote',
//         }
//       );

//       expect(testJob.id).toBeDefined();
//       expect(testJob.title).toBe('E2E Test Job');

//       // 2. Apply for job
//       const applicationResponse = await request(app.getHttpServer())
//         .post(`/hr/jobs/${testJob.id}/apply`)
//         .set('Authorization', `Bearer ${testUser.tokens.accessToken}`)
//         .send({
//           coverLetter: 'This is my cover letter for the E2E test job.',
//           resumeId: null, // Assuming no resume for simplicity
//         })
//         .expect(201);

//       expect(applicationResponse.body.data.jobId).toBe(testJob.id);

//       // 3. Get applications
//       const applicationsResponse = await request(app.getHttpServer())
//         .get('/hr/applications')
//         .set('Authorization', `Bearer ${testUser.tokens.accessToken}`)
//         .expect(200);

//       expect(applicationsResponse.body.data.length).toBeGreaterThan(0);

//       // 4. Update application status
//       await request(app.getHttpServer())
//         .patch(`/hr/applications/${applicationResponse.body.data.id}`)
//         .set('Authorization', `Bearer ${testUser.tokens.accessToken}`)
//         .send({ status: 'under_review' })
//         .expect(200);
//     });
//   });

//   describe('Performance Tests', () => {
//     it('should handle concurrent requests efficiently', async () => {
//       const result = await global.e2eTestUtils.performanceTest(
//         app,
//         '/health',
//         {
//           requests: 50,
//           concurrency: 10,
//           maxResponseTime: 500,
//         }
//       );

//       expect(result.passed).toBe(true);
//       expect(result.successRate).toBeGreaterThan(95);
//       expect(result.avgResponseTime).toBeLessThan(500);
//     });

//     it('should handle authenticated endpoints efficiently', async () => {
//       const result = await global.e2eTestUtils.performanceTest(
//         app,
//         '/auth/me',
//         {
//           token: testUser.tokens.accessToken,
//           requests: 30,
//           concurrency: 5,
//           maxResponseTime: 1000,
//         }
//       );

//       expect(result.passed).toBe(true);
//       expect(result.successRate).toBeGreaterThan(95);
//     });
//   });

//   describe('Security Tests', () => {
//     it('should properly secure protected endpoints', async () => {
//       const endpoints = [
//         '/auth/me',
//         '/users',
//         '/courses',
//         '/hr/jobs',
//         '/admin/users',
//       ];

//       for (const endpoint of endpoints) {
//         const result = await global.e2eTestUtils.securityTest(app, endpoint);
//         expect(result.passed).toBe(true);
//       }
//     });

//     it('should validate input properly', async () => {
//       // Test with invalid email format
//       const response = await request(app.getHttpServer())
//         .post('/auth/register')
//         .send({
//           email: 'invalid-email',
//           password: 'ValidPassword123!',
//           firstName: 'Test',
//           lastName: 'User',
//         })
//         .expect(400);

//       expect(response.body.success).toBe(false);
//     });

//     it('should prevent SQL injection', async () => {
//       const maliciousInput = "'; DROP TABLE users; --";
      
//       const response = await request(app.getHttpServer())
//         .get(`/users?search=${encodeURIComponent(maliciousInput)}`)
//         .set('Authorization', `Bearer ${testUser.tokens.accessToken}`);

//       // Should not cause a server error and should handle gracefully
//       expect(response.status).not.toBe(500);
//     });
//   });

//   describe('API Response Validation', () => {
//     it('should return consistent API response format', async () => {
//       const endpoints = [
//         { method: 'get', path: '/health', auth: false },
//         { method: 'get', path: '/auth/me', auth: true },
//         { method: 'get', path: '/courses', auth: true },
//       ];

//       for (const endpoint of endpoints) {
//         let req = request(app.getHttpServer())[endpoint.method](endpoint.path);
        
//         if (endpoint.auth) {
//           req = req.set('Authorization', `Bearer ${testUser.tokens.accessToken}`);
//         }

//         const response = await req;
        
//         // All API responses should have consistent structure
//         if (response.status === 200) {
//           expect(response.body).toHaveProperty('success');
//           expect(response.body).toHaveProperty('data');
//           expect(response.body).toHaveProperty('message');
//         }
//       }
//     });
//   });

//   describe('Load Tests', () => {
//     it('should handle realistic load scenarios', async () => {
//       const scenarios = [
//         {
//           name: 'User Authentication',
//           endpoint: '/auth/me',
//           method: 'get',
//           token: testUser.tokens.accessToken,
//           users: 10,
//           duration: 30, // 30 seconds
//         },
//         {
//           name: 'Course Browsing',
//           endpoint: '/courses',
//           method: 'get',
//           token: testUser.tokens.accessToken,
//           users: 15,
//           duration: 20,
//         },
//         {
//           name: 'Health Check',
//           endpoint: '/health',
//           method: 'get',
//           users: 20,
//           duration: 15,
//         },
//       ];

//       const results = await global.e2eTestUtils.loadTest(app, scenarios);

//       for (const result of results) {
//         expect(result.successRate).toBeGreaterThan(95);
//         expect(result.avgResponseTime).toBeLessThan(2000);
//         console.log(`Load test ${result.scenario}: ${result.successRate}% success rate, ${result.avgResponseTime}ms avg response time`);
//       }
//     });
//   });

//   describe('Integration Tests', () => {
//     it('should handle complex multi-module workflows', async () => {
//       // Create a comprehensive workflow involving multiple modules
      
//       // 1. User creates organization
//       const org = await global.e2eTestUtils.createTestOrganization(
//         app,
//         testUser.tokens.accessToken
//       );

//       // 2. User creates course in organization
//       const course = await global.e2eTestUtils.createTestCourse(
//         app,
//         testUser.tokens.accessToken,
//         { organizationId: org.id }
//       );

//       // 3. User creates job posting
//       const job = await global.e2eTestUtils.createTestJob(
//         app,
//         testUser.tokens.accessToken
//       );

//       // 4. Register another user
//       const secondUser = await global.e2eTestUtils.registerTestUser(app);

//       // 5. Second user enrolls in course
//       const enrollmentResponse = await request(app.getHttpServer())
//         .post('/enrollments')
//         .set('Authorization', `Bearer ${secondUser.tokens.accessToken}`)
//         .send({ courseId: course.id })
//         .expect(201);

//       // 6. Second user applies for job
//       const applicationResponse = await request(app.getHttpServer())
//         .post(`/hr/jobs/${job.id}/apply`)
//         .set('Authorization', `Bearer ${secondUser.tokens.accessToken}`)
//         .send({ coverLetter: 'Integration test application' })
//         .expect(201);

//       // 7. Verify all data is connected properly
//       expect(enrollmentResponse.body.data.courseId).toBe(course.id);
//       expect(applicationResponse.body.data.jobId).toBe(job.id);
//     });
//   });
// });
