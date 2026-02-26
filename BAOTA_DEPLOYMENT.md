# 项目部署到腾讯云宝塔面板（OpenCloudOS 9）指南

## 前提条件

- 已注册腾讯云账号
- 已购买云服务器（CVM）
- 服务器操作系统：OpenCloudOS 9（基于CentOS 7+）
- 已安装宝塔面板
- 已购买域名（可选）

## 一、登录宝塔面板

### 1.1 访问宝塔面板

在浏览器中访问：
```
http://your_server_ip:8888
```

或者使用腾讯云控制台的 VNC 登录后访问

### 1.2 登录宝塔面板

输入宝塔面板的用户名和密码（首次登录后会提示修改默认密码）

## 二、安装运行环境

### 2.1 安装 Node.js

**方法一：使用宝塔面板软件商店（推荐）**

1. 登录宝塔面板
2. 点击左侧菜单"软件商店"
3. 搜索"Node.js版本管理"
4. 点击"安装"按钮
5. 选择版本：Node.js 18.x
6. 点击"提交"安装

**方法二：使用命令行**

```bash
# 使用 NVM 安装（推荐）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# 验证安装
node -v
npm -v
```

### 2.2 安装 MongoDB

**方法一：使用宝塔面板软件商店（推荐）**

1. 点击左侧菜单"软件商店"
2. 搜索"MongoDB"
3. 选择"MongoDB 6.x"或"MongoDB 7.x"
4. 点击"安装"按钮
5. 设置root密码（重要！）
6. 点击"提交"安装

**方法二：使用命令行**

```bash
# 创建MongoDB配置目录
mkdir -p /www/server/mongodb

# 下载MongoDB
wget https://www.mongodb.org/static/pgp/server-6.0.asc https://www.mongodb.org/static/pgp/server-6.0.asc

# 导入GPG密钥
rpm --import https://www.mongodb.org/static/pgp/server-6.0.asc
rpm --import https://www.mongodb.org/static/pgp/server-6.0.asc

# 添加MongoDB仓库
cat <<EOF | tee /etc/yum.repos.d/mongodb-org-6.0.repo
[mongodb-org-6.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/\$releasever/mongodb-org/6.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-6.0.asc
EOF

# 安装MongoDB
yum install -y mongodb-org

# 启动MongoDB
systemctl start mongod

# 设置开机自启
systemctl enable mongod

# 查看状态
systemctl status mongod
```

### 2.3 配置 MongoDB（设置密码）

```bash
# 编辑MongoDB配置文件
vim /etc/mongod.conf

# 添加以下配置（取消注释）
security:
  authorization: enabled

# 重启MongoDB服务
systemctl restart mongod
```

### 2.4 创建数据库用户

```bash
# 进入MongoDB
mongosh

# 创建管理员用户
use admin
db.createUser({
  user: "admin",
  pwd: "your_strong_password",
  roles: [{ role: "userAdminAnyDatabase", db: "admin" }]
})

# 创建应用数据库用户
use your_database_name
db.createUser({
  user: "app_user",
  pwd: "your_strong_password",
  roles: [{ role: "readWrite", db: "your_database_name" }]
})

exit
```

### 2.5 安装 PM2（进程管理器）

```bash
npm install -g pm2

# 验证安装
pm2 -v
```

## 三、上传代码到服务器

### 3.1 使用宝塔面板文件管理

1. 点击左侧菜单"文件"
2. 进入网站根目录（通常是 `/www/wwwroot/`）
3. 创建项目目录：
   - `/www/wwwroot/webtest/backend`
   - `/www/wwwroot/webtest/frontend`

4. 上传代码：
   - 点击"上传"按钮
   - 选择整个 `backend` 和 `frontend` 文件夹
   - 或者使用宝塔的在线编辑器创建文件

### 3.2 使用 Git（推荐）

```bash
# 在服务器上克隆代码
cd /www/wwwroot
git clone https://github.com/your-username/webtest.git

# 或者使用Gitee
git clone https://gitee.com/your-username/webtest.git
```

### 3.3 使用 SFTP 工具

