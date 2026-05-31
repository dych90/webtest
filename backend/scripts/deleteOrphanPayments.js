const mongoose = require('mongoose')
require('dotenv').config()
const Payment = require('../src/models/Payment')
const LessonRecord = require('../src/models/LessonRecord')
const Student = require('../src/models/Student')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/piano_studio'

async function findAndDeleteOrphanPayments(autoDelete = false) {
  try {
    console.log('========== 孤立Payment记录清理工具 ==========\n')
    
    await mongoose.connect(MONGODB_URI)
    console.log('✅ 数据库连接成功\n')

    // 1. 查找所有单次付费学生
    const payPerLessonStudents = await Student.find({ paymentType: 'payPerLesson' })
    const studentIds = payPerLessonStudents.map(s => s._id)
    
    if (studentIds.length === 0) {
      console.log('ℹ️ 没有找到单次付费学生')
      return { deletedCount: 0, totalAmount: 0 }
    }

    console.log(`📊 找到 ${studentIds.length} 个单次付费学生\n`)

    // 2. 获取这些学生的消课记录和缴费记录
    const lessonRecords = await LessonRecord.find({ 
      studentId: { $in: studentIds },
      isDeducted: true 
    })

    const payments = await Payment.find({ 
      studentId: { $in: studentIds },
      notes: { $regex: '单次付费', $options: 'i' }
    }).sort({ createdAt: -1 })

    console.log(`📝 消课记录总数: ${lessonRecords.length}`)
    console.log(`💰 缴费记录总数: ${payments.length}\n`)

    // 3. 查找孤立记录
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
          const timeProximity = Math.abs(new Date(r.createdAt) - new Date(payment.createdAt)) < 3600000
          return studentMatch && notesMatch && timeProximity
        })

        if (!hasMatchingRecord) {
          orphanPayments.push(payment)
        }
      }
    }

    if (orphanPayments.length === 0) {
      console.log('✅ 没有找到孤立Payment记录，数据正常！\n')
      return { deletedCount: 0, totalAmount: 0, orphanPayments: [] }
    }

    // 4. 显示孤立记录详情
    console.log('🚨 发现孤立Payment记录:\n')
    console.log('-'.repeat(100))
    
    let totalAmount = 0
    
    orphanPayments.forEach((p, index) => {
      const date = new Date(p.createdAt).toLocaleString('zh-CN')
      console.log(`${index + 1}. [${date}]`)
      console.log(`   ID: ${p._id}`)
      console.log(`   学生ID: ${p.studentId}`)
      console.log(`   金额: ¥${p.amount?.toFixed(2) || 0}`)
      console.log(`   备注: ${p.notes || '(无)'}`)
      console.log('-'.repeat(100))
      
      totalAmount += p.amount || 0
    })

    console.log(`\n📊 统计:`)
    console.log(`   孤立记录数: ${orphanPayments.length} 条`)
    console.log(`   总金额: ¥${totalAmount.toFixed(2)}`)

    // 5. 根据模式执行删除或显示ID列表
    if (autoDelete) {
      console.log('\n⚠️ 自动删除模式：开始清理...\n')
      
      let deletedCount = 0
      let deletedAmount = 0

      for (const payment of orphanPayments) {
        console.log(`🗑️ 删除 Payment ${payment._id} (¥${payment.amount})...`)
        
        await Payment.findByIdAndDelete(payment._id)
        
        deletedCount++
        deletedAmount += payment.amount || 0
        
        console.log('   ✅ 已删除')
      }

      console.log('\n========== 清理完成 ==========\n')
      console.log(`✅ 成功删除: ${deletedCount} 条记录`)
      console.log(`💰 清理总金额: ¥${deletedAmount.toFixed(2)}`)
      console.log('\n💡 预收入统计将相应减少此金额')

      return { 
        deletedCount, 
        totalAmount: deletedAmount,
        deletedPayments: orphanPayments.map(p => p._id)
      }
    } else {
      console.log('\n' + '='.repeat(100))
      console.log('🔧 如需删除这些记录，请使用以下命令:\n')
      
      const idList = orphanPayments.map(p => p._id.toString())
      console.log(`node scripts/deleteOrphanPayments.js --auto`)
      console.log('\n或者手动指定ID:')
      console.log(`node scripts/deleteOrphanPayments.js ${idList.join(' ')}`)

      return { 
        deletedCount: 0, 
        totalAmount,
        orphanPayments 
      }
    }

  } catch (error) {
    console.error('❌ 清理过程出错:', error)
    throw error
  } finally {
    await mongoose.connection.close()
    console.log('\n📤 数据库连接已关闭')
  }
}

