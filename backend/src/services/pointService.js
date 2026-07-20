const PointLedger = require('../models/PointLedger')
const PointBalance = require('../models/PointBalance')
const LessonRewardSettlement = require('../models/LessonRewardSettlement')
const RewardRedemption = require('../models/RewardRedemption')
const Student = require('../models/Student')
const { toObjectId, toInteger, toAmount, normalizeAmount, toDate } = require('./rewardCommon')

const NEGATIVE_BALANCE_AUDIT_TYPES = ['lesson_reward', 'practice_reward', 'settlement_void', 'manual_adjust']

const normalizeAuditReason = (reason, fieldName = 'reason') => {
  const normalizedReason = (reason || '').toString().trim()
  if (!normalizedReason) {
    throw new Error(`${fieldName} is required`)
  }

  return normalizedReason
}

const assertNegativeBalanceAllowed = ({
  changeAmount,
  businessType,
  settlementId,
  remark,
  allowNegativeBalance
}) => {
  if (changeAmount >= 0 || !allowNegativeBalance) {
    return
  }

  if (!NEGATIVE_BALANCE_AUDIT_TYPES.includes(businessType)) {
    throw new Error('negative balance is only allowed for audit adjustments')
  }

  if (['lesson_reward', 'practice_reward'].includes(businessType) && !settlementId) {
    throw new Error('settlementId is required for settlement rollback debt')
  }

  normalizeAuditReason(remark, 'debt reason')
}

const ensurePointBalance = async ({ studentId, teacherId }) => {
  const normalizedStudentId = toObjectId(studentId, 'studentId')
  const normalizedTeacherId = toObjectId(teacherId, 'teacherId')

  return PointBalance.findOneAndUpdate(
    {
      studentId: normalizedStudentId,
      teacherId: normalizedTeacherId
    },
    {
      $setOnInsert: {
        studentId: normalizedStudentId,
        teacherId: normalizedTeacherId,
        availablePoints: 0,
        totalEarnedPoints: 0,
        totalSpentPoints: 0,
        totalLessonPoints: 0,
        totalPracticePoints: 0
      }
    },
    {
      new: true,
      upsert: true
    }
  )
}

