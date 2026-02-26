# 部署指南

## 服务器要求
- 腾讯云 OpenCloudOS / CentOS 7+
- 至少 1GB 内存
- 开放 80 端口（HTTP）

## 首次部署

### 方法一：手动部署（推荐新手）

#### 1. 连接服务器
```bash
ssh root@你的服务器IP
```

#### 2. 安装环境
```bash
# 安装 Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# 安装 PM2
npm install -g pm2

# 安装 Nginx
yum install -y nginx

# 安装 Git
yum install -y git
```

#### 3. 克隆代码
```bash
mkdir -p /www/webtest
cd /www/webtest
git clone git@github.com:dych90/webtest.git .
```

#### 4. 配置环境变量
```bash
cd /www/webtest/backend
cp .env.example .env
# 编辑 .env 文件，修改必要的配置
vi .env
```

#### 5. 安装依赖并构建
```bash
# 后端
cd /www/webtest/backend
npm install --production

# 前端
cd /www/webtest/frontend
npm install
npm run build
```

#### 6. 配置 Nginx
```bash
cat > /etc/nginx/conf.d/webtest.conf << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        root /www/webtest/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# 启动 Nginx
systemctl enable nginx
systemctl start nginx
```

#### 7. 启动后端
```bash
cd /www/webtest/backend
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

### 方法二：使用初始化脚本

```bash
# 在本地执行（需要 SSH 密钥）
ssh root@你的服务器IP 'bash -s' < init-server.sh
```

---

## 后续更新

### 方法一：在服务器上更新
```bash
ssh root@你的服务器IP

cd /www/webtest
git pull

# 更新后端
cd backend
npm install --production

# 构建前端
cd ../frontend
npm install
npm run build

# 重启后端
cd ../backend
pm2 restart webtest-backend
```

### 方法二：使用更新脚本
```bash
ssh root@你的服务器IP '/www/webtest/update-server.sh'
```

### 方法三：从本地部署（需要 rsync）
```bash
# 在本地项目目录执行
./deploy.sh 你的服务器IP
```

---

## 常用命令

```bash
# 查看后端状态
pm2 status

# 查看后端日志
pm2 logs webtest-backend

# 重启后端
pm2 restart webtest-backend

# 重启 Nginx
systemctl restart nginx

# 查看 Nginx 日志
tail -f /var/log/nginx/error.log
```

---

## 注意事项

1. **MongoDB** 需要单独安装，或使用云数据库
2. **.env 文件** 不要提交到 Git，需要手动上传
3. 生产环境建议修改 `JWT_SECRET` 为随机字符串