async function deleteOrphanPayments(orphanPaymentIds) {
  try {
    console.log('========== 开始清理指定的Payment记录 ==========\n')
    
    await mongoose.connect(MONGODB_URI)
    console.log('✅ 数据库连接成功\n')

    if (!orphanPaymentIds || orphanPaymentIds.length === 0) {
      console.log('⚠️ 没有提供要删除的Payment ID列表')
      return
    }

    console.log(`📋 准备删除 ${orphanPaymentIds.length} 条记录:\n`)
    
    let totalAmount = 0
    let deletedCount = 0

    for (const paymentId of orphanPaymentIds) {
      const payment = await Payment.findById(paymentId)
      
      if (!payment) {
        console.log(`⚠️ Payment ${paymentId} 不存在或已被删除`)
        continue
      }

      console.log(`🗑️ 删除 Payment ${paymentId}:`)
      console.log(`   学生ID: ${payment.studentId}`)
      console.log(`   金额: ¥${payment.amount}`)
      console.log(`   备注: ${payment.notes}`)
      
      await Payment.findByIdAndDelete(paymentId)
      
      totalAmount += payment.amount || 0
      deletedCount++
      console.log('   ✅ 已删除\n')
    }

    console.log('========== 删除完成 ==========\n')
    console.log(`✅ 成功删除: ${deletedCount} 条记录`)
    console.log(`💰 清理总金额: ¥${totalAmount.toFixed(2)}`)
    console.log('\n💡 预收入统计将相应减少此金额')

    return { deletedCount, totalAmount }

  } catch (error) {
    console.error('❌ 删除过程出错:', error)
    throw error
  } finally {
    await mongoose.connection.close()
    console.log('\n📤 数据库连接已关闭')
  }
}

// 命令行入口
if (require.main === module) {
  const args = process.argv.slice(2)
  
  // 检查是否是自动模式
  if (args.includes('--auto') || args.includes('-a')) {
    console.log('🔄 自动模式：查找并删除所有孤立Payment记录\n')
    findAndDeleteOrphanPayments(true)
      .then(result => {
        if (result.deletedCount > 0) {
          console.log('\n✅ 清理完成！预收入已修正。')
        } else {
          console.log('\n✅ 无需清理，数据已是最新的！')
        }
        process.exit(0)
      })
      .catch(error => {
        console.error('\n❌ 执行失败:', error)
        process.exit(1)
      })
  } 
  // 检查是否提供了ID列表
  else if (args.length > 0 && !args[0].startsWith('--')) {
    let paymentIds = []
    
    if (args[0].startsWith('[')) {
      try {
        paymentIds = JSON.parse(args[0])
      } catch (e) {
        console.error('❌ JSON格式错误:', e.message)
        process.exit(1)
      }
    } else {
      paymentIds = args
    }

    deleteOrphanPayments(paymentIds)
      .then(() => {
        console.log('\n✅ 清理完成！')
        process.exit(0)
      })
      .catch(error => {
        console.error('\n❌ 执行失败:', error)
        process.exit(1)
      })
  }
  // 默认：只分析不删除
  else {
    findAndDeleteOrphanPayments(false)
      .then(() => {
        process.exit(0)
      })
      .catch(error => {
        console.error('\n❌ 执行失败:', error)
        process.exit(1)
      })
  }
}

module.exports = { deleteOrphanPayments, findAndDeleteOrphanPayments }
