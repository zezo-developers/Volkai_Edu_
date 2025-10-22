// import { Test, TestingModule } from '@nestjs/testing';
// import { INestApplication } from '@nestjs/common';
// import { AppModule } from '../src/app.module';
// import { ValidationPipe } from '@nestjs/common';
// import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
// import request from 'supertest';

// // E2E test utilities
// global.e2eTestUtils = {
//   // Create E2E test application
//   createE2ETestApp: async (): Promise<INestApplication> => {
//     const moduleFixture: TestingModule = await Test.createTestingModule({
//       imports: [AppModule],
//     }).compile();

//     const app = moduleFixture.createNestApplication();
    
//     // Apply global pipes and filters
//     app.useGlobalPipes(new ValidationPipe({
//       whitelist: true,
//       forbidNonWhitelisted: true,
//       transform: true,
//     }));

//     // Setup Swagger for API documentation testing
//     const config = new DocumentBuilder()
//       .setTitle('Volkai HR Edu API')
//       .setDescription('Comprehensive HR Education Platform API')
//       .setVersion('1.0')
//       .addBearerAuth()
//       .build();
    
//     const document = SwaggerModule.createDocument(app, config);
//     SwaggerModule.setup('api/docs', app, document);

//     await app.init();
//     return app;
//   },

//   // Authentication helpers
//   registerTestUser: async (app: INestApplication, userData: any = {}) => {
//     const defaultUserData = {
//       email: `test-${Date.now()}@example.com`,
//       password: 'TestPassword123!',
//       firstName: 'Test',
//       lastName: 'User',
//       ...userData,
//     };

//     const response = await request(app.getHttpServer())
//       .post('/auth/register')
//       .send(defaultUserData);

//     return {
//       user: response.body.data.user,
//       tokens: response.body.data.tokens,
//       userData: defaultUserData,
//     };
//   },

//   loginTestUser: async (app: INestApplication, email: string, password: string) => {
//     const response = await request(app.getHttpServer())
//       .post('/auth/login')
//       .send({ email, password });

//     return {
//       user: response.body.data.user,
//       tokens: response.body.data.tokens,
//     };
//   },

//   // Organization helpers
//   createTestOrganization: async (app: INestApplication, token: string, orgData: any = {}) => {
//     const defaultOrgData = {
//       name: `Test Organization ${Date.now()}`,
//       description: 'Test organization for E2E testing',
//       ...orgData,
//     };

//     const response = await request(app.getHttpServer())
//       .post('/organizations')
//       .set('Authorization', `Bearer ${token}`)
//       .send(defaultOrgData);

//     return response.body.data;
//   },

//   // Course helpers
//   createTestCourse: async (app: INestApplication, token: string, courseData: any = {}) => {
//     const defaultCourseData = {
//       title: `Test Course ${Date.now()}`,
//       description: 'Test course for E2E testing',
//       category: 'technology',
//       difficultyLevel: 'beginner',
//       ...courseData,
//     };

//     const response = await request(app.getHttpServer())
//       .post('/courses')
//       .set('Authorization', `Bearer ${token}`)
//       .send(defaultCourseData);

//     return response.body.data;
//   },

//   // Job helpers
//   createTestJob: async (app: INestApplication, token: string, jobData: any = {}) => {
//     const defaultJobData = {
//       title: `Test Job ${Date.now()}`,
//       description: 'Test job for E2E testing',
//       jobType: 'full-time',
//       location: 'Remote',
//       salaryRange: { min: 50000, max: 80000 },
//       ...jobData,
//     };

//     const response = await request(app.getHttpServer())
//       .post('/hr/jobs')
//       .set('Authorization', `Bearer ${token}`)
//       .send(defaultJobData);

//     return response.body.data;
//   },

//   // API testing helpers
//   // testEndpoint: async (
//   //   app: INestApplication,
//   //   method: string,
//   //   endpoint: string,
//   //   options: {
//   //     token?: string;
//   //     data?: any;
//   //     expectedStatus?: number;
//   //     expectedFields?: string[];
//   //   } = {}
//   // ) => {
//   //   const {
//   //     token,
//   //     data,
//   //     expectedStatus = 200,
//   //     expectedFields = [],
//   //   } = options;

//   //   let req = request(app.getHttpServer())[method.toLowerCase()](endpoint);

//   //   if (token) {
//   //     req = req.set('Authorization', `Bearer ${token}`);
//   //   }

//   //   if (data) {
//   //     req = req.send(data);
//   //   }

//   //   const response = await req.expect(expectedStatus);

//   //   // Validate expected fields
//   //   for (const field of expectedFields) {
//   //     expect(response.body).toHaveProperty(field);
//   //   }

//   //   return response;
//   // },

//   // Performance testing helpers
//   performanceTest: async (
//     app: INestApplication,
//     endpoint: string,
//     options: {
//       token?: string;
//       requests?: number;
//       concurrency?: number;
//       maxResponseTime?: number;
//     } = {}
//   ) => {
//     const {
//       token,
//       requests = 100,
//       concurrency = 10,
//       maxResponseTime = 1000,
//     } = options;

//     const results: number[] = [];
//     const errors: any[] = [];

//     const makeRequest = async (): Promise<number> => {
//       const startTime = Date.now();
//       try {
//         let req = request(app.getHttpServer()).get(endpoint);
//         if (token) {
//           req = req.set('Authorization', `Bearer ${token}`);
//         }
//         await req;
//         return Date.now() - startTime;
//       } catch (error) {
//         errors.push(error);
//         return Date.now() - startTime;
//       }
//     };

//     // Run requests in batches for concurrency
//     for (let i = 0; i < requests; i += concurrency) {
//       const batch = Array(Math.min(concurrency, requests - i))
//         .fill(null)
//         .map(() => makeRequest());
      
