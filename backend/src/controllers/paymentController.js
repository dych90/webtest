const Payment = require('../models/Payment')
const Student = require('../models/Student')
const LessonBalance = require('../models/LessonBalance')
const User = require('../models/User')
const {
  canAccessTeacherAccount,
  getDocumentTeacherId,
  getScopedBalanceKey,
  getTeacherAccountFilter,
  getTeacherAccountId,
  getTeacherAccountScope
} = require('../utils/teacherAccount')
const { isSameId } = require('../utils/studentAccess')
const {
  attachAccountBillingToStudent,
  getEffectivePaymentType
} = require('../utils/studentAccount')

const getPaymentLessons = (payment) => {
  return (Number(payment.totalLessons) || 0) + (Number(payment.bonusLessons) || 0)
}

const buildAdminTeacherAccountFilter = async (teacherId) => {
  if (!teacherId) return null

  const ownedStudents = await Student.find({ teacherId }).select('_id')
  return getTeacherAccountFilter(teacherId, ownedStudents.map(student => student._id))
}

const buildPaymentFilter = async (user, { studentId, teacherId }) => {
  const isTeacher = user && user.role !== 'admin'
  const filter = {}

  if (isTeacher) {
    const scope = await getTeacherAccountScope(user._id, studentId)
    if (!scope.allowed) return null

    filter.studentId = { $in: scope.studentIds }
    Object.assign(filter, scope.accountFilter)
    return filter
  }

  if (studentId) {
    filter.studentId = studentId
  }

  if (teacherId) {
    Object.assign(filter, await buildAdminTeacherAccountFilter(teacherId))
  }

  return filter
}

const buildBalanceMap = async (payments, accountFilter) => {
  const studentIds = [...new Set(payments.map(payment => payment.studentId?._id).filter(Boolean))]
  if (!studentIds.length) return {}

  const balanceQuery = { studentId: { $in: studentIds } }
  if (accountFilter?.$or) {
    balanceQuery.$or = accountFilter.$or
  }

  const balances = await LessonBalance.find(balanceQuery)
    .populate('studentId', 'teacherId')
  const balanceMap = {}

  balances.forEach(balance => {
    const student = balance.studentId
    const teacherId = balance.teacherId || student?.teacherId
    balanceMap[getScopedBalanceKey(student?._id || balance.studentId, teacherId)] = balance.remainingLessons
  })

  return balanceMap
}

const attachBalancesToPayments = async (payments, accountFilter) => {
  const balanceMap = await buildBalanceMap(payments, accountFilter)

  return Promise.all(payments.map(async (item) => {
    const payment = item.toObject()
    if (payment.studentId) {
      const teacherId = payment.teacherId?._id || payment.teacherId || payment.studentId.teacherId
      const key = getScopedBalanceKey(payment.studentId._id, teacherId)
      payment.studentId = await attachAccountBillingToStudent(payment.studentId, teacherId)
      payment.studentId.remainingLessons = balanceMap[key] || 0
    }
    return payment
  }))
}

const assertPaymentAccountAccess = async (payment, user) => {
  const student = payment.studentId?._id ? payment.studentId : await Student.findById(payment.studentId)
  const accountTeacherId = getDocumentTeacherId(payment, student)

  if (!canAccessTeacherAccount(student, user, accountTeacherId)) {
    return null
  }

  return { student, accountTeacherId }
}