推荐工具：
- FileZilla（Windows）
- WinSCP（Windows）
- Transmit（Mac）

上传路径：
- `backend` → `/www/wwwroot/webtest/backend`
- `frontend` → `/www/wwwroot/webtest/frontend`

## 四、配置后端

### 4.1 安装依赖

```bash
cd /www/wwwroot/webtest/backend
npm install --production
```

### 4.2 配置环境变量

**方法一：使用宝塔面板文件管理**

1. 在 `/www/wwwroot/webtest/backend` 目录
2. 点击"新建文件"
3. 文件名：`.env`
4. 添加以下内容：

```env
# 服务器配置
PORT=3000
NODE_ENV=production

# MongoDB 配置
MONGODB_URI=mongodb://app_user:your_strong_password@localhost:27017/your_database_name?authSource=admin

# CORS 配置（前端域名）
CORS_ORIGIN=https://your-domain.com

# JWT 密钥（生产环境使用强密码）
JWT_SECRET=your_strong_secret_key_here
```

**方法二：使用命令行**

```bash
# 创建.env文件
vim /www/wwwroot/webtest/backend/.env
```

添加相同内容后保存。

### 4.3 创建 PM2 配置文件

```bash
# 创建 ecosystem 文件
vim /www/wwwroot/webtest/backend/ecosystem.config.js
```

添加以下内容：

```javascript
module.exports = {
  apps: [
    {
      name: 'webtest-backend',
      script: './src/app.js',
      cwd: '/www/wwwroot/webtest/backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
}
```

### 4.4 启动后端服务

```bash
# 使用 PM2 启动
cd /www/wwwroot/webtest/backend
pm2 start ecosystem.config.js

# 查看日志
pm2 logs webtest-backend

# 查看状态
pm2 status

# 重启服务
pm2 restart webtest-backend

# 停止服务
pm2 stop webtest-backend
```

### 4.5 配置防火墙

**方法一：使用宝塔面板安全组**

1. 点击左侧菜单"安全"
2. 点击"添加规则"
3. 配置：
   - 类型：TCP
   - 端口：3000
   - 策略：放行
   - 来源：0.0.0.0/0

**方法二：使用命令行**

```bash
# 开放 3000 端口（后端 API）
firewall-cmd --permanent --add-port=3000/tcp
firewall-cmd --reload
```

## 五、构建前端

### 5.1 在本地构建前端

```bash
# 在项目根目录执行
cd frontend
npm run build
```

### 5.2 上传构建产物

使用宝塔面板文件管理：
1. 进入 `/www/wwwroot/webtest/frontend` 目录
2. 上传 `dist` 文件夹
3. 确保文件权限正确

## 六、配置宝塔面板 Nginx

### 6.1 创建网站

1. 点击左侧菜单"网站"
2. 点击"添加站点"
3. 填写信息：
   - 域名：your-domain.com（或使用服务器 IP）
   - 根目录：`/www/wwwroot/webtest/frontend/dist`
   - PHP版本：纯静态
   - 点击"提交"

### 6.2 配置反向代理

1. 在网站列表中找到刚创建的网站
2. 点击"设置"
3. 点击"配置文件"
4. 找到 `location /` 配置块
5. 在 `location /` 块之前添加以下内容：

```nginx
# 后端 API 代理
location /api {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

6. 点击"保存"

### 6.3 配置伪静态（SPA 路由）

在同一个配置文件中，确保 `location /` 块包含：

```nginx
location / {
    try_files $uri $uri/ /index.html;
    index index.html;
}
```

完整的配置示例：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /www/wwwroot/webtest/frontend/dist;
    index index.html;

    # SPA 路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 代理
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 6.4 重载 Nginx

在宝塔面板中：
1. 点击网站列表右侧的"重载配置"按钮
2. 或者使用命令行：

```bash
# 测试配置
nginx -t

