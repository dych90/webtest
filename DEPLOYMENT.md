# 项目部署到腾讯云 Open Cloud 指南

## 前提条件

- 已注册腾讯云账号
- 已购买云服务器（CVM）
- 已购买域名（可选）
- 服务器操作系统：Ubuntu 20.04 或 CentOS 7+

## 一、服务器环境准备

### 1.1 登录服务器

```bash
# 使用 SSH 登录服务器
ssh root@your_server_ip

# 或者使用腾讯云控制台的 VNC 登录
```

### 1.2 更新系统

```bash
# Ubuntu/Debian
apt update && apt upgrade -y

# CentOS
yum update -y
```

### 1.3 安装必要工具

```bash
# Ubuntu/Debian
apt install -y git curl wget vim

# CentOS
yum install -y git curl wget vim
```

## 二、安装 Node.js

### 2.1 安装 Node.js 18.x

```bash
# 使用 NVM 安装（推荐）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# 或者直接安装
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs
```

### 2.2 验证安装

```bash
node -v
npm -v
```

### 2.3 配置 npm 镜像（可选，加速下载）

```bash
npm config set registry https://registry.npmmirror.com
```

## 三、安装 MongoDB

### 3.1 安装 MongoDB

```bash
# Ubuntu/Debian
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc https://www.mongodb.org/static/pgp/server-6.0.asc
apt install gnupg
gpg --dearmor mongodb-server-6.0.asc
gpg --dearmor mongodb-server-6.0.key
apt-key add mongodb-server-6.0.asc
apt-key add mongodb-server-6.0.key
echo "deb [ arch=amd64,arm64 signed-by=/etc/apt/trusted.gpg.d/mongodb-server-6.0.gpg ] http://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
apt update
apt install -y mongodb-org

# CentOS
yum install -y mongodb-org
```

### 3.2 启动 MongoDB

```bash
# 启动服务
systemctl start mongod

# 设置开机自启
systemctl enable mongod

# 查看状态
systemctl status mongod
```

### 3.3 配置 MongoDB（可选，设置密码）

```bash
# 编辑配置文件
vim /etc/mongod.conf

# 添加以下配置
security:
  authorization: enabled
  authorization: enabled

# 重启服务
systemctl restart mongod
```

### 3.4 创建数据库用户

```bash
# 进入 MongoDB
mongosh

# 创建管理员用户
use admin
db.createUser({
  user: "admin",
  pwd: "your_password",
  roles: [{ role: "userAdminAnyDatabase", db: "admin" }]
})

# 创建应用数据库用户
use your_database_name
db.createUser({
  user: "app_user",
  pwd: "your_password",
  roles: [{ role: "readWrite", db: "your_database_name" }]
})
```

## 四、安装 Nginx

### 4.1 安装 Nginx

```bash
# Ubuntu/Debian
apt install -y nginx

# CentOS
yum install -y nginx
```

### 4.2 启动 Nginx

```bash
systemctl start nginx
systemctl enable nginx
systemctl status nginx
```

## 五、安装 PM2（进程管理器）

### 5.1 安装 PM2

```bash
npm install -g pm2
```

### 5.2 创建 PM2 配置文件

```bash
# 创建 ecosystem 文件
vim ecosystem.config.js
```

添加以下内容：

```javascript
module.exports = {
  apps: [
    {
      name: 'webtest-backend',
      script: './backend/src/app.js',
      cwd: '/root/webtest',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
}
```

## 六、上传代码到服务器

### 6.1 方式一：使用 Git（推荐）

```bash
# 在服务器上克隆代码
cd /root
git clone https://github.com/your-username/webtest.git

# 或者使用 Gitee
git clone https://gitee.com/your-username/webtest.git
```

### 6.2 方式二：使用 SCP/SFTP

```bash
# 在本地电脑上执行
scp -r backend/ root@your_server_ip:/root/webtest/
scp -r frontend/ root@your_server_ip:/root/webtest/

# 或者使用 SFTP 工具（如 FileZilla、WinSCP）
```

### 6.3 方式三：使用腾讯云对象存储（COS）

1. 将代码打包成 zip
2. 上传到 COS
3. 在服务器上下载