const updateLessonBalance = async (studentId, teacherId, lessonsChange) => {
  if (!studentId || !teacherId || !lessonsChange) return

  try {
    console.log('updateLessonBalance调用，学生ID:', studentId, '老师ID:', teacherId, '课时变化:', lessonsChange)

    const result = await LessonBalance.findOneAndUpdate(
      { studentId, teacherId },
      {
        $inc: { remainingLessons: lessonsChange },
        $set: { lastUpdated: new Date() }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )
    console.log('更新后余额:', result.remainingLessons)
  } catch (error) {
    console.error('更新课费余额错误:', error)
  }
}

const getPayments = async (req, res) => {
  try {
    const { studentId, teacherId } = req.query
    const user = await User.findById(req.userId)
    const filter = await buildPaymentFilter(user, { studentId, teacherId })

    if (!filter) {
      return res.json({ message: '获取成功', data: [] })
    }

    const payments = await Payment.find(filter)
      .sort({ paymentDate: -1 })
      .populate('studentId', 'name phone paymentType currentPrice priceEffectiveDate teacherId practiceTeacherId')
      .populate('teacherId', 'name username')

    const paymentsWithBalance = await attachBalancesToPayments(payments, filter)

    res.json({
      message: '获取成功',
      data: paymentsWithBalance
    })
  } catch (error) {
    console.error('获取缴费列表错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params
    const user = await User.findById(req.userId)
    const isTeacher = user && user.role !== 'admin'

    const payment = await Payment.findById(id)
      .populate('studentId', 'name phone paymentType currentPrice priceEffectiveDate teacherId practiceTeacherId')
      .populate('teacherId', 'name username')

    if (!payment) {
      return res.status(404).json({ message: '缴费记录不存在' })
    }

    const account = await assertPaymentAccountAccess(payment, user)
    if (isTeacher && !account) {
      return res.status(403).json({ message: '无权限查看此缴费记录' })
    }

    const paymentData = payment.toObject()
    if (paymentData.studentId) {
      const accountTeacherId = account?.accountTeacherId || getDocumentTeacherId(payment, payment.studentId)
      paymentData.studentId = await attachAccountBillingToStudent(paymentData.studentId, accountTeacherId)
    }

    res.json({
      message: '获取成功',
      data: paymentData
    })
  } catch (error) {
    console.error('获取缴费详情错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const createPayment = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
    const student = await Student.findById(req.body.studentId)

    if (!student) {
      return res.status(404).json({ message: '学生不存在' })
    }

    const accountTeacherId = getTeacherAccountId(student, user, req.body.teacherId)
    if (!canAccessTeacherAccount(student, user, accountTeacherId)) {
      return res.status(403).json({ message: '无权限为此学生创建缴费记录' })
    }

    const accountPaymentType = await getEffectivePaymentType(student, accountTeacherId)

    if (accountPaymentType === 'free') {
      return res.status(400).json({ message: '免费学生不需要创建缴费记录' })
    }

    const payment = await Payment.create({
      ...req.body,
      teacherId: accountTeacherId
    })

    if (accountPaymentType === 'prepaid') {
      await updateLessonBalance(payment.studentId, accountTeacherId, getPaymentLessons(payment))
    } else {
      console.log('学生为单次付费模式，不更新课时余额')
    }

    res.json({
      message: '创建成功',
      data: payment
    })
  } catch (error) {
    console.error('创建缴费记录错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const updatePayment = async (req, res) => {
  try {
    const { id } = req.params
    const user = await User.findById(req.userId)
    const isTeacher = user && user.role !== 'admin'

    const oldPayment = await Payment.findById(id).populate('studentId')

    if (!oldPayment) {
      return res.status(404).json({ message: '缴费记录不存在' })
    }

    const oldAccount = await assertPaymentAccountAccess(oldPayment, user)
    if (isTeacher && !oldAccount) {
      return res.status(403).json({ message: '无权限修改此缴费记录' })
    }

    const oldStudent = oldAccount?.student || oldPayment.studentId
    const targetStudentId = req.body.studentId || oldStudent._id || oldStudent
    const targetStudent = isSameId(targetStudentId, oldStudent._id)
      ? oldStudent
      : await Student.findById(targetStudentId)

    if (!targetStudent) {
      return res.status(404).json({ message: '学生不存在' })
    }

    const accountTeacherId = getTeacherAccountId(
      targetStudent,
      user,
      req.body.teacherId || oldPayment.teacherId || oldAccount?.accountTeacherId
    )

    if (!canAccessTeacherAccount(targetStudent, user, accountTeacherId)) {
      return res.status(403).json({ message: '无权限将缴费记录分配给此老师账户' })
    }

    const oldPaymentType = await getEffectivePaymentType(oldStudent, oldAccount.accountTeacherId)
    const targetPaymentType = await getEffectivePaymentType(targetStudent, accountTeacherId)

    if (targetPaymentType === 'free') {
      return res.status(400).json({ message: '免费学生不需要缴费记录' })
    }

    const updateData = {
      ...req.body,
      teacherId: accountTeacherId
    }
    const payment = await Payment.findByIdAndUpdate(id, updateData, { new: true })

    if (oldPaymentType === 'prepaid') {
      await updateLessonBalance(oldStudent._id, oldAccount.accountTeacherId, -getPaymentLessons(oldPayment))
    }
    if (targetPaymentType === 'prepaid') {
      await updateLessonBalance(payment.studentId, accountTeacherId, getPaymentLessons(payment))
    }

    res.json({
      message: '更新成功',
      data: payment
    })
  } catch (error) {
    console.error('更新缴费记录错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const deletePayment = async (req, res) => {
  try {
    const { id } = req.params
    const user = await User.findById(req.userId)
    const isTeacher = user && user.role !== 'admin'

    const payment = await Payment.findById(id).populate('studentId')

    if (!payment) {
      return res.status(404).json({ message: '缴费记录不存在' })
    }

    const account = await assertPaymentAccountAccess(payment, user)
    if (isTeacher && !account) {
      return res.status(403).json({ message: '无权限删除此缴费记录' })
    }

    const accountPaymentType = account?.student
      ? await getEffectivePaymentType(account.student, account.accountTeacherId)
      : ''
    if (account.student && accountPaymentType === 'prepaid') {
      await updateLessonBalance(payment.studentId, account.accountTeacherId, -getPaymentLessons(payment))
    }

    await Payment.findByIdAndDelete(id)

    res.json({ message: '删除成功' })
  } catch (error) {
    console.error('删除缴费记录错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

module.exports = {
  getPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment
}
