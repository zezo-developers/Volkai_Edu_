// import { Test, TestingModule } from '@nestjs/testing';
// import { INestApplication } from '@nestjs/common';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { ConfigModule } from '@nestjs/config';
// import { JwtModule } from '@nestjs/jwt';
// import  request from 'supertest';
// import { AuthModule } from '../auth.module';
// import { UsersModule } from '../../users/users.module';
// import { EmailModule } from '../../email/email.module';
// import { DataSource } from 'typeorm';

// describe('AuthController (Integration)', () => {
//   let app: INestApplication;
//   let dataSource: DataSource;
//   let testData: any;

//   beforeAll(async () => {
//     const moduleFixture: TestingModule = await global.integrationTestUtils.createIntegrationTestModule([
//       AuthModule,
//       UsersModule,
//       EmailModule,
//       JwtModule.register({
//         secret: 'test-secret',
//         signOptions: { expiresIn: '1h' },
//       }),
//     ]);

//     app = moduleFixture.createNestApplication();
//     dataSource = moduleFixture.get<DataSource>(DataSource);
    
//     await app.init();
    
//     // Seed test data
//     testData = await global.integrationTestUtils.seedTestData(dataSource);
//   });

//   afterAll(async () => {
//     await app.close();
//   });

//   describe('POST /auth/register', () => {
//     it('should register a new user successfully', async () => {
//       const registerDto = {
//         email: 'newuser@example.com',
//         password: 'StrongPassword123!',
//         firstName: 'New',
//         lastName: 'User',
//         organizationId: testData.organization.id,
//       };

//       const response = await request(app.getHttpServer())
//         .post('/auth/register')
//         .send(registerDto)
//         .expect(201);

//       expect(response.body.success).toBe(true);
//       expect(response.body.data.user).toBeDefined();
//       expect(response.body.data.user.email).toBe(registerDto.email);
//       expect(response.body.data.user.password).toBeUndefined(); // Password should not be returned
//       expect(response.body.data.tokens).toBeDefined();
//       expect(response.body.data.tokens.accessToken).toBeDefined();
//       expect(response.body.data.tokens.refreshToken).toBeDefined();

//       // Verify user was created in database
//       const userCount = await global.integrationTestUtils.assertDatabaseState(
//         dataSource,
//         'User',
//         { email: registerDto.email }
//       );
//       expect(userCount).toBe(1);
//     });

//     it('should fail with duplicate email', async () => {
//       const registerDto = {
//         email: testData.user.email, // Use existing user email
//         password: 'StrongPassword123!',
//         firstName: 'Duplicate',
//         lastName: 'User',
//         organizationId: testData.organization.id,
//       };

//       const response = await request(app.getHttpServer())
//         .post('/auth/register')
//         .send(registerDto)
//         .expect(409);

//       expect(response.body.success).toBe(false);
//       expect(response.body.message).toContain('already exists');
//     });

//     it('should fail with weak password', async () => {
//       const registerDto = {
//         email: 'weakpass@example.com',
//         password: '123', // Weak password
//         firstName: 'Weak',
//         lastName: 'Password',
//         organizationId: testData.organization.id,
//       };

//       const response = await request(app.getHttpServer())
//         .post('/auth/register')
//         .send(registerDto)
//         .expect(400);

//       expect(response.body.success).toBe(false);
//       expect(response.body.message).toContain('password');
//     });

//     it('should fail with invalid email format', async () => {
//       const registerDto = {
//         email: 'invalid-email', // Invalid email format
//         password: 'StrongPassword123!',
//         firstName: 'Invalid',
//         lastName: 'Email',
//         organizationId: testData.organization.id,
//       };

//       const response = await request(app.getHttpServer())
//         .post('/auth/register')
//         .send(registerDto)
//         .expect(400);

//       expect(response.body.success).toBe(false);
//     });
//   });

//   describe('POST /auth/login', () => {
//     it('should login with valid credentials', async () => {
//       const loginDto = {
//         email: testData.user.email,
//         password: 'password123', // This should match the seeded user password
//       };

//       const response = await request(app.getHttpServer())
//         .post('/auth/login')
//         .send(loginDto)
//         .expect(200);

//       expect(response.body.success).toBe(true);
//       expect(response.body.data.user).toBeDefined();
//       expect(response.body.data.user.email).toBe(loginDto.email);
//       expect(response.body.data.tokens).toBeDefined();
//       expect(response.body.data.tokens.accessToken).toBeDefined();
//       expect(response.body.data.tokens.refreshToken).toBeDefined();
//     });

//     it('should fail with invalid credentials', async () => {
//       const loginDto = {
//         email: testData.user.email,
//         password: 'wrongpassword',
//       };

//       const response = await request(app.getHttpServer())
//         .post('/auth/login')
//         .send(loginDto)
//         .expect(401);

//       expect(response.body.success).toBe(false);
//       expect(response.body.message).toContain('Invalid credentials');
//     });

//     it('should fail with non-existent user', async () => {
//       const loginDto = {
//         email: 'nonexistent@example.com',
//         password: 'password123',
//       };

