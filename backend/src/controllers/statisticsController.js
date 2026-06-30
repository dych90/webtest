const Student = require('../models/Student')
const Payment = require('../models/Payment')
const Course = require('../models/Course')
const LessonRecord = require('../models/LessonRecord')
const LessonBalance = require('../models/LessonBalance')
const User = require('../models/User')
const { getTeacherStudentAccessFilter, isSameId } = require('../utils/studentAccess')
const { getTeacherAccountFilter } = require('../utils/teacherAccount')
const { getAccountCoursePrice } = require('../utils/feeStandard')
const { getEffectivePaymentType } = require('../utils/studentAccount')

const SCHEDULED_COURSE_STATUSES = new Set(['normal', 'completed', 'cancelled'])
const BILLABLE_COURSE_STATUSES = new Set(['normal', 'completed', 'cancelled'])

const toNumber = (value) => Number(value) || 0

const getDocId = (doc) => doc?._id || doc

const isBillableScheduledCourse = (course) => {
  return Boolean(course && BILLABLE_COURSE_STATUSES.has(course.status || 'normal') && !course.isGiftLesson)
}

const isScheduledCourse = (course) => {
  return Boolean(course && SCHEDULED_COURSE_STATUSES.has(course.status || 'normal') && !course.isGiftLesson)
}

const getScheduledCourses = (courses = []) => {
  return courses.filter(isScheduledCourse)
}

const getBillableScheduledCourses = (courses = []) => {
  return courses.filter(isBillableScheduledCourse)
}

const getScheduledCoursePrice = async (course) => {
  const student = course.studentId
  const studentId = getDocId(student)
  const teacherId = getDocId(course.teacherId)
  const courseTypeId = getDocId(course.courseTypeId)

  if (!studentId || !teacherId) return 0

  return getAccountCoursePrice({
    student,
    studentId,
    courseTypeId,
    teacherId,
    at: course.startTime || new Date()
  })
}

const calculateScheduledRevenue = async (courses = []) => {
  const scheduledCourses = getBillableScheduledCourses(courses)
  const prices = await Promise.all(scheduledCourses.map(getScheduledCoursePrice))
  return prices.reduce((sum, price) => sum + price, 0)
}

const buildStudentMap = (students = []) => {
  const map = new Map()
  students.forEach((student) => {
    const studentId = getDocId(student)?.toString()
    if (studentId) {
      map.set(studentId, student)
    }
  })
  return map
}

const getPrepaidLessonRecords = async (records = [], students = [], accountTeacherId = '') => {
  const studentMap = buildStudentMap(students)
  const paymentTypeCache = new Map()

  const prepaidFlags = await Promise.all(records.map(async (record) => {
    const studentId = getDocId(record.studentId)?.toString()
    const student = studentId ? studentMap.get(studentId) : null
    const teacherId = accountTeacherId || getDocId(record.teacherId) || getDocId(student?.teacherId)
    if (!student || !teacherId) return false

    const cacheKey = `${studentId}:${teacherId.toString()}`
    if (!paymentTypeCache.has(cacheKey)) {
      paymentTypeCache.set(cacheKey, await getEffectivePaymentType(student, teacherId))
    }

    return paymentTypeCache.get(cacheKey) === 'prepaid'
  }))

  return records.filter((record, index) => prepaidFlags[index])
}

const getLessonRecordRevenue = async (record) => {
  if (!record || record.isGiftLesson) return 0

  const student = record.studentId
  const studentId = getDocId(student)
  const teacherId = getDocId(record.teacherId) || getDocId(student?.teacherId)
  const courseTypeId = getDocId(record.courseTypeId)

  if (!studentId || !teacherId) {
    return toNumber(record.unitPrice) * toNumber(record.lessonsConsumed)
  }

  const unitPrice = await getAccountCoursePrice({
    student,
    studentId,
    courseTypeId,
    teacherId,
    at: record.courseStartTime || record.courseId?.startTime || record.recordDate || record.createdAt || new Date(),
    fallbackPrice: record.unitPrice
  })

  return unitPrice * toNumber(record.lessonsConsumed)
}

const calculateLessonRecordRevenue = async (records = []) => {
  const revenues = await Promise.all(records.map(getLessonRecordRevenue))
  return revenues.reduce((sum, revenue) => sum + revenue, 0)
}

