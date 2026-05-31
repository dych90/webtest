const mongoose = require('mongoose')
const Payment = require('../models/Payment')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/education_system'

async function deleteOrphanPayments(orphanPaymentIds) {
  try {
    console.log('========== 开始清理孤立Payment记录 ==========\n')
    
    await mongoose.connect(MONGODB_URI)
    console.log('✅ 数据库连接成功\n')

    if (!orphanPaymentIds || orphanPaymentIds.length === 0) {
      console.log('⚠️ 没有提供要删除的Payment ID列表')
      console.log('请先运行 node scripts/fixPrepaidData.js 获取孤立记录ID\n')
      return
    }

    console.log(`📋 准备删除 ${orphanPaymentIds.length} 条孤立记录:\n`)
    
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
      
      totalAmount += payment.amount
      deletedCount++
      console.log('   ✅ 已删除\n')
    }

    console.log('========== 删除完成 ==========\n')
    console.log(`✅ 成功删除: ${deletedCount} 条记录`)
    console.log(`💰 清理总金额: ¥${totalAmount.toFixed(2)}`)
    console.log('\n💡 预收入统计将相应减少此金额')

  } catch (error) {
    console.error('❌ 删除过程出错:', error)
    throw error
  } finally {
    await mongoose.connection.close()
    console.log('\n📤 数据库连接已关闭')
  }
}

// 从命令行参数获取ID列表（JSON数组格式）
if (require.main === module) {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    console.log('用法: node scripts/deleteOrphanPayments.js ["id1","id2",...]')
    console.log('或者: node scripts/deleteOrphanPayments.js id1 id2 id3')
    console.log('\n请先运行 node scripts/fixPrepaidData.js 获取需要删除的ID列表')
    process.exit(1)
  }

  let paymentIds = []
  
  // 支持两种格式：JSON数组或空格分隔的ID
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

module.exports = deleteOrphanPayments
