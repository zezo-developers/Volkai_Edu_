# Learning Management System (LMS) - Phase 3

This document provides comprehensive documentation for the LMS implementation in Phase 3 of the VolkaiEdu platform.

## Overview

The LMS module provides a complete learning management system with the following core features:

- **Course Management**: Create, manage, and publish courses with modules and lessons
- **Assessment System**: Comprehensive assessment tools with multiple question types
- **Enrollment Management**: Student enrollment and progress tracking
- **Certificate Generation**: Automatic certificate generation upon course completion
- **Search Integration**: Elasticsearch-powered search across all content
- **Content Versioning**: Version control and publishing workflows
- **Anti-Cheating**: Advanced proctoring and security measures

## Architecture

### Database Entities

The LMS is built around the following core entities:

#### Course Entity
- **Purpose**: Represents a complete learning course
- **Key Features**: 
  - Multiple difficulty levels (Beginner, Intermediate, Advanced, Expert)
  - Access control (Public, Private, Restricted)
  - Pricing and enrollment management
  - Rich metadata and tagging system

#### Module Entity
- **Purpose**: Organizes lessons within a course
- **Key Features**:
  - Sequential ordering
  - Status management (Draft, Published, Archived)
  - Duration tracking

#### Lesson Entity
- **Purpose**: Individual learning units within modules
- **Key Features**:
  - Multiple content types (Video, Text, Quiz, Assignment, SCORM)
  - File attachments support
  - Progress tracking integration

#### Assessment Entity
- **Purpose**: Quizzes, exams, and assignments
- **Key Features**:
  - Multiple question types (Multiple Choice, True/False, Short Answer, Essay)
  - Time limits and attempt restrictions
  - Anti-cheating measures
  - Automatic grading

#### Enrollment Entity
- **Purpose**: Tracks student enrollment and progress
- **Key Features**:
  - Real-time progress calculation
  - Time tracking
  - Score management
  - Completion status

#### Certificate Entity
- **Purpose**: Course completion certificates
- **Key Features**:
  - PDF generation with custom templates
  - Verification system
  - Blockchain-ready for future integration

### Services Architecture

#### CourseManagementService
```typescript
// Core course operations
createCourse(dto: CreateCourseDto, user: User): Promise<Course>
getCourseById(id: string, user: User): Promise<Course>
searchCourses(dto: SearchCoursesDto, user: User): Promise<CourseListResponseDto>
updateCourse(id: string, dto: UpdateCourseDto, user: User): Promise<Course>
publishCourse(id: string, user: User): Promise<Course>
cloneCourse(id: string, dto: CloneCourseDto, user: User): Promise<Course>
```

#### AssessmentService
```typescript
// Assessment management
createAssessment(dto: CreateAssessmentDto, user: User): Promise<Assessment>
startAssessmentAttempt(assessmentId: string, userId: string, dto: StartAssessmentAttemptDto): Promise<AssessmentAttempt>
submitAssessmentAttempt(attemptId: string, userId: string, dto: SubmitAssessmentAttemptDto): Promise<AssessmentAttempt>
addQuestion(assessmentId: string, dto: AddQuestionDto, user: User): Promise<Assessment>
```

#### EnrollmentService
```typescript
// Enrollment and progress management
enrollUser(courseId: string, userId: string, dto: EnrollUserDto): Promise<Enrollment>
updateLessonProgress(enrollmentId: string, lessonId: string, userId: string, dto: UpdateLessonProgressDto): Promise<LessonProgress>
completeLesson(enrollmentId: string, lessonId: string, userId: string): Promise<LessonProgress>
getCourseProgressAnalytics(courseId: string, user: User, options?: any): Promise<CourseProgressAnalyticsDto>
```

#### CertificateService
```typescript
// Certificate generation and verification
generateCertificate(enrollmentId: string, user: User, dto?: GenerateCertificateDto): Promise<Certificate>
verifyCertificate(certificateNumber: string): Promise<{ valid: boolean; certificate?: Certificate; message: string }>
downloadCertificate(certificateId: string, user: User): Promise<{ buffer: Buffer; filename: string }>
```

## API Endpoints

### Course Management

#### Create Course
```http
POST /api/courses
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Advanced JavaScript",
  "description": "Learn advanced JavaScript concepts",
  "difficulty": "intermediate",
  "accessType": "public",
  "price": 99.99,
  "currency": "USD",
  "category": "Programming",
  "tags": ["javascript", "web-development"],
  "learningObjectives": [
    "Master async/await patterns",
    "Understand closures and scope",
    "Build scalable applications"
  ]
}
```

