const Student = require('../models/Student')
const User = require('../models/User')
const LessonRecord = require('../models/LessonRecord')
const LessonRewardSettlement = require('../models/LessonRewardSettlement')
const RewardCatalog = require('../models/RewardCatalog')
const RewardRedemption = require('../models/RewardRedemption')
const { canViewStudent } = require('../utils/studentAccess')
const { getActivePointRuleConfig } = require('../services/rewardRuleService')
const growthService = require('../services/growthService')
const pointService = require('../services/pointService')
const rewardSettlementService = require('../services/rewardSettlementService')
const rewardRedemptionService = require('../services/rewardRedemptionService')

const parseBooleanValue = (value, defaultValue = true) => {
  if (value === undefined || value === null || value === '') {
    return defaultValue
  }

  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
  }

  return Boolean(value)
}

const createHttpError = (message, status) => {
  const error = new Error(message)
  error.status = status
  return error
}

const getErrorStatus = error => {
  if (error?.status) {
    return error.status
  }

  if (error?.code === 11000) {
    return 400
  }

  const message = (error?.message || '').toLowerCase()

  if (
    message.includes('not found') ||
    message.includes('does not exist')
  ) {
    return 404
  }

  if (
    message.includes('insufficient') ||
    message.includes('already exists') ||
    message.includes('cannot') ||
    message.includes('not pending') ||
    message.includes('not active') ||
    message.includes('satisfied') ||
    message.includes('required') ||
    message.includes('invalid') ||
    message.includes('must be')
  ) {
    return 400
  }

  if (message.includes('forbidden')) {
    return 403
  }

  return 500
}

const getRequestUser = async req => {
  const user = await User.findById(req.userId).select('role name username')
  if (!user) {
    throw createHttpError('user not found', 401)
  }

  if (!['admin', 'teacher'].includes(user.role)) {
    throw createHttpError('forbidden', 403)
  }

  return user
}

const getAccessibleStudent = async ({ studentId, user }) => {
  const student = await Student.findById(studentId)
    .select('name teacherId practiceTeacherId')

  if (!student) {
    throw createHttpError('student not found', 404)
  }

  if (!canViewStudent(student, user)) {
    throw createHttpError('forbidden', 403)
  }

  return student
}

const resolveTeacherScope = ({ user, student, teacherId }) => {
  if (user.role === 'admin') {
    const resolvedTeacherId = teacherId || student?.teacherId || student?.practiceTeacherId
    if (!resolvedTeacherId) {
      throw createHttpError('teacherId is required', 400)
    }
    return resolvedTeacherId
  }

  return user._id
}

const buildStudentRewardOverview = async ({
  student,
  teacherId
}) => {
  const ruleConfig = await getActivePointRuleConfig()

  const [growthOverview, pointBalance, pointDebtOverview] = await Promise.all([
    growthService.getGrowthOverview({
      studentId: student._id,
      teacherId,
      ruleConfig
    }),
    pointService.getCurrentPointBalance({
      studentId: student._id,
      teacherId
    }),
    pointService.getPointDebtOverview({
      studentId: student._id,
      teacherId
    })
  ])

  return {
    studentId: student._id,
    studentName: student.name,
    teacherId,
    ruleConfig,
    growthOverview,
    pointBalance,
    pointDebtOverview
  }
}

const ensureLessonRecordAccess = async ({ lessonRecordId, user }) => {
  const lessonRecord = await LessonRecord.findById(lessonRecordId)
    .select('studentId teacherId recordDate courseStartTime')

  if (!lessonRecord) {
    throw createHttpError('lessonRecord not found', 404)
  }

  if (user.role !== 'admin' && String(lessonRecord.teacherId) !== String(user._id)) {
    throw createHttpError('forbidden', 403)
  }

  return lessonRecord
}

const ensureSettlementAccess = async ({ settlementId, user }) => {
  const settlement = await LessonRewardSettlement.findById(settlementId)
    .select('teacherId studentId status')

  if (!settlement) {
    throw createHttpError('settlement not found', 404)
  }

  if (user.role !== 'admin' && String(settlement.teacherId) !== String(user._id)) {
    throw createHttpError('forbidden', 403)
  }

  return settlement
}

