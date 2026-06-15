const mongoose = require('mongoose')

const lessonBalanceSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  remainingLessons: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

lessonBalanceSchema.index({ studentId: 1, teacherId: 1 }, { unique: true })

module.exports = mongoose.model('LessonBalance', lessonBalanceSchema)
