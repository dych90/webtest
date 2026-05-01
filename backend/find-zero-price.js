const mongoose = require('mongoose')
const Student = require('./src/models/Student')
const LessonRecord = require('./src/models/LessonRecord')
const Payment = require('./src/models/Payment')

const MONGODB_URI = 'mongodb://localhost:27017/piano_studio'

async function findZeroPriceRecords() {
  try {
    console.log('🔗 连接数据库...')
    await mongoose.connect(MONGODB_URI)
    console.log('✅ 数据库连接成功\n')

    console.log('👥 查找单次付费学生...\n')
    const payPerLessonStudents = await Student.find({ paymentType: 'payPerLesson' })
    console.log(`✅ 找到 ${payPerLessonStudents.length} 个单次付费学生\n`)

    if (payPerLessonStudents.length === 0) {
      console.log('❌ 未找到 payPerLesson 学生')
      return
    }

    const studentIds = payPerLessonStudents.map(s => s._id)

    console.log('📊 查找 unitPrice=0 的记录...\n')

    const zeroPriceRecords = await LessonRecord.find({
      studentId: { $in: studentIds },
      isDeducted: true,
      unitPrice: 0
    }).sort({ createdAt: -1 })

    console.log(`📝 找到 ${zeroPriceRecords.length} 条 unitPrice=0 的记录:\n`)

    let totalAmount = 0

    for (const r of zeroPriceRecords) {
      const student = payPerLessonStudents.find(s => s._id.toString() === r.studentId.toString())
      const studentName = student?.name || '未知'

      const hasPayment = await Payment.exists({
        studentId: r.studentId,
        createdAt: {
          $gte: new Date(r.createdAt.getTime() - 120000),
          $lte: new Date(r.createdAt.getTime() + 120000)
        }
      })

      console.log(`${studentName} | ${r.createdAt?.toISOString().slice(0,16)} | ${(r.notes || '').slice(0,30)} | ${hasPayment ? '有Payment' : '❌ 无Payment'}`)

      if (!hasPayment) {
        totalAmount += 200 // 假设默认单价200
      }
    }

    console.log('\n' + '='.repeat(70))
    console.log(`共 ${zeroPriceRecords.length} 条 unitPrice=0 的记录`)
    console.log('='.repeat(70))

    if (zeroPriceRecords.length > 0) {
      console.log('\n💡 这些记录需要根据 FeeStandard 补充单价后才能生成收入')
      console.log('是否需要我创建一个自动补充单价并生成收入的脚本？\n')
    }

  } catch (error) {
    console.error('❌ 查询失败:', error.message)
  } finally {
    await mongoose.connection.close()
    console.log('🔌 数据库连接已关闭')
  }
}

console.log('╔══════════════════════════════════════════════════╗')
console.log('║     查找 unitPrice=0 的缺失收入记录              ║')
console.log('╚══════════════════════════════════════════════════╝\n')

findZeroPriceRecords()
