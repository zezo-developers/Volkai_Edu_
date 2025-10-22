# 🚀 Volkai HR Edu Backend - Local Setup Guide

## 📋 Prerequisites

### Required Software
- **Node.js**: v18.x or higher ([Download](https://nodejs.org/))
- **npm**: v9.x or higher (comes with Node.js)
- **PostgreSQL**: v14.x or higher ([Download](https://www.postgresql.org/download/))
- **Redis**: v7.x or higher ([Download](https://redis.io/download/))
- **Docker**: v20.x or higher (optional, for containerized setup)
- **Git**: Latest version

### System Requirements
- **RAM**: Minimum 8GB (16GB recommended)
- **Storage**: 10GB free space
- **OS**: macOS, Linux, or Windows with WSL2

---

## 🛠️ Installation Steps

### 1. Clone the Repository
```bash
git clone <repository-url>
cd volkaiedu/backend
```

### 2. Install Dependencies
```bash
# Install all dependencies
npm install

# Install global dependencies (if needed)
npm install -g @nestjs/cli
```

### 3. Database Setup

#### PostgreSQL Setup
```bash
# Create database user
createuser -s volkai_user

# Create databases
createdb -O volkai_user volkai_hr_edu_dev
createdb -O volkai_user volkai_hr_edu_test

# Set password for user (in psql)
psql -U postgres
ALTER USER volkai_user PASSWORD 'your_secure_password';
\q
```

#### Redis Setup
```bash
# Start Redis server
redis-server

# Or with Homebrew (macOS)
brew services start redis

# Or with systemctl (Linux)
sudo systemctl start redis
```

### 4. Environment Configuration

Create environment files:

#### `.env.development`
```env
# Application
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Database
DATABASE_URL=postgresql://volkai_user:your_secure_password@localhost:5432/volkai_hr_edu_dev
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=volkai_user
DB_PASSWORD=your_secure_password
DB_DATABASE=volkai_hr_edu_dev
DB_SYNCHRONIZE=true
DB_LOGGING=true

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_key_minimum_32_characters
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your_super_secure_refresh_secret_key_minimum_32_characters
JWT_REFRESH_EXPIRES_IN=7d

# Encryption
ENCRYPTION_KEY=your_32_character_encryption_key_here
KMS_KEY_ID=alias/volkai-dev-encryption-key

# AWS Configuration (for development)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
FROM_EMAIL=noreply@volkai.com

# File Upload
UPLOAD_DEST=./uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf,doc,docx

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_TTL=60
RATE_LIMIT_LIMIT=100

# Frontend URL
FRONTEND_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:3001

# Logging
LOG_LEVEL=debug
LOG_FILE=logs/app.log

# Health Check
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_DATABASE=true
HEALTH_CHECK_REDIS=true

# Performance
CACHE_TTL=3600
QUERY_CACHE_ENABLED=true
COMPRESSION_ENABLED=true
```

#### `.env.test`
```env
# Test Environment
NODE_ENV=test
PORT=3001

# Test Database
DATABASE_URL=postgresql://volkai_user:your_secure_password@localhost:5432/volkai_hr_edu_test
DB_DATABASE=volkai_hr_edu_test
DB_SYNCHRONIZE=true
DB_LOGGING=false

# Test Redis
REDIS_DB=1

# Test JWT
JWT_SECRET=test_jwt_secret_key_for_testing_only
JWT_EXPIRES_IN=1h

# Disable external services in tests
SMTP_HOST=
AWS_ACCESS_KEY_ID=
```

### 5. Database Migration & Seeding

```bash
# Run database migrations
npm run migration:run

# Seed initial data
npm run seed:run

# Or run both with
npm run db:setup
```

### 6. Start the Application

#### Development Mode
```bash
# Start in development mode with hot reload
npm run start:dev

# Or with debug mode
npm run start:debug
```

#### Production Mode (Local)
```bash
# Build the application
npm run build

# Start in production mode
npm run start:prod
```

---

## 🐳 Docker Setup (Alternative)

### Using Docker Compose
```bash
# Start all services (PostgreSQL, Redis, API)
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

### Docker Compose Configuration
Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: volkai_hr_edu_dev
      POSTGRES_USER: volkai_user
      POSTGRES_PASSWORD: your_secure_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
    env_file:
      - .env.development
    depends_on:
      - postgres
      - redis
    volumes:
      - .:/app
      - /app/node_modules

volumes:
  postgres_data:
  redis_data:
```

---

## 🧪 Testing Setup

### Run Tests
```bash
# Unit tests
npm run test

# Integration tests
npm run test:e2e

# Test coverage
npm run test:cov

# Security tests
npm run test:security

# Performance tests
npm run test:performance

# All tests
npm run test:all
```

### Test Database Setup
```bash
# Setup test database
npm run test:db:setup

# Reset test database
npm run test:db:reset
```

---

## 🔧 Development Tools

### Available Scripts
```bash
# Development
npm run start:dev          # Start with hot reload
npm run start:debug        # Start with debug mode
npm run start:prod         # Start in production mode

# Building
npm run build              # Build the application
npm run build:watch        # Build with watch mode

# Database
npm run migration:generate # Generate new migration
npm run migration:run      # Run migrations
npm run migration:revert   # Revert last migration
npm run seed:run           # Run database seeds

# Testing
npm run test               # Unit tests
npm run test:e2e          # End-to-end tests
npm run test:cov          # Test coverage
npm run test:watch        # Tests in watch mode

# Code Quality
npm run lint              # Run ESLint
npm run lint:fix          # Fix ESLint issues
npm run format            # Format code with Prettier
npm run type-check        # TypeScript type checking

# Security
npm run audit             # Security audit
npm run test:security     # Security tests
npm run vulnerability:check # Check for vulnerabilities
```

### IDE Setup (VS Code)
Install recommended extensions:
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",
    "redhat.vscode-yaml"
  ]
}
```

---

## 📊 Monitoring & Debugging

### Health Check Endpoints
```bash
# Basic health check
curl http://localhost:3000/health

# Detailed health check
curl http://localhost:3000/health/detailed

# Database health
curl http://localhost:3000/health/database

# Redis health
curl http://localhost:3000/health/redis
```

### API Documentation
- **Swagger UI**: http://localhost:3000/api/docs
- **OpenAPI JSON**: http://localhost:3000/api/docs-json
- **Redoc**: http://localhost:3000/api/redoc

### Logging
```bash
# View application logs
tail -f logs/app.log

# View error logs
tail -f logs/error.log

# View access logs
tail -f logs/access.log
```

### Performance Monitoring
```bash
# Monitor API performance
curl http://localhost:3000/admin/performance/metrics

# Database performance
curl http://localhost:3000/admin/database/metrics

# Cache performance
curl http://localhost:3000/admin/cache/stats
```

---

## 🔐 Security Configuration

### SSL/TLS Setup (Development)
```bash
# Generate self-signed certificates
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Update .env.development
HTTPS_ENABLED=true
SSL_KEY_PATH=./key.pem
SSL_CERT_PATH=./cert.pem
```

### Authentication Testing
```bash
# Register a test user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "firstName": "Test",
    "lastName": "User"
  }'

# Login and get token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'
```

---

## 🚨 Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check PostgreSQL status
pg_isready -h localhost -p 5432

# Check database exists
psql -U volkai_user -d volkai_hr_edu_dev -c "\l"

# Reset database
npm run db:reset
```

#### Redis Connection Issues
```bash
# Check Redis status
redis-cli ping

# Check Redis configuration
redis-cli config get "*"

# Flush Redis (if needed)
redis-cli flushall
```

#### Port Already in Use
```bash
# Find process using port 3000
lsof -ti:3000

# Kill process
kill -9 $(lsof -ti:3000)

# Or use different port
PORT=3001 npm run start:dev
```

#### Permission Issues
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm

# Fix file permissions
chmod -R 755 ./uploads
```

### Performance Issues
```bash
# Check memory usage
node --max-old-space-size=4096 dist/main.js

# Profile application
npm run start:debug
# Then use Chrome DevTools for profiling
```

### Environment Issues
```bash
# Validate environment
npm run env:validate

# Check configuration
npm run config:check

# Reset environment
cp .env.example .env.development
```

---

## 📚 Additional Resources

### Documentation Links
- [NestJS Documentation](https://docs.nestjs.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)

### Development Guidelines
- [API Design Guidelines](./docs/API_GUIDELINES.md)
- [Security Best Practices](./docs/SECURITY.md)
- [Testing Guidelines](./docs/TESTING.md)
- [Performance Guidelines](./docs/PERFORMANCE.md)

### Support
- **Issues**: Create GitHub issues for bugs
- **Discussions**: Use GitHub discussions for questions
- **Security**: Email security@volkai.com for security issues

---

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] ✅ Application starts without errors
- [ ] ✅ Database connection successful
- [ ] ✅ Redis connection successful
- [ ] ✅ Health check endpoints respond
- [ ] ✅ API documentation accessible
- [ ] ✅ Authentication endpoints work
- [ ] ✅ Tests pass successfully
- [ ] ✅ Hot reload works in development
- [ ] ✅ Logging works properly
- [ ] ✅ Environment variables loaded

---

**🎉 You're ready to develop with the Volkai HR Edu Backend API!**

For any issues or questions, refer to the troubleshooting section or create an issue in the repository.
