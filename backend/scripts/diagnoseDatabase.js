const mongoose = require('mongoose')
const Student = require('../src/models/Student')
const Payment = require('../src/models/Payment')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/education_system'

async function diagnoseDatabase() {
  try {
    console.log('========== 数据库诊断工具 ==========\n')
    
    await mongoose.connect(MONGODB_URI)
    console.log('✅ 数据库连接成功')
    console.log(`📦 数据库地址: ${MONGODB_URI}\n`)

    // 1. 检查所有学生及其缴费类型
    console.log('========== 学生缴费类型分布 ==========\n')
    
    const allStudents = await Student.find({})
    console.log(`📊 总学生数: ${allStudents.length}\n`)
    
    const paymentTypeStats = {
      prepaid: [],
      payPerLesson: [],
      other: []
    }

    allStudents.forEach(student => {
      if (student.paymentType === 'prepaid') {
        paymentTypeStats.prepaid.push(student)
      } else if (student.paymentType === 'payPerLesson') {
        paymentTypeStats.payPerLesson.push(student)
      } else {
        paymentTypeStats.other.push({
          _id: student._id,
          name: student.name,
          paymentType: student.paymentType
        })
      }
    })

    console.log(`✅ 预付费学生 (prepaid): ${paymentTypeStats.prepaid.length} 人`)
    if (paymentTypeStats.prepaid.length > 0 && paymentTypeStats.prepaid.length <= 10) {
      paymentTypeStats.prepaid.slice(0, 5).forEach(s => 
        console.log(`   - ${s.name} (${s._id})`)
      )
      if (paymentTypeStats.prepaid.length > 5) {
        console.log(`   ... 还有 ${paymentTypeStats.prepaid.length - 5} 人`)
      }
    }
    console.log('')

    console.log(`💰 单次付费学生 (payPerLesson): ${paymentTypeStats.payPerLesson.length} 人`)
    if (paymentTypeStats.payPerLesson.length > 0) {
      paymentTypeStats.payPerLesson.forEach(s => 
        console.log(`   ✅ ${s.name} (ID: ${s._id})`)
      )
    }
    console.log('')

    if (paymentTypeStats.other.length > 0) {
      console.log(`⚠️ 其他类型: ${paymentTypeStats.other.length} 人`)
      paymentTypeStats.other.forEach(s => 
        console.log(`   - ${s.name}: paymentType="${s.paymentType}"`)
      )
      console.log('')
    }

    // 2. 检查所有Payment记录
    console.log('========== Payment记录分析 ==========\n')
    
    const allPayments = await Payment.find({}).sort({ createdAt: -1 }).limit(20)
    console.log(`📝 总Payment记录数: ${await Payment.countDocuments()}\n`)

    if (allPayments.length > 0) {
      console.log('最近20条Payment记录:')
      console.log('-'.repeat(100))
      
      allPayments.forEach((p, index) => {
        const date = new Date(p.createdAt).toLocaleString('zh-CN')
        console.log(`${index + 1}. [${date}]`)
        console.log(`   ID: ${p._id}`)
        console.log(`   学生ID: ${p.studentId}`)
        console.log(`   金额: ¥${p.amount?.toFixed(2) || 0}`)
        console.log(`   备注: ${p.notes || '(无)'}`)
        console.log(`   课时: ${p.totalLessons || 0} (赠送: ${p.bonusLessons || 0})`)
        console.log('-'.repeat(100))
      })
    } else {
      console.log('⚠️ 没有找到任何Payment记录')
    }

    // 3. 查找包含"单次付费"关键字的记录
    console.log('\n========== 单次付费相关记录 ==========\n')
    
    const payPerLessonPayments = await Payment.find({
      notes: { $regex: '单次付费', $options: 'i' }
    }).sort({ createdAt: -1 })

    console.log(`🔍 包含"单次付费"备注的记录: ${payPerLessonPayments.length} 条\n`)
    
    if (payPerLessonPayments.length > 0) {
      payPerLessonPayments.forEach((p, index) => {
        const date = new Date(p.createdAt).toLocaleString('zh-CN')
        console.log(`${index + 1}. [${date}] ¥${p.amount?.toFixed(2)} - ${p.notes}`)
        console.log(`   ID: ${p._id}, 学生ID: ${p.studentId}`)
      })
      
      const totalAmount = payPerLessonPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
      console.log(`\n💰 单次付费总金额: ¥${totalAmount.toFixed(2)}`)
    } else {
      console.log('ℹ️ 没有找到包含"单次付费"的Payment记录')
      console.log('可能原因:')
      console.log('1. 确实没有单次付费学生的上课记录')
      console.log('2. 备注格式不是"单次付费"')
      console.log('3. 数据已被清理过')
    }

    // 4. 检查数据库连接信息
    console.log('\n========== 连接信息 ==========\n')
    const db = mongoose.connection.db
    console.log(`📦 数据库名称: ${db.databaseName}`)
    console.log(`🖥️ 主机: ${db.serverConfig.host}:${db.serverConfig.port}`)

    // 列出所有集合
    const collections = await db.listCollections().toArray()
    console.log(`\n📁 集合列表 (${collections.length} 个):`)
    collections.forEach(col => {
      console.log(`   - ${col.name}`)
    })

    console.log('\n========== 诊断完成 ==========\n')
    
    return {
      totalStudents: allStudents.length,
      prepaidCount: paymentTypeStats.prepaid.length,
      payPerLessonCount: paymentTypeStats.payPerLesson.length,
      totalPayments: await Payment.countDocuments(),
      payPerLessonPaymentsCount: payPerLessonPayments.length
    }

  } catch (error) {
    console.error('❌ 诊断过程出错:', error)
    throw error
  } finally {
    await mongoose.connection.close()
    console.log('📤 数据库连接已关闭\n')
  }
}

if (require.main === module) {
  diagnoseDatabase()
    .then(result => {
      console.log('✅ 诊断完成！')
      process.exit(0)
    })
    .catch(error => {
      console.error('❌ 执行失败:', error)
      process.exit(1)
    })
}

module.exports = diagnoseDatabase
