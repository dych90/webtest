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
    const { teacherId, month } = req.query
    
    console.log('========== 统计API调用 ==========')
    console.log('请求参数 - teacherId:', teacherId, 'month:', month)
    console.log('用户角色:', isTeacher ? '教师' : '管理员')
    
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
    console.log('总缴费记录数:', payments.length)
    
    if (payments.length > 0) {
      console.log('第一条缴费记录示例:', {
        _id: payments[0]._id,
        paymentDate: payments[0].paymentDate,
        amount: payments[0].amount
      })
    }
    
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0)
    const totalLessonsSold = payments.reduce((sum, p) => sum + p.totalLessons, 0)
    
    const courseQuery = (isTeacher || teacherId) ? { teacherId: teacherId || req.userId } : {}
    const courses = await Course.find(courseQuery)
    const totalCourses = courses.length
    
    const lessonRecordQuery = (isTeacher || teacherId) ? { studentId: { $in: studentIds } } : {}
    const lessonRecords = await LessonRecord.find(lessonRecordQuery)
    console.log('总消课记录数:', lessonRecords.length)
    
    if (lessonRecords.length > 0) {
      console.log('第一条消课记录示例:', {
        _id: lessonRecords[0]._id,
        recordDate: lessonRecords[0].recordDate,
        courseStartTime: lessonRecords[0].courseStartTime,
        lessonsConsumed: lessonRecords[0].lessonsConsumed
      })
    }
    
    const totalLessonsConsumed = lessonRecords.reduce((sum, r) => sum + r.lessonsConsumed, 0)
    const totalLessonsAttended = lessonRecords.length
    
    const balanceQuery = (isTeacher || teacherId) ? { studentId: { $in: studentIds } } : {}
    const balances = await LessonBalance.find(balanceQuery)
    const totalRemainingLessons = balances.reduce((sum, b) => sum + b.remainingLessons, 0)
    
    let startOfMonth, endOfMonth
    if (month) {
      const [year, m] = month.split('-').map(Number)
      startOfMonth = new Date(year, m - 1, 1, 0, 0, 0, 0)
      endOfMonth = new Date(year, m, 1, 0, 0, 0, 0)
      console.log(`指定月份: ${year}年${m}月`)
    } else {
      const now = new Date()
      startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0)
      console.log('使用当前月份')
    }
    
    console.log('时间范围:', {
      start: startOfMonth.toISOString(),
      end: endOfMonth.toISOString()
    })
    
    const monthlyPayments = payments.filter(p => {
      if (!p.paymentDate) return false
      const paymentDate = new Date(p.paymentDate)
      if (isNaN(paymentDate.getTime())) {
        console.warn('无效的缴费日期:', p.paymentDate, '记录ID:', p._id)
        return false
      }
      const isInMonth = paymentDate >= startOfMonth && paymentDate < endOfMonth
      return isInMonth
    })
    console.log(`筛选后的月度缴费记录数: ${monthlyPayments.length}`)
    
    const monthlyPrepaidRevenue = monthlyPayments.reduce((sum, p) => sum + p.amount, 0)
    console.log('月度预收入:', monthlyPrepaidRevenue)
    
    const monthlyLessonRecords = lessonRecords.filter(r => {
      let dateToCheck
      if (r.courseStartTime) {
        dateToCheck = new Date(r.courseStartTime)
      } else if (r.recordDate) {
        dateToCheck = new Date(r.recordDate)
      } else {
        return false
      }
      
      if (isNaN(dateToCheck.getTime())) {
        console.warn('无效的课程时间:', r.courseStartTime || r.recordDate, '记录ID:', r._id)
        return false
      }
      
      const isInMonth = dateToCheck >= startOfMonth && dateToCheck < endOfMonth
      return isInMonth
    })
    console.log(`筛选后的月度消课记录数: ${monthlyLessonRecords.length}`)
    
    const monthlyActualRevenue = monthlyLessonRecords.reduce((sum, r) => {
      if (r.isGiftLesson) return sum
      return sum + (r.unitPrice || 0) * r.lessonsConsumed
    }, 0)
    
    const monthlyLessonsConsumed = monthlyLessonRecords.reduce((sum, r) => sum + r.lessonsConsumed, 0)
    const monthlyLessonsAttended = monthlyLessonRecords.length
    
    const monthlyCourses = courses.filter(c => {
      if (!c.startTime) return false
      const courseDate = new Date(c.startTime)
      if (isNaN(courseDate.getTime())) return false
      return courseDate >= startOfMonth && courseDate < endOfMonth
    })
    const monthlyScheduledLessons = monthlyCourses.length
    
    console.log('========== 月度统计数据 ==========')
    console.log('月度实际收入:', monthlyActualRevenue)
    console.log('月度消课数:', monthlyLessonsConsumed)
    console.log('月度上课数:', monthlyLessonsAttended)
    
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
    
    const responseData = {
      studentCount,
      totalRevenue,
      totalLessonsSold,
      totalCourses,
      totalLessonsConsumed,
      totalLessonsAttended,
      totalRemainingLessons,
      monthlyPrepaidRevenue,
      monthlyActualRevenue,
      monthlyLessonsConsumed: monthlyScheduledLessons,
      monthlyLessonsAttended,
      prepaidLessonsConsumed,
      monthlyPrepaidLessonsConsumed,
      paymentCount: payments.length,
      lessonRecordCount: lessonRecords.length
    }
    
    console.log('========== 最终返回数据 ==========')
    console.log('月度预收入:', responseData.monthlyPrepaidRevenue)
    console.log('月度实际收入:', responseData.monthlyActualRevenue)
    console.log('月度应上课时:', responseData.monthlyLessonsConsumed)
    console.log('月度上课数:', responseData.monthlyLessonsAttended)
    console.log('================================')
    
    res.json({
      message: '获取成功',
      data: responseData
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
