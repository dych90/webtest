const jwt = require('jsonwebtoken')

const generateToken = (userId) => {
  return jwt.sign({ type: 'user', userId }, process.env.JWT_SECRET, { expiresIn: '7d' })
}

const generateGuardianToken = (openId) => {
  return jwt.sign({ type: 'guardian', openId }, process.env.JWT_SECRET, { expiresIn: '30d' })
}

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET)
}

module.exports = {
  generateToken,
  generateGuardianToken,
  verifyToken
}
