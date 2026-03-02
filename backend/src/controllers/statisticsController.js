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
    const { teacherId } = req.query
    
    let studentQuery = {}
    if (isTeacher) {
      studentQuery.teacherId = req.userId
    } else if (teacherId) {
      studentQuery.teacherId = teacherId
    }
    
    const studentCount = await Student.countDocuments(studentQuery)
    
    const students = await Student.find(studentQuery)
    const studentIds = students.map(s => s._id)
    
    const paymentQuery = (isTeacher || teacherId) ? { studentId: { $in: studentIds } } : {}
    const payments = await Payment.find(paymentQuery)
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0)
    const totalLessonsSold = payments.reduce((sum, p) => sum + p.totalLessons, 0)
    
    const courseQuery = (isTeacher || teacherId) ? { teacherId: teacherId || req.userId } : {}
    const courses = await Course.find(courseQuery)
    const totalCourses = courses.length
    
    const lessonRecordQuery = (isTeacher || teacherId) ? { studentId: { $in: studentIds } } : {}
    const lessonRecords = await LessonRecord.find(lessonRecordQuery)
    const totalLessonsConsumed = lessonRecords.reduce((sum, r) => sum + r.lessonsConsumed, 0)
    const totalLessonsAttended = lessonRecords.length
    
    const balanceQuery = (isTeacher || teacherId) ? { studentId: { $in: studentIds } } : {}
    const balances = await LessonBalance.find(balanceQuery)
    const totalRemainingLessons = balances.reduce((sum, b) => sum + b.remainingLessons, 0)
    
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    
    const monthlyPayments = payments.filter(p => {
      const paymentDate = new Date(p.paymentDate)
      return paymentDate >= startOfMonth && paymentDate < endOfMonth
    })
    const monthlyPrepaidRevenue = monthlyPayments.reduce((sum, p) => sum + p.amount, 0)
    
    const monthlyLessonRecords = lessonRecords.filter(r => {
      const courseStartTime = r.courseStartTime ? new Date(r.courseStartTime) : new Date(r.recordDate)
      return courseStartTime >= startOfMonth && courseStartTime < endOfMonth
    })
    
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

const getChartStatistics = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
    const isTeacher = user && user.role !== 'admin'
    const { teacherId, type = 'month', year, month } = req.query
    
    let studentQuery = {}
    if (isTeacher) {
      studentQuery.teacherId = req.userId
    } else if (teacherId) {
      studentQuery.teacherId = teacherId
    }
    
    const students = await Student.find(studentQuery)
    const studentIds = students.map(s => s._id)
    
    const paymentQuery = (isTeacher || teacherId) ? { studentId: { $in: studentIds } } : {}
    const payments = await Payment.find(paymentQuery)
    
    const lessonRecordQuery = (isTeacher || teacherId) ? { studentId: { $in: studentIds } } : {}
    const lessonRecords = await LessonRecord.find(lessonRecordQuery)
    
    const prepaidStudentsFiltered = students.filter(s => s.paymentType === 'prepaid')
    const prepaidStudentIds = prepaidStudentsFiltered.map(s => s._id.toString())
    
    const now = new Date()
    const currentYear = year ? parseInt(year) : now.getFullYear()
    const currentMonth = month ? parseInt(month) - 1 : now.getMonth()
    
    let labels = []
    let prepaidRevenueData = []
    let actualRevenueData = []
    let lessonsConsumedData = []
    let lessonsAttendedData = []
    
    if (type === 'month') {
      labels = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
      
      for (let m = 0; m < 12; m++) {
        const startOfMonth = new Date(currentYear, m, 1)
        const endOfMonth = new Date(currentYear, m + 1, 1)
        
        const monthPayments = payments.filter(p => {
          const paymentDate = new Date(p.paymentDate)
          return paymentDate >= startOfMonth && paymentDate < endOfMonth
        })
        prepaidRevenueData.push(monthPayments.reduce((sum, p) => sum + p.amount, 0))
        
        const monthLessonRecords = lessonRecords.filter(r => {
          const courseStartTime = r.courseStartTime ? new Date(r.courseStartTime) : new Date(r.recordDate)
          return courseStartTime >= startOfMonth && courseStartTime < endOfMonth
        })
        
        const actualRevenue = monthLessonRecords.reduce((sum, r) => {
          if (r.isGiftLesson) return sum
          return sum + (r.unitPrice || 0) * r.lessonsConsumed
        }, 0)
        actualRevenueData.push(actualRevenue)
        
        lessonsConsumedData.push(monthLessonRecords.reduce((sum, r) => sum + r.lessonsConsumed, 0))
        lessonsAttendedData.push(monthLessonRecords.length)
      }
    } else {
      for (let y = currentYear - 4; y <= currentYear; y++) {
        labels.push(`${y}年`)
        
        const startOfYear = new Date(y, 0, 1)
        const endOfYear = new Date(y + 1, 0, 1)
        
        const yearPayments = payments.filter(p => {
          const paymentDate = new Date(p.paymentDate)
          return paymentDate >= startOfYear && paymentDate < endOfYear
        })
        prepaidRevenueData.push(yearPayments.reduce((sum, p) => sum + p.amount, 0))
        
        const yearLessonRecords = lessonRecords.filter(r => {
          const courseStartTime = r.courseStartTime ? new Date(r.courseStartTime) : new Date(r.recordDate)
          return courseStartTime >= startOfYear && courseStartTime < endOfYear
        })
        
        const actualRevenue = yearLessonRecords.reduce((sum, r) => {
          if (r.isGiftLesson) return sum
          return sum + (r.unitPrice || 0) * r.lessonsConsumed
        }, 0)
        actualRevenueData.push(actualRevenue)
        
        lessonsConsumedData.push(yearLessonRecords.reduce((sum, r) => sum + r.lessonsConsumed, 0))
        lessonsAttendedData.push(yearLessonRecords.length)
      }
    }
    
    res.json({
      message: '获取成功',
      data: {
        labels,
        prepaidRevenue: prepaidRevenueData,
        actualRevenue: actualRevenueData,
        lessonsConsumed: lessonsConsumedData,
        lessonsAttended: lessonsAttendedData,
        year: currentYear
      }
    })
  } catch (error) {
    console.error('获取图表统计数据错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

module.exports = {
  getStatistics,
  getChartStatistics
}
