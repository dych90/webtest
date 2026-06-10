const crypto = require('crypto')
const GuardianBinding = require('../models/GuardianBinding')
const GuardianInvite = require('../models/GuardianInvite')
const Student = require('../models/Student')
const User = require('../models/User')
const Course = require('../models/Course')
const LessonRecord = require('../models/LessonRecord')
const LessonBalance = require('../models/LessonBalance')
const Payment = require('../models/Payment')
const { generateGuardianToken } = require('../utils/jwt')
const { getOpenIdByCode } = require('../utils/wechat')

const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000

const getShanghaiDayRange = (dayOffset = 0, baseDate = new Date()) => {
  const shanghaiDate = new Date(baseDate.getTime() + SHANGHAI_OFFSET_MS)
  shanghaiDate.setUTCDate(shanghaiDate.getUTCDate() + dayOffset)

  const year = shanghaiDate.getUTCFullYear()
  const month = shanghaiDate.getUTCMonth()
  const day = shanghaiDate.getUTCDate()

  const start = new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - SHANGHAI_OFFSET_MS)
  const end = new Date(Date.UTC(year, month, day + 1, 0, 0, 0, 0) - SHANGHAI_OFFSET_MS)

  return { start, end }
}

const getStudentSelect = () => {
  return 'name gender birthday phone parentName parentPhone paymentType defaultCourseTypeId currentPrice pianoStartDate learningProgress learningPlan practiceTeacher teacherId'
}

const getActiveGuardianBindings = async (openId) => {
  return GuardianBinding.find({ openId, status: 'active' })
    .populate({
      path: 'studentId',
      select: getStudentSelect(),
      populate: { path: 'defaultCourseTypeId', select: 'name duration' }
    })
    .populate('teacherId', 'name phone username')
    .sort({ createdAt: 1 })
}

const formatBindingStudent = (binding, balanceMap = {}) => {
  const student = binding.studentId?.toObject ? binding.studentId.toObject() : binding.studentId
  const teacher = binding.teacherId?.toObject ? binding.teacherId.toObject() : binding.teacherId

  if (!student) return null

  return {
    ...student,
    teacher,
    bindingId: binding._id,
    relation: binding.relation,
    remainingLessons: balanceMap[student._id.toString()] || 0
  }
}

const buildGuardianSession = async (openId) => {
  const bindings = await getActiveGuardianBindings(openId)
  const studentIds = bindings.map(binding => binding.studentId?._id).filter(Boolean)
  const balances = await LessonBalance.find({ studentId: { $in: studentIds } })
  const balanceMap = {}
  balances.forEach(balance => {
    balanceMap[balance.studentId.toString()] = balance.remainingLessons
  })

  const students = bindings
    .map(binding => formatBindingStudent(binding, balanceMap))
    .filter(Boolean)

  return {
    token: generateGuardianToken(openId),
    guardian: { openId },
    students
  }
}

const getAccessibleBinding = async (openId, studentId) => {
  return GuardianBinding.findOne({
    openId,
    studentId,
    status: 'active'
  })
}

const requireGuardianStudent = async (req, res) => {
  const { studentId } = req.params
  const binding = await getAccessibleBinding(req.guardianOpenId, studentId)

  if (!binding) {
    res.status(403).json({ message: '无权查看该学生信息' })
    return null
  }

  return binding
}

const createInvite = async (req, res) => {
  try {
    const { studentId } = req.body

    if (!studentId) {
      return res.status(400).json({ message: '缺少 studentId 参数' })
    }

    const user = await User.findById(req.userId)
    const student = await Student.findById(studentId)

    if (!student) {
      return res.status(404).json({ message: '学生不存在' })
    }

    if (!user || (user.role !== 'admin' && student.teacherId.toString() !== req.userId.toString())) {
      return res.status(403).json({ message: '无权为该学生生成家长绑定码' })
    }

    const token = crypto.randomBytes(16).toString('hex')
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const teacherId = student.teacherId

    const invite = await GuardianInvite.create({
      token,
      studentId: student._id,
      teacherId,
      expiresAt
    })

    res.json({
      message: '生成成功',
      data: {
        token: invite.token,
        expiresAt: invite.expiresAt,
        path: `/pages/guardian/login?invite=${invite.token}`
      }
    })
  } catch (error) {
    console.error('生成家长绑定邀请失败:', error)
    res.status(500).json({ message: error.message || '服务器错误' })
  }
}

