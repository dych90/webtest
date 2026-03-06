const Course = require('../models/Course')
const Student = require('../models/Student')
const User = require('../models/User')
const CourseType = require('../models/CourseType')
const { sendSubscribeMessage, formatTime } = require('../utils/wechat')

let lastDailyReminderDate = null

const checkAndSendReminders = async () => {
  try {
    console.log('开始检查课程提醒...')
    console.log('当前时间:', new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }))

    const now = new Date()
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000)

    console.log(`查询时间范围: ${now.toISOString()} 到 ${oneHourLater.toISOString()}`)

    const courses = await Course.find({
      startTime: {
        $gte: now,
        $lte: oneHourLater
      },
      status: 'normal',
      reminderSent: false
    }).populate('studentId').populate('teacherId').populate('courseTypeId')

    console.log(`找到 ${courses.length} 节即将开始的课程`)

    for (const course of courses) {
      try {
        const teacher = course.teacherId
        const student = course.studentId
        const courseType = course.courseTypeId

        console.log(`处理课程: ${course._id}`)
        console.log(`  教师: ${teacher?.name || '未知'}, openId: ${teacher?.openId || '无'}`)
        console.log(`  学生: ${student?.name || '未知'}`)
        console.log(`  课程类型: ${courseType?.name || '未知'}`)
        console.log(`  开始时间: ${course.startTime}`)

        if (!teacher || !teacher.openId) {
          console.log(`教师 ${teacher?.name || '未知'} 未绑定 openId,跳过提醒`)
          continue
        }

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

        await sendSubscribeMessage(teacher.openId, messageData, 'pages/schedule/schedule')
        
        await Course.findByIdAndUpdate(course._id, { reminderSent: true })
        
        console.log(`✅ 已向教师 ${teacher.name} 发送课程提醒: ${student?.name} - ${courseType?.name}`)
      } catch (error) {
        console.error(`❌ 发送课程提醒失败 (课程ID: ${course._id}):`, error.message)
      }
    }

    console.log('课程提醒检查完成')
  } catch (error) {
    console.error('检查课程提醒时出错:', error)
  }
}

const startReminderService = () => {
  console.log('启动课程提醒定时任务服务...')

  checkAndSendReminders()

  const cron = require('node-cron')

  cron.schedule('*/5 * * * *', async () => {
    console.log('定时任务触发: 检查课程提醒')
    await checkAndSendReminders()
  })

  cron.schedule('0 8 * * *', async () => {
    console.log('定时任务触发: 早上提醒')
    await sendMorningDailyReminder()
  })

  cron.schedule('0 22 * * *', async () => {
    console.log('定时任务触发: 晚上提醒')
    await sendEveningDailyReminder()
  })
  
  console.log('定时任务已注册:')
  console.log('  - 课程提醒: 每5分钟检查一次')
  console.log('  - 早上提醒: 每天8:00')
  console.log('  - 晚上提醒: 每天22:00')
}

const sendMorningDailyReminder = async () => {
  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

    const courses = await Course.find({
      startTime: {
        $gte: todayStart,
        $lte: todayEnd
      },
      status: 'normal'
    }).populate('teacherId')

    const teachersToRemind = {}
    
    for (const course of courses) {
      const teacher = course.teacherId
      if (!teacher || !teacher.openId) continue
      
      if (!teachersToRemind[teacher._id]) {
        teachersToRemind[teacher._id] = {
          teacher,
          courses: []
        }
      }
      teachersToRemind[teacher._id].courses.push(course)
    }

    console.log(`早上8点半：找到 ${Object.keys(teachersToRemind).length} 位需要提醒的教师`)

    for (const teacherId in teachersToRemind) {
      const { teacher, courses } = teachersToRemind[teacherId]
      
      try {
        const messageData = {
          time2: {
            value: formatTime(now)
          },
          thing11: {
            value: `今日课程共${courses.length}节`
          },
          thing12: {
            value: '请检查记录'
          },
          phrase16: {
            value: '建议核对消课记录'
          }
        }

        await sendSubscribeMessage(teacher.openId, messageData, 'pages/lessons/lessons')
        console.log(`已向教师 ${teacher.name} 发送早上提醒，今日课程: ${courses.length}节`)
      } catch (error) {
        console.error(`发送早上提醒失败:`, error.message)
      }
    }

    console.log('早上提醒检查完成')
  } catch (error) {
    console.error('检查早上提醒时出错:', error)
  }
}

const sendEveningDailyReminder = async () => {
  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

    const courses = await Course.find({
      startTime: {
        $gte: todayStart,
        $lte: todayEnd
      },
      status: 'normal'
    }).populate('teacherId')

    const teachersToRemind = {}
    
    for (const course of courses) {
      const teacher = course.teacherId
      if (!teacher || !teacher.openId) continue
      
      if (!teachersToRemind[teacher._id]) {
        teachersToRemind[teacher._id] = {
          teacher,
          courses: []
        }
      }
      teachersToRemind[teacher._id].courses.push(course)
    }

    console.log(`晚上10点：找到 ${Object.keys(teachersToRemind).length} 位需要提醒的教师`)

    for (const teacherId in teachersToRemind) {
      const { teacher, courses } = teachersToRemind[teacherId]
      
      try {
        const messageData = {
          time2: {
            value: formatTime(now)
          },
          thing11: {
            value: `今日课程共${courses.length}节`
          },
          thing12: {
            value: '请检查记录'
          },
          phrase16: {
            value: '建议核对消课记录'
          }
        }

        await sendSubscribeMessage(teacher.openId, messageData, 'pages/lessons/lessons')
        console.log(`已向教师 ${teacher.name} 发送晚上提醒，今日课程: ${courses.length}节`)
      } catch (error) {
        console.error(`发送晚上提醒失败:`, error.message)
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
