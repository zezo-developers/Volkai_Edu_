# Resume Builder Module Documentation

## Overview

The Resume Builder Module is a comprehensive system for creating, managing, and sharing professional resumes. It provides template-based resume creation, skills integration, PDF export, analytics, and sharing capabilities.

## Architecture

### Database Entities

#### Resume Templates (`ResumeTemplate`)
- **Purpose**: Store reusable resume templates with layouts, styles, and components
- **Key Features**:
  - Template versioning and compatibility
  - ATS score calculation
  - Download tracking and ratings
  - Customization options
  - Premium/free categorization

#### User Resumes (`UserResume`)
- **Purpose**: Store individual user resumes with personal data
- **Key Features**:
  - Template-based creation
  - Real-time completion tracking
  - ATS score estimation
  - Analytics and sharing
  - Auto-save functionality

#### Resume Sections (`ResumeSection`)
- **Purpose**: Modular resume sections with customizable content
- **Key Features**:
  - Drag-and-drop ordering
  - Section-specific styling
  - Visibility controls
  - Content validation

#### Skills System
- **SkillCategory**: Organize skills by category
- **Skill**: Master skill database with metadata
- **UserSkill**: User-specific skill proficiency and verification

### Services

#### TemplateManagementService
```typescript
// Create and manage resume templates
await templateService.createTemplate(createDto, user);
await templateService.searchTemplates(searchDto, user);
await templateService.cloneTemplate(id, cloneDto, user);
```

#### ResumeBuilderService
```typescript
// Resume CRUD operations
await resumeService.createResume(createDto, user);
await resumeService.updateResume(id, updateDto, user);
await resumeService.shareResume(id, shareDto, user);
```

#### SkillsIntegrationService
```typescript
// Skills management
await skillsService.addUserSkill(createDto, user);
await skillsService.getSkillRecommendations(userId, user);
await skillsService.verifyUserSkill(id, verificationDto, user);
```

#### PdfExportService
```typescript
// PDF generation and export
await pdfService.exportResumeToPdf(resumeId, exportDto, user);
await pdfService.generateATSOptimizedPdf(resumeId, user);
```

#### ResumeAnalyticsService
```typescript
// Analytics and reporting
await analyticsService.getUserResumeAnalytics(userId, user);
await analyticsService.getResumePerformanceMetrics(resumeId, user);
```

## API Endpoints

### Template Management

#### GET /resume/templates
Search and list resume templates
```typescript
Query Parameters:
- search?: string
- category?: TemplateCategory
- isPremium?: boolean
- page?: number (default: 1)
- limit?: number (default: 20)
```

#### POST /resume/templates
Create a new template (Admin/Instructor only)
```typescript
Body: CreateTemplateDto {
  name: string;
  description?: string;
  category?: TemplateCategory;
  templateData: TemplateDataStructure;
  isPremium?: boolean;
  tags?: string[];
}
```

#### GET /resume/templates/:id
Get template by ID
```typescript
Response: TemplateResponseDto
```

#### PUT /resume/templates/:id
Update template (Admin/Instructor only)

#### DELETE /resume/templates/:id
Delete template (Admin/Instructor only)

#### POST /resume/templates/:id/clone
Clone existing template

#### GET /resume/templates/featured
Get featured templates

#### GET /resume/templates/popular
Get popular templates by download count

#### GET /resume/templates/trending
Get trending templates

### Resume Builder

#### POST /resume/builder
Create a new resume
```typescript
Body: CreateResumeDto {
  title: string;
  templateId?: string;
  isPrimary?: boolean;
  visibility?: ResumeVisibility;
  data?: ResumeDataStructure;
}
```

#### GET /resume/builder
Search resumes with filters

#### GET /resume/builder/my
Get current user's resumes

#### GET /resume/builder/primary
Get user's primary resume

#### GET /resume/builder/:id
Get resume by ID

#### PUT /resume/builder/:id
Update resume with auto-save support

#### DELETE /resume/builder/:id
Delete resume (with primary resume protection)

#### POST /resume/builder/:id/clone
Clone resume

#### POST /resume/builder/:id/share
Share resume with privacy controls
```typescript
Body: ShareResumeDto {
  visibility?: ResumeVisibility;
  expiryDays?: number;
}

Response: {
  shareToken: string;
  shareUrl: string;
}
```

#### PUT /resume/builder/:resumeId/sections/:sectionId
Update specific resume section

#### PUT /resume/builder/:id/sections/reorder
Reorder resume sections
```typescript
Body: ReorderSectionsDto {
  sectionIds: string[];
}
```

