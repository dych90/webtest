const GrowthLedger = require('../models/GrowthLedger')
const GrowthSummary = require('../models/GrowthSummary')
const Student = require('../models/Student')
const {
  GROWTH_GATE_TYPES
} = require('../models/pointShared')
const { toObjectId, toInteger, toAmount, normalizeAmount, toDate } = require('./rewardCommon')
const { getActivePointRuleConfig, DEFAULT_POINT_RULE_CONFIG } = require('./rewardRuleService')

const ensureGrowthSummary = async ({ studentId, teacherId }) => {
  const normalizedStudentId = toObjectId(studentId, 'studentId')
  const normalizedTeacherId = toObjectId(teacherId, 'teacherId')

  return GrowthSummary.findOneAndUpdate(
    {
      studentId: normalizedStudentId,
      teacherId: normalizedTeacherId
    },
    {
      $setOnInsert: {
        studentId: normalizedStudentId,
        teacherId: normalizedTeacherId,
        totalGrowthStars: 0,
        totalLessonGrowthStars: 0,
        totalPracticeGrowthStars: 0
      }
    },
    {
      new: true,
      upsert: true
    }
  )
}

const createGrowthLedgerEntry = async ({
  studentId,
  teacherId,
  settlementId = null,
  changeAmount,
  businessType,
  businessId = null,
  occurredAt = new Date(),
  createdByType = 'system',
  createdById = null,
  remark = null
}) => {
  return GrowthLedger.create({
    studentId: toObjectId(studentId, 'studentId'),
    teacherId: toObjectId(teacherId, 'teacherId'),
    settlementId: settlementId ? toObjectId(settlementId, 'settlementId') : undefined,
    changeAmount: toAmount(changeAmount, 'changeAmount'),
    businessType,
    businessId: businessId ? toObjectId(businessId, 'businessId') : undefined,
    occurredAt: toDate(occurredAt, 'occurredAt'),
    createdByType,
    createdById: createdById ? toObjectId(createdById, 'createdById') : undefined,
    remark
  })
}

const rebuildGrowthSummary = async ({ studentId, teacherId }) => {
  const normalizedStudentId = toObjectId(studentId, 'studentId')
  const normalizedTeacherId = toObjectId(teacherId, 'teacherId')

  const ledgers = await GrowthLedger.find({
    studentId: normalizedStudentId,
    teacherId: normalizedTeacherId
  })
    .select('changeAmount businessType occurredAt')
    .lean()

  let totalGrowthStars = 0
  let totalLessonGrowthStars = 0
  let totalPracticeGrowthStars = 0
  let lastRewardAt = null

  for (const ledger of ledgers) {
    const amount = Number(ledger.changeAmount) || 0
    totalGrowthStars = normalizeAmount(totalGrowthStars + amount)

    if (ledger.businessType === 'lesson_reward') {
      totalLessonGrowthStars = normalizeAmount(totalLessonGrowthStars + amount)
    }

    if (ledger.businessType === 'practice_reward') {
      totalPracticeGrowthStars = normalizeAmount(totalPracticeGrowthStars + amount)
    }

    if (amount !== 0 && ledger.occurredAt) {
      if (!lastRewardAt || new Date(ledger.occurredAt) > new Date(lastRewardAt)) {
        lastRewardAt = ledger.occurredAt
      }
    }
  }

  return GrowthSummary.findOneAndUpdate(
    {
      studentId: normalizedStudentId,
      teacherId: normalizedTeacherId
    },
    {
      $set: {
        studentId: normalizedStudentId,
        teacherId: normalizedTeacherId,
        totalGrowthStars,
        totalLessonGrowthStars,
        totalPracticeGrowthStars,
        lastRewardAt
      }
    },
    {
      new: true,
      upsert: true
    }
  )
}

const applyGrowthChange = async (params) => {
  const ledger = await createGrowthLedgerEntry(params)
  const summary = await rebuildGrowthSummary({
    studentId: params.studentId,
    teacherId: params.teacherId
  })

  return {
    ledger,
    summary
  }
}

