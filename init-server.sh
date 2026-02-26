#!/bin/bash

# 首次部署脚本 - 在服务器上运行
# 使用方法: ssh root@服务器IP 'bash -s' < init-server.sh

echo "=== 初始化服务器环境 ==="

# 1. 安装 Node.js (使用 NodeSource)
echo ""
echo ">>> 安装 Node.js 18..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
    yum install -y nodejs
fi
node -v
npm -v

# 2. 安装 PM2
echo ""
echo ">>> 安装 PM2..."
npm install -g pm2

# 3. 安装 Nginx
echo ""
echo ">>> 安装 Nginx..."
if ! command -v nginx &> /dev/null; then
    yum install -y nginx
fi

# 4. 创建项目目录
echo ""
echo ">>> 创建项目目录..."
mkdir -p /www/webtest/backend
mkdir -p /www/webtest/frontend/dist

# 5. 克隆代码
echo ""
echo ">>> 克隆代码..."
cd /www/webtest
if [ ! -d "backend/src" ]; then
    git clone git@github.com:dych90/webtest.git temp_clone
    cp -r temp_clone/backend/* backend/
    cp -r temp_clone/frontend/dist/* frontend/dist/ 2>/dev/null || true
    rm -rf temp_clone
fi

# 6. 安装后端依赖
echo ""
echo ">>> 安装后端依赖..."
cd /www/webtest/backend
npm install --production

# 7. 配置 Nginx
echo ""
echo ">>> 配置 Nginx..."
cat > /etc/nginx/conf.d/webtest.conf << 'EOF'
server {
    listen 80;
    server_name _;

    # 前端静态文件
    location / {
        root /www/webtest/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 代理
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

# 删除默认配置中的冲突端口
if [ -f /etc/nginx/nginx.conf ]; then
    sed -i 's/listen       80;/listen       8080;/' /etc/nginx/nginx.conf 2>/dev/null || true
fi

# 8. 启动服务
echo ""
echo ">>> 启动服务..."
systemctl enable nginx
systemctl restart nginx

cd /www/webtest/backend
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo ""
echo "=== 初始化完成 ==="
echo ""
echo "接下来请执行:"
echo "1. 上传 .env 文件: scp backend/.env root@服务器IP:/www/webtest/backend/"
echo "2. 重启后端: ssh root@服务器IP 'pm2 restart webtest-backend'"
echo "3. 访问: http://服务器IP"
