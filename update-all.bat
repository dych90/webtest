@echo off
chcp 65001 >nul
echo =========================================
echo 开始更新钢琴工作室管理系统（前端+后端）...
echo =========================================

echo.
echo 1. 拉取最新代码...
git pull origin main

echo.
echo 2. 更新后端依赖...
cd backend
call npm install

echo.
echo 3. 更新前端依赖...
cd ..\frontend
call npm install

echo.
echo 4. 构建前端...
call npm run build

echo.
echo 5. 重启后端服务...
cd ..
echo 请手动重启后端服务，或使用 PM2 管理

echo.
echo =========================================
echo 更新完成！
echo 前端已构建到 frontend\dist 目录
echo 后端服务需要手动重启
echo =========================================
pause
