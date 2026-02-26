const express = require('express')
const router = express.Router()
const repertoireController = require('../controllers/repertoireController')
const { authenticateToken } = require('../middleware/auth')

router.get('/repertoires', authenticateToken, repertoireController.getRepertoires)
router.post('/repertoires', authenticateToken, repertoireController.createRepertoire)
router.put('/repertoires/:id', authenticateToken, repertoireController.updateRepertoire)
router.delete('/repertoires/:id', authenticateToken, repertoireController.deleteRepertoire)

module.exports = router