#### Search Courses
```http
GET /api/courses?search=javascript&difficulty=intermediate&page=1&limit=20
Authorization: Bearer <token>
```

#### Publish Course
```http
POST /api/courses/{courseId}/publish
Authorization: Bearer <token>
```

### Assessment Management

#### Create Assessment
```http
POST /api/assessments
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "JavaScript Fundamentals Quiz",
  "type": "quiz",
  "courseId": "course-uuid",
  "questions": [
    {
      "text": "What is the output of console.log(typeof null)?",
      "type": "multiple_choice",
      "points": 10,
      "options": [
        { "text": "null", "isCorrect": false },
        { "text": "object", "isCorrect": true },
        { "text": "undefined", "isCorrect": false }
      ]
    }
  ],
  "timeLimit": 30,
  "maxAttempts": 3,
  "passingScore": 70
}
```

#### Start Assessment Attempt
```http
POST /api/assessments/{assessmentId}/attempts
Authorization: Bearer <token>
Content-Type: application/json

{
  "enrollmentId": "enrollment-uuid"
}
```

#### Submit Assessment Attempt
```http
PUT /api/assessments/attempts/{attemptId}/submit
Authorization: Bearer <token>
Content-Type: application/json

{
  "answers": [
    {
      "questionIndex": 0,
      "answer": 1,
      "timeSpent": 15000
    }
  ],
  "totalTimeSpent": 15000
}
```

### Enrollment Management

#### Enroll in Course
```http
POST /api/enrollments
Authorization: Bearer <token>
Content-Type: application/json

{
  "courseId": "course-uuid",
  "accessCode": "optional-access-code"
}
```

#### Update Lesson Progress
```http
PUT /api/enrollments/{enrollmentId}/progress/lesson/{lessonId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "progressPercentage": 75,
  "timeSpent": 1800,
  "bookmarkPosition": 450
}
```

#### Complete Lesson
```http
POST /api/enrollments/{enrollmentId}/progress/lesson/{lessonId}/complete
Authorization: Bearer <token>
```

### Certificate Management

#### Generate Certificate
```http
POST /api/certificates/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "enrollmentId": "enrollment-uuid",
  "type": "completion"
}
```

#### Verify Certificate
```http
POST /api/certificates/verify
Content-Type: application/json

{
  "certificateNumber": "CERT-2024-001234"
}
```

#### Download Certificate
```http
GET /api/certificates/{certificateId}/download
Authorization: Bearer <token>
```

## Search Integration

### Elasticsearch Configuration

The LMS integrates with Elasticsearch for powerful search capabilities:

```typescript
// Environment variables
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=password
ELASTICSEARCH_INDEX_PREFIX=lms
```

### Search Endpoints

#### Search Courses
```http
GET /api/search/courses?search=javascript&category=programming&difficulty=intermediate
Authorization: Bearer <token>
```

#### Search All Content
```http
GET /api/search/content?query=react hooks&types=course,lesson
Authorization: Bearer <token>
```

#### Get Search Suggestions
```http
GET /api/search/suggestions?query=java
Authorization: Bearer <token>
```

## Content Versioning

### Version Management

The versioning system allows content creators to:

- Create multiple versions of content
- Compare versions
- Restore previous versions
- Manage publishing workflows

#### Create Version
```http
POST /api/versioning/course/{courseId}/versions
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated content with new examples",
  "changeLog": "Added React 18 examples and updated deprecated patterns",
  "tags": ["major-update"]
}
```

#### Publish Version
```http
POST /api/versioning/versions/{versionId}/publish
Authorization: Bearer <token>
Content-Type: application/json

{
  "forcePublish": true,
  "publishNotes": "Ready for production"
}
```

#### Compare Versions
```http
POST /api/versioning/versions/compare
Authorization: Bearer <token>
Content-Type: application/json

{
  "baseVersionId": "version-1-uuid",
  "compareVersionId": "version-2-uuid"
}
```

## Anti-Cheating System

### Proctoring Features

The anti-cheating system provides:

- Browser lockdown
- Tab switching detection
- Copy/paste prevention
- Timing analysis
- Suspicious activity flagging

#### Start Proctored Session
```http
POST /api/anti-cheating/sessions/start
Authorization: Bearer <token>
Content-Type: application/json

{
  "attemptId": "attempt-uuid",
  "browserFingerprint": "fp_abc123",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "screenResolution": "1920x1080",
  "timezone": "America/New_York"
}
```

#### Record Security Violation
```http
POST /api/anti-cheating/sessions/{sessionId}/violations
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "tab_switch",
  "severity": "medium",
  "details": {
    "timestamp": "2024-01-15T10:30:00Z",
    "previousTab": "assessment",
    "newTab": "external"
  }
}
```

