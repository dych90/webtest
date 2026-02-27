const express = require('express')
const router = express.Router()
const feeStandardController = require('../controllers/feeStandardController')
const { authenticateToken } = require('../middleware/auth')
const multer = require('multer')
const path = require('path')

const upload = multer({
  dest: path.join(__dirname, '../uploads'),
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname))
  }
})

router.get('/fee-standards', authenticateToken, feeStandardController.getFeeStandards)
router.post('/fee-standards', authenticateToken, feeStandardController.createFeeStandard)
router.post('/fee-standards/import', authenticateToken, upload.single('file'), feeStandardController.importFeeStandards)
router.put('/fee-standards/:id', authenticateToken, feeStandardController.updateFeeStandard)
router.delete('/fee-standards/:id', authenticateToken, feeStandardController.deleteFeeStandard)

module.exports = router
