const mongoose = require('mongoose')
const {
  ACTOR_TYPES,
  REWARD_BUSINESS_TYPES
} = require('./pointShared')

const growthLedgerSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  settlementId: { type: mongoose.Schema.Types.ObjectId, ref: 'LessonRewardSettlement', index: true },
  changeAmount: { type: Number, required: true },
  businessType: { type: String, enum: REWARD_BUSINESS_TYPES, required: true, index: true },
  businessId: { type: mongoose.Schema.Types.ObjectId, index: true },
  occurredAt: { type: Date, default: Date.now, index: true },
  createdByType: { type: String, enum: ACTOR_TYPES, default: 'system' },
  createdById: { type: mongoose.Schema.Types.ObjectId },
  remark: String,
  createdAt: { type: Date, default: Date.now }
})

growthLedgerSchema.index({ studentId: 1, teacherId: 1, occurredAt: -1 })
growthLedgerSchema.index({ settlementId: 1, occurredAt: -1 })
growthLedgerSchema.index({ businessType: 1, businessId: 1 })

module.exports = mongoose.model('GrowthLedger', growthLedgerSchema)
