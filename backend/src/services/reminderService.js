const Course = require('../models/Course')
const Student = require('../models/Student')
const User = require('../models/User')
const CourseType = require('../models/CourseType')
const { sendSubscribeMessage, formatTime } = require('../utils/wechat')

let lastDailyReminderDate = null
const TIMEZONE = 'Asia/Shanghai'
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

const addCoursesToTeacherMap = (teacherMap, courses, fieldName) => {
  for (const course of courses) {
    const teacher = course.teacherId
    if (!teacher) continue
    
    const openIds = getTeacherOpenIds(teacher)
    if (openIds.length === 0) continue
    
    const teacherId = teacher._id.toString()
    if (!teacherMap[teacherId]) {
      teacherMap[teacherId] = {
        teacher,
        todayCompletedCourses: [],
        tomorrowCourses: []
      }
    }
    
    teacherMap[teacherId][fieldName].push(course)
  }
}

const getTeacherOpenIds = (teacher) => {
  if (!teacher) return []
  
  const openIds = []
  
  if (teacher.openIds && teacher.openIds.length > 0) {
    openIds.push(...teacher.openIds)
  }
  
  if (teacher.openId && !openIds.includes(teacher.openId)) {
    openIds.push(teacher.openId)
  }
  
  return openIds
}

const sendReminderToAllOpenIds = async (openIds, messageData, page) => {
  const results = []
  
  for (const openId of openIds) {
    try {
      await sendSubscribeMessage(openId, messageData, page)
      results.push({ openId, success: true })
    } catch (error) {
      console.error(`发送到 ${openId} 失败:`, error.message)
      results.push({ openId, success: false, error: error.message })
    }
  }
  
  return results
}

const checkAndSendReminders = async () => {
  try {
    console.log('开始检查课程提醒...')
    console.log('当前时间:', new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }))

    const now = new Date()
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000)
    
    const nowFloored = new Date(Math.floor(now.getTime() / 60000) * 60000)
    const oneHourLaterCeiled = new Date(Math.ceil(oneHourLater.getTime() / 60000) * 60000 + 1000)

    console.log(`查询时间范围: ${nowFloored.toISOString()} 到 ${oneHourLaterCeiled.toISOString()}`)
    console.log(`查询时间范围(北京时间): ${nowFloored.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })} 到 ${oneHourLaterCeiled.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`)

    const allCoursesInHour = await Course.find({
      startTime: {
        $gte: nowFloored,
        $lte: oneHourLaterCeiled
      },
      status: 'normal'
    }).populate('studentId').populate('teacherId').populate('courseTypeId')

    console.log(`时间范围内共有 ${allCoursesInHour.length} 节课程(status=normal)`)
    
    for (const c of allCoursesInHour) {
      console.log(`  - 课程ID: ${c._id}, 开始时间: ${c.startTime}, reminderSent: ${c.reminderSent}, reminderSent类型: ${typeof c.reminderSent}`)
      
      const directQuery = await Course.findById(c._id).select('reminderSent')
      console.log(`    直接查询reminderSent: ${directQuery?.reminderSent}, 类型: ${typeof directQuery?.reminderSent}`)
    }

    const courses = await Course.find({
      startTime: {
        $gte: nowFloored,
        $lte: oneHourLaterCeiled
      },
      status: 'normal',
      $or: [
        { reminderSent: false },
        { reminderSent: { $exists: false } }
      ]
    }).populate('studentId').populate('teacherId').populate('courseTypeId')

    console.log(`找到 ${courses.length} 节即将开始的课程(reminderSent=false)`)

    for (const course of courses) {
      try {
        const teacher = course.teacherId
        const student = course.studentId
        const courseType = course.courseTypeId

        console.log(`处理课程: ${course._id}`)
        console.log(`  教师: ${teacher?.name || '未知'}`)
        console.log(`  学生: ${student?.name || '未知'}`)
        console.log(`  课程类型: ${courseType?.name || '未知'}`)
        console.log(`  开始时间: ${course.startTime}`)

        const openIds = getTeacherOpenIds(teacher)
        
        if (openIds.length === 0) {
          console.log(`教师 ${teacher?.name || '未知'} 未绑定 openId,跳过提醒`)
          continue
        }

        console.log(`  发送到 ${openIds.length} 个微信账号`)

        const messageData = {
          time2: {
            value: formatTime(course.startTime)
          },
          thing11: {
            value: student?.name || '未知学生'
          },
          thing12: {
            value: courseType?.name || '未知课程'
          },
          phrase16: {
            value: '即将开始'
          }
        }

        const results = await sendReminderToAllOpenIds(openIds, messageData, 'pages/schedule/schedule')
        
        const successCount = results.filter(r => r.success).length
        console.log(`  发送结果: ${successCount}/${openIds.length} 成功`)
        
        if (successCount > 0) {
          await Course.findByIdAndUpdate(course._id, { reminderSent: true })
          console.log(`✅ 已向教师 ${teacher.name} 发送课程提醒: ${student?.name} - ${courseType?.name}`)
        } else {
          console.warn(`⚠️ 课程提醒全部发送失败，保留未发送状态以便重试: ${course._id}`)
        }
      } catch (error) {
        console.error(`❌ 发送课程提醒失败 (课程ID: ${course._id}):`, error.message)
      }
    }

    console.log('课程提醒检查完成')
  } catch (error) {
    console.error('检查课程提醒时出错:', error)
  }
}

