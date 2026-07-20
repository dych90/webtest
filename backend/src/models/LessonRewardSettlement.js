const mongoose = require('mongoose')
const {
  SETTLEMENT_STATUSES,
  attachUpdatedAtHooks
} = require('./pointShared')

const lessonRewardSettlementSchema = new mongoose.Schema({
  lessonRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'LessonRecord', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  issueLessonReward: { type: Boolean, default: false },
  lessonGrowthStars: { type: Number, default: 0 },
  lessonPoints: { type: Number, default: 0 },
  practiceGrowthStars: { type: Number, default: 0 },
  practicePoints: { type: Number, default: 0 },
  totalGrowthStars: { type: Number, required: true },
  totalPoints: { type: Number, required: true },
  status: { type: String, enum: SETTLEMENT_STATUSES, default: 'active', index: true },
  remark: String,
  settledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  settledAt: { type: Date, default: Date.now, index: true },
  voidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  voidedAt: Date,
  voidReason: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

lessonRewardSettlementSchema.index({ lessonRecordId: 1 }, { unique: true })
lessonRewardSettlementSchema.index({ studentId: 1, teacherId: 1, settledAt: -1 })
attachUpdatedAtHooks(lessonRewardSettlementSchema)

module.exports = mongoose.model('LessonRewardSettlement', lessonRewardSettlementSchema)