const ensureRedemptionAccess = async ({ redemptionId, user }) => {
  const redemption = await RewardRedemption.findById(redemptionId)
    .select('teacherId studentId status')

  if (!redemption) {
    throw createHttpError('redemption not found', 404)
  }

  if (user.role !== 'admin' && String(redemption.teacherId) !== String(user._id)) {
    throw createHttpError('forbidden', 403)
  }

  return redemption
}

const getStudentRanking = async (req, res) => {
  try {
    const user = await getRequestUser(req)
    const rankingMode = req.query.rankingMode === 'points' ? 'points' : 'growth'
    const teacherId = user.role === 'admin'
      ? (req.query.teacherId || null)
      : user._id

    if (!teacherId) {
      return res.status(400).json({ message: 'teacherId is required for admin' })
    }

    const limit = Number(req.query.limit) || 50
    const skip = Number(req.query.skip) || 0
    const pointSortField = req.query.pointSortField === 'totalEarnedPoints'
      ? 'totalEarnedPoints'
      : 'availablePoints'

    const ranking = rankingMode === 'points'
      ? await pointService.listTeacherPointRanking({
          teacherId,
          limit,
          skip,
          sortField: pointSortField
        })
      : await growthService.listTeacherGrowthRanking({
          teacherId,
          limit,
          skip
        })

    res.json({
      message: 'student ranking fetched successfully',
      data: {
        rankingMode,
        crownMode: 'growth',
        pointSortField: rankingMode === 'points' ? pointSortField : null,
        teacherId,
        items: ranking
      }
    })
  } catch (error) {
    console.error('getStudentRanking error:', error)
    res.status(getErrorStatus(error)).json({ message: error.message || 'server error' })
  }
}

const getStudentRewardOverview = async (req, res) => {
  try {
    const user = await getRequestUser(req)
    const student = await getAccessibleStudent({
      studentId: req.params.id,
      user
    })
    const teacherId = resolveTeacherScope({
      user,
      student,
      teacherId: req.query.teacherId
    })
    const overview = await buildStudentRewardOverview({
      student,
      teacherId
    })

    res.json({
      message: 'student reward overview fetched successfully',
      data: overview
    })
  } catch (error) {
    console.error('getStudentRewardOverview error:', error)
    res.status(getErrorStatus(error)).json({ message: error.message || 'server error' })
  }
}

const getStudentPointDebt = async (req, res) => {
  try {
    const user = await getRequestUser(req)
    const student = await getAccessibleStudent({
      studentId: req.params.id,
      user
    })
    const teacherId = resolveTeacherScope({
      user,
      student,
      teacherId: req.query.teacherId
    })
    const pointDebtOverview = await pointService.getPointDebtOverview({
      studentId: student._id,
      teacherId,
      limit: Number(req.query.limit) || 20
    })

    res.json({
      message: 'student point debt fetched successfully',
      data: {
        studentId: student._id,
        studentName: student.name,
        teacherId,
        ...pointDebtOverview
      }
    })
  } catch (error) {
    console.error('getStudentPointDebt error:', error)
    res.status(getErrorStatus(error)).json({ message: error.message || 'server error' })
  }
}

const getStudentPointRecords = async (req, res) => {
  try {
    const user = await getRequestUser(req)
    const student = await getAccessibleStudent({
      studentId: req.params.id,
      user
    })
    const teacherId = resolveTeacherScope({
      user,
      student,
      teacherId: req.query.teacherId
    })
    const records = await pointService.listStudentPointRecords({
      studentId: student._id,
      teacherId,
      limit: Number(req.query.limit) || 50,
      skip: Number(req.query.skip) || 0,
      businessType: req.query.businessType || ''
    })

    res.json({
      message: 'student point records fetched successfully',
      data: {
        studentId: student._id,
        studentName: student.name,
        teacherId,
        items: records
      }
    })
  } catch (error) {
    console.error('getStudentPointRecords error:', error)
    res.status(getErrorStatus(error)).json({ message: error.message || 'server error' })
  }
}

