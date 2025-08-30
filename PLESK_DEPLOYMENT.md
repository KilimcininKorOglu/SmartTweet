# 🚀 SmartTweet - Plesk Reverse Proxy Deployment Kılavuzu

Bu kılavuz, SmartTweet uygulamasını Plesk hosting paneli üzerinde reverse proxy kullanarak nasıl deploy edeceğinizi açıklar.

## 📋 Ön Gereksinimler

- Plesk hosting hesabı (Node.js desteği ile)
- Domain adı (örn: smarttweet.example.com)
- SSH erişimi (önerilir)
- Node.js 18+ desteği

## 🏗️ Deployment Mimarisi

```text
Internet → Plesk (Apache/Nginx) → Reverse Proxy → Node.js App (Port 3001)
                                                 → Static Files (Frontend Build)
```

## 📁 1. Dosya Yapısı ve Upload

### 1.1 Plesk Dosya Yöneticisi ile Upload

1. **Plesk Panel** → **Dosyalar** → **Dosya Yöneticisi**
2. Domain dizinine (`httpdocs/`) gidin
3. Proje dosyalarını upload edin:

```bash
httpdocs/
├── server/                 # Backend Node.js uygulaması
│   ├── index.js
│   ├── package.json
│   ├── .env               # Production ortam değişkenleri
│   └── ...
├── frontend/
│   └── dist/              # Build edilmiş frontend (npm run build sonrası)
└── smarttweet.db          # SQLite veritabanı
```

### 1.2 SSH ile Upload (Alternatif)

```bash
# SSH ile sunucuya bağlan
ssh username@your-server.com

# Git ile proje klonla
cd httpdocs
git clone https://github.com/KilimcininKorOglu/SmartTweet.git .

# Node.js bağımlılıklarını yükle
cd server
npm install --production

# Frontend build
cd ../frontend
npm install
npm run build
```

## ⚙️ 2. Node.js Uygulaması Kurulumu

### 2.1 Plesk Node.js App Oluşturma

1. **Plesk Panel** → **Website & Domains** → **Node.js**
2. **Create App** butonuna tıklayın
3. Ayarları yapılandırın:

```text
Application Name: smarttweet-backend
Node.js Version: 18.x veya 20.x (en güncel)
Application Mode: production
Application Root: /server
Application Startup File: index.js
Application URL: /api (veya boş bırakın)
```

### 2.2 Environment Variables

**Node.js Settings** → **Environment Variables**:

```env
# Twitter API v2 Credentials
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_twitter_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_twitter_access_token_secret

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash

# Production Settings
NODE_ENV=production
PORT=3001

# Timezone & Locale
TZ=Europe/Istanbul
LOCALE=tr-TR
```

### 2.3 Startup Configuration

**NPM Scripts** bölümünde:

- **Startup Script**: `start`
- Package.json'da `"start": "node index.js"` olduğundan emin olun

## 🔄 3. Reverse Proxy Yapılandırması

### 3.1 Apache Reverse Proxy (.htaccess)

`httpdocs/.htaccess` dosyası oluşturun:

```apache
RewriteEngine On

# API isteklerini Node.js uygulamasına yönlendir
RewriteCond %{REQUEST_URI} ^/api/ [OR]
RewriteCond %{REQUEST_URI} ^/login [OR]
RewriteCond %{REQUEST_URI} ^/register [OR]
RewriteCond %{REQUEST_URI} ^/logout [OR]
RewriteCond %{REQUEST_URI} ^/auth-status [OR]
RewriteCond %{REQUEST_URI} ^/admin/ [OR]
RewriteCond %{REQUEST_URI} ^/profile/ [OR]
RewriteCond %{REQUEST_URI} ^/createPost [OR]
RewriteCond %{REQUEST_URI} ^/createPoll [OR]
RewriteCond %{REQUEST_URI} ^/enhance-preview [OR]
RewriteCond %{REQUEST_URI} ^/schedule-post [OR]
RewriteCond %{REQUEST_URI} ^/scheduled-posts [OR]
RewriteCond %{REQUEST_URI} ^/posts-history [OR]
RewriteCond %{REQUEST_URI} ^/default-prompts [OR]
RewriteCond %{REQUEST_URI} ^/sse
RewriteRule ^(.*)$ http://localhost:3001/$1 [P,L]

# Frontend rotalarını index.html'e yönlendir (SPA routing)
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_URI} !^/api/
RewriteRule ^(.*)$ /frontend/dist/index.html [L]

# Static dosyalar için doğrudan erişim
RewriteCond %{REQUEST_URI} ^/assets/
RewriteRule ^assets/(.*)$ /frontend/dist/assets/$1 [L]
```

