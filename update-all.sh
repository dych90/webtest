#!/bin/bash

echo "========================================="
echo "开始更新钢琴工作室管理系统（前端+后端）..."
echo "========================================="

echo ""
echo "1. 拉取最新代码..."
git pull origin main

echo ""
echo "2. 更新后端依赖..."
cd backend
npm install

echo ""
echo "3. 更新前端依赖..."
cd ../frontend
npm install

echo ""
echo "4. 构建前端..."
npm run build

echo ""
echo "5. 重启后端服务..."
cd ..
if command -v pm2 &> /dev/null; then
    echo "使用 PM2 重启服务..."
    pm2 restart piano-backend || pm2 start backend/src/app.js --name piano-backend
else
    echo "PM2 未安装，使用普通方式重启..."
    echo "请手动重启后端服务: cd backend && npm start"
fi

echo ""
echo "========================================="
echo "更新完成！"
echo "前端已构建到 frontend/dist 目录"
echo "后端服务已重启"
echo "========================================="
