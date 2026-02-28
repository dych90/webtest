const express = require('express')
const router = express.Router()
const paymentController = require('../controllers/paymentController')
const { authenticateToken } = require('../middleware/auth')

router.get('/payments', authenticateToken, paymentController.getPayments)
router.get('/payments/:id', authenticateToken, paymentController.getPaymentById)
router.post('/payments', authenticateToken, paymentController.createPayment)
router.put('/payments/:id', authenticateToken, paymentController.updatePayment)
router.delete('/payments/:id', authenticateToken, paymentController.deletePayment)

module.exports = router
