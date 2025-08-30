# 🐳 SmartTweet - Docker Deployment Kılavuzu

Bu kılavuz, SmartTweet uygulamasını Docker container'ları içinde nasıl çalıştıracağınızı açıklar.

## 📋 Ön Gereksinimler

- Docker 20.0+
- Docker Compose 2.0+
- Git
- Minimum 2GB RAM
- Minimum 5GB disk alanı

## 🏗️ Container Mimarisi

```text
┌─────────────────────────────────────────────────────────────┐
│                        Docker Host                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Frontend      │  │    Backend      │  │   Database   │ │
│  │   Container     │  │   Container     │  │   Volume     │ │
│  │   (nginx)       │  │   (node:18)     │  │   (sqlite)   │ │
│  │   Port 80/443   │  │   Port 3001     │  │              │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
│           │                     │                   │       │
│           └──────── Network ────┴───────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

## 📁 1. Docker Dosyaları Oluşturma

### 1.1 Backend Dockerfile

`server/Dockerfile` oluşturun:

```dockerfile
# Node.js 18 base image
FROM node:18-alpine

# Çalışma dizini oluştur
WORKDIR /app

# Package files kopyala
COPY package*.json ./

# Dependencies yükle
RUN npm ci --only=production && npm cache clean --force

# Uygulama kodunu kopyala
COPY . .

# SQLite için gerekli dizin izinleri
RUN mkdir -p /app/data && chown -R node:node /app

# Node user ile çalıştır (security)
USER node

# Port expose et
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/auth-status', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Uygulamayı başlat
CMD ["node", "index.js"]
```

### 1.2 Frontend Dockerfile

`frontend/Dockerfile` oluşturun:

```dockerfile
# Multi-stage build
FROM node:18-alpine as builder

WORKDIR /app

# Package files kopyala
COPY package*.json ./

# Dependencies yükle
RUN npm ci

# Source code kopyala
COPY . .

# Production build
RUN npm run build

# Production stage - Nginx
FROM nginx:alpine

# Custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Build dosyalarını kopyala
COPY --from=builder /app/dist /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 1.3 Nginx Configuration

`frontend/nginx.conf` oluşturun:

```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        # API requests to backend
        location /api/ {
            proxy_pass http://backend:3001;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # SSE endpoint
        location /sse {
            proxy_pass http://backend:3001/sse;
            proxy_http_version 1.1;
            proxy_set_header Connection '';
            proxy_set_header Cache-Control 'no-cache';
            proxy_set_header X-Accel-Buffering 'no';
            proxy_read_timeout 24h;
        }

        # Auth endpoints
        location ~ ^/(login|register|logout|auth-status|createPost|createPoll|enhance-preview|schedule-post|scheduled-posts|posts-history|default-prompts)$ {
            proxy_pass http://backend:3001;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Admin ve Profile endpoints
        location ~ ^/(admin/|profile/).*$ {
            proxy_pass http://backend:3001;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Static files with caching
        location /assets/ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            try_files $uri =404;
        }

        # SPA routing - her şeyi index.html'e yönlendir
        location / {
            try_files $uri $uri/ /index.html;
        }
    }
}
```

## 🐳 2. Docker Compose Yapılandırması

### 2.1 Development docker-compose.yml

Kök dizinde `docker-compose.yml` oluşturun:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./server
      dockerfile: Dockerfile
    container_name: smarttweet-backend
    restart: unless-stopped
    environment:
      - NODE_ENV=development
      - PORT=3001
      - TZ=Europe/Istanbul
      - LOCALE=tr-TR
      # API keys env vars'dan gelecek
    env_file:
      - ./server/.env
    volumes:
      - ./server:/app
      - database_data:/app/data
      - node_modules:/app/node_modules
    ports:
      - "3001:3001"
    networks:
      - smarttweet-network
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3001/auth-status', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: smarttweet-frontend
    restart: unless-stopped
    environment:
      - VITE_LOCALE=tr-TR
      - VITE_TIMEZONE=Europe/Istanbul
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
    networks:
      - smarttweet-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  database_data:
    driver: local
  node_modules:
    driver: local

networks:
  smarttweet-network:
    driver: bridge
```

### 2.2 Production docker-compose.prod.yml

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./server
      dockerfile: Dockerfile
    container_name: smarttweet-backend-prod
    restart: always
    environment:
      - NODE_ENV=production
      - PORT=3001
      - TZ=Europe/Istanbul
      - LOCALE=tr-TR
    env_file:
      - ./server/.env.production
    volumes:
      - database_data:/app/data
      - ./logs:/app/logs
    networks:
      - smarttweet-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: smarttweet-frontend-prod
    restart: always
    environment:
      - VITE_LOCALE=tr-TR
      - VITE_TIMEZONE=Europe/Istanbul
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
    networks:
      - smarttweet-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # SSL Termination with Let's Encrypt (opsiyonel)
  nginx-proxy:
    image: nginxproxy/nginx-proxy
    container_name: nginx-proxy
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/tmp/docker.sock:ro
      - nginx-certs:/etc/nginx/certs
      - nginx-vhost:/etc/nginx/vhost.d
      - nginx-html:/usr/share/nginx/html
    networks:
      - smarttweet-network

  nginx-letsencrypt:
    image: nginxproxy/acme-companion
    container_name: nginx-letsencrypt
    restart: always
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - nginx-certs:/etc/nginx/certs
      - nginx-vhost:/etc/nginx/vhost.d
      - nginx-html:/usr/share/nginx/html
      - nginx-acme:/etc/acme.sh
    environment:
      - DEFAULT_EMAIL=admin@yourdomain.com
    depends_on:
      - nginx-proxy

volumes:
  database_data:
  nginx-certs:
  nginx-vhost:
  nginx-html:
  nginx-acme:

networks:
  smarttweet-network:
    driver: bridge
```

