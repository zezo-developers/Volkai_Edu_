# Volkai HR Edu Backend

A comprehensive HR and Education platform backend built with NestJS, featuring Learning Management System (LMS), Human Resources/ATS, Mock Interview system, Resume Builder, Webhooks & Integrations, and advanced Performance & Security features.

## 🚀 Features

### 🎓 Learning Management System (LMS)
- **Course Management**: Create, organize, and publish courses with multimedia content
- **Interactive Lessons**: Rich content delivery with progress tracking
- **Assessments & Quizzes**: Comprehensive testing with automated grading
- **Certificates**: Automated certificate generation upon course completion
- **Analytics**: Detailed learning analytics and progress reports

### 👥 Human Resources & ATS
- **Job Management**: Complete job posting and application lifecycle
- **Candidate Tracking**: Advanced applicant tracking system
- **Interview Scheduling**: Automated interview coordination
- **Application Pipeline**: Customizable hiring workflows
- **Team Management**: Organization and team structure management

### 🎤 Mock Interview System
- **AI-Powered Interviews**: Intelligent mock interview sessions
- **Real-time Feedback**: Instant performance analysis and scoring
- **Question Banks**: Comprehensive interview question libraries
- **Performance Analytics**: Detailed interview performance metrics
- **Custom Scenarios**: Industry-specific interview simulations

### 📄 Resume Builder
- **Professional Templates**: Multiple resume layouts and designs
- **Dynamic Generation**: Real-time resume building and editing
- **PDF Export**: High-quality PDF generation
- **Skills Tracking**: Comprehensive skills and experience management
- **ATS Optimization**: Resume optimization for applicant tracking systems

### 🔗 Webhooks & Integrations
- **Event-Driven Webhooks**: Real-time event notifications with retry logic
- **Third-Party Integrations**: Calendar, video conferencing, social login
- **API Key Management**: Comprehensive API access control
- **Job Board Syndication**: Automated job posting to multiple platforms
- **OAuth Integration**: Secure third-party authentication

### 🛡️ Performance & Security
- **Advanced Security**: Threat detection, DDoS protection, input sanitization
- **Performance Monitoring**: Real-time system and application metrics
- **Database Optimization**: Automated query optimization and indexing
- **Caching Strategy**: Multi-layer caching with intelligent invalidation
- **Backup & Recovery**: Automated backup and disaster recovery systems

### 💳 Billing & Subscriptions
- **Payment Processing**: Stripe and Razorpay integration
- **Subscription Management**: Flexible subscription plans and billing
- **Usage Analytics**: Detailed usage tracking and reporting
- **Invoice Generation**: Automated invoicing and payment tracking

### 📊 Analytics & Monitoring
- **Real-time Dashboards**: Comprehensive system and business analytics
- **Performance Metrics**: Application and infrastructure monitoring
- **User Analytics**: Detailed user behavior and engagement tracking
- **Security Monitoring**: Advanced threat detection and alerting

## 🛠️ Tech Stack

### Core Technologies
- **Framework**: NestJS (Node.js/TypeScript)
- **Database**: PostgreSQL with TypeORM
- **Cache**: Redis with advanced caching strategies
- **Queue**: Bull (Redis-based job queues)
- **Authentication**: JWT with Passport and RBAC

### Security & Performance
- **Security**: Helmet, CORS, Rate limiting, Input validation
- **Monitoring**: Winston logging, Performance metrics, Health checks
- **Testing**: Jest (Unit, Integration, E2E tests)
- **Documentation**: Swagger/OpenAPI with comprehensive API docs

### Integrations
- **File Storage**: AWS S3 with CDN
- **Email**: SendGrid with template management
- **Payments**: Stripe and Razorpay
- **Calendar**: Google Calendar, Outlook integration
- **Video**: Zoom, Microsoft Teams integration
- **Social**: OAuth providers (Google, LinkedIn, GitHub)

## 📋 Prerequisites

- **Node.js**: >= 18.0.0
- **PostgreSQL**: >= 14.0
- **Redis**: >= 6.0
- **npm**: >= 8.0.0 or **yarn**: >= 1.22.0
- **Docker**: >= 20.10.0 (optional, for containerized deployment)

## 🚀 Quick Start

### 1. Clone and Setup
```bash
git clone https://github.com/your-org/volkai-hr-edu.git
cd volkai-hr-edu/backend
npm install
```

### 2. Environment Configuration
```bash
cp .env.example .env
# Configure your environment variables
```

### 3. Database Setup
```bash
# Create database
createdb volkai_hr_edu

# Run migrations
npm run migration:run

# Seed initial data (optional)
npm run seed
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `development` | No |
| `PORT` | Server port | `3000` | No |
| `DB_HOST` | PostgreSQL host | `localhost` | Yes |
| `DB_PORT` | PostgreSQL port | `5432` | No |
| `DB_USERNAME` | Database username | `volkai_user` | Yes |
| `DB_PASSWORD` | Database password | - | Yes |
| `DB_DATABASE` | Database name | `volkai_hr_edu` | Yes |
| `REDIS_HOST` | Redis host | `localhost` | Yes |
| `REDIS_PORT` | Redis port | `6379` | No |
| `JWT_SECRET` | JWT secret key | - | Yes |
| `JWT_REFRESH_SECRET` | JWT refresh secret | - | Yes |
| `SENDGRID_API_KEY` | SendGrid API key | - | Yes* |
| `EMAIL_FROM` | From email address | `noreply@volkaihr.com` | No |
| `FRONTEND_URL` | Frontend URL | `http://localhost:3001` | No |