//       const response = await request(app.getHttpServer())
//         .post('/auth/login')
//         .send(loginDto)
//         .expect(401);

//       expect(response.body.success).toBe(false);
//     });

//     it('should fail with inactive user', async () => {
//       // Create inactive user
//       const userRepository = dataSource.getRepository('User');
//       const inactiveUser = await userRepository.save({
//         email: 'inactive@example.com',
//         firstName: 'Inactive',
//         lastName: 'User',
//         password: '$2b$10$hashedpassword',
//         role: 'user',
//         status: 'inactive', // Inactive status
//         isEmailVerified: true,
//         organizationId: testData.organization.id,
//         profile: {},
//         preferences: {},
//         metadata: {},
//       });

//       const loginDto = {
//         email: inactiveUser.email,
//         password: 'password123',
//       };

//       const response = await request(app.getHttpServer())
//         .post('/auth/login')
//         .send(loginDto)
//         .expect(401);

//       expect(response.body.success).toBe(false);
//       expect(response.body.message).toContain('inactive');
//     });
//   });

//   describe('POST /auth/refresh', () => {
//     it('should refresh tokens with valid refresh token', async () => {
//       // First, login to get tokens
//       const loginResponse = await request(app.getHttpServer())
//         .post('/auth/login')
//         .send({
//           email: testData.user.email,
//           password: 'password123',
//         });

//       const refreshToken = loginResponse.body.data.tokens.refreshToken;

//       // Then refresh tokens
//       const response = await request(app.getHttpServer())
//         .post('/auth/refresh')
//         .send({ refreshToken })
//         .expect(200);

//       expect(response.body.success).toBe(true);
//       expect(response.body.data.tokens).toBeDefined();
//       expect(response.body.data.tokens.accessToken).toBeDefined();
//       expect(response.body.data.tokens.refreshToken).toBeDefined();
      
//       // New tokens should be different from original
//       expect(response.body.data.tokens.accessToken).not.toBe(loginResponse.body.data.tokens.accessToken);
//     });

//     it('should fail with invalid refresh token', async () => {
//       const response = await request(app.getHttpServer())
//         .post('/auth/refresh')
//         .send({ refreshToken: 'invalid-token' })
//         .expect(401);

//       expect(response.body.success).toBe(false);
//     });
//   });

//   describe('POST /auth/logout', () => {
//     it('should logout successfully with valid token', async () => {
//       // First, login to get tokens
//       const loginResponse = await request(app.getHttpServer())
//         .post('/auth/login')
//         .send({
//           email: testData.user.email,
//           password: 'password123',
//         });

//       const accessToken = loginResponse.body.data.tokens.accessToken;

//       // Then logout
//       const response = await request(app.getHttpServer())
//         .post('/auth/logout')
//         .set('Authorization', `Bearer ${accessToken}`)
//         .expect(200);

//       expect(response.body.success).toBe(true);
//     });

//     it('should fail without authentication', async () => {
//       const response = await request(app.getHttpServer())
//         .post('/auth/logout')
//         .expect(401);

//       expect(response.body.success).toBe(false);
//     });
//   });

//   describe('GET /auth/me', () => {
//     it('should return current user with valid token', async () => {
//       // First, login to get tokens
//       const loginResponse = await request(app.getHttpServer())
//         .post('/auth/login')
//         .send({
//           email: testData.user.email,
//           password: 'password123',
//         });

//       const accessToken = loginResponse.body.data.tokens.accessToken;

//       // Then get current user
//       const response = await request(app.getHttpServer())
//         .get('/auth/me')
//         .set('Authorization', `Bearer ${accessToken}`)
//         .expect(200);

//       expect(response.body.success).toBe(true);
//       expect(response.body.data.user).toBeDefined();
//       expect(response.body.data.user.email).toBe(testData.user.email);
//       expect(response.body.data.user.password).toBeUndefined();
//     });

//     it('should fail without authentication', async () => {
//       const response = await request(app.getHttpServer())
//         .get('/auth/me')
//         .expect(401);

//       expect(response.body.success).toBe(false);
//     });

//     it('should fail with invalid token', async () => {
//       const response = await request(app.getHttpServer())
//         .get('/auth/me')
//         .set('Authorization', 'Bearer invalid-token')
//         .expect(401);

//       expect(response.body.success).toBe(false);
//     });
//   });

//   describe('POST /auth/forgot-password', () => {
//     it('should send password reset email for valid user', async () => {
//       const response = await request(app.getHttpServer())
//         .post('/auth/forgot-password')
//         .send({ email: testData.user.email })
//         .expect(200);

//       expect(response.body.success).toBe(true);
//       expect(response.body.message).toContain('reset');
//     });

//     it('should not reveal if user does not exist', async () => {
//       const response = await request(app.getHttpServer())
//         .post('/auth/forgot-password')
//         .send({ email: 'nonexistent@example.com' })
//         .expect(200);

//       expect(response.body.success).toBe(true);
//       expect(response.body.message).toContain('reset');
//     });
//   });
// });