const deriveGrowthBreakdown = (totalGrowthStars, ruleConfig = DEFAULT_POINT_RULE_CONFIG) => {
  const safeTotalGrowthStars = normalizeAmount(Math.max(0, Number(totalGrowthStars) || 0))
  const starsToMoon = ruleConfig.growthStarsToMoon || DEFAULT_POINT_RULE_CONFIG.growthStarsToMoon
  const moonsToSun = ruleConfig.growthMoonsToSun || DEFAULT_POINT_RULE_CONFIG.growthMoonsToSun
  const totalMoonEquivalent = Math.floor(safeTotalGrowthStars / starsToMoon)
  const sunCount = Math.floor(totalMoonEquivalent / moonsToSun)
  const moonRemainder = totalMoonEquivalent % moonsToSun
  const starRemainder = normalizeAmount(safeTotalGrowthStars % starsToMoon)

  let currentLevelType = 'star'
  if (sunCount > 0) {
    currentLevelType = 'sun'
  } else if (totalMoonEquivalent > 0) {
    currentLevelType = 'moon'
  }

  return {
    totalGrowthStars: safeTotalGrowthStars,
    totalMoonEquivalent,
    sunCount,
    moonRemainder,
    starRemainder,
    rankScore: safeTotalGrowthStars,
    currentLevelType
  }
}

const getGrowthOverview = async ({ studentId, teacherId, ruleConfig = null }) => {
  const summary = await ensureGrowthSummary({ studentId, teacherId })
  const activeRuleConfig = ruleConfig || await getActivePointRuleConfig()

  return {
    ...summary.toObject(),
    ...deriveGrowthBreakdown(summary.totalGrowthStars, activeRuleConfig)
  }
}

const isGrowthGateSatisfied = ({
  totalGrowthStars,
  gateType = 'none',
  gateValue = 0,
  ruleConfig = DEFAULT_POINT_RULE_CONFIG
}) => {
  if (gateType === GROWTH_GATE_TYPES[0]) {
    return true
  }

  const normalizedGateValue = Math.max(0, Number(gateValue) || 0)
  const breakdown = deriveGrowthBreakdown(totalGrowthStars, ruleConfig)

  if (gateType === 'moon') {
    return breakdown.totalMoonEquivalent >= normalizedGateValue
  }

  if (gateType === 'sun') {
    return breakdown.sunCount >= normalizedGateValue
  }

  return false
}

const getCrownType = rank => {
  if (rank === 1) return 'gold'
  if (rank === 2) return 'silver'
  if (rank === 3) return 'bronze'
  return 'none'
}

const listTeacherGrowthRanking = async ({ teacherId, limit = 50, skip = 0 }) => {
  const normalizedTeacherId = toObjectId(teacherId, 'teacherId')
  const normalizedLimit = toInteger(limit, 'limit', { min: 1, max: 200 })
  const normalizedSkip = toInteger(skip, 'skip', { min: 0 })

  const summaries = await GrowthSummary.find({
    teacherId: normalizedTeacherId
  })
    .sort({ totalGrowthStars: -1, updatedAt: -1 })
    .skip(normalizedSkip)
    .limit(normalizedLimit)
    .lean()

  const studentIds = summaries.map(item => item.studentId)
  const students = await Student.find({
    _id: { $in: studentIds }
  })
    .select('name')
    .lean()

  const studentNameMap = new Map(
    students.map(student => [String(student._id), student.name])
  )

  const activeRuleConfig = await getActivePointRuleConfig()

  return summaries.map((summary, index) => {
    const rank = normalizedSkip + index + 1
    return {
      ...summary,
      studentName: studentNameMap.get(String(summary.studentId)) || '',
      ...deriveGrowthBreakdown(summary.totalGrowthStars, activeRuleConfig),
      rank,
      crownType: getCrownType(rank)
    }
  })
}

module.exports = {
  ensureGrowthSummary,
  createGrowthLedgerEntry,
  rebuildGrowthSummary,
  applyGrowthChange,
  deriveGrowthBreakdown,
  getGrowthOverview,
  isGrowthGateSatisfied,
  getCrownType,
  listTeacherGrowthRanking
}
