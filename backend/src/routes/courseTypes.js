const express = require('express')
const router = express.Router()
const courseTypeController = require('../controllers/courseTypeController')
const { authenticateToken } = require('../middleware/auth')

router.get('/course-types', authenticateToken, courseTypeController.getCourseTypes)
router.post('/course-types', authenticateToken, courseTypeController.createCourseType)
router.put('/course-types/:id', authenticateToken, courseTypeController.updateCourseType)
router.delete('/course-types/:id', authenticateToken, courseTypeController.deleteCourseType)

module.exports = router
