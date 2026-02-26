#!/bin/bash

# 服务器端更新脚本 - 在服务器上运行
# 使用方法: ssh root@服务器IP '/www/webtest/update.sh'

cd /www/webtest

echo "=== 开始更新 ==="

# 1. 拉取最新代码
echo ">>> 拉取最新代码..."
git fetch origin
git reset --hard origin/main

# 2. 更新后端
echo ""
echo ">>> 更新后端依赖..."
cd backend
npm install --production

# 3. 构建前端
echo ""
echo ">>> 构建前端..."
cd ../frontend
npm install
npm run build

# 4. 重启后端
echo ""
echo ">>> 重启后端服务..."
cd ../backend
pm2 restart webtest-backend

echo ""
echo "=== 更新完成 ==="
