const User = require('../models/User')
const bcrypt = require('bcryptjs')
const https = require('https')
const { sendTestReminder } = require('../services/reminderService')

const APPID = 'wxc0fad9ed6db1b4a7'
const APPSECRET = 'a31612ae78c3e971ba69fe41c3e2f1a5'

const getUsers = async (req, res) => {
  try {
    const { role } = req.query
    const query = {}
    
    if (role) {
      query.role = role
    }
    
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
    
    res.json({
      message: '获取成功',
      data: users
    })
  } catch (error) {
    console.error('获取用户列表错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const createUser = async (req, res) => {
  try {
    const { username, password, role, name, phone } = req.body
    
    const existingUser = await User.findOne({ username })
    if (existingUser) {
      return res.status(400).json({ message: '用户名已存在' })
    }
    
    const hashedPassword = await bcrypt.hash(password, 10)
    
    const user = await User.create({
      username,
      password: hashedPassword,
      role: role || 'teacher',
      name,
      phone
    })
    
    res.json({
      message: '创建成功',
      data: {
        _id: user._id,
        username: user.username,
        role: user.role,
        name: user.name,
        phone: user.phone
      }
    })
  } catch (error) {
    console.error('创建用户错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const updateUser = async (req, res) => {
  try {
    const { id } = req.params
    const { password, name, phone, role } = req.body
    
    const updateData = { name, phone, role }
    
    if (password) {
      updateData.password = await bcrypt.hash(password, 10)
    }
    
    const user = await User.findByIdAndUpdate(id, updateData, { new: true })
      .select('-password')
    
    if (!user) {
      return res.status(404).json({ message: '用户不存在' })
    }
    
    res.json({
      message: '更新成功',
      data: user
    })
  } catch (error) {
    console.error('更新用户错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params
    
    if (id === req.user._id) {
      return res.status(400).json({ message: '不能删除自己的账号' })
    }
    
    await User.findByIdAndDelete(id)
    
    res.json({ message: '删除成功' })
  } catch (error) {
    console.error('删除用户错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const getTeachers = async (req, res) => {
  try {
    const teachers = await User.find({ role: 'teacher' })
      .select('-password')
      .sort({ name: 1 })
    
    res.json({
      message: '获取成功',
      data: teachers
    })
  } catch (error) {
    console.error('获取教师列表错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const getOpenIdByCode = async (req, res) => {
  try {
    const { code } = req.body

    if (!code) {
      return res.status(400).json({ message: '缺少 code 参数' })
    }

    const openId = await new Promise((resolve, reject) => {
      const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${APPID}&secret=${APPSECRET}&js_code=${code}&grant_type=authorization_code`

      https.get(url, (response) => {
        let data = ''

        response.on('data', (chunk) => {
          data += chunk
        })

        response.on('end', () => {
          try {
            const result = JSON.parse(data)
            if (result.openid) {
              resolve(result.openid)
            } else {
              reject(new Error(result.errmsg || '获取 openId 失败'))
            }
          } catch (error) {
            reject(error)
          }
        })
      }).on('error', (error) => {
        reject(error)
      })
    })

    res.json({
      message: '获取成功',
      data: { openId }
    })
  } catch (error) {
    console.error('获取 openId 错误:', error)
    res.status(500).json({ message: error.message || '服务器错误' })
  }
}

const bindOpenId = async (req, res) => {
  try {
    const { openId } = req.body
    const userId = req.userId

    if (!openId) {
      return res.status(400).json({ message: '缺少 openId 参数' })
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { openId },
      { new: true }
    ).select('-password')

    if (!user) {
      return res.status(404).json({ message: '用户不存在' })
    }

    res.json({
      message: '绑定成功',
      data: user
    })
  } catch (error) {
    console.error('绑定 openId 错误:', error)
    res.status(500).json({ message: error.message || '服务器错误' })
  }
}

const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password')
    
    if (!user) {
      return res.status(404).json({ message: '用户不存在' })
    }

    res.json({
      message: '获取成功',
      data: user
    })
  } catch (error) {
    console.error('获取当前用户错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const sendTestReminderToSelf = async (req, res) => {
  try {
    const result = await sendTestReminder(req.userId)
    
    res.json({
      message: result.message,
      data: result
    })
  } catch (error) {
    console.error('发送测试提醒错误:', error)
    res.status(500).json({ message: error.message || '发送测试提醒失败' })
  }
}

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getTeachers,
  getOpenIdByCode,
  bindOpenId,
  getCurrentUser,
  sendTestReminderToSelf
}