const getStatistics = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
    const isTeacher = user && user.role !== 'admin'
    const { teacherId, month } = req.query
    
    console.log('========== 统计API调用 ==========')
    console.log('请求参数 - teacherId:', teacherId, 'month:', month)
    console.log('用户角色:', isTeacher ? '教师' : '管理员')
    
    const accountTeacherId = isTeacher ? req.userId : teacherId
    let studentQuery = {}
    if (accountTeacherId) {
      Object.assign(studentQuery, getTeacherStudentAccessFilter(accountTeacherId))
    }
    
    const studentCount = await Student.countDocuments(studentQuery)
    
    const students = await Student.find(studentQuery)
    const studentIds = students.map(s => s._id)
    const ownedStudentIds = accountTeacherId
      ? students.filter(student => isSameId(student.teacherId, accountTeacherId)).map(student => student._id)
      : []
    const accountFilter = accountTeacherId ? getTeacherAccountFilter(accountTeacherId, ownedStudentIds) : null
    
    const paymentQuery = accountTeacherId ? { studentId: { $in: studentIds }, ...accountFilter } : {}
    const payments = await Payment.find(paymentQuery)
    console.log('总缴费记录数:', payments.length)
    
    if (payments.length > 0) {
      console.log('第一条缴费记录示例:', {
        _id: payments[0]._id,
        paymentDate: payments[0].paymentDate,
        amount: payments[0].amount
      })
    }
    
    const totalRevenue = payments.reduce((sum, p) => sum + toNumber(p.amount), 0)
    const totalLessonsSold = payments.reduce((sum, p) => sum + toNumber(p.totalLessons), 0)
    
    const courseQuery = accountTeacherId ? { teacherId: accountTeacherId } : {}
    const courses = await Course.find(courseQuery)
      .populate('studentId', 'teacherId paymentType currentPrice priceEffectiveDate practiceTeacherId')
      .populate('courseTypeId', 'name duration')
    const totalCourses = courses.length
    
    const lessonRecordQuery = accountTeacherId ? { studentId: { $in: studentIds }, ...accountFilter } : {}
    const lessonRecords = await LessonRecord.find(lessonRecordQuery)
      .populate('studentId', 'teacherId paymentType currentPrice priceEffectiveDate practiceTeacherId')
      .populate('courseId', 'startTime')
      .populate('courseTypeId', 'name duration')
    console.log('总消课记录数:', lessonRecords.length)
    
    if (lessonRecords.length > 0) {
      console.log('第一条消课记录示例:', {
        _id: lessonRecords[0]._id,
        recordDate: lessonRecords[0].recordDate,
        courseStartTime: lessonRecords[0].courseStartTime,
        lessonsConsumed: lessonRecords[0].lessonsConsumed
      })
    }
    
    const totalLessonsConsumed = lessonRecords.reduce((sum, r) => sum + toNumber(r.lessonsConsumed), 0)
    const totalLessonsAttended = lessonRecords.length
    
    const balanceQuery = accountTeacherId ? { studentId: { $in: studentIds }, ...accountFilter } : {}
    const balances = await LessonBalance.find(balanceQuery)
    const totalRemainingLessons = balances.reduce((sum, b) => sum + toNumber(b.remainingLessons), 0)
    
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
    
    const monthlyActualRevenue = await calculateLessonRecordRevenue(monthlyLessonRecords)
    
    const monthlyLessonsConsumed = monthlyLessonRecords.reduce((sum, r) => sum + toNumber(r.lessonsConsumed), 0)
    const monthlyLessonsAttended = monthlyLessonRecords.length
    
    const monthlyCourses = courses.filter(c => {
      if (!c.startTime) return false
      const courseDate = new Date(c.startTime)
      if (isNaN(courseDate.getTime())) return false
      return courseDate >= startOfMonth && courseDate < endOfMonth
    })
    const monthlyScheduledCourses = getScheduledCourses(monthlyCourses)
    const monthlyScheduledLessons = monthlyScheduledCourses.length
    const monthlyPrepaidRevenue = await calculateScheduledRevenue(monthlyCourses)
    
    console.log('========== 月度统计数据 ==========')
    console.log('月度实际收入:', monthlyActualRevenue)
    console.log('月度消课数:', monthlyLessonsConsumed)
    console.log('月度上课数:', monthlyLessonsAttended)
    
    const prepaidLessonRecords = await getPrepaidLessonRecords(lessonRecords, students, accountTeacherId)
    const prepaidLessonsConsumed = prepaidLessonRecords.reduce((sum, r) => sum + toNumber(r.lessonsConsumed), 0)
    
    const monthlyPrepaidLessons = await getPrepaidLessonRecords(monthlyLessonRecords, students, accountTeacherId)
    const monthlyPrepaidLessonsConsumed = monthlyPrepaidLessons.reduce((sum, r) => sum + toNumber(r.lessonsConsumed), 0)
    
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
    
    const accountTeacherId = isTeacher ? req.userId : teacherId
    let studentQuery = {}
    if (accountTeacherId) {
      Object.assign(studentQuery, getTeacherStudentAccessFilter(accountTeacherId))
    }
    
    const students = await Student.find(studentQuery)
    const studentIds = students.map(s => s._id)
    const ownedStudentIds = accountTeacherId
      ? students.filter(student => isSameId(student.teacherId, accountTeacherId)).map(student => student._id)
      : []
    const accountFilter = accountTeacherId ? getTeacherAccountFilter(accountTeacherId, ownedStudentIds) : null
    
    const lessonRecordQuery = accountTeacherId ? { studentId: { $in: studentIds }, ...accountFilter } : {}
    const lessonRecords = await LessonRecord.find(lessonRecordQuery)
      .populate('studentId', 'teacherId paymentType currentPrice priceEffectiveDate practiceTeacherId')
      .populate('courseId', 'startTime')
      .populate('courseTypeId', 'name duration')

    const courseQuery = accountTeacherId ? { teacherId: accountTeacherId } : {}
    const courses = await Course.find(courseQuery)
      .populate('studentId', 'teacherId paymentType currentPrice priceEffectiveDate practiceTeacherId')
      .populate('courseTypeId', 'name duration')
    
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
        
        const monthLessonRecords = lessonRecords.filter(r => {
          const courseStartTime = r.courseStartTime ? new Date(r.courseStartTime) : new Date(r.recordDate)
          return courseStartTime >= startOfMonth && courseStartTime < endOfMonth
        })
        
        const actualRevenue = await calculateLessonRecordRevenue(monthLessonRecords)
        actualRevenueData.push(actualRevenue)
        
        // 应消课数: 当月排定的课程数量
        const monthCourses = courses.filter(c => {
          if (!c.startTime) return false
          const courseDate = new Date(c.startTime)
          return courseDate >= startOfMonth && courseDate < endOfMonth
        })
        prepaidRevenueData.push(await calculateScheduledRevenue(monthCourses))
        lessonsConsumedData.push(getScheduledCourses(monthCourses).length)
        
        // 实消课数: 实际完成的消课数量
        lessonsAttendedData.push(monthLessonRecords.reduce((sum, r) => sum + toNumber(r.lessonsConsumed), 0))
      }
    } else {
      for (let y = currentYear - 4; y <= currentYear; y++) {
        labels.push(`${y}年`)
        
        const startOfYear = new Date(y, 0, 1)
        const endOfYear = new Date(y + 1, 0, 1)
        
        const yearLessonRecords = lessonRecords.filter(r => {
          const courseStartTime = r.courseStartTime ? new Date(r.courseStartTime) : new Date(r.recordDate)
          return courseStartTime >= startOfYear && courseStartTime < endOfYear
        })
        
        const actualRevenue = await calculateLessonRecordRevenue(yearLessonRecords)
        actualRevenueData.push(actualRevenue)
        
        // 应消课数: 当年排定的课程数量
        const yearCourses = courses.filter(c => {
          if (!c.startTime) return false
          const courseDate = new Date(c.startTime)
          return courseDate >= startOfYear && courseDate < endOfYear
        })
        prepaidRevenueData.push(await calculateScheduledRevenue(yearCourses))
        lessonsConsumedData.push(getScheduledCourses(yearCourses).length)
        
        // 实消课数: 实际完成的消课数量
        lessonsAttendedData.push(yearLessonRecords.reduce((sum, r) => sum + toNumber(r.lessonsConsumed), 0))
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
