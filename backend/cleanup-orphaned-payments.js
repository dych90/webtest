const mongoose = require('mongoose')
const LessonRecord = require('./src/models/LessonRecord')
const Course = require('./src/models/Course')
const Payment = require('./src/models/Payment')

const MONGODB_URI = 'mongodb://localhost:27017/piano_studio'

async function cleanupOrphanedPayments() {
  try {
    console.log('🔗 连接数据库...')
    await mongoose.connect(MONGODB_URI)
    console.log('✅ 数据库连接成功\n')

    console.log('=' .repeat(70))
    console.log('🔍 第一步：查找所有孤立的消课记录')
    console.log('   (课程已删除，但消课记录仍存在)')
    console.log('='.repeat(70) + '\n')

    const allLessonRecords = await LessonRecord.find({})
    const orphanedRecords = []

    for (const record of allLessonRecords) {
      if (record.courseId) {
        const course = await Course.findById(record.courseId)
        if (!course) {
          orphanedRecords.push(record)
        }
      }
    }

    console.log(`📝 找到 ${orphanedRecords.length} 条孤立的消课记录\n`)

    if (orphanedRecords.length === 0) {
      console.log('✅ 没有找到孤立的消课记录，数据正常\n')
      return
    }

    console.log('=' .repeat(70))
    console.log('🔍 第二步：查找这些孤立记录关联的Payment')
    console.log('='.repeat(70) + '\n')

    let deletedCount = 0
    let totalAmount = 0

    for (const record of orphanedRecords) {
      const payment = await Payment.findOne({
        studentId: record.studentId,
        createdAt: {
          $gte: new Date(record.createdAt.getTime() - 120000),
          $lte: new Date(record.createdAt.getTime() + 120000)
        }
      })

      if (payment) {
        const studentName = record.studentId ? (await require('./src/models/Student').findById(record.studentId))?.name || '未知' : '未知'
        
        console.log(`🗑️ 删除孤立Payment: [${studentName}] ¥${payment.amount} (${record.createdAt?.toISOString().slice(0,10)})`)
        
        totalAmount += payment.amount
        deletedCount++
        
        await Payment.findByIdAndDelete(payment._id)
      }
      
      await LessonRecord.findByIdAndDelete(record._id)
    }

    console.log('\n' + '=' .repeat(70))
    console.log('📈 清理统计:')
    console.log('='.repeat(70))
    console.log(`✅ 删除孤立Payment: ${deletedCount} 条`)
    console.log(`💰 释放金额: ¥${totalAmount.toLocaleString()}`)
    console.log(`🗑️ 清理孤立消课记录: ${orphanedRecords.length} 条`)
    console.log('='.repeat(70) + '\n')

    if (deletedCount > 0) {
      console.log('💡 提示: 刷新数据统计页面即可看到更新后的预收入数据\n')
    } else {
      console.log('ℹ️ 没有找到需要清理的Payment记录\n')
    }

  } catch (error) {
    console.error('❌ 执行失败:', error.message)
    console.error(error.stack)
  } finally {
    await mongoose.connection.close()
    console.log('🔌 数据库连接已关闭')
  }
}

console.log('╔══════════════════════════════════════════════════╗')
console.log('║     孤立Payment记录清理工具                      ║')
console.log('╚══════════════════════════════════════════════════╝\n')

cleanupOrphanedPayments()
