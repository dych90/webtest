const express = require('express')
const router = express.Router()
const studentController = require('../controllers/studentController')
const { authenticateToken } = require('../middleware/auth')
const multer = require('multer')

const upload = multer({ dest: 'uploads/' })

router.get('/students', authenticateToken, studentController.getStudents)
router.post('/students', authenticateToken, studentController.createStudent)
router.post('/students/import', authenticateToken, upload.single('file'), studentController.importStudents)
router.put('/students/:id', authenticateToken, studentController.updateStudent)
router.delete('/students/:id', authenticateToken, studentController.deleteStudent)

module.exports = router
