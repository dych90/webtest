#!/bin/bash

echo "========================================="
echo "开始更新钢琴工作室管理系统..."
echo "========================================="

echo ""
echo "1. 拉取最新代码..."
git pull origin main

echo ""
echo "2. 更新后端依赖..."
cd backend
npm install

echo ""
echo "3. 重启后端服务..."
if command -v pm2 &> /dev/null; then
    echo "使用 PM2 重启服务..."
    pm2 restart piano-backend || pm2 start src/app.js --name piano-backend
else
    echo "PM2 未安装，使用普通方式重启..."
    echo "请手动重启后端服务: cd backend && npm start"
fi

echo ""
echo "========================================="
echo "更新完成！"
echo "========================================="
