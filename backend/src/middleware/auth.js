const { verifyToken } = require('../utils/jwt')

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

module.exports = { authenticateToken }
