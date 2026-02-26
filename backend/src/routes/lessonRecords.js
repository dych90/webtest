const express = require('express')
const router = express.Router()
const lessonRecordController = require('../controllers/lessonRecordController')
const { authenticateToken } = require('../middleware/auth')

router.get('/lesson-records', authenticateToken, lessonRecordController.getLessonRecords)
router.post('/lesson-records', authenticateToken, lessonRecordController.createLessonRecord)
router.put('/lesson-records/:id', authenticateToken, lessonRecordController.updateLessonRecord)
router.delete('/lesson-records/:id', authenticateToken, lessonRecordController.deleteLessonRecord)

module.exports = router