const resetDailyReminderFlags = async () => {
  try {
    const { start: todayStart, end: todayEnd } = getShanghaiDayRange()
    
    const result = await Course.updateMany(
      {
        startTime: {
          $gte: todayStart,
          $lt: todayEnd
        },
        reminderSent: true
      },
      { reminderSent: false }
    )
    
    console.log(`重置今日课程的提醒标志: ${result.modifiedCount} 节课程`)
  } catch (error) {
    console.error('重置提醒标志时出错:', error)
  }
}

const startReminderService = () => {
  console.log('启动课程提醒定时任务服务...')

  resetDailyReminderFlags()
  checkAndSendReminders()

  const cron = require('node-cron')

  cron.schedule('*/5 * * * *', async () => {
    console.log('定时任务触发: 检查课程提醒')
    await checkAndSendReminders()
  }, { timezone: TIMEZONE })

  cron.schedule('0 0 * * *', async () => {
    console.log('定时任务触发: 重置今日提醒标志')
    await resetDailyReminderFlags()
  }, { timezone: TIMEZONE })

  cron.schedule('30 9 * * *', async () => {
    console.log('定时任务触发: 9点半今日课程提醒')
    await sendMorningDailyReminder()
  }, { timezone: TIMEZONE })

  cron.schedule('0 22 * * *', async () => {
    console.log('定时任务触发: 晚上提醒')
    await sendEveningDailyReminder()
  }, { timezone: TIMEZONE })
  
  console.log('定时任务已注册:')
  console.log('  - 课程提醒: 每5分钟检查一次')
  console.log('  - 重置提醒标志: 每天0:00')
  console.log('  - 今日课程提醒: 每天9:30')
  console.log('  - 晚上提醒: 每天22:00')
}

const sendMorningDailyReminder = async () => {
  try {
    const now = new Date()
    const { start: todayStart, end: todayEnd } = getShanghaiDayRange(0, now)

    const courses = await Course.find({
      startTime: {
        $gte: todayStart,
        $lt: todayEnd
      },
      status: 'normal'
    }).populate('teacherId')

    const teachersToRemind = {}
    
    for (const course of courses) {
      const teacher = course.teacherId
      const openIds = getTeacherOpenIds(teacher)
      if (openIds.length === 0) continue
      
      if (!teachersToRemind[teacher._id]) {
        teachersToRemind[teacher._id] = {
          teacher,
          courses: []
        }
      }
      teachersToRemind[teacher._id].courses.push(course)
    }

    console.log(`今日课程提醒：找到 ${Object.keys(teachersToRemind).length} 位需要提醒的教师`)

    for (const teacherId in teachersToRemind) {
      const { teacher, courses } = teachersToRemind[teacherId]
      
      try {
        const openIds = getTeacherOpenIds(teacher)
        
        const messageData = {
          time2: {
            value: formatTime(now)
          },
          thing11: {
            value: `今日${courses.length}节课`
          },
          thing12: {
            value: '请检查记录'
          },
          phrase16: {
            value: '核对消课'
          }
        }

        const results = await sendReminderToAllOpenIds(openIds, messageData, 'pages/lessons/lessons')
        const successCount = results.filter(r => r.success).length
        console.log(`已向教师 ${teacher.name} 发送今日课程提醒(${successCount}/${openIds.length}个微信)，今日课程: ${courses.length}节`)
      } catch (error) {
        console.error(`发送今日课程提醒失败:`, error.message)
      }
    }

    console.log('今日课程提醒检查完成')
  } catch (error) {
    console.error('检查今日课程提醒时出错:', error)
  }
}

