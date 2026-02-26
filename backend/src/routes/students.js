const express = require('express')
const router = express.Router()
const studentController = require('../controllers/studentController')
const { authenticateToken } = require('../middleware/auth')

router.get('/students', authenticateToken, studentController.getStudents)
router.post('/students', authenticateToken, studentController.createStudent)
router.put('/students/:id', authenticateToken, studentController.updateStudent)
router.delete('/students/:id', authenticateToken, studentController.deleteStudent)

module.exports = router
