#!/bin/bash

echo "========================================="
echo "开始更新钢琴工作室管理系统（前端+后端）..."
echo "========================================="

echo ""
echo "1. 拉取最新代码..."
cd /www/webtest
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
echo "4. 停止所有相关进程..."
pm2 stop piano-backend 2>/dev/null || true
pm2 stop webtest-backend 2>/dev/null || true
pm2 delete piano-backend 2>/dev/null || true
pm2 delete webtest-backend 2>/dev/null || true

echo ""
echo "5. 启动后端服务..."
cd backend
nohup npm start > backend.log 2>&1 &
BACKEND_PID=$!

echo ""
echo "6. 等待后端启动..."
sleep 5

if ps -p $BACKEND_PID > /dev/null; then
    echo "✅ 后端服务启动成功（PID: $BACKEND_PID）"
else
    echo "❌ 后端服务启动失败"
    cat backend.log
fi

echo ""
echo "========================================="
echo "更新完成！"
echo "后端服务已启动"
echo "========================================="
