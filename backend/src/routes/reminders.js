const express = require('express')
const router = express.Router()
const reminderController = require('../controllers/reminderController')
const { authenticateToken } = require('../middleware/auth')
const { checkAndSendReminders } = require('../services/reminderService')

router.get('/reminders', authenticateToken, reminderController.getAllReminders)
router.post('/reminders', authenticateToken, reminderController.createReminder)
router.put('/reminders/:id', authenticateToken, reminderController.updateReminder)
router.delete('/reminders/:id', authenticateToken, reminderController.deleteReminder)

router.post('/test-push', authenticateToken, async (req, res) => {
  try {
    console.log('手动触发消息推送测试...')
    await checkAndSendReminders()
    res.json({ 
      message: '消息推送测试已执行，请查看后端日志',
      time: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
    })
  } catch (error) {
    console.error('测试推送失败:', error)
    res.status(500).json({ message: '测试推送失败', error: error.message })
  }
})

module.exports = router
