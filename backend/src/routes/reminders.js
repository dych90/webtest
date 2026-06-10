const express = require('express')
const router = express.Router()
const reminderController = require('../controllers/reminderController')
const { authenticateToken } = require('../middleware/auth')
const { checkAndSendReminders, sendMorningDailyReminder, sendEveningDailyReminder } = require('../services/reminderService')
const User = require('../models/User')
const { sendSubscribeMessage, formatTime } = require('../utils/wechat')

const getUserOpenIds = (user) => {
  if (!user) return []
  
  const openIds = []
  
  if (user.openIds && user.openIds.length > 0) {
    openIds.push(...user.openIds)
  }
  
  if (user.openId && !openIds.includes(user.openId)) {
    openIds.push(user.openId)
  }
  
  return openIds
}

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

router.post('/send-test-message', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId
    const user = await User.findById(userId)
    
    if (!user) {
      return res.status(404).json({ message: '用户不存在' })
    }
    
    const openIds = getUserOpenIds(user)
    
    if (openIds.length === 0) {
      return res.status(400).json({ message: '请先在小程序中订阅消息' })
    }
    
    console.log('发送测试消息给用户:', user.name, 'openIds:', openIds)
    
    const now = new Date()
    const messageData = {
      time2: {
        value: formatTime(now)
      },
      thing11: {
        value: '测试消息'
      },
      thing12: {
        value: '测试课程'
      },
      phrase16: {
        value: '测试成功'
      }
    }
    
    console.log('发送的数据:', JSON.stringify(messageData, null, 2))
    
    const results = []
    for (const openId of openIds) {
      try {
        await sendSubscribeMessage(openId, messageData, 'pages/schedule/schedule')
        results.push({ openId, success: true })
      } catch (error) {
        console.error(`发送测试消息到 ${openId} 失败:`, error.message)
        results.push({ openId, success: false, error: error.message })
      }
    }
    
    const successCount = results.filter(r => r.success).length
    
    res.json({ 
      message: `测试消息已发送：${successCount}/${openIds.length} 个微信成功`,
      data: {
        total: openIds.length,
        successCount,
        results
      },
      time: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
    })
  } catch (error) {
    console.error('发送测试消息失败:', error)
    res.status(500).json({ message: '发送失败', error: error.message })
  }
})

router.post('/test-morning-reminder', authenticateToken, async (req, res) => {
  try {
    console.log('手动触发早上提醒测试...')
    await sendMorningDailyReminder()
    res.json({ 
      message: '早上提醒测试已执行，请查看后端日志',
      time: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
    })
  } catch (error) {
    console.error('早上提醒测试失败:', error)
    res.status(500).json({ message: '测试失败', error: error.message })
  }
})

router.post('/test-evening-reminder', authenticateToken, async (req, res) => {
  try {
    console.log('手动触发晚上提醒测试...')
    await sendEveningDailyReminder()
    res.json({ 
      message: '晚上提醒测试已执行，请查看后端日志',
      time: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
    })
  } catch (error) {
    console.error('晚上提醒测试失败:', error)
    res.status(500).json({ message: '测试失败', error: error.message })
  }
})

module.exports = router
