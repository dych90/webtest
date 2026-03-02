const express = require('express')
const router = express.Router()
const statisticsController = require('../controllers/statisticsController')
const { authenticateToken } = require('../middleware/auth')

router.get('/statistics', authenticateToken, statisticsController.getStatistics)
router.get('/statistics/chart', authenticateToken, statisticsController.getChartStatistics)

module.exports = router
