const Course = require('../models/Course')
const Student = require('../models/Student')
const User = require('../models/User')
const CourseType = require('../models/CourseType')
const { sendSubscribeMessage, formatTime } = require('../utils/wechat')

const checkAndSendReminders = async () => {
  try {
    console.log('开始检查课程提醒...')

    const now = new Date()
    const oneHourLater = new Date(now.getTime() + 65 * 60 * 1000)

    const courses = await Course.find({
      startTime: {
        $gte: now,
        $lte: oneHourLater
      },
      status: 'normal',
      reminderSent: false
    }).populate('studentId').populate('teacherId').populate('courseTypeId')

    console.log(`找到 ${courses.length} 节即将开始的课程`)
    console.log(`当前时间: ${now.toISOString()}, 查询范围: ${oneHourLater.toISOString()}`)

    for (const course of courses) {
      try {
        const teacher = course.teacherId
        const student = course.studentId
        const courseType = course.courseTypeId

        if (!teacher || !teacher.openId) {
          console.log(`教师 ${teacher?.name || '未知'} 未绑定 openId,跳过提醒`)
          continue
        }

        const messageData = {
          time2: {
            value: formatTime(course.startTime)
          },
          thing11: {
            value: student.name
          },
          thing12: {
            value: courseType.name
          },
          phrase16: {
            value: '即将开始'
          }
        }

        await sendSubscribeMessage(teacher.openId, messageData, 'pages/schedule/schedule')
        
        await Course.findByIdAndUpdate(course._id, { reminderSent: true })
        
        console.log(`已向教师 ${teacher.name} 发送课程提醒: ${student.name} - ${courseType.name}`)
      } catch (error) {
        console.error(`发送课程提醒失败:`, error.message)
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
  checkDailyCourseRecords()

  setInterval(() => {
    checkAndSendReminders()
    checkDailyCourseRecords()
  }, 60 * 60 * 1000)
}

const checkDailyCourseRecords = async () => {
  try {
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    
    console.log(`检查是否需要发送每日提醒，当前时间: ${currentHour}:${currentMinute}`)
    
    if (currentHour !== 22 || currentMinute > 5) {
      console.log('不是晚上10点，跳过每日提醒')
      return
    }

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

    console.log(`找到 ${Object.keys(teachersToRemind).length} 位需要提醒的教师`)

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
        console.log(`已向教师 ${teacher.name} 发送每日提醒，今日课程: ${courses.length}节`)
      } catch (error) {
        console.error(`发送每日提醒失败:`, error.message)
      }
    }

    console.log('每日提醒检查完成')
  } catch (error) {
    console.error('检查每日提醒时出错:', error)
  }
}

module.exports = {
  checkAndSendReminders,
  startReminderService
}
