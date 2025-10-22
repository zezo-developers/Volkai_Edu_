#!/bin/bash

# Volkai HR Edu Backend - Quick Start Script
# This script sets up the development environment quickly

set -e

echo "🚀 Volkai HR Edu Backend - Quick Start Setup"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_requirements() {
    print_status "Checking system requirements..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18 or higher is required. Current version: $(node -v)"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm."
        exit 1
    fi
    
    # Check Docker (optional)
    if command -v docker &> /dev/null; then
        print_success "Docker found - you can use Docker setup"
        DOCKER_AVAILABLE=true
    else
        print_warning "Docker not found - will use local setup"
        DOCKER_AVAILABLE=false
    fi
    
    # Check PostgreSQL (if not using Docker)
    if [ "$DOCKER_AVAILABLE" = false ]; then
        if ! command -v psql &> /dev/null; then
            print_error "PostgreSQL is not installed. Please install PostgreSQL 14+ or use Docker setup."
            exit 1
        fi
        
        if ! command -v redis-server &> /dev/null; then
            print_error "Redis is not installed. Please install Redis 7+ or use Docker setup."
            exit 1
        fi
    fi
    
    print_success "All requirements met!"
}

# Setup environment files
setup_environment() {
    print_status "Setting up environment configuration..."
    
    cd backend
    
    if [ ! -f .env.development ]; then
        print_status "Creating .env.development from template..."
        cp .env.example .env.development
        
        # Generate secure secrets
        JWT_SECRET=$(openssl rand -base64 32)
        REFRESH_SECRET=$(openssl rand -base64 32)
        ENCRYPTION_KEY=$(openssl rand -base64 32 | cut -c1-32)
        
        # Update secrets in .env.development
        sed -i.bak "s/your_super_secure_jwt_secret_key_minimum_32_characters/$JWT_SECRET/" .env.development
        sed -i.bak "s/your_super_secure_refresh_secret_key_minimum_32_characters/$REFRESH_SECRET/" .env.development
        sed -i.bak "s/your_32_character_encryption_key_here/$ENCRYPTION_KEY/" .env.development
        
        # Clean up backup files
        rm -f .env.development.bak
        
        print_success "Environment file created with secure secrets"
    else
        print_warning ".env.development already exists, skipping..."
    fi
    
    if [ ! -f .env.test ]; then
        print_status "Creating .env.test from template..."
        cp .env.example .env.test
        
        # Update for test environment
        sed -i.bak 's/volkai_hr_edu_dev/volkai_hr_edu_test/' .env.test
        sed -i.bak 's/REDIS_DB=0/REDIS_DB=1/' .env.test
        sed -i.bak 's/NODE_ENV=development/NODE_ENV=test/' .env.test
        
        rm -f .env.test.bak
        
        print_success "Test environment file created"
    fi
    
    cd ..
}

# Docker setup
setup_docker() {
    print_status "Setting up Docker environment..."
    
    # Check if Docker Compose is available
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    elif docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        print_error "Docker Compose not found"
        exit 1
    fi
    
    print_status "Starting services with Docker Compose..."
    $COMPOSE_CMD up -d postgres redis
    
    print_status "Waiting for services to be ready..."
    sleep 10
    
    # Wait for PostgreSQL to be ready
    print_status "Waiting for PostgreSQL to be ready..."
    until $COMPOSE_CMD exec postgres pg_isready -U volkai_user -d volkai_hr_edu_dev; do
        sleep 2
    done
    
    # Wait for Redis to be ready
    print_status "Waiting for Redis to be ready..."
    until $COMPOSE_CMD exec redis redis-cli ping; do
        sleep 2
    done
    
    print_success "Docker services are ready!"
}