#### GET /resume/builder/:id/analytics
Get resume analytics and performance metrics

#### GET /resume/builder/shared/:token
Access shared resume via public token

### Skills Integration

#### GET /resume/skills/categories
Get all skill categories

#### POST /resume/skills/categories
Create skill category (Admin/Instructor only)

#### POST /resume/skills
Create new skill (Admin/Instructor only)

#### GET /resume/skills
Search skills with filters

#### GET /resume/skills/popular
Get popular skills

#### GET /resume/skills/trending
Get trending skills

#### POST /resume/skills/user-skills
Add skill to user profile
```typescript
Body: CreateUserSkillDto {
  skillId: string;
  proficiencyLevel?: SkillProficiency;
  yearsExperience?: number;
  acquisitionMethod?: string;
}
```

#### GET /resume/skills/user-skills/my
Get current user's skills

#### PUT /resume/skills/user-skills/:id
Update user skill

#### DELETE /resume/skills/user-skills/:id
Remove user skill

#### POST /resume/skills/user-skills/:id/verify
Verify user skill (Instructor/Admin only)

#### POST /resume/skills/user-skills/:id/endorse
Endorse another user's skill

#### GET /resume/skills/recommendations/my
Get skill recommendations for current user

### PDF Export

#### POST /resume/export/:id/pdf
Export resume to PDF
```typescript
Body: ExportResumeDto {
  format: 'pdf';
  options?: PdfOptionsDto;
}

Response: ExportResponseDto {
  success: boolean;
  filename: string;
  downloadUrl: string;
  fileSize: number;
}
```

#### POST /resume/export/:id/pdf/ats
Generate ATS-optimized PDF

#### GET /resume/export/:id/preview
Get resume preview data

#### GET /resume/export/download/:filename
Download generated PDF file

### Analytics

#### GET /resume/analytics/overview
Get system-wide resume analytics (Admin/Instructor only)

#### GET /resume/analytics/user/my
Get current user's resume analytics

#### GET /resume/analytics/resume/:resumeId/performance
Get detailed resume performance metrics

#### GET /resume/analytics/skills
Get skill analytics (Admin/Instructor only)

#### GET /resume/analytics/templates
Get template analytics (Admin/Instructor only)

## Advanced Features

### Real-time Auto-save
```typescript
// Auto-save every 30 seconds
@Cron(CronExpression.EVERY_30_SECONDS)
async autoSaveResumes() {
  // Handle pending auto-save operations
}
```

### ATS Optimization
- **Template ATS Scoring**: Automatic calculation based on layout complexity
- **Content Analysis**: Keyword density and formatting recommendations
- **Export Options**: ATS-friendly PDF generation

### Skills Integration with LMS
```typescript
// Sync skills from course completion
await skillsService.syncSkillsFromCourseCompletion(
  userId, 
  courseId, 
  skillIds
);
```

### Advanced Analytics
- **Performance Tracking**: Views, downloads, shares
- **Engagement Metrics**: Time spent, section interactions
- **Benchmarking**: Compare against similar resumes
- **Trend Analysis**: Skill popularity and market demand

### Sharing and Privacy
- **Visibility Levels**: Private, Public, Organization-only, Link-only
- **Share Tokens**: Temporary access with expiration
- **Access Control**: Role-based permissions

## Security Features

### Access Control
```typescript
// Role-based access control
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
async createTemplate() { ... }

// Resource ownership validation
private async validateResumeAccess(resume: UserResume, user: User) {
  const isOwner = resume.userId === user.id;
  const isAdmin = user.role === UserRole.ADMIN;
  // ... access logic
}
```

### Data Protection
- **Input Validation**: Comprehensive DTO validation
- **SQL Injection Prevention**: TypeORM query builders
- **XSS Protection**: Content sanitization
- **File Security**: Secure PDF storage and access

### Privacy Controls
- **Data Anonymization**: Remove PII from analytics
- **Share Token Security**: Cryptographically secure tokens
- **Access Logging**: Track resume access and modifications

## Performance Optimizations

### Database Optimization
```sql
-- Optimized indexes
CREATE INDEX idx_resumes_user_primary ON user_resumes(user_id, is_primary);
CREATE INDEX idx_templates_category_active ON resume_templates(category, is_active);
CREATE INDEX idx_skills_popularity ON skills(popularity_score DESC);
```

