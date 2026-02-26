const express = require('express')
const router = express.Router()
const reminderController = require('../controllers/reminderController')
const { authenticateToken } = require('../middleware/auth')

router.get('/reminders', authenticateToken, reminderController.getAllReminders)
router.post('/reminders', authenticateToken, reminderController.createReminder)
router.put('/reminders/:id', authenticateToken, reminderController.updateReminder)
router.delete('/reminders/:id', authenticateToken, reminderController.deleteReminder)

module.exports = router
