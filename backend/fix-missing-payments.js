const mongoose = require('mongoose')
const { execSync, exec } = require('child_process')
const fs = require('fs')
const path = require('path')
const LessonRecord = require('./src/models/LessonRecord')
const Student = require('./src/models/Student')
const Payment = require('./src/models/Payment')

const MONGODB_URI = 'mongodb://localhost:27017/piano_studio'
const BACKUP_DIR = path.join(__dirname, 'backups')

function backupDatabase() {
  return new Promise((resolve, reject) => {
    console.log('📦 开始备份数据库...\n')

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}`)

    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true })
    }

    console.log(`📁 备份路径: ${backupPath}`)
    console.log('⏳ 正在备份数据库，请稍候...\n')

    const mongodump = process.platform === 'win32' ? 'mongodump.exe' : 'mongodump'

    exec(
      `${mongodump} --db piano_studio --out "${backupPath}"`,
      (error, stdout, stderr) => {
        if (error) {
          console.error(`❌ 备份失败: ${error.message}`)
          if (stderr) console.error(`错误信息: ${stderr}`)
          reject(error)
          return
        }

        console.log('✅ 数据库备份成功\n')
        console.log(`📂 备份位置: ${backupPath}`)
        console.log('💡 如需恢复，可使用命令:\n')
        console.log(`   mongorestore --db piano_studio "${backupPath}/piano_studio"\n`)
        resolve(backupPath)
      }
    )
  })
}

async function fixMissingPayments() {
  try {
    console.log('🔗 连接数据库...')
    await mongoose.connect(MONGODB_URI)
    console.log('✅ 数据库连接成功\n')

    console.log('📊 开始查找需要补录的记录...\n')

    const lessonRecords = await LessonRecord.find({
      isDeducted: true,
      unitPrice: { $gt: 0 }
    }).sort({ createdAt: 1 })

    console.log(`📝 找到 ${lessonRecords.length} 条有单价的已扣课记录\n`)

    let fixedCount = 0
    let skippedCount = 0
    let totalAmount = 0

    for (const record of lessonRecords) {
      const student = await Student.findById(record.studentId)
      const studentName = student?.name || '未知'

      const existingPayment = await Payment.findOne({
        studentId: record.studentId,
        amount: record.unitPrice * record.lessonsConsumed,
        createdAt: {
          $gte: new Date(record.createdAt.getTime() - 60000),
          $lte: new Date(record.createdAt.getTime() + 60000)
        }
      })

      if (existingPayment) {
        console.log(`⏭️ 跳过 [${studentName}] 已有缴费记录 ¥${record.unitPrice * record.lessonsConsumed} (${record.createdAt?.toISOString().slice(0,10)})`)
        skippedCount++
        continue
      }

      const amount = record.unitPrice * record.lessonsConsumed

      await Payment.create({
        studentId: record.studentId,
        paymentType: '微信',
        amount: amount,
        totalLessons: 0,
        bonusLessons: 0,
        paymentDate: record.courseStartTime || record.createdAt,
        notes: `补录-单次付费-${record.lessonsConsumed}节课`,
        createdAt: record.createdAt
      })

      console.log(`✅ 补录成功 [${studentName}] ¥${amount} (${record.createdAt?.toISOString().slice(0,10)}) ${record.notes?.slice(0,20) || ''}`)
      fixedCount++
      totalAmount += amount

      await new Promise(resolve => setTimeout(resolve, 50))
    }

    console.log('\n' + '='.repeat(70))
    console.log('📈 补录完成统计:')
    console.log('='.repeat(70))
    console.log(`✅ 成功补录: ${fixedCount} 条`)
    console.log(`⏭️ 已存在跳过: ${skippedCount} 条`)
    console.log(`💰 补录总金额: ¥${totalAmount.toLocaleString()}`)
    console.log('='.repeat(70) + '\n')

    if (fixedCount > 0) {
      console.log('💡 提示: 刷新数据统计页面即可看到更新后的收入数据\n')
    } else {
      console.log('ℹ️ 所有记录都正常，无需补录\n')
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
console.log('║     单次付费学生缺失收入自动补录工具              ║')
console.log('╚══════════════════════════════════════════════════╝\n')

async function main() {
  try {
    await backupDatabase()
    await fixMissingPayments()
  } catch (error) {
    if (error.message.includes('备份失败')) {
      console.error('\n⚠️ 数据库备份失败，为安全起见已终止执行')
      console.error('请检查 MongoDB 是否正常运行，或手动备份后重试\n')
      process.exit(1)
    }
  }
}

main()