#### Get Browser Lockdown Config
```http
GET /api/anti-cheating/assessments/{assessmentId}/lockdown-config
Authorization: Bearer <token>
```

## Testing

### Unit Tests

Run the test suite:

```bash
# Run all LMS tests
npm run test -- --testPathPattern=lms

# Run specific service tests
npm run test -- course-management.service.spec.ts
npm run test -- assessment.service.spec.ts

# Run tests with coverage
npm run test:cov
```

### Test Coverage

The LMS maintains high test coverage across:

- **Services**: 90%+ coverage for all business logic
- **Controllers**: 85%+ coverage for API endpoints
- **Entities**: 95%+ coverage for data models

### Integration Tests

```bash
# Run integration tests
npm run test:e2e -- --testNamePattern="LMS"
```

## Performance Considerations

### Database Optimization

- **Indexing**: Strategic indexes on frequently queried fields
- **Pagination**: All list endpoints support pagination
- **Lazy Loading**: Relations loaded only when needed
- **Query Optimization**: Efficient queries with proper joins

### Caching Strategy

```typescript
// Redis caching for frequently accessed data
@Cacheable('course', 300) // 5 minutes
async getCourseById(id: string): Promise<Course> {
  // Implementation
}
```

### File Storage

- **CDN Integration**: Static assets served via CDN
- **Compression**: Video and image compression
- **Streaming**: Large file streaming support

## Security

### Access Control

- **Role-Based Permissions**: Admin, Instructor, Student roles
- **Course-Level Access**: Public, Private, Restricted courses
- **API Authentication**: JWT-based authentication
- **Rate Limiting**: API rate limiting per user/IP

### Data Protection

- **Input Validation**: Comprehensive DTO validation
- **SQL Injection Prevention**: TypeORM parameterized queries
- **XSS Protection**: Input sanitization
- **CSRF Protection**: CSRF tokens for state-changing operations

## Monitoring and Analytics

### Metrics Collection

The LMS collects comprehensive metrics:

- Course engagement rates
- Assessment performance
- User progress patterns
- System performance metrics

### Health Checks

```http
GET /api/health/lms
```

Returns system health status including:
- Database connectivity
- Elasticsearch status
- File storage availability
- Cache performance

## Deployment

### Environment Configuration

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/lms

# Redis
REDIS_URL=redis://localhost:6379

# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200

# File Storage
AWS_S3_BUCKET=lms-files
AWS_REGION=us-east-1

# Security
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key
```

### Docker Deployment

```yaml
version: '3.8'
services:
  lms-api:
    build: .
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
      - elasticsearch
```

## Future Enhancements

### Planned Features

1. **AI-Powered Recommendations**: Personalized course recommendations
2. **Advanced Analytics**: Machine learning insights
3. **Mobile SDK**: Native mobile app support
4. **Blockchain Certificates**: Immutable certificate verification
5. **Live Streaming**: Real-time virtual classrooms
6. **Gamification**: Badges, leaderboards, achievements

### Scalability Roadmap

1. **Microservices**: Split into domain-specific services
2. **Event Sourcing**: Event-driven architecture
3. **CQRS**: Command Query Responsibility Segregation
4. **Horizontal Scaling**: Multi-instance deployment

## Support and Maintenance

### Logging

Comprehensive logging using structured logging:

```typescript
this.logger.log('Course created', {
  courseId: course.id,
  userId: user.id,
  timestamp: new Date().toISOString(),
});
```

### Error Handling

Centralized error handling with proper HTTP status codes:

```typescript
try {
  // Business logic
} catch (error) {
  this.logger.error('Operation failed', error);
  throw new HttpException(
    error.message || 'Internal server error',
    error.status || HttpStatus.INTERNAL_SERVER_ERROR,
  );
}
```

### Backup and Recovery

- **Database Backups**: Automated daily backups
- **File Backups**: S3 versioning and cross-region replication
- **Disaster Recovery**: RTO < 4 hours, RPO < 1 hour

## Contributing

### Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Run migrations: `npm run migration:run`
5. Start development server: `npm run start:dev`

### Code Standards

- **TypeScript**: Strict mode enabled
- **ESLint**: Airbnb configuration
- **Prettier**: Code formatting
- **Husky**: Pre-commit hooks
- **Conventional Commits**: Commit message format

### Pull Request Process

1. Create feature branch from `develop`
2. Implement changes with tests
3. Update documentation
4. Submit PR with detailed description
5. Code review and approval
6. Merge to `develop`

---

This LMS implementation provides a robust, scalable foundation for online learning platforms with enterprise-grade features and security measures.
