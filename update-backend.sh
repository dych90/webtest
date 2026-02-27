#!/bin/bash

echo "========================================="
echo "开始更新后端服务..."
echo "========================================="

echo ""
echo "1. 拉取最新代码..."
cd /root/webtest
git pull origin main

echo ""
echo "2. 安装依赖..."
cd backend
npm install

echo ""
echo "3. 重启后端服务..."

if command -v pm2 &> /dev/null; then
    echo "使用 PM2 重启服务..."
    pm2 restart piano-backend || pm2 start backend/src/app.js --name piano-backend
    if [ $? -eq 0 ]; then
        echo "✅ PM2 服务重启成功"
    else
        echo "❌ PM2 重启失败，尝试使用 npm start..."
        cd backend
        nohup npm start > backend.log 2>&1 &
        echo "✅ 使用 npm start 启动服务"
    fi
else
    echo "PM2 未安装，使用 npm start..."
    cd backend
    nohup npm start > backend.log 2>&1 &
    echo "✅ 使用 npm start 启动服务"
fi

echo ""
echo "4. 查看服务状态..."
pm2 logs piano-backend --lines 20

echo ""
echo "========================================="
echo "更新完成！"
echo "========================================="