const sendEveningDailyReminder = async () => {
  try {
    const now = new Date()
    const { start: todayStart, end: todayEnd } = getShanghaiDayRange(0, now)
    const { start: tomorrowStart, end: tomorrowEnd } = getShanghaiDayRange(1, now)

    console.log(`晚上提醒查询时间范围: ${todayStart.toISOString()} 到 ${todayEnd.toISOString()}`)
    console.log(`晚上提醒查询时间范围(北京时间): ${todayStart.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })} 到 ${todayEnd.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`)
    console.log(`明日课程查询时间范围(北京时间): ${tomorrowStart.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })} 到 ${tomorrowEnd.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`)

    const todayCompletedCourses = await Course.find({
      startTime: {
        $gte: todayStart,
        $lt: todayEnd
      },
      status: 'completed'
    }).populate('teacherId').populate('studentId').populate('courseTypeId')

    const tomorrowCourses = await Course.find({
      startTime: {
        $gte: tomorrowStart,
        $lt: tomorrowEnd
      },
      status: 'normal'
    }).populate('teacherId').populate('studentId').populate('courseTypeId')

    console.log(`晚上提醒：找到 ${todayCompletedCourses.length} 节今日已上课程(status=completed)`)
    console.log(`晚上提醒：找到 ${tomorrowCourses.length} 节明日安排课程(status=normal)`)

    for (const course of todayCompletedCourses) {
      console.log(`  - 今日已上: ${course._id}, 开始时间: ${course.startTime}, 学生: ${course.studentId?.name || '未知'}, 教师ID: ${course.teacherId?._id || '无'}`)
    }
    
    for (const course of tomorrowCourses) {
      console.log(`  - 明日安排: ${course._id}, 开始时间: ${course.startTime}, 学生: ${course.studentId?.name || '未知'}, 教师ID: ${course.teacherId?._id || '无'}`)
    }

    const teachersToRemind = {}
    addCoursesToTeacherMap(teachersToRemind, todayCompletedCourses, 'todayCompletedCourses')
    addCoursesToTeacherMap(teachersToRemind, tomorrowCourses, 'tomorrowCourses')
    
    console.log(`晚上10点：找到 ${Object.keys(teachersToRemind).length} 位需要提醒的教师`)
    
    for (const teacherId in teachersToRemind) {
      const { teacher, todayCompletedCourses, tomorrowCourses } = teachersToRemind[teacherId]
      
      try {
        const openIds = getTeacherOpenIds(teacher)
        
        const messageData = {
          time2: {
            value: formatTime(now)
          },
          thing11: {
            value: `今日已上${todayCompletedCourses.length}节`
          },
          thing12: {
            value: `明日安排${tomorrowCourses.length}节`
          },
          phrase16: {
            value: '每日汇总'
          }
        }

        const results = await sendReminderToAllOpenIds(openIds, messageData, 'pages/schedule/schedule')
        const successCount = results.filter(r => r.success).length
        console.log(`已向教师 ${teacher.name} 发送晚上汇总(${successCount}/${openIds.length}个微信)，今日已上: ${todayCompletedCourses.length}节，明日安排: ${tomorrowCourses.length}节`)
      } catch (error) {
        console.error(`发送晚上汇总失败:`, error.message)
      }
    }

    console.log('晚上提醒检查完成')
  } catch (error) {
    console.error('检查晚上提醒时出错:', error)
  }
}

module.exports = {
  checkAndSendReminders,
  startReminderService,
  sendMorningDailyReminder,
  sendEveningDailyReminder
}