### 3.2 Nginx Reverse Proxy (Nginx kullanıyorsanız)

**Plesk** → **Apache & Nginx Settings** → **Additional nginx directives**:

```nginx
location /api/ {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}

# SSE endpoint for MCP
location /sse {
    proxy_pass http://localhost:3001/sse;
    proxy_http_version 1.1;
    proxy_set_header Connection '';
    proxy_set_header Cache-Control 'no-cache';
    proxy_set_header X-Accel-Buffering 'no';
    proxy_read_timeout 24h;
}

# Auth endpoints
location ~ ^/(login|register|logout|auth-status|createPost|createPoll|enhance-preview|schedule-post|scheduled-posts|posts-history|default-prompts)$ {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Admin ve Profile endpoints
location ~ ^/(admin/|profile/).*$ {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Frontend SPA routing
location / {
    try_files $uri $uri/ /frontend/dist/index.html;
}

# Static assets
location /assets/ {
    alias /var/www/vhosts/yourdomain.com/httpdocs/frontend/dist/assets/;
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 🗄️ 4. Database Kurulumu

### 4.1 SQLite Database

1. `smarttweet.db` dosyasını `httpdocs/` dizinine kopyalayın
2. Dosya izinlerini ayarlayın:

```bash
chmod 664 smarttweet.db
chown username:psacln smarttweet.db
```

### 4.2 Database Migration

İlk çalıştırmada otomatik migration çalışacak. Log kontrolü için:

```bash
# Node.js uygulamasını manuel başlatarak migration loglarını görün
cd server
node index.js
```

## 🔧 5. Production Optimizasyonları

### 5.1 Frontend Build Optimizasyonu

```bash
cd frontend

# Production build
npm run build

