const RewardCatalog = require('../models/RewardCatalog')
const RewardRedemption = require('../models/RewardRedemption')
const { toObjectId, toDate } = require('./rewardCommon')
const { getActivePointRuleConfig } = require('./rewardRuleService')
const growthService = require('./growthService')
const pointService = require('./pointService')

const takeCatalogStock = async rewardCatalogId => {
  const rewardCatalog = await RewardCatalog.findById(rewardCatalogId).select('stockQty')
  if (!rewardCatalog) {
    return false
  }

  if (rewardCatalog.stockQty === undefined || rewardCatalog.stockQty === null) {
    return true
  }

  const result = await RewardCatalog.updateOne(
    {
      _id: rewardCatalogId,
      stockQty: { $gt: 0 }
    },
    {
      $inc: { stockQty: -1 }
    }
  )

  return result.modifiedCount > 0
}

const restoreCatalogStock = async rewardCatalogId => {
  const rewardCatalog = await RewardCatalog.findById(rewardCatalogId)
  if (!rewardCatalog) {
    return
  }

  if (rewardCatalog.stockQty === undefined || rewardCatalog.stockQty === null) {
    return
  }

  await RewardCatalog.updateOne(
    { _id: rewardCatalogId },
    { $inc: { stockQty: 1 } }
  )
}

const findRedeemableRewardCatalog = async ({ rewardCode, teacherId }) => {
  const teacherRewardCatalog = await RewardCatalog.findOne({
    rewardCode,
    teacherId,
    enabled: true
  })

  if (teacherRewardCatalog) {
    return teacherRewardCatalog
  }

  return RewardCatalog.findOne({
    rewardCode,
    enabled: true,
    $or: [
      { teacherId: null },
      { teacherId: { $exists: false } }
    ]
  })
}

const redeemReward = async ({
  studentId,
  teacherId,
  rewardCode,
  requestedByType = 'guardian',
  requestedById = null,
  requestedAt = new Date(),
  remark = null
}) => {
  const normalizedStudentId = toObjectId(studentId, 'studentId')
  const normalizedTeacherId = toObjectId(teacherId, 'teacherId')
  const normalizedRequestedAt = toDate(requestedAt, 'requestedAt')
  const rewardCatalog = await findRedeemableRewardCatalog({
    rewardCode,
    teacherId: normalizedTeacherId
  })

  if (!rewardCatalog) {
    throw new Error('reward catalog not found')
  }

  if (rewardCatalog.stockQty !== undefined && rewardCatalog.stockQty !== null && rewardCatalog.stockQty <= 0) {
    throw new Error('reward stock is insufficient')
  }

  const activeRuleConfig = await getActivePointRuleConfig()
  const growthOverview = await growthService.getGrowthOverview({
    studentId: normalizedStudentId,
    teacherId: normalizedTeacherId,
    ruleConfig: activeRuleConfig
  })

  const gateSatisfied = growthService.isGrowthGateSatisfied({
    totalGrowthStars: growthOverview.totalGrowthStars,
    gateType: rewardCatalog.requiredGrowthGateType,
    gateValue: rewardCatalog.requiredGrowthGateValue,
    ruleConfig: activeRuleConfig
  })

  if (!gateSatisfied) {
    throw new Error('growth gate is not satisfied')
  }

  const balance = await pointService.getCurrentPointBalance({
    studentId: normalizedStudentId,
    teacherId: normalizedTeacherId
  })

  if ((balance.availablePoints || 0) < rewardCatalog.costPoints) {
    throw new Error('availablePoints is insufficient')
  }

  const stockTaken = await takeCatalogStock(rewardCatalog._id)
  if (!stockTaken) {
    throw new Error('reward stock is insufficient')
  }

  const rewardSnapshot = {
    rewardName: rewardCatalog.rewardName,
    rewardType: rewardCatalog.rewardType,
    costPoints: rewardCatalog.costPoints,
    requiredGrowthGateType: rewardCatalog.requiredGrowthGateType,
    requiredGrowthGateValue: rewardCatalog.requiredGrowthGateValue,
    coverImage: rewardCatalog.coverImage
  }

  const redemption = await RewardRedemption.create({
    studentId: normalizedStudentId,
    teacherId: normalizedTeacherId,
    rewardCode: rewardCatalog.rewardCode,
    rewardSnapshot,
    costPoints: rewardCatalog.costPoints,
    requestGrowthStars: growthOverview.totalGrowthStars,
    status: 'pending',
    requestedByType,
    requestedById: requestedById ? toObjectId(requestedById, 'requestedById') : undefined,
    requestedAt: normalizedRequestedAt,
    remark
  })

  try {
    const { ledger, balance: nextBalance } = await pointService.applyPointChange({
      studentId: normalizedStudentId,
      teacherId: normalizedTeacherId,
      changeAmount: -rewardCatalog.costPoints,
      businessType: 'reward_redeem',
      businessId: redemption._id,
      occurredAt: normalizedRequestedAt,
      createdByType: requestedByType,
      createdById: requestedById ? toObjectId(requestedById, 'requestedById') : undefined,
      remark
    })

    redemption.deductPointLedgerId = ledger._id
    await redemption.save()

    return {
      redemption,
      pointBalance: nextBalance
    }
  } catch (error) {
    await redemption.deleteOne()
    await restoreCatalogStock(rewardCatalog._id)
    throw error
  }
}