```bash
# 安装 COSCMD
wget https://web-1250000000.cos.ap-guangzhou.myqcloud.com/coscli/coscli-v5-beta-linux
chmod +x coscli-v5-beta-linux
mv coscli-v5-beta-linux /usr/local/bin/coscli

# 配置 COS
coscli config init
```

## 七、配置后端

### 7.1 安装依赖

```bash
cd /root/webtest/backend
npm install --production
```

### 7.2 配置环境变量

```bash
# 创建 .env 文件
vim /root/webtest/backend/.env
```

添加以下内容：

```env
# 服务器配置
PORT=3000
NODE_ENV=production

# MongoDB 配置
MONGODB_URI=mongodb://app_user:your_password@localhost:27017/your_database_name?authSource=admin

# 或者使用远程 MongoDB
# MONGODB_URI=mongodb://username:password@remote_ip:27017/database_name

# CORS 配置（前端域名）
CORS_ORIGIN=https://your-domain.com

# JWT 密钥（生产环境使用强密码）
JWT_SECRET=your_strong_secret_key_here
```

### 7.3 启动后端服务

```bash
# 使用 PM2 启动
cd /root/webtest
pm2 start ecosystem.config.js

# 查看日志
pm2 logs webtest-backend

# 查看状态
pm2 status

# 重启服务
pm2 restart webtest-backend

# 停止服务
pm2 stop webtest-backend
```

### 7.4 配置防火墙

```bash
# 开放 3000 端口（后端 API）
ufw allow 3000/tcp

# 或者使用腾讯云安全组
# 在腾讯云控制台 -> 安全组 -> 添加规则
# 协议：TCP
# 端口：3000
# 来源：0.0.0.0/0
```

## 八、构建前端

### 8.1 在本地构建前端

```bash
# 在项目根目录执行
cd frontend
npm run build
```

### 8.2 上传构建产物

```bash
# 将 dist 目录上传到服务器
scp -r dist/ root@your_server_ip:/root/webtest/frontend/
```

## 九、配置 Nginx 反向代理

### 9.1 创建 Nginx 配置文件

```bash
vim /etc/nginx/sites-available/webtest
```

添加以下内容：

```nginx
# 后端 API 代理
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /root/webtest/frontend/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # 后端 API 代理
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 9.2 启用配置

```bash
# 创建软链接
ln -s /etc/nginx/sites-available/webtest /etc/nginx/sites-enabled/

# 测试配置
nginx -t

# 重载 Nginx
nginx -s reload
```

## 十、配置域名（可选）

### 10.1 购买域名

1. 在腾讯云控制台购买域名
2. 解析域名到服务器 IP

### 10.2 配置 DNS 解析

在腾讯云控制台 -> DNS 解析：

```
记录类型：A
主机记录：@
记录值：your_server_ip
TTL：600
```

## 十一、配置 SSL 证书（推荐使用 Let's Encrypt）

### 11.1 安装 Certbot

```bash
# Ubuntu/Debian
apt install -y certbot python3-certbot-nginx

# CentOS
yum install -y certbot python3-certbot-nginx
```

### 11.2 申请证书

```bash
# 申请证书
certbot --nginx -d your-domain.com

# 自动配置 Nginx
certbot --nginx -d your-domain.com --non-interactive
```

### 11.3 更新 Nginx 配置（HTTPS）

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL 证书路径
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL 配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # 前端静态文件
    location / {
        root /root/webtest/frontend/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # 后端 API 代理
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

### 11.3 自动续期证书

```bash
# 添加定时任务
crontab -e

# 添加以下行（每天凌晨 3 点检查并续期）
0 3 * * * certbot renew --quiet --nginx
```

## 十二、验证部署

### 12.1 检查后端服务

```bash
# 检查 PM2 状态
pm2 status

# 检查端口监听
netstat -tlnp | grep 3000

# 测试 API
curl http://localhost:3000/api/statistics
```

### 12.2 检查 Nginx 状态

```bash
# 检查 Nginx 状态
systemctl status nginx

# 查看错误日志
tail -f /var/log/nginx/error.log

# 查看访问日志
tail -f /var/log/nginx/access.log
```

### 12.3 访问网站

在浏览器中访问：
- http://your-server-ip
- http://your-domain.com（如果配置了域名）
- https://your-domain.com（如果配置了 SSL）

## 十三、常见问题排查

### 13.1 后端无法启动

```bash
# 查看详细日志
pm2 logs webtest-backend --lines 100

