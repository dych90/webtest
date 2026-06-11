const express = require('express')
const router = express.Router()
const lessonRecordController = require('../controllers/lessonRecordController')
const { authenticateToken } = require('../middleware/auth')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

const mediaRoot = path.join(__dirname, '../../uploads/lesson-record-media')

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(mediaRoot, { recursive: true })
    cb(null, mediaRoot)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '')
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`)
  }
})

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const mimetype = file.mimetype || ''
    const allowed = mimetype.startsWith('image/') ||
      mimetype.startsWith('audio/') ||
      mimetype === 'application/octet-stream'
    cb(allowed ? null : new Error('不支持的文件类型'), allowed)
  }
})

const handleMediaUpload = (req, res, next) => {
  upload.single('file')(req, res, (error) => {
    if (error) {
      return res.status(400).json({ message: error.message || '上传失败' })
    }

    next()
  })
}

router.get('/lesson-records', authenticateToken, lessonRecordController.getLessonRecords)
router.post('/lesson-records/media', authenticateToken, handleMediaUpload, lessonRecordController.uploadLessonRecordMedia)
router.post('/lesson-records/media-data', authenticateToken, lessonRecordController.uploadLessonRecordMediaData)
router.get('/lesson-records/media/:mediaId', lessonRecordController.getLessonRecordMedia)
router.get('/lesson-records/:id', authenticateToken, lessonRecordController.getLessonRecordById)
router.post('/lesson-records', authenticateToken, lessonRecordController.createLessonRecord)
router.put('/lesson-records/:id', authenticateToken, lessonRecordController.updateLessonRecord)
router.delete('/lesson-records/:id', authenticateToken, lessonRecordController.deleteLessonRecord)

module.exports = router
