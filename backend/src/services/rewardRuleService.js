const PointRuleConfig = require('../models/PointRuleConfig')
const { DEFAULT_POINT_TIMEZONE } = require('../models/pointShared')

const DEFAULT_POINT_RULE_CONFIG = {
  versionCode: 'v1-default-dual',
  enabled: true,
  lessonGrowthStars: 5,
  lessonPoints: 5,
  practiceRewardWeeklyMax: 35,
  growthStarsToMoon: 35,
  growthMoonsToSun: 10,
  practicePointsMirrorGrowth: true,
  timezone: DEFAULT_POINT_TIMEZONE
}

const normalizePointRuleConfig = configDoc => {
  if (!configDoc) {
    return { ...DEFAULT_POINT_RULE_CONFIG }
  }

  const raw = typeof configDoc.toObject === 'function'
    ? configDoc.toObject()
    : configDoc

  return {
    ...DEFAULT_POINT_RULE_CONFIG,
    ...raw
  }
}

const getActivePointRuleConfig = async () => {
  const configDoc = await PointRuleConfig.findOne({ enabled: true }).sort({ updatedAt: -1 })
  return normalizePointRuleConfig(configDoc)
}

module.exports = {
  DEFAULT_POINT_RULE_CONFIG,
  normalizePointRuleConfig,
  getActivePointRuleConfig
}