const createManualPointAdjustment = async (req, res) => {
  try {
    const user = await getRequestUser(req)
    const student = await getAccessibleStudent({
      studentId: req.params.id,
      user
    })
    const teacherId = resolveTeacherScope({
      user,
      student,
      teacherId: req.body.teacherId || req.query.teacherId
    })

    const result = await pointService.applyManualPointAdjustment({
      studentId: student._id,
      teacherId,
      changeAmount: req.body.changeAmount,
      reason: req.body.reason,
      adjustedBy: user._id,
      adjustedAt: req.body.adjustedAt || new Date()
    })
    const pointDebtOverview = await pointService.getPointDebtOverview({
      studentId: student._id,
      teacherId
    })

    res.status(201).json({
      message: 'manual point adjustment created successfully',
      data: {
        studentId: student._id,
        studentName: student.name,
        teacherId,
        ledger: result.ledger,
        pointBalance: result.balance,
        pointDebtOverview
      }
    })
  } catch (error) {
    console.error('createManualPointAdjustment error:', error)
    res.status(getErrorStatus(error)).json({ message: error.message || 'server error' })
  }
}

const createManualGrowthAdjustment = async (req, res) => {
  try {
    const user = await getRequestUser(req)
    const student = await getAccessibleStudent({
      studentId: req.params.id,
      user
    })
    const teacherId = resolveTeacherScope({
      user,
      student,
      teacherId: req.body.teacherId || req.query.teacherId
    })

    const result = await growthService.applyManualGrowthAdjustment({
      studentId: student._id,
      teacherId,
      changeAmount: req.body.changeAmount,
      reason: req.body.reason,
      adjustedBy: user._id,
      adjustedAt: req.body.adjustedAt || new Date()
    })
    const ruleConfig = await getActivePointRuleConfig()
    const growthOverview = await growthService.getGrowthOverview({
      studentId: student._id,
      teacherId,
      ruleConfig
    })

    res.status(201).json({
      message: 'manual growth adjustment created successfully',
      data: {
        studentId: student._id,
        studentName: student.name,
        teacherId,
        ledger: result.ledger,
        growthSummary: result.summary,
        growthOverview
      }
    })
  } catch (error) {
    console.error('createManualGrowthAdjustment error:', error)
    res.status(getErrorStatus(error)).json({ message: error.message || 'server error' })
  }
}

const buildRewardCatalogScopeQuery = ({ teacherId, includeGlobal = false }) => {
  if (!teacherId) {
    return {}
  }

  if (!includeGlobal) {
    return { teacherId }
  }

  return {
    $or: [
      { teacherId },
      { teacherId: null },
      { teacherId: { $exists: false } }
    ]
  }
}

