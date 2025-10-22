# 🚀 Quick Start Summary - Run Volkai HR Edu API Locally

## 📋 What You Need

### Required Software
- **Node.js 18+** ([Download](https://nodejs.org/))
- **PostgreSQL 14+** ([Download](https://www.postgresql.org/download/))
- **Redis 7+** ([Download](https://redis.io/download/))
- **Git** (Latest version)

### Optional (Easier Setup)
- **Docker & Docker Compose** ([Download](https://www.docker.com/))

---

## ⚡ Super Quick Start (3 Steps)

### Option 1: Automated Setup (Recommended)
```bash
# 1. Clone and run setup script
git clone <repository-url>
cd volkaiedu
./quick-start.sh

# 2. Start the API
cd backend
npm run start:dev

# 3. Test it works
curl http://localhost:3000/health
```

### Option 2: Docker Setup (Even Easier)
```bash
# 1. Clone repository
git clone <repository-url>
cd volkaiedu

# 2. Start everything with Docker
docker-compose up

# 3. API is ready at http://localhost:3000
```

---

## 🔧 Manual Setup (If Automated Fails)

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Setup Environment
```bash
# Copy environment template
cp .env.example .env.development

# Edit .env.development with your settings:
# - Database connection
# - Redis connection  
# - JWT secrets (generate secure ones)
# - Other configuration
```

### 3. Setup Database
```bash
# Create PostgreSQL user and databases
createuser -s volkai_user
createdb -O volkai_user volkai_hr_edu_dev
createdb -O volkai_user volkai_hr_edu_test

# Set password in psql
psql -U postgres
ALTER USER volkai_user PASSWORD 'your_password';
\q
```

### 4. Setup Application
```bash
# Run migrations and seeds
npm run db:setup

# Start development server
npm run start:dev
```

---

## 🌐 Access Points

Once running, you can access:

- **API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api/docs
- **Health Check**: http://localhost:3000/health
- **Database UI** (if using Docker): http://localhost:8080
- **Redis UI** (if using Docker): http://localhost:8081

---

## 🧪 Test Everything Works

```bash
# Health check
curl http://localhost:3000/health

# Register a test user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "firstName": "Test",
    "lastName": "User"
  }'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'
```

---

## 🚨 Common Issues & Solutions

### Port 3000 Already in Use
```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run start:dev
```

### Database Connection Error
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Check database exists
psql -U volkai_user -d volkai_hr_edu_dev -c "\l"
```

### Redis Connection Error
```bash
# Check Redis is running
redis-cli ping

# Start Redis if not running
redis-server
```

### Environment Issues
```bash
# Validate environment
npm run env:validate

# Check configuration
npm run config:check
```

---

## 📚 Available Scripts

```bash
# Development
npm run start:dev          # Start with hot reload
npm run start:debug        # Start with debug mode

# Database
npm run db:setup           # Run migrations + seeds
npm run db:reset           # Reset database
npm run migration:run      # Run migrations
npm run seed:run           # Run seeds

# Testing
npm run test               # Run all tests
npm run test:unit          # Unit tests only
npm run test:e2e          # End-to-end tests
npm run test:security      # Security tests

# Utilities
npm run lint               # Lint code
npm run format             # Format code
npm run type-check         # TypeScript check
npm run env:validate       # Validate environment
```

---

## 🎯 Next Steps

1. **Explore API Documentation**: http://localhost:3000/api/docs
2. **Check Health Endpoints**: http://localhost:3000/health
3. **View Application Logs**: `tail -f backend/logs/app.log`
4. **Run Tests**: `npm run test:all`
5. **Start Building**: Modify code and see hot reload in action!

---

## 🆘 Need Help?

- **Setup Issues**: Check the detailed [LOCAL_SETUP_GUIDE.md](./LOCAL_SETUP_GUIDE.md)
- **API Documentation**: Visit http://localhost:3000/api/docs when running
- **Troubleshooting**: See the troubleshooting section in the setup guide

---

**🎉 You're ready to develop with the Volkai HR Edu Backend!**
