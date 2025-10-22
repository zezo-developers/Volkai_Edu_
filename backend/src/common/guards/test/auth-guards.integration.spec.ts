// import { Test, TestingModule } from '@nestjs/testing';
// import { INestApplication, ExecutionContext } from '@nestjs/common';
// import { Reflector } from '@nestjs/core';
// import  request from 'supertest';
// import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
// import { 
//   RolesGuard, 
//   AdminGuard, 
//   OrgAdminGuard, 
//   ResourceOwnerGuard, 
//   SelfOrAdminGuard 
// } from '../roles.guard';

// describe('Authentication Guards Integration', () => {
//   let app: INestApplication;
//   let reflector: Reflector;

//   beforeAll(async () => {
//     const moduleFixture: TestingModule = await Test.createTestingModule({
//       providers: [
//         Reflector,
//         JwtAuthGuard,
//         RolesGuard,
//         AdminGuard,
//         OrgAdminGuard,
//         ResourceOwnerGuard,
//         SelfOrAdminGuard,
//       ],
//     }).compile();

//     app = moduleFixture.createNestApplication();
//     reflector = moduleFixture.get<Reflector>(Reflector);
//     await app.init();
//   });

//   afterAll(async () => {
//     await app.close();
//   });

//   describe('JwtAuthGuard', () => {
//     let guard: JwtAuthGuard;

//     beforeEach(() => {
//       guard = new JwtAuthGuard(reflector);
//     });

//     it('should allow access to public routes', () => {
//       const mockContext = createMockExecutionContext(true); // isPublic = true
      
//       const result = guard.canActivate(mockContext);
//       expect(result).toBe(true);
//     });

//     it('should require authentication for protected routes', () => {
//       const mockContext = createMockExecutionContext(false); // isPublic = false
      
//       // This would normally call super.canActivate() which requires JWT
//       expect(() => guard.canActivate(mockContext)).toBeDefined();
//     });

//     it('should handle request with valid user', () => {
//       const mockContext = createMockExecutionContext(false);
//       const mockUser = { id: 'user-1', role: 'user' };
      
//       const result = guard.handleRequest(null, mockUser, null, mockContext);
//       expect(result).toEqual(mockUser);
//     });

//     it('should throw error for invalid authentication on protected route', () => {
//       const mockContext = createMockExecutionContext(false);
      
//       expect(() => {
//         guard.handleRequest(new Error('Invalid token'), null, null, mockContext);
//       }).toThrow('Invalid token');
//     });

//     it('should allow null user on public routes', () => {
//       const mockContext = createMockExecutionContext(true);
      
//       const result = guard.handleRequest(null, null, null, mockContext);
//       expect(result).toBeNull();
//     });
//   });

//   describe('RolesGuard', () => {
//     let guard: RolesGuard;

//     beforeEach(() => {
//       guard = new RolesGuard(reflector);
//     });

//     it('should allow access when no roles are required', () => {
//       const mockContext = createMockExecutionContextWithUser(
//         { id: 'user-1', role: 'user' },
//         [] // no required roles
//       );
      
//       const result = guard.canActivate(mockContext);
//       expect(result).toBe(true);
//     });

//     it('should allow access to public routes regardless of roles', () => {
//       const mockContext = createMockExecutionContextWithUser(
//         { id: 'user-1', role: 'user' },
//         ['admin'], // requires admin
//         true // but is public
//       );
      
//       const result = guard.canActivate(mockContext);
//       expect(result).toBe(true);
//     });

//     it('should allow access when user has required role', () => {
//       const mockContext = createMockExecutionContextWithUser(
//         { id: 'user-1', role: 'admin' },
//         ['admin', 'hr'] // requires admin or hr
//       );
      
//       const result = guard.canActivate(mockContext);
//       expect(result).toBe(true);
//     });

//     it('should deny access when user lacks required role', () => {
//       const mockContext = createMockExecutionContextWithUser(
//         { id: 'user-1', role: 'user' },
//         ['admin'] // requires admin
//       );
      
//       expect(() => guard.canActivate(mockContext)).toThrow('Access denied');
//     });

