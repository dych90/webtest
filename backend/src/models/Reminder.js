const mongoose = require('mongoose')

const reminderSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: String,
  reminderDate: { type: Date, required: true },
  isCompleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Reminder', reminderSchema)
