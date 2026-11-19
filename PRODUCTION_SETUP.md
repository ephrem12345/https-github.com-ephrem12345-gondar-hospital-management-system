# Gondar Hospital Management System (GHMS)
## Production Setup & Installation Guide

**Document Version:** 1.0  
**Target OS:** Ubuntu Server 22.04 / 24.04 LTS  
**Target Architecture:** Next.js 15, Express 5, MySQL 8.0, Nginx  

---

## 1. Operating System & Server Preparation

### 1.1 Update Package Repositories & Install Base Packages
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential ufw fail2ban nginx certbot python3-certbot-nginx
```

### 1.2 Configure UFW Firewall
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH Port'
sudo ufw allow 80/tcp comment 'HTTP (Let Encrypt / HTTPS Redirect)'
sudo ufw allow 443/tcp comment 'HTTPS TLS Traffic'
sudo ufw enable
```

### 1.3 Install Node.js v22 LTS
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v # Should display v22.x
npm -v  # Should display v10.x
```

### 1.4 Install & Harden MySQL 8.0
```bash
sudo apt install -y mysql-server
sudo mysql_secure_installation
```
Configure MySQL to bind strictly to localhost:
In `/etc/mysql/mysql.conf.d/mysqld.cnf`:
```ini
[mysqld]
bind-address = 127.0.0.1
default_authentication_plugin = caching_sha2_password
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
max_connections = 200
innodb_buffer_pool_size = 2G
```
Restart MySQL:
```bash
sudo systemctl restart mysql
sudo systemctl enable mysql
```

---

## 2. Database Provisioning

Log in as MySQL root:
```bash
sudo mysql -u root -p
```

Execute the provisioning script:
```sql
-- Create hospital production database
CREATE DATABASE IF NOT EXISTS `ghms` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- Create least-privileged application user
CREATE USER 'ghms_app'@'127.0.0.1' IDENTIFIED WITH caching_sha2_password BY 'Strong_Random_App_Password_Here';

-- Grant required DDL & DML permissions (NO GRANT OPTION, NO SUPER)
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER, REFERENCES ON `ghms`.* TO 'ghms_app'@'127.0.0.1';

-- Create dedicated backup service account (read-only + lock/events)
CREATE USER 'ghms_backup'@'127.0.0.1' IDENTIFIED WITH caching_sha2_password BY 'Strong_Random_Backup_Password_Here';
GRANT SELECT, LOCK TABLES, SHOW VIEW, EVENT, TRIGGER, RELOAD ON *.* TO 'ghms_backup'@'127.0.0.1';

FLUSH PRIVILEGES;
EXIT;
```

---

## 3. Application Deployment

### 3.1 Clone Repository & Set Permissions
```bash
sudo useradd -m -s /bin/bash ghms
sudo mkdir -p /var/www/ghms
sudo chown -R ghms:ghms /var/www/ghms
sudo -u ghms git clone <repository_url> /var/www/ghms
cd /var/www/ghms
```

### 3.2 Configure Environment Variables
Generate cryptographic secrets:
```bash
# Generate 64-byte random hex JWT secret
openssl rand -hex 64
```

Create production frontend environment file `.env.production`:
```ini
NEXT_PUBLIC_API_BASE_URL=https://api.gondar-hospital.et/api/v1
NEXT_PUBLIC_API_MODE=live
NODE_ENV=production
```

Create production backend environment file `backend/.env.production`:
```ini
NODE_ENV=production
PORT=4000
WEB_ORIGINS=https://gondar-hospital.et,https://www.gondar-hospital.et,https://portal.gondar-hospital.et
DATABASE_URL="mysql://ghms_app:Strong_Random_App_Password_Here@127.0.0.1:3306/ghms?connection_limit=30&pool_timeout=15"
JWT_ACCESS_SECRET=your_generated_64_byte_hex_secret_here
JWT_ACCESS_TTL_SECONDS=900
COOKIE_SECURE=true
LOG_LEVEL=info
```

### 3.3 Install Dependencies & Apply Migrations
```bash
sudo -u ghms npm ci --omit=dev
sudo -u ghms npm --prefix backend ci --omit=dev

# Run database migrations safely
sudo -u ghms npx --prefix backend prisma migrate deploy
```

### 3.4 Build Production Artifacts
```bash
# Build backend TypeScript
sudo -u ghms npm --prefix backend run build

# Build Next.js 15 production bundle
sudo -u ghms npm run build
```

---

## 4. Process Management via PM2

Install PM2 globally:
```bash
sudo npm install -g pm2
```

Start applications using cluster mode:
```bash
sudo -u ghms pm2 start /var/www/ghms/ecosystem.config.cjs
sudo pm2 save
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ghms --hp /home/ghms
```

Verify running instances:
```bash
pm2 status
```

---

## 5. Nginx Reverse Proxy & TLS Configuration

### 5.1 Obtain SSL / TLS Certificates
```bash
sudo certbot --nginx -d gondar-hospital.et -d www.gondar-hospital.et -d api.gondar-hospital.et
```

### 5.2 Generate Diffie-Hellman Parameters (4096-bit)
```bash
sudo openssl dhparam -out /etc/nginx/dhparam.pem 2048
```

### 5.3 Deploy Nginx Configuration
Copy `nginx/nginx.conf` to `/etc/nginx/sites-available/ghms.conf`:
```bash
sudo cp /var/www/ghms/nginx/nginx.conf /etc/nginx/sites-available/ghms.conf
sudo ln -s /etc/nginx/sites-available/ghms.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

## 6. Verification & Health Monitoring

Verify backend health:
```bash
curl -I https://api.gondar-hospital.et/api/v1/health
# Should return HTTP/2 200 OK
```

Verify frontend availability:
```bash
curl -I https://gondar-hospital.et/
# Should return HTTP/2 200 OK
```

Check PM2 logs:
```bash
pm2 logs --lines 50
```
