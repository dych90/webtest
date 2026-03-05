const Course = require('../models/Course')
const Student = require('../models/Student')
const User = require('../models/User')
const CourseType = require('../models/CourseType')
const { sendSubscribeMessage, formatTime } = require('../utils/wechat')

const checkAndSendReminders = async () => {
  try {
    console.log('开始检查课程提醒...')

    const now = new Date()
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000)

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

  setInterval(() => {
    checkAndSendReminders()
  }, 60 * 60 * 1000)
}

module.exports = {
  checkAndSendReminders,
  startReminderService
}
