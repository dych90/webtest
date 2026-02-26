require('dotenv').config()
const bcrypt = require('bcryptjs')
const mongoose = require('mongoose')
const User = require('./src/models/User')
const CourseType = require('./src/models/CourseType')

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ MongoDB连接成功')

    const hashedPassword = await bcrypt.hash('admin123', 10)

    await User.findOneAndUpdate(
      { username: 'admin' },
      { 
        password: hashedPassword,
        role: 'admin'
      },
      { upsert: true, new: true }
    )

    await CourseType.findOneAndUpdate(
      { name: '一对一（45分钟）' },
      { duration: 45 },
      { upsert: true, new: true }
    )

    await CourseType.findOneAndUpdate(
      { name: '一对一（60分钟）' },
      { duration: 60 },
      { upsert: true, new: true }
    )

    console.log('✅ 初始化数据完成')
    console.log('- 管理员账户：admin / admin123')
    console.log('- 课程类型：一对一（45分钟）、一对一（60分钟）')

    await mongoose.disconnect()
  } catch (error) {
    console.error('❌ 初始化失败:', error)
    process.exit(1)
  }
}

seed()
