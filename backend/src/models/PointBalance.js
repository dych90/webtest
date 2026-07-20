const mongoose = require('mongoose')
const { attachUpdatedAtHooks } = require('./pointShared')

const pointBalanceSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  availablePoints: { type: Number, default: 0 },
  totalEarnedPoints: { type: Number, default: 0 },
  totalSpentPoints: { type: Number, default: 0 },
  totalLessonPoints: { type: Number, default: 0 },
  totalPracticePoints: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

pointBalanceSchema.index({ studentId: 1, teacherId: 1 }, { unique: true })
attachUpdatedAtHooks(pointBalanceSchema)

module.exports = mongoose.model('PointBalance', pointBalanceSchema)
