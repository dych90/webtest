const express = require('express')
const router = express.Router()
const statisticsController = require('../controllers/statisticsController')
const { authenticateToken } = require('../middleware/auth')

router.get('/statistics', authenticateToken, statisticsController.getStatistics)

module.exports = router
