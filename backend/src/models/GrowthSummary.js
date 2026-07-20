const mongoose = require('mongoose')
const { attachUpdatedAtHooks } = require('./pointShared')

const growthSummarySchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  totalGrowthStars: { type: Number, default: 0 },
  totalLessonGrowthStars: { type: Number, default: 0 },
  totalPracticeGrowthStars: { type: Number, default: 0 },
  lastRewardAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

growthSummarySchema.index({ studentId: 1, teacherId: 1 }, { unique: true })
growthSummarySchema.index({ teacherId: 1, totalGrowthStars: -1, updatedAt: -1 })
attachUpdatedAtHooks(growthSummarySchema)

module.exports = mongoose.model('GrowthSummary', growthSummarySchema)
