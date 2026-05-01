const mongoose = require('mongoose')
const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')
const LessonRecord = require('./src/models/LessonRecord')
const Student = require('./src/models/Student')
const Payment = require('./src/models/Payment')
const FeeStandard = require('./src/models/FeeStandard')

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
        resolve(backupPath)
      }
    )
  })
}

async function fixAllMissingPayments() {
  try {
    console.log('🔗 连接数据库...')
    await mongoose.connect(MONGODB_URI)
    console.log('✅ 数据库连接成功\n')

    const payPerLessonStudents = await Student.find({ paymentType: 'payPerLesson' })
    
    if (payPerLessonStudents.length === 0) {
      console.log('⚠️ 未找到 payPerLesson 类型学生\n')
      return
    }

    console.log(`✅ 找到 ${payPerLessonStudents.length} 个单次付费学生\n`)

    const studentIds = payPerLessonStudents.map(s => s._id)

    console.log('🔍 第一步：查找 unitPrice > 0 且无 Payment 的记录...\n')
    
    const recordsWithPrice = await LessonRecord.find({
      studentId: { $in: studentIds },
      isDeducted: true,
      unitPrice: { $gt: 0 }
    }).sort({ createdAt: 1 })

    console.log(`📝 找到 ${recordsWithPrice.length} 条有单价的记录\n`)

    console.log('🔍 第二步：查找 unitPrice = 0 且无 Payment 的记录...\n')

    const recordsZeroPrice = await LessonRecord.find({
      studentId: { $in: studentIds },
      isDeducted: true,
      unitPrice: 0
    }).sort({ createdAt: 1 })

    console.log(`📝 找到 ${recordsZeroPrice.length} 条无单价的记录\n`)

    let fixedCount = 0
    let skippedCount = 0
    let updatedCount = 0
    let totalAmount = 0

    console.log('=' .repeat(70))
    console.log('📊 开始处理有单价的记录...')
    console.log('='.repeat(70) + '\n')

    for (const record of recordsWithPrice) {
      const student = payPerLessonStudents.find(s => s._id.toString() === record.studentId.toString())
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

      console.log(`✅ 补录 [${studentName}] ¥${amount} (${record.createdAt?.toISOString().slice(0,10)})`)
      fixedCount++
      totalAmount += amount

      await new Promise(resolve => setTimeout(resolve, 30))
    }

    if (recordsZeroPrice.length > 0) {
      console.log('\n' + '='.repeat(70))
      console.log('📊 开始处理无单价的记录（需要查询收费标准）...')
      console.log('='.repeat(70) + '\n')

      for (const record of recordsZeroPrice) {
        const student = payPerLessonStudents.find(s => s._id.toString() === record.studentId.toString())
        const studentName = student?.name || '未知'

        let feeStandard = null
        
        if (record.courseTypeId) {
          feeStandard = await FeeStandard.findOne({
            courseTypeId: record.courseTypeId,
            $or: [
              { studentId: student._id },
              { studentId: { $exists: false } }
            ]
          }).sort({ studentId: -1, effectiveDate: -1 })
        }

        if (!feeStandard) {
          feeStandard = await FeeStandard.findOne({
            studentId: { $exists: false }
          }).sort({ effectiveDate: -1 })
        }

        if (!feeStandard || !feeStandard.price || feeStandard.price === 0) {
          console.log(`⚭️ 跳过 [${studentName}] 未找到收费标准 (${record.createdAt?.toISOString().slice(0,10)})`)
          continue
        }

        const existingPayment = await Payment.findOne({
          studentId: record.studentId,
          amount: feeStandard.price * record.lessonsConsumed,
          createdAt: {
            $gte: new Date(record.createdAt.getTime() - 60000),
            $lte: new Date(record.createdAt.getTime() + 60000)
          }
        })

        if (existingPayment) {
          skippedCount++
          continue
        }

        const amount = feeStandard.price * record.lessonsConsumed

        record.unitPrice = feeStandard.price
        await record.save()
        updatedCount++

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

        console.log(`✅ 补录+更新 [${studentName}] ¥${amount} (原价¥0 → ¥${feeStandard.price}) (${record.createdAt?.toISOString().slice(0,10)})`)
        fixedCount++
        totalAmount += amount

        await new Promise(resolve => setTimeout(resolve, 30))
      }
    }

    console.log('\n' + '='.repeat(70))
    console.log('📈 最终统计:')
    console.log('='.repeat(70))
    console.log(`✅ 成功补录: ${fixedCount} 条`)
    console.log(`🔄 更新单价: ${updatedCount} 条`)
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
console.log('║     完整版缺失收入自动补录工具                   ║')
console.log('╚══════════════════════════════════════════════════╝\n')

async function main() {
  try {
    await backupDatabase()
    await fixAllMissingPayments()
  } catch (error) {
    if (error.message.includes('备份失败')) {
      console.error('\n⚠️ 数据库备份失败，为安全起见已终止执行')
      process.exit(1)
    }
  }
}

main()
