const mongoose = require('mongoose')
const Student = require('./src/models/Student')
const LessonRecord = require('./src/models/LessonRecord')
const Payment = require('./src/models/Payment')

const MONGODB_URI = 'mongodb://localhost:27017/lesson-management'

async function diagnose() {
  try {
    console.log('🔗 连接数据库...')
    await mongoose.connect(MONGODB_URI)
    console.log('✅ 数据库连接成功\n')

    console.log('='.repeat(70))
    console.log('📋 诊断报告 - 学生支付类型分析')
    console.log('='.repeat(70) + '\n')

    const allStudents = await Student.find({})
    console.log(`👥 总学生数: ${allStudents.length}\n`)

    console.log('📊 支付类型分布:')
    const paymentTypes = {}
    allStudents.forEach(s => {
      const type = s.paymentType || '未设置'
      paymentTypes[type] = (paymentTypes[type] || 0) + 1
    })

    Object.entries(paymentTypes).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} 人`)
    })
    console.log('')

    console.log('📝 所有学生详细信息:\n')
    
    for (const student of allStudents) {
      console.log(`┌─ 学生: ${student.name || '未知'}`)
      console.log(`│  ID: ${student._id}`)
      console.log(`│  支付类型: ${student.paymentType || '未设置'}`)
      
      const records = await LessonRecord.find({
        studentId: student._id,
        isDeducted: true
      }).sort({ createdAt: -1 }).limit(5)
      
      if (records.length > 0) {
        console.log(`│  最近扣课记录数: ${records.length} 条`)
        records.slice(0, 3).forEach((r, i) => {
          console.log(`│    ${i+1}. 单价=¥${r.unitPrice}, 数量=${r.lessonsConsumed}节, 时间=${r.createdAt?.toISOString().slice(0,10)}`)
        })
        
        const payments = await Payment.find({
          studentId: student._id,
          notes: /单次付费/
        })
        console.log(`│  已有单次付费记录: ${payments.length} 条`)
      }
      console.log('└\n')
    }

    console.log('\n' + '='.repeat(70))
    console.log('📋 诊断报告 - LessonRecord 分析')
    console.log('='.repeat(70) + '\n')

    const allRecords = await LessonRecord.find({
      isDeducted: true,
      unitPrice: { $gt: 0 }
    }).sort({ createdAt: -1 }).limit(20)

    console.log(`📝 有单价且已扣课的记录总数: ${await LessonRecord.countDocuments({ isDeducted: true, unitPrice: { $gt: 0 } })}\n`)

    if (allRecords.length > 0) {
      console.log('最近20条记录:')
      allRecords.forEach((r, i) => {
        const student = allStudents.find(s => s._id.toString() === r.studentId.toString())
        console.log(`${i+1}. ${student?.name || '未知'} | ¥${r.unitPrice} × ${r.lessonsConsumed} = ¥${r.unitPrice * r.lessonsConsumed} | ${r.createdAt?.toISOString().slice(0,16)} | notes: ${(r.notes || '无').slice(0,30)}`)
      })
    } else {
      console.log('❌ 未找到任何有单价的扣课记录')
    }

    console.log('\n' + '='.repeat(70))
    console.log('💡 建议')
    console.log('='.repeat(70))
    
    if (allStudents.filter(s => s.paymentType === 'payPerLesson').length === 0) {
      console.log('\n⚠️ 未找到 payPerLesson 类型的学生！')
      console.log('可能原因：')
      console.log('1. 学生的 paymentType 字段使用其他值（如 "单次" "按次" 等）')
      console.log('2. 所有学生都是预付费类型')
      console.log('3. 字段名不同或为空')
    }

  } catch (error) {
    console.error('❌ 诊断失败:', error.message)
    console.error(error.stack)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 数据库连接已关闭')
  }
}

console.log('╔══════════════════════════════════════════════════╗')
console.log('║     数据库诊断工具 - 查找缺失收入              ║')
console.log('╚══════════════════════════════════════════════════╝\n')

diagnose()
