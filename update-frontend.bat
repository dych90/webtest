@echo off
chcp 65001 >nul
echo =========================================
echo 开始更新前端...
echo =========================================

echo.
echo 1. 拉取最新代码...
git pull origin main

echo.
echo 2. 更新前端依赖...
cd frontend
call npm install

echo.
echo 3. 构建前端...
call npm run build

echo.
echo =========================================
echo 前端更新完成！
echo 已构建到 frontend\dist 目录
echo =========================================
pause