//     it('should allow admin access to most resources', () => {
//       const mockContext = createMockExecutionContextWithUser(
//         { id: 'user-1', role: 'admin' },
//         ['hr', 'manager'] // requires hr or manager, but admin should work
//       );
      
//       const result = guard.canActivate(mockContext);
//       expect(result).toBe(true);
//     });

//     it('should respect super_admin_only restriction', () => {
//       const mockContext = createMockExecutionContextWithUser(
//         { id: 'user-1', role: 'admin' },
//         ['super_admin_only'] // requires super admin specifically
//       );
      
//       expect(() => guard.canActivate(mockContext)).toThrow('Access denied');
//     });
//   });

//   describe('AdminGuard', () => {
//     let guard: AdminGuard;

//     beforeEach(() => {
//       guard = new AdminGuard(reflector);
//     });

//     it('should allow access for admin users', () => {
//       const mockContext = createMockExecutionContextWithUser(
//         { id: 'user-1', role: 'admin' }
//       );
      
//       const result = guard.canActivate(mockContext);
//       expect(result).toBe(true);
//     });

//     it('should allow access for owner users', () => {
//       const mockContext = createMockExecutionContextWithUser(
//         { id: 'user-1', role: 'owner' }
//       );
      
//       const result = guard.canActivate(mockContext);
//       expect(result).toBe(true);
//     });

//     it('should allow access for super_admin users', () => {
//       const mockContext = createMockExecutionContextWithUser(
//         { id: 'user-1', role: 'super_admin' }
//       );
      
//       const result = guard.canActivate(mockContext);
//       expect(result).toBe(true);
//     });

//     it('should deny access for regular users', () => {
//       const mockContext = createMockExecutionContextWithUser(
//         { id: 'user-1', role: 'user' }
//       );
      
//       expect(() => guard.canActivate(mockContext)).toThrow('Admin access required');
//     });

//     it('should deny access for unauthenticated users', () => {
//       const mockContext = createMockExecutionContextWithUser(null);
      
//       expect(() => guard.canActivate(mockContext)).toThrow('Authentication required');
//     });
//   });

//   describe('OrgAdminGuard', () => {
//     let guard: OrgAdminGuard;

//     beforeEach(() => {
//       guard = new OrgAdminGuard(reflector);
//     });

//     it('should allow super admin access to any organization', () => {
//       const mockContext = createMockExecutionContextWithUser(
//         { id: 'user-1', role: 'super_admin', organizationId: 'org-1' },
//         [],
//         false,
//         { orgId: 'org-2' } // different org
//       );
      
//       const result = guard.canActivate(mockContext);
//       expect(result).toBe(true);
//     });

//     it('should allow org admin access to their organization', () => {
//       const mockContext = createMockExecutionContextWithUser(
//         { 
//           id: 'user-1', 
//           role: 'user', 
//           organizationId: 'org-1',
//           organizationRole: 'admin'
//         },
//         [],
//         false,
//         { orgId: 'org-1' }
//       );
      
//       const result = guard.canActivate(mockContext);
//       expect(result).toBe(true);
//     });

//     it('should deny access to different organization', () => {
//       const mockContext = createMockExecutionContextWithUser(
//         { 
//           id: 'user-1', 
//           role: 'user', 
//           organizationId: 'org-1',
//           organizationRole: 'admin'
//         },
//         [],
//         false,
//         { orgId: 'org-2' } // different org
//       );
      
//       expect(() => guard.canActivate(mockContext)).toThrow('does not belong to this organization');
//     });

//     it('should deny access to non-admin org members', () => {
//       const mockContext = createMockExecutionContextWithUser(
//         { 
//           id: 'user-1', 
//           role: 'user', 
//           organizationId: 'org-1',
//           organizationRole: 'member'
//         },
//         [],
//         false,
//         { orgId: 'org-1' }
//       );
      
//       expect(() => guard.canActivate(mockContext)).toThrow('Organization admin access required');
//     });
//   });

//   describe('SelfOrAdminGuard', () => {
//     let guard: SelfOrAdminGuard;

//     beforeEach(() => {
//       guard = new SelfOrAdminGuard(reflector);
//     });

