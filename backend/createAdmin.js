require('dotenv').config({ override: true })
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const User = require('./src/models/User')

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ MongoDB连接成功')
    
    const existingUser = await User.findOne({ username: 'dych90' })
    if (existingUser) {
      console.log('❌ 用户名已存在')
      process.exit(1)
    }
    
    const hashedPassword = await bcrypt.hash('dych1990', 10)
    
    const admin = await User.create({
      username: 'dych90',
      password: hashedPassword,
      role: 'admin',
      name: '管理员',
      phone: ''
    })
    
    console.log('✅ 管理员账号创建成功')
    console.log('用户名: dych90')
    console.log('密码: dych1990')
    console.log('角色: 管理员')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ 创建管理员错误:', error)
    process.exit(1)
  }
}

createAdmin()
