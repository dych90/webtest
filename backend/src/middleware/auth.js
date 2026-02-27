const { verifyToken } = require('../utils/jwt')
const User = require('../models/User')

const authenticateToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({ message: '未提供认证令牌' })
    }
    
    const decoded = verifyToken(token)
    req.userId = decoded.userId
    next()
  } catch (error) {
    return res.status(401).json({ message: '无效的认证令牌' })
  }
}

const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId)
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: '需要管理员权限' })
    }
    
    req.user = user
    next()
  } catch (error) {
    return res.status(500).json({ message: '服务器错误' })
  }
}

module.exports = { authenticateToken, requireAdmin }
