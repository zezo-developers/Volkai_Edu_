# Volkai HR Edu Backend - Deployment Guide

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Database Setup](#database-setup)
- [Redis Setup](#redis-setup)
- [Application Configuration](#application-configuration)
- [Docker Deployment](#docker-deployment)
- [Production Deployment](#production-deployment)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)

## 🔧 Prerequisites

### System Requirements

- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0 or **yarn**: >= 1.22.0
- **PostgreSQL**: >= 14.0
- **Redis**: >= 6.0
- **Docker**: >= 20.10.0 (for containerized deployment)
- **Docker Compose**: >= 2.0.0

### Development Tools

- **Git**: For version control
- **PM2**: For process management (production)
- **Nginx**: For reverse proxy (production)
- **SSL Certificate**: For HTTPS (production)

## 🌍 Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/volkai-hr-edu.git
cd volkai-hr-edu/backend
```

### 2. Install Dependencies

```bash
# Using npm
npm install

# Using yarn
yarn install
```

### 3. Environment Variables

Create environment files for different stages:

#### `.env.development`
```env
# Application
NODE_ENV=development
PORT=3000
API_PREFIX=api/v1

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=volkai_dev
DB_PASSWORD=dev_password
DB_DATABASE=volkai_hr_edu_dev
DB_SYNCHRONIZE=true
DB_LOGGING=true

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT
JWT_SECRET=your-super-secret-jwt-key-development
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key-development
JWT_REFRESH_EXPIRES_IN=7d

# Email
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@volkai.dev
EMAIL_FROM_NAME=Volkai HR Edu Dev

# AWS S3
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=volkai-hr-edu-dev-files

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Stripe
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Razorpay
RAZORPAY_KEY_ID=rzp_test_your-key-id
RAZORPAY_KEY_SECRET=your-razorpay-secret

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# Monitoring
SENTRY_DSN=your-sentry-dsn
```

#### `.env.production`
```env
# Application
NODE_ENV=production
PORT=3000
API_PREFIX=api/v1
DOMAIN=api.volkai.com

# Database (Use connection pooling in production)
DB_HOST=your-production-db-host
DB_PORT=5432
DB_USERNAME=volkai_prod
DB_PASSWORD=super-secure-production-password
DB_DATABASE=volkai_hr_edu_prod
DB_SYNCHRONIZE=false
DB_LOGGING=false
DB_SSL=true

# Redis Cluster
REDIS_HOST=your-redis-cluster-host
REDIS_PORT=6379
REDIS_PASSWORD=redis-cluster-password
REDIS_DB=0

# JWT (Use strong secrets in production)
JWT_SECRET=your-ultra-secure-jwt-secret-256-bits-minimum
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-ultra-secure-refresh-secret-256-bits-minimum
JWT_REFRESH_EXPIRES_IN=7d

# Email (Production SMTP)
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your-production-sendgrid-key
EMAIL_FROM=noreply@volkai.com
EMAIL_FROM_NAME=Volkai HR Edu

# AWS S3 (Production bucket)
AWS_ACCESS_KEY_ID=your-production-aws-key
AWS_SECRET_ACCESS_KEY=your-production-aws-secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=volkai-hr-edu-prod-files

# OAuth (Production credentials)
GOOGLE_CLIENT_ID=your-production-google-client-id
GOOGLE_CLIENT_SECRET=your-production-google-client-secret

# Stripe (Production keys)
STRIPE_SECRET_KEY=sk_live_your-stripe-live-key
STRIPE_WEBHOOK_SECRET=whsec_your-production-webhook-secret

# Razorpay (Production keys)
RAZORPAY_KEY_ID=rzp_live_your-live-key-id
RAZORPAY_KEY_SECRET=your-production-razorpay-secret

# Rate Limiting (More restrictive in production)
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=1000

# Security
ENCRYPTION_KEY=your-256-bit-encryption-key
CORS_ORIGIN=https://volkai.com,https://app.volkai.com

# Monitoring
SENTRY_DSN=your-production-sentry-dsn
NEW_RELIC_LICENSE_KEY=your-newrelic-key
```

## 🗄️ Database Setup

### PostgreSQL Installation

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### macOS
```bash
brew install postgresql
brew services start postgresql
```

#### Docker
```bash
docker run --name volkai-postgres \
  -e POSTGRES_DB=volkai_hr_edu \
  -e POSTGRES_USER=volkai_user \
  -e POSTGRES_PASSWORD=secure_password \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  -d postgres:14
```

### Database Configuration

1. **Create Database User**
```sql
CREATE USER volkai_user WITH PASSWORD 'secure_password';
CREATE DATABASE volkai_hr_edu OWNER volkai_user;
GRANT ALL PRIVILEGES ON DATABASE volkai_hr_edu TO volkai_user;
```

2. **Run Migrations**
```bash
npm run migration:run
```

3. **Seed Initial Data** (Optional)
```bash
npm run seed
```

## 🔴 Redis Setup

### Redis Installation

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

#### macOS
```bash
brew install redis
brew services start redis
```

#### Docker
```bash
docker run --name volkai-redis \
  -p 6379:6379 \
  -v redis_data:/data \
  -d redis:7-alpine redis-server --appendonly yes
```

### Redis Configuration

Create `/etc/redis/redis.conf`:
```conf
# Network
bind 127.0.0.1
port 6379
timeout 0

# Security
requirepass your-redis-password

# Persistence
save 900 1
save 300 10
save 60 10000

# Memory
maxmemory 2gb
maxmemory-policy allkeys-lru

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log
```

## 🐳 Docker Deployment

### Docker Compose Setup

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    depends_on:
      - postgres
      - redis
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    networks:
      - volkai-network

  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: volkai_hr_edu
      POSTGRES_USER: volkai_user
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    restart: unless-stopped
    networks:
      - volkai-network

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass redis_password --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped
    networks:
      - volkai-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped
    networks:
      - volkai-network

volumes:
  postgres_data:
  redis_data:

networks:
  volkai-network:
    driver: bridge
```

### Build and Deploy

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f app

# Scale application
docker-compose up -d --scale app=3

# Update application
docker-compose pull
docker-compose up -d --force-recreate
```

## 🚀 Production Deployment

### 1. Server Setup

#### System Updates
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install curl wget git build-essential
```

#### Node.js Installation
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### PM2 Installation
```bash
sudo npm install -g pm2
```

### 2. Application Deployment

#### Clone and Setup
```bash
git clone https://github.com/your-org/volkai-hr-edu.git
cd volkai-hr-edu/backend
npm ci --only=production
npm run build
```

#### PM2 Configuration

Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'volkai-hr-edu-api',
    script: 'dist/main.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_file: '.env.production',
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm Z',
    merge_logs: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

#### Start Application
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 3. Nginx Configuration

Create `/etc/nginx/sites-available/volkai-api`:
```nginx
upstream volkai_backend {
    server 127.0.0.1:3000;
    # Add more servers for load balancing
    # server 127.0.0.1:3001;
    # server 127.0.0.1:3002;
}

server {
    listen 80;
    server_name api.volkai.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.volkai.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.volkai.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.volkai.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload";

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # Client Settings
    client_max_body_size 50M;
    client_body_timeout 60s;
    client_header_timeout 60s;

    location / {
        proxy_pass http://volkai_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Health Check Endpoint
    location /health {
        access_log off;
        proxy_pass http://volkai_backend;
    }

    # Static Files (if serving any)
    location /static/ {
        alias /var/www/volkai/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/volkai-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.volkai.com
sudo systemctl enable certbot.timer
```

### 5. Firewall Configuration

```bash
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## 📊 Monitoring & Maintenance

### 1. Log Management

#### Logrotate Configuration
Create `/etc/logrotate.d/volkai-api`:
```
/home/deploy/volkai-hr-edu/backend/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 deploy deploy
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 2. Monitoring Setup

#### System Monitoring
```bash
# Install monitoring tools
sudo apt install htop iotop nethogs

# Monitor PM2 processes
pm2 monit

# Monitor system resources
htop
```

#### Application Monitoring
```bash
# PM2 monitoring
pm2 list
pm2 logs
pm2 show volkai-hr-edu-api

# Database monitoring
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"

# Redis monitoring
redis-cli info
redis-cli monitor
```

### 3. Backup Strategy

#### Database Backup Script
Create `scripts/backup-db.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="volkai_hr_edu"

mkdir -p $BACKUP_DIR

# Create backup
pg_dump -h localhost -U volkai_user $DB_NAME | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: backup_$DATE.sql.gz"
```

#### Automated Backups
```bash
# Add to crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * /home/deploy/scripts/backup-db.sh
```

### 4. Health Checks

#### Application Health Check
```bash
#!/bin/bash
HEALTH_URL="https://api.volkai.com/api/v1/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $RESPONSE -eq 200 ]; then
    echo "Application is healthy"
    exit 0
else
    echo "Application health check failed: HTTP $RESPONSE"
    # Restart application
    pm2 restart volkai-hr-edu-api
    exit 1
fi
```

### 5. Performance Optimization

#### Database Optimization
```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'user@example.com';

-- Update table statistics
ANALYZE;

-- Vacuum tables
VACUUM ANALYZE;
```

#### Redis Optimization
```bash
# Monitor Redis performance
redis-cli --latency
redis-cli --stat

# Optimize memory usage
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Application Won't Start
```bash
# Check logs
pm2 logs volkai-hr-edu-api

# Check environment variables
pm2 env 0

# Restart application
pm2 restart volkai-hr-edu-api
```

#### 2. Database Connection Issues
```bash
# Test database connection
psql -h localhost -U volkai_user -d volkai_hr_edu

# Check database logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

#### 3. Redis Connection Issues
```bash
# Test Redis connection
redis-cli ping

# Check Redis logs
sudo tail -f /var/log/redis/redis-server.log
```

#### 4. High Memory Usage
```bash
# Check memory usage
free -h
pm2 show volkai-hr-edu-api

# Restart if needed
pm2 restart volkai-hr-edu-api
```

#### 5. SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate
sudo certbot renew --dry-run
```

### Performance Issues

#### 1. Slow Database Queries
```sql
-- Find slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Add indexes for slow queries
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
```

#### 2. High CPU Usage
```bash
# Identify CPU-intensive processes
top -p $(pgrep -d',' node)

# Scale application
pm2 scale volkai-hr-edu-api +2
```

#### 3. Memory Leaks
```bash
# Monitor memory usage over time
pm2 monit

# Restart application periodically
pm2 restart volkai-hr-edu-api --cron-restart="0 4 * * *"
```

## 📚 Additional Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Docker Documentation](https://docs.docker.com/)

## 🆘 Support

For deployment issues or questions:
- **Email**: devops@volkai.com
- **Slack**: #deployment-support
- **Documentation**: https://docs.volkai.com/deployment
- **Status Page**: https://status.volkai.com
