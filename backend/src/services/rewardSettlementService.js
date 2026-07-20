const LessonRecord = require('../models/LessonRecord')
const LessonRewardSettlement = require('../models/LessonRewardSettlement')
const { toObjectId, toInteger, toDate } = require('./rewardCommon')
const { getActivePointRuleConfig } = require('./rewardRuleService')
const growthService = require('./growthService')
const pointService = require('./pointService')

const requireAuditReason = (value, fieldName) => {
  const reason = (value || '').toString().trim()
  if (!reason) {
    throw new Error(`${fieldName} is required`)
  }

  return reason
}

const settleLessonReward = async ({
  lessonRecordId,
  issueLessonReward = true,
  practiceRewardValue = 0,
  remark = null,
  settledBy,
  settledAt = new Date()
}) => {
  const normalizedLessonRecordId = toObjectId(lessonRecordId, 'lessonRecordId')
  const normalizedSettledBy = toObjectId(settledBy, 'settledBy')
  const activeRuleConfig = await getActivePointRuleConfig()
  const normalizedPracticeRewardValue = toInteger(practiceRewardValue, 'practiceRewardValue', {
    min: 0,
    max: activeRuleConfig.practiceRewardWeeklyMax
  })

  const existingSettlement = await LessonRewardSettlement.findOne({
    lessonRecordId: normalizedLessonRecordId
  })

  if (existingSettlement && existingSettlement.status === 'active') {
    throw new Error('lesson reward settlement already exists')
  }

  if (existingSettlement && existingSettlement.status === 'void') {
    throw new Error('lesson reward settlement was voided and cannot be recreated in V1')
  }

  const lessonRecord = await LessonRecord.findById(normalizedLessonRecordId)
  if (!lessonRecord) {
    throw new Error('lessonRecord not found')
  }

  const studentId = lessonRecord.studentId
  const teacherId = lessonRecord.teacherId || normalizedSettledBy
  const lessonGrowthStars = issueLessonReward ? activeRuleConfig.lessonGrowthStars : 0
  const lessonPoints = issueLessonReward ? activeRuleConfig.lessonPoints : 0
  const practiceGrowthStars = normalizedPracticeRewardValue
  const practicePoints = activeRuleConfig.practicePointsMirrorGrowth
    ? normalizedPracticeRewardValue
    : 0
  const totalGrowthStars = lessonGrowthStars + practiceGrowthStars
  const totalPoints = lessonPoints + practicePoints
  const normalizedSettledAt = toDate(settledAt, 'settledAt')

  const settlement = await LessonRewardSettlement.create({
    lessonRecordId: normalizedLessonRecordId,
    studentId,
    teacherId,
    issueLessonReward,
    lessonGrowthStars,
    lessonPoints,
    practiceGrowthStars,
    practicePoints,
    totalGrowthStars,
    totalPoints,
    status: 'active',
    remark,
    settledBy: normalizedSettledBy,
    settledAt: normalizedSettledAt
  })

  if (lessonGrowthStars > 0) {
    await growthService.applyGrowthChange({
      studentId,
      teacherId,
      settlementId: settlement._id,
      changeAmount: lessonGrowthStars,
      businessType: 'lesson_reward',
      businessId: normalizedLessonRecordId,
      occurredAt: normalizedSettledAt,
      createdByType: 'teacher',
      createdById: normalizedSettledBy,
      remark
    })
  }

  if (practiceGrowthStars > 0) {
    await growthService.applyGrowthChange({
      studentId,
      teacherId,
      settlementId: settlement._id,
      changeAmount: practiceGrowthStars,
      businessType: 'practice_reward',
      businessId: normalizedLessonRecordId,
      occurredAt: normalizedSettledAt,
      createdByType: 'teacher',
      createdById: normalizedSettledBy,
      remark
    })
  }

  if (lessonPoints > 0) {
    await pointService.applyPointChange({
      studentId,
      teacherId,
      settlementId: settlement._id,
      changeAmount: lessonPoints,
      businessType: 'lesson_reward',
      businessId: normalizedLessonRecordId,
      occurredAt: normalizedSettledAt,
      createdByType: 'teacher',
      createdById: normalizedSettledBy,
      remark
    })
  }

  if (practicePoints > 0) {
    await pointService.applyPointChange({
      studentId,
      teacherId,
      settlementId: settlement._id,
      changeAmount: practicePoints,
      businessType: 'practice_reward',
      businessId: normalizedLessonRecordId,
      occurredAt: normalizedSettledAt,
      createdByType: 'teacher',
      createdById: normalizedSettledBy,
      remark
    })
  }

  const growthOverview = await growthService.getGrowthOverview({ studentId, teacherId })
  const pointBalance = await pointService.getCurrentPointBalance({ studentId, teacherId })

  return {
    settlement,
    growthOverview,
    pointBalance
  }
}

