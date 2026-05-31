const mongoose = require('mongoose')
const LessonRecord = require('../src/models/LessonRecord')
const Payment = require('../src/models/Payment')
const Student = require('../src/models/Student')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/education_system'

async function fixPrepaidData() {
  try {
    console.log('========== 开始修复单次付费学生预收入数据 ==========\n')
    
    await mongoose.connect(MONGODB_URI)
    console.log('✅ 数据库连接成功\n')

    // 1. 查找所有单次付费学生
    const payPerLessonStudents = await Student.find({ paymentType: 'payPerLesson' })
    const studentIds = payPerLessonStudents.map(s => s._id)
    console.log(`📊 找到 ${studentIds.length} 个单次付费学生\n`)

    // 2. 获取这些学生的所有消课记录和缴费记录
    const lessonRecords = await LessonRecord.find({ 
      studentId: { $in: studentIds },
      isDeducted: true 
    }).sort({ createdAt: 1 })

    const payments = await Payment.find({ 
      studentId: { $in: studentIds },
      notes: { $regex: '单次付费', $options: 'i' }
    }).sort({ createdAt: 1 })

    console.log(`📝 消课记录总数: ${lessonRecords.length}`)
    console.log(`💰 缴费记录总数: ${payments.length}\n`)

    // 3. 分析并修复数据
    let fixedCount = 0
    let deletedPayments = []
    let linkedRecords = []

    for (const record of lessonRecords) {
      // 情况1: 已有正确的paymentId关联
      if (record.paymentId) {
        const payment = await Payment.findById(record.paymentId)
        if (payment) {
          console.log(`✅ 记录 ${record._id} - 已正确关联到 Payment ${record.paymentId}`)
          continue
        } else {
          console.log(`⚠️ 记录 ${record._id} - paymentId存在但Payment不存在，需要重新匹配`)
        }
      }

      // 情况2: 没有paymentId，尝试通过notes字段匹配
      const expectedNotesPattern = `单次付费 - ${record.lessonsConsumed}节课`
      
      // 查找未使用的Payment记录（优先查找时间最接近的）
      const matchingPayments = payments.filter(p => {
        if (!p.notes.includes(expectedNotesPattern)) return false
        if (p.studentId.toString() !== record.studentId.toString()) return false
        
        // 检查是否已被其他记录使用
        const alreadyUsed = lessonRecords.some(r => 
          r.paymentId && r.paymentId.toString() === p._id.toString() && r._id.toString() !== record._id.toString()
        )
        
        return !alreadyUsed
      })

      if (matchingPayments.length > 0) {
        // 选择时间最接近的Payment
        const bestMatch = matchingPayments.reduce((closest, current) => {
          const currentDiff = Math.abs(new Date(current.createdAt) - new Date(record.createdAt))
          const closestDiff = Math.abs(new Date(closest.createdAt) - new Date(record.createdAt))
          return currentDiff < closestDiff ? current : closest
        })

        // 更新LessonRecord的paymentId
        await LessonRecord.findByIdAndUpdate(record._id, { paymentId: bestMatch._id })
        linkedRecords.push({
          lessonRecordId: record._id,
          paymentId: bestMatch._id,
          amount: bestMatch.amount
        })
        fixedCount++
        console.log(`🔗 记录 ${record._id} - 关联到 Payment ${bestMatch._id} (金额: ${bestMatch.amount})`)
      } else {
        console.log(`❌ 记录 ${record._id} - 未找到匹配的Payment记录 (${expectedNotesPattern})`)
      }
    }

    // 4. 查找并标记孤立的Payment记录
    console.log('\n========== 检查孤立Payment记录 ==========\n')
    
    const orphanPayments = []
    for (const payment of payments) {
      const isLinked = lessonRecords.some(r => 
        r.paymentId && r.paymentId.toString() === payment._id.toString()
      )
      
      if (!isLinked) {
        // 再次确认是否有任何消课记录对应这个Payment（通过notes模糊匹配）
        const hasMatchingRecord = lessonRecords.some(r => {
          const studentMatch = r.studentId.toString() === payment.studentId.toString()
          const notesMatch = payment.notes.includes(`${r.lessonsConsumed}节课`)
          const timeProximity = Math.abs(new Date(r.createdAt) - new Date(payment.createdAt)) < 3600000 // 1小时内
          return studentMatch && notesMatch && timeProximity
        })

        if (!hasMatchingRecord) {
          orphanPayments.push(payment)
          console.log(`🚨 发现孤立Payment:`, {
            _id: payment._id,
            studentId: payment.studentId,
            amount: payment.amount,
            notes: payment.notes,
            createdAt: payment.createdAt
          })
        }
      }
    }

    // 5. 生成修复报告
    console.log('\n========== 修复报告 ==========\n')
    console.log(`✅ 成功建立关联: ${linkedRecords.length} 条`)
    console.log(`🚨 发现孤立Payment: ${orphanPayments.length} 条`)
    console.log(`\n孤立Payment总金额: ¥${orphanPayments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}`)

    // 6. 询问是否删除孤立记录（这里只输出建议，不自动删除）
    if (orphanPayments.length > 0) {
      console.log('\n⚠️ 建议手动检查后决定是否删除以下孤立Payment记录:')
      console.log('-'.repeat(80))
      orphanPayments.forEach((p, index) => {
        console.log(`${index + 1}. ID: ${p._id}`)
        console.log(`   学生ID: ${p.studentId}`)
        console.log(`   金额: ¥${p.amount}`)
        console.log(`   备注: ${p.notes}`)
        console.log(`   创建时间: ${p.createdAt}`)
        console.log('-'.repeat(80))
      })
      
      console.log('\n如需删除这些孤立记录，请运行:')
      console.log(`node scripts/deleteOrphanPayments.js`)
    }

    // 7. 输出统计信息
    console.log('\n========== 最终统计 ==========\n')
    const totalOrphanAmount = orphanPayments.reduce((sum, p) => sum + p.amount, 0)
    
    console.log(`📊 修复前预收入(可能虚高): ¥${payments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}`)
    console.log(`📊 有效Payment金额: ¥${(payments.reduce((sum, p) => sum + p.amount, 0) - totalOrphanAmount).toFixed(2)}`)
    console.log(`📊 可清理的孤立金额: ¥${totalOrphanAmount.toFixed(2)}`)
    
    if (totalOrphanAmount > 0) {
      console.log(`\n💡 删除孤立记录后，预收入将减少 ¥${totalOrphanAmount.toFixed(2)}`)
    }

    console.log('\n========== 数据分析完成 ==========\n')
    
    return {
      fixedCount,
      orphanPaymentsCount: orphanPayments.length,
      orphanPaymentsTotalAmount: totalOrphanAmount,
      linkedRecords,
      orphanPayments: orphanPayments.map(p => p._id)
    }

  } catch (error) {
    console.error('❌ 数据修复过程出错:', error)
    throw error
  } finally {
    await mongoose.connection.close()
    console.log('📤 数据库连接已关闭')
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  fixPrepaidData()
    .then(result => {
      console.log('\n✅ 数据分析完成！')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n❌ 执行失败:', error)
      process.exit(1)
    })
}

module.exports = fixPrepaidData