## 🚀 3. Deployment Komutları

### 3.1 Development Ortamında Çalıştırma

```bash
# Projeyi klonla
git clone https://github.com/KilimcininKorOglu/SmartTweet.git
cd SmartTweet

# Environment dosyalarını oluştur
cp server/.env.example server/.env
cp frontend/.env.example frontend/.env

# API keys'leri server/.env dosyasına ekle
nano server/.env

# Container'ları build et ve başlat
docker-compose up --build

# Arka planda çalıştır
docker-compose up -d --build
```

### 3.2 Production Deployment

```bash
# Production environment
cp server/.env.example server/.env.production

# Production'da build et
docker-compose -f docker-compose.prod.yml up --build -d

# SSL ile (nginx-proxy kullanarak)
VIRTUAL_HOST=smarttweet.com \
LETSENCRYPT_HOST=smarttweet.com \
LETSENCRYPT_EMAIL=admin@smarttweet.com \
docker-compose -f docker-compose.prod.yml up -d
```

### 3.3 Yönetim Komutları

```bash
# Container'ları durdur
docker-compose down

# Volume'ları da sil (DİKKAT: Veritabanı silinir!)
docker-compose down -v

# Sadece rebuild
docker-compose build

# Logs görüntüle
docker-compose logs -f
docker-compose logs -f backend
docker-compose logs -f frontend

# Container içine gir
docker exec -it smarttweet-backend sh
docker exec -it smarttweet-frontend sh

# Database backup
docker exec smarttweet-backend cp /app/smarttweet.db /app/data/backup_$(date +%Y%m%d).db
```

## 🔧 4. Environment Configuration

### 4.1 Backend Environment (.env)

```env
# Twitter API v2 Credentials
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_twitter_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_twitter_access_token_secret

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash

# Docker specific
NODE_ENV=production
PORT=3001

# Timezone & Locale
TZ=Europe/Istanbul
LOCALE=tr-TR

# Database path (container içinde)
DB_PATH=/app/data/smarttweet.db
```

### 4.2 Frontend Environment

```env
# Locale configuration
VITE_LOCALE=tr-TR
VITE_TIMEZONE=Europe/Istanbul

# API Base URL (production'da domain)
VITE_API_URL=http://localhost:3001
```

## 🗂️ 5. Volume Management

### 5.1 Data Persistence

```bash
# Database backup
docker run --rm -v smarttweet_database_data:/data -v $(pwd):/backup alpine \
  tar czf /backup/database_backup_$(date +%Y%m%d_%H%M%S).tar.gz -C /data .

# Database restore
docker run --rm -v smarttweet_database_data:/data -v $(pwd):/backup alpine \
  tar xzf /backup/database_backup_YYYYMMDD_HHMMSS.tar.gz -C /data
```

### 5.2 Log Management

```bash
# Log rotation için docker-compose.yml'de:
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

## 🚀 6. Production Optimizasyonu

### 6.1 Multi-stage Build Dockerfile (Backend)

`server/Dockerfile.prod` oluşturun:

```dockerfile
# Build stage
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Production stage
FROM node:18-alpine

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S smarttweet -u 1001

WORKDIR /app

# Copy dependencies
COPY --from=builder --chown=smarttweet:nodejs /app/node_modules ./node_modules

# Copy application
COPY --chown=smarttweet:nodejs . .

# Create data directory
RUN mkdir -p /app/data && chown -R smarttweet:nodejs /app/data

USER smarttweet

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/auth-status', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

CMD ["node", "index.js"]
```

### 6.2 Resource Limits

```yaml
# docker-compose.prod.yml'ye ekle
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
  
  frontend:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          cpus: '0.25'
          memory: 128M
```

## 🌐 7. Reverse Proxy & SSL

### 7.1 Nginx Reverse Proxy

`nginx/nginx.conf` oluşturun:

```nginx
upstream backend {
    server backend:3001;
}

