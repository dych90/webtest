const LessonBalance = require('../models/LessonBalance')
const Student = require('../models/Student')
const User = require('../models/User')
const {
  canAccessTeacherAccount,
  getScopedBalanceKey,
  getTeacherAccountFilter,
  getTeacherAccountId,
  getTeacherAccountScope
} = require('../utils/teacherAccount')
const { getTeacherStudentAccessFilter, isSameId } = require('../utils/studentAccess')
const {
  attachAccountBillingToStudent,
  getEffectivePaymentType
} = require('../utils/studentAccount')

const buildAccountRows = async ({ students, accountTeacherId, accountFilter }) => {
  const studentIds = students.map(student => student._id)
  const balanceQuery = { studentId: { $in: studentIds } }
  if (accountFilter?.$or) {
    balanceQuery.$or = accountFilter.$or
  }

  const balances = await LessonBalance.find(balanceQuery)
    .populate('teacherId', 'name username')
    .populate('studentId', 'teacherId')
  const balanceMap = {}

  balances.forEach(balance => {
    const student = balance.studentId
    const teacherId = balance.teacherId?._id || balance.teacherId || student?.teacherId
    balanceMap[getScopedBalanceKey(student?._id || balance.studentId, teacherId)] = balance
  })

  return Promise.all(students.map(async (student) => {
    const teacherId = accountTeacherId || student.teacherId
    const balance = balanceMap[getScopedBalanceKey(student._id, teacherId)]
    const studentData = await attachAccountBillingToStudent(student, teacherId)
    return {
      studentId: studentData,
      teacherId,
      remainingLessons: balance ? balance.remainingLessons : 0,
      lastUpdated: balance ? balance.lastUpdated : student.createdAt,
      _id: balance ? balance._id : null
    }
  }))
}

const getLessonBalances = async (req, res) => {
  try {
    const { studentId, teacherId } = req.query
    const user = await User.findById(req.userId)
    const isTeacher = user && user.role !== 'admin'

    if (isTeacher) {
      const scope = await getTeacherAccountScope(req.userId, studentId)
      if (!scope.allowed) {
        return res.json({ message: '获取成功', data: [] })
      }

      const students = await Student.find({ _id: { $in: scope.studentIds } })
        .sort({ sortOrder: 1, createdAt: -1 })
      const result = await buildAccountRows({
        students,
        accountTeacherId: req.userId,
        accountFilter: scope.accountFilter
      })

      return res.json({
        message: '获取成功',
        data: result
      })
    }

    const studentQuery = {}
    let accountTeacherId = teacherId || ''
    let accountFilter = null

    if (teacherId) {
      Object.assign(studentQuery, getTeacherStudentAccessFilter(teacherId))
      const ownedStudents = await Student.find({ teacherId }).select('_id')
      accountFilter = getTeacherAccountFilter(teacherId, ownedStudents.map(student => student._id))
    }

    if (studentId) {
      studentQuery._id = studentId
    }

    const students = await Student.find(studentQuery)
      .sort({ sortOrder: 1, createdAt: -1 })
    const result = await buildAccountRows({
      students,
      accountTeacherId,
      accountFilter
    })

    res.json({
      message: '获取成功',
      data: result
    })
  } catch (error) {
    console.error('获取课费余额列表错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const updateLessonBalance = async (req, res) => {
  try {
    const { studentId, remainingLessons } = req.body
    const user = await User.findById(req.userId)
    const student = await Student.findById(studentId)

    if (!student) {
      return res.status(404).json({ message: '学生不存在' })
    }

    const accountTeacherId = getTeacherAccountId(student, user, req.body.teacherId)
    if (!canAccessTeacherAccount(student, user, accountTeacherId)) {
      return res.status(403).json({ message: '无权限更新此学生的课时余额' })
    }

    const accountPaymentType = await getEffectivePaymentType(student, accountTeacherId)

    if (accountPaymentType !== 'prepaid') {
      return res.status(400).json({ message: '只有预付费学生可以更新课时余额' })
    }

    const balance = await LessonBalance.findOneAndUpdate(
      { studentId, teacherId: accountTeacherId },
      {
        remainingLessons,
        teacherId: accountTeacherId,
        lastUpdated: new Date()
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )

    res.json({
      message: '更新成功',
      data: {
        _id: balance._id,
        studentId,
        teacherId: accountTeacherId,
        remainingLessons: balance.remainingLessons
      }
    })
  } catch (error) {
    console.error('更新课费余额错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

module.exports = {
  getLessonBalances,
  updateLessonBalance
}