const generateRewardCode = () => {
  return `reward_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

const normalizeRewardCatalogData = (body = {}, { partial = false } = {}) => {
  const data = {}

  if (!partial || Object.prototype.hasOwnProperty.call(body, 'rewardName')) {
    const rewardName = (body.rewardName || '').toString().trim()
    if (!rewardName) {
      throw createHttpError('rewardName is required', 400)
    }
    data.rewardName = rewardName
  }

  if (!partial || Object.prototype.hasOwnProperty.call(body, 'rewardType')) {
    data.rewardType = body.rewardType === 'advanced' ? 'advanced' : 'normal'
  }

  if (Object.prototype.hasOwnProperty.call(body, 'coverImage')) {
    data.coverImage = (body.coverImage || '').toString().trim()
  }

  if (Object.prototype.hasOwnProperty.call(body, 'description')) {
    data.description = (body.description || '').toString().trim()
  }

  if (!partial || Object.prototype.hasOwnProperty.call(body, 'costPoints')) {
    const costPoints = Number(body.costPoints)
    if (!Number.isFinite(costPoints) || costPoints < 0) {
      throw createHttpError('costPoints must be a non-negative number', 400)
    }
    data.costPoints = Math.round(costPoints)
  }

  if (!partial || Object.prototype.hasOwnProperty.call(body, 'requiredGrowthGateType')) {
    const gateType = ['none', 'moon', 'sun'].includes(body.requiredGrowthGateType)
      ? body.requiredGrowthGateType
      : 'none'
    data.requiredGrowthGateType = gateType
  }

  if (!partial || Object.prototype.hasOwnProperty.call(body, 'requiredGrowthGateValue')) {
    const gateValue = Number(body.requiredGrowthGateValue || 0)
    if (!Number.isFinite(gateValue) || gateValue < 0) {
      throw createHttpError('requiredGrowthGateValue must be a non-negative number', 400)
    }
    data.requiredGrowthGateValue = Math.round(gateValue)
  }

  if (Object.prototype.hasOwnProperty.call(body, 'stockQty')) {
    if (body.stockQty === '' || body.stockQty === null || body.stockQty === undefined) {
      data.stockQty = null
    } else {
      const stockQty = Number(body.stockQty)
      if (!Number.isFinite(stockQty) || stockQty < 0) {
        throw createHttpError('stockQty must be a non-negative number', 400)
      }
      data.stockQty = Math.round(stockQty)
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, 'sortOrder')) {
    const sortOrder = Number(body.sortOrder || 0)
    data.sortOrder = Number.isFinite(sortOrder) ? Math.round(sortOrder) : 0
  }

  if (Object.prototype.hasOwnProperty.call(body, 'enabled')) {
    data.enabled = parseBooleanValue(body.enabled, true)
  } else if (!partial) {
    data.enabled = true
  }

  if (Object.prototype.hasOwnProperty.call(body, 'actualCost')) {
    if (body.actualCost === '' || body.actualCost === null || body.actualCost === undefined) {
      data.actualCost = null
    } else {
      const actualCost = Number(body.actualCost)
      if (!Number.isFinite(actualCost) || actualCost < 0) {
        throw createHttpError('actualCost must be a non-negative number', 400)
      }
      data.actualCost = actualCost
    }
  }

  return data
}

const ensureRewardCatalogAccess = async ({ catalogId, user }) => {
  const catalog = await RewardCatalog.findById(catalogId)
  if (!catalog) {
    throw createHttpError('reward catalog not found', 404)
  }

  if (user.role !== 'admin' && String(catalog.teacherId || '') !== String(user._id)) {
    throw createHttpError('forbidden', 403)
  }

  return catalog
}

const getRewardCatalogs = async (req, res) => {
  try {
    const user = await getRequestUser(req)
    const manageMode = req.query.manage === '1'
    const includeDisabled = manageMode || (req.query.includeDisabled === '1' && user.role === 'admin')
    let catalogTeacherId = user.role === 'teacher'
      ? user._id
      : (req.query.teacherId || null)
    let includeGlobalCatalogs = !manageMode

    let studentRewardState = null

    if (req.query.studentId) {
      const student = await getAccessibleStudent({
        studentId: req.query.studentId,
        user
      })
      const teacherId = resolveTeacherScope({
        user,
        student,
        teacherId: req.query.teacherId
      })
      studentRewardState = await buildStudentRewardOverview({
        student,
        teacherId
      })
      catalogTeacherId = teacherId
      includeGlobalCatalogs = true
    }

    const catalogQuery = {
      ...buildRewardCatalogScopeQuery({
        teacherId: catalogTeacherId,
        includeGlobal: includeGlobalCatalogs
      })
    }

    if (!includeDisabled) {
      catalogQuery.enabled = true
    }

    const rewardCatalogs = await RewardCatalog.find(catalogQuery)
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean()

    const items = rewardCatalogs.map(item => {
      if (!studentRewardState) {
        return item
      }

      const gateSatisfied = growthService.isGrowthGateSatisfied({
        totalGrowthStars: studentRewardState.growthOverview.totalGrowthStars,
        gateType: item.requiredGrowthGateType,
        gateValue: item.requiredGrowthGateValue,
        ruleConfig: studentRewardState.ruleConfig
      })
      const pointBalanceEnough = (studentRewardState.pointBalance.availablePoints || 0) >= (item.costPoints || 0)
      const stockAvailable = item.stockQty === undefined || item.stockQty === null || item.stockQty > 0

      return {
        ...item,
        gateSatisfied,
        pointBalanceEnough,
        stockAvailable,
        canRedeem: Boolean(item.enabled && gateSatisfied && pointBalanceEnough && stockAvailable)
      }
    })

    res.json({
      message: 'reward catalogs fetched successfully',
      data: {
        studentRewardState,
        items
      }
    })
  } catch (error) {
    console.error('getRewardCatalogs error:', error)
    res.status(getErrorStatus(error)).json({ message: error.message || 'server error' })
  }
}

const createRewardCatalog = async (req, res) => {
  try {
    const user = await getRequestUser(req)
    const teacherId = user.role === 'teacher'
      ? user._id
      : (req.body.teacherId || null)
    const rewardCode = (req.body.rewardCode || '').toString().trim() || generateRewardCode()
    const catalogData = normalizeRewardCatalogData(req.body)

    if (!teacherId && user.role !== 'admin') {
      throw createHttpError('teacherId is required', 400)
    }

    const rewardCatalog = await RewardCatalog.create({
      ...catalogData,
      teacherId,
      rewardCode
    })

    res.status(201).json({
      message: 'reward catalog created successfully',
      data: rewardCatalog
    })
  } catch (error) {
    console.error('createRewardCatalog error:', error)
    res.status(getErrorStatus(error)).json({ message: error.message || 'server error' })
  }
}

const updateRewardCatalog = async (req, res) => {
  try {
    const user = await getRequestUser(req)
    const rewardCatalog = await ensureRewardCatalogAccess({
      catalogId: req.params.id,
      user
    })
    const catalogData = normalizeRewardCatalogData(req.body, { partial: true })

    Object.assign(rewardCatalog, catalogData)
    await rewardCatalog.save()

    res.json({
      message: 'reward catalog updated successfully',
      data: rewardCatalog
    })
  } catch (error) {
    console.error('updateRewardCatalog error:', error)
    res.status(getErrorStatus(error)).json({ message: error.message || 'server error' })
  }
}

const deleteRewardCatalog = async (req, res) => {
  try {
    const user = await getRequestUser(req)
    const rewardCatalog = await ensureRewardCatalogAccess({
      catalogId: req.params.id,
      user
    })

    rewardCatalog.enabled = false
    await rewardCatalog.save()

    res.json({
      message: 'reward catalog disabled successfully',
      data: rewardCatalog
    })
  } catch (error) {
    console.error('deleteRewardCatalog error:', error)
    res.status(getErrorStatus(error)).json({ message: error.message || 'server error' })
  }
}

const listRewardRedemptions = async (req, res) => {
  try {
    const user = await getRequestUser(req)
    const query = {}

    if (req.query.status) {
      query.status = req.query.status
    }

    if (req.query.studentId) {
      const student = await getAccessibleStudent({
        studentId: req.query.studentId,
        user
      })
      const teacherId = resolveTeacherScope({
        user,
        student,
        teacherId: req.query.teacherId
      })

      query.studentId = student._id
      query.teacherId = teacherId
    } else if (user.role === 'teacher') {
      query.teacherId = user._id
    } else if (req.query.teacherId) {
      query.teacherId = req.query.teacherId
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200)
    const skip = Math.max(Number(req.query.skip) || 0, 0)

    const redemptions = await RewardRedemption.find(query)
      .sort({ requestedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const studentIds = [
      ...new Set(redemptions.map(item => String(item.studentId)))
    ]
    const students = studentIds.length > 0
      ? await Student.find({
          _id: { $in: studentIds }
        })
          .select('name')
          .lean()
      : []
    const studentNameMap = new Map(
      students.map(item => [String(item._id), item.name])
    )

    res.json({
      message: 'reward redemptions fetched successfully',
      data: redemptions.map(item => ({
        ...item,
        studentName: studentNameMap.get(String(item.studentId)) || ''
      }))
    })
  } catch (error) {
    console.error('listRewardRedemptions error:', error)
    res.status(getErrorStatus(error)).json({ message: error.message || 'server error' })
  }
}

const createLessonRewardSettlement = async (req, res) => {
  try {
    const user = await getRequestUser(req)
    await ensureLessonRecordAccess({
      lessonRecordId: req.params.id,
      user
    })

    const result = await rewardSettlementService.settleLessonReward({
      lessonRecordId: req.params.id,
      issueLessonReward: parseBooleanValue(req.body.issueLessonReward, true),
      lessonRewardValue: req.body.lessonRewardValue,
      practiceRewardValue: req.body.practiceRewardValue ?? 0,
      remark: req.body.remark || null,
      settledBy: user._id,
      settledAt: req.body.settledAt || new Date()
    })

    res.status(201).json({
      message: 'lesson reward settlement created successfully',
      data: result
    })
  } catch (error) {
    console.error('createLessonRewardSettlement error:', error)
    res.status(getErrorStatus(error)).json({ message: error.message || 'server error' })
  }
}

const voidLessonRewardSettlement = async (req, res) => {
  try {
    const user = await getRequestUser(req)
    await ensureSettlementAccess({
      settlementId: req.params.id,
      user
    })

    const result = await rewardSettlementService.voidRewardSettlement({
      settlementId: req.params.id,
      voidedBy: user._id,
      voidReason: req.body.voidReason,
      voidedAt: req.body.voidedAt || new Date()
    })

    res.json({
      message: 'lesson reward settlement voided successfully',
      data: result
    })
  } catch (error) {
    console.error('voidLessonRewardSettlement error:', error)
    res.status(getErrorStatus(error)).json({ message: error.message || 'server error' })
  }
}

const createRewardRedemption = async (req, res) => {
  try {
    const user = await getRequestUser(req)
    const student = await getAccessibleStudent({
      studentId: req.body.studentId,
      user
    })
    const teacherId = resolveTeacherScope({
      user,
      student,
      teacherId: req.body.teacherId
    })

    const result = await rewardRedemptionService.redeemReward({
      studentId: student._id,
      teacherId,
      rewardCode: req.body.rewardCode,
      requestedByType: user.role === 'admin' ? 'system' : 'teacher',
      requestedById: user._id,
      requestedAt: req.body.requestedAt || new Date(),
      remark: req.body.remark || null
    })

    res.status(201).json({
      message: 'reward redemption created successfully',
      data: result
    })
  } catch (error) {
    console.error('createRewardRedemption error:', error)
    res.status(getErrorStatus(error)).json({ message: error.message || 'server error' })
  }
}

const approveRewardRedemption = async (req, res) => {
  try {
    const user = await getRequestUser(req)
    await ensureRedemptionAccess({
      redemptionId: req.params.id,
      user
    })

    const redemption = await rewardRedemptionService.approveRewardRedemption({
      redemptionId: req.params.id,
      approvedBy: user._id,
      approvedAt: req.body.approvedAt || new Date()
    })

    res.json({
      message: 'reward redemption approved successfully',
      data: redemption
    })
  } catch (error) {
    console.error('approveRewardRedemption error:', error)
    res.status(getErrorStatus(error)).json({ message: error.message || 'server error' })
  }
}

const deliverRewardRedemption = async (req, res) => {
  try {
    const user = await getRequestUser(req)
    await ensureRedemptionAccess({
      redemptionId: req.params.id,
      user
    })

    const redemption = await rewardRedemptionService.deliverRewardRedemption({
      redemptionId: req.params.id,
      deliveredAt: req.body.deliveredAt || new Date()
    })

    res.json({
      message: 'reward redemption delivered successfully',
      data: redemption
    })
  } catch (error) {
    console.error('deliverRewardRedemption error:', error)
    res.status(getErrorStatus(error)).json({ message: error.message || 'server error' })
  }
}

const rejectRewardRedemption = async (req, res) => {
  try {
    const user = await getRequestUser(req)
    await ensureRedemptionAccess({
      redemptionId: req.params.id,
      user
    })

    const redemption = await rewardRedemptionService.rejectRewardRedemption({
      redemptionId: req.params.id,
      rejectedBy: user._id,
      reason: req.body.reason || 'manual_reject',
      rejectedAt: req.body.rejectedAt || new Date()
    })

    res.json({
      message: 'reward redemption rejected successfully',
      data: redemption
    })
  } catch (error) {
    console.error('rejectRewardRedemption error:', error)
    res.status(getErrorStatus(error)).json({ message: error.message || 'server error' })
  }
}

module.exports = {
  getStudentRanking,
  getStudentRewardOverview,
  getStudentPointDebt,
  getStudentPointRecords,
  createManualPointAdjustment,
  createManualGrowthAdjustment,
  getRewardCatalogs,
  createRewardCatalog,
  updateRewardCatalog,
  deleteRewardCatalog,
  listRewardRedemptions,
  createLessonRewardSettlement,
  voidLessonRewardSettlement,
  createRewardRedemption,
  approveRewardRedemption,
  deliverRewardRedemption,
  rejectRewardRedemption
}