const approveRewardRedemption = async ({
  redemptionId,
  approvedBy,
  approvedAt = new Date()
}) => {
  const redemption = await RewardRedemption.findById(toObjectId(redemptionId, 'redemptionId'))
  if (!redemption) {
    throw new Error('redemption not found')
  }

  if (redemption.status !== 'pending') {
    throw new Error('redemption is not pending')
  }

  redemption.status = 'approved'
  redemption.approvedBy = toObjectId(approvedBy, 'approvedBy')
  redemption.approvedAt = toDate(approvedAt, 'approvedAt')
  await redemption.save()

  return redemption
}

const deliverRewardRedemption = async ({
  redemptionId,
  deliveredAt = new Date()
}) => {
  const redemption = await RewardRedemption.findById(toObjectId(redemptionId, 'redemptionId'))
  if (!redemption) {
    throw new Error('redemption not found')
  }

  if (!['pending', 'approved'].includes(redemption.status)) {
    throw new Error('redemption cannot be delivered')
  }

  redemption.status = 'delivered'
  redemption.deliveredAt = toDate(deliveredAt, 'deliveredAt')
  await redemption.save()

  return redemption
}

const rejectRewardRedemption = async ({
  redemptionId,
  rejectedBy,
  reason = 'manual_reject',
  rejectedAt = new Date()
}) => {
  const normalizedRejectedAt = toDate(rejectedAt, 'rejectedAt')
  const normalizedRejectedBy = toObjectId(rejectedBy, 'rejectedBy')
  const redemption = await RewardRedemption.findById(toObjectId(redemptionId, 'redemptionId'))

  if (!redemption) {
    throw new Error('redemption not found')
  }

  if (!['pending', 'approved'].includes(redemption.status)) {
    throw new Error('redemption cannot be rejected')
  }

  if (redemption.deductPointLedgerId) {
    await pointService.applyPointChange({
      studentId: redemption.studentId,
      teacherId: redemption.teacherId,
      changeAmount: redemption.costPoints,
      businessType: 'reward_refund',
      businessId: redemption._id,
      occurredAt: normalizedRejectedAt,
      createdByType: 'teacher',
      createdById: normalizedRejectedBy,
      remark: reason
    })
  }

  const rewardCatalog = await RewardCatalog.findOne({
    rewardCode: redemption.rewardCode,
    $or: [
      { teacherId: redemption.teacherId },
      { teacherId: null },
      { teacherId: { $exists: false } }
    ]
  })
  if (rewardCatalog) {
    await restoreCatalogStock(rewardCatalog._id)
  }

  redemption.status = 'rejected'
  redemption.cancelledBy = normalizedRejectedBy
  redemption.cancelledAt = normalizedRejectedAt
  redemption.cancelReason = reason
  await redemption.save()

  return redemption
}

module.exports = {
  redeemReward,
  approveRewardRedemption,
  deliverRewardRedemption,
  rejectRewardRedemption
}
