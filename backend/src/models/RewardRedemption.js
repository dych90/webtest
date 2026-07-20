const mongoose = require('mongoose')
const {
  ACTOR_TYPES,
  REDEMPTION_STATUSES,
  attachUpdatedAtHooks
} = require('./pointShared')

const rewardRedemptionSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  rewardCode: { type: String, required: true, index: true },
  rewardSnapshot: { type: mongoose.Schema.Types.Mixed, required: true },
  costPoints: { type: Number, required: true },
  requestGrowthStars: { type: Number, required: true },
  status: { type: String, enum: REDEMPTION_STATUSES, default: 'pending', index: true },
  deductPointLedgerId: { type: mongoose.Schema.Types.ObjectId, ref: 'PointLedger', index: true, sparse: true, unique: true },
  requestedByType: { type: String, enum: ACTOR_TYPES, required: true, default: 'guardian' },
  requestedById: { type: mongoose.Schema.Types.ObjectId },
  requestedAt: { type: Date, default: Date.now },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  deliveredAt: Date,
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancelledAt: Date,
  cancelReason: String,
  remark: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

rewardRedemptionSchema.index({ studentId: 1, teacherId: 1, status: 1, createdAt: -1 })
rewardRedemptionSchema.index({ teacherId: 1, rewardCode: 1, createdAt: -1 })
attachUpdatedAtHooks(rewardRedemptionSchema)

module.exports = mongoose.model('RewardRedemption', rewardRedemptionSchema)
