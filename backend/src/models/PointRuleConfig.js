const mongoose = require('mongoose')
const {
  DEFAULT_POINT_TIMEZONE,
  attachUpdatedAtHooks
} = require('./pointShared')

const pointRuleConfigSchema = new mongoose.Schema({
  versionCode: { type: String, required: true, unique: true },
  enabled: { type: Boolean, default: false, index: true },
  lessonGrowthStars: { type: Number, default: 5 },
  lessonPoints: { type: Number, default: 5 },
  practiceRewardWeeklyMax: { type: Number, default: 35 },
  growthStarsToMoon: { type: Number, default: 35 },
  growthMoonsToSun: { type: Number, default: 10 },
  practicePointsMirrorGrowth: { type: Boolean, default: true },
  timezone: { type: String, default: DEFAULT_POINT_TIMEZONE },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

pointRuleConfigSchema.index({ enabled: 1, updatedAt: -1 })
attachUpdatedAtHooks(pointRuleConfigSchema)

module.exports = mongoose.model('PointRuleConfig', pointRuleConfigSchema)