# 检查端口占用
lsof -i :3000

# 检查 MongoDB 连接
mongosh
show dbs
```

### 13.2 前端 404 错误

```bash
# 检查 Nginx 配置
nginx -t

# 检查文件权限
ls -la /root/webtest/frontend/dist

# 检查 Nginx 错误日志
tail /var/log/nginx/error.log
```

### 13.3 跨域问题

检查：
1. 后端 CORS 配置是否正确
2. Nginx 代理配置是否正确
3. 前端 API 请求地址是否正确

### 13.4 MongoDB 连接失败

```bash
# 检查 MongoDB 状态
systemctl status mongod

# 检查 MongoDB 日志
tail /var/log/mongodb/mongod.log

# 测试连接
mongosh "mongodb://username:password@localhost:27017/database"
```

## 十四、安全加固

### 14.1 配置防火墙

```bash
# 只开放必要端口
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 3000/tcp # 后端 API（可选，通过 Nginx 代理可关闭）
ufw enable
```

### 14.2 配置 fail2ban（防止暴力破解）

```bash
# 安装 fail2ban
apt install -y fail2ban

# 启动服务
systemctl start fail2ban
systemctl enable fail2ban
```

### 14.3 定期备份数据库

```bash
# 创建备份脚本
vim /root/backup-mongodb.sh
```

添加以下内容：

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --db your_database_name --out /root/backup/mongodb_$DATE
find /root/backup -name "mongodb_*" -mtime +7 -delete
```

```bash
# 设置执行权限
chmod +x /root/backup-mongodb.sh

# 添加定时任务（每天凌晨 2 点备份）
crontab -e
0 2 * * * /root/backup-mongodb.sh
```

## 十五、监控和日志

### 15.1 配置日志轮转

```bash
# PM2 日志轮转
pm2 install pm2-logrotate

# Nginx 日志轮转
vim /etc/logrotate.d/nginx
```

### 15.2 设置监控告警

```bash
# 安装监控工具
npm install -g pm2-web

# 启动监控
pm2 web

# 访问监控面板
# http://your-server-ip:9615
```

## 十六、性能优化

### 16.1 开启 Gzip 压缩

在 Nginx 配置中添加：

```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;
```

### 16.2 配置缓存

```nginx
# 静态资源缓存
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

## 十七、部署检查清单

- [ ] 服务器环境准备完成
- [ ] Node.js 安装完成
- [ ] MongoDB 安装并启动
- [ ] Nginx 安装并启动
- [ ] PM2 安装并配置
- [ ] 代码上传到服务器
- [ ] 后端依赖安装完成
- [ ] 后端环境变量配置完成
- [ ] 后端服务启动成功
- [ ] 前端构建完成
- [ ] 前端构建产物上传完成
- [ ] Nginx 配置完成
- [ ] 域名解析完成（可选）
- [ ] SSL 证书配置完成（可选）
- [ ] 防火墙配置完成
- [ ] 数据库备份配置完成
- [ ] 监控配置完成
- [ ] 网站可正常访问
- [ ] API 接口可正常调用
- [ ] 前后端联调成功

## 快速部署脚本

创建一键部署脚本：

```bash
#!/bin/bash

echo "开始部署..."

# 1. 拉取最新代码
cd /root/webtest
git pull origin main

# 2. 安装后端依赖
cd backend
npm install --production

# 3. 重启后端服务
pm2 restart webtest-backend

# 4. 构建前端
cd ../frontend
npm run build

# 5. 重载 Nginx
nginx -s reload

echo "部署完成！"
```

保存为 `deploy.sh` 并添加执行权限：

```bash
chmod +x deploy.sh
```

部署时只需执行：

```bash
./deploy.sh
```

## 注意事项

1. **生产环境安全**
   - 不要使用默认密码
   - 定期更新系统和依赖
   - 配置防火墙规则
   - 启用 SSL 证书

2. **数据备份**
   - 定期备份数据库
   - 备份代码文件
   - 测试恢复流程

3. **性能监控**
   - 监控服务器资源使用
   - 监控应用性能
   - 设置告警通知

4. **日志管理**
   - 定期清理日志
   - 配置日志轮转
   - 保留重要日志

5. **成本优化**
   - 使用腾讯云按量计费
   - 合理配置服务器规格
   - 定期清理无用资源
