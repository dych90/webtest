const express = require('express')
const router = express.Router()
const feeStandardController = require('../controllers/feeStandardController')
const { authenticateToken } = require('../middleware/auth')

router.get('/fee-standards', authenticateToken, feeStandardController.getFeeStandards)
router.post('/fee-standards', authenticateToken, feeStandardController.createFeeStandard)
router.put('/fee-standards/:id', authenticateToken, feeStandardController.updateFeeStandard)
router.delete('/fee-standards/:id', authenticateToken, feeStandardController.deleteFeeStandard)

module.exports = router