const createPointLedgerEntry = async ({
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
  return PointLedger.create({
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

const rebuildPointBalance = async ({ studentId, teacherId }) => {
  const normalizedStudentId = toObjectId(studentId, 'studentId')
  const normalizedTeacherId = toObjectId(teacherId, 'teacherId')

  const ledgers = await PointLedger.find({
    studentId: normalizedStudentId,
    teacherId: normalizedTeacherId
  })
    .select('changeAmount businessType')
    .lean()

  let availablePoints = 0
  let totalEarnedPoints = 0
  let totalSpentPoints = 0
  let totalLessonPoints = 0
  let totalPracticePoints = 0

  for (const ledger of ledgers) {
    const amount = Number(ledger.changeAmount) || 0
    availablePoints = normalizeAmount(availablePoints + amount)

    if (['lesson_reward', 'practice_reward', 'manual_adjust'].includes(ledger.businessType)) {
      totalEarnedPoints = normalizeAmount(totalEarnedPoints + amount)
    }

    if (ledger.businessType === 'reward_redeem' && amount < 0) {
      totalSpentPoints = normalizeAmount(totalSpentPoints + Math.abs(amount))
    }

    if (ledger.businessType === 'reward_refund' && amount > 0) {
      totalSpentPoints = normalizeAmount(totalSpentPoints - amount)
    }

    if (ledger.businessType === 'lesson_reward') {
      totalLessonPoints = normalizeAmount(totalLessonPoints + amount)
    }

    if (ledger.businessType === 'practice_reward') {
      totalPracticePoints = normalizeAmount(totalPracticePoints + amount)
    }
  }

  totalEarnedPoints = normalizeAmount(Math.max(0, totalEarnedPoints))
  totalSpentPoints = normalizeAmount(Math.max(0, totalSpentPoints))

  return PointBalance.findOneAndUpdate(
    {
      studentId: normalizedStudentId,
      teacherId: normalizedTeacherId
    },
    {
      $set: {
        studentId: normalizedStudentId,
        teacherId: normalizedTeacherId,
        availablePoints,
        totalEarnedPoints,
        totalSpentPoints,
        totalLessonPoints,
        totalPracticePoints
      }
    },
    {
      new: true,
      upsert: true
    }
  )
}

const applyPointChange = async ({
  studentId,
  teacherId,
  settlementId = null,
  changeAmount,
  businessType,
  businessId = null,
  occurredAt = new Date(),
  createdByType = 'system',
  createdById = null,
  remark = null,
  allowNegativeBalance = false
}) => {
  const normalizedChangeAmount = toAmount(changeAmount, 'changeAmount')
  const normalizedRemark = remark === undefined || remark === null
    ? null
    : remark.toString().trim()

  assertNegativeBalanceAllowed({
    changeAmount: normalizedChangeAmount,
    businessType,
    settlementId,
    remark: normalizedRemark,
    allowNegativeBalance
  })

  if (normalizedChangeAmount < 0 && !allowNegativeBalance) {
    const balance = await ensurePointBalance({ studentId, teacherId })
    if ((balance.availablePoints || 0) + normalizedChangeAmount < 0) {
      throw new Error('availablePoints is insufficient')
    }
  }

  const ledger = await createPointLedgerEntry({
    studentId,
    teacherId,
    settlementId,
    changeAmount: normalizedChangeAmount,
    businessType,
    businessId,
    occurredAt,
    createdByType,
    createdById,
    remark: normalizedRemark
  })

  const balance = await rebuildPointBalance({ studentId, teacherId })

  return {
    ledger,
    balance
  }
}

const getCurrentPointBalance = async ({ studentId, teacherId }) => {
  return ensurePointBalance({ studentId, teacherId })
}

const applyManualPointAdjustment = async ({
  studentId,
  teacherId,
  changeAmount,
  reason,
  adjustedBy,
  adjustedAt = new Date()
}) => {
  const normalizedChangeAmount = toAmount(changeAmount, 'changeAmount')
  if (normalizedChangeAmount === 0) {
    throw new Error('changeAmount must not be 0')
  }

  const normalizedReason = normalizeAuditReason(reason, 'adjustment reason')

  return applyPointChange({
    studentId,
    teacherId,
    changeAmount: normalizedChangeAmount,
    businessType: 'manual_adjust',
    occurredAt: adjustedAt,
    createdByType: 'teacher',
    createdById: adjustedBy,
    remark: normalizedReason,
    allowNegativeBalance: normalizedChangeAmount < 0
  })
}

const getCrownType = rank => {
  if (rank === 1) return 'gold'
  if (rank === 2) return 'silver'
  if (rank === 3) return 'bronze'
  return 'none'
}

const listTeacherPointRanking = async ({
  teacherId,
  limit = 50,
  skip = 0,
  sortField = 'availablePoints'
}) => {
  const normalizedTeacherId = toObjectId(teacherId, 'teacherId')
  const normalizedLimit = toInteger(limit, 'limit', { min: 1, max: 200 })
  const normalizedSkip = toInteger(skip, 'skip', { min: 0 })
  const allowedSortFields = ['availablePoints', 'totalEarnedPoints']
  const normalizedSortField = allowedSortFields.includes(sortField)
    ? sortField
    : 'availablePoints'

  const rankingList = await PointBalance.find({
    teacherId: normalizedTeacherId
  })
    .sort({
      [normalizedSortField]: -1,
      totalEarnedPoints: -1,
      updatedAt: -1
    })
    .skip(normalizedSkip)
    .limit(normalizedLimit)
    .lean()

  const studentIds = rankingList.map(item => item.studentId)
  const students = await Student.find({
    _id: { $in: studentIds }
  })
    .select('name')
    .lean()

  const studentNameMap = new Map(
    students.map(student => [String(student._id), student.name])
  )

  return rankingList.map((item, index) => {
    const rank = normalizedSkip + index + 1
    return {
      ...item,
      studentName: studentNameMap.get(String(item.studentId)) || '',
      rank,
      crownType: 'none',
      rankingMetric: normalizedSortField,
      rankingScore: Number(item[normalizedSortField]) || 0
    }
  })
}

const resolveDebtReasonLabel = (ledger, settlement) => {
  if (!ledger) return '积分扣减'

  if (ledger.businessType === 'reward_redeem') {
    return '礼物兑换扣减积分'
  }

  if (ledger.businessType === 'manual_adjust') {
    return '人工调整扣减积分'
  }

  if (ledger.businessType === 'settlement_void') {
    return '作废奖励结算回收积分'
  }

  if (ledger.businessType === 'lesson_reward' && settlement?.status === 'void') {
    return '上课奖励作废回收积分'
  }

  if (ledger.businessType === 'practice_reward' && settlement?.status === 'void') {
    return '练习奖励作废回收积分'
  }

  if (ledger.businessType === 'lesson_reward') {
    return '上课积分扣减'
  }

  if (ledger.businessType === 'practice_reward') {
    return '练习积分扣减'
  }

  return '积分扣减'
}

const resolvePointRecordView = (ledger, { settlementMap, redemptionMap }) => {
  const changeAmount = Number(ledger.changeAmount) || 0
  const settlement = ledger.settlementId
    ? settlementMap.get(String(ledger.settlementId))
    : null
  const redemption = ledger.businessId
    ? redemptionMap.get(String(ledger.businessId))
    : null
  const rewardName = redemption?.rewardSnapshot?.rewardName || ''

  if (ledger.businessType === 'lesson_reward') {
    return {
      recordType: changeAmount >= 0 ? 'earn' : 'rollback',
      recordTitle: changeAmount >= 0 ? '上课奖励' : '上课奖励回收',
      recordDetail: changeAmount >= 0
        ? (ledger.remark || '正常上课获得积分')
        : (settlement?.voidReason || ledger.remark || '取消上课回收积分')
    }
  }

  if (ledger.businessType === 'practice_reward') {
    return {
      recordType: changeAmount >= 0 ? 'earn' : 'rollback',
      recordTitle: changeAmount >= 0 ? '练琴奖励' : '练琴奖励回收',
      recordDetail: changeAmount >= 0
        ? (ledger.remark || '练琴完成获得积分')
        : (settlement?.voidReason || ledger.remark || '练琴奖励作废回收')
    }
  }

  if (ledger.businessType === 'reward_redeem') {
    return {
      recordType: 'spend',
      recordTitle: '礼物兑换',
      recordDetail: rewardName
        ? `兑换${rewardName}`
        : (ledger.remark || '兑换礼物扣减积分'),
      rewardName,
      redemptionStatus: redemption?.status || ''
    }
  }

  if (ledger.businessType === 'reward_refund') {
    return {
      recordType: 'refund',
      recordTitle: '兑换退回',
      recordDetail: rewardName
        ? `退回${rewardName}积分`
        : (redemption?.cancelReason || ledger.remark || '兑换取消退回积分'),
      rewardName,
      redemptionStatus: redemption?.status || ''
    }
  }

  if (ledger.businessType === 'manual_adjust') {
    return {
      recordType: changeAmount >= 0 ? 'earn' : 'adjust',
      recordTitle: changeAmount >= 0 ? '人工增加积分' : '人工扣减积分',
      recordDetail: ledger.remark || '人工调整'
    }
  }

  if (ledger.businessType === 'settlement_void') {
    return {
      recordType: 'rollback',
      recordTitle: '奖励结算作废',
      recordDetail: settlement?.voidReason || ledger.remark || '奖励作废回收积分'
    }
  }

  return {
    recordType: changeAmount >= 0 ? 'earn' : 'spend',
    recordTitle: changeAmount >= 0 ? '积分获得' : '积分使用',
    recordDetail: ledger.remark || ''
  }
}

const listStudentPointRecords = async ({
  studentId,
  teacherId,
  limit = 50,
  skip = 0,
  businessType = ''
}) => {
  const normalizedStudentId = toObjectId(studentId, 'studentId')
  const normalizedTeacherId = toObjectId(teacherId, 'teacherId')
  const normalizedLimit = toInteger(limit, 'limit', { min: 1, max: 200 })
  const normalizedSkip = toInteger(skip, 'skip', { min: 0 })
  const query = {
    studentId: normalizedStudentId,
    teacherId: normalizedTeacherId
  }

  if (businessType) {
    query.businessType = businessType
  }

  const ledgers = await PointLedger.find(query)
    .sort({ occurredAt: -1, createdAt: -1, _id: -1 })
    .skip(normalizedSkip)
    .limit(normalizedLimit)
    .lean()

  const settlementIds = [
    ...new Set(
      ledgers
        .filter(item => item.settlementId)
        .map(item => String(item.settlementId))
    )
  ]
  const redemptionIds = [
    ...new Set(
      ledgers
        .filter(item => ['reward_redeem', 'reward_refund'].includes(item.businessType) && item.businessId)
        .map(item => String(item.businessId))
    )
  ]

  const [settlements, redemptions] = await Promise.all([
    settlementIds.length > 0
      ? LessonRewardSettlement.find({
          _id: { $in: settlementIds.map(id => toObjectId(id, 'settlementId')) }
        })
          .select('status voidReason lessonRecordId')
          .lean()
      : [],
    redemptionIds.length > 0
      ? RewardRedemption.find({
          _id: { $in: redemptionIds.map(id => toObjectId(id, 'redemptionId')) }
        })
          .select('rewardSnapshot status cancelReason')
          .lean()
      : []
  ])

  const settlementMap = new Map(
    settlements.map(item => [String(item._id), item])
  )
  const redemptionMap = new Map(
    redemptions.map(item => [String(item._id), item])
  )

  return ledgers.map(item => {
    const settlement = item.settlementId
      ? settlementMap.get(String(item.settlementId))
      : null
    const view = resolvePointRecordView(item, {
      settlementMap,
      redemptionMap
    })

    return {
      ledgerId: item._id,
      studentId: item.studentId,
      teacherId: item.teacherId,
      settlementId: item.settlementId || null,
      businessType: item.businessType,
      businessId: item.businessId || null,
      changeAmount: item.changeAmount,
      occurredAt: item.occurredAt || item.createdAt,
      createdAt: item.createdAt || null,
      createdByType: item.createdByType,
      createdById: item.createdById || null,
      remark: item.remark || '',
      settlementStatus: settlement?.status || '',
      voidReason: settlement?.voidReason || '',
      lessonRecordId: settlement?.lessonRecordId || null,
      ...view
    }
  })
}

const getPointDebtOverview = async ({
  studentId,
  teacherId,
  limit = 20
}) => {
  const normalizedStudentId = toObjectId(studentId, 'studentId')
  const normalizedTeacherId = toObjectId(teacherId, 'teacherId')
  const normalizedLimit = toInteger(limit, 'limit', { min: 1, max: 100 })
  const balanceDoc = await ensurePointBalance({
    studentId: normalizedStudentId,
    teacherId: normalizedTeacherId
  })
  const balance = typeof balanceDoc.toObject === 'function'
    ? balanceDoc.toObject()
    : balanceDoc
  const debtPoints = normalizeAmount(Math.max(0, -(Number(balance.availablePoints) || 0)))

  if (debtPoints <= 0) {
    return {
      ...balance,
      hasDebt: false,
      debtPoints: 0,
      outstandingDebtEvents: []
    }
  }

  const ledgers = await PointLedger.find({
    studentId: normalizedStudentId,
    teacherId: normalizedTeacherId
  })
    .sort({ occurredAt: 1, createdAt: 1, _id: 1 })
    .lean()

  const settlementIds = [
    ...new Set(
      ledgers
        .filter(item => item.settlementId)
        .map(item => String(item.settlementId))
    )
  ]

  const settlements = settlementIds.length > 0
    ? await LessonRewardSettlement.find({
        _id: { $in: settlementIds.map(id => toObjectId(id, 'settlementId')) }
      })
        .select('status voidReason lessonRecordId')
        .lean()
    : []

  const settlementMap = new Map(
    settlements.map(item => [String(item._id), item])
  )

  let runningBalance = 0
  const debtTimeline = []

  for (const ledger of ledgers) {
    const beforeBalance = runningBalance
    const changeAmount = Number(ledger.changeAmount) || 0
    const afterBalance = normalizeAmount(beforeBalance + changeAmount)
    const debtBeforeChange = normalizeAmount(Math.max(0, -beforeBalance))
    const debtAfterChange = normalizeAmount(Math.max(0, -afterBalance))
    const debtIncrease = normalizeAmount(Math.max(0, debtAfterChange - debtBeforeChange))

    runningBalance = afterBalance

    if (debtIncrease <= 0) {
      continue
    }

    const settlement = ledger.settlementId
      ? settlementMap.get(String(ledger.settlementId))
      : null

    debtTimeline.push({
      ledgerId: ledger._id,
      settlementId: ledger.settlementId || null,
      businessType: ledger.businessType,
      businessId: ledger.businessId || null,
      changeAmount,
      occurredAt: ledger.occurredAt || ledger.createdAt,
      createdAt: ledger.createdAt || null,
      remark: ledger.remark || '',
      reasonLabel: resolveDebtReasonLabel(ledger, settlement),
      reasonDetail: settlement?.voidReason || ledger.remark || '',
      settlementStatus: settlement?.status || '',
      lessonRecordId: settlement?.lessonRecordId || null,
      debtIncrease,
      debtAfterChange
    })
  }

  let remainingDebt = debtPoints
  const outstandingDebtEvents = []

  for (let index = debtTimeline.length - 1; index >= 0; index -= 1) {
    if (remainingDebt <= 0) {
      break
    }

    const event = debtTimeline[index]
    const contribution = normalizeAmount(Math.min(remainingDebt, event.debtIncrease))
    outstandingDebtEvents.push({
      ...event,
      outstandingContribution: contribution
    })
    remainingDebt = normalizeAmount(remainingDebt - contribution)
  }

  return {
    ...balance,
    hasDebt: true,
    debtPoints,
    outstandingDebtEvents: outstandingDebtEvents
      .slice(0, normalizedLimit)
      .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt))
  }
}

module.exports = {
  ensurePointBalance,
  createPointLedgerEntry,
  rebuildPointBalance,
  applyPointChange,
  applyManualPointAdjustment,
  getCurrentPointBalance,
  listTeacherPointRanking,
  listStudentPointRecords,
  getPointDebtOverview
}
