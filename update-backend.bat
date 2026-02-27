@echo off
chcp 65001 >nul
echo =========================================
echo 开始更新后端...
echo =========================================

echo.
echo 1. 拉取最新代码...
git pull origin main

echo.
echo 2. 更新后端依赖...
cd backend
call npm install

echo.
echo 3. 重启后端服务...
cd ..
echo 请手动重启后端服务，或使用 PM2 管理

echo.
echo =========================================
echo 后端更新完成！
echo =========================================
pause
