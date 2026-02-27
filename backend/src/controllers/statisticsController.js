const Student = require('../models/Student')
const Payment = require('../models/Payment')
const Course = require('../models/Course')
const LessonRecord = require('../models/LessonRecord')
const LessonBalance = require('../models/LessonBalance')
const User = require('../models/User')

const getStatistics = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
    const isTeacher = user && user.role !== 'admin'
    
    let studentQuery = {}
    if (isTeacher) {
      studentQuery.teacherId = req.userId
    }
    
    const studentCount = await Student.countDocuments(studentQuery)
    
    const students = await Student.find(studentQuery)
    const studentIds = students.map(s => s._id)
    
    const paymentQuery = isTeacher ? { studentId: { $in: studentIds } } : {}
    const payments = await Payment.find(paymentQuery)
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0)
    const totalLessonsSold = payments.reduce((sum, p) => sum + p.totalLessons, 0)
    
    const courseQuery = isTeacher ? { teacherId: req.userId } : {}
    const courses = await Course.find(courseQuery)
    const totalCourses = courses.length
    
    const lessonRecordQuery = isTeacher ? { studentId: { $in: studentIds } } : {}
    const lessonRecords = await LessonRecord.find(lessonRecordQuery)
    const totalLessonsConsumed = lessonRecords.reduce((sum, r) => sum + r.lessonsConsumed, 0)
    const totalLessonsAttended = lessonRecords.length
    
    const balanceQuery = isTeacher ? { studentId: { $in: studentIds } } : {}
    const balances = await LessonBalance.find(balanceQuery)
    const totalRemainingLessons = balances.reduce((sum, b) => sum + b.remainingLessons, 0)
    
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    
    const monthlyPayments = payments.filter(p => 
      p.paymentDate >= startOfMonth && p.paymentDate < endOfMonth
    )
    const monthlyPrepaidRevenue = monthlyPayments.reduce((sum, p) => sum + p.amount, 0)
    
    const monthlyLessonRecords = lessonRecords.filter(r => 
      r.recordDate >= startOfMonth && r.recordDate < endOfMonth
    )
    
    const monthlyActualRevenue = monthlyLessonRecords.reduce((sum, r) => {
      if (r.isGiftLesson) return sum
      return sum + (r.unitPrice || 0) * r.lessonsConsumed
    }, 0)
    
    const monthlyLessonsConsumed = monthlyLessonRecords.reduce((sum, r) => sum + r.lessonsConsumed, 0)
    const monthlyLessonsAttended = monthlyLessonRecords.length
    
    const prepaidStudentsFiltered = students.filter(s => s.paymentType === 'prepaid')
    const prepaidStudentIds = prepaidStudentsFiltered.map(s => s._id.toString())
    
    const prepaidLessonRecords = lessonRecords.filter(r => 
      prepaidStudentIds.includes(r.studentId.toString())
    )
    const prepaidLessonsConsumed = prepaidLessonRecords.reduce((sum, r) => sum + r.lessonsConsumed, 0)
    
    const monthlyPrepaidLessons = monthlyLessonRecords.filter(r => 
      prepaidStudentIds.includes(r.studentId.toString())
    )
    const monthlyPrepaidLessonsConsumed = monthlyPrepaidLessons.reduce((sum, r) => sum + r.lessonsConsumed, 0)
    
    res.json({
      message: '获取成功',
      data: {
        studentCount,
        totalRevenue,
        totalLessonsSold,
        totalCourses,
        totalLessonsConsumed,
        totalLessonsAttended,
        totalRemainingLessons,
        monthlyPrepaidRevenue,
        monthlyActualRevenue,
        monthlyLessonsConsumed,
        monthlyLessonsAttended,
        prepaidLessonsConsumed,
        monthlyPrepaidLessonsConsumed,
        paymentCount: payments.length,
        lessonRecordCount: lessonRecords.length
      }
    })
  } catch (error) {
    console.error('获取统计数据错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

module.exports = {
  getStatistics
}
