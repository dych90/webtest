# 钢琴工作室管理系统

一个为钢琴工作室设计的综合性管理系统，包含学生管理、课程排课、收费管理、数据统计等功能。

## 技术栈

### 前端
- Vue 3
- Vite
- Element Plus
- Vue Router
- Pinia
- FullCalendar
- ECharts
- html2canvas

### 后端
- Node.js
- Express
- MySQL
- Prisma ORM
- JWT 认证

### 部署
- 腾讯云服务器
- Nginx
- HTTPS

## 项目结构

```
piano-studio-management/
├── frontend/                 # 前端项目
│   ├── public/
│   ├── src/
│   │   ├── api/            # API接口
│   │   ├── assets/         # 静态资源
│   │   ├── components/     # 公共组件
│   │   ├── views/          # 页面组件
│   │   ├── router/         # 路由配置
│   │   ├── store/          # 状态管理
│   │   ├── utils/          # 工具函数
│   │   ├── App.vue
│   │   └── main.js
│   ├── package.json
│   └── vite.config.js
├── backend/                 # 后端项目
│   ├── src/
│   │   ├── controllers/    # 控制器
│   │   ├── models/         # 数据模型
│   │   ├── routes/         # 路由
│   │   ├── middleware/     # 中间件
│   │   ├── utils/          # 工具函数
│   │   └── app.js
│   ├── prisma/             # 数据库schema
│   ├── package.json
│   └── .env
├── nginx/                  # Nginx配置
└── README.md
```

## 功能模块

1. 用户登录
2. 学生管理
3. 课程类型管理
4. 收费标准管理
5. 学生缴费管理
6. 排课管理
7. 消课管理
8. 曲目管理
9. 剩余课费管理
10. 数据统计
11. 提醒管理

## 快速开始

### 前置要求

- Node.js 18+
- MySQL 8.0+

### 数据库配置

1. 创建 MySQL 数据库：

```sql
CREATE DATABASE piano_studio CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. 配置后端环境变量：

```bash
cd backend
cp .env.example .env
```

编辑 `.env` 文件，配置数据库连接信息：

```
PORT=3000
NODE_ENV=development
JWT_SECRET=your-secret-key-change-this-in-production
DATABASE_URL="mysql://username:password@localhost:3306/piano_studio"
```

### 后端启动

```bash
cd backend

# 安装依赖
npm install

# 生成 Prisma Client
npx prisma generate

# 运行数据库迁移
npx prisma migrate dev

# 初始化数据（创建管理员账户和课程类型）
npm run seed

# 启动开发服务器
npm run dev
```

默认管理员账户：
- 用户名：admin
- 密码：admin123

### 前端启动

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 http://localhost:5173 即可使用系统。

## 部署

详见部署文档

## 许可证

MIT