const getInviteInfo = async (req, res) => {
  try {
    const { token } = req.params

    const invite = await GuardianInvite.findOne({
      token,
      status: 'active',
      expiresAt: { $gt: new Date() }
    })
      .populate('studentId', 'name')
      .populate('teacherId', 'name phone')

    if (!invite) {
      return res.status(404).json({ message: '绑定邀请不存在或已过期' })
    }

    res.json({
      message: '获取成功',
      data: {
        token: invite.token,
        expiresAt: invite.expiresAt,
        student: invite.studentId,
        teacher: invite.teacherId
      }
    })
  } catch (error) {
    console.error('获取家长绑定邀请失败:', error)
    res.status(500).json({ message: error.message || '服务器错误' })
  }
}

const bindByInvite = async (req, res) => {
  try {
    const { code, inviteToken, relation = 'guardian' } = req.body

    if (!code || !inviteToken) {
      return res.status(400).json({ message: '缺少 code 或 inviteToken 参数' })
    }

    const invite = await GuardianInvite.findOne({
      token: inviteToken,
      status: 'active',
      expiresAt: { $gt: new Date() }
    })

    if (!invite) {
      return res.status(404).json({ message: '绑定邀请不存在或已过期' })
    }

    const openId = await getOpenIdByCode(code)

    await GuardianBinding.findOneAndUpdate(
      { openId, studentId: invite.studentId },
      {
        $set: {
          teacherId: invite.teacherId,
          relation,
          status: 'active',
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true, new: true }
    )

    const session = await buildGuardianSession(openId)

    res.json({
      message: '绑定成功',
      data: session
    })
  } catch (error) {
    console.error('家长绑定失败:', error)
    res.status(500).json({ message: error.message || '服务器错误' })
  }
}

const login = async (req, res) => {
  try {
    const { code } = req.body

    if (!code) {
      return res.status(400).json({ message: '缺少 code 参数' })
    }

    const openId = await getOpenIdByCode(code)
    const session = await buildGuardianSession(openId)

    if (session.students.length === 0) {
      return res.status(404).json({ message: '当前微信尚未绑定学生，请联系老师获取绑定码' })
    }

    res.json({
      message: '登录成功',
      data: session
    })
  } catch (error) {
    console.error('家长端登录失败:', error)
    res.status(500).json({ message: error.message || '服务器错误' })
  }
}

const getStudents = async (req, res) => {
  try {
    const session = await buildGuardianSession(req.guardianOpenId)

    res.json({
      message: '获取成功',
      data: session.students
    })
  } catch (error) {
    console.error('获取家长绑定学生失败:', error)
    res.status(500).json({ message: error.message || '服务器错误' })
  }
}

const getOverview = async (req, res) => {
  try {
    const binding = await requireGuardianStudent(req, res)
    if (!binding) return

    const student = await Student.findById(binding.studentId)
      .select(getStudentSelect())
      .populate('defaultCourseTypeId', 'name duration')
      .populate('teacherId', 'name phone username')

    const balance = await LessonBalance.findOne({ studentId: binding.studentId })
    const now = new Date()
    const { start: todayStart, end: todayEnd } = getShanghaiDayRange(0, now)

    const [nextCourse, todayCourses, recentLessonRecords, recentPayments] = await Promise.all([
      Course.findOne({
        studentId: binding.studentId,
        startTime: { $gte: now },
        status: 'normal'
      }).sort({ startTime: 1 }).populate('courseTypeId', 'name duration').populate('teacherId', 'name phone username'),
      Course.find({
        studentId: binding.studentId,
        startTime: { $gte: todayStart, $lt: todayEnd }
      }).sort({ startTime: 1 }).populate('courseTypeId', 'name duration').populate('teacherId', 'name phone username'),
      LessonRecord.find({ studentId: binding.studentId })
        .sort({ recordDate: -1 })
        .limit(5)
        .select('-notes')
        .populate('courseTypeId', 'name duration')
        .populate('courseId', 'startTime endTime status'),
      Payment.find({ studentId: binding.studentId })
        .sort({ paymentDate: -1 })
        .select('-notes')
        .limit(5)
    ])

    res.json({
      message: '获取成功',
      data: {
        student,
        balance: balance || { remainingLessons: 0 },
        nextCourse,
        todayCourses,
        recentLessonRecords,
        recentPayments
      }
    })
  } catch (error) {
    console.error('获取家长端学生概览失败:', error)
    res.status(500).json({ message: error.message || '服务器错误' })
  }
}

const getCourses = async (req, res) => {
  try {
    const binding = await requireGuardianStudent(req, res)
    if (!binding) return

    const { startTime, endTime } = req.query
    const filter = { studentId: binding.studentId }

    if (startTime && endTime) {
      filter.startTime = {
        $gte: new Date(startTime),
        $lte: new Date(endTime)
      }
    }

    const courses = await Course.find(filter)
      .sort({ startTime: 1 })
      .select('-notes -reminderSent')
      .populate('courseTypeId', 'name duration')
      .populate('teacherId', 'name phone username')

    res.json({
      message: '获取成功',
      data: courses
    })
  } catch (error) {
    console.error('获取家长端课程失败:', error)
    res.status(500).json({ message: error.message || '服务器错误' })
  }
}

const getLessonRecords = async (req, res) => {
  try {
    const binding = await requireGuardianStudent(req, res)
    if (!binding) return

    const records = await LessonRecord.find({ studentId: binding.studentId })
      .sort({ recordDate: -1 })
      .select('-notes')
      .populate('courseTypeId', 'name duration')
      .populate('courseId', 'startTime endTime status')

    res.json({
      message: '获取成功',
      data: records
    })
  } catch (error) {
    console.error('获取家长端消课记录失败:', error)
    res.status(500).json({ message: error.message || '服务器错误' })
  }
}

const getPayments = async (req, res) => {
  try {
    const binding = await requireGuardianStudent(req, res)
    if (!binding) return

    const payments = await Payment.find({ studentId: binding.studentId })
      .sort({ paymentDate: -1 })
      .select('-notes')

    res.json({
      message: '获取成功',
      data: payments
    })
  } catch (error) {
    console.error('获取家长端缴费记录失败:', error)
    res.status(500).json({ message: error.message || '服务器错误' })
  }
}

const getBalance = async (req, res) => {
  try {
    const binding = await requireGuardianStudent(req, res)
    if (!binding) return

    const balance = await LessonBalance.findOne({ studentId: binding.studentId })

    res.json({
      message: '获取成功',
      data: balance || { studentId: binding.studentId, remainingLessons: 0 }
    })
  } catch (error) {
    console.error('获取家长端课时余额失败:', error)
    res.status(500).json({ message: error.message || '服务器错误' })
  }
}

const subscribe = async (req, res) => {
  try {
    await GuardianBinding.updateMany(
      { openId: req.guardianOpenId, status: 'active' },
      { $set: { lastSubscribedAt: new Date(), updatedAt: new Date() } }
    )

    res.json({ message: '订阅状态已记录' })
  } catch (error) {
    console.error('记录家长端订阅状态失败:', error)
    res.status(500).json({ message: error.message || '服务器错误' })
  }
}

module.exports = {
  createInvite,
  getInviteInfo,
  bindByInvite,
  login,
  getStudents,
  getOverview,
  getCourses,
  getLessonRecords,
  getPayments,
  getBalance,
  subscribe
}
