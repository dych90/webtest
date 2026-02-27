const express = require('express')
const router = express.Router()
const userController = require('../controllers/userController')
const { authenticateToken, requireAdmin } = require('../middleware/auth')

router.get('/users', authenticateToken, requireAdmin, userController.getUsers)
router.post('/users', authenticateToken, requireAdmin, userController.createUser)
router.put('/users/:id', authenticateToken, requireAdmin, userController.updateUser)
router.delete('/users/:id', authenticateToken, requireAdmin, userController.deleteUser)
router.get('/teachers', authenticateToken, userController.getTeachers)

module.exports = router
