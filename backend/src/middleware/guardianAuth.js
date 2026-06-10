const { verifyToken } = require('../utils/jwt')

const authenticateGuardianToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      return res.status(401).json({ message: '未提供家长端认证令牌' })
    }

    const decoded = verifyToken(token)
    if (decoded.type !== 'guardian' || !decoded.openId) {
      return res.status(401).json({ message: '无效的家长端认证令牌' })
    }

    req.guardianOpenId = decoded.openId
    next()
  } catch (error) {
    return res.status(401).json({ message: '无效的家长端认证令牌' })
  }
}

module.exports = { authenticateGuardianToken }
