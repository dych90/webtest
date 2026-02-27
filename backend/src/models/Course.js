const mongoose = require('mongoose')

const courseSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  courseTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseType', required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  isRecurring: { type: Boolean, default: false },
  recurringPattern: String,
  status: { type: String, default: 'normal', enum: ['normal', 'cancelled', 'rescheduled', 'completed'] },
  isGiftLesson: { type: Boolean, default: false },
  originalTime: Date,
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Course', courseSchema)
