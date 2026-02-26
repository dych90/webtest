const express = require('express')
const router = express.Router()
const lessonBalanceController = require('../controllers/lessonBalanceController')
const { authenticateToken } = require('../middleware/auth')

router.get('/lesson-balances', authenticateToken, lessonBalanceController.getLessonBalances)
router.put('/lesson-balances', authenticateToken, lessonBalanceController.updateLessonBalance)

module.exports = router