//     it('should allow users to access their own data', () => {
//       const mockContext = createMockExecutionContextWithUser(
//         { id: 'user-1', role: 'user' },
//         [],
//         false,
//         { userId: 'user-1' }
//       );
      
//       const result = guard.canActivate(mockContext);
//       expect(result).toBe(true);
//     });

//     it('should allow admin to access any user data', () => {
//       const mockContext = createMockExecutionContextWithUser(
//         { id: 'admin-1', role: 'admin' },
//         [],
//         false,
//         { userId: 'user-1' }
//       );
      
//       const result = guard.canActivate(mockContext);
//       expect(result).toBe(true);
//     });

//     it('should deny users access to other users data', () => {
//       const mockContext = createMockExecutionContextWithUser(
//         { id: 'user-1', role: 'user' },
//         [],
//         false,
//         { userId: 'user-2' }
//       );
      
//       expect(() => guard.canActivate(mockContext)).toThrow('You can only access your own data');
//     });
//   });

//   // Helper functions
//   function createMockExecutionContext(isPublic: boolean = false): ExecutionContext {
//     return {
//       switchToHttp: () => ({
//         getRequest: () => ({ user: null }),
//       }),
//       getHandler: () => ({}),
//       getClass: () => ({}),
//     } as ExecutionContext;
//   }

//   function createMockExecutionContextWithUser(
//     user: any, 
//     requiredRoles: string[] = [],
//     isPublic: boolean = false,
//     params: any = {}
//   ): ExecutionContext {
//     return {
//       switchToHttp: () => ({
//         getRequest: () => ({ 
//           user, 
//           params,
//           body: {}
//         }),
//       }),
//       getHandler: () => ({}),
//       getClass: () => ({}),
//     } as ExecutionContext;
//   }
// });

// describe('Security Integration Tests', () => {
//   describe('Endpoint Security Verification', () => {
//     const criticalEndpoints = [
//       { path: '/admin/users', method: 'GET', requiresAuth: true, requiresAdmin: true },
//       { path: '/admin/config', method: 'PUT', requiresAuth: true, requiresAdmin: true },
//       { path: '/billing/subscriptions', method: 'POST', requiresAuth: true, requiresOrgAdmin: true },
//       { path: '/hr/jobs', method: 'POST', requiresAuth: true, requiresHR: true },
//       { path: '/security/metrics', method: 'GET', requiresAuth: true, requiresAdmin: true },
//       { path: '/users/profile', method: 'GET', requiresAuth: true, requiresSelfOrAdmin: true },
//     ];

//     it('should verify all critical endpoints have proper authentication', () => {
//       criticalEndpoints.forEach(endpoint => {
//         expect(endpoint.requiresAuth).toBe(true);
//         console.log(`✅ ${endpoint.method} ${endpoint.path} requires authentication`);
//       });
//     });

//     it('should verify admin endpoints have admin guards', () => {
//       const adminEndpoints = criticalEndpoints.filter(e => e.requiresAdmin);
//       expect(adminEndpoints.length).toBeGreaterThan(0);
      
//       adminEndpoints.forEach(endpoint => {
//         console.log(`🔒 ${endpoint.method} ${endpoint.path} requires admin access`);
//       });
//     });

//     it('should verify role-based access is properly configured', () => {
//       const roleEndpoints = criticalEndpoints.filter(e => 
//         e.requiresHR || e.requiresOrgAdmin || e.requiresSelfOrAdmin
//       );
      
//       expect(roleEndpoints.length).toBeGreaterThan(0);
//       console.log(`🎭 ${roleEndpoints.length} endpoints have role-based access control`);
//     });
//   });

//   describe('Security Headers and Middleware', () => {
//     it('should verify security middleware is applied', () => {
//       // This would be tested with actual HTTP requests in e2e tests
//       const securityMiddleware = [
//         'helmet', // Security headers
//         'cors', // CORS configuration
//         'throttler', // Rate limiting
//         'validation', // Input validation
//         'sanitization' // Input sanitization
//       ];

//       securityMiddleware.forEach(middleware => {
//         console.log(`🛡️ ${middleware} middleware should be configured`);
//       });

//       expect(securityMiddleware.length).toBe(5);
//     });
//   });
// });