# 重载 Nginx
systemctl reload nginx
```

## 七、配置域名（可选）

### 7.1 购买域名

在腾讯云控制台购买域名

### 7.2 配置 DNS 解析

在腾讯云控制台 -> DNS 解析：

```
记录类型：A
主机记录：@
记录值：your_server_ip
TTL：600
```

### 7.3 在宝塔面板添加域名

1. 点击左侧菜单"网站"
2. 点击"添加站点"
3. 填写域名信息
4. 根目录：`/www/wwwroot/webtest/frontend/dist`

## 八、配置 SSL 证书（推荐使用宝塔面板）

### 8.1 使用宝塔面板申请 Let's Encrypt 证书

1. 点击网站列表中的"设置"
2. 点击"SSL"
3. 选择"Let's Encrypt"
4. 填写邮箱
5. 点击"申请"
6. 宝塔会自动配置 Nginx

### 8.2 手动上传证书

如果使用其他证书提供商：

1. 点击"SSL"标签
2. 选择"其他证书"
3. 上传证书文件和私钥
4. 点击"保存"

### 8.3 强制 HTTPS

在宝塔面板中：
1. 点击网站设置
2. 找到"强制 HTTPS"选项
3. 启用该选项

## 九、验证部署

### 9.1 检查后端服务

```bash
# 检查 PM2 状态
pm2 status

# 检查端口监听
netstat -tlnp | grep 3000

# 测试 API
curl http://localhost:3000/api/statistics
```

### 9.2 检查 Nginx 状态

在宝塔面板中：
1. 点击左侧菜单"软件商店"
2. 找到"Nginx"
3. 点击"设置"
4. 查看"运行状态"

### 9.3 访问网站

在浏览器中访问：
- http://your-server-ip
- http://your-domain.com（如果配置了域名）
- https://your-domain.com（如果配置了 SSL）

## 十、常见问题排查

### 10.1 后端无法启动

```bash
# 查看详细日志
pm2 logs webtest-backend --lines 100

# 检查端口占用
lsof -i :3000

# 检查 MongoDB 连接
mongosh "mongodb://app_user:your_password@localhost:27017/your_database_name?authSource=admin"
```

### 10.2 前端 404 错误

在宝塔面板中：
1. 检查网站根目录是否正确
2. 检查文件权限
3. 查看 Nginx 错误日志

### 10.3 跨域问题

检查：
1. 后端 CORS 配置是否正确
2. 宝塔 Nginx 代理配置是否正确
3. 前端 API 请求地址是否正确

### 10.4 MongoDB 连接失败

```bash
# 检查 MongoDB 状态
systemctl status mongod

# 检查 MongoDB 日志
tail -f /var/log/mongodb/mongod.log

# 测试连接
mongosh "mongodb://app_user:your_password@localhost:27017/your_database_name"
```

### 10.5 PM2 服务异常

```bash
# 重启 PM2
pm2 restart all

# 查看 PM2 日志
pm2 logs

# 重新加载配置
pm2 reload ecosystem.config.js
```

## 十一、宝塔面板特定功能

### 11.1 使用宝塔面板的终端

1. 点击左侧菜单"终端"
2. 可以直接执行命令
3. 无需使用 SSH

### 11.2 使用宝塔面板的文件编辑器

1. 点击左侧菜单"文件"
2. 右键点击文件
3. 选择"编辑"
4. 在线编辑代码文件

### 11.3 使用宝塔面板的数据库管理

如果通过宝塔安装了 MongoDB：

1. 点击左侧菜单"数据库"
2. 点击"MongoDB"
3. 可以直接管理数据库
4. 备份和恢复数据库

### 11.4 使用宝塔面板的监控

1. 点击左侧菜单"监控"
2. 查看 CPU、内存、磁盘使用情况
3. 设置告警通知

## 十二、安全加固

### 12.1 配置宝塔面板安全

1. 点击左侧菜单"面板设置"
2. 修改默认端口（8888）
3. 修改默认用户名和密码
4. 启用两步验证
5. 绑定宝塔账号

### 12.2 配置系统防火墙

在宝塔面板中：
1. 点击左侧菜单"安全"
2. 配置 SSH 端口（默认 22）
3. 配置允许的 IP（可选）

### 12.3 定期备份数据库

**方法一：使用宝塔面板**

1. 点击左侧菜单"计划任务"
2. 创建备份任务
3. 选择"数据库备份"
4. 设置备份周期（每天）
5. 设置保留天数（7天）

**方法二：使用脚本**

```bash
# 创建备份脚本
vim /www/wwwroot/backup-mongodb.sh
```

添加以下内容：

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --db your_database_name --out /www/wwwroot/backup/mongodb_$DATE
find /www/wwwroot/backup -name "mongodb_*" -mtime +7 -delete
```