# Build dosyalarını doğru yere kopyala
cp -r dist/* ../httpdocs/frontend/dist/
```

### 5.2 Process Management

Plesk Node.js uygulaması otomatik olarak process management yapar, ancak ek ayarlar:

**Node.js Settings** → **Startup Mode**:

- ✅ **Run script on startup**
- ✅ **Restart on failure**

### 5.3 Log Monitoring

```bash
# Plesk logs
tail -f /var/www/vhosts/yourdomain.com/logs/access_log
tail -f /var/www/vhosts/yourdomain.com/logs/error_log

# Node.js app logs (Plesk Node.js panel)
# Plesk Panel → Node.js → Logs
```

## 🔒 6. SSL ve Domain Yapılandırması

### 6.1 SSL Sertifikası

1. **Plesk Panel** → **SSL/TLS Certificates**
2. **Let's Encrypt** ile ücretsiz SSL:
   - **Issue** butonuna tıklayın
   - Domain ve www alt domainini seçin
   - **Get it free** ile sertifika alın

### 6.2 HTTPS Yönlendirmesi

**Apache & Nginx Settings** → **Additional directives for HTTP**:

```apache
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

## 🚦 7. Testing ve Doğrulama

### 7.1 Sistem Kontrolü

```bash
# 1. Node.js uygulaması çalışıyor mu?
curl http://localhost:3001/auth-status

# 2. Reverse proxy çalışıyor mu?
curl https://yourdomain.com/auth-status

# 3. Frontend dosyaları erişilebilir mi?
curl https://yourdomain.com/
```

### 7.2 MCP Test

```bash
# Client test connection
cd client
node test-connection.js
```

### 7.3 Functional Testing

1. **Frontend**: `https://yourdomain.com` adresine git
2. **Kullanıcı Kaydı**: İlk kullanıcı otomatik admin olur
3. **API Credentials**: Profile bölümünden Twitter ve Gemini API anahtarlarını ekle
4. **Test Post**: Sohbet bölümünden test tweet at

## 🐛 8. Troubleshooting

### 8.1 Yaygın Sorunlar

**Node.js uygulaması başlamıyor:**

```bash
# Plesk Node.js logs kontrol et
# Dependencies eksik olabilir
cd server && npm install --production
```

**Reverse proxy çalışmıyor:**

```bash
# .htaccess syntax kontrol
# Apache rewrite module aktif mi kontrol et
```

**Database izin sorunu:**

```bash
chmod 664 smarttweet.db
chown username:psacln smarttweet.db
```

**CORS hataları:**

```javascript
// server/index.js dosyasında CORS ayarları kontrol edin
app.use(cors({
  origin: ['https://yourdomain.com'],
  credentials: true
}));
```

### 8.2 Performance Optimization

**Plesk Settings** → **Performance**:

- ✅ **Enable Gzip compression**
- ✅ **Enable browser caching**
- ✅ **Optimize images**

**Node.js Settings**:

- **Memory limit**: 512MB+ (kullanıcı sayısına göre)
- **Keep alive**: Enabled

## 📊 9. Monitoring ve Maintenance

### 9.1 Log Monitoring

```bash
# Uygulama logları
tail -f /var/www/vhosts/yourdomain.com/logs/nodejs_error.log

# Web server logları  
tail -f /var/www/vhosts/yourdomain.com/logs/error_log
```

### 9.2 Backup Strategy

```bash
# Database backup
cp smarttweet.db smarttweet_backup_$(date +%Y%m%d).db

# Full backup
tar -czf smarttweet_full_backup_$(date +%Y%m%d).tar.gz server/ frontend/dist/ smarttweet.db
```

### 9.3 Updates

```bash
# Git ile güncelleme
git pull origin main

# Dependencies güncelle
cd server && npm install --production
cd ../frontend && npm install && npm run build

# Node.js uygulamasını restart et (Plesk Panel)
```

## 🔐 10. Security Checklist

- [ ] SSL sertifikası aktif ve geçerli
- [ ] HTTPS redirect çalışıyor
- [ ] Database dosyası web'den erişilebilir değil
- [ ] .env dosyaları web'den erişilebilir değil
- [ ] Node.js uygulama versiyonu güncel
- [ ] Güçlü admin şifresi kullanılıyor
- [ ] API anahtarları güvenli şekilde saklanıyor
- [ ] Regular backup alınıyor

## 🌍 11. Domain Yapılandırma Örnekleri

### Ana Domain

```text
Domain: smarttweet.com
Document Root: /httpdocs/frontend/dist
Node.js App: localhost:3001
```

### Subdomain

```text
Subdomain: app.smarttweet.com  
Document Root: /httpdocs/frontend/dist
Node.js App: localhost:3001
```

### Development/Staging

```text
Subdomain: staging.smarttweet.com
Document Root: /httpdocs/frontend/dist
Node.js App: localhost:3002 (farklı port)
```

## 🚀 12. Go Live Checklist

1. [ ] Dosyalar upload edildi
2. [ ] Node.js uygulaması oluşturuldu ve çalışıyor
3. [ ] Environment variables ayarlandı
4. [ ] Database migrate edildi
5. [ ] Frontend build edildi ve serve ediliyor
6. [ ] Reverse proxy yapılandırıldı
7. [ ] SSL sertifikası aktif
8. [ ] İlk admin kullanıcı oluşturuldu
9. [ ] API credentials test edildi
10. [ ] Test post başarıyla atıldı

---

Bu kılavuz ile SmartTweet uygulamanız Plesk üzerinde production ortamında çalışır durumda olacaktır. Sorun yaşarsanız logs bölümünden hata detaylarını kontrol edebilirsiniz.