# Local setup (without Docker)
setup_local() {
    print_status "Setting up local environment..."
    
    # Start PostgreSQL and Redis
    print_status "Please ensure PostgreSQL and Redis are running..."
    
    # Create databases
    print_status "Creating databases..."
    
    # Check if user exists, create if not
    if ! psql -U postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='volkai_user'" | grep -q 1; then
        print_status "Creating database user..."
        psql -U postgres -c "CREATE USER volkai_user WITH PASSWORD 'volkai_password';"
        psql -U postgres -c "ALTER USER volkai_user CREATEDB;"
    fi
    
    # Create databases
    psql -U postgres -c "DROP DATABASE IF EXISTS volkai_hr_edu_dev;" 2>/dev/null || true
    psql -U postgres -c "DROP DATABASE IF EXISTS volkai_hr_edu_test;" 2>/dev/null || true
    psql -U postgres -c "CREATE DATABASE volkai_hr_edu_dev OWNER volkai_user;"
    psql -U postgres -c "CREATE DATABASE volkai_hr_edu_test OWNER volkai_user;"
    
    print_success "Databases created successfully!"
}

# Install dependencies and setup application
setup_application() {
    print_status "Setting up application..."
    
    cd backend
    
    # Install dependencies
    print_status "Installing dependencies..."
    npm install
    
    # Create necessary directories
    mkdir -p uploads logs
    
    # Run database migrations
    print_status "Running database migrations..."
    npm run migration:run
    
    # Run database seeds
    print_status "Seeding database with initial data..."
    npm run seed:run
    
    print_success "Application setup complete!"
    
    cd ..
}

# Run tests
run_tests() {
    print_status "Running tests to verify setup..."
    
    cd backend
    
    # Run unit tests
    print_status "Running unit tests..."
    npm run test:unit
    
    # Setup test database
    print_status "Setting up test database..."
    npm run test:db:setup
    
    print_success "Tests completed successfully!"
    
    cd ..
}

# Main setup function
main() {
    echo
    print_status "Starting Volkai HR Edu Backend setup..."
    echo
    
    # Ask user for setup preference
    if [ "$DOCKER_AVAILABLE" = true ]; then
        echo "Choose setup method:"
        echo "1) Docker (Recommended - includes PostgreSQL and Redis)"
        echo "2) Local (Requires PostgreSQL and Redis installed locally)"
        echo
        read -p "Enter your choice (1 or 2): " choice
        
        case $choice in
            1)
                USE_DOCKER=true
                ;;
            2)
                USE_DOCKER=false
                ;;
            *)
                print_error "Invalid choice. Please run the script again."
                exit 1
                ;;
        esac
    else
        USE_DOCKER=false
    fi
    
    # Run setup steps
    check_requirements
    setup_environment
    
    if [ "$USE_DOCKER" = true ]; then
        setup_docker
    else
        setup_local
    fi
    
    setup_application
    run_tests
    
    # Final instructions
    echo
    print_success "🎉 Setup completed successfully!"
    echo
    echo "Next steps:"
    echo "==========="
    echo
    if [ "$USE_DOCKER" = true ]; then
        echo "1. Start the API server:"
        echo "   cd backend && npm run start:dev"
        echo
        echo "2. Or start everything with Docker:"
        echo "   docker-compose up"
        echo
        echo "3. Access services:"
        echo "   - API: http://localhost:3000"
        echo "   - API Docs: http://localhost:3000/api/docs"
        echo "   - Database UI: http://localhost:8080 (Adminer)"
        echo "   - Redis UI: http://localhost:8081 (Redis Commander)"
    else
        echo "1. Start the API server:"
        echo "   cd backend && npm run start:dev"
        echo
        echo "2. Access the API:"
        echo "   - API: http://localhost:3000"
        echo "   - API Docs: http://localhost:3000/api/docs"
        echo "   - Health Check: http://localhost:3000/health"
    fi
    echo
    echo "4. Test the API:"
    echo "   curl http://localhost:3000/health"
    echo
    echo "5. View logs:"
    echo "   tail -f backend/logs/app.log"
    echo
    print_success "Happy coding! 🚀"
}

# Run main function
main "$@"
