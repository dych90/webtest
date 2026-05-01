const mongoose = require('mongoose')
const Student = require('./src/models/Student')
const LessonRecord = require('./src/models/LessonRecord')
const Payment = require('./src/models/Payment')

const MONGODB_URI = 'mongodb://localhost:27017/piano_studio'

async function checkSpecificRecord() {
  try {
    console.log('🔗 连接数据库...')
    await mongoose.connect(MONGODB_URI)
    console.log('✅ 数据库连接成功\n')

    const targetDate = '2026-04-25'
    console.log(`📅 查找 ${targetDate} 穆翩然的扣课记录...\n`)

    const student = await Student.findOne({ name: /翩翩/ })
    
    if (!student) {
      console.log('❌ 未找到 穆翩然 学生')
      return
    }

    console.log(`👤 学生信息:`)
    console.log(`   姓名: ${student.name}`)
    console.log(`   ID: ${student._id}`)
    console.log(`   支付类型: ${student.paymentType}`)
    console.log('')

    const records = await LessonRecord.find({
      studentId: student._id,
      createdAt: {
        $gte: new Date(`${targetDate}T00:00:00.000Z`),
        $lt: new Date(`${targetDate}T23:59:59.999Z`)
      }
    }).sort({ createdAt: 1 })

    console.log(`📝 找到 ${records.length} 条记录:\n`)

    for (const r of records) {
      console.log(`┌─ 记录 ID: ${r._id}`)
      console.log(`│  创建时间: ${r.createdAt}`)
      console.log(`│  课程开始时间: ${r.courseStartTime}`)
      console.log(`│  isDeducted: ${r.isDeducted}`)
      console.log(`│  unitPrice: ¥${r.unitPrice}`)
      console.log(`│  lessonsConsumed: ${r.lessonsConsumed}节`)
      console.log(`│  notes: ${r.notes || '(无)'}`)

      const payments = await Payment.find({
        studentId: r.studentId,
        createdAt: {
          $gte: new Date(r.createdAt.getTime() - 120000),
          $lte: new Date(r.createdAt.getTime() + 120000)
        }
      })

      if (payments.length > 0) {
        console.log(`│  关联的Payment (${payments.length}条):`)
        payments.forEach(p => {
          console.log(`│    - ¥${p.amount} | ${p.notes} | ${p.createdAt}`)
        })
      } else {
        console.log(`│  ❌ 没有关联的Payment记录`)
      }

      console.log('└\n')
    }

    if (records.length === 0) {
      console.log(`⚠️ 未找到 ${targetDate} 的任何记录`)
      
      console.log('\n📋 显示该学生最近10条记录:\n')
      const recentRecords = await LessonRecord.find({
        studentId: student._id
      }).sort({ createdAt: -1 }).limit(10)

      recentRecords.forEach((r, i) => {
        console.log(`${i+1}. [${r.isDeducted ? '已扣' : '未扣'}] ¥${r.unitPrice} × ${r.lessonsConsumed} | ${r.createdAt?.toISOString().slice(0,16)} | ${(r.notes || '').slice(0,30)}`)
      })
    }

  } catch (error) {
    console.error('❌ 查询失败:', error.message)
    console.error(error.stack)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 数据库连接已关闭')
  }
}

console.log('╔══════════════════════════════════════════════════╗')
console.log('║     精确诊断工具 - 查找特定日期记录              ║')
console.log('╚══════════════════════════════════════════════════╝\n')

checkSpecificRecord()