*Required for email functionality

## 📚 API Documentation

Once the server is running, visit:
- **Swagger UI**: `http://localhost:3000/api/v1/docs`
- **Health Check**: `http://localhost:3000/api/v1/health`

### API Endpoints Overview

#### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - User logout
- `POST /auth/password/forgot` - Request password reset
- `POST /auth/password/reset` - Reset password
- `POST /auth/verify-email` - Verify email address
- `GET /auth/me` - Get current user profile

#### Users
- `GET /users` - Get organization users
- `GET /users/:id` - Get user by ID
- `PATCH /users/:id` - Update user profile
- `DELETE /users/:id` - Deactivate user
- `POST /users/:id/reactivate` - Reactivate user

#### Organizations
- `GET /orgs` - Get user's organizations
- `POST /orgs` - Create organization
- `GET /orgs/:id` - Get organization details
- `PATCH /orgs/:id` - Update organization
- `DELETE /orgs/:id` - Delete organization
- `GET /orgs/:id/members` - Get organization members
- `POST /orgs/:id/members` - Invite member
- `PATCH /orgs/:id/members/:userId` - Update member
- `DELETE /orgs/:id/members/:userId` - Remove member

#### Health & Monitoring
- `GET /health` - System health check
- `GET /ready` - Readiness check
- `GET /version` - Version information

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run integration tests
npm run test:e2e

# Run tests with coverage
npm run test:cov

# Run tests in watch mode
npm run test:watch
```

## 🚀 Deployment

### Production Deployment

1. **Build Docker Image**
```bash
docker build -t volkai-backend .
```

2. **Deploy with Docker Compose**
```bash
# Update docker-compose.yml with production values
docker-compose -f docker-compose.prod.yml up -d
```

3. **Run Migrations**
```bash
docker-compose exec api npm run migration:run
docker-compose exec api npm run seed:run
```

### CI/CD Pipeline

The project includes a complete GitHub Actions workflow:
- Automated testing and code quality checks
- Security scanning with Snyk
- Docker image building and pushing
- Automated deployment to staging/production
- Database migrations
- Slack notifications

## 🔒 Security Features

- **JWT Authentication** with secure refresh token rotation
- **RBAC System** with granular permissions
- **Rate Limiting** to prevent abuse
- **Input Validation** with comprehensive sanitization
- **SQL Injection Protection** via TypeORM
- **CORS Configuration** with whitelist support
- **Security Headers** via Helmet
- **Audit Logging** for all sensitive operations
- **Password Hashing** with bcrypt (configurable rounds)

## 📊 Performance Features

- **Database Connection Pooling** (5-20 connections)
- **Redis Caching** for frequently accessed data
- **Query Optimization** with proper indexing
- **Async Operations** throughout the application
- **Compression** for response payloads
- **CDN Integration** for static assets
- **Background Job Processing** with Bull queues

## 🏗️ Architecture

### Clean Architecture
- **Domain Layer** - Entities and business logic
- **Application Layer** - Use cases and services
- **Infrastructure Layer** - Database, external services
- **Presentation Layer** - Controllers and DTOs

### Design Patterns
- **Dependency Injection** for loose coupling
- **Repository Pattern** for data access
- **Factory Pattern** for object creation
- **Observer Pattern** for event handling
- **Strategy Pattern** for configurable behaviors

## 📝 Database Schema

The application uses PostgreSQL with the following core entities:
- **Users** - User accounts and profiles
- **Organizations** - Multi-tenant organization structure
- **OrganizationMemberships** - User-organization relationships with roles
- **Roles & Permissions** - RBAC system
- **AuditLogs** - Comprehensive audit trail

## 🔄 Development Workflow

1. **Feature Development**
```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and test
npm run test
npm run lint

# Commit with conventional commits
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/new-feature
```

2. **Code Quality**
- ESLint for code linting
- Prettier for code formatting
- Husky for pre-commit hooks
- Conventional commits for changelog generation

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Verify PostgreSQL is running
   - Check database credentials in `.env`
   - Ensure database exists

2. **Redis Connection Failed**
   - Verify Redis is running
   - Check Redis configuration in `.env`

3. **Email Not Sending**
   - Verify SENDGRID_API_KEY is set
   - Check SendGrid account status
   - Verify sender email is authenticated

4. **JWT Token Issues**
   - Ensure JWT_SECRET and JWT_REFRESH_SECRET are set
   - Check token expiration times
   - Verify clock synchronization

### Logs

Application logs are structured JSON format:
```bash
# View logs in development
npm run start:dev

# View Docker logs
docker-compose logs -f api

# View specific service logs
docker-compose logs postgres
docker-compose logs redis
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the API documentation at `/api/v1/docs`

---

**Built with ❤️ by the Volkai Team**