//       const batchResults = await Promise.all(batch);
//       results.push(...batchResults);
//     }

//     const avgResponseTime = results.reduce((a, b) => a + b, 0) / results.length;
//     const maxResponseTimeActual = Math.max(...results);
//     const minResponseTime = Math.min(...results);

//     return {
//       totalRequests: requests,
//       avgResponseTime,
//       maxResponseTime: maxResponseTimeActual,
//       minResponseTime,
//       errors: errors.length,
//       successRate: ((requests - errors.length) / requests) * 100,
//       passed: avgResponseTime <= maxResponseTime && errors.length === 0,
//     };
//   },

//   // Security testing helpers
//   securityTest: async (app: INestApplication, endpoint: string) => {
//     const tests:any[] = [];

//     // Test without authentication
//     try {
//       const response = await request(app.getHttpServer()).get(endpoint);
//       tests.push({
//         test: 'No authentication',
//         status: response.status,
//         passed: response.status === 401,
//       });
//     } catch (error:any) {
//       tests.push({
//         test: 'No authentication',
//         status: 500,
//         passed: false,
//         error: error.message,
//       });
//     }

//     // Test with invalid token
//     try {
//       const response = await request(app.getHttpServer())
//         .get(endpoint)
//         .set('Authorization', 'Bearer invalid-token');
//       tests.push({
//         test: 'Invalid token',
//         status: response.status,
//         passed: response.status === 401,
//       });
//     } catch (error) {
//       tests.push({
//         test: 'Invalid token',
//         status: 500,
//         passed: false,
//         error: error.message,
//       });
//     }

//     // Test SQL injection
//     try {
//       const response = await request(app.getHttpServer())
//         .get(`${endpoint}?id=1' OR '1'='1`)
//         .set('Authorization', 'Bearer valid-token');
//       tests.push({
//         test: 'SQL injection',
//         status: response.status,
//         passed: response.status !== 200 || !response.body.toString().includes('error'),
//       });
//     } catch (error) {
//       tests.push({
//         test: 'SQL injection',
//         status: 500,
//         passed: true, // Error is expected for malformed requests
//       });
//     }

//     return {
//       endpoint,
//       tests,
//       passed: tests.every(t => t.passed),
//     };
//   },

//   // Data validation helpers
//   validateApiResponse: (response: any, schema: any) => {
//     const errors: string[] = [];

//     const validateField = (obj: any, field: string, type: string, required: boolean = true) => {
//       if (required && !(field in obj)) {
//         errors.push(`Missing required field: ${field}`);
//         return;
//       }

//       if (field in obj) {
//         const value = obj[field];
//         const actualType = Array.isArray(value) ? 'array' : typeof value;
        
//         if (actualType !== type) {
//           errors.push(`Field ${field} should be ${type}, got ${actualType}`);
//         }
//       }
//     };

//     // Validate based on schema
//     for (const [field, config] of Object.entries(schema)) {
//       const { type, required = true } = config as any;
//       validateField(response, field, type, required);
//     }

//     return {
//       valid: errors.length === 0,
//       errors,
//     };
//   },

//   // Load testing helpers
//   loadTest: async (
//     app: INestApplication,
//     scenarios: Array<{
//       name: string;
//       endpoint: string;
//       method: string;
//       data?: any;
//       token?: string;
//       users: number;
//       duration: number; // seconds
//     }>
//   ) => {
//     const results: any[] = [];

//     for (const scenario of scenarios) {
//       console.log(`Running load test: ${scenario.name}`);
      
//       const startTime = Date.now();
//       const endTime = startTime + (scenario.duration * 1000);
//       const requests: Promise<any>[] = [];
      
//       // Simulate concurrent users
//       for (let user = 0; user < scenario.users; user++) {
//         const userRequests = async () => {
//           const userResults: number[] = [];
          
//           while (Date.now() < endTime) {
//             const reqStart = Date.now();
//             try {
//               let req = request(app.getHttpServer())[scenario.method.toLowerCase()](scenario.endpoint);
              
//               if (scenario.token) {
//                 req = req.set('Authorization', `Bearer ${scenario.token}`);
//               }
              
//               if (scenario.data) {
//                 req = req.send(scenario.data);
//               }
              
//               await req;
//               userResults.push(Date.now() - reqStart);
//             } catch (error) {
//               userResults.push(-1); // Mark as error
//             }
            
//             // Small delay between requests
//             await new Promise(resolve => setTimeout(resolve, 100));
//           }
          
//           return userResults;
//         };
        
//         requests.push(userRequests());
//       }
      
//       const allResults = await Promise.all(requests);
//       const flatResults = allResults.flat();
//       const successfulResults = flatResults.filter(r => r > 0);
//       const errorCount = flatResults.filter(r => r === -1).length;
      
//       results.push({
//         scenario: scenario.name,
//         totalRequests: flatResults.length,
//         successfulRequests: successfulResults.length,
//         errorCount,
//         successRate: (successfulResults.length / flatResults.length) * 100,
//         avgResponseTime: successfulResults.length > 0 
//           ? successfulResults.reduce((a, b) => a + b, 0) / successfulResults.length 
//           : 0,
//         maxResponseTime: successfulResults.length > 0 ? Math.max(...successfulResults) : 0,
//         minResponseTime: successfulResults.length > 0 ? Math.min(...successfulResults) : 0,
//       });
//     }

//     return results;
//   },
// };

// // E2E test hooks
// beforeAll(async () => {
//   // Set test timeout for E2E tests
//   jest.setTimeout(60000);
// });

// // Declare global types
// declare global {
//   var e2eTestUtils: any;
// }