### Caching Strategy
```typescript
// Redis caching for frequently accessed data
@Cacheable('popular-templates', 300) // 5 minutes
async getPopularTemplates() { ... }

@Cacheable('skill-recommendations', 1800) // 30 minutes  
async getSkillRecommendations() { ... }
```

### Async Processing
```typescript
// Background PDF generation
@Queue('pdf-generation')
async generatePDF(job: Job<PdfGenerationData>) {
  // Process PDF generation asynchronously
}
```

## Testing

### Unit Tests
```typescript
describe('ResumeBuilderService', () => {
  it('should create resume successfully', async () => {
    // Test resume creation
  });
  
  it('should handle access control', async () => {
    // Test permission validation
  });
  
  it('should validate resume data', async () => {
    // Test data validation
  });
});
```

### Integration Tests
```typescript
describe('Resume API Integration', () => {
  it('should complete full resume workflow', async () => {
    // Test end-to-end resume creation and sharing
  });
});
```

### Test Coverage
- **Services**: 90%+ coverage for business logic
- **Controllers**: API endpoint testing
- **Entities**: Validation and relationship testing
- **Integration**: End-to-end workflow testing

## Deployment Considerations

### Environment Variables
```env
# PDF Generation
UPLOADS_PATH=/app/uploads/resumes
PDF_GENERATION_TIMEOUT=30000

# External Services
AI_SERVICE_URL=https://api.ai-service.com
AI_SERVICE_API_KEY=your-api-key

# File Storage
AWS_S3_BUCKET=resume-storage
AWS_REGION=us-east-1
```

### Scaling
- **Horizontal Scaling**: Stateless service design
- **Database Sharding**: User-based partitioning
- **CDN Integration**: Static asset delivery
- **Load Balancing**: Multi-instance deployment

### Monitoring
```typescript
// Performance monitoring
@Monitor('resume-creation-time')
async createResume() { ... }

// Error tracking
@ErrorHandler('resume-pdf-generation')
async generatePDF() { ... }
```

## Future Enhancements

### Planned Features
1. **AI-Powered Content Suggestions**
   - Automatic content generation
   - Industry-specific recommendations
   - Grammar and style checking

2. **Advanced Template Editor**
   - Visual drag-and-drop builder
   - Custom component library
   - Real-time preview

3. **Integration Enhancements**
   - LinkedIn profile import
   - GitHub project sync
   - Job board integration

4. **Mobile Optimization**
   - Mobile-responsive templates
   - Mobile app support
   - Offline editing capabilities

5. **Collaboration Features**
   - Peer review system
   - Mentor feedback integration
   - Team resume management

### Technical Improvements
- **GraphQL API**: More flexible data fetching
- **WebSocket Integration**: Real-time collaboration
- **Machine Learning**: Personalized recommendations
- **Blockchain**: Skill verification and credentials

## Troubleshooting

### Common Issues

#### PDF Generation Failures
```typescript
// Check PDF service logs
logger.error('PDF generation failed', { 
  resumeId, 
  error: error.message,
  stack: error.stack 
});

// Fallback to simple PDF format
if (complexPdfFailed) {
  return await generateSimplePDF(resume);
}
```

#### Performance Issues
```typescript
// Monitor slow queries
@Monitor('database-query-time')
async searchResumes() { ... }

// Implement query optimization
const optimizedQuery = queryBuilder
  .select(['resume.id', 'resume.title']) // Select only needed fields
  .limit(20); // Limit results
```

#### Memory Management
```typescript
// Stream large files
async downloadPDF(filename: string): Promise<StreamableFile> {
  const stream = fs.createReadStream(filepath);
  return new StreamableFile(stream);
}
```

### Debug Mode
```typescript
// Enable detailed logging
if (process.env.NODE_ENV === 'development') {
  logger.debug('Resume creation details', {
    userId: user.id,
    templateId: createDto.templateId,
    sections: sections.length
  });
}
```

## Support and Maintenance

### Regular Maintenance Tasks
1. **Database Cleanup**: Remove expired share tokens
2. **File Management**: Clean up old PDF files
3. **Analytics Aggregation**: Process usage statistics
4. **Performance Monitoring**: Track and optimize slow queries

### Backup Strategy
- **Database Backups**: Daily automated backups
- **File Storage**: Replicated across multiple regions
- **Configuration**: Version-controlled infrastructure

### Update Procedures
1. **Schema Migrations**: Automated database updates
2. **Service Deployment**: Blue-green deployment strategy
3. **Rollback Plan**: Quick rollback procedures
4. **Testing**: Comprehensive pre-deployment testing

---

For additional support or questions, please refer to the main project documentation or contact the development team.
