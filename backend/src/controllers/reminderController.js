const Reminder = require('../models/Reminder')

const getAllReminders = async (req, res) => {
  try {
    const { isCompleted, limit } = req.query
    const query = {}
    if (isCompleted !== undefined) {
      query.isCompleted = isCompleted === 'true'
    }
    const reminders = await Reminder.find(query)
      .sort({ reminderDate: -1 })
      .limit(parseInt(limit) || 10)
    res.json({
      message: '获取成功',
      data: reminders
    })
  } catch (error) {
    console.error('获取提醒失败:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const createReminder = async (req, res) => {
  try {
    const reminder = await Reminder.create(req.body)
    res.status(201).json({
      message: '创建成功',
      data: reminder
    })
  } catch (error) {
    console.error('创建提醒失败:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const updateReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    )
    if (!reminder) {
      return res.status(404).json({ message: '提醒不存在' })
    }
    res.json({
      message: '更新成功',
      data: reminder
    })
  } catch (error) {
    console.error('更新提醒失败:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const deleteReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findByIdAndDelete(req.params.id)
    if (!reminder) {
      return res.status(404).json({ message: '提醒不存在' })
    }
    res.json({ message: '删除成功' })
  } catch (error) {
    console.error('删除提醒失败:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

module.exports = {
  getAllReminders,
  createReminder,
  updateReminder,
  deleteReminder
}
