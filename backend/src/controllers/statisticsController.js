const Student = require('../models/Student')
const Payment = require('../models/Payment')
const Course = require('../models/Course')
const LessonRecord = require('../models/LessonRecord')
const LessonBalance = require('../models/LessonBalance')

const getStatistics = async (req, res) => {
  try {
    const studentCount = await Student.countDocuments()
    
    const payments = await Payment.find()
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0)
    const totalLessonsSold = payments.reduce((sum, p) => sum + p.totalLessons, 0)
    
    const courses = await Course.find()
    const totalCourses = courses.length
    
    const lessonRecords = await LessonRecord.find()
    const totalLessonsConsumed = lessonRecords.reduce((sum, r) => sum + r.lessonsConsumed, 0)
    const totalLessonsAttended = lessonRecords.length
    
    const balances = await LessonBalance.find()
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
    
    const allStudents = await Student.find()
    
    const prepaidStudentsFiltered = allStudents.filter(s => s.paymentType === 'prepaid')
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
