#!/bin/bash

echo "========================================="
echo "开始更新后端服务..."
echo "========================================="

echo ""
echo "1. 拉取最新代码..."
cd /www/webtest
git pull origin main

echo ""
echo "2. 安装依赖..."
cd backend
npm install

echo ""
echo "3. 停止所有相关进程..."
pm2 stop piano-backend 2>/dev/null || true
pm2 stop webtest-backend 2>/dev/null || true
pm2 delete piano-backend 2>/dev/null || true
pm2 delete webtest-backend 2>/dev/null || true

echo ""
echo "4. 启动后端服务（PM2）..."
cd /www/webtest/backend
pm2 start src/app.js --name piano-backend

echo ""
echo "5. 保存 PM2 配置..."
pm2 save

echo ""
echo "6. 查看服务状态..."
pm2 list

echo ""
echo "========================================="
echo "更新完成！"
echo "后端服务已启动（PM2）"
echo "查看日志: pm2 logs piano-backend"
echo "========================================="
