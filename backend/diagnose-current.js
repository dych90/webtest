const mongoose = require('mongoose')
const LessonRecord = require('./src/models/LessonRecord')
const Payment = require('./src/models/Payment')
const Student = require('./src/models/Student')

const MONGODB_URI = 'mongodb://localhost:27017/piano_studio'

async function diagnoseCurrentState() {
  try {
    console.log('🔗 连接数据库...')
    await mongoose.connect(MONGODB_URI)
    console.log('✅ 数据库连接成功\n')

    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    console.log('=' .repeat(70))
    console.log('🔍 最近1小时内的消课记录（单次付费学生）')
    console.log(`   时间范围: ${oneHourAgo.toLocaleString()} ~ ${now.toLocaleString()}`)
    console.log('='.repeat(70) + '\n')

    const recentRecords = await LessonRecord.find({
      createdAt: { $gte: oneHourAgo },
      isDeducted: true
    }).sort({ createdAt: -1 }).limit(10).populate('studentId', 'name paymentType')

    if (recentRecords.length === 0) {
      console.log('⚠️ 最近1小时内没有消课记录\n')
      
      console.log('=' .repeat(70))
      console.log('🔍 查找最近的10条单次付费学生消课记录')
      console.log('='.repeat(70) + '\n')
      
      const payPerLessonStudents = await Student.find({ paymentType: 'payPerLesson' })
      const studentIds = payPerLessonStudents.map(s => s._id)
      
      const latestRecords = await LessonRecord.find({
        studentId: { $in: studentIds },
        isDeducted: true
      }).sort({ createdAt: -1 }).limit(10).populate('studentId', 'name paymentType')

      for (const record of latestRecords) {
        const studentName = record.studentId?.name || '未知'
        const paymentType = record.studentId?.paymentType || '未知'
        
        console.log(`┌─ 记录ID: ${record._id}`)
        console.log(`│  学生: ${studentName} (${paymentType})`)
        console.log(`│  unitPrice: ¥${record.unitPrice}`)
        console.log(`│  消课数: ${record.lessonsConsumed}节`)
        console.log(`│  创建时间: ${record.createdAt?.toLocaleString()}`)
        console.log(`│  课程时间: ${record.courseStartTime ? new Date(record.courseStartTime).toLocaleString() : '无'}`)
        
        const payment = await Payment.findOne({
          studentId: record.studentId,
          createdAt: {
            $gte: new Date(record.createdAt.getTime() - 120000),
            $lte: new Date(record.createdAt.getTime() + 120000)
          }
        })
        
        if (payment) {
          console.log(`│  ✅ 有Payment: ¥${payment.amount} (${payment.notes})`)
        } else {
          console.log(`│  ❌ 无Payment记录！`)
          console.log(`│  ⚠️ 这就是收入不增加的原因！`)
        }
        
        console.log(`└\n`)
      }
    } else {
      for (const record of recentRecords) {
        const studentName = record.studentId?.name || '未知'
        const paymentType = record.studentId?.paymentType || '未知'
        
        console.log(`┌─ 记录ID: ${record._id}`)
        console.log(`│  学生: ${studentName} (${paymentType})`)
        console.log(`│  unitPrice: ¥${record.unitPrice}`)
        console.log(`│  消课数: ${record.lessonsConsumed}节`)
        console.log(`│  创建时间: ${record.createdAt?.toLocaleString()}`)
        
        const payment = await Payment.findOne({
          studentId: record.studentId,
          createdAt: {
            $gte: new Date(record.createdAt.getTime() - 120000),
            $lte: new Date(record.createdAt.getTime() + 120000)
          }
        })
        
        if (payment) {
          console.log(`│  ✅ 有Payment: ¥${payment.amount}`)
        } else {
          console.log(`│  ❌ 无Payment记录`)
        }
        
        console.log(`└\n`)
      }
    }

    console.log('\n' + '=' .repeat(70))
    console.log('📊 统计信息:')
    console.log('='.repeat(70))

    const totalPayments = await Payment.countDocuments({})
    const todayPayments = await Payment.countDocuments({
      createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) }
    })
    
    const totalRecords = await LessonRecord.countDocuments({ isDeducted: true })
    const todayRecords = await LessonRecord.countDocuments({
      isDeducted: true,
      createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) }
    })

    console.log(`Payment总数: ${totalPayments}`)
    console.log(`今日Payment: ${todayPayments}`)
    console.log(`消课记录总数: ${totalRecords}`)
    console.log(`今日消课记录: ${todayRecords}\n`)

  } catch (error) {
    console.error('❌ 诊断失败:', error.message)
    console.error(error.stack)
  } finally {
    await mongoose.connection.close()
    console.log('🔌 数据库连接已关闭')
  }
}

console.log('╔══════════════════════════════════════════════════╗')
console.log('║     当前状态诊断工具                              ║')
console.log('╚══════════════════════════════════════════════════╝\n')

diagnoseCurrentState()
