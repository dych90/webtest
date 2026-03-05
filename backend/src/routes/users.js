const express = require('express')
const router = express.Router()
const userController = require('../controllers/userController')
const { authenticateToken, requireAdmin } = require('../middleware/auth')

router.get('/users', authenticateToken, requireAdmin, userController.getUsers)
router.post('/users', authenticateToken, requireAdmin, userController.createUser)
router.put('/users/:id', authenticateToken, requireAdmin, userController.updateUser)
router.delete('/users/:id', authenticateToken, requireAdmin, userController.deleteUser)
router.get('/teachers', authenticateToken, userController.getTeachers)
router.get('/users/me', authenticateToken, userController.getCurrentUser)
router.post('/openid', userController.getOpenIdByCode)
router.post('/bind-openid', authenticateToken, userController.bindOpenId)

module.exports = router
