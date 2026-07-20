const ACTOR_TYPES = ['guardian', 'teacher', 'system']
const POINT_ACTOR_TYPES = ACTOR_TYPES
const PRACTICE_CATEGORY_CODES = ['basic', 'sight_reading', 'repertoire', 'theory', 'ear_training']
const PRACTICE_PLAN_STATUSES = ['draft', 'active', 'archived']
const CHECKIN_REVIEW_STATUSES = ['pending', 'approved', 'rejected', 'revised']
const REWARD_BUSINESS_TYPES = [
  'lesson_reward',
  'practice_reward',
  'manual_adjust',
  'reward_redeem',
  'reward_refund',
  'settlement_void'
]
const SETTLEMENT_STATUSES = ['active', 'void']
const REWARD_TYPES = ['normal', 'advanced']
const GROWTH_GATE_TYPES = ['none', 'moon', 'sun']
const REDEMPTION_STATUSES = ['pending', 'approved', 'delivered', 'cancelled', 'rejected']
const STUDY_STATUSES = ['active', 'paused', 'stopped']
const EVIDENCE_MEDIA_TYPES = ['image', 'audio']
const DEFAULT_POINT_TIMEZONE = 'Asia/Shanghai'

// Legacy exports kept for compatibility while the old single-track code is phased out.
const POINT_TYPES = ['star', 'moon', 'sun']
const REDEEMABLE_POINT_TYPES = ['moon', 'sun']
const POINT_LEDGER_BUSINESS_TYPES = REWARD_BUSINESS_TYPES
const POINT_LOT_STATUSES = ['active', 'exhausted', 'expired']

const attachUpdatedAtHooks = (schema) => {
  if (!schema) return

  schema.pre('save', function(next) {
    this.updatedAt = new Date()
    next()
  })

  const touchUpdatedAt = function(next) {
    const update = this.getUpdate()
    if (update && !Array.isArray(update)) {
      if (update.$set) {
        update.$set.updatedAt = new Date()
      } else {
        this.set({ updatedAt: new Date() })
      }
    }
    next()
  }

  schema.pre('findOneAndUpdate', touchUpdatedAt)
  schema.pre('updateOne', touchUpdatedAt)
  schema.pre('updateMany', touchUpdatedAt)
}

module.exports = {
  ACTOR_TYPES,
  REWARD_BUSINESS_TYPES,
  SETTLEMENT_STATUSES,
  REWARD_TYPES,
  GROWTH_GATE_TYPES,
  POINT_TYPES,
  REDEEMABLE_POINT_TYPES,
  PRACTICE_CATEGORY_CODES,
  PRACTICE_PLAN_STATUSES,
  POINT_ACTOR_TYPES,
  CHECKIN_REVIEW_STATUSES,
  POINT_LEDGER_BUSINESS_TYPES,
  POINT_LOT_STATUSES,
  REDEMPTION_STATUSES,
  STUDY_STATUSES,
  EVIDENCE_MEDIA_TYPES,
  DEFAULT_POINT_TIMEZONE,
  attachUpdatedAtHooks
}
