import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Volkai HR Edu API')
    .setDescription(`
# Volkai HR Education Platform API

A comprehensive HR and Education platform providing:

## 🎓 Learning Management System (LMS)
- Course creation and management
- Interactive lessons and modules
- Progress tracking and analytics
- Assessments and certifications

## 👥 Human Resources & ATS
- Job posting and application management
- Candidate tracking and evaluation
- Interview scheduling and management
- Resume builder and templates

## 🔐 Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- Multi-organization support
- Social login integration

## 💳 Billing & Subscriptions
- Stripe and Razorpay integration
- Subscription management
- Usage tracking and analytics
- Invoice generation

## 🔗 Webhooks & Integrations
- Event-driven webhook delivery
- Third-party calendar integration
- Video conferencing integration
- Job board syndication

## 📊 Analytics & Monitoring
- Real-time performance monitoring
- Security threat detection
- Usage analytics and reporting
- System health monitoring

## 🛡️ Security Features
- Advanced threat detection
- Rate limiting and DDoS protection
- Input validation and sanitization
- Comprehensive audit logging

## 🚀 Performance Optimizations
- Database performance tuning
- Advanced caching strategies
- Load balancing ready
- Horizontal scaling support

---

## Authentication

Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:

\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

## Rate Limiting

API endpoints are rate limited to ensure fair usage:
- **Public endpoints**: 100 requests per minute
- **Authenticated endpoints**: 1000 requests per minute
- **Admin endpoints**: 5000 requests per minute

## Response Format

All API responses follow a consistent format:

\`\`\`json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "requestId": "req_123456789"
  }
}
\`\`\`

## Error Handling

Error responses include detailed information:

\`\`\`json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "requestId": "req_123456789"
  }
}
\`\`\`

## Pagination

List endpoints support pagination:

\`\`\`
GET /api/v1/courses?page=1&limit=20&sort=createdAt&order=desc
\`\`\`

Response includes pagination metadata:

\`\`\`json
{
  "success": true,
  "data": [...],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
\`\`\`

## Filtering and Search

Many endpoints support filtering and search:

\`\`\`
GET /api/v1/courses?category=technology&difficulty=beginner&search=javascript
\`\`\`

## Webhooks

Configure webhooks to receive real-time notifications:

1. Create a webhook endpoint
2. Subscribe to events
3. Verify webhook signatures
4. Handle delivery retries

## SDKs and Libraries

Official SDKs available for:
- JavaScript/TypeScript
- Python
- PHP
- Java
- C#

## Support

- **Documentation**: https://docs.volkai.com
- **API Status**: https://status.volkai.com
- **Support**: support@volkai.com
- **Community**: https://community.volkai.com

---
    `)
    .setVersion('1.0.0')
    .setContact(
      'Volkai Support',
      'https://volkai.com',
      'support@volkai.com'
    )
    .setLicense(
      'MIT License',
      'https://opensource.org/licenses/MIT'
    )
    .setTermsOfService('https://volkai.com/terms')
    .addServer('https://api.volkai.com', 'Production Server')
    .addServer('https://staging-api.volkai.com', 'Staging Server')
    .addServer('http://localhost:3000', 'Development Server')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth'
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
        description: 'API Key for server-to-server authentication',
      },
      'API-Key'
    )
    .addTag('Authentication', 'User authentication and authorization')
    .addTag('Users', 'User management and profiles')
    .addTag('Organizations', 'Organization management')
    .addTag('Courses', 'Learning Management System - Courses')
    .addTag('Modules', 'Learning Management System - Modules')
    .addTag('Lessons', 'Learning Management System - Lessons')
    .addTag('Assessments', 'Learning Management System - Assessments')
    .addTag('Enrollments', 'Learning Management System - Enrollments')
    .addTag('Certificates', 'Learning Management System - Certificates')
    .addTag('HR Jobs', 'Human Resources - Job Management')
    .addTag('HR Applications', 'Human Resources - Application Management')
    .addTag('HR Interviews', 'Human Resources - Interview Management')
    .addTag('Resume', 'Resume Builder and Templates')
    .addTag('Notifications', 'Notification management')
    .addTag('Billing', 'Billing and subscription management')
    .addTag('Analytics', 'Analytics and reporting')
    .addTag('Admin', 'Administrative functions')
    .addTag('Webhooks', 'Webhook management')
    .addTag('Integrations', 'Third-party integrations')
    .addTag('API Keys', 'API key management')
    .addTag('Performance', 'Performance monitoring')
    .addTag('Security', 'Security and threat management')
    .addTag('Monitoring', 'System monitoring and health')
    .addTag('Cache', 'Cache management')
    .addTag('Files', 'File upload and management')
    .addTag('Health', 'System health checks')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
    deepScanRoutes: true,
  });

  // Customize the document
  document.info.version = process.env.npm_package_version || '1.0.0';
  
  // Add security schemes to all operations by default
  if (document.paths) {
    Object.keys(document.paths).forEach(path => {
      Object.keys(document.paths[path]).forEach(method => {
        const operation = document.paths[path][method];
        if (operation && !operation.security) {
          // Add JWT auth to all operations except public ones
          const publicPaths = ['/health', '/auth/login', '/auth/register', '/auth/forgot-password'];
          const isPublicPath = publicPaths.some(publicPath => path.includes(publicPath));
          
          if (!isPublicPath) {
            operation.security = [{ 'JWT-auth': [] }];
          }
        }
      });
    });
  }

  // Setup Swagger UI
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      tryItOutEnabled: true,
    },
    customSiteTitle: 'Volkai HR Edu API Documentation',
    customfavIcon: '/favicon.ico',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js',
    ],
    customCssUrl: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
    ],
  });

  // Setup ReDoc (alternative documentation)
  // const { RedocModule } = require('nestjs-redoc');
  // RedocModule.setup('api/redoc', app, document, {
  //   title: 'Volkai HR Edu API Documentation',
  //   logo: {
  //     url: 'https://volkai.com/logo.png',
  //     backgroundColor: '#fafafa',
  //     altText: 'Volkai Logo',
  //   },
  //   sortPropsAlphabetically: true,
  //   hideDownloadButton: false,
  //   disableSearch: false,
  //   theme: {
  //     colors: {
  //       primary: {
  //         main: '#32329f',
  //       },
  //     },
  //     typography: {
  //       fontSize: '14px',
  //       lineHeight: '1.5em',
  //       code: {
  //         fontSize: '13px',
  //       },
  //       headings: {
  //         fontFamily: 'Montserrat, sans-serif',
  //       },
  //     },
  //     menu: {
  //       width: '260px',
  //     },
  //   },
  // });

  console.log('📚 API Documentation available at:');
  console.log('   - Swagger UI: http://localhost:3000/api/docs');
  console.log('   - ReDoc: http://localhost:3000/api/redoc');
  console.log('   - OpenAPI JSON: http://localhost:3000/api/docs-json');
}

// Export OpenAPI specification as JSON
export function getOpenApiSpec(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Volkai HR Edu API')
    .setDescription('Comprehensive HR Education Platform API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  return SwaggerModule.createDocument(app, config);
}
