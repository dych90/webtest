const mongoose = require('mongoose')
const Payment = require('./src/models/Payment')

const MONGODB_URI = 'mongodb://localhost:27017/piano_studio'

async function rollback() {
  try {
    console.log('🔗 连接数据库...')
    await mongoose.connect(MONGODB_URI)
    console.log('✅ 数据库连接成功\n')

    console.log('🗑️ 查找刚补录的错误记录...\n')

    const wrongPayments = await Payment.find({
      notes: /补录-单次付费/
    })

    console.log(`📝 找到 ${wrongPayments.length} 条补录记录\n`)

    if (wrongPayments.length === 0) {
      console.log('✅ 没有需要删除的记录\n')
      return
    }

    let totalAmount = 0

    for (const p of wrongPayments) {
      totalAmount += p.amount
      await Payment.findByIdAndDelete(p._id)
      console.log(`❌ 已删除: ¥${p.amount} - ${p.notes}`)
    }

    console.log('\n' + '='.repeat(60))
    console.log('📊 删除统计:')
    console.log('='.repeat(60))
    console.log(`删除记录数: ${wrongPayments.length} 条`)
    console.log(`删除总金额: ¥${totalAmount.toLocaleString()}`)
    console.log('='.repeat(60) + '\n')

    console.log('✅ 错误记录已全部清理！\n')

  } catch (error) {
    console.error('❌ 删除失败:', error.message)
  } finally {
    await mongoose.connection.close()
    console.log('🔌 数据库连接已关闭')
  }
}

console.log('╔══════════════════════════════════════════════════╗')
console.log('║     回滚工具 - 删除错误的补录记录               ║')
console.log('╚══════════════════════════════════════════════════╝\n')

rollback()