```bash
# 设置执行权限
chmod +x /www/wwwroot/backup-mongodb.sh

# 添加定时任务
crontab -e
0 2 * * * /www/wwwroot/backup-mongodb.sh
```

## 十三、性能优化

### 13.1 开启 Gzip 压缩

在宝塔面板 Nginx 配置中：

1. 点击网站设置
2. 点击"配置文件"
3. 在 `http` 块中添加：

```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;
```

### 13.2 配置缓存

在宝塔面板中：

1. 点击网站设置
2. 点击"配置文件"
3. 添加缓存配置：

```nginx
# 静态资源缓存
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

## 十四、部署检查清单

- [ ] 宝塔面板登录成功
- [ ] Node.js 安装完成（版本 18.x）
- [ ] MongoDB 安装并启动
- [ ] PM2 安装并配置
- [ ] 代码上传到服务器
- [ ] 后端依赖安装完成
- [ ] 后端环境变量配置完成
- [ ] 后端服务启动成功
- [ ] 前端构建完成
- [ ] 前端构建产物上传完成
- [ ] 宝塔网站创建完成
- [ ] Nginx 反向代理配置完成
- [ ] 域名解析完成（可选）
- [ ] SSL 证书配置完成（可选）
- [ ] 防火墙配置完成
- [ ] 数据库备份配置完成
- [ ] 监控配置完成
- [ ] 网站可正常访问
- [ ] API 接口可正常调用
- [ ] 前后端联调成功

## 快速部署脚本

创建一键部署脚本：

```bash
#!/bin/bash

echo "开始部署..."

# 1. 拉取最新代码
cd /www/wwwroot/webtest
git pull origin main

# 2. 安装后端依赖
cd backend
npm install --production

# 3. 重启后端服务
pm2 restart webtest-backend

# 4. 构建前端
cd ../frontend
npm run build

# 5. 重载 Nginx
nginx -s reload

echo "部署完成！"
```

保存为 `deploy.sh` 并添加执行权限：

```bash
chmod +x deploy.sh
```

部署时只需执行：

```bash
./deploy.sh
```

## 注意事项

1. **宝塔面板优势**
   - 图形化界面，易于操作
   - 一键安装软件
   - 自动配置环境
   - 内置文件管理器
   - 内置数据库管理
   - 内置监控功能

2. **生产环境安全**
   - 不要使用默认密码
   - 定期更新系统和依赖
   - 配置防火墙规则
   - 启用 SSL 证书
   - 启用宝塔面板两步验证

3. **数据备份**
   - 定期备份数据库
   - 备份代码文件
   - 测试恢复流程
   - 使用宝塔面板的自动备份功能

4. **性能监控**
   - 监控服务器资源使用
   - 监控应用性能
   - 设置告警通知

5. **日志管理**
   - 定期清理日志
   - 配置日志轮转
   - 保留重要日志

6. **成本优化**
   - 使用腾讯云按量计费
   - 合理配置服务器规格
   - 定期清理无用资源

## 宝塔面板常用命令

```bash
# 查看宝塔面板日志
tail -f /www/server/panel/logs/error.log

# 重启宝塔面板
bt restart

# 查看宝塔面板状态
bt default

# 查看网站列表
bt site list

# 重启 Nginx
bt nginx reload

# 查看 Nginx 状态
bt nginx status
```

## 腾讯云宝塔面板文档

更多宝塔面板使用方法，请参考：
- 官方文档：https://www.bt.cn/new/document.html
- 论坛：https://www.bt.cn/bbs/
