const bcrypt = require('bcryptjs')
const User = require('../models/User')
const { generateToken } = require('../utils/jwt')

const login = async (req, res) => {
  try {
    const { username, password } = req.body
    
    const user = await User.findOne({ username })
    
    if (!user) {
      return res.status(401).json({ message: '用户名或密码错误' })
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password)
    
    if (!isValidPassword) {
      return res.status(401).json({ message: '用户名或密码错误' })
    }
    
    const token = generateToken(user._id.toString())
    
    res.json({
      message: '登录成功',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          role: user.role
        }
      }
    })
  } catch (error) {
    console.error('登录错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const logout = async (req, res) => {
  res.json({ message: '退出成功' })
}

const getUserInfo = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('id username role')
    
    if (!user) {
      return res.status(404).json({ message: '用户不存在' })
    }
    
    res.json({
      message: '获取成功',
      data: user
    })
  } catch (error) {
    console.error('获取用户信息错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

module.exports = {
  login,
  logout,
  getUserInfo
}
