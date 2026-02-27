@echo off
chcp 65001 >nul
echo =========================================
echo 清空数据库并创建管理员账号...
echo =========================================

echo.
echo 1. 清空数据库...
node clearDb.js

echo.
echo 2. 创建管理员账号...
node createAdmin.js

echo.
echo =========================================
echo 完成！
echo 管理员账号: dych90
echo 密码: dych1990
echo =========================================
pause