server {
    listen 80;
    server_name smarttweet.com www.smarttweet.com;
    
    # HTTP'den HTTPS'e yönlendir
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name smarttweet.com www.smarttweet.com;

    # SSL configuration
    ssl_certificate /etc/nginx/certs/smarttweet.com.crt;
    ssl_certificate_key /etc/nginx/certs/smarttweet.com.key;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # API ve auth endpoint'leri
    location ~ ^/(api/|login|register|logout|auth-status|admin/|profile/|createPost|createPoll|enhance-preview|schedule-post|scheduled-posts|posts-history|default-prompts|sse) {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Frontend static files
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Assets caching
    location /assets/ {
        root /usr/share/nginx/html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 🔄 8. CI/CD Pipeline (.github/workflows/docker.yml)

```yaml
name: Docker Build and Deploy

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Login to DockerHub
      uses: docker/login-action@v2
      with:
        username: ${{ secrets.DOCKERHUB_USERNAME }}
        password: ${{ secrets.DOCKERHUB_TOKEN }}
    
    - name: Build and push backend
      uses: docker/build-push-action@v4
      with:
        context: ./server
        push: true
        tags: |
          yourusername/smarttweet-backend:latest
          yourusername/smarttweet-backend:${{ github.sha }}
    
    - name: Build and push frontend
      uses: docker/build-push-action@v4
      with:
        context: ./frontend
        push: true
        tags: |
          yourusername/smarttweet-frontend:latest
          yourusername/smarttweet-frontend:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - name: Deploy to production
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.SSH_KEY }}
        script: |
          cd /path/to/smarttweet
          docker-compose -f docker-compose.prod.yml pull
          docker-compose -f docker-compose.prod.yml up -d
```

## 🛠️ 9. Development Workflow

### 9.1 Yerel Geliştirme

```bash
# Development ortamında çalıştır
docker-compose up

# Sadece backend'i restart et
docker-compose restart backend

# Logs takip et
docker-compose logs -f backend

# Frontend değişiklikleri için hot reload
# (Frontend container'ı development mode'da çalışır)
```

### 9.2 Testing

```bash
# Container içinde test çalıştır
docker exec -it smarttweet-backend npm test

# Bağlantı testi
docker exec -it smarttweet-backend node test-connection.js

# Health check manual test
curl http://localhost:3001/auth-status
```

## 🔍 10. Monitoring ve Debugging

### 10.1 Log Monitoring

```bash
# Tüm servis logları
docker-compose logs -f

# Specific service logs
docker logs -f smarttweet-backend
docker logs -f smarttweet-frontend

# Live log monitoring with timestamps
docker-compose logs -f -t
```

### 10.2 Resource Monitoring

```bash
# Container resource usage
docker stats

# Disk usage
docker system df

# Network inspection
docker network ls
docker network inspect smarttweet_smarttweet-network
```

### 10.3 Debugging

```bash
# Container içine gir
docker exec -it smarttweet-backend sh

# Database kontrol
docker exec -it smarttweet-backend ls -la /app/data/

# Process kontrol
docker exec -it smarttweet-backend ps aux
```

## 📦 11. Backup ve Restore

### 11.1 Automated Backup Script

`scripts/backup.sh` oluşturun:

```bash
#!/bin/bash

# Backup directory
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Database backup
docker exec smarttweet-backend cp /app/data/smarttweet.db /app/data/backup_$DATE.db
docker cp smarttweet-backend:/app/data/backup_$DATE.db $BACKUP_DIR/

# Full backup
docker run --rm -v smarttweet_database_data:/data -v $(pwd)/backups:/backup alpine \
  tar czf /backup/full_backup_$DATE.tar.gz -C /data .

echo "✅ Backup completed: $BACKUP_DIR/backup_$DATE.db"
```

### 11.2 Restore Process

```bash
# Container'ları durdur
docker-compose down

# Backup'ı restore et
docker run --rm -v smarttweet_database_data:/data -v $(pwd)/backups:/backup alpine \
  tar xzf /backup/full_backup_YYYYMMDD_HHMMSS.tar.gz -C /data

# Container'ları başlat
docker-compose up -d
```

## 🔐 12. Security Best Practices

### 12.1 Container Security

```dockerfile
# Dockerfile'da security measures
USER node                           # Non-root user
COPY --chown=node:node . .         # Secure file ownership
RUN npm ci --only=production       # Only production deps
```

### 12.2 Network Security

```yaml
# docker-compose.yml'de
networks:
  smarttweet-network:
    driver: bridge
    internal: true  # External access sadece gerekli portlar
```

### 12.3 Secrets Management

```bash
# Docker secrets kullan (production'da)
docker secret create twitter_api_key twitter_api_key.txt
docker secret create gemini_api_key gemini_api_key.txt
```

## 📊 13. Quick Start Commands

```bash
# 1. Hızlı başlatma
git clone https://github.com/KilimcininKorOglu/SmartTweet.git
cd SmartTweet
cp server/.env.example server/.env
# .env dosyasını düzenle
docker-compose up -d --build

# 2. Uygulama erişimi
open http://localhost

# 3. İlk kullanıcı oluştur (admin olur)
# Web arayüzünden kayıt ol

# 4. API credentials ekle
# Profile bölümünden Twitter ve Gemini API keys

# 5. Test post at
# Sohbet bölümünden test tweet
```

---

Bu Docker deployment kılavuzu ile SmartTweet uygulamanızı container ortamında güvenli ve ölçeklenebilir şekilde çalıştırabilirsiniz.