const voidRewardSettlement = async ({
  settlementId,
  voidedBy,
  voidReason,
  voidedAt = new Date()
}) => {
  const normalizedSettlementId = toObjectId(settlementId, 'settlementId')
  const normalizedVoidedBy = toObjectId(voidedBy, 'voidedBy')
  const normalizedVoidedAt = toDate(voidedAt, 'voidedAt')
  const normalizedVoidReason = requireAuditReason(voidReason, 'voidReason')

  const settlement = await LessonRewardSettlement.findById(normalizedSettlementId)
  if (!settlement) {
    throw new Error('settlement not found')
  }

  if (settlement.status !== 'active') {
    throw new Error('settlement is not active')
  }

  if (settlement.lessonGrowthStars > 0) {
    await growthService.applyGrowthChange({
      studentId: settlement.studentId,
      teacherId: settlement.teacherId,
      settlementId: settlement._id,
      changeAmount: -settlement.lessonGrowthStars,
      businessType: 'lesson_reward',
      businessId: settlement.lessonRecordId,
      occurredAt: normalizedVoidedAt,
      createdByType: 'teacher',
      createdById: normalizedVoidedBy,
      remark: normalizedVoidReason
    })
  }

  if (settlement.practiceGrowthStars > 0) {
    await growthService.applyGrowthChange({
      studentId: settlement.studentId,
      teacherId: settlement.teacherId,
      settlementId: settlement._id,
      changeAmount: -settlement.practiceGrowthStars,
      businessType: 'practice_reward',
      businessId: settlement.lessonRecordId,
      occurredAt: normalizedVoidedAt,
      createdByType: 'teacher',
      createdById: normalizedVoidedBy,
      remark: normalizedVoidReason
    })
  }

  if (settlement.lessonPoints > 0) {
    await pointService.applyPointChange({
      studentId: settlement.studentId,
      teacherId: settlement.teacherId,
      settlementId: settlement._id,
      changeAmount: -settlement.lessonPoints,
      businessType: 'lesson_reward',
      businessId: settlement.lessonRecordId,
      occurredAt: normalizedVoidedAt,
      createdByType: 'teacher',
      createdById: normalizedVoidedBy,
      remark: normalizedVoidReason,
      allowNegativeBalance: true
    })
  }

  if (settlement.practicePoints > 0) {
    await pointService.applyPointChange({
      studentId: settlement.studentId,
      teacherId: settlement.teacherId,
      settlementId: settlement._id,
      changeAmount: -settlement.practicePoints,
      businessType: 'practice_reward',
      businessId: settlement.lessonRecordId,
      occurredAt: normalizedVoidedAt,
      createdByType: 'teacher',
      createdById: normalizedVoidedBy,
      remark: normalizedVoidReason,
      allowNegativeBalance: true
    })
  }

  settlement.status = 'void'
  settlement.voidedBy = normalizedVoidedBy
  settlement.voidedAt = normalizedVoidedAt
  settlement.voidReason = normalizedVoidReason
  await settlement.save()

  const growthOverview = await growthService.getGrowthOverview({
    studentId: settlement.studentId,
    teacherId: settlement.teacherId
  })
  const pointBalance = await pointService.getCurrentPointBalance({
    studentId: settlement.studentId,
    teacherId: settlement.teacherId
  })

  return {
    settlement,
    growthOverview,
    pointBalance
  }
}

module.exports = {
  settleLessonReward,
  voidRewardSettlement
}
