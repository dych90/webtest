const mongoose = require('mongoose')
const Student = require('./src/models/Student')
const LessonRecord = require('./src/models/LessonRecord')
const Payment = require('./src/models/Payment')
const FeeStandard = require('./src/models/FeeStandard')

const MONGODB_URI = 'mongodb://localhost:27017/piano_studio'

async function diagnoseQuery() {
  try {
    console.log('🔗 连接数据库...')
    await mongoose.connect(MONGODB_URI)
    console.log('✅ 数据库连接成功\n')

    const studentName = '邵一宁（嘟嘟）'
    console.log(`👤 以 ${studentName} 为例进行诊断...\n`)

    const student = await Student.findOne({ name: /邵一宁/ })
    
    if (!student) {
      console.log('❌ 未找到学生')
      return
    }

    console.log(`学生信息:`)
    console.log(`   ID: ${student._id}`)
    console.log(`   支付类型: ${student.paymentType}\n`)

    console.log('=' .repeat(70))
    console.log('1️⃣ 该学生的所有 FeeStandard:')
    console.log('='.repeat(70))

    const standards = await FeeStandard.find({
      $or: [
        { studentId: student._id },
        { studentId: { $exists: false } }
      ]
    })

    if (standards.length === 0) {
      console.log('❌ 无任何收费标准')
    } else {
      standards.forEach(s => {
        console.log(`   ID: ${s._id}`)
        console.log(`   courseTypeId: ${s.courseTypeId || '(空)'}`)
        console.log(`   price: ¥${s.price}`)
        console.log('')
      })
    }

    console.log('\n' + '=' .repeat(70))
    console.log('2️⃣ 该学生 unitPrice=0 的 LessonRecord (取前3条):')
    console.log('='.repeat(70))

    const zeroPriceRecords = await LessonRecord.find({
      studentId: student._id,
      isDeducted: true,
      unitPrice: 0
    }).limit(3)

    if (zeroPriceRecords.length === 0) {
      console.log('❌ 无 unitPrice=0 的记录')
    } else {
      for (const r of zeroPriceRecords) {
        console.log(`┌─ 记录ID: ${r._id}`)
        console.log(`│  courseTypeId: ${r.courseTypeId || '(空/undefined)'}`)
        console.log(`│  unitPrice: ¥${r.unitPrice}`)
        console.log(`│  createdAt: ${r.createdAt}`)
        console.log(`│  notes: ${(r.notes || '').slice(0,30)}`)

        if (r.courseTypeId) {
          const matchingStandard = await FeeStandard.findOne({ courseTypeId: r.courseTypeId })
          console.log(`│  匹配到的FeeStandard: ${matchingStandard ? `✅ 找到 (¥${matchingStandard.price})` : '❌ 未找到'}`)
        } else {
          console.log(`│  ⚠️ courseTypeId 为空！无法匹配`)
        }
        
        const hasPayment = await Payment.exists({
          studentId: r.studentId,
          createdAt: { $gte: new Date(r.createdAt.getTime() - 120000), $lte: new Date(r.createdAt.getTime() + 120000) }
        })
        console.log(`│  有Payment记录: ${hasPayment ? '✅ 有' : '❌ 无'}`)
        console.log('└\n')
      }
    }

    console.log('\n' + '=' .repeat(70))
    console.log('3️⃣ 所有 FeeStandard 列表:')
    console.log('='.repeat(70))

    const allStandards = await FeeStandard.find({})
    console.log(`总数: ${allStandards.length}\n`)
    
    allStandards.forEach((s, i) => {
      console.log(`${i+1}. [${s.studentId ? '个人' : '通用'}] courseTypeId=${s.courseTypeId?.toString().slice(-8) || '无'} → ¥${s.price}`)
    })

  } catch (error) {
    console.error('❌ 失败:', error.message)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 数据库连接已关闭')
  }
}

console.log('╔══════════════════════════════════════════════════╗')
console.log('║     查询逻辑诊断工具                              ║')
console.log('╚══════════════════════════════════════════════════╝\n')

diagnoseQuery()
