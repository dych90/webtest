#!/bin/bash

# 部署脚本 - 在本地运行，自动部署到服务器
# 使用方法: ./deploy.sh [服务器IP] [用户名]

SERVER_IP=${1:-"你的服务器IP"}
SERVER_USER=${2:-"root"}
SERVER_PATH="/www/webtest"

echo "=== 开始部署 ==="
echo "服务器: ${SERVER_USER}@${SERVER_IP}"
echo "路径: ${SERVER_PATH}"

# 1. 构建前端
echo ""
echo ">>> 构建前端..."
cd frontend
npm run build
if [ $? -ne 0 ]; then
    echo "前端构建失败!"
    exit 1
fi
cd ..

# 2. 同步后端代码
echo ""
echo ">>> 同步后端代码..."
rsync -avz --exclude 'node_modules' --exclude '.env' backend/ ${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/backend/

# 3. 同步前端构建产物
echo ""
echo ">>> 同步前端构建产物..."
rsync -avz frontend/dist/ ${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/frontend/dist/

# 4. 在服务器上执行
echo ""
echo ">>> 在服务器上安装依赖并重启..."
ssh ${SERVER_USER}@${SERVER_IP} << ENDSSH
cd ${SERVER_PATH}/backend
npm install --production
pm2 restart webtest-backend || pm2 start ecosystem.config.js
pm2 save
ENDSSH

echo ""
echo "=== 部署完成 ==="
echo "访问: http://${SERVER_IP}"
