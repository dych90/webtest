const mongoose = require('mongoose')
const {
  REWARD_TYPES,
  GROWTH_GATE_TYPES,
  attachUpdatedAtHooks
} = require('./pointShared')

const rewardCatalogSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  rewardCode: { type: String, required: true, index: true },
  rewardName: { type: String, required: true },
  rewardType: { type: String, enum: REWARD_TYPES, default: 'normal', index: true },
  coverImage: String,
  description: String,
  costPoints: { type: Number, required: true },
  requiredGrowthGateType: { type: String, enum: GROWTH_GATE_TYPES, default: 'none' },
  requiredGrowthGateValue: { type: Number, default: 0 },
  stockQty: Number,
  sortOrder: { type: Number, default: 0 },
  enabled: { type: Boolean, default: true, index: true },
  actualCost: Number,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

rewardCatalogSchema.index({ teacherId: 1, rewardCode: 1 }, { unique: true })
rewardCatalogSchema.index({ teacherId: 1, enabled: 1, sortOrder: 1, createdAt: -1 })
attachUpdatedAtHooks(rewardCatalogSchema)

module.exports = mongoose.model('RewardCatalog', rewardCatalogSchema)
